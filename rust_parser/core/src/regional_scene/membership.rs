//! Closed f64 membership and source-chord clipping. Count and extract share
//! this iterator/predicate.

use super::{
    finite_vec3, normalize_quat, transform_point, LocalVolume, PathGeom, PathState, PathVertex,
    RecordKind, SizeKind, SourceRecord, Uncertainty,
};

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Aabb {
    pub min: [f64; 3],
    pub max: [f64; 3],
}

impl Aabb {
    pub fn from_bounds(min: [f64; 3], max: [f64; 3]) -> Self {
        Aabb { min, max }
    }

    pub fn contains_point(self, p: [f64; 3]) -> bool {
        (0..3).all(|i| p[i] >= self.min[i] && p[i] <= self.max[i])
    }

    pub fn intersects(self, other: Aabb) -> bool {
        (0..3).all(|i| self.min[i] <= other.max[i] && self.max[i] >= other.min[i])
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct ClippedVertex {
    pub world_m: [f64; 3],
    pub arrive_m: Option<[f64; 3]>,
    pub leave_m: Option<[f64; 3]>,
    pub generated: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ClippedFragment {
    pub vertices: Vec<ClippedVertex>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Admitted {
    pub record: SourceRecord,
    pub record_kind: RecordKind,
    pub path_state: PathState,
    pub uncertainty: Vec<Uncertainty>,
    pub fragments: Vec<ClippedFragment>,
}

pub fn admit(record: &SourceRecord, region: Aabb) -> Result<Option<Admitted>, super::RegionalError> {
    if !finite_vec3(record.position_m) {
        return Err(super::RegionalError::source_data_invalid(None, Some(&record.id)));
    }
    let scale_known = record.scale.is_some();
    let quat_known = record.quaternion.is_some();
    let (path_state, fragments) = match &record.path {
        PathGeom::NotPath => (PathState::NotPath, Vec::new()),
        PathGeom::Unavailable => (PathState::Unavailable, Vec::new()),
        PathGeom::Linear(_) if !scale_known || !quat_known => (PathState::Unavailable, Vec::new()),
        PathGeom::Linear(chains) => {
            let fragments = clip_chains(chains, region);
            if fragments.is_empty() {
                return Ok(None);
            }
            (PathState::Linear, fragments)
        }
    };

    let origin_only = match path_state {
        PathState::Linear => false,
        PathState::Unavailable | PathState::NotPath => {
            record.volume.is_none() || !scale_known || !quat_known
        }
    };

    let inside = if path_state == PathState::Linear {
        true
    } else if origin_only {
        region.contains_point(record.position_m)
    } else {
        match world_volume_aabb(record) {
            Some(aabb) => region.intersects(aabb),
            None => region.contains_point(record.position_m),
        }
    };
    if !inside {
        return Ok(None);
    }

    let record_kind = match path_state {
        PathState::Linear | PathState::Unavailable => RecordKind::Path,
        PathState::NotPath => RecordKind::Occupant,
    };
    let size_kind = record.volume.as_ref().map(|v| v.size_kind).unwrap_or(SizeKind::Unknown);
    let class_reserve = record.volume.as_ref().is_some_and(|v| v.class_reserve_length);
    Ok(Some(Admitted {
        record: record.clone(),
        record_kind,
        path_state,
        uncertainty: assemble_uncertainty(size_kind, scale_known, quat_known, path_state, class_reserve),
        fragments,
    }))
}

pub fn assemble_uncertainty(
    size_kind: SizeKind,
    scale_known: bool,
    quat_known: bool,
    path_state: PathState,
    class_reserve_length: bool,
) -> Vec<Uncertainty> {
    let mut out = Vec::new();
    if size_kind == SizeKind::Unknown && path_state != PathState::Linear {
        out.push(Uncertainty::SizeUnknown);
    }
    if !scale_known {
        out.push(Uncertainty::ScaleUnknown);
    }
    if !quat_known {
        out.push(Uncertainty::OrientationUnknown);
    }
    if path_state == PathState::Unavailable {
        out.push(Uncertainty::PathUnavailable);
    }
    if class_reserve_length {
        out.push(Uncertainty::ClassReserveLength);
    }
    out
}

pub fn world_volume_aabb(record: &SourceRecord) -> Option<Aabb> {
    let LocalVolume { extent_m, offset_m, .. } = record.volume.as_ref()?;
    let quat = normalize_quat(record.quaternion?)?;
    let scale = record.scale?;
    volume_aabb(record.position_m, quat, scale, *extent_m, *offset_m)
}

pub fn volume_aabb(
    position_m: [f64; 3],
    quat: [f64; 4],
    scale: [f64; 3],
    extent_m: [f64; 3],
    offset_m: [f64; 3],
) -> Option<Aabb> {
    if !finite_vec3(extent_m) || extent_m.iter().any(|&e| e <= 0.0) || !finite_vec3(offset_m) {
        return None;
    }
    let half = [extent_m[0] / 2.0, extent_m[1] / 2.0, extent_m[2] / 2.0];
    let mut min = [f64::INFINITY; 3];
    let mut max = [f64::NEG_INFINITY; 3];
    for &dx in &[-1.0, 1.0] {
        for &dy in &[-1.0, 1.0] {
            for &dz in &[-1.0, 1.0] {
                let local = [
                    offset_m[0] + dx * half[0],
                    offset_m[1] + dy * half[1],
                    offset_m[2] + dz * half[2],
                ];
                let world = transform_point(position_m, quat, scale, local);
                if !finite_vec3(world) {
                    return None;
                }
                for i in 0..3 {
                    min[i] = min[i].min(world[i]);
                    max[i] = max[i].max(world[i]);
                }
            }
        }
    }
    Some(Aabb { min, max })
}

fn clip_chains(chains: &[Vec<PathVertex>], region: Aabb) -> Vec<ClippedFragment> {
    let mut fragments = Vec::new();
    for chain in chains {
        clip_polyline(chain, region, &mut fragments);
    }
    fragments
}

fn clip_polyline(chain: &[PathVertex], region: Aabb, out: &mut Vec<ClippedFragment>) {
    if chain.len() < 2 {
        return;
    }
    let mut current: Vec<ClippedVertex> = Vec::new();
    for pair in chain.windows(2) {
        match clip_segment(&pair[0], &pair[1], region) {
            None => flush_fragment(&mut current, out),
            Some(points) => {
                for p in points {
                    push_coalesced(&mut current, p);
                }
            }
        }
    }
    flush_fragment(&mut current, out);
}

fn flush_fragment(current: &mut Vec<ClippedVertex>, out: &mut Vec<ClippedFragment>) {
    if current.is_empty() {
        return;
    }
    out.push(ClippedFragment { vertices: std::mem::take(current) });
}

fn same_point(a: [f64; 3], b: [f64; 3]) -> bool {
    a[0] == b[0] && a[1] == b[1] && a[2] == b[2]
}

fn push_coalesced(current: &mut Vec<ClippedVertex>, next: ClippedVertex) {
    if let Some(last) = current.last_mut() {
        if same_point(last.world_m, next.world_m) {
            if last.generated && !next.generated {
                *last = next;
            }
            return;
        }
    }
    current.push(next);
}

fn clip_segment(a: &PathVertex, b: &PathVertex, region: Aabb) -> Option<Vec<ClippedVertex>> {
    let (t0, t1) = clip_t(a.world_m, b.world_m, region)?;
    let p0 = interpolate(a, b, t0);
    let p1 = interpolate(a, b, t1);
    if same_point(p0.world_m, p1.world_m) {
        let mut contact = p0;
        let original = t0 == 0.0 || t0 == 1.0;
        if !original {
            contact.generated = true;
            contact.arrive_m = None;
            contact.leave_m = None;
        }
        Some(vec![contact])
    } else {
        Some(vec![p0, p1])
    }
}

fn interpolate(a: &PathVertex, b: &PathVertex, t: f64) -> ClippedVertex {
    if t == 0.0 {
        return ClippedVertex {
            world_m: a.world_m,
            arrive_m: a.arrive_m,
            leave_m: a.leave_m,
            generated: false,
        };
    }
    if t == 1.0 {
        return ClippedVertex {
            world_m: b.world_m,
            arrive_m: b.arrive_m,
            leave_m: b.leave_m,
            generated: false,
        };
    }
    let world_m = [
        a.world_m[0] + (b.world_m[0] - a.world_m[0]) * t,
        a.world_m[1] + (b.world_m[1] - a.world_m[1]) * t,
        a.world_m[2] + (b.world_m[2] - a.world_m[2]) * t,
    ];
    ClippedVertex { world_m, arrive_m: None, leave_m: None, generated: true }
}

fn clip_t(a: [f64; 3], b: [f64; 3], region: Aabb) -> Option<(f64, f64)> {
    let mut t0: f64 = 0.0;
    let mut t1: f64 = 1.0;
    for i in 0..3 {
        let d = b[i] - a[i];
        if d == 0.0 {
            if a[i] < region.min[i] || a[i] > region.max[i] {
                return None;
            }
            continue;
        }
        let mut tn = (region.min[i] - a[i]) / d;
        let mut tf = (region.max[i] - a[i]) / d;
        if tn > tf {
            std::mem::swap(&mut tn, &mut tf);
        }
        t0 = t0.max(tn);
        t1 = t1.min(tf);
        if t0 > t1 {
            return None;
        }
    }
    Some((t0, t1))
}
