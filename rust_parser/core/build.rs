//! Embeds the item-icon manifest: the Python _itemIconFilename checked
//! os.path.exists per call, which a wasm build can't do -- so the set of
//! extracted icon files is snapshotted at compile time instead (icons only
//! change when game_data/extractors/copy_icons.py reruns, which implies a rebuild
//! anyway).

use std::io::Write;
use std::path::Path;

fn main() {
    // gamedata/mod.rs include_str!s the extracted tables, so a checkout that
    // has neither run game_data/extract_all.py nor unpacked game_data.zip
    // cannot build. include_str! would say "couldn't read ...", one path at a
    // time, with no hint about why -- say it once, properly, instead.
    let game_data = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../game_data");
    for probe in ["generated/docs/items.json", "generated/world/powerSlugs.json"] {
        let path = game_data.join(probe);
        println!("cargo:rerun-if-changed={}", path.display());
        if !path.exists() {
            panic!(
                "game data missing ({} not found).
                 Nothing generated is committed -- get it with either:
                   py game_data/extract_all.py            (needs the game + an FModel dump)
                   py game_data/package_game_data.py unpack game_data.zip
                 See game_data/README.md.",
                path.display()
            );
        }
    }

    let icons_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../map/static/map/icons/items");
    println!("cargo:rerun-if-changed={}", icons_dir.display());

    let mut stems: Vec<String> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&icons_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name();
            let name = name.to_string_lossy();
            if let Some(stem) = name.strip_suffix(".png") {
                stems.push(stem.to_string());
            }
        }
    } else {
        println!(
            "cargo:warning=item icons dir missing ({}); all droppedItems icons will be null",
            icons_dir.display()
        );
    }
    stems.sort();

    let out = Path::new(&std::env::var("OUT_DIR").unwrap()).join("item_icon_stems.rs");
    let mut f = std::fs::File::create(out).unwrap();
    writeln!(f, "/// Sorted .png stems under map/static/map/icons/items/.").unwrap();
    writeln!(f, "pub static ITEM_ICON_STEMS: &[&str] = &[").unwrap();
    for stem in &stems {
        writeln!(f, "    {:?},", stem).unwrap();
    }
    writeln!(f, "];").unwrap();
}
