//! The structurally simple collectors: players, creatures, spawners, hub,
//! gameSettings, vehicles, dimensionalDepot (sav_map_data.py lines
//! ~668-696, 1505-1580, 3367-3391).

use crate::extract::find_prop;
use crate::gamedata;
use crate::mapdata::consts::*;
use crate::mapdata::geometry::{
    meters_to_pixel_length, project_xy, rendered_yaw, world_z_to_meters,
};
use crate::mapdata::jsonval::jnum;
use crate::mapdata::names::readable_label;
use crate::mapdata::props;
use crate::mapdata::scan::SaveScan;
use crate::store::*;
use serde_json::{json, Value};

fn f3(v: [f32; 3]) -> [f64; 3] {
    [v[0] as f64, v[1] as f64, v[2] as f64]
}

fn f4(v: [f32; 4]) -> [f64; 4] {
    [v[0] as f64, v[1] as f64, v[2] as f64, v[3] as f64]
}

/// The shared "{points: [x,y,z...], ids: [...]}" header-only bucket used by
/// collectPlayers and collectHub.
fn points_and_ids(scan: &SaveScan, type_path: &str) -> Value {
    let data = scan.data();
    let mut points: Vec<Value> = Vec::new();
    let mut ids: Vec<Value> = Vec::new();
    for slot in scan.actor_slots_of_type(&[type_path]) {
        let actor = scan.actor(slot);
        let position = f3(actor.position);
        let [px, py] = project_xy(position[0], position[1]);
        points.push(jnum(px));
        points.push(jnum(py));
        points.push(jnum(world_z_to_meters(position[2])));
        ids.push(Value::String(props::lossy(actor.instance_name.bytes(data))));
    }
    json!({"points": points, "ids": ids})
}

pub fn collect_players(scan: &SaveScan) -> Value {
    points_and_ids(scan, PLAYER_TYPE_PATH)
}

pub fn collect_hub(scan: &SaveScan) -> Value {
    points_and_ids(scan, HUB_TYPE_PATH)
}

/// TAMED lizard doggos only. A doggo actor exists in the save only if the
/// player had its region loaded at save time OR it was tamed -- an untamed one
/// is a transient spawn that despawns the moment its region unloads, so
/// plotting it is misleading (its spawner, drawn as static world data by
/// collect_spawners, is the durable fact about where doggos live). A tamed
/// doggo is permanent and player-owned, which is exactly what's worth a pin,
/// so the label says so and the map draws a heart on the pin.
///
/// mTamed is a BoolProperty present only once tamed (absent -> wild); the pet
/// name (mDisplayName) is NOT a discriminator: a tamed doggo the player never
/// renamed carries no mDisplayName at all, just the game's default display name.
pub fn collect_creatures(scan: &SaveScan) -> Value {
    let data = scan.data();
    // Single-typePath bucket dict in Python; list-shaped output.
    let mut points: Vec<Value> = Vec::new();
    let mut ids: Vec<Value> = Vec::new();
    for slot in scan.actor_slots_of_type(&[LIZARD_DOGGO_TYPE_PATH]) {
        let Some(object) = scan.parse_object(slot) else { continue };
        if props::boolean(&object.properties, data, b"mTamed") != Some(true) {
            continue;
        }
        let actor = scan.actor(slot);
        let position = f3(actor.position);
        let [px, py] = project_xy(position[0], position[1]);
        points.push(jnum(px));
        points.push(jnum(py));
        points.push(jnum(world_z_to_meters(position[2])));
        ids.push(Value::String(props::lossy(actor.instance_name.bytes(data))));
    }
    if ids.is_empty() {
        return json!([]);
    }
    json!([{
        "typePath": LIZARD_DOGGO_TYPE_PATH,
        // Keep in sync with describe_instance's doggo branch (the hover
        // tooltip's title) -- same wording, same meaning.
        "label": format!("{} (Tamed)", readable_label(LIZARD_DOGGO_TYPE_PATH)),
        // Class-keyed creature icon (icons/creatures/<Char_*_C>.png), the same
        // art the spawner pins use -- the map tells the two apart with the
        // heart badge, not a different picture.
        "iconClass": props::lossy(props::short_name(LIZARD_DOGGO_TYPE_PATH.as_bytes())),
        "points": points,
        "ids": ids,
    }])
}

