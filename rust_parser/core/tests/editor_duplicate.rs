//! Duplicate-engine tests: copy a machine (components renamed consistently),
//! a powered pair (wire auto-included and remapped), and lightweight
//! foundations; verify determinism and that originals are untouched.

use sav_core::editor::ops::{EditOp, LwRef};
use sav_core::editor::{effective_body, export_sav, session};
use sav_core::level::parse_full_save;
use sav_core::mapdata::scan::SaveScan;
use sav_core::object::ClassTables;
use sav_core::store::{ActorSpecific, Header, SaveStore};
use std::path::PathBuf;

fn load(name: &str) -> SaveStore {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../map/uploads").join(name);
    let bytes = std::fs::read(path).expect("test save present");
    parse_full_save(&bytes, &ClassTables::embedded(), None).unwrap()
}

/// The absolute wire-mesh endpoint positions cached in a power line's
/// mWireInstances "Locations" vectors.
fn wire_locations(store: &SaveStore, li: usize, oi: usize) -> Vec<[f64; 3]> {
    use sav_core::store::{PropertyValue, StructValue};
    let object = store.parse_object_at(li, oi).unwrap();
    let mut out = Vec::new();
    if let Some(entries) =
        sav_core::mapdata::props::array_structs(&object.properties, &store.data, b"mWireInstances")
    {
        for entry in entries {
            for prop in &entry.props {
                if !prop.name.wide && prop.name.bytes(&store.data) == b"Locations" {
                    if let PropertyValue::Struct(StructValue::Vector(v)) = &prop.value {
                        out.push(*v);
                    }
                }
            }
        }
    }
    out
}

fn actors_of_type<'a>(store: &'a SaveStore, prefix: &str) -> Vec<(usize, usize, String)> {
    let mut out = Vec::new();
    for (li, level) in store.levels.iter().enumerate() {
        for (oi, header) in level.headers.iter().enumerate() {
            if let Header::Actor(a) = header {
                if a.type_path.to_string(&store.data).starts_with(prefix) {
                    out.push((li, oi, a.instance_name.to_string(&store.data)));
                }
            }
        }
    }
    out
}

#[test]
fn duplicate_constructor_renames_components_consistently() {
    let store = load("All_080726-163150.sav");
    let tables = ClassTables::embedded();
    let prefix = "/Game/FactoryGame/Buildable/Factory/ConstructorMk1/";
    let before = actors_of_type(&store, prefix);
    let (li, oi, name) = before[0].clone();
    let original_components: Vec<String> = match &store.levels[li].parsed_objects()[oi].actor_reference_associations {
        Some((_, comps)) => comps.iter().map(|r| r.path_name.to_string(&store.data)).collect(),
        None => panic!("constructor has no associations"),
    };
    assert!(!original_components.is_empty(), "test needs a machine with components");

    let op = EditOp::DuplicateActors {
        names: vec![name.clone()],
        delta: [2000.0, 0.0, 0.0],
        rotate_yaw_deg: 0.0,
        pivot: None,
        seed: 42,
    };
    let store2 = session::step(&store, &op, &tables).unwrap();

    let after = actors_of_type(&store2, prefix);
    assert_eq!(after.len(), before.len() + 1, "one new constructor");
    let new_names: Vec<&String> = after
        .iter()
        .map(|(_, _, n)| n)
        .filter(|n| !before.iter().any(|(_, _, b)| b == *n))
        .collect();
    assert_eq!(new_names.len(), 1);
    let new_name = new_names[0].clone();
    assert_eq!(new_name.len(), name.len(), "same-length rename");
    assert_ne!(new_name, name);

    // The copy's components exist under the new name and mirror the
    // original's component suffixes.
    let scan2 = SaveScan::new(&store2);
    let (nli, noi) = *scan2.by_instance_name.get(new_name.as_bytes()).unwrap();
    let copy_components: Vec<String> = match &store2.levels[nli].parsed_objects()[noi].actor_reference_associations {
        Some((_, comps)) => comps.iter().map(|r| r.path_name.to_string(&store2.data)).collect(),
        None => panic!("copy has no associations"),
    };
    assert_eq!(copy_components.len(), original_components.len());
    for (orig, copy) in original_components.iter().zip(&copy_components) {
        assert_ne!(orig, copy);
        assert!(copy.starts_with(&new_name), "component {} not under {}", copy, new_name);
        assert!(scan2.by_instance_name.contains_key(copy.as_bytes()), "component {} missing", copy);
        let orig_suffix = &orig[name.len()..];
        let copy_suffix = &copy[new_name.len()..];
        assert_eq!(orig_suffix, copy_suffix);
    }

    // Original still intact, position of copy moved by the delta.
    assert!(scan2.by_instance_name.contains_key(name.as_bytes()));
    let orig_pos = match &store.levels[li].headers[oi] {
        Header::Actor(a) => a.position,
        _ => unreachable!(),
    };
    let copy_pos = match &store2.levels[nli].headers[noi] {
        Header::Actor(a) => a.position,
        _ => unreachable!(),
    };
    assert_eq!(copy_pos[0], orig_pos[0] + 2000.0);
    assert_eq!(copy_pos[1], orig_pos[1]);

    // Round-trips through export.
    let exported = export_sav(&store2.file_header, effective_body(&store2));
    parse_full_save(&exported, &tables, None).unwrap();
}

