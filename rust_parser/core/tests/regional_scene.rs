//! Contract tests for the regional scene core (ticket 60 phase 1 / HEC-01, HEC-02,
//! producer half of HEC-03). These are core extract tests, not a runtime viewer pass.

use sav_core::editor::{effective_body, session};
use sav_core::level::parse_full_save_lean;
use sav_core::mapdata;
use sav_core::object::ClassTables;
use sav_core::regional_scene::membership::{admit, Aabb};
use sav_core::regional_scene::wire::{OccupantRow, SceneFrameInput, TypeRow};
use sav_core::regional_scene::{
    classify_volume, encode_scene_frame, encoded_frame_size, extract_from_records, is_regional_class,
    read_lightweight_scale, regional_scene, LocalVolume, PathGeom, PathState, PathVertex, RecordKind,
    RegionalErrorCode, RegionalRequest, SizeKind, SourceKind, SourceRecord, ADMISSION_LIMIT,
    MAX_FRAME_BYTES,
};
use sav_core::store::Header;
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::path::PathBuf;

fn vectors() -> Value {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/regional-scene-v1-vectors.json");
    serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap()
}

fn request_json(value: &Value) -> RegionalRequest {
    RegionalRequest::from_json(&serde_json::to_string(value).unwrap()).unwrap()
}

fn identity_quat() -> [f64; 4] {
    [0.0, 0.0, 0.0, 1.0]
}

fn origin_occupant(id: &str, position_m: [f64; 3], volume: Option<LocalVolume>) -> SourceRecord {
    SourceRecord {
        id: id.to_string(),
        type_path: "/Fixture/Build_Box.Build_Box_C".into(),
        source_kind: SourceKind::Actor,
        position_m,
        quaternion: Some(identity_quat()),
        scale: Some([1.0, 1.0, 1.0]),
        volume,
        path: PathGeom::NotPath,
    }
}

fn named_box(extent: [f64; 3], offset: [f64; 3]) -> LocalVolume {
    LocalVolume {
        size_kind: SizeKind::NamedBox,
        extent_m: extent,
        offset_m: offset,
        class_reserve_length: false,
    }
}