/// Creature spawn markers -- static world data (the embedded
/// creatureSpawners.json/creatures.json tables, see
/// game_data/extractors/extract_spawners.py), not save actors: the save's
/// ~2,277 spawner actors don't record which creature they spawn, so the
/// cooked level data is the only source of truth and the result is the same
/// for every save. Beetles are dropped deliberately: no icon exists for
/// them, and they're not a creature anyone hunts on the map. One entry per
/// creature class, sorted by label for a stable sidebar order.
///
/// Labels come from readable_label (i.e. readableNameCorrections.json), NOT
/// creatures.json's displayName. Two reasons: that table gives
/// Char_SpitterForestAlpha_C and Char_SpitterForestRedAlpha_C the SAME name
/// (likewise the two Small Forest Spitters), which showed up as two
/// indistinguishable sidebar rows and two indistinguishable search results;
/// and describe_instance already names a live creature actor through
/// readable_label, so this is what makes a spawner and the creature it spawns
/// agree. It also means the hand-curated corrections table is the one place
/// to fix any species' name -- see the labels_are_unique test below.
pub fn collect_spawners(_scan: &SaveScan) -> Value {
    let gd = gamedata::get();
    let mut entries: Vec<(String, String, Value)> = Vec::new();
    for (class, spawners) in &gd.creature_spawners {
        if class == "unknown" || class == "Char_Beetle_C" {
            continue;
        }
        // creatures.json membership still gates which classes are real
        // creatures worth a marker, even though its name is no longer used.
        if !gd.creatures.contains_key(class) {
            continue;
        }
        let label = readable_label(class);
        let mut points: Vec<Value> = Vec::new();
        let mut ids: Vec<Value> = Vec::new();
        for (path_name, &[x, y, z]) in spawners {
            let [px, py] = project_xy(x, y);
            points.push(jnum(px));
            points.push(jnum(py));
            points.push(jnum(world_z_to_meters(z)));
            ids.push(Value::String(path_name.clone()));
        }
        entries.push((
            label.clone(),
            class.clone(),
            json!({
                "typePath": class,
                "label": label,
                "points": points,
                "ids": ids,
            }),
        ));
    }
    // By label, class as the tiebreak -- labels are unique today (see the
    // test), but the tiebreak keeps the order stable regardless.
    entries.sort_by(|a, b| (&a.0, &a.1).cmp(&(&b.0, &b.1)));
    Value::Array(entries.into_iter().map(|(_, _, v)| v).collect())
}

/// The map's two invisible edges -- static world data (the embedded
/// worldBounds.json, see game_data/extractors/extract_world_bounds.py), not
/// save actors, so the result is the same for every save:
///
///  - the world perimeter: the safe side of the damage volumes that hurt you
///    for leaving the map, plus the altitudes they start at,
///  - the water limit: where the swimmable, extractor-valid water actually
///    ends, which is far inside the ocean the game renders.
///
/// Both go out as closed rings in map pixels, ready for one line bucket, with
/// the tooltip rows alongside. Ring z is 0 (sea level) rather than the
/// volumes' real span (the perimeter walls run from -9.6 km to +10.4 km):
/// these are limits, not structures, and a line's altitude is only used for
/// the altitude filter and depth sorting -- so a narrowed altitude window
/// that excludes sea level hides them, which beats a tooltip claiming the
/// border sits 10 km up.
pub fn collect_map_limits(_scan: &SaveScan) -> Value {
    map_limits_value()
}