#[test]
fn duplicate_powered_pair_includes_and_remaps_wire() {
    let store = load("All_080726-163150.sav");
    let tables = ClassTables::embedded();
    let data: &[u8] = &store.data;

    // Find a wire whose two endpoint owners are distinct actors.
    let mut target: Option<(String, String, String)> = None; // owner_a, owner_b, wire
    let scan = SaveScan::new(&store);
    'outer: for level in &store.levels {
        for (oi, object) in level.parsed_objects().iter().enumerate() {
            if let ActorSpecific::PowerLine(a, b) = &object.actor_specific {
                let (pa, pb) = (a.path_name.to_string(data), b.path_name.to_string(data));
                let (Some(da), Some(db)) = (pa.rfind('.'), pb.rfind('.')) else { continue };
                let (owner_a, owner_b) = (pa[..da].to_string(), pb[..db].to_string());
                if owner_a != owner_b
                    && scan.by_instance_name.contains_key(owner_a.as_bytes())
                    && scan.by_instance_name.contains_key(owner_b.as_bytes())
                {
                    let wire = level.headers[oi].instance_name().to_string(data);
                    target = Some((owner_a, owner_b, wire));
                    break 'outer;
                }
            }
        }
    }
    let Some((owner_a, owner_b, wire)) = target else {
        eprintln!("save has no two-owner wire; skipping");
        return;
    };
    let (wli, woi) = *scan.by_instance_name.get(wire.as_bytes()).unwrap();
    let original_locations = wire_locations(&store, wli, woi);

    let count_wires = |s: &SaveStore| -> usize {
        s.levels
            .iter()
            .flat_map(|l| l.parsed_objects())
            .filter(|o| matches!(o.actor_specific, ActorSpecific::PowerLine(..)))
            .count()
    };
    let wires_before = count_wires(&store);

    let op = EditOp::DuplicateActors {
        names: vec![owner_a.clone(), owner_b.clone()],
        delta: [3000.0, 0.0, 0.0],
        rotate_yaw_deg: 0.0,
        pivot: None,
        seed: 7,
    };
    let store2 = session::step(&store, &op, &tables).unwrap();
    assert_eq!(count_wires(&store2), wires_before + 1, "wire auto-included");

    // The new wire's endpoints point at the copies, not the originals.
    let scan2 = SaveScan::new(&store2);
    let data2: &[u8] = &store2.data;
    let mut checked = false;
    for level in &store2.levels {
        for (oi, object) in level.parsed_objects().iter().enumerate() {
            if let ActorSpecific::PowerLine(a, b) = &object.actor_specific {
                let name = level.headers[oi].instance_name().bytes(data2);
                if scan.by_instance_name.contains_key(name) {
                    continue; // pre-existing wire
                }
                let (pa, pb) = (a.path_name.to_string(data2), b.path_name.to_string(data2));
                assert!(!pa.starts_with(&(owner_a.clone() + ".")) && !pb.starts_with(&(owner_a.clone() + ".")),
                    "copied wire still references original {}", owner_a);
                assert!(!pa.starts_with(&(owner_b.clone() + ".")) && !pb.starts_with(&(owner_b.clone() + ".")),
                    "copied wire still references original {}", owner_b);
                // Both endpoints resolve to components that exist.
                assert!(scan2.by_instance_name.contains_key(pa.as_bytes()), "endpoint {} missing", pa);
                assert!(scan2.by_instance_name.contains_key(pb.as_bytes()), "endpoint {} missing", pb);
                // The cached wire-mesh endpoint positions moved with the
                // copy: they are what the map (and the game) draw the wire
                // from, so stale ones would visually attach the copy's wire
                // to the ORIGINAL buildings.
                let &(cli, coi) = scan2.by_instance_name.get(name).unwrap();
                let copy_locations = wire_locations(&store2, cli, coi);
                assert_eq!(copy_locations.len(), original_locations.len());
                for (copy, orig) in copy_locations.iter().zip(&original_locations) {
                    assert_eq!(copy[0], orig[0] + 3000.0, "wire location not translated");
                    assert_eq!(copy[1], orig[1]);
                    assert_eq!(copy[2], orig[2]);
                }
                checked = true;
            }
        }
    }
    assert!(checked, "no new wire found");

    // Originals untouched.
    assert_eq!(wire_locations(&store2, wli, woi), original_locations);
}

