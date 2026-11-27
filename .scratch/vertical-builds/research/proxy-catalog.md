# Proxy catalog: sizes, forms, fallbacks

Survey date: 2026-11-23. Ticket: [Proxy catalog](../issues/28-proxy-modeling.md).

This note classifies **what size a regional viewer may honestly use**. It does not pick a shipped proxy kit, a silhouette atlas, Three.js versus WebGL2, or a license. Those stay [Family silhouettes](../issues/48-family-silhouettes.md), [Asset supply](../issues/40-asset-supply.md), and [Renderer probe](../issues/18-3d-scene-adapter.md). Official meshes stay out ([Proxy catalog](../issues/28-proxy-modeling.md) Answer).

`game_data/generated/` is not unpacked in this checkout. Counts are from `buildings.json` inside `game_data.zip` (game-data-v3, 546 `Build_*` classes), read in memory. The extractor contract is [SCHEMA.md](../../../game_data/SCHEMA.md) and `extract_docs_json.py`. The map’s size lookup is `rust_parser/core/src/mapdata/geometry.rs`. Families are `categoryLabels.json` plus `categoryOverrides.json`.

The 4 m dashed mark in `height_view.js` is the Height-view Cut stand-in when `heightExtentM` is missing. It is not a physical size and it is not a row in this catalog ([Spatial data audit](spatial-data-audit.md)).

## Gist

A **reliable physical size** is a complete named `dimensions` box (Width × Depth × Height, centimeters). That exists for **227 / 546** classes, and they are almost all Foundation pads, ramps, quarter-pipes, plus a handful of frames and roofs. Production, power, storage, walls, and logistics *stations* do not publish that box: **274** classes have only `clearance`, which [Reserve volumes](../issues/50-reserve-volumes.md) already named a labeled reserve, not the true shell.

**Neither** a published box nor a reserve: **45** table classes (empty Docs size, adaptiveLength-only paths/lifts, Height-only poles, designers with Z dropped), plus curated-XY companions that are not in `buildings.json`, vehicles (plan only), and every stride-3 pin. Simple prisms are recognizable for pads, walls, pillars, beams, and for logistics *paths*. They are not recognizable for production machines, generators, or lifts. Mk skins share one form.

## How a size is looked up today

`geometry.rs` does not treat the three Docs buckets as equals.

1. **Plan XY.** Non-empty `clearance` → actor-frame union of every box (`boxes_xy_union`, `box_xy_ranges` applies a pure-yaw RelativeTransform). If `dimensions.Width` is larger than that union’s long axis, bump that axis (garage-door correction). Else `dimensions.Width` and `Depth`. Else hardcoded Elevator 8×8 m and FloodlightWall 0.6×0.3 m, then `categoryOverrides.json` `classFootprintsMeters`. Else substring `ConveyorLift` → 1×1 m. A miss is `renderType: "circle"` (`buildings.rs`).
2. **Height.** `height_extent_meters`: clearance Z union, rewritten to sit on the actor origin (`floor_clearance_extent_m`), then raised to `dimensions.Height` when that is taller. No clearance → `(0, Height)` if Height is non-zero. Else omitted; the Cut draws 4 m dashed.
3. **Adaptive beams.** `DefaultLength` and `MaxLength` both truthy plus clearance → instance `BeamLength` (or the default) × clearance cross-section. The 2D map already emits a plan hull. `BeamLength` itself is not a payload field ([Spatial data audit](spatial-data-audit.md)).
4. **Clearance translation is not stored** (`extract_docs_json.py` `parseClearanceBoxes`, SCHEMA). Multi-box classes (34, max 24 on the Particle Accelerator) are a **union AABB**, not stacked volumes.

Units: Docs.json centimeters; divide by 100 for meters (SCHEMA). Smelter Mk.1 fixture: 5×10 m plan, height 0…4.5 m (`geometry.rs` tests). Constructor Mk.1: 0…6 m. Packager: 0…12 m. Fuel Generator: underground leg dropped, chimney 11 m kept.

