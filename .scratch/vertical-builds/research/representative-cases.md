# Representative cases

Survey date: 2026-11-23. Ticket: [Representative cases](../issues/32-representative-cases.md).

## Gist

The three saves already in `map/uploads/` cover a stacked block, rotated and tilted parts, sloped lines, repeated modules, vanilla classes the sidebar calls Unknown, and a dense world. None of them is a modded save.

Checked files, sizes matching `tools/fetch_test_saves.py`:

| Save | Bytes | Session | Header |
| --- | --- | --- | --- |
| `map/uploads/All_080726-163150.sav` | 263,439 | All | save version 60, build 495413, creative, `isModdedSave` false |
| `map/uploads/solo_autosave_1.sav` | 15,068,544 | solo | same version and build, not creative, `isModdedSave` false |
| `map/uploads/BuildITBIIIIIG_210726-231135.sav` | 50,186,116 | BuildITBIIIIIG | same version and build, not creative, `isModdedSave` false |

`belt_item_state.sav` is named in that fetch script and was not on disk. Its comment says it gates equipment parked on a belt, not a mod class, so it was not fetched for this set.

Counts are a lean parse (`parse_full_save_lean`) on this checkout. Buildables are actor headers whose type path contains `/Buildable/` or `/Build_`, plus lightweight instances. An 8 m cell is an 800 cm bin. “Off-axis” means yaw more than 8° from a multiple of 90°. Tilt uses the payload rule `qx²+qy² > 0.001` in `rust_parser/core/src/mapdata/geometry.rs`. Spline rise is vertex z on `mSplineData` after the actor quaternion, the same samples the map payload keeps. Map pixels are `project_xy` (8192 px on `map_highres.png`). Leaflet reads them as `L.latLng(py, px)` (`map/static/map/map.js`).

No in-repo image is a shot of these coordinates. `.scratch/vertical-builds/assets/01-current-2d-map.png` is a capture of the current app with no save name. `02` and `04` are product concepts. `03` is out of scope. The visual check is the live 2D map and Height view.

## How to look

1. Serve the site (`py tools/serve_site.py`, `dist/` at `http://127.0.0.1:8791/`). Drop the `.sav` onto the page. Hard-refresh. Saves stay local.
2. After the map draws, center it from the console. `MapApp.map.setView([py, px], zoom)` uses latitude `py` and longitude `px`. Raise `zoom` until an 8 m cell (about 9 px) is readable. A 56 m window is about 60 px across.
3. Right-drag a rectangle on that spot. Height view opens: A–A′ on top, B–B′ below (`map/static/map/height_view.js`). Building marks use class `heightExtentM`. A missing table height is the 4 m dashed stand-in, not a measured shell.
4. A wrong axis: a wide sign, wall, or 8×4 foundation whose plan rect does not follow the row. A fake height: the cut collapses a multi-floor spread into one band, or draws the 4 m stand-in where the samples already span tens of meters. A broken path: a belt, pipe, rail, or hypertube whose cut is flat, or whose ends miss the machines, while the samples below differ in z.

## Cases

