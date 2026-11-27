# Transform proof — exception list

Ticket: [Transform proof](../issues/35-transform-proof.md).
Samples: [transform-samples.json](transform-samples.json) dumped from `All_080726-163150.sav`, `solo_autosave_1.sav`, and `BuildITBIIIIIG_210726-231135.sav` (no re-parse after this file landed).
Prototype: [transform-proof.html](transform-proof.html).

Directive kept: position, orientation, and elevation come from the save. A class with no trustworthy Z or rotation is reported, not drawn as if it were exact. This list does not invent a number to fill a hole.

## Verdict on conversion

On every captured pose, X/Y/Z convert with the `geometry.rs` / `editor.js` constants **without an inverted axis or a unit error**.

| Check | Observed on dump | Counterfactual (wrong conversion) |
| --- | --- | --- |
| Invert map pixels → world cm | max error **0.58 cm** (2-decimal `jnum` rounding, ~1 cm per 0.01 px) | Forgot Leaflet Y-flip: **42–494 km**. Swapped X/Y: **105–470 km**. |
| Z cm → meters (`/ 100`) | max error **0.18 cm** | Treat payload z as centimeters: **297–14 157 m** off. |
| Yaw from quaternion vs payload yaw | match within 0.01 rad on untilted rects | — |
| Elevation of the actor origin | payload `zM` is save Z / 100 | Using 4 m, or a cell max, as that origin is an invented elevation. |

So the 2D payload is enough to **place a point** (invert pixels, read z meters) and to **yaw a flat heading** when tilt is below threshold. It is not enough to rebuild tilt, scale, or a vertical Hermite.

## 1. Inverted axes — none in the captured set

Correct projection is `project_xy` then Leaflet `lat=py, lng=px`, with map Y flipped. The inverse is `mapPxToWorldXY` in `editor.js`.

Wrong-axis recipes fail loudly on the same samples (see prototype counterfactuals). No captured pose needs a swapped or unflipped axis to round-trip.

## 2. Unit errors — none in the captured set

World XY and Z on the save are centimeters. Payload XY is map pixels; payload z is meters. Mixing those units is the 100× / 22.887× class of bug the counterfactuals show. Round-trip residuals stay sub-centimeter after 2-decimal payload rounding.

## 3. Invented elevations — do not fill these holes

Actor **origin z** is trustworthy on every captured pose. What is *not* a height:

| Hole | What the dump shows | What not to draw |
| --- | --- | --- |
| Missing `heightExtentM` | `Build_FoundationPassthrough_Pipe_C` (20 poses, z −3…102.5 m): table has no Z. | Do not substitute the Height-view **4 m dashed** stand-in as a measured shell. Report **size unknown**. The point still has save z. |
| Missing plan footprint | `Build_ConveyorPole_C` (5 poses): `renderType: circle`, `footprintPixels` null; table height `[0, 1]` m is a reserve, not a mesh. | Place the point. Do not invent an XY box. |
| Cell max ≠ building height | `not-a-floor-solo` samples span **−3…102.5 m**. Closed research on the same neighborhood also saw a **726.5 m** bin; this dump’s first 10 poses did not include that actor. | Neither 102.5 m nor 726 m is the height of a passthrough or a flow indicator. Do not set a proxy height from the bin. |
| Class clearance 4 m | `Build_PillarMiddle_C` ships `heightExtentM: [0, 4]` from the **class table**. | That 4 m is a labeled reserve (Reserve volumes), not the Height-view stand-in, and not permission to treat tilt as an exact box. |
| Stack spread | Poles 34–42 m; constructors −10 / −2 / 6 / 14 m. | Collapsing a stack onto one band, or replacing the spread with 4 m, is an invented elevation. |

## 4. Tilt — payload drops the quaternion

Rule in `geometry.rs`: if `qx²+qy² > 0.001` and a footprint exists, payload stores **yaw 0** and a **flat pixel hull**. Pitch/roll are not numbers on the payload.

| Class | Dump | Trust |
| --- | --- | --- |
| `Build_PillarMiddle_C` | 10/10 in `tilted-ramps-big`. Example quat `[-0.4617, 0.887, 0, 0]`, `tiltIntensity: 1`, save yaw **−2.18 rad**, payload yaw **0**, hull 6 verts, lightweight **scale dropped**. | **tilt-dropped**. Report the class. Do not draw the hull as an exact 3D box. Origin z (107–143 m) is still from the save. |
| `Build_PowerPoleWall_C` | 6/8 tilted in the rotation / potty windows. | Same: yaw 0 + hull when tilt fires; untilted siblings keep payload yaw (e.g. **2.79 rad**). |
| `Build_PowerPoleWallDouble_C` | 2/5 tilted; the other three keep off-axis yaw (**−0.35 rad**). | Split: yaw trustworthy only when `yawForcedZero` is false. |

