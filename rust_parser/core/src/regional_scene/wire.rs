//! Atomic admission plus canonical v1 frame encoding.

use super::membership::{admit, Aabb, Admitted, ClippedVertex};
use super::{
    json_number, type_label_and_category, visit_source_records, EffectiveRegion, PathState,
    RecordKind, RegionalError, RegionalRequest, SizeKind, SourceKind, SourceRecord, ADMISSION_LIMIT,
    HEADER_BYTES, MAGIC, SCHEMA_VERSION,
};
use crate::store::SaveStore;
use serde_json::{json, Map, Value};

pub const MAX_FRAME_BYTES: u32 = 67_108_864;

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ExtractTrace {
    pub admitted: u32,
    pub pose_rows_reserved: u32,
    pub fragment_rows_reserved: u32,
    pub vertex_rows_reserved: u32,
}

#[derive(Debug, Clone)]
pub struct TypeRow {
    pub type_path: String,
    pub label: String,
    pub category: String,
    pub subcategory: Option<String>,
}

#[derive(Debug, Clone)]
pub struct OccupantRow {
    pub id: String,
    pub type_index: u32,
    pub source_kind: SourceKind,
    pub record_kind: RecordKind,
    pub size_kind: SizeKind,
    pub pose_flags: u8,
    pub path_state: PathState,
    pub uncertainty: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct SceneFrameInput {
    pub request_id: String,
    pub origin_m: [f64; 3],
    pub effective_min: Option<[f64; 3]>,
    pub effective_max: Option<[f64; 3]>,
    pub empty_reason: Option<&'static str>,
    pub types: Vec<TypeRow>,
    pub occupants: Vec<OccupantRow>,
    pub poses: Vec<[f32; 16]>,
    pub fragments: Vec<[u32; 4]>,
    pub vertices: Vec<[f32; 9]>,
    pub vertex_flags: Vec<u32>,
}

pub fn align8(n: u32) -> Result<u32, RegionalError> {
    n.checked_add(7)
        .map(|x| x & !7)
        .ok_or_else(|| RegionalError::resource_exhausted(None, false))
}

pub fn encoded_frame_size(
    metadata_bytes: u32,
    n: u32,
    f: u32,
    v: u32,
    request_id: Option<&str>,
) -> Result<[u32; 5], RegionalError> {
    let rid = request_id.map(str::to_string);
    let pose_off = align8(HEADER_BYTES.checked_add(metadata_bytes).ok_or_else(|| {
        RegionalError::resource_exhausted(rid.clone(), false)
    })?)
    .map_err(|_| RegionalError::resource_exhausted(rid.clone(), false))?;
    let pose_bytes = n
        .checked_mul(64)
        .ok_or_else(|| RegionalError::resource_exhausted(rid.clone(), false))?;
    let frag_off = align8(pose_off.checked_add(pose_bytes).ok_or_else(|| {
        RegionalError::resource_exhausted(rid.clone(), false)
    })?)
    .map_err(|_| RegionalError::resource_exhausted(rid.clone(), false))?;
    let frag_bytes = f
        .checked_mul(16)
        .ok_or_else(|| RegionalError::resource_exhausted(rid.clone(), false))?;
    let vert_off = align8(frag_off.checked_add(frag_bytes).ok_or_else(|| {
        RegionalError::resource_exhausted(rid.clone(), false)
    })?)
    .map_err(|_| RegionalError::resource_exhausted(rid.clone(), false))?;
    let vert_bytes = v
        .checked_mul(36)
        .ok_or_else(|| RegionalError::resource_exhausted(rid.clone(), false))?;
    let flags_off = align8(vert_off.checked_add(vert_bytes).ok_or_else(|| {
        RegionalError::resource_exhausted(rid.clone(), false)
    })?)
    .map_err(|_| RegionalError::resource_exhausted(rid.clone(), false))?;
    let flag_bytes = v
        .checked_mul(4)
        .ok_or_else(|| RegionalError::resource_exhausted(rid.clone(), false))?;
    let total = align8(flags_off.checked_add(flag_bytes).ok_or_else(|| {
        RegionalError::resource_exhausted(rid.clone(), false)
    })?)
    .map_err(|_| RegionalError::resource_exhausted(rid.clone(), false))?;
    if total > MAX_FRAME_BYTES {
        return Err(RegionalError::resource_exhausted(rid, true));
    }
    Ok([pose_off, frag_off, vert_off, flags_off, total])
}

pub fn encode_scene_frame(input: &SceneFrameInput) -> Result<Vec<u8>, RegionalError> {
    let n = u32::try_from(input.occupants.len())
        .map_err(|_| RegionalError::resource_exhausted(Some(input.request_id.clone()), false))?;
    let f = u32::try_from(input.fragments.len())
        .map_err(|_| RegionalError::resource_exhausted(Some(input.request_id.clone()), false))?;
    let v = u32::try_from(input.vertices.len())
        .map_err(|_| RegionalError::resource_exhausted(Some(input.request_id.clone()), false))?;
    if n > ADMISSION_LIMIT {
        return Err(RegionalError::region_too_large(Some(input.request_id.clone())));
    }
    if input.poses.len() != input.occupants.len()
        || input.vertex_flags.len() != input.vertices.len()
        || n == 0 && (f != 0 || v != 0)
    {
        return Err(RegionalError::source_data_invalid(Some(input.request_id.clone()), None));
    }
    let metadata = compact_metadata(input)?;
    let metadata_bytes = u32::try_from(metadata.len())
        .map_err(|_| RegionalError::resource_exhausted(Some(input.request_id.clone()), false))?;
    let [pose_off, frag_off, vert_off, flags_off, total] =
        encoded_frame_size(metadata_bytes, n, f, v, Some(&input.request_id))?;
    let mut frame = Vec::new();
    frame
        .try_reserve(total as usize)
        .map_err(|_| RegionalError::resource_exhausted(Some(input.request_id.clone()), false))?;
    frame.resize(total as usize, 0);
    frame[..8].copy_from_slice(MAGIC);
    put_u32(&mut frame, 8, SCHEMA_VERSION);
    put_u32(&mut frame, 12, HEADER_BYTES);
    put_u32(&mut frame, 16, total);
    put_u32(&mut frame, 20, metadata_bytes);
    put_u32(&mut frame, 24, n);
    put_u32(&mut frame, 28, f);
    put_u32(&mut frame, 32, v);
    put_u32(&mut frame, 36, 0);
    put_f64(&mut frame, 40, input.origin_m[0]);
    put_f64(&mut frame, 48, input.origin_m[1]);
    put_f64(&mut frame, 56, input.origin_m[2]);
    let (min, max) = match (input.effective_min, input.effective_max) {
        (Some(min), Some(max)) => (min, max),
        _ => ([0.0; 3], [0.0; 3]),
    };
    put_f64(&mut frame, 64, min[0]);
    put_f64(&mut frame, 72, min[1]);
    put_f64(&mut frame, 80, min[2]);
    put_f64(&mut frame, 88, max[0]);
    put_f64(&mut frame, 96, max[1]);
    put_f64(&mut frame, 104, max[2]);
    put_u32(&mut frame, 112, pose_off);
    put_u32(&mut frame, 116, frag_off);
    put_u32(&mut frame, 120, vert_off);
    put_u32(&mut frame, 124, flags_off);
    frame[128..128 + metadata.len()].copy_from_slice(&metadata);
    for (i, pose) in input.poses.iter().enumerate() {
        let off = pose_off as usize + i * 64;
        for (k, value) in pose.iter().enumerate() {
            put_f32(&mut frame, off + k * 4, *value);
        }
    }
    for (i, frag) in input.fragments.iter().enumerate() {
        let off = frag_off as usize + i * 16;
        for (k, value) in frag.iter().enumerate() {
            put_u32(&mut frame, off + k * 4, *value);
        }
    }
    for (i, vertex) in input.vertices.iter().enumerate() {
        let off = vert_off as usize + i * 36;
        for (k, value) in vertex.iter().enumerate() {
            put_f32(&mut frame, off + k * 4, *value);
        }
    }
    for (i, flags) in input.vertex_flags.iter().enumerate() {
        put_u32(&mut frame, flags_off as usize + i * 4, *flags);
    }
    Ok(frame)
}

fn compact_metadata(input: &SceneFrameInput) -> Result<Vec<u8>, RegionalError> {
    let mut meta = Map::new();
    meta.insert("requestId".into(), json!(input.request_id));
    meta.insert("admissionCount".into(), json!(input.occupants.len() as i64));
    match (input.effective_min, input.effective_max) {
        (Some(min), Some(max)) => {
            let mut bounds = Map::new();
            bounds.insert("min".into(), json!([json_number(min[0]), json_number(min[1]), json_number(min[2])]));
            bounds.insert("max".into(), json!([json_number(max[0]), json_number(max[1]), json_number(max[2])]));
            meta.insert("effectiveBoundsM".into(), Value::Object(bounds));
        }
        _ => {
            meta.insert("effectiveBoundsM".into(), Value::Null);
        }
    }
    meta.insert(
        "emptyReason".into(),
        match input.empty_reason {
            Some(reason) => json!(reason),
            None => Value::Null,
        },
    );
    let types: Vec<Value> = input
        .types
        .iter()
        .map(|row| {
            let mut o = Map::new();
            o.insert("typePath".into(), json!(row.type_path));
            o.insert("label".into(), json!(row.label));
            o.insert("category".into(), json!(row.category));
            o.insert(
                "subcategory".into(),
                match &row.subcategory {
                    Some(s) => json!(s),
                    None => Value::Null,
                },
            );
            Value::Object(o)
        })
        .collect();
    meta.insert("types".into(), Value::Array(types));
    let occupants: Vec<Value> = input
        .occupants
        .iter()
        .map(|row| {
            let mut o = Map::new();
            o.insert("id".into(), json!(row.id));
            o.insert("typeIndex".into(), json!(row.type_index as i64));
            o.insert("sourceKind".into(), json!(row.source_kind.as_str()));
            o.insert("recordKind".into(), json!(row.record_kind.as_str()));
            o.insert("sizeKind".into(), json!(row.size_kind.as_str()));
            o.insert("poseFlags".into(), json!(row.pose_flags as i64));
            o.insert("pathState".into(), json!(row.path_state.as_str()));
            o.insert("uncertainty".into(), json!(row.uncertainty));
            Value::Object(o)
        })
        .collect();
    meta.insert("occupants".into(), Value::Array(occupants));
    serde_json::to_vec(&Value::Object(meta))
        .map_err(|_| RegionalError::source_data_invalid(Some(input.request_id.clone()), None))
}

fn put_u32(buf: &mut [u8], off: usize, value: u32) {
    buf[off..off + 4].copy_from_slice(&value.to_le_bytes());
}

fn put_f32(buf: &mut [u8], off: usize, value: f32) {
    buf[off..off + 4].copy_from_slice(&value.to_le_bytes());
}

fn put_f64(buf: &mut [u8], off: usize, value: f64) {
    buf[off..off + 8].copy_from_slice(&value.to_le_bytes());
}

pub fn regional_scene(store: &SaveStore, request: &RegionalRequest) -> Result<Vec<u8>, RegionalError> {
    let (frame, _trace) = extract_store(store, request)?;
    Ok(frame)
}

pub fn extract_from_records(
    records: &[SourceRecord],
    request: &RegionalRequest,
) -> (Result<Vec<u8>, RegionalError>, ExtractTrace) {
    let mut trace = ExtractTrace::default();
    let region = match request.effective_region() {
        Ok(region) => region,
        Err(err) => return (Err(err), trace),
    };
    if region.disjoint_z {
        return (encode_empty(request, &region, "DISJOINT_Z"), trace);
    }
    let aabb = Aabb::from_bounds(region.min_m, region.max_m);
    let mut count = 0u32;
    let mut fragments = 0u32;
    let mut vertices = 0u32;
    for record in records {
        match admit(record, aabb) {
            Ok(Some(row)) => {
                count = count.saturating_add(1);
                if count > ADMISSION_LIMIT {
                    trace.admitted = count;
                    return (
                        Err(RegionalError::region_too_large(Some(request.request_id.clone()))),
                        trace,
                    );
                }
                match add_path_counts(&row, &mut fragments, &mut vertices, &request.request_id) {
                    Ok(()) => {}
                    Err(err) => return (Err(err), trace),
                }
            }
            Ok(None) => {}
            Err(err) => return (Err(err), trace),
        }
    }
    trace.admitted = count;
    if let Err(err) = encoded_frame_size(0, count, fragments, vertices, Some(&request.request_id)) {
        return (Err(err), trace);
    }
    let mut admitted = Vec::new();
    if let Err(_) = admitted.try_reserve(count as usize) {
        return (
            Err(RegionalError::resource_exhausted(Some(request.request_id.clone()), false)),
            trace,
        );
    }
    for record in records {
        match admit(record, aabb) {
            Ok(Some(row)) => admitted.push(row),
            Ok(None) => {}
            Err(err) => return (Err(err), trace),
        }
    }
    debug_assert_eq!(admitted.len() as u32, count);
    match encode_admitted(request, &region, &admitted) {
        Ok((frame, rows)) => {
            trace.pose_rows_reserved = rows.0;
            trace.fragment_rows_reserved = rows.1;
            trace.vertex_rows_reserved = rows.2;
            (Ok(frame), trace)
        }
        Err(err) => (Err(err), trace),
    }
}

fn extract_store(
    store: &SaveStore,
    request: &RegionalRequest,
) -> Result<(Vec<u8>, ExtractTrace), RegionalError> {
    let region = request.effective_region()?;
    if region.disjoint_z {
        let frame = encode_empty(request, &region, "DISJOINT_Z")?;
        return Ok((frame, ExtractTrace::default()));
    }
    let aabb = Aabb::from_bounds(region.min_m, region.max_m);
    let mut trace = ExtractTrace::default();
    let mut count = 0u32;
    let mut fragments = 0u32;
    let mut vertices = 0u32;
    visit_source_records(store, &request.request_id, |record| {
        if let Some(row) = admit(&record, aabb)? {
            count = count.saturating_add(1);
            if count > ADMISSION_LIMIT {
                return Err(RegionalError::region_too_large(Some(request.request_id.clone())));
            }
            add_path_counts(&row, &mut fragments, &mut vertices, &request.request_id)?;
        }
        Ok(())
    })?;
    trace.admitted = count;
    encoded_frame_size(0, count, fragments, vertices, Some(&request.request_id))?;
    let mut admitted = Vec::new();
    admitted
        .try_reserve(count as usize)
        .map_err(|_| RegionalError::resource_exhausted(Some(request.request_id.clone()), false))?;
    visit_source_records(store, &request.request_id, |record| {
        if let Some(row) = admit(&record, aabb)? {
            admitted.push(row);
        }
        Ok(())
    })?;
    let (frame, rows) = encode_admitted(request, &region, &admitted)?;
    trace.pose_rows_reserved = rows.0;
    trace.fragment_rows_reserved = rows.1;
    trace.vertex_rows_reserved = rows.2;
    Ok((frame, trace))
}

fn encode_empty(
    request: &RegionalRequest,
    region: &EffectiveRegion,
    reason: &'static str,
) -> Result<Vec<u8>, RegionalError> {
    let (effective_min, effective_max) = if reason == "DISJOINT_Z" {
        (None, None)
    } else {
        (Some(region.min_m), Some(region.max_m))
    };
    encode_scene_frame(&SceneFrameInput {
        request_id: request.request_id.clone(),
        origin_m: region.origin_m,
        effective_min,
        effective_max,
        empty_reason: Some(reason),
        types: Vec::new(),
        occupants: Vec::new(),
        poses: Vec::new(),
        fragments: Vec::new(),
        vertices: Vec::new(),
        vertex_flags: Vec::new(),
    })
}

fn add_path_counts(
    row: &Admitted,
    fragments: &mut u32,
    vertices: &mut u32,
    request_id: &str,
) -> Result<(), RegionalError> {
    if row.path_state != PathState::Linear {
        return Ok(());
    }
    for frag in &row.fragments {
        *fragments = fragments
            .checked_add(1)
            .ok_or_else(|| RegionalError::resource_exhausted(Some(request_id.to_string()), false))?;
        let count = u32::try_from(frag.vertices.len())
            .map_err(|_| RegionalError::resource_exhausted(Some(request_id.to_string()), false))?;
        *vertices = vertices
            .checked_add(count)
            .ok_or_else(|| RegionalError::resource_exhausted(Some(request_id.to_string()), false))?;
    }
    Ok(())
}

fn try_reserve<T>(
    vec: &mut Vec<T>,
    additional: usize,
    request_id: &str,
) -> Result<(), RegionalError> {
    vec.try_reserve(additional)
        .map_err(|_| RegionalError::resource_exhausted(Some(request_id.to_string()), false))
}

fn encode_admitted(
    request: &RegionalRequest,
    region: &EffectiveRegion,
    admitted: &[Admitted],
) -> Result<(Vec<u8>, (u32, u32, u32)), RegionalError> {
    if admitted.is_empty() {
        let frame = encode_empty(request, region, "NO_OCCUPANTS")?;
        return Ok((frame, (0, 0, 0)));
    }
    let rid = request.request_id.as_str();
    let n = u32::try_from(admitted.len())
        .map_err(|_| RegionalError::resource_exhausted(Some(rid.to_string()), false))?;
    let mut fragment_count = 0u32;
    let mut vertex_count = 0u32;
    for row in admitted {
        add_path_counts(row, &mut fragment_count, &mut vertex_count, rid)?;
    }

    let mut types: Vec<TypeRow> = Vec::new();
    let mut occupants = Vec::new();
    try_reserve(&mut occupants, admitted.len(), rid)?;
    for row in admitted {
        let type_index = match types.iter().position(|t| t.type_path == row.record.type_path) {
            Some(i) => i as u32,
            None => {
                let (label, category, subcategory) = type_label_and_category(&row.record.type_path);
                types.push(TypeRow {
                    type_path: row.record.type_path.clone(),
                    label,
                    category,
                    subcategory,
                });
                (types.len() - 1) as u32
            }
        };
        let (_pose, flags) = encode_pose(row, region.origin_m, rid)?;
        occupants.push(OccupantRow {
            id: row.record.id.clone(),
            type_index,
            source_kind: row.record.source_kind,
            record_kind: row.record_kind,
            size_kind: row.record.volume.as_ref().map(|v| v.size_kind).unwrap_or(SizeKind::Unknown),
            pose_flags: flags,
            path_state: row.path_state,
            uncertainty: row.uncertainty.iter().map(|u| u.as_str().to_string()).collect(),
        });
    }

    let skeleton = SceneFrameInput {
        request_id: request.request_id.clone(),
        origin_m: region.origin_m,
        effective_min: Some(region.min_m),
        effective_max: Some(region.max_m),
        empty_reason: None,
        types: types.clone(),
        occupants: occupants.clone(),
        poses: Vec::new(),
        fragments: Vec::new(),
        vertices: Vec::new(),
        vertex_flags: Vec::new(),
    };
    let metadata = compact_metadata(&skeleton)?;
    let metadata_bytes = u32::try_from(metadata.len())
        .map_err(|_| RegionalError::resource_exhausted(Some(rid.to_string()), false))?;
    encoded_frame_size(metadata_bytes, n, fragment_count, vertex_count, Some(rid))?;

    let mut poses = Vec::new();
    let mut fragments = Vec::new();
    let mut vertices = Vec::new();
    let mut vertex_flags = Vec::new();
    try_reserve(&mut poses, admitted.len(), rid)?;
    try_reserve(&mut fragments, fragment_count as usize, rid)?;
    try_reserve(&mut vertices, vertex_count as usize, rid)?;
    try_reserve(&mut vertex_flags, vertex_count as usize, rid)?;
    for row in admitted {
        poses.push(encode_pose(row, region.origin_m, rid)?.0);
    }
    for (occupant_index, row) in admitted.iter().enumerate() {
        if row.path_state != PathState::Linear {
            continue;
        }
        for frag in &row.fragments {
            let first = u32::try_from(vertices.len())
                .map_err(|_| RegionalError::resource_exhausted(Some(rid.to_string()), false))?;
            let count = u32::try_from(frag.vertices.len())
                .map_err(|_| RegionalError::resource_exhausted(Some(rid.to_string()), false))?;
            fragments.push([occupant_index as u32, first, count, 0]);
            for vertex in &frag.vertices {
                let (encoded, vflags) = encode_vertex(vertex, region.origin_m, rid)?;
                vertices.push(encoded);
                vertex_flags.push(vflags);
            }
        }
    }
    let frame = encode_scene_frame(&SceneFrameInput {
        request_id: request.request_id.clone(),
        origin_m: region.origin_m,
        effective_min: Some(region.min_m),
        effective_max: Some(region.max_m),
        empty_reason: None,
        types,
        occupants,
        poses,
        fragments,
        vertices,
        vertex_flags,
    })?;
    Ok((frame, (n, fragment_count, vertex_count)))
}

fn encode_pose(
    row: &Admitted,
    origin: [f64; 3],
    request_id: &str,
) -> Result<([f32; 16], u8), RegionalError> {
    let mut pose = [0.0f32; 16];
    let mut flags = 0u8;
    let rel = [
        row.record.position_m[0] - origin[0],
        row.record.position_m[1] - origin[1],
        row.record.position_m[2] - origin[2],
    ];
    pose[0] = finite_f32(rel[0], request_id, Some(&row.record.id))?;
    pose[1] = finite_f32(rel[1], request_id, Some(&row.record.id))?;
    pose[2] = finite_f32(rel[2], request_id, Some(&row.record.id))?;
    if let Some(q) = row.record.quaternion {
        pose[3] = finite_f32(q[0], request_id, Some(&row.record.id))?;
        pose[4] = finite_f32(q[1], request_id, Some(&row.record.id))?;
        pose[5] = finite_f32(q[2], request_id, Some(&row.record.id))?;
        pose[6] = finite_f32(q[3], request_id, Some(&row.record.id))?;
        flags |= 1;
    }
    if let Some(s) = row.record.scale {
        pose[7] = finite_f32(s[0], request_id, Some(&row.record.id))?;
        pose[8] = finite_f32(s[1], request_id, Some(&row.record.id))?;
        pose[9] = finite_f32(s[2], request_id, Some(&row.record.id))?;
        flags |= 2;
    }
    let size_kind = row.record.volume.as_ref().map(|v| v.size_kind).unwrap_or(SizeKind::Unknown);
    if size_kind != SizeKind::Unknown {
        if let Some(vol) = &row.record.volume {
            pose[10] = finite_f32(vol.extent_m[0], request_id, Some(&row.record.id))?;
            pose[11] = finite_f32(vol.extent_m[1], request_id, Some(&row.record.id))?;
            pose[12] = finite_f32(vol.extent_m[2], request_id, Some(&row.record.id))?;
            flags |= 4;
            if vol.offset_m.iter().any(|&c| c != 0.0) {
                pose[13] = finite_f32(vol.offset_m[0], request_id, Some(&row.record.id))?;
                pose[14] = finite_f32(vol.offset_m[1], request_id, Some(&row.record.id))?;
                pose[15] = finite_f32(vol.offset_m[2], request_id, Some(&row.record.id))?;
                flags |= 8;
            }
        }
    }
    Ok((pose, flags))
}

fn encode_vertex(
    vertex: &ClippedVertex,
    origin: [f64; 3],
    request_id: &str,
) -> Result<([f32; 9], u32), RegionalError> {
    let mut out = [0.0f32; 9];
    let mut flags = 0u32;
    out[0] = finite_f32(vertex.world_m[0] - origin[0], request_id, None)?;
    out[1] = finite_f32(vertex.world_m[1] - origin[1], request_id, None)?;
    out[2] = finite_f32(vertex.world_m[2] - origin[2], request_id, None)?;
    if vertex.generated {
        flags |= 4;
    } else {
        if let Some(arrive) = vertex.arrive_m {
            out[3] = finite_f32(arrive[0], request_id, None)?;
            out[4] = finite_f32(arrive[1], request_id, None)?;
            out[5] = finite_f32(arrive[2], request_id, None)?;
            flags |= 1;
        }
        if let Some(leave) = vertex.leave_m {
            out[6] = finite_f32(leave[0], request_id, None)?;
            out[7] = finite_f32(leave[1], request_id, None)?;
            out[8] = finite_f32(leave[2], request_id, None)?;
            flags |= 2;
        }
    }
    Ok((out, flags))
}

fn finite_f32(value: f64, request_id: &str, id: Option<&str>) -> Result<f32, RegionalError> {
    let encoded = value as f32;
    if !encoded.is_finite() {
        return Err(RegionalError::source_data_invalid(Some(request_id.to_string()), id));
    }
    Ok(encoded)
}