fn map_limits_value() -> Value {
    let bounds = &gamedata::get().world_bounds;
    let mut polylines: Vec<Value> = Vec::new();
    let mut ids: Vec<Value> = Vec::new();
    let mut kinds: Vec<Value> = Vec::new();
    let mut labels: Vec<Value> = Vec::new();
    let mut rows: Vec<Value> = Vec::new();

    let mut push_ring = |kind: &str, label: &str, ring: &[[f64; 2]], detail: Vec<Value>| {
        if ring.len() < 3 {
            return;
        }
        let mut points: Vec<Value> = Vec::with_capacity(ring.len() * 3 + 3);
        for &[x, y] in ring {
            let [px, py] = project_xy(x, y);
            points.push(jnum(px));
            points.push(jnum(py));
            points.push(jnum(0.0));
        }
        // Close the loop: the line renderer draws an open polyline.
        let first = [points[0].clone(), points[1].clone(), points[2].clone()];
        points.extend(first);
        polylines.push(Value::Array(points));
        // These rings are not save actors, so their "ids" are synthetic --
        // and the payload's id-slimming mirror re-adds the instance-name
        // prefix to any bulk id without a ':' (see slim_payload_value). The
        // "mapLimit:" prefix is what keeps them intact end to end; `kinds`
        // carries the bare name for the frontend to key colors off.
        ids.push(Value::String(format!("mapLimit:{kind}")));
        kinds.push(Value::String(kind.to_string()));
        labels.push(Value::String(label.to_string()));
        rows.push(Value::Array(detail));
    };

    let perimeter = &bounds.perimeter;
    let mut detail = vec![json!(["Cross it", "Damage over time"])];
    if let Some(ceiling) = perimeter.ceiling_z {
        detail.push(json!(["Damage above", format!("{:.0} m", world_z_to_meters(ceiling))]));
    }
    if let Some(floor) = perimeter.floor_z {
        detail.push(json!(["Damage below", format!("{:.0} m", world_z_to_meters(floor))]));
    }
    push_ring("worldPerimeter", "World border", &perimeter.polygon, detail);

    let water = &bounds.water;
    let mut detail = vec![json!(["Outside it", "No swimmable water"])];
    if let Some(ocean) = water.visual_ocean_bbox {
        // The headline fact: the sea you can see is an order of magnitude
        // bigger than the sea that exists.
        let visual_km = (ocean[2] - ocean[0]) / 100_000.0;
        let real_km = (water.extent_bbox[2] - water.extent_bbox[0]) / 100_000.0;
        detail.push(json!(["Real water spans", format!("{real_km:.1} km")]));
        detail.push(json!(["Rendered ocean spans", format!("{visual_km:.0} km")]));
    }
    push_ring("waterLimit", "Water limit", &water.outer_ring, detail);

    json!({"polylines": polylines, "ids": ids, "kinds": kinds, "labels": labels, "rows": rows})
}

#[cfg(test)]
mod map_limit_tests {
    use super::*;

    #[test]
    fn both_limits_come_out_as_closed_rings_with_tooltip_rows() {
        let limits = map_limits_value();
        let polylines = limits["polylines"].as_array().unwrap();
        let kinds: Vec<&str> =
            limits["kinds"].as_array().unwrap().iter().map(|i| i.as_str().unwrap()).collect();
        assert_eq!(kinds, ["worldPerimeter", "waterLimit"]);
        assert_eq!(polylines.len(), 2);
        // Every id must survive the payload's id-slimming mirror untouched,
        // which is exactly what the ':' buys (see the collector).
        for id in limits["ids"].as_array().unwrap() {
            assert!(id.as_str().unwrap().contains(':'), "id {id} would get re-prefixed client-side");
        }
        for ring in polylines {
            let points = ring.as_array().unwrap();
            assert!(points.len() >= 12 && points.len() % 3 == 0);
            assert_eq!(&points[0..3], &points[points.len() - 3..], "ring not closed");
            // Projected into the 0..8192 map-pixel space, with room for the
            // border sitting slightly outside the rendered map.
            for xy in points.chunks_exact(3) {
                for v in &xy[0..2] {
                    let value = v.as_f64().unwrap();
                    assert!((-2000.0..10192.0).contains(&value), "off-map point {value}");
                }
            }
        }
        for detail in limits["rows"].as_array().unwrap() {
            assert!(!detail.as_array().unwrap().is_empty());
        }
    }
}

