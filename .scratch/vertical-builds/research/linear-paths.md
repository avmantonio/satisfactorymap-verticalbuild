# Linear paths: save geometry vs static drawing

Survey date: 2026-11-23. Ticket: [Linear paths](../issues/36-linear-paths.md).

Directive on that ticket (do not re-grill): belts, pipes, and connections are static geometry. No animated item flow and no production simulation. How a path is clipped at the region edge is [Region occupants](../issues/43-region-occupants.md) — this note only says whether the samples support a clip.

Inputs: [Spatial data audit](spatial-data-audit.md), [Representative cases](representative-cases.md), [Cut laterals](cut-laterals.md). This checkout has no `game_data/generated/` and no `map/uploads/*.sav`; spline counts and slope regions below are from those notes, not a re-parse.

This note does not pick a renderer, a proxy kit, or a region budget. It does not propose item motion.

## Gist

The save already stores, per path actor, enough samples to draw a **static 3D trace** that rises, falls, and crosses a region. Belts, pipes, hypertubes, rails, and vehicle paths ship as stride-7 polylines: map-pixel XY, XY Hermite tangents, vertex z in meters. Power cables ship as stride-3 straight chords through the same (px, py, z). Rise and fall that live on those vertices are drawable today. Vertical curvature *between* vertices is not: `spline_polylines` rotates the full 3-vector tangent then keeps only XY (`extract.rs` 377–382). Conveyor-chain actors hold a second world-space copy of each belt’s `[location, arriveTangent, leaveTangent]` triples, including tangent Z; the map never ships them. Conveyor lifts are the main missing trace: they are belt-family actors whose `mSplineData` is not collected. Draw each collected polyline as a static ribbon or tube in world meters, family color, constant schematic width, XY cubic Hermite plus linear Z. Do not animate items along it.

## What the save has

Actor-local spline points are structs with `Location`, `ArriveTangent`, and `LeaveTangent` (`extract.rs` 333–341). `vector_prop` returns all three components (`extract.rs` 293–297). The collector rotates each by the actor quaternion, adds the header position, and converts world Z to meters (`extract.rs` 361–382). Scale is not applied. A spline with fewer than two points is omitted (`extract.rs` 358–359). If the named spline property is absent, `mTopTransform.Translation` becomes a two-point chord (`extract.rs` 346–354) — only for type paths passed into `spline_polylines`.

A 1.0 conveyor chain is a hidden `FGConveyorChainActor` (`object.rs` 66–70). Per member belt it stores contiguous 72-byte records: three world-space `f64` triples (`store.rs` 243–250, `object.rs` 413–423). The editor names those triples `[location, arriveTangent, leaveTangent]` and patches location XYZ plus tangent XY on move (`editor/apply.rs` 580–596). Item slots on that actor are inventory, not geometry (`docs/chained-belt-delete.md`).

Power cables are `Build_PowerLine` and Christmas `Build_XmassLightsLine` (`game_data/curated/typePaths.json` 31–34). Trailing data is source and target object refs (`object.rs` 263–266). Drawing positions are cached `mWireInstances` `Locations` vectors, absolute world centimeters (`lines.rs` 136–195, `editor/apply.rs` 473–476). There is no spline and no sag field.

## What the payload ships and drops

Line buckets (`lines.rs`, `filters.js` 405–415, `map.js` 20–26):

| Family | Collector | Save property | Payload stride | Vertex |
| --- | --- | --- | --- | --- |
| Belts Mk1–Mk6 | `collect_belts` | `mSplineData` | 7 | `[px, py, arriveX, arriveY, leaveX, leaveY, zMeters]` |
| Pipes Mk1–Mk2 (and NoIndicator) | `collect_pipes` | `mSplineData` | 7 | same |
| Hypertubes + entrance tube | `collect_lines` `hypertubes` | `mSplineData` | 7 | same |
| Railroad track + integrated | `collect_lines` `railroads` | `mSplineData` | 7 | same |
| Vehicle paths (5 classes) | `collect_vehicle_paths` | `mSplinePoints` | 7 | same |
| Power cables | `collect_power_lines` | `mWireInstances` `Locations` + actor | 3 | `[px, py, zMeters]` |

`jnum` rounds to two decimals (`jsonval.rs` 7–16). `slim_payload_value` deletes `worldPositions` (`mapdata/mod.rs` 215–224). Tangents are `project_vector_xy` of the rotated XY only (`extract.rs` 273–275, 377–380; `geometry.rs` 65–68). Arrive/leave **Z is dropped**. Chain triples are not a payload field.

