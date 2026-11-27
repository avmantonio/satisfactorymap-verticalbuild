//! Native AppSession probe for ticket 60 phase 2 / C-008 / HEC-04.
//! Loads a local save, runs the same `regional_scene` binding as the product
//! command, and writes the raw v1 frame (or prefixed RegionalError) to a file.
//! This is a contract probe, not a viewer and not a runtime acceptance pass.
//!
//! Usage:
//!   cargo run -p sav_tauri --release --example regional_scene_dump -- \
//!     --save map/uploads/solo_autosave_1.sav \
//!     --request '{"schemaVersion":1,...}' \
//!     --out /tmp/regional-native.bin

use sav_core::regional_scene::RegionalError;
use sav_tauri_lib::session::AppSession;
use std::env;
use std::fs;
use std::path::PathBuf;
use std::process;

fn arg_value(args: &[String], flag: &str) -> Option<String> {
    args.iter()
        .position(|a| a == flag)
        .and_then(|i| args.get(i + 1).cloned())
}

fn usage() -> ! {
    eprintln!(
        "usage: regional_scene_dump --save <file.sav> --request <json|path.json> --out <file>"
    );
    process::exit(1);
}

fn load_request(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.starts_with('{') {
        return trimmed.to_string();
    }
    fs::read_to_string(trimmed).unwrap_or_else(|e| {
        eprintln!("failed to read request {}: {e}", trimmed);
        process::exit(1);
    })
}

fn dump_error(err: RegionalError, out: &PathBuf) -> ! {
    let prefixed = err.to_prefixed_json();
    if let Err(e) = fs::write(out, prefixed.as_bytes()) {
        eprintln!("failed to write {}: {e}", out.display());
        process::exit(1);
    }
    println!("{}", prefixed);
    process::exit(2);
}

fn main() {
    let args: Vec<String> = env::args().collect();
    let save = arg_value(&args, "--save").unwrap_or_else(|| usage());
    let request_raw = arg_value(&args, "--request").unwrap_or_else(|| usage());
    let out = PathBuf::from(arg_value(&args, "--out").unwrap_or_else(|| usage()));
    let request = load_request(&request_raw);

    let bytes = fs::read(&save).unwrap_or_else(|e| {
        eprintln!("failed to read save {save}: {e}");
        process::exit(1);
    });
    let noop = |_phase: u8, _c: u64, _t: u64| {};
    let (session, _payload) = AppSession::load(bytes, &noop).unwrap_or_else(|e| {
        eprintln!("failed to load save {save}: {e}");
        process::exit(1);
    });

    match session.regional_scene(&request) {
        Ok(frame) => {
            if let Err(e) = fs::write(&out, &frame) {
                eprintln!("failed to write {}: {e}", out.display());
                process::exit(1);
            }
            println!("OK {}", frame.len());
        }
        Err(err) => dump_error(err, &out),
    }
}