#[test]
fn duplicate_lightweight_appends_instance() {
    let store = load("All_080726-163150.sav");
    let tables = ClassTables::embedded();

    let mut target: Option<(String, usize, [f64; 3])> = None;
    for level in &store.levels {
        for object in level.parsed_objects() {
            if let ActorSpecific::Lightweight { items, .. } = &object.actor_specific {
                if let Some(group) = items.first() {
                    target = Some((
                        group.type_path.to_string(&store.data),
                        group.instances.len(),
                        group.instances[0].position,
                    ));
                }
            }
        }
    }
    let Some((type_path, count_before, pos)) = target else {
        eprintln!("save has no lightweight buildables; skipping");
        return;
    };

    let op = EditOp::DuplicateLightweight {
        items: vec![LwRef { type_path: type_path.clone(), index: 0 }],
        delta: [800.0, 800.0, 0.0],
        rotate_yaw_deg: 90.0,
        pivot: Some([pos[0], pos[1]]),
    };
    let store2 = session::step(&store, &op, &tables).unwrap();

    for level in &store2.levels {
        for object in level.parsed_objects() {
            if let ActorSpecific::Lightweight { items, .. } = &object.actor_specific {
                let group = items.iter().find(|g| g.type_path.eq_ascii(&store2.data, &type_path)).unwrap();
                assert_eq!(group.instances.len(), count_before + 1);
                let new_instance = group.instances.last().unwrap();
                assert_eq!(new_instance.position[0], pos[0] + 800.0);
                assert_eq!(new_instance.position[1], pos[1] + 800.0);
                assert_eq!(new_instance.position[2], pos[2]);
                // Blueprint proxy emptied on the copy.
                assert!(new_instance.blueprint_proxy.path_name.is_empty());
                // Original untouched.
                assert_eq!(group.instances[0].position, pos);
                return;
            }
        }
    }
    panic!("lightweight subsystem missing after edit");
}

#[test]
fn duplicate_replay_is_deterministic() {
    let store = load("All_080726-163150.sav");
    let tables = ClassTables::embedded();
    let (_, _, name) = actors_of_type(&store, "/Game/FactoryGame/Buildable/Factory/SmelterMk1/")[0].clone();
    let ops = vec![
        EditOp::DuplicateActors { names: vec![name.clone()], delta: [1000.0, 0.0, 0.0], rotate_yaw_deg: 0.0, pivot: None, seed: 99 },
        EditOp::DuplicateActors { names: vec![name], delta: [2000.0, 0.0, 0.0], rotate_yaw_deg: 0.0, pivot: None, seed: 100 },
    ];
    let pristine = effective_body(&store).to_vec();
    let a = session::rebuild(pristine.clone(), &store.file_header, &store.info, &tables, &ops, None).unwrap();
    let b = session::rebuild(pristine.clone(), &store.file_header, &store.info, &tables, &ops, None).unwrap();
    assert_eq!(a.data, b.data);
}