/// Cave outlines -- static world data (the embedded caves.json, see
/// game_data/extractors/extract_caves.py), not save actors: nothing in a save
/// records a cave, so the cooked level data is the only source and the result
/// is the same for every save.
///
/// One entry per outline ring, in caves.json order (north to south), so the
/// frontend can hand the whole thing to one line bucket: `polylines` are
/// closed loops in map pixels with the cave's floor altitude as z, and the
/// parallel `labels`/`areas`/`depths` arrays carry what the tooltip shows.
/// Caves the game never named are numbered by that same order, so every label
/// is unique and stable across loads.
pub fn collect_caves(_scan: &SaveScan) -> Value {
    caves_value()
}

fn caves_value() -> Value {
    let mut polylines: Vec<Value> = Vec::new();
    let mut ids: Vec<Value> = Vec::new();
    let mut labels: Vec<Value> = Vec::new();
    let mut areas: Vec<Value> = Vec::new();
    let mut depths: Vec<Value> = Vec::new();
    for (index, cave) in gamedata::get().caves.caves.iter().enumerate() {
        let label = cave.name.clone().unwrap_or_else(|| format!("Cave {}", index + 1));
        // Altitude of the cave floor: what the altitude slider filters on, and
        // what the tooltip reports as depth. No zRange (a cave traced purely
        // from mesh origins) sinks to 0 rather than dropping the ring.
        let [min_z, max_z] = cave.z_range.unwrap_or([0.0, 0.0]);
        for (ring_index, ring) in cave.rings.iter().enumerate() {
            let mut points: Vec<Value> = Vec::with_capacity(ring.len() / 2 * 3 + 3);
            for pair in ring.chunks_exact(2) {
                let [px, py] = project_xy(pair[0], pair[1]);
                points.push(jnum(px));
                points.push(jnum(py));
                points.push(jnum(world_z_to_meters(min_z)));
            }
            if points.len() < 9 {
                continue; // fewer than three vertices: not a ring
            }
            // Close the loop: the line renderer draws an open polyline.
            let first = [points[0].clone(), points[1].clone(), points[2].clone()];
            points.extend(first);
            polylines.push(Value::Array(points));
            ids.push(Value::String(format!("{}#{}", cave.id, ring_index)));
            labels.push(Value::String(label.clone()));
            areas.push(jnum(cave.area_m2));
            depths.push(json!([jnum(world_z_to_meters(min_z)), jnum(world_z_to_meters(max_z))]));
        }
    }
    json!({
        "polylines": polylines,
        "ids": ids,
        "labels": labels,
        "areas": areas,
        "depths": depths,
    })
}

#[cfg(test)]
mod cave_tests {
    use super::*;

    #[test]
    fn every_cave_ring_is_a_closed_loop_with_a_unique_label() {
        let caves = caves_value();
        let polylines = caves["polylines"].as_array().unwrap();
        assert!(polylines.len() >= gamedata::get().caves.caves.len());
        for ring in polylines {
            let points = ring.as_array().unwrap();
            assert!(points.len() >= 12 && points.len() % 3 == 0, "ring of {} values", points.len());
            assert_eq!(&points[0..3], &points[points.len() - 3..], "ring not closed");
        }
        let labels: Vec<&str> =
            caves["labels"].as_array().unwrap().iter().map(|l| l.as_str().unwrap()).collect();
        assert_eq!(labels.len(), polylines.len());
        let ids: Vec<&str> =
            caves["ids"].as_array().unwrap().iter().map(|i| i.as_str().unwrap()).collect();
        let unique: std::collections::HashSet<&&str> = ids.iter().collect();
        assert_eq!(unique.len(), ids.len(), "duplicate ring id");
    }
}

#[cfg(test)]
mod spawner_label_tests {
    use super::*;
    use std::collections::HashMap;

    /// Every plotted spawner species must be tellable from every other one --
    /// in the sidebar and in the search bar, the label is all the user gets.
    /// A collision here means readableNameCorrections.json needs a distinct
    /// name for the colliding classes.
    #[test]
    fn spawner_labels_are_unique() {
        let gd = gamedata::get();
        let mut by_label: HashMap<String, Vec<&str>> = HashMap::new();
        for class in gd.creature_spawners.keys() {
            if class == "unknown" || class == "Char_Beetle_C" || !gd.creatures.contains_key(class) {
                continue;
            }
            by_label.entry(readable_label(class)).or_default().push(class);
        }
        assert!(!by_label.is_empty(), "no spawner species at all");
        let clashes: Vec<_> = by_label.iter().filter(|(_, classes)| classes.len() > 1).collect();
        assert!(clashes.is_empty(), "spawner species sharing a label: {clashes:?}");
    }

