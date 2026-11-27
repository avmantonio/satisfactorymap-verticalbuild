//! Source-native regional 3D extract (ticket 60, phase 1).
//!
//! Public product entry is [`regional_scene`]. Membership and the v1 encoder
//! live in the submodules. This is a query: it does not mutate the store,
//! editor undo, or the standing 2D payload.

pub mod membership;
pub mod wire;

use crate::extract::{find_prop, rotate_vector_by_quaternion, vector_prop};
use crate::gamedata;
use crate::mapdata::categories::{
    categorize_subcategory, categorize_type_path, is_hidden_class,
};
use crate::mapdata::consts::{
    line_rendered_type_paths, EXCLUDED_BUILDING_TYPE_PATHS, HYPERTUBE_ENTRANCE_TYPE_PATH,
    HYPERTUBE_SEGMENTS, ITEM_PICKUP_TYPE_PATH, LIGHTWEIGHT_BUILDABLE_SUBSYSTEM_TYPE_PATH,
    LIZARD_DOGGO_TYPE_PATH, PLAYER_TYPE_PATH, VEHICLE_ICONS_BY_TYPE_PATH, VEHICLE_PATH_SEGMENTS,
};
use crate::mapdata::geometry::short_class_name;
use crate::mapdata::names::readable_label;
use crate::mapdata::props;
use crate::mapdata::scan::SaveScan;
use crate::object::{CONVEYOR_CHAINS, POWER_LINES};
use crate::store::*;
use serde::Serialize;
use serde_json::{json, Map, Value};

pub use wire::{
    encode_scene_frame, encoded_frame_size, extract_from_records, regional_scene, ExtractTrace,
    SceneFrameInput, MAX_FRAME_BYTES,
};

pub const ADMISSION_LIMIT: u32 = 8_000;
pub const MAGIC: &[u8; 8] = b"SMREG3D\0";
pub const SCHEMA_VERSION: u32 = 1;
pub const HEADER_BYTES: u32 = 128;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RegionalErrorCode {
    UnsupportedSchema,
    InvalidRegion,
    NoSession,
    StaleSession,
    Cancelled,
    RegionTooLarge,
    SourceDataInvalid,
    ResourceExhausted,
    InvalidFrame,
    VisibilityUnmapped,
    SessionLost,
    RenderFailed,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct RegionalError {
    pub name: &'static str,
    pub code: RegionalErrorCode,
    pub message: String,
    #[serde(rename = "requestId")]
    pub request_id: Option<String>,
    #[serde(rename = "sessionLost")]
    pub session_lost: bool,
    pub details: Map<String, Value>,
}

impl RegionalError {
    pub fn new(
        code: RegionalErrorCode,
        message: impl Into<String>,
        request_id: Option<String>,
        details: Map<String, Value>,
    ) -> Self {
        RegionalError {
            name: "RegionalError",
            code,
            message: message.into(),
            request_id,
            session_lost: false,
            details,
        }
    }

    pub fn invalid_region(request_id: Option<String>, field: &str) -> Self {
        let mut details = Map::new();
        details.insert("field".into(), Value::String(field.to_string()));
        Self::new(
            RegionalErrorCode::InvalidRegion,
            format!("Invalid regional request field {field}"),
            request_id,
            details,
        )
    }

    pub fn unsupported_schema(request_id: Option<String>, received: i64) -> Self {
        let mut details = Map::new();
        details.insert("receivedVersion".into(), json!(received));
        Self::new(
            RegionalErrorCode::UnsupportedSchema,
            "Unsupported regional schema version",
            request_id,
            details,
        )
    }

    pub fn region_too_large(request_id: Option<String>) -> Self {
        let mut details = Map::new();
        details.insert("limit".into(), json!(ADMISSION_LIMIT));
        details.insert("count".into(), json!(ADMISSION_LIMIT as i64 + 1));
        details.insert("countKind".into(), json!("minimum"));
        Self::new(
            RegionalErrorCode::RegionTooLarge,
            "Region exceeds 8000 occupants",
            request_id,
            details,
        )
    }

    pub fn source_data_invalid(request_id: Option<String>, id: Option<&str>) -> Self {
        let mut details = Map::new();
        details.insert(
            "id".into(),
            match id {
                Some(id) => Value::String(id.to_string()),
                None => Value::Null,
            },
        );
        Self::new(
            RegionalErrorCode::SourceDataInvalid,
            "Required regional source origin is invalid",
            request_id,
            details,
        )
    }

    pub fn resource_exhausted(request_id: Option<String>, frame_bound: bool) -> Self {
        let mut details = Map::new();
        if frame_bound {
            details.insert("maxFrameBytes".into(), json!(MAX_FRAME_BYTES));
        }
        Self::new(
            RegionalErrorCode::ResourceExhausted,
            if frame_bound {
                "Regional frame exceeds the 64 MiB safety bound"
            } else {
                "Regional extract exhausted memory or size limits"
            },
            request_id,
            details,
        )
    }

    pub fn to_prefixed_json(&self) -> String {
        let body = serde_json::to_string(self).unwrap_or_else(|_| {
            r#"{"name":"RegionalError","code":"SOURCE_DATA_INVALID","message":"Regional error serialization failed","requestId":null,"sessionLost":false,"details":{"id":null}}"#.to_string()
        });
        format!("REGIONAL_ERROR:{body}")
    }
}

impl std::fmt::Display for RegionalError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{} ({:?})", self.message, self.code)
    }
}