The 2D map already turns stride 7 into a cubic Bezier in the plan (`map.js` 1309–1316, 1471–1483; `webgl_layer.js` 458–471, 1584–1613): control point 1 = `P0 + leave/3`, control point 2 = `P1 - arrive/3`. Height view states the payload has no Z tangent, so Z between vertices is linear (`height_view.js` 171–173). That is the same interpolation a static 3D ribbon would use unless tangent Z is shipped.

Belt type paths come from curated `conveyorBelts` minus any path containing `ConveyorLift` (`consts.rs` 109–120). Pipe classes are the four hardcoded Mk1/Mk2 paths (`consts.rs` 10–15). There is no Mk3 pipeline class in this collector.

## Per family

### Belts

Save: `mSplineData` on the belt actor; chain actor holds a parallel world-space spline plus the item ring. Payload: stride-7 groups by mark (`lines.rs` 235–237). The 1.0 corpus still has belt polylines: [Representative cases](representative-cases.md) counted 99,651 splines and 33,558 chain actors on `BuildITBIIIIIG_210726`, and a Mk5 belt whose samples rise 27.7 m. Chain triples are therefore a second copy, not the only copy. They recover tangent Z for **chained belts only**. They are not a pipe, rail, hypertube, or cable source.

Lifts stay in `typePaths.json` `conveyorBelts` (rows 9–14) but are excluded from line buckets (`consts.rs` 116–117). The 2D map draws them as building boxes (`filters.js` 726–732, `bottleneck.js` 99–105). [Cut laterals](cut-laterals.md) records that lift actors still have `mSplineData` and that this payload does not collect it. Table height is missing (1×1 m plan fallback, 4 m dashed Cut). A vertical belt run is the main trace the current buckets cannot draw as a path.

### Pipes

Four `mSplineData` classes, same stride 7 (`consts.rs` 10–15, `lines.rs` 240–241). Junctions, pumps, supports, and wall holes are buildings, not polylines (`readableNameCorrections.json` 297–305). Flow indicators are `hiddenClasses` and never leave the payload (`categoryOverrides.json` 50–59). They are not a second pipe trace.

### Cables (power lines)

“Cable” the item is inventory. The traces are power-line actors. Stride 3: first `Locations` point, then the actor, then each further endpoint (`lines.rs` 168–189). Rise/fall is the straight 3D chord between those points. No tangent to drop. Source/target refs exist on the actor but are not needed to draw the wire. Mod cable classes (`object.rs` 93–95) are not in curated `powerLine` and are a [Modded save](../issues/59-modded-save.md) gap.

### Hypertubes

`Build_PipeHyper` and `Build_PipeHyperStart` (`consts.rs` 22–25). Same stride 7 when `mSplineData` is present. The entrance is also a powered machine: a default cooked spline serializes **no** `mSplineData`, so the line collector emits nothing and the building bucket must keep the entrance (`consts.rs` 27–35). Supports are buildings. Extreme near-vertical samples exist in the corpus (65–69 m over ~0–1 px, [Representative cases](representative-cases.md)); those are vertex-z rises, drawable, not a slope you read as run.

### Rails

`Build_RailroadTrack` and `Build_RailroadTrackIntegrated` (`consts.rs` 17–20). Same stride 7. Solo’s slope case is a track spanning 32 m over a 102 px run. Switches are buildings (`Build_RailroadSwitchControl_C` in `classCategories`). Train cars are posed points; the track polyline is the route (`spatial-data-audit.md` vehicle/train row). Do not derive one from the other.

### Vehicle paths

Five `mSplinePoints` classes (`consts.rs` 37–43, `lines.rs` 244–245). Same stride 7. Path nodes (`Build_VehiclePathNode_*`) are `hiddenClasses` (`categoryOverrides.json` 52–53). The vehicle actor is a separate stride-4 pose with a curated plan and no height (`consts.rs` 69–80). Draw the recorded path as a static line; place the vehicle at its pose. There is no distance-along-path field.

## Fidelity check: rise, fall, cross

**Enough for a static 3D trace of collected paths.** Every shipped vertex already has projected XY and z meters. World XY comes back from `mapPxToWorldXY` (`editor.js` 14–30), the inverse of `project_xy` (`geometry.rs` 49–54). Vertex z is already meters. That places the sample in 3D.