| Case | Save or region | What a spatial miss would look like | Visual reference | Gap |
| --- | --- | --- | --- | --- |
| Stacked buildings | `BuildITBIIIIIG_210726-231135.sav`, neighborhood map px x 449–475, y 5787–5822 (world cm about x −283600 to −281200, y −158000 to −154800). Several 8 m cells hold 59 buildables from z −17 m to 15 m. A sampled cell was 28 `Build_Pillar_Small_Frame`, 8 `Build_ConveyorLiftMk5`, 6 `Build_ConveyorBeltMk5`, plus power lines and beams. The same neighborhood has 60 `Build_ConstructorMk1` inside its best 56 m window. Quick load: `All_080726-163150.sav` at map px (2721, 1505), z 32–45 m: 5 `Build_ConveyorPoleStackable`, 5 `Build_ConveyorBeltMk6`, 1 `Build_Foundation_8x4_01`. | Cut marks share one altitude, or the 4 m dashed stand-in replaces a 13 m or 32 m spread. | `setView([5804, 466], zoom)` on the big save, or `setView([1505, 2721], zoom)` on All. Right-drag. A–A′ / B–B′ should separate poles, lifts, and pillars. No screenshot of this spot is in the repo. | None for a stacked block. Do not use the extreme bins below as a floor height. |
| Rotated structures | `BuildITBIIIIIG_210726-231135.sav` at map px (807, 4328), world cm (−250800, −21200). That 8 m cell has 162 off-axis actors from z −3 m to 111 m: very-wide signs (`Build_StandaloneWidgetSign_SmallVeryWide`), frame pillars, and concrete walls. Tilt check, same save, map px (1401, 3672): 49 tilted actors, mostly `Build_PillarMiddle`, plus polished ramps (`Build_Ramp_Polished_8x2`), z −17 m to 156 m. The save has 84,031 off-axis actors and 36,648 tilted actors. | Wide signs and walls sit on the cardinal axes, or a ramp is an axis-aligned rect instead of the flat hull the 2D map already stores. Yaw on a tilted point is stored as 0 (`geometry.rs`). | `setView([4328, 807], zoom)` and `setView([3672, 1401], zoom)`. On the plan, the very-wide signs should not all share one heading. The ramp hull should not be a plain yawed rectangle. | `All_080726-163150.sav` has 19 off-axis and 23 tilted actors and no 8 m cell with 4 of either. It is not this case. |
| Sloped lines | `solo_autosave_1.sav`: `Build_RailroadTrack` samples span z by 32 m over a 102 px run, map box (4725, 2145)–(4776, 2233). `BuildITBIIIIIG_210726-231135.sav`: `Build_ConveyorBeltMk5` spans 27.7 m over 51 px, box (7669, 5124)–(7670, 5175), almost due north on the plan. Solo has 236 such splines (rise ≥ 4 m and run ≥ 40 px); the big save has 1,961. | The cut line is flat, or a single chord ignores the rise between samples. Tangent z is not on the payload, so a curve that is only in the vertical tangent already cannot show up; these cases are vertex-z rises, which the cut can show as a straight blend. | `setView([2189, 4750], zoom)` on solo for the rail. `setView([5150, 7670], zoom)` on the big save for the belt. The Height-view line should climb by the rise above, not sit on one meter. | All’s only payload spline with a rise of at least 1 m is a Mk1 belt, 4.00 m over 20 px, box (2762, 1383)–(2768, 1396). Too short to be the slope case. Two-point chain elements with a rise of hundreds of meters near map px (3547, 4096) are not a drawn path. |
| Repeated modules | `solo_autosave_1.sav`: 452 `Build_PowerStorageMk1` in the best 56 m window, centered on map px (326, 5175). Same save: 30 `Build_ConstructorMk1` around map px (730, 5359). `All_080726-163150.sav`: 49 `Build_Foundation_8x4_01` around map px (2650, 1420). The big save’s constructor row is the stack neighborhood above. | Copies fall on one point, or every 8×4 pad / power-storage rect is rotated off the row. | `setView([5175, 326], zoom)` on solo. The plan should be a field of storage units, not one icon. Foundations on All should read as a pad of 8×4 rects. | None. |
| Unknown or modded classes | Unknown, present: sidebar category `"Unknown"` (`categories.rs`). `solo_autosave_1.sav` has 2,701 `Build_PipelineFlowIndicator`; 125 sit in the 56 m window at map px (4477, 6801). `BuildITBIIIIIG_210726-231135.sav` has 151 `BUILD_Potty_mk1` in the window at map px (5928, 2519), plus 600 `Build_VehiclePathNode_Default` and 337 `Build_SignPole_Medium` on the save. These are vanilla FactoryGame classes with no menu category. | The Unknown row is empty, the pins are missing, or a class with no clearance is drawn as an exact box. A miss on the flow indicators is also a wrong z along the pipe. | Filter to Unknown. `setView([6801, 4477], zoom)` on solo, or `setView([2519, 5928], zoom)` on the big save. Pins should still be there, without an invented shell. | Modded classes: no fetched save. All three headers have `isModdedSave` false, empty mod metadata, and no type path outside FactoryGame. Zero mod parse failures on the bodies this pass read. `belt_item_state.sav` was not on disk and would not fill this gap. Actor-header scale was unit on every buildable counted; lightweight scale is discarded before this count, so a scaling mod is not in the set either. |
| High density | `BuildITBIIIIIG_210726-231135.sav`: 762,512 headers (285,487 actors), 363,436 lightweight instances, 99,651 splines, 33,558 conveyor-chain actors. Densest 8 m cell: 198 buildables near map px (1489, 4441–4476), beside 30 `Build_OilRefinery` around (1497, 4441). Solo is the mid fixture: 264,320 headers and 72,805 lightweight instances. All is 2,995 headers. | Actors in that cell drop out, or the region fails to draw while a small save still looks fine. | Drop the big save and pan with `setView([4450, 1489], zoom)`. The refinery cluster should stay a crowd, not a handful of markers. This is the save docs call the large / ~600k-object fixture; the measured header count is 762,512. | None in the corpus. This pass did not open the browser, so draw time and wasm headroom were not re-measured. |

## Heights that are not a floor

These bins are real samples and a bad choice for “how tall is this building”:

- Solo, one 8 m cell near map px (4469, 6801): 93 actors from z −19 m to 726.5 m. The flow-indicator window above sits on that neighborhood. 726 m is not the height of one machine.
- Big save, map px (2730, 4310): 4 actors from z 154 m to 23,500 m.
- A hypertube on solo rises 65 m over about 1 px at (4024, 3930). One on the big save rises 69 m over 0 px at (1085, 4893). That is a vertical sample, not a slope you can see as a run.

A viewer that treats those maxima as a building height is showing a fake height. The stacked-building check is the −17..15 m pillar block and the 32..45 m pole stack.
