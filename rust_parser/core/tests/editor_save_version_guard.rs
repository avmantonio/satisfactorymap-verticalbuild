//! The editor refuses pre-1.0 saves (see save_header::FIRST_1_0_SAVE_VERSION).
//! Update 8 saves parse and map, but every record the edit engine writes is
//! 1.0-format, so applying one would produce a file the game cannot load --
//! and the player would only find out on the next load.
//!
//! No Update 8 save is in the test corpus, so these drive the guard by
//! rewriting a real save's version field: the guard reads exactly that, and
//! this keeps the test honest about what it covers (the refusal, not U8
//! parsing itself, which the compat work verified on a real 6 GB U8 save).

use sav_core::editor::apply::plan_op;
use sav_core::editor::ops::EditOp;
use sav_core::level::parse_full_save;
use sav_core::object::ClassTables;
use sav_core::save_header::FIRST_1_0_SAVE_VERSION;
use sav_core::store::{Header, SaveStore};
use std::path::PathBuf;

fn load(name: &str) -> SaveStore {
    let path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../map/uploads").join(name);
    let bytes = std::fs::read(path).expect("test save present");
    parse_full_save(&bytes, &ClassTables::embedded(), None).unwrap()
}

/// Any actor's instance name -- the op only has to be well-formed enough to
/// reach the engine; the guard runs before anything is planned.
fn first_actor_name(store: &SaveStore) -> String {
    for level in &store.levels {
        for header in &level.headers {
            if let Header::Actor(a) = header {
                return a.instance_name.to_string(&store.data);
            }
        }
    }
    panic!("no actors in the test save");
}

fn move_op(name: String) -> EditOp {
    EditOp::MoveActors { names: vec![name], delta: [100.0, 0.0, 0.0], rotate_yaw_deg: 0.0, pivot: None }
}

#[test]
fn a_pre_1_0_save_is_refused_by_the_edit_engine() {
    let mut store = load("All_autosave_2.sav");
    let name = first_actor_name(&store);
    // The real Update 8 value, and the only sub-1.0 version the header accept
    // list takes today.
    store.info.save_version = 42;

    // EditPlan isn't Debug, so unwrap the Result by hand rather than expect_err.
    let err = match plan_op(&store, &move_op(name)) {
        Err(e) => e,
        Ok(_) => panic!("pre-1.0 edits must be refused"),
    };
    assert!(err.msg.contains("42"), "the message should name the version: {}", err.msg);
    assert!(
        err.msg.contains("viewed but not edited"),
        "the message should say viewing still works: {}",
        err.msg
    );
}

#[test]
fn the_guard_refuses_everything_below_the_1_0_layout_boundary() {
    let mut store = load("All_autosave_2.sav");
    let name = first_actor_name(&store);
    for version in 0..FIRST_1_0_SAVE_VERSION {
        store.info.save_version = version;
        assert!(
            plan_op(&store, &move_op(name.clone())).is_err(),
            "save version {version} is pre-1.0 and must not be editable"
        );
    }
}

/// The guard must not have made ordinary saves unedittable -- the boundary
/// version itself, and the save's own real version, both plan fine.
#[test]
fn current_saves_still_plan_normally() {
    let mut store = load("All_autosave_2.sav");
    let name = first_actor_name(&store);
    let real_version = store.info.save_version;
    assert!(
        real_version >= FIRST_1_0_SAVE_VERSION,
        "test corpus save should be 1.0+ (was {real_version})"
    );
    plan_op(&store, &move_op(name.clone())).expect("a real save must still be editable");

    store.info.save_version = FIRST_1_0_SAVE_VERSION;
    plan_op(&store, &move_op(name)).expect("the boundary version is 1.0 layout, so editable");
}