impl std::error::Error for RegionalError {}

#[derive(Debug, Clone, PartialEq)]
pub struct Interval {
    pub min: f64,
    pub max: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct XyRect {
    pub min_x: f64,
    pub max_x: f64,
    pub min_y: f64,
    pub max_y: f64,
}

#[derive(Debug, Clone, PartialEq)]
pub struct RegionalRequest {
    pub request_id: String,
    pub xy_m: XyRect,
    pub cut_z_m: Interval,
    pub altitude_cap_m: Option<Interval>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct EffectiveRegion {
    pub min_m: [f64; 3],
    pub max_m: [f64; 3],
    pub origin_m: [f64; 3],
    pub disjoint_z: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SourceKind {
    Actor,
    Lightweight,
}

impl SourceKind {
    pub fn as_str(self) -> &'static str {
        match self {
            SourceKind::Actor => "actor",
            SourceKind::Lightweight => "lightweight",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RecordKind {
    Occupant,
    Path,
}

impl RecordKind {
    pub fn as_str(self) -> &'static str {
        match self {
            RecordKind::Occupant => "occupant",
            RecordKind::Path => "path",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SizeKind {
    NamedBox,
    ClearanceReserve,
    Unknown,
}

impl SizeKind {
    pub fn as_str(self) -> &'static str {
        match self {
            SizeKind::NamedBox => "named-box",
            SizeKind::ClearanceReserve => "clearance-reserve",
            SizeKind::Unknown => "unknown",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PathState {
    NotPath,
    Linear,
    Unavailable,
}

impl PathState {
    pub fn as_str(self) -> &'static str {
        match self {
            PathState::NotPath => "not-path",
            PathState::Linear => "linear",
            PathState::Unavailable => "unavailable",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Uncertainty {
    SizeUnknown,
    ScaleUnknown,
    OrientationUnknown,
    PathUnavailable,
    ClassReserveLength,
}

impl Uncertainty {
    pub fn as_str(self) -> &'static str {
        match self {
            Uncertainty::SizeUnknown => "size-unknown",
            Uncertainty::ScaleUnknown => "scale-unknown",
            Uncertainty::OrientationUnknown => "orientation-unknown",
            Uncertainty::PathUnavailable => "path-unavailable",
            Uncertainty::ClassReserveLength => "class-reserve-length",
        }
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct PathVertex {
    pub world_m: [f64; 3],
    pub arrive_m: Option<[f64; 3]>,
    pub leave_m: Option<[f64; 3]>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum PathGeom {
    NotPath,
    Linear(Vec<Vec<PathVertex>>),
    Unavailable,
}

#[derive(Debug, Clone, PartialEq)]
pub struct LocalVolume {
    pub size_kind: SizeKind,
    pub extent_m: [f64; 3],
    pub offset_m: [f64; 3],
    pub class_reserve_length: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct SourceRecord {
    pub id: String,
    pub type_path: String,
    pub source_kind: SourceKind,
    pub position_m: [f64; 3],
    pub quaternion: Option<[f64; 4]>,
    pub scale: Option<[f64; 3]>,
    pub volume: Option<LocalVolume>,
    pub path: PathGeom,
}

impl RegionalRequest {
    pub fn from_json(text: &str) -> Result<Self, RegionalError> {
        let value: Value = serde_json::from_str(text)
            .map_err(|_| RegionalError::invalid_region(None, "request"))?;
        let obj = value
            .as_object()
            .ok_or_else(|| RegionalError::invalid_region(None, "request"))?;
        let request_id = obj
            .get("requestId")
            .and_then(Value::as_str)
            .filter(|s| !s.is_empty())
            .map(str::to_string);
        for key in obj.keys() {
            if !matches!(
                key.as_str(),
                "schemaVersion" | "requestId" | "xyM" | "cutZM" | "altitudeCapM"
            ) {
                return Err(RegionalError::invalid_region(request_id.clone(), key));
            }
        }
        let schema = match obj.get("schemaVersion") {
            Some(Value::Number(n)) if n.as_i64() == Some(1) || n.as_u64() == Some(1) => 1i64,
            Some(Value::Number(n)) => {
                let received = n.as_i64().or_else(|| n.as_u64().map(|u| u as i64)).unwrap_or(-1);
                return Err(RegionalError::unsupported_schema(request_id, received));
            }
            _ => return Err(RegionalError::invalid_region(request_id, "schemaVersion")),
        };
        let _ = schema;
        let id = match obj.get("requestId").and_then(Value::as_str) {
            Some(s)
                if (1..=96).contains(&s.len())
                    && s.is_ascii()
                    && s.bytes().all(|b| (32..=126).contains(&b)) =>
            {
                s.to_string()
            }
            _ => return Err(RegionalError::invalid_region(request_id, "requestId")),
        };
        let xy = parse_xy(obj.get("xyM"), Some(&id))?;
        let cut = parse_interval(obj.get("cutZM"), Some(&id), "cutZM", true)?;
        let cap = match obj.get("altitudeCapM") {
            None => return Err(RegionalError::invalid_region(Some(id), "altitudeCapM")),
            Some(Value::Null) => None,
            Some(v) => Some(parse_interval(Some(v), Some(&id), "altitudeCapM", true)?),
        };
        Ok(RegionalRequest { request_id: id, xy_m: xy, cut_z_m: cut, altitude_cap_m: cap })
    }

    pub fn effective_region(&self) -> Result<EffectiveRegion, RegionalError> {
        let origin = [
            midpoint(self.xy_m.min_x, self.xy_m.max_x, Some(&self.request_id), "xyM")?,
            midpoint(self.xy_m.min_y, self.xy_m.max_y, Some(&self.request_id), "xyM")?,
            midpoint(self.cut_z_m.min, self.cut_z_m.max, Some(&self.request_id), "cutZM")?,
        ];
        let (z_min, z_max) = match &self.altitude_cap_m {
            Some(cap) => (self.cut_z_m.min.max(cap.min), self.cut_z_m.max.min(cap.max)),
            None => (self.cut_z_m.min, self.cut_z_m.max),
        };
        if z_min > z_max {
            return Ok(EffectiveRegion {
                min_m: [0.0, 0.0, 0.0],
                max_m: [0.0, 0.0, 0.0],
                origin_m: origin,
                disjoint_z: true,
            });
        }
        Ok(EffectiveRegion {
            min_m: [self.xy_m.min_x, self.xy_m.min_y, z_min],
            max_m: [self.xy_m.max_x, self.xy_m.max_y, z_max],
            origin_m: origin,
            disjoint_z: false,
        })
    }
}

fn midpoint(a: f64, b: f64, request_id: Option<&str>, field: &str) -> Result<f64, RegionalError> {
    let m = f64::midpoint(a, b);
    if !m.is_finite() {
        return Err(RegionalError::invalid_region(request_id.map(str::to_string), field));
    }
    Ok(m)
}

fn parse_xy(value: Option<&Value>, request_id: Option<&str>) -> Result<XyRect, RegionalError> {
    let rid = request_id.map(str::to_string);
    let obj = value
        .and_then(Value::as_object)
        .ok_or_else(|| RegionalError::invalid_region(rid.clone(), "xyM"))?;
    for key in obj.keys() {
        if !matches!(key.as_str(), "minX" | "maxX" | "minY" | "maxY") {
            return Err(RegionalError::invalid_region(rid.clone(), "xyM"));
        }
    }
    let min_x = finite_number(obj.get("minX"), rid.clone(), "xyM")?;
    let max_x = finite_number(obj.get("maxX"), rid.clone(), "xyM")?;
    let min_y = finite_number(obj.get("minY"), rid.clone(), "xyM")?;
    let max_y = finite_number(obj.get("maxY"), rid, "xyM")?;
    if !(min_x < max_x && min_y < max_y) {
        return Err(RegionalError::invalid_region(request_id.map(str::to_string), "xyM"));
    }
    Ok(XyRect { min_x, max_x, min_y, max_y })
}

fn parse_interval(
    value: Option<&Value>,
    request_id: Option<&str>,
    field: &str,
    allow_equal: bool,
) -> Result<Interval, RegionalError> {
    let rid = request_id.map(str::to_string);
    let obj = value
        .and_then(Value::as_object)
        .ok_or_else(|| RegionalError::invalid_region(rid.clone(), field))?;
    for key in obj.keys() {
        if !matches!(key.as_str(), "min" | "max") {
            return Err(RegionalError::invalid_region(rid.clone(), field));
        }
    }
    let min = finite_number(obj.get("min"), rid.clone(), field)?;
    let max = finite_number(obj.get("max"), rid, field)?;
    if allow_equal {
        if min > max {
            return Err(RegionalError::invalid_region(request_id.map(str::to_string), field));
        }
    } else if min >= max {
        return Err(RegionalError::invalid_region(request_id.map(str::to_string), field));
    }
    Ok(Interval { min, max })
}

fn finite_number(
    value: Option<&Value>,
    request_id: Option<String>,
    field: &str,
) -> Result<f64, RegionalError> {
    match value.and_then(Value::as_f64) {
        Some(n) if n.is_finite() => Ok(n),
        _ => Err(RegionalError::invalid_region(request_id, field)),
    }
}

pub fn quaternion_is_known(q: [f64; 4]) -> bool {
    q.iter().all(|c| c.is_finite()) && quat_norm(q) > 0.0
}

pub fn quat_norm(q: [f64; 4]) -> f64 {
    (q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]).sqrt()
}

pub fn normalize_quat(q: [f64; 4]) -> Option<[f64; 4]> {
    let n = quat_norm(q);
    if !n.is_finite() || n <= 0.0 {
        return None;
    }
    Some([q[0] / n, q[1] / n, q[2] / n, q[3] / n])
}

pub fn scale_is_known(s: [f64; 3]) -> bool {
    s.iter().all(|c| c.is_finite())
}

pub fn finite_vec3(v: [f64; 3]) -> bool {
    v.iter().all(|c| c.is_finite())
}

pub fn transform_point(position_m: [f64; 3], quat: [f64; 4], scale: [f64; 3], local_m: [f64; 3]) -> [f64; 3] {
    let scaled = [local_m[0] * scale[0], local_m[1] * scale[1], local_m[2] * scale[2]];
    let rotated = rotate_vector_by_quaternion(quat, scaled);
    [
        position_m[0] + rotated[0],
        position_m[1] + rotated[1],
        position_m[2] + rotated[2],
    ]
}

pub fn transform_tangent(quat: [f64; 4], scale: [f64; 3], tangent_cm: [f64; 3]) -> [f64; 3] {
    let scaled = [tangent_cm[0] * scale[0], tangent_cm[1] * scale[1], tangent_cm[2] * scale[2]];
    let rotated = rotate_vector_by_quaternion(quat, scaled);
    [rotated[0] / 100.0, rotated[1] / 100.0, rotated[2] / 100.0]
}

/// Recover the three lightweight scale doubles at `record_off + 56`.
pub fn read_lightweight_scale(data: &[u8], record_off: usize, record_len: u32) -> Option<[f64; 3]> {
    let start = record_off.checked_add(56)?;
    let end = start.checked_add(24)?;
    if end > data.len() || (record_len as usize) < 80 {
        return None;
    }
    let sx = f64::from_le_bytes(data[start..start + 8].try_into().ok()?);
    let sy = f64::from_le_bytes(data[start + 8..start + 16].try_into().ok()?);
    let sz = f64::from_le_bytes(data[start + 16..start + 24].try_into().ok()?);
    let scale = [sx, sy, sz];
    scale_is_known(scale).then_some(scale)
}

pub fn is_path_capable(type_path: &str) -> bool {
    line_rendered_type_paths().contains(type_path)
        || HYPERTUBE_SEGMENTS.contains(&type_path)
        || type_path == HYPERTUBE_ENTRANCE_TYPE_PATH
}

pub fn is_regional_class(type_path: &str) -> bool {
    if is_hidden_class(type_path) {
        return false;
    }
    if EXCLUDED_BUILDING_TYPE_PATHS.contains(&type_path) {
        return false;
    }
    if CONVEYOR_CHAINS.contains(&type_path) {
        return false;
    }
    if VEHICLE_ICONS_BY_TYPE_PATH.iter().any(|(p, _)| *p == type_path) {
        return false;
    }
    if type_path == PLAYER_TYPE_PATH
        || type_path == LIZARD_DOGGO_TYPE_PATH
        || type_path == ITEM_PICKUP_TYPE_PATH
        || type_path == LIGHTWEIGHT_BUILDABLE_SUBSYSTEM_TYPE_PATH
    {
        return false;
    }
    if gamedata::get().type_paths.mined_resources.iter().any(|p| p == type_path) {
        return false;
    }
    if is_path_capable(type_path) {
        return true;
    }
    type_path.contains("/Buildable/") || type_path.contains("/Build_")
}

pub fn type_label_and_category(type_path: &str) -> (String, String, Option<String>) {
    let label = {
        let readable = readable_label(type_path);
        if readable.is_empty() {
            short_class_name(type_path).to_string()
        } else {
            readable
        }
    };
    let category = categorize_type_path(type_path).to_string();
    let subcategory = categorize_subcategory(type_path).map(str::to_string);
    (label, category, subcategory)
}

pub fn classify_volume(type_path: &str, beam_length_cm: Option<f64>) -> Option<LocalVolume> {
    let entry = gamedata::get().buildings.get(short_class_name(type_path))?;
    let named = named_extent_m(entry);
    let clearance = clearance_union_m(entry);
    let adaptive = is_adaptive_beam(entry);
    if adaptive {
        let Some((offset, mut extent)) = clearance else {
            return None;
        };
        if let Some(len_cm) = beam_length_cm {
            if len_cm.is_finite() && len_cm > 0.0 {
                let length_m = len_cm / 100.0;
                let axis = longest_axis(extent);
                let min_axis = offset[axis] - extent[axis] / 2.0;
                extent[axis] = length_m;
                let mut offset = offset;
                offset[axis] = min_axis + length_m / 2.0;
                if extent.iter().all(|&e| e.is_finite() && e > 0.0) && finite_vec3(offset) {
                    return Some(LocalVolume {
                        size_kind: SizeKind::ClearanceReserve,
                        extent_m: extent,
                        offset_m: offset,
                        class_reserve_length: false,
                    });
                }
            }
        }
        return Some(LocalVolume {
            size_kind: SizeKind::ClearanceReserve,
            extent_m: extent,
            offset_m: offset,
            class_reserve_length: true,
        });
    }
    match (named, clearance) {
        (Some(named), Some((offset, mut extent))) => {
            extent[0] = extent[0].max(named[0]);
            extent[1] = extent[1].max(named[1]);
            extent[2] = extent[2].max(named[2]);
            Some(LocalVolume {
                size_kind: SizeKind::NamedBox,
                extent_m: extent,
                offset_m: offset,
                class_reserve_length: false,
            })
        }
        (Some(named), None) => Some(LocalVolume {
            size_kind: SizeKind::NamedBox,
            extent_m: named,
            offset_m: [0.0, 0.0, 0.0],
            class_reserve_length: false,
        }),
        (None, Some((offset, extent))) => Some(LocalVolume {
            size_kind: SizeKind::ClearanceReserve,
            extent_m: extent,
            offset_m: offset,
            class_reserve_length: false,
        }),
        (None, None) => None,
    }
}

fn named_extent_m(entry: &Value) -> Option<[f64; 3]> {
    let dim = entry.get("dimensions")?;
    let w = positive_dim(dim.get("Width"))?;
    let d = positive_dim(dim.get("Depth"))?;
    let h = positive_dim(dim.get("Height"))?;
    Some([w / 100.0, d / 100.0, h / 100.0])
}

fn positive_dim(value: Option<&Value>) -> Option<f64> {
    let n = value.and_then(Value::as_f64)?;
    (n.is_finite() && n > 0.0).then_some(n)
}

fn is_adaptive_beam(entry: &Value) -> bool {
    let Some(adaptive) = entry.get("adaptiveLength") else {
        return false;
    };
    let Some(default_len) = adaptive.get("DefaultLength").and_then(Value::as_f64) else {
        return false;
    };
    let Some(max_len) = adaptive.get("MaxLength").and_then(Value::as_f64) else {
        return false;
    };
    if default_len == 0.0 || max_len == 0.0 || !default_len.is_finite() || !max_len.is_finite() {
        return false;
    }
    matches!(entry.get("clearance"), Some(Value::Array(boxes)) if !boxes.is_empty())
}

fn longest_axis(extent: [f64; 3]) -> usize {
    let mut axis = 0usize;
    for i in 1..3 {
        if extent[i] > extent[axis] {
            axis = i;
        }
    }
    axis
}

fn clearance_union_m(entry: &Value) -> Option<([f64; 3], [f64; 3])> {
    let boxes = match entry.get("clearance") {
        Some(Value::Array(boxes)) if !boxes.is_empty() => boxes,
        _ => return None,
    };
    let mut have = false;
    let mut min = [f64::INFINITY; 3];
    let mut max = [f64::NEG_INFINITY; 3];
    for b in boxes {
        let Some(aabb) = oriented_clearance_aabb(b) else {
            continue;
        };
        have = true;
        for i in 0..3 {
            min[i] = min[i].min(aabb.0[i]);
            max[i] = max[i].max(aabb.1[i]);
        }
    }
    if !have || !min.iter().all(|v| v.is_finite()) || !max.iter().all(|v| v.is_finite()) {
        return None;
    }
    if (0..3).any(|i| min[i] > max[i]) {
        return None;
    }
    let extent = [
        (max[0] - min[0]) / 100.0,
        (max[1] - min[1]) / 100.0,
        (max[2] - min[2]) / 100.0,
    ];
    if extent.iter().any(|&e| !e.is_finite() || e <= 0.0) {
        return None;
    }
    let offset = [
        f64::midpoint(min[0], max[0]) / 100.0,
        f64::midpoint(min[1], max[1]) / 100.0,
        f64::midpoint(min[2], max[2]) / 100.0,
    ];
    if !finite_vec3(offset) {
        return None;
    }
    Some((offset, extent))
}

fn oriented_clearance_aabb(b: &Value) -> Option<([f64; 3], [f64; 3])> {
    let min = json_vec3(b.get("min"))?;
    let max = json_vec3(b.get("max"))?;
    if (0..3).any(|i| !min[i].is_finite() || !max[i].is_finite() || min[i] > max[i]) {
        return None;
    }
    let quat = match b.get("rotation") {
        Some(rot) => {
            let q = [
                rot.get("x").and_then(Value::as_f64)?,
                rot.get("y").and_then(Value::as_f64)?,
                rot.get("z").and_then(Value::as_f64)?,
                rot.get("w").and_then(Value::as_f64)?,
            ];
            normalize_quat(q)?
        }
        None => [0.0, 0.0, 0.0, 1.0],
    };
    let mut out_min = [f64::INFINITY; 3];
    let mut out_max = [f64::NEG_INFINITY; 3];
    for &x in &[min[0], max[0]] {
        for &y in &[min[1], max[1]] {
            for &z in &[min[2], max[2]] {
                let p = rotate_vector_by_quaternion(quat, [x, y, z]);
                for i in 0..3 {
                    out_min[i] = out_min[i].min(p[i]);
                    out_max[i] = out_max[i].max(p[i]);
                }
            }
        }
    }
    if !out_min.iter().all(|v| v.is_finite()) || !out_max.iter().all(|v| v.is_finite()) {
        return None;
    }
    Some((out_min, out_max))
}

fn json_vec3(value: Option<&Value>) -> Option<[f64; 3]> {
    let obj = value?;
    Some([
        obj.get("x").and_then(Value::as_f64)?,
        obj.get("y").and_then(Value::as_f64)?,
        obj.get("z").and_then(Value::as_f64)?,
    ])
}

pub fn visit_source_records(
    store: &SaveStore,
    request_id: &str,
    mut visit: impl FnMut(SourceRecord) -> Result<(), RegionalError>,
) -> Result<(), RegionalError> {
    let scan = SaveScan::new(store);
    let data = scan.data();
    for (li, level) in store.levels.iter().enumerate() {
        for (oi, header) in level.headers.iter().enumerate() {
            let Header::Actor(actor) = header else { continue };
            let type_path = actor.type_path.to_string(data);
            if !is_regional_class(&type_path) {
                continue;
            }
            let id = actor.instance_name.to_string(data);
            let position_cm = [
                actor.position[0] as f64,
                actor.position[1] as f64,
                actor.position[2] as f64,
            ];
            if !finite_vec3(position_cm) {
                return Err(RegionalError::source_data_invalid(Some(request_id.to_string()), Some(&id)));
            }
            let position_m = [position_cm[0] / 100.0, position_cm[1] / 100.0, position_cm[2] / 100.0];
            let quat_src = [
                actor.rotation[0] as f64,
                actor.rotation[1] as f64,
                actor.rotation[2] as f64,
                actor.rotation[3] as f64,
            ];
            let quaternion = quaternion_is_known(quat_src).then_some(quat_src);
            let scale_src = [
                actor.scale[0] as f64,
                actor.scale[1] as f64,
                actor.scale[2] as f64,
            ];
            let scale = scale_is_known(scale_src).then_some(scale_src);
            let object = scan.parse_object((li, oi));
            let beam_length = object.as_ref().and_then(|o| props::float(&o.properties, data, b"BeamLength"));
            let volume = classify_volume(&type_path, beam_length);
            let path = if is_path_capable(&type_path) {
                match object.as_ref() {
                    Some(object) => read_path_geom(
                        object,
                        data,
                        &type_path,
                        position_m,
                        quaternion,
                        scale,
                    ),
                    None => PathGeom::Unavailable,
                }
            } else {
                PathGeom::NotPath
            };
            visit(SourceRecord {
                id,
                type_path,
                source_kind: SourceKind::Actor,
                position_m,
                quaternion,
                scale,
                volume,
                path,
            })?;
        }
    }
    if let Some(subsystem) = scan.lightweight_subsystem_object() {
        if let ActorSpecific::Lightweight { items, .. } = &subsystem.actor_specific {
            for group in items {
                let type_path = group.type_path.to_string(data);
                if !is_regional_class(&type_path) {
                    continue;
                }
                for (idx, instance) in group.instances.iter().enumerate() {
                    let id = format!("LightweightBuildable:{type_path}:{idx}");
                    if !finite_vec3(instance.position) {
                        return Err(RegionalError::source_data_invalid(
                            Some(request_id.to_string()),
                            Some(&id),
                        ));
                    }
                    let position_m = [
                        instance.position[0] / 100.0,
                        instance.position[1] / 100.0,
                        instance.position[2] / 100.0,
                    ];
                    let quaternion =
                        quaternion_is_known(instance.rotation).then_some(instance.rotation);
                    let scale = read_lightweight_scale(data, instance.record_off, instance.record_len);
                    let beam_length = instance
                        .data_property
                        .as_ref()
                        .and_then(|pl| props::float(pl, data, b"BeamLength"));
                    let volume = classify_volume(&type_path, beam_length);
                    visit(SourceRecord {
                        id,
                        type_path: type_path.clone(),
                        source_kind: SourceKind::Lightweight,
                        position_m,
                        quaternion,
                        scale,
                        volume,
                        path: PathGeom::NotPath,
                    })?;
                }
            }
        }
    }
    Ok(())
}

fn read_path_geom(
    object: &Object,
    data: &[u8],
    type_path: &str,
    position_m: [f64; 3],
    quaternion: Option<[f64; 4]>,
    scale: Option<[f64; 3]>,
) -> PathGeom {
    if POWER_LINES.contains(&type_path) {
        return read_cable_path(object, data);
    }
    let Some(quat) = quaternion.and_then(normalize_quat) else {
        return PathGeom::Unavailable;
    };
    let Some(scale) = scale else {
        return PathGeom::Unavailable;
    };
    let prop: &[u8] = if VEHICLE_PATH_SEGMENTS.contains(&type_path) {
        b"mSplinePoints"
    } else {
        b"mSplineData"
    };
    let Some(PropertyValue::Array(ArrayValue::Structs(points))) = find_prop(&object.properties, data, prop)
    else {
        return PathGeom::Unavailable;
    };
    let mut chains: Vec<Vec<PathVertex>> = Vec::new();
    let mut current: Vec<PathVertex> = Vec::new();
    for point in points {
        match vector_prop(point, data, b"Location") {
            Some(location_cm) if finite_vec3(location_cm) => {
                let local_m = [location_cm[0] / 100.0, location_cm[1] / 100.0, location_cm[2] / 100.0];
                let world_m = transform_point(position_m, quat, scale, local_m);
                if !finite_vec3(world_m) {
                    if !current.is_empty() {
                        chains.push(std::mem::take(&mut current));
                    }
                    continue;
                }
                let arrive = vector_prop(point, data, b"ArriveTangent")
                    .filter(|t| finite_vec3(*t))
                    .map(|t| transform_tangent(quat, scale, t));
                let leave = vector_prop(point, data, b"LeaveTangent")
                    .filter(|t| finite_vec3(*t))
                    .map(|t| transform_tangent(quat, scale, t));
                current.push(PathVertex { world_m, arrive_m: arrive, leave_m: leave });
            }
            _ => {
                if !current.is_empty() {
                    chains.push(std::mem::take(&mut current));
                }
            }
        }
    }
    if !current.is_empty() {
        chains.push(current);
    }
    chains.retain(|c| c.len() >= 2);
    if chains.is_empty() {
        PathGeom::Unavailable
    } else {
        PathGeom::Linear(chains)
    }
}

fn read_cable_path(object: &Object, data: &[u8]) -> PathGeom {
    let Some(entries) = props::array_structs(&object.properties, data, b"mWireInstances") else {
        return PathGeom::Unavailable;
    };
    let Some(first) = entries.first() else {
        return PathGeom::Unavailable;
    };
    let mut locations: Vec<[f64; 3]> = Vec::new();
    for prop in &first.props {
        if prop.name.wide || prop.name.bytes(data) != b"Locations" {
            continue;
        }
        let PropertyValue::Struct(StructValue::Vector(destination)) = &prop.value else {
            continue;
        };
        if finite_vec3(*destination) {
            locations.push([destination[0] / 100.0, destination[1] / 100.0, destination[2] / 100.0]);
        } else if !locations.is_empty() {
            break;
        }
    }
    if locations.len() < 2 {
        return PathGeom::Unavailable;
    }
    let chain = locations
        .into_iter()
        .map(|world_m| PathVertex { world_m, arrive_m: None, leave_m: None })
        .collect();
    PathGeom::Linear(vec![chain])
}

pub fn json_number(x: f64) -> Value {
    if x.is_finite() && x.fract() == 0.0 && x >= i64::MIN as f64 && x <= i64::MAX as f64 {
        json!(x as i64)
    } else {
        json!(x)
    }
}
