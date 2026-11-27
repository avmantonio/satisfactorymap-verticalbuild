//! Native session binding for the regional extract (ticket 60 phase 2 / C-004).
//! These are session/nonmutation/error checks, not a runtime viewer pass.

use sav_core::regional_scene::{RegionalError, RegionalErrorCode};
use sav_tauri_lib::session::AppSession;

fn sample_save() -> Vec<u8> {
    let path = concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../map/uploads/All_080726-163150.sav"
    );
    std::fs::read(path).unwrap_or_else(|e| panic!("read sample save {path}: {e}"))
}

fn load_session() -> AppSession {
    let noop = |_phase: u8, _c: u64, _t: u64| {};
    AppSession::load(sample_save(), &noop).expect("load").0
}

#[test]
fn regional_scene_returns_raw_v1_frame_without_mutating_body() {
    let session = load_session();
    let exported_before = session.export_sav().expect("export before");
    let request = r#"{"schemaVersion":1,"requestId":"regional:native-ok","xyM":{"minX":-900,"maxX":-700,"minY":2400,"maxY":2550},"cutZM":{"min":-50,"max":50},"altitudeCapM":null}"#;
    let frame = session.regional_scene(request).expect("regional_scene");
    assert!(frame.starts_with(b"SMREG3D\0"), "magic");
    assert_eq!(u32::from_le_bytes(frame[8..12].try_into().unwrap()), 1);
    assert_eq!(
        frame.len() as u32,
        u32::from_le_bytes(frame[16..20].try_into().unwrap())
    );
    let exported_after = session.export_sav().expect("export after");
    assert_eq!(exported_before, exported_after, "regional query must not mutate the save");
}

#[test]
fn regional_scene_disjoint_z_is_empty_success() {
    let session = load_session();
    let request = r#"{"schemaVersion":1,"requestId":"regional:native-disjoint","xyM":{"minX":-900,"maxX":-700,"minY":2400,"maxY":2550},"cutZM":{"min":-50,"max":50},"altitudeCapM":{"min":1000,"max":1100}}"#;
    let frame = session.regional_scene(request).expect("disjoint");
    assert_eq!(u32::from_le_bytes(frame[24..28].try_into().unwrap()), 0);
}

#[test]
fn regional_scene_invalid_region_is_prefixed_domain_error() {
    let session = load_session();
    let request = r#"{"schemaVersion":1,"requestId":"regional:native-bad","xyM":{"minX":10,"maxX":10,"minY":0,"maxY":16},"cutZM":{"min":0,"max":20},"altitudeCapM":null}"#;
    let err = session.regional_scene(request).unwrap_err();
    assert_eq!(err.code, RegionalErrorCode::InvalidRegion);
    assert!(err.to_prefixed_json().starts_with("REGIONAL_ERROR:"));
}

#[test]
fn no_session_error_is_prefixed_without_session_lost() {
    let err = RegionalError::no_session(None);
    assert_eq!(err.code, RegionalErrorCode::NoSession);
    assert!(!err.session_lost);
    let prefixed = err.to_prefixed_json();
    assert!(prefixed.starts_with("REGIONAL_ERROR:"));
    assert!(prefixed.contains("\"NO_SESSION\""));
}