## Reliable physical size

**Complete named box:** 227 classes have non-zero Width, Depth, and Height. Every one of them also has clearance. None of the 24 Production classes do.

| Family / subcategory | Count | What the numbers are |
| --- | --- | --- |
| Foundation / Ramps | 75 | 8×8 m plan; Height 1 / 2 / 4 m variant |
| Foundation / Quarter Pipes | 60 | same 8×8×4 m (or 1/2/4) grid piece |
| Foundation / Inverted Ramps | 45 | same |
| Foundation / Floors | 30 | 8×8 × 1/2/4 m slabs |
| Organisation / Roofs | 12 | 8×8 × 1/2/4 m |
| Organisation / Frames | 5 | 8×8 plan; Height 0.4 / 1 / 4 m |

That named box is the **grid piece** the game exposes (`mWidth` / `mDepth` / `mHeight`). It is the only Docs field that is a straightforward physical size rather than a clearance volume (SCHEMA: “straightforward box dimensions”). It is still an approximation of the mesh: bevels, holes, and stairs are not in the numbers. An approximation must not be presented as an exact measure.

**Known disagreement with clearance (still use the geometry.rs volume, not a smaller named Height):**

- Double ramps / `Build_Ramp_8x8x8_C`: `dimensions.Height` 4 m, clearance Z span 8 m. `height_extent_meters` keeps 8 m.
- Garage doors: named Width 16 m is correct; clearance matches the smaller automated gate (SCHEMA). XY bump already runs.

**Instance length that is physically real, not a class box:**

- Beams: 8 classes with clearance plus `adaptiveLength.DefaultLength` / `MaxLength`. Length is per-instance `BeamLength`.
- Belts, pipes, hypertubes, railroad, vehicle paths, power lines: player-chosen length. The **path samples** are on the payload (Linear paths is a sibling). `MeshLength` / `MeshHeight` is one repeating segment (200 cm on Mk belts and lifts), not the actor.

**Not a reliable 3D size even when a number exists:**

- Conveyor pole, hypertube support, pipeline support: `dimensions.Height` 100 cm, no Width/Depth, no clearance, `adaptiveLength.Length` 0. The 1 m is a published height; the plan is unknown. 2D draws a circle.
- Blueprint Designers: extractor writes Width/Depth from `mDimensions` grid × 800 cm (32 / 40 / 48 m) and **drops grid Z** (`extractDimensions`). Plan only.
- Vehicle footprints in `consts.rs` (`VEHICLE_FOOTPRINTS_METERS_BY_TYPE_PATH`): 10 hardcoded plan sizes, no height.
- Curated `classFootprintsMeters`: 16 classes **absent from** `buildings.json` (HUB props, lift-mounted splitters, fence/railing ramps, railroad switch). Comment: measured from comparable clearance or the wiki. XY only, labeled approximation.

## Reserve volume only

**274 / 546** classes have non-empty `clearance` and do **not** have a complete named W×D×H. [Reserve volumes](../issues/50-reserve-volumes.md): a valid clearance is a labeled reserve, not the true shell.

This is every Production class (24), every Power generator and pole except the power-line actor, storage, signs, catwalks, walkways, pillars, doors, windows, walls, train stations, splitters/mergers, miners, portals, the HUB, the Space Elevator.

Walls (90): 78 have named Width+Height and no Depth; 12 have Height only. Thickness comes from clearance. Draw as a labeled reserve prism, not as “the wall mesh.”

Multi-box (34): Constructor Mk.1 is three origin-centered boxes (ports are not at the ports). Usable as the union AABB (8×10 m, 6 m tall). Not usable as a stacked silhouette without capturing translation.

Space Elevator: one clearance box spans z = 0…100000 cm (1 km). That reserve is not a recognizable form.

Alien Power: a box starts at z = −2000 cm. `floor_clearance_extent_m` drops a junk underground leg when the box is not centered.

## Neither

No complete named box and no clearance. Do not invent a size. Do not drop the object. Do not draw it as an exact solid.