/// Wires are riders even when explicitly selected (they are box-selectable
/// since the selection got full power-line support): a wire named without
/// both endpoint owners must not produce a dangling copy, and a wire named
/// WITH its owners must not double the wire.
#[test]
fn explicit_wire_is_a_rider_not_a_copy_target() {
    let store = load("All_080726-163150.sav");
    let tables = ClassTables::embedded();
    let data: &[u8] = &store.data;
    let scan = SaveScan::new(&store);

    let mut target: Option<(String, String, String)> = None;
    'outer: for level in &store.levels {
        for (oi, object) in level.parsed_objects().iter().enumerate() {
            if let ActorSpecific::PowerLine(a, b) = &object.actor_specific {
                let (pa, pb) = (a.path_name.to_string(data), b.path_name.to_string(data));
                let (Some(da), Some(db)) = (pa.rfind('.'), pb.rfind('.')) else { continue };
                let (owner_a, owner_b) = (pa[..da].to_string(), pb[..db].to_string());
                if owner_a != owner_b
                    && scan.by_instance_name.contains_key(owner_a.as_bytes())
                    && scan.by_instance_name.contains_key(owner_b.as_bytes())
                {
                    target = Some((owner_a, owner_b, level.headers[oi].instance_name().to_string(data)));
                    break 'outer;
                }
            }
        }
    }
    let Some((owner_a, owner_b, wire)) = target else {
        eprintln!("save has no two-owner wire; skipping");
        return;
    };

    let count_wires = |s: &SaveStore| -> usize {
        s.levels
            .iter()
            .flat_map(|l| l.parsed_objects())
            .filter(|o| matches!(o.actor_specific, ActorSpecific::PowerLine(..)))
            .count()
    };
    let wires_before = count_wires(&store);

    // Wire alone: pruned to nothing.
    let op = EditOp::DuplicateActors {
        names: vec![wire.clone()],
        delta: [3000.0, 0.0, 0.0],
        rotate_yaw_deg: 0.0,
        pivot: None,
        seed: 7,
    };
    assert!(session::step(&store, &op, &tables).is_err(), "wire-only copy should be empty");

    // Wire + both owners: same result as owners alone -- exactly one new wire.
    let op = EditOp::DuplicateActors {
        names: vec![owner_a.clone(), owner_b.clone(), wire.clone()],
        delta: [3000.0, 0.0, 0.0],
        rotate_yaw_deg: 0.0,
        pivot: None,
        seed: 7,
    };
    let store2 = session::step(&store, &op, &tables).unwrap();
    assert_eq!(count_wires(&store2), wires_before + 1);

    // Move guard: moving a wire alone changes nothing.
    let wire_slot = *scan.by_instance_name.get(wire.as_bytes()).unwrap();
    let locations_before = wire_locations(&store, wire_slot.0, wire_slot.1);
    let op = EditOp::MoveActors {
        names: vec![wire.clone()],
        delta: [800.0, 0.0, 0.0],
        rotate_yaw_deg: 0.0,
        pivot: None,
    };
    let store3 = session::step(&store, &op, &tables).unwrap();
    let scan3 = SaveScan::new(&store3);
    let slot3 = *scan3.by_instance_name.get(wire.as_bytes()).unwrap();
    assert_eq!(wire_locations(&store3, slot3.0, slot3.1), locations_before);
}