**Rise and fall that are stored as vertex z:** drawable on the current payload. Height view already interpolates Z along the chord (`height_view.js` 171–173, 332–369) and the slope cases in [Representative cases](representative-cases.md) are exactly that (rail 32 m, Mk5 belt 27.7 m). A 3D ribbon using XY Hermite + linear Z would show those climbs. A curve whose *only* vertical shape is the dropped tangent Z between two samples cannot appear until arrive/leave Z is shipped.

**Cross a region:** the geometry is a polyline of samples plus interpolable segments. Height view already clips chords to an XY rectangle and a Z band (`height_view.js` 376–418) without splitting the actor in the save. That is enough for a *visual* clip. Whether the region takes the whole actor, a clipped draw, or both is [Region occupants](../issues/43-region-occupants.md). This ticket does not decide it. Relocate still forbids geometric split ([Volume occupancy](../issues/12-volume-occupancy.md)).

**Not enough, without a payload change:**

- Tangent Z (all stride-7 families).
- Chain-actor triples (belt-only second copy, including tangent Z).
- Conveyor-lift travel as a polyline (save likely has `mSplineData`; payload drops the whole path).
- Hypertube entrance with default (absent) `mSplineData`.
- Power-line sag: the save does not store it.
- Actor scale on the spline (header scale exists; extract ignores it).
- Ports / component frames (`ComponentHeader` has no transform, `store.rs` 36–42).

**Not traces:** junctions, pumps, poles, splitters, flow indicators, path nodes, vehicle/train pose, item-on-belt offset. Those are buildings, hidden clutter, or inventory.

## Static drawing strategy

One static 3D ribbon (or thin tube) per collected path actor. Family color from the existing line buckets (`filters.js` 169–176). Constant schematic width per family — not a Coffee Stain mesh, not an animated texture. No items sliding on the curve. No production simulation.

1. **Reuse the payload samples.** Invert px/py, keep z meters. Do not wait on chain triples or a second parse of the decompressed body for the first viewer.
2. **Evaluate the curve the 2D map already knows.** Stride 7: cubic Hermite in XY with the Bezier identity in `map.js` 1312–1314; lerp Z between the two vertices (Height view’s rule). Flatten to a short 3D polyline the same way `webgl_layer.js` `_spanSegments` already flattens the plan curve. Stride 3: the shipped points are the segment.
3. **Read height from vertex z, not from a building clearance.** A belt has no `heightExtentM`. Crossings read because two traces occupy 3D, not because they are projected onto the map.
4. **Leave lifts as boxes** until a collector emits their spline (or min/max vertex z). Do not invent a 4 m tower. Do not treat chain triples as a lift path.
5. **Keep chain triples off the drawing path** while `mSplineData` is present. If a later payload diet wants cheaper belt curves, those world-space triples are the belt-only alternative and already include tangent Z. Prefer adding arrive/leave Z next to the existing stride-7 extract if vertical curvature between samples matters for every family.
6. **Clip in the viewer, not in the save.** Sample the static curve against the region box; [Region occupants](../issues/43-region-occupants.md) owns who is in the set. Do not synthesize chain actors or split belts.
7. **Do not attach vehicles or trains to a distance along the path.** Pose from the actor point; route from the polyline.

Renderer choice stays [Renderer probe](../issues/18-3d-scene-adapter.md). Silhouette kit stays [Proxy catalog](../issues/28-proxy-modeling.md). Cost of the ribbons stays [Cost probe](../issues/25-scene-budget.md).

## Boundary

[Region occupants](../issues/43-region-occupants.md) — visual inventory of a delimited area, including paths that cross the border. This note only establishes that samples and linear-Z chords can be clipped.

[Static networks](../issues/49-static-networks.md) — later grill of *how* height and crossings read in 3D. It waits on this fidelity check.

## Uncertainties

- This pass did not open a lift actor. [Cut laterals](cut-laterals.md) is the source for “lifts still have `mSplineData`.” [Spatial data audit](spatial-data-audit.md) still notes that the property that holds lift travel was not confirmed here.
- Whether any 1.0 belt lacks `mSplineData` and would need chain triples to draw was not re-checked against a save on disk. The payload already draws sloped Mk5 belts on the big 1.0 fixture, so the drawn set is not chain-only.
- Hypertube / rail “zero-run, huge rise” samples are real vertex z. A viewer that treats the polyline AABB as a building height is showing a fake height ([Representative cases](representative-cases.md)).
- `game_data/generated/` is absent, so pipe/hypertube class coverage beyond the hardcoded lists was not counted.