Scale is absent on every lightweight sample in this dump (`scaleDropped: true`). Do not rebuild a scaled box from the buckets.

## 5. Point-to-point paths — vertex z kept, tangent Z dropped

Stride 7 is `[px, py, arriveX, arriveY, leaveX, leaveY, zMeters]`. Arrive/leave **Z after the actor quaternion is never shipped**. Vertical curvature between samples is a **straight blend of vertex z**, not a 3D Hermite. Conveyor-chain 72-byte world triples are not this path.

| Class | Dump | Exception |
| --- | --- | --- |
| `Build_ConveyorBeltMk5_C` | `sloped-belt-big`: 4 vertices, z **55.65 → 83.33 m** (~27.7 m climb, due north). Tangent world Z happens to be **0** on these samples, so the dropped field would have been zero anyway. | Vertex z is enough to see the slope as a linear blend. Do not pretend a vertical Hermite. Chain triples stay unsipped. |
| `Build_PipelineMK2_C` | `unknown-flow-solo`: 7 vertices, z **−4.75 → −15.25 m**. Arrive/leave world Z is **nonzero** (e.g. `[0, 0, −1]`, `[0, 0, −10]`, `[0, 0, −425.79]`). Payload XY tangents collapse to ~0 because the tangent is vertical. | **Tangent Z dropped.** Drawing only XY Hermite makes a vertical run look like a point. Report the class of drop; do not invent arriveZ/leaveZ on the payload. |
| `Build_ConveyorBeltMk6_C` | Flat 43 m / 45 m two-point segments next to the pole stack. | Same field drop; this instance has no vertical tangent to lose. |
| `Build_RailroadTrack` | `sloped-rail-solo` captured **0 paths**. Actor origin did not fall in the tight pixel box; this pass did not re-parse to hunt spline vertices. | **Sampling gap in this dump**, not a conversion failure. Slope-with-vertex-z is already shown on the Mk5 belt. Closed research still names that rail as a 32 m rise; this list does not invent those samples. |

Power lines (not in this dump’s path set) have no tangents at all — straight vertex segments only.

Conveyor lifts stay buildings, not belt paths.

## 6. Classes with no trustworthy rotation or size

Z of the **point** is trustworthy wherever a collector emitted the actor.

| Class | Rotation | Size / shell | Draw |
| --- | --- | --- | --- |
| `Build_PillarMiddle_C` (tilted lightweight) | **Not** trustworthy from payload yaw (forced 0). Quaternion is on the save, dropped. | Class clearance `[0, 4]` m + plan hull. | Report **tilt-dropped**. Point at save z. |
| `Build_PowerPoleWall_C` / `Build_PowerPoleWallDouble_C` when `yawForcedZero` | Same tilt drop. | Class clearance present. | Report tilt; untilted instances in the same cell keep yaw. |
| `Build_FoundationPassthrough_Pipe_C` | Yaw present (1.57). | **No** footprint, **no** `heightExtentM`. Category Logistics, not a named menu row people expect. | Point + **size unknown**. Not an exact box, not 4 m. |
| `Build_ConveyorPole_C` | Yaw present. | No plan footprint (circle); height reserve `[0, 1]` m. | Point; XY unknown. |
| Very-wide signs / `Build_PipelineFlowIndicator` / `BUILD_Potty_mk1` | Not in this dump’s first-10 fill of those boxes. | — | Do not invent poses. Rotation proof uses wall poles at the sign cell (yaw 2.79 / −0.35). Unknown-class proof uses passthroughs in the flow-indicator cell. |

Players, resources, and path vertices (stride 3) have no yaw slot — not sampled here; treat as **rotation unknown** if a later viewer places them.

Modded classes: none in this corpus (`isModdedSave` false). Still a gap on [Modded save](../issues/59-modded-save.md).

## 7. What this proof is not

Not a product camera. Not family silhouettes. Not a region policy. Not a Three.js vs WebGL2 pick. Shapes may be approximate later; holes stay labeled.