    /// A class missing from readableNameCorrections would fall through to the
    /// de-camelCase fallback and read as "Char, Big Crab Hatcher".
    #[test]
    fn every_spawner_species_has_a_curated_name() {
        let gd = gamedata::get();
        for class in gd.creature_spawners.keys() {
            if class == "unknown" || class == "Char_Beetle_C" || !gd.creatures.contains_key(class) {
                continue;
            }
            assert!(
                gd.readable_name_corrections.contains_key(class),
                "{class} has no readableNameCorrections entry"
            );
        }
    }
}

/// sav_map_data._humanizeEnumValue over a raw EnumProperty value.
fn humanize_enum_value(value: Option<&PropertyValue>, data: &[u8]) -> Value {
    // Python receives ['EnumTypeName', 'EnumTypeName::SHORT_ValueName'] only
    // when the enum kept its type name; anything else -> None.
    let Some(PropertyValue::Enum { enum_name: Some(_), value }) = value else {
        return Value::Null;
    };
    let raw = props::lossy(value.bytes(data));
    let value_name = match raw.rfind("::") {
        Some(i) => &raw[i + 2..],
        None => raw.as_str(),
    };
    // re.sub(r"^[A-Z0-9]+_", "", ...): strip one leading ALLCAPS/digit run
    // followed by an underscore.
    let bytes = value_name.as_bytes();
    let mut prefix_len = 0usize;
    while prefix_len < bytes.len()
        && (bytes[prefix_len].is_ascii_uppercase() || bytes[prefix_len].is_ascii_digit())
    {
        prefix_len += 1;
    }
    let stripped = if prefix_len > 0 && bytes.get(prefix_len) == Some(&b'_') {
        &value_name[prefix_len + 1..]
    } else {
        value_name
    };
    // re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", ...): space at each
    // lower/digit -> upper boundary.
    let mut out = String::with_capacity(stripped.len() + 8);
    let mut prev: Option<char> = None;
    for ch in stripped.chars() {
        if ch.is_ascii_uppercase() {
            if let Some(p) = prev {
                if p.is_ascii_lowercase() || p.is_ascii_digit() {
                    out.push(' ');
                }
            }
        }
        out.push(ch);
        prev = Some(ch);
    }
    Value::String(out)
}

pub fn collect_game_settings(scan: &SaveScan) -> Value {
    let data = scan.data();
    for &slot in &scan.game_state_objects {
        // First match, same as the old early-returning scan.
        let Some(object) = scan.parse_object(slot) else { continue };
        let properties = &object.properties;
        // World-creation cost multipliers; each is absent (-> null) when the
        // world was created with the default 1x.
        let multiplier = |name: &[u8]| match find_prop(properties, data, name) {
            Some(PropertyValue::Float(f)) => jnum(*f as f64),
            Some(PropertyValue::Double(f)) => jnum(*f),
            _ => Value::Null,
        };
        return json!({
            "resourceCostMultiplier": multiplier(b"mPartsCostMultiplier"),
            "powerCostMultiplier": multiplier(b"mEnergyCostMultiplier"),
            "spaceElevatorCostMultiplier": multiplier(b"mSpacePartsCostMultiplier"),
            "nodePuritySettings":
                humanize_enum_value(find_prop(properties, data, b"mNodePuritySettings"), data),
            "nodeRandomization":
                humanize_enum_value(find_prop(properties, data, b"mNodeRandomization"), data),
        });
    }
    json!({})
}

/// sav_map_data._vehicleFootprintPixels.
pub fn vehicle_footprint_pixels(type_path: &str) -> Value {
    match vehicle_footprint_meters(type_path) {
        Some((length_meters, width_meters)) => json!([
            jnum(meters_to_pixel_length(length_meters / 2.0)),
            jnum(meters_to_pixel_length(width_meters / 2.0)),
        ]),
        None => Value::Null,
    }
}