### Empty Docs buckets (18)

`Build_Elevator_C`, `Build_ElevatorFloorStop_C`, `Build_FloodlightWall_C`, `Build_ConveyorPoleWall_C`, `Build_FoundationPassthrough_{Hypertube,Lift,Pipe}_C`, `Build_HyperTubeWallHole_C`, `Build_HyperTubeWallSupport_C`, `Build_PipeHyperStart_C`, `Build_PipelineSupportWall_C`, `Build_RailroadBlockSignal_C`, `Build_RailroadPathSignal_C`, and the five `Build_VehiclePath_*` classes.

Hardcoded / curated XY fills the **plan hole** for Elevator (8×8 m) and FloodlightWall (0.6×0.3 m) only. Height is still missing. Vehicle-path classes are line-rendered (`consts.rs` `VEHICLE_PATH_SEGMENTS`): they are paths, not building volumes. Hypertube entrance is both a spline (when `mSplineData` is present) and a powered building; without a table size it is a point plus uncertainty.

### AdaptiveLength only (20)

Six conveyor belts, six conveyor lifts, four pipeline classes, `Build_PipeHyper_C`, `Build_RailroadTrack_C`, `Build_PowerLine_C`, `Build_XmassLightsLine_C`.

Belts / pipes / hypertube / track / wires: **draw the payload path**. That is not a class volume. Lifts are **excluded** from belt line buckets (`conveyor_belt_only_type_paths`). Map fallback 1×1 m is an invented plan. Instance height is on unused `mSplineData`. Treat a lift as location + uncertainty until a later payload collects that spline. Do not present 1×1×4 m as the lift.

### Height-only poles (3) and ladder (1)

1 m Height, no plan (poles). Ladder: Width 80 cm + `MeshHeight` 200 cm (segment, not instance). Location + uncertainty for the missing axes.

### Not in `buildings.json`

The 16 `classFootprintsMeters` companions (plan approximation, no Z). Hidden classes (`BUILD_Potty_mk1_C`, sign poles, vehicle path nodes, pipeline flow indicator, elevator cabin) are dropped from the payload today. Players, HUB pin extras, resources, collectables: stride 3, no size. A mod class whose header was collected still has a point; its size is unknown ([Representative cases](../issues/32-representative-cases.md) still has no modded save).

## Simple forms — which families read

[Family silhouettes](../issues/48-family-silhouettes.md) already decided buildings are simplified silhouettes a person can recognize, and that recognizable does not mean the game mesh. This catalog only says **which families a box, a thin prism, or a polyline already reads as**, without authoring those silhouettes.

| Family | Simple form enough? | Why |
| --- | --- | --- |
| Foundation (floors, ramps, inverted, quarter pipes) | **Yes** | The piece is the published 8×8 × 1/2/4 m box. Skins share one prism. A ramp AABB is not a wedge, but the family still reads as pads. |
| Walls / windows / doors | **Yes, as a family** | Thin reserve prism. Doors are the same family-level slab; garage Width is the named 16 m, not the stale clearance. |
| Pillars, frames, catwalks, walkways | **Yes** | Vertical or deck prisms from clearance. |
| Beams | **Yes** | Elongated prism along instance length. Cross-section is still a reserve. |
| Logistics paths (belts, pipes, rails, hypertubes, wires) | **Yes, as lines** | The polyline is the form. Thickness is not in the tables. |
| Storage | **Partial** | Industrial box occupancy reads; tank vs container vs shelf does not. |
| Power poles | **Partial** | A thin vertical reads as a pole; a cube at the point does not. Height from clearance, not a named box. |
| Production (manufacturers, smelters, miners, oil, workstations) | **No, only occupancy** | 24/24 clearance-only. Constructor 8×10×6, Smelter 5×10×4.5, Packager 12 m tall are distinctive *proportions*, not recognizable machines. Mk variants share one reserve. Telling production from power from storage is [Family silhouettes](../issues/48-family-silhouettes.md). |
| Generators, miners, Space Elevator, Particle Accelerator | **No** | Chimneys, 1 km box, 24 origin-centered boxes. Reserve AABB is occupancy. |
| Conveyor lifts, elevator, unknown / hidden / pins | **No** | Neither a size nor a form. |