fn region_box() -> Aabb {
    Aabb::from_bounds([0.0, 0.0, 0.0], [16.0, 16.0, 20.0])
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn sha256_hex(bytes: &[u8]) -> String {
    hex(&Sha256::digest(bytes))
}

fn parse_source_kind(s: &str) -> SourceKind {
    match s {
        "actor" => SourceKind::Actor,
        "lightweight" => SourceKind::Lightweight,
        other => panic!("bad sourceKind {other}"),
    }
}

fn parse_record_kind(s: &str) -> RecordKind {
    match s {
        "occupant" => RecordKind::Occupant,
        "path" => RecordKind::Path,
        other => panic!("bad recordKind {other}"),
    }
}

fn parse_size_kind(s: &str) -> SizeKind {
    match s {
        "named-box" => SizeKind::NamedBox,
        "clearance-reserve" => SizeKind::ClearanceReserve,
        "unknown" => SizeKind::Unknown,
        other => panic!("bad sizeKind {other}"),
    }
}

fn parse_path_state(s: &str) -> PathState {
    match s {
        "not-path" => PathState::NotPath,
        "linear" => PathState::Linear,
        "unavailable" => PathState::Unavailable,
        other => panic!("bad pathState {other}"),
    }
}

fn f32_row(values: &[Value], n: usize) -> Vec<f32> {
    assert_eq!(values.len(), n);
    values.iter().map(|v| v.as_f64().unwrap() as f32).collect()
}

fn encode_vector(vector: &Value) -> Vec<u8> {
    let request = request_json(&vector["request"]);
    let region = request.effective_region().unwrap();
    let meta = &vector["metadata"];
    let types = meta["types"]
        .as_array()
        .unwrap()
        .iter()
        .map(|row| TypeRow {
            type_path: row["typePath"].as_str().unwrap().to_string(),
            label: row["label"].as_str().unwrap().to_string(),
            category: row["category"].as_str().unwrap().to_string(),
            subcategory: row["subcategory"].as_str().map(str::to_string),
        })
        .collect();
    let occupants: Vec<OccupantRow> = meta["occupants"]
        .as_array()
        .unwrap()
        .iter()
        .map(|row| OccupantRow {
            id: row["id"].as_str().unwrap().to_string(),
            type_index: row["typeIndex"].as_u64().unwrap() as u32,
            source_kind: parse_source_kind(row["sourceKind"].as_str().unwrap()),
            record_kind: parse_record_kind(row["recordKind"].as_str().unwrap()),
            size_kind: parse_size_kind(row["sizeKind"].as_str().unwrap()),
            pose_flags: row["poseFlags"].as_u64().unwrap() as u8,
            path_state: parse_path_state(row["pathState"].as_str().unwrap()),
            uncertainty: row["uncertainty"]
                .as_array()
                .unwrap()
                .iter()
                .map(|v| v.as_str().unwrap().to_string())
                .collect(),
        })
        .collect();
    let poses = vector["poses"]
        .as_array()
        .unwrap()
        .iter()
        .map(|row| {
            let vals = f32_row(row.as_array().unwrap(), 16);
            let mut pose = [0.0f32; 16];
            pose.copy_from_slice(&vals);
            pose
        })
        .collect();
    let fragments = vector["fragments"]
        .as_array()
        .unwrap()
        .iter()
        .map(|row| {
            let vals = row.as_array().unwrap();
            [
                vals[0].as_u64().unwrap() as u32,
                vals[1].as_u64().unwrap() as u32,
                vals[2].as_u64().unwrap() as u32,
                vals[3].as_u64().unwrap() as u32,
            ]
        })
        .collect();
    let vertices = vector["vertices"]
        .as_array()
        .unwrap()
        .iter()
        .map(|row| {
            let vals = f32_row(row.as_array().unwrap(), 9);
            let mut vertex = [0.0f32; 9];
            vertex.copy_from_slice(&vals);
            vertex
        })
        .collect();
    let vertex_flags = vector["vertexFlags"]
        .as_array()
        .unwrap()
        .iter()
        .map(|v| v.as_u64().unwrap() as u32)
        .collect();
    let (effective_min, effective_max, empty_reason) = if region.disjoint_z {
        (None, None, Some("DISJOINT_Z"))
    } else if occupants.is_empty() {
        (Some(region.min_m), Some(region.max_m), Some("NO_OCCUPANTS"))
    } else {
        (Some(region.min_m), Some(region.max_m), None)
    };
    encode_scene_frame(&SceneFrameInput {
        request_id: request.request_id,
        origin_m: region.origin_m,
        effective_min,
        effective_max,
        empty_reason,
        types,
        occupants,
        poses,
        fragments,
        vertices,
        vertex_flags,
    })
    .unwrap()
}

#[test]
fn a001_request_validation_rejects_malformed_intervals() {
    let err = RegionalRequest::from_json(
        r#"{"schemaVersion":1,"requestId":"regional:x","xyM":{"minX":0,"maxX":0,"minY":0,"maxY":16},"cutZM":{"min":0,"max":1},"altitudeCapM":null}"#,
    )
    .unwrap_err();
    assert_eq!(err.code, RegionalErrorCode::InvalidRegion);
    assert_eq!(err.details["field"], "xyM");
    assert_eq!(err.request_id.as_deref(), Some("regional:x"));

    let err = RegionalRequest::from_json(
        r#"{"schemaVersion":1,"requestId":"regional:x","xyM":{"minX":0,"maxX":16,"minY":0,"maxY":16},"cutZM":{"min":4,"max":1},"altitudeCapM":null}"#,
    )
    .unwrap_err();
    assert_eq!(err.details["field"], "cutZM");

    let err = RegionalRequest::from_json(
        r#"{"schemaVersion":2,"requestId":"regional:x","xyM":{"minX":0,"maxX":16,"minY":0,"maxY":16},"cutZM":{"min":0,"max":1},"altitudeCapM":null}"#,
    )
    .unwrap_err();
    assert_eq!(err.code, RegionalErrorCode::UnsupportedSchema);
    assert_eq!(err.details["receivedVersion"], 2);

    let err = RegionalRequest::from_json(
        r#"{"schemaVersion":1,"requestId":"regional:x","xyM":{"minX":0,"maxX":16,"minY":0,"maxY":16},"cutZM":{"min":0,"max":1},"altitudeCapM":null,"filters":[]}"#,
    )
    .unwrap_err();
    assert_eq!(err.details["field"], "filters");

    let err = RegionalRequest::from_json("not-json").unwrap_err();
    assert!(err.request_id.is_none());
}

#[test]
fn a001_lightweight_scale_at_record_offset_56() {
    let mut buf = vec![0u8; 96];
    buf[56..64].copy_from_slice(&2.5f64.to_le_bytes());
    buf[64..72].copy_from_slice(&(-1.0f64).to_le_bytes());
    buf[72..80].copy_from_slice(&0.0f64.to_le_bytes());
    assert_eq!(read_lightweight_scale(&buf, 0, 96), Some([2.5, -1.0, 0.0]));
    assert_eq!(read_lightweight_scale(&buf, 0, 70), None);
    assert_eq!(read_lightweight_scale(&buf[..70], 0, 96), None);
}

#[test]
fn a001_eligibility_keeps_unknown_classes_and_drops_hidden() {
    assert!(is_regional_class(
        "/Game/FactoryGame/Buildable/Building/Foundation/Build_Foundation_8x4_01.Build_Foundation_8x4_01_C"
    ));
    assert!(is_regional_class("/Mods/Space/Build_Widget.Build_Widget_C"));
    assert!(!is_regional_class(
        "/Game/FactoryGame/Buildable/Vehicle/Tractor/BP_Tractor.BP_Tractor_C"
    ));
    assert!(!is_regional_class(
        "/Script/FactoryGame.FGConveyorChainActor"
    ));
    assert!(!is_regional_class(
        "/Game/FactoryGame/Buildable/Factory/Pipeline/FlowIndicator/Build_PipelineFlowIndicator.Build_PipelineFlowIndicator_C"
    ));
    assert!(is_regional_class(
        "/Game/FactoryGame/Buildable/Factory/ConveyorLiftMk1/Build_ConveyorLiftMk1.Build_ConveyorLiftMk1_C"
    ));
    assert!(is_regional_class(
        "/Game/FactoryGame/Buildable/Factory/PowerLine/Build_PowerLine.Build_PowerLine_C"
    ));
}

#[test]
fn a001_foundation_is_named_box_with_unfloored_offset() {
    let volume = classify_volume(
        "/Game/FactoryGame/Buildable/Building/Foundation/Build_Foundation_8x4_01.Build_Foundation_8x4_01_C",
        None,
    )
    .unwrap();
    assert_eq!(volume.size_kind, SizeKind::NamedBox);
    assert_eq!(volume.extent_m, [8.0, 8.0, 4.0]);
    assert_eq!(volume.offset_m, [0.0, 0.0, 0.0]);
}

#[test]
fn a001_zero_scale_is_readable_not_unit() {
    let rec = SourceRecord {
        id: "zero".into(),
        type_path: "/Fixture/Build_Box.Build_Box_C".into(),
        source_kind: SourceKind::Actor,
        position_m: [8.0, 8.0, 10.0],
        quaternion: Some(identity_quat()),
        scale: Some([0.0, 0.0, 0.0]),
        volume: Some(named_box([8.0, 8.0, 4.0], [0.0, 0.0, 2.0])),
        path: PathGeom::NotPath,
    };
    let admitted = admit(&rec, region_box()).unwrap().unwrap();
    assert_eq!(admitted.record.scale, Some([0.0, 0.0, 0.0]));
    assert!(admitted.uncertainty.iter().all(|u| u.as_str() != "scale-unknown"));
}

#[test]
fn a002_rotated_scaled_offset_box_and_origin_only_unknowns() {
    let rec = SourceRecord {
        id: "rot".into(),
        type_path: "/Fixture/Build_Box.Build_Box_C".into(),
        source_kind: SourceKind::Actor,
        position_m: [16.0, 8.0, 10.0],
        quaternion: Some([0.0, 0.0, (0.5_f64).sqrt(), (0.5_f64).sqrt()]),
        scale: Some([2.0, 1.0, 1.0]),
        volume: Some(named_box([4.0, 2.0, 2.0], [1.0, 0.0, 0.0])),
        path: PathGeom::NotPath,
    };
    assert!(admit(&rec, region_box()).unwrap().is_some());

    let outside = SourceRecord {
        id: "out".into(),
        type_path: "/Fixture/Build_Box.Build_Box_C".into(),
        source_kind: SourceKind::Actor,
        position_m: [40.0, 40.0, 10.0],
        quaternion: Some(identity_quat()),
        scale: Some([1.0, 1.0, 1.0]),
        volume: Some(named_box([2.0, 2.0, 2.0], [0.0, 0.0, 0.0])),
        path: PathGeom::NotPath,
    };
    assert!(admit(&outside, region_box()).unwrap().is_none());

    let unknown_inside = SourceRecord {
        id: "unk-in".into(),
        type_path: "/Fixture/Build_Unknown.Build_Unknown_C".into(),
        source_kind: SourceKind::Actor,
        position_m: [1.0, 1.0, 1.0],
        quaternion: None,
        scale: None,
        volume: Some(named_box([20.0, 20.0, 20.0], [0.0, 0.0, 0.0])),
        path: PathGeom::NotPath,
    };
    let admitted = admit(&unknown_inside, region_box()).unwrap().unwrap();
    assert!(admitted.uncertainty.iter().any(|u| u.as_str() == "scale-unknown"));
    assert!(admitted.uncertainty.iter().any(|u| u.as_str() == "orientation-unknown"));

    let unknown_outside = SourceRecord {
        position_m: [40.0, 1.0, 1.0],
        id: "unk-out".into(),
        ..unknown_inside
    };
    assert!(admit(&unknown_outside, region_box()).unwrap().is_none());
}

#[test]
fn a002_closed_contacts_slab_and_path_fragments() {
    let face = origin_occupant("face", [16.0, 8.0, 10.0], Some(named_box([2.0, 2.0, 2.0], [0.0, 0.0, 0.0])));
    assert!(admit(&face, region_box()).unwrap().is_some());

    let corner = origin_occupant("corner", [0.0, 0.0, 0.0], None);
    assert!(admit(&corner, region_box()).unwrap().is_some());

    let slab = Aabb::from_bounds([0.0, 0.0, 5.0], [16.0, 16.0, 5.0]);
    let path = SourceRecord {
        id: "path".into(),
        type_path: "/Fixture/Build_Path.Build_Path_C".into(),
        source_kind: SourceKind::Actor,
        position_m: [0.0, 0.0, 0.0],
        quaternion: Some(identity_quat()),
        scale: Some([1.0, 1.0, 1.0]),
        volume: None,
        path: PathGeom::Linear(vec![vec![
            PathVertex { world_m: [0.0, 0.0, 0.0], arrive_m: None, leave_m: None },
            PathVertex { world_m: [0.0, 0.0, 10.0], arrive_m: None, leave_m: Some([0.0, 0.0, 1.0]) },
        ]]),
    };
    let admitted = admit(&path, slab).unwrap().unwrap();
    assert_eq!(admitted.path_state, PathState::Linear);
    assert_eq!(admitted.fragments.len(), 1);
    assert_eq!(admitted.fragments[0].vertices.len(), 1);
    assert!(admitted.fragments[0].vertices[0].generated);
    assert_eq!(admitted.fragments[0].vertices[0].world_m, [0.0, 0.0, 5.0]);

    let crossing = SourceRecord {
        id: "cross".into(),
        path: PathGeom::Linear(vec![vec![
            PathVertex { world_m: [-4.0, 8.0, 10.0], arrive_m: None, leave_m: None },
            PathVertex { world_m: [20.0, 8.0, 10.0], arrive_m: Some([1.0, 0.0, 0.0]), leave_m: None },
        ]]),
        ..path.clone()
    };
    let admitted = admit(&crossing, region_box()).unwrap().unwrap();
    assert_eq!(admitted.fragments.len(), 1);
    assert_eq!(admitted.fragments[0].vertices.len(), 2);
    assert!(admitted.fragments[0].vertices[0].generated);
    assert!(admitted.fragments[0].vertices[1].generated);

    let two_frag = SourceRecord {
        id: "two".into(),
        path: PathGeom::Linear(vec![
            vec![
                PathVertex { world_m: [-4.0, 2.0, 10.0], arrive_m: None, leave_m: None },
                PathVertex { world_m: [8.0, 2.0, 10.0], arrive_m: None, leave_m: None },
            ],
            vec![
                PathVertex { world_m: [8.0, 8.0, 10.0], arrive_m: None, leave_m: None },
                PathVertex { world_m: [-4.0, 8.0, 10.0], arrive_m: None, leave_m: None },
            ],
        ]),
        ..path
    };
    let admitted = admit(&two_frag, region_box()).unwrap().unwrap();
    assert_eq!(admitted.record.id, "two");
    assert!(admitted.fragments.len() >= 2, "expected disjoint fragments, got {}", admitted.fragments.len());

    let detour = SourceRecord {
        id: "detour".into(),
        path: PathGeom::Linear(vec![vec![
            PathVertex { world_m: [-4.0, 2.0, 10.0], arrive_m: None, leave_m: None },
            PathVertex { world_m: [8.0, 2.0, 10.0], arrive_m: None, leave_m: None },
            PathVertex { world_m: [8.0, 40.0, 10.0], arrive_m: None, leave_m: None },
            PathVertex { world_m: [40.0, 40.0, 10.0], arrive_m: None, leave_m: None },
            PathVertex { world_m: [40.0, 8.0, 10.0], arrive_m: None, leave_m: None },
            PathVertex { world_m: [8.0, 8.0, 10.0], arrive_m: None, leave_m: None },
            PathVertex { world_m: [-4.0, 8.0, 10.0], arrive_m: None, leave_m: None },
        ]]),
        ..two_frag
    };
    let admitted = admit(&detour, region_box()).unwrap().unwrap();
    assert!(
        admitted.fragments.len() >= 2,
        "outside detour must not bridge fragments, got {}",
        admitted.fragments.len()
    );
}

#[test]
fn a002_leave_reenter_without_outside_chord_is_two_fragments() {
    // Shared source vertex (20,5,5) is outside [0,10]³; both chords still clip.
    // Bridging the two boundary intersections would invent a segment across
    // the outside section.
    let cube = Aabb::from_bounds([0.0, 0.0, 0.0], [10.0, 10.0, 10.0]);
    let reenter = SourceRecord {
        id: "reenter".into(),
        type_path: "/Fixture/Build_Path.Build_Path_C".into(),
        source_kind: SourceKind::Actor,
        position_m: [0.0, 0.0, 0.0],
        quaternion: Some(identity_quat()),
        scale: Some([1.0, 1.0, 1.0]),
        volume: None,
        path: PathGeom::Linear(vec![vec![
            PathVertex { world_m: [1.0, 1.0, 5.0], arrive_m: None, leave_m: None },
            PathVertex { world_m: [20.0, 5.0, 5.0], arrive_m: None, leave_m: None },
            PathVertex { world_m: [1.0, 9.0, 5.0], arrive_m: None, leave_m: None },
        ]]),
    };
    let admitted = admit(&reenter, cube).unwrap().unwrap();
    assert_eq!(
        admitted.fragments.len(),
        2,
        "leave/re-enter without a wholly-outside chord must yield two fragments, got {}",
        admitted.fragments.len()
    );
    let first_end = admitted.fragments[0].vertices.last().unwrap().world_m;
    let second_start = admitted.fragments[1].vertices.first().unwrap().world_m;
    assert_ne!(
        first_end, second_start,
        "must not invent a connector between disjoint boundary intersections"
    );
    for frag in &admitted.fragments {
        assert!(!frag.vertices.is_empty());
        for vertex in &frag.vertices {
            assert!(cube.contains_point(vertex.world_m));
        }
    }
}

#[test]
fn a002_negative_scale_and_unavailable_path() {
    let rec = SourceRecord {
        id: "mirror".into(),
        type_path: "/Fixture/Build_Box.Build_Box_C".into(),
        source_kind: SourceKind::Actor,
        position_m: [8.0, 8.0, 10.0],
        quaternion: Some(identity_quat()),
        scale: Some([-1.0, 1.0, 1.0]),
        volume: Some(named_box([4.0, 4.0, 4.0], [1.0, 0.0, 0.0])),
        path: PathGeom::NotPath,
    };
    assert!(admit(&rec, region_box()).unwrap().is_some());

    let unavailable = SourceRecord {
        id: "nopath".into(),
        type_path: "/Fixture/Build_Path.Build_Path_C".into(),
        source_kind: SourceKind::Actor,
        position_m: [8.0, 8.0, 10.0],
        quaternion: Some(identity_quat()),
        scale: Some([1.0, 1.0, 1.0]),
        volume: None,
        path: PathGeom::Unavailable,
    };
    let admitted = admit(&unavailable, region_box()).unwrap().unwrap();
    assert_eq!(admitted.path_state, PathState::Unavailable);
    assert!(admitted.fragments.is_empty());
    assert!(admitted.uncertainty.iter().any(|u| u.as_str() == "path-unavailable"));
}

#[test]
fn a002_count_and_extract_identities_agree() {
    let request = RegionalRequest::from_json(
        r#"{"schemaVersion":1,"requestId":"regional:ids","xyM":{"minX":0,"maxX":16,"minY":0,"maxY":16},"cutZM":{"min":0,"max":20},"altitudeCapM":null}"#,
    )
    .unwrap();
    let records = vec![
        origin_occupant("a", [1.0, 1.0, 1.0], None),
        origin_occupant("b", [40.0, 1.0, 1.0], None),
        origin_occupant("c", [2.0, 2.0, 2.0], Some(named_box([2.0, 2.0, 2.0], [0.0, 0.0, 0.0]))),
    ];
    let aabb = region_box();
    let mut counted = Vec::new();
    for rec in &records {
        if admit(rec, aabb).unwrap().is_some() {
            counted.push(rec.id.clone());
        }
    }
    let (frame, trace) = extract_from_records(&records, &request);
    let frame = frame.unwrap();
    assert_eq!(counted, ["a", "c"]);
    assert_eq!(trace.admitted, 2);
    assert_eq!(trace.pose_rows_reserved, 2);
    assert!(frame.len() > 128);
}

#[test]
fn a003_canonical_vectors_are_byte_exact() {
    for vector in vectors()["vectors"].as_array().unwrap() {
        let name = vector["name"].as_str().unwrap();
        let frame = encode_vector(vector);
        let expected = &vector["expected"];
        assert_eq!(frame.len() as u64, expected["totalBytes"].as_u64().unwrap(), "{name} totalBytes");
        assert_eq!(hex(&frame[..128]), expected["headerHex"].as_str().unwrap(), "{name} header");
        assert_eq!(sha256_hex(&frame), expected["frameSha256"].as_str().unwrap(), "{name} frame hash");
        let offsets = expected["offsets"].as_array().unwrap();
        let pose = offsets[0].as_u64().unwrap() as usize;
        assert_eq!(sha256_hex(&frame[pose..]), expected["numericSha256"].as_str().unwrap(), "{name} numeric hash");
        let request = request_json(&vector["request"]);
        let region = request.effective_region().unwrap();
        assert_eq!(
            region.origin_m,
            [
                vector["originM"][0].as_f64().unwrap(),
                vector["originM"][1].as_f64().unwrap(),
                vector["originM"][2].as_f64().unwrap()
            ],
            "{name} origin"
        );
    }
}

#[test]
fn a003_8000_admits_and_8001_rejects_before_output_buffers() {
    let request = RegionalRequest::from_json(
        r#"{"schemaVersion":1,"requestId":"regional:cap","xyM":{"minX":0,"maxX":16,"minY":0,"maxY":16},"cutZM":{"min":0,"max":20},"altitudeCapM":null}"#,
    )
    .unwrap();
    let records_8000: Vec<SourceRecord> = (0..ADMISSION_LIMIT)
        .map(|i| origin_occupant(&format!("id{i}"), [1.0, 1.0, 1.0], None))
        .collect();
    let (frame, trace) = extract_from_records(&records_8000, &request);
    let frame = frame.expect("8000 must admit");
    assert_eq!(trace.admitted, ADMISSION_LIMIT);
    assert_eq!(trace.pose_rows_reserved, ADMISSION_LIMIT);
    assert!(frame.len() > 128);

    let mut records_8001 = records_8000;
    records_8001.push(origin_occupant("overflow", [1.0, 1.0, 1.0], None));
    let (result, trace) = extract_from_records(&records_8001, &request);
    let err = result.expect_err("8001 must refuse");
    assert_eq!(err.code, RegionalErrorCode::RegionTooLarge);
    assert_eq!(err.details["limit"], ADMISSION_LIMIT);
    assert_eq!(err.details["count"], ADMISSION_LIMIT as i64 + 1);
    assert_eq!(err.details["countKind"], "minimum");
    assert_eq!(trace.admitted, ADMISSION_LIMIT + 1);
    assert_eq!(trace.pose_rows_reserved, 0);
    assert_eq!(trace.fragment_rows_reserved, 0);
    assert_eq!(trace.vertex_rows_reserved, 0);
}

#[test]
fn a003_frame_guard_rejects_pathological_size_without_truncation() {
    let err = encoded_frame_size(128, 1, 1, 2_000_000, Some("regional:big")).unwrap_err();
    assert_eq!(err.code, RegionalErrorCode::ResourceExhausted);
    assert_eq!(err.details["maxFrameBytes"], MAX_FRAME_BYTES);
    let ok = encoded_frame_size(126, 0, 0, 0, Some("regional:empty")).unwrap();
    assert!(ok[4] <= MAX_FRAME_BYTES);
}

fn first_vertex_count_over_frame_bound() -> u32 {
    let mut lo = 0u32;
    let mut hi = 3_000_000u32;
    assert!(encoded_frame_size(0, 1, 1, hi, Some("regional:path-bound")).is_err());
    while lo + 1 < hi {
        let mid = lo + (hi - lo) / 2;
        if encoded_frame_size(0, 1, 1, mid, Some("regional:path-bound")).is_err() {
            hi = mid;
        } else {
            lo = mid;
        }
    }
    hi
}

#[test]
fn a003_path_under_occupant_cap_rejects_before_vertex_buffers() {
    let request = RegionalRequest::from_json(
        r#"{"schemaVersion":1,"requestId":"regional:path-bound","xyM":{"minX":0,"maxX":16,"minY":0,"maxY":16},"cutZM":{"min":0,"max":20},"altitudeCapM":null}"#,
    )
    .unwrap();
    let vertex_count = first_vertex_count_over_frame_bound() as usize;
    let mut chain = Vec::with_capacity(vertex_count);
    for i in 0..vertex_count {
        chain.push(PathVertex {
            world_m: [1.0, 1.0, 1.0 + i as f64 * 1e-8],
            arrive_m: None,
            leave_m: None,
        });
    }
    let records = vec![SourceRecord {
        id: "long-path".into(),
        type_path: "/Fixture/Build_Path.Build_Path_C".into(),
        source_kind: SourceKind::Actor,
        position_m: [1.0, 1.0, 1.0],
        quaternion: Some(identity_quat()),
        scale: Some([1.0, 1.0, 1.0]),
        volume: None,
        path: PathGeom::Linear(vec![chain]),
    }];
    let (result, trace) = extract_from_records(&records, &request);
    let err = result.expect_err("oversized path must refuse");
    assert_eq!(err.code, RegionalErrorCode::ResourceExhausted);
    assert_eq!(err.details["maxFrameBytes"], MAX_FRAME_BYTES);
    assert_eq!(trace.admitted, 1);
    assert_eq!(trace.pose_rows_reserved, 0);
    assert_eq!(trace.fragment_rows_reserved, 0);
    assert_eq!(trace.vertex_rows_reserved, 0);
}

#[test]
fn a003_disjoint_empty_and_invalid_origin() {
    let request = RegionalRequest::from_json(
        r#"{"schemaVersion":1,"requestId":"regional:empty","xyM":{"minX":0,"maxX":16,"minY":0,"maxY":16},"cutZM":{"min":0,"max":20},"altitudeCapM":{"min":30,"max":40}}"#,
    )
    .unwrap();
    let (frame, trace) = extract_from_records(
        &[origin_occupant("a", [1.0, 1.0, 1.0], None)],
        &request,
    );
    let frame = frame.unwrap();
    assert_eq!(trace.admitted, 0);
    assert_eq!(trace.pose_rows_reserved, 0);
    assert_eq!(u32::from_le_bytes(frame[24..28].try_into().unwrap()), 0);

    let bad = SourceRecord {
        id: "nan".into(),
        type_path: "/Fixture/Build_Box.Build_Box_C".into(),
        source_kind: SourceKind::Actor,
        position_m: [f64::NAN, 0.0, 0.0],
        quaternion: Some(identity_quat()),
        scale: Some([1.0, 1.0, 1.0]),
        volume: None,
        path: PathGeom::NotPath,
    };
    let request = RegionalRequest::from_json(
        r#"{"schemaVersion":1,"requestId":"regional:nan","xyM":{"minX":0,"maxX":16,"minY":0,"maxY":16},"cutZM":{"min":0,"max":20},"altitudeCapM":null}"#,
    )
    .unwrap();
    let (result, _) = extract_from_records(&[bad], &request);
    assert_eq!(result.unwrap_err().code, RegionalErrorCode::SourceDataInvalid);
}

fn save_path(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../map/uploads").join(name)
}

#[test]
fn a003_query_does_not_mutate_body_payload_or_undo() {
    let bytes = std::fs::read(save_path("All_080726-163150.sav")).expect("test save present");
    let tables = ClassTables::embedded();
    let store = parse_full_save_lean(&bytes, &tables, None).unwrap();
    let body_before = effective_body(&store).to_vec();
    let (payload_before, _) = mapdata::build_all_json(&store, None).unwrap();
    let request = RegionalRequest::from_json(
        r#"{"schemaVersion":1,"requestId":"regional:store","xyM":{"minX":-100000,"maxX":100000,"minY":-100000,"maxY":100000},"cutZM":{"min":-10000,"max":10000},"altitudeCapM":null}"#,
    )
    .unwrap();
    let _frame = regional_scene(&store, &request).unwrap();
    assert_eq!(effective_body(&store), body_before.as_slice(), "retained body mutated");
    let (payload_after, _) = mapdata::build_all_json(&store, None).unwrap();
    assert_eq!(payload_before, payload_after, "2D payload mutated");
    let rebuilt = session::rebuild(
        body_before.clone(),
        &store.file_header,
        &store.info,
        &tables,
        &[],
        None,
    )
    .unwrap();
    assert_eq!(effective_body(&rebuilt), body_before.as_slice(), "undo/pristine body changed");
}

#[test]
fn a001_store_reader_flags_lightweight_scale_and_excludes_hidden() {
    let bytes = std::fs::read(save_path("All_080726-163150.sav")).expect("test save present");
    let store = parse_full_save_lean(&bytes, &ClassTables::embedded(), None).unwrap();
    let mut hidden = 0usize;
    let mut buildable = 0usize;
    let mut lightweight = 0usize;
    for level in &store.levels {
        for header in &level.headers {
            if let Header::Actor(actor) = header {
                let tp = actor.type_path.to_string(&store.data);
                if !is_regional_class(&tp)
                    && tp.contains("PipelineFlowIndicator")
                {
                    hidden += 1;
                }
                if is_regional_class(&tp) {
                    buildable += 1;
                }
            }
        }
    }
    sav_core::regional_scene::visit_source_records(&store, "regional:scan", |rec| {
        if rec.source_kind == SourceKind::Lightweight {
            lightweight += 1;
            let scale = rec.scale.expect("readable lightweight scale must not be unknown");
            assert!(scale.iter().all(|c| c.is_finite()));
        }
        assert!(is_regional_class(&rec.type_path));
        Ok(())
    })
    .unwrap();
    assert!(buildable > 0);
    let _ = (hidden, lightweight);
}
