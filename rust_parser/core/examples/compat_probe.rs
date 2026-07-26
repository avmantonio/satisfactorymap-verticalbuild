//! Scratch probe for old-save-version compatibility: parse the header, dump
//! the start of the decompressed body, then attempt a lean body parse and
//! report exactly where it derails.
//!
//!     cargo run --release --features parallel --example compat_probe -- save.sav

use sav_core::decompress::decompress_save_file;
use sav_core::level::parse_body_bytes_lean;
use sav_core::object::ClassTables;
use sav_core::save_header::parse_save_file_info;

fn hexdump(data: &[u8], start: usize, len: usize) {
    let end = (start + len).min(data.len());
    for off in (start..end).step_by(16) {
        let row = &data[off..(off + 16).min(end)];
        let hex: Vec<String> = row.iter().map(|b| format!("{:02x}", b)).collect();
        let ascii: String = row
            .iter()
            .map(|&b| if (0x20..0x7f).contains(&b) { b as char } else { '.' })
            .collect();
        eprintln!("{:08x}: {:<48} {}", off, hex.join(" "), ascii);
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let [_, sav] = &args[..] else {
        eprintln!("usage: compat_probe <save.sav>");
        std::process::exit(2);
    };
    let bytes = std::fs::read(sav).expect("read save");
    eprintln!("file: {} bytes", bytes.len());

    let (info, body_offset) = match parse_save_file_info(&bytes) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("HEADER FAILED: {}", e);
            hexdump(&bytes, 0, 128);
            std::process::exit(1);
        }
    };
    eprintln!(
        "header ok: headerType={} saveVersion={} build={} session={:?} body_offset={}",
        info.save_header_type, info.save_version, info.build_version, info.session_name, body_offset
    );

    let t = std::time::Instant::now();
    let decompressed = match decompress_save_file(&bytes, body_offset, None) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("DECOMPRESS FAILED: {}", e);
            eprintln!("chunk table starts at {:#x}:", body_offset);
            hexdump(&bytes, body_offset, 128);
            std::process::exit(1);
        }
    };
    eprintln!("decompress ok: {} bytes in {:.2?}", decompressed.len(), t.elapsed());
    eprintln!("body start:");
    hexdump(&decompressed, 0, 256);

    let file_header = bytes[..body_offset].to_vec();
    drop(bytes);

    // Manual walk of the body prefix so we can see where the level layout
    // diverges from the 1.0 expectations.
    {
        use sav_core::reader::Cursor;
        let mut c = Cursor::new(&decompressed, 8);
        let partition_count = c.u32().unwrap();
        eprintln!("partition_count={}", partition_count);
        for i in 0..partition_count {
            let name = c.string().unwrap();
            let a = c.u32().unwrap();
            let b = c.u32().unwrap();
            let n = c.u32().unwrap();
            eprintln!(
                "  partition {}: {:?} a={:#x} b={:#x} levels={}",
                i,
                String::from_utf8_lossy(name.bytes(&decompressed)),
                a,
                b,
                n
            );
            for _ in 0..n {
                let _ln = c.string().unwrap();
                let _h = c.u32().unwrap();
            }
        }
        let level_count = c.u32().unwrap();
        eprintln!("level_count={} levels start at {:#x}", level_count, c.pos);
        let name = c.string().unwrap();
        eprintln!("level 0 name: {:?}", String::from_utf8_lossy(name.bytes(&decompressed)));
        eprintln!("bytes after level 0 name (pos {:#x}):", c.pos);
        hexdump(&decompressed, c.pos, 96);
        let size_u64 = u64::from_le_bytes(decompressed[c.pos..c.pos + 8].try_into().unwrap());
        let size_u32 = u32::from_le_bytes(decompressed[c.pos..c.pos + 4].try_into().unwrap());
        eprintln!("TOC size as u64: {}  as u32: {}", size_u64, size_u32);
        eprintln!("last 160 bytes of body:");
        hexdump(&decompressed, decompressed.len().saturating_sub(160), 160);
    }

    let t = std::time::Instant::now();
    match parse_body_bytes_lean(decompressed, file_header, info, &ClassTables::embedded(), None) {
        Ok(store) => {
            eprintln!("BODY PARSE OK in {:.2?}", t.elapsed());
            eprintln!("levels: {}", store.levels.len());
            let total: usize = store.levels.iter().map(|l| l.headers.len()).sum();
            eprintln!("total objects: {}", total);
            eprintln!("calculator_extras: {:?}", store.calculator_extras);
            let last = store.levels.last().unwrap();
            eprintln!(
                "persistent level: {} objects, level_save_version={}",
                last.headers.len(),
                last.level_save_version
            );
        }
        Err(e) => {
            eprintln!("BODY PARSE FAILED after {:.2?}: {}", t.elapsed(), e);
            std::process::exit(1);
        }
    }
}