pub fn collect_vehicles(scan: &SaveScan) -> Value {
    let data = scan.data();
    let railcars = railcar_type_paths();
    let vehicle_type_paths: Vec<&str> = VEHICLE_ICONS_BY_TYPE_PATH
        .iter()
        .map(|(p, _)| *p)
        .filter(|p| !railcars.contains(p))
        .collect();
    struct Bucket {
        type_path: String,
        label: String,
        icon: &'static str,
        points: Vec<Value>,
        ids: Vec<Value>,
        footprint: Value,
    }
    let mut buckets: Vec<Bucket> = Vec::new();
    for slot in scan.actor_slots_of_type(&vehicle_type_paths) {
        let actor = scan.actor(slot);
        let type_path = props::lossy(actor.type_path.bytes(data));
        let idx = match buckets.iter().position(|b| b.type_path == type_path) {
            Some(i) => i,
            None => {
                buckets.push(Bucket {
                    label: readable_label(&type_path),
                    icon: vehicle_icon(&type_path).expect("vehicle icon"),
                    points: Vec::new(),
                    ids: Vec::new(),
                    footprint: vehicle_footprint_pixels(&type_path),
                    type_path,
                });
                buckets.len() - 1
            }
        };
        let bucket = &mut buckets[idx];
        let position = f3(actor.position);
        let [px, py] = project_xy(position[0], position[1]);
        bucket.points.push(jnum(px));
        bucket.points.push(jnum(py));
        bucket.points.push(jnum(rendered_yaw(f4(actor.rotation))));
        bucket.points.push(jnum(world_z_to_meters(position[2])));
        bucket.ids.push(Value::String(props::lossy(actor.instance_name.bytes(data))));
    }
    // sorted(typeBuckets.items(), key=entry[1]["label"]) -- stable.
    buckets.sort_by(|a, b| a.label.cmp(&b.label));
    Value::Array(
        buckets
            .into_iter()
            .map(|b| {
                json!({
                    "typePath": b.type_path,
                    "label": b.label,
                    "icon": b.icon,
                    "points": b.points,
                    "ids": b.ids,
                    "footprintPixels": b.footprint,
                })
            })
            .collect(),
    )
}

const CENTRAL_STORAGE_SUBSYSTEM_TYPE_PATH: &str = "/Script/FactoryGame.FGCentralStorageSubsystem";

pub fn collect_dimensional_depot_contents(scan: &SaveScan) -> Value {
    let data = scan.data();
    let slots = scan.actor_slots_of_type(&[CENTRAL_STORAGE_SUBSYSTEM_TYPE_PATH]);
    let Some(&last) = slots.last() else {
        return json!([]);
    };
    let name = scan.actor(last).instance_name.bytes(data);
    let Some(object) = scan.parse_object_by_name(name) else {
        return json!([]);
    };
    let stored_items: &[PropList] = match props::array_structs(&object.properties, data, b"mStoredItems") {
        Some(v) => v,
        None => &[], // `or []`
    };
    struct Row {
        item_path: String,
        label: String,
        count: i32,
    }
    let mut items: Vec<Row> = Vec::new();
    for entry in stored_items {
        // ItemClass is an ObjectProperty reference; `not getattr(itemClass,
        // "pathName", None)` also drops empty pathName.
        let Some(item_class) = props::object_ref(entry, data, b"ItemClass") else { continue };
        let path = item_class.path_name.bytes(data);
        if path.is_empty() {
            continue;
        }
        // `not amount` drops both missing and 0.
        let amount = props::int(entry, data, b"Amount").unwrap_or(0);
        if amount == 0 {
            continue;
        }
        let short = props::lossy(props::short_name(path));
        items.push(Row { label: readable_label(&short), item_path: short, count: amount });
    }
    // items.sort(key=count, reverse=True) -- stable descending.
    items.sort_by(|a, b| b.count.cmp(&a.count));
    Value::Array(
        items
            .into_iter()
            .map(|r| json!({"itemPath": r.item_path, "label": r.label, "count": r.count}))
            .collect(),
    )
}
