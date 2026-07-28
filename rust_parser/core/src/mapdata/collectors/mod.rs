//! The 19 payload collectors, one module per _payloadSteps entry. Each is an
//! exact behavioral port of its Python namesake in map/sav_map_data.py --
//! except "spawners" and "mapLimits", which post-date the Python
//! implementation (static world data, no save input; see
//! simple::collect_spawners and simple::collect_map_limits).

pub mod buildings;
pub mod lines;
pub mod simple;
pub mod trains_progression;
pub mod world;

use super::scan::SaveScan;
use serde_json::Value;

/// A payload step: (key, collector). Registered in _payloadSteps order; the
/// registry only lists ported collectors, so requesting an unported step is
/// an explicit error rather than silently-wrong output.
pub type Collector = fn(&SaveScan) -> Value;

pub fn registry() -> Vec<(&'static str, Collector)> {
    vec![
        ("buildingCategories", buildings::collect_buildings),
        ("resourceNodes", world::collect_resource_nodes),
        ("collectables", world::collect_collectables),
        ("hardDrives", world::collect_hard_drives),
        ("droppedItems", world::collect_dropped_items),
        ("players", simple::collect_players),
        ("creatures", simple::collect_creatures),
        ("spawners", simple::collect_spawners),
        ("mapLimits", simple::collect_map_limits),
        ("hub", simple::collect_hub),
        ("gameSettings", simple::collect_game_settings),
        ("vehicles", simple::collect_vehicles),
        ("trains", trains_progression::collect_trains),
        ("dimensionalDepot", simple::collect_dimensional_depot_contents),
        ("progression", trains_progression::collect_progression),
        ("lines", lines::collect_lines),
        ("belts", lines::collect_belts),
        ("pipes", lines::collect_pipes),
        ("vehiclePaths", lines::collect_vehicle_paths),
    ]
}

/// _payloadSteps key order -- payload keys must appear in this order
/// regardless of which subset is requested.
pub const STEP_ORDER: [&str; 19] = [
    "buildingCategories",
    "resourceNodes",
    "collectables",
    "hardDrives",
    "players",
    "creatures",
    "spawners",
    "mapLimits",
    "vehicles",
    "trains",
    "droppedItems",
    "hub",
    "gameSettings",
    "dimensionalDepot",
    "progression",
    "lines",
    "belts",
    "pipes",
    "vehiclePaths",
];