/// Copies grow the body in place: bodies carry BODY_EDIT_SLACK spare
/// capacity so an insert never reallocates (a realloc means ~2x the body
/// alive at once -- what used to trap the 4GB wasm heap on GB-scale saves).
#[test]
fn insert_growth_stays_in_place() {
    let store = load("All_080726-163150.sav");
    let tables = ClassTables::embedded();
    assert!(
        store.data.capacity() >= store.data.len() + (60 << 20),
        "body allocated without edit slack: len={} cap={}",
        store.data.len(),
        store.data.capacity()
    );
    let ptr_before = store.data.as_ptr() as usize;
    let (_, _, name) = {
        let mut found = None;
        for level in &store.levels {
            for header in &level.headers {
                if let Header::Actor(a) = header {
                    if a.type_path.to_string(&store.data).contains("ConstructorMk1") {
                        found = Some((0usize, 0usize, a.instance_name.to_string(&store.data)));
                    }
                }
            }
        }
        found.expect("constructor present")
    };
    let op = EditOp::DuplicateActors {
        names: vec![name],
        delta: [2000.0, 0.0, 0.0],
        rotate_yaw_deg: 0.0,
        pivot: None,
        seed: 3,
    };
    let store2 = session::fold_ops(store, &[op], &tables, None).unwrap();
    assert_eq!(
        store2.data.as_ptr() as usize, ptr_before,
        "insert reallocated the body instead of growing in place"
    );
}

/// The wasm big-edit guard estimates growth for the WHOLE action: a mixed
/// paste is [duplicateActors, duplicateLightweight], and checking only the
/// first op would let the lightweight half overflow the slack unguarded.
#[test]
fn planned_growth_covers_every_op_of_an_action() {
    let store = load("All_080726-163150.sav");
    let constructor = actors_of_type(&store, "/Game/FactoryGame/Buildable/Factory/ConstructorMk1/")
        .first()
        .expect("constructor present")
        .2
        .clone();
    let mut lw_type: Option<String> = None;
    for level in &store.levels {
        for object in level.parsed_objects() {
            if let ActorSpecific::Lightweight { items, .. } = &object.actor_specific {
                if let Some(group) = items.first() {
                    lw_type = Some(group.type_path.to_string(&store.data));
                }
            }
        }
    }
    let Some(lw_type) = lw_type else {
        eprintln!("save has no lightweight buildables; skipping");
        return;
    };

    let ops = vec![
        EditOp::DuplicateActors {
            names: vec![constructor],
            delta: [2000.0, 0.0, 0.0],
            rotate_yaw_deg: 0.0,
            pivot: None,
            seed: 7,
        },
        EditOp::DuplicateLightweight {
            items: vec![LwRef { type_path: lw_type, index: 0 }],
            delta: [2000.0, 0.0, 0.0],
            rotate_yaw_deg: 0.0,
            pivot: None,
        },
    ];
    let actors_only = sav_core::editor::apply::plan_op(&store, &ops[0]).unwrap().inserted_bytes();
    let lw_only = sav_core::editor::apply::plan_op(&store, &ops[1]).unwrap().inserted_bytes();
    assert!(actors_only > 0 && lw_only > 0);
    assert_eq!(session::planned_growth(&store, &ops).unwrap(), actors_only + lw_only);

    // Op-0 failures still surface (the healthy-session semantic dry-run).
    let bad = EditOp::DuplicateActors {
        names: vec!["NoSuchInstance_1".into()],
        delta: [0.0, 0.0, 0.0],
        rotate_yaw_deg: 0.0,
        pivot: None,
        seed: 7,
    };
    assert!(session::planned_growth(&store, std::slice::from_ref(&bad)).is_err());
}

/// The fresh-worker restart marker fires only on certain doom -- a grown
/// body that can never exist in a 4GiB heap. Everything below that line is
/// attempted in place (trap recovery is the backstop).
#[test]
fn restart_is_reserved_for_impossible_bodies() {
    let gb = |n: u64| n << 30;
    // Giant-save paste with a big growth: attempted in place.
    assert!(session::grown_body_can_exist(gb(1), 800 << 20));
    // Even a near-3GB body with a large paste: attempted.
    assert!(session::grown_body_can_exist(gb(3), 500 << 20));
    // A grown body that can't exist under 4GiB at all: restart.
    assert!(!session::grown_body_can_exist(gb(3), gb(1)));
    // Overflow-proof on absurd inputs.
    assert!(!session::grown_body_can_exist(u64::MAX, u64::MAX));
}