## Minimum catalog (representation classes, not a kit)

Six tokens. This is a lookup, not a mesh library. Do not ship Coffee Stain art. Do not treat the Height-view 4 m dashed as a catalog solid.

| Token | When | What to draw | Honesty |
| --- | --- | --- | --- |
| `published-box` | Non-zero Width, Depth, and Height | Prism from the named box, yaw from the payload. Volume height still follows `height_extent_meters` (clearance-first, Height bump). | Approximate grid piece. Not an exact measure. Not a mesh. |
| `reserve-aabb` | Non-empty clearance, incomplete named box | Clearance XY union × floored Z extent. Label as a reserve. | Not the true shell ([Reserve volumes](../issues/50-reserve-volumes.md)). |
| `path` | Line-rendered belts, pipes, hypertubes, tracks, vehicle paths, power lines | Payload polyline (stride 7 or 3). | Samples are real; thickness and tangent Z are not. |
| `adaptive-prism` | Beam specs (DefaultLength + MaxLength + clearance) | Instance length × clearance cross-section. | Length is instance; section is a reserve. |
| `plan-rect` | XY from named Width/Depth, curated pair, or vehicle table; no usable Z | Horizontal rectangle at actor z. | Z unknown. Do not extrude. |
| `point-uncertain` | No dimensions | Location mark plus visible uncertainty. | Do not invent a size. Do not drop. Do not draw an exact solid. |

Mk.1–Mk.6 belts and lifts share one token. Foundation skins share `published-box`. Production machines share `reserve-aabb` until Family silhouettes assigns a lookalike.

## Fallback rules

Honor the existing Answer and [Reserve volumes](../issues/50-reserve-volumes.md).

1. A valid `clearance` → `reserve-aabb`, labeled as an approximation, never as the exact shell.
2. A complete named W×D×H → `published-box`. Still approximate. If clearance Z is taller (double ramps) or named Width is wider (garage doors), the volume follows `geometry.rs`, not the smaller field.
3. No dimensions (no complete box and no clearance) → `point-uncertain`. Do not invent a size. Do not drop the object. Do not draw it as an exact solid.
4. Plan XY without Z (designers, curated companions, vehicles, Elevator / FloodlightWall hardcoded XY) → `plan-rect` plus uncertainty in Z. Do **not** promote the Cut’s 4 m dashed placeholder into a 3D solid.
5. AdaptiveLength-only belts/pipes/rails/wires → `path`. `MeshLength` is not the actor.
6. Conveyor lifts → `point-uncertain` for height. The 1×1 m substring fallback is an invented plan; do not present 1×1×4 m as the lift.
7. Height-only poles / ladder segment → location + the one published axis; remaining axes uncertain.
8. Multi-box clearance → union AABB only. Do not stack origin-centered extra boxes as ports or chimneys.
9. Hidden classes are absent from today’s payload. If a later viewer shows them, they are `point-uncertain`, not solids.
10. Unknown / mod class with a collected header → location + uncertainty. There is still no modded save in the corpus.
11. Official meshes, menu icons, and SCIM traced polygons stay out of this catalog.

## Uncertainties

- Counts are from `game_data.zip` on this machine, not from an unpacked `generated/` tree. SCHEMA and `geometry.rs` are the contract if the zip and the extractors drift.
- Designer grid Z is in Docs.json `mDimensions` and is dropped by the extractor. Restoring 32 / 40 / 48 m would be a table change, not a guess in the viewer.
- Conveyor-lift travel is on the save spline and is not collected ([Spatial data audit](spatial-data-audit.md)).
- Actor scale is dropped. A scaled instance would still get the class box.
- This catalog does not choose which family gets a later silhouette, or which primitives a renderer instances.
