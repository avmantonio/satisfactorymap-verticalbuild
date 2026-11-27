# Regional viewer — required initial visual coverage

Status: finite acceptance target for ticket 60; recipes/models are **not delivered** by this document.
Authority: [global contract](viewer-integration-spec.md) and [visual strand](viewer-strand-visual-presentation.md). Research/refinement [61](../issues/61-free-form-geometry.md) remains OPEN.

## 1. Job, direction and honesty

Audience: a player inspecting a recently applied factory section before returning to the same editor. Mode: **Operate**. The scene should reveal floors, stacks, crossings and a few recognizable families, not sell a photorealistic or measured machine model. Use existing app chrome, shared category colors, native controls and concise readout; no new design system.

Original recipes below are the minimum committed kit to author during implementation. Their names do not mean that assets already exist. Numeric class dimensions/clearance establish only the classified volume. Original stylized recognition cues may sit within that volume but must remain labeled schematic; their chimneys, legs, housings or crossbars are not recovered ports or measured game geometry.

### Override order (mandatory)

1. Unknown scale or orientation → location marker with textual uncertainty, regardless of dimensions/recipe/path availability.
2. Usable static path with readable required transform → clipped linear trace even though it has no complete box size; styling is not a measured cross-section. Lift is not a path.
3. Unknown complete size for other occupants/unavailable paths → location marker with `size unknown`; a known plan axis may be described in text, never extruded into a solid. Do not draw a scaled recognition solid for it.
4. Named box + mapped recipe → original approximate grid-piece form. Named box without recipe → plain approximate box, labeled form coverage pending.
5. Clearance reserve + mapped cue → **neutral reserve outline remains visible**, with an original subdued recognition cue inside it. Label `reserve + schematic cue`; do not make the cue the new membership/size authority.
6. Clearance reserve without cue → neutral labeled reserve only, `form coverage pending`.

Use different structure as well as color: named boxes have solid/simple grid-piece edges; reserves are open neutral wire volumes; uncertain locations are screen-space cross/diamond markers with a question/uncertainty indicator. Markers are styled in screen pixels, not an invented metre volume. The persistent legend explains every class; uncertain/reserve summary counts are always available. No per-actor DOM label tree is required; no picking/tooltip feature is added to the MVP.

## 2. Exact minimum registry

Match **exact short class** after the final dot in the full source typePath. Never substring-match all future/modded classes to a known form. Type metadata and shared category authority remain independent of this recipe registry. Skin/Mk variants not explicitly listed below use honest fallback until added with a reference and review.

| Recipe id / family | Minimum exact classes | Representation to author | Evidence and acceptance |
| --- | --- | --- | --- |
| `grid-floor` / support | `Build_Foundation_8x1_01_C`, `Build_Foundation_8x2_01_C`, `Build_Foundation_8x4_01_C` | One slab from the extracted extent/offset; small original edge seams may aid reading, without changing its volume | Complete named dimensions and unfloored clearance centre. Stacked floors must remain separate at native Z; all three thicknesses differ, not a constant 4 m |
| `grid-ramp-reserve` / support | `Build_Ramp_8x4_01_C`, `Build_Ramp_8x4_Inverted_01_C` | Approximate grid-box with a clearly schematic diagonal edge cue; **not** a purported recovered wedge/surface | Complete named box establishes envelope, not exact slope/handedness. Read as ramp-family grid piece; label approximate box, exact surface pending |
| `wall-panel` / enclosure | `Build_Wall_8x4_01_C`, `Build_Wall_8x4_02_C` | Thin neutral reserve panel outline; original panel subdivisions as family cue, no invented doorway | Clearance gives complete reserve; Width/Height alone never establishes thickness. Shared Walls control hides it in 3D and remains off in 2D |
| `pillar-reserve` / support | `Build_PillarMiddle_C` | Native tilted reserve prism with original end-cap cue | Clearance reserve plus retained quaternion/scale. Tilted lightweight example must not flatten to yaw zero |
| `smelter-cue` / production | `Build_SmelterMk1_C` | Original furnace-like body plus one asymmetric chimney cue, subdued inside neutral reserve | Inspected table provides 5×10×4.5 m unfloored reserve, not machine parts. Visually distinguish furnace-like cue from constructor without relying only on color |
| `constructor-cue` / production | `Build_ConstructorMk1_C` | Original low base and open gantry/arm cue, no copied mesh/port layout | Inspected union reserve 8×10×6 m, centre retained. Recognizable gantry/work-machine family distinct from smelter; geometry is illustrative |
| `storage-cue` / logistics | `Build_StorageContainerMk1_C`, `Build_StorageContainerMk2_C` | Original ribbed box cue; Mk2 uses vertically repeated frame motif, not inferred internal shelves | Clearance reserves 5×11×4 m / 5×11×8 m remain origin-centred as published, **not floor-rewritten**. Container-like reading; neutral envelope visible |
| `power-pole-cue` / power | `Build_PowerPoleMk1_C` | Original slender mast and crossbar cue within neutral reserve | Reserve is 0.8×0.8×7.6 m with negative local lower Z. Do not floor/reinterpret it as a measured above-ground mast; no manufactured wire connection points |
| `static-path` / networks | Recognized belt, pipe, hypertube, rail, vehicle-path and cable type sets already owned by shared core data | Batched line/ribbon segments from admitted clipped XYZ; family styling from the same filter/category registry, no tubes/items | Source actors and their distinct exact full types are preserved. Verify vertical run, slope, crossing, separate fragments and contact point; tangents may exist but v1 drawing is linear |

These exact classes were inspected in the available generated docs table during authoring; no table output or mesh is copied into git. Existing corpus transform references include floor stacks, constructor stack, tilted `Build_PillarMiddle_C`, sloped Mk5 belt and vertical pipeline. The specific minimal smelter/storage/pole cases still require locating actual occurrences during 60/54; generated table presence alone is not a runtime scene pass. Use record-level deterministic fixtures to develop each recipe, then actual save-region visual review. If a corpus class is absent, record the gap and supply an additional legitimate fixture for that case rather than marking it reviewed.

## 3. Geometry recipe constraints

Recipes author normalized local coordinates within `[-0.5,+0.5]` for each known extent axis, then use the extracted centre/extent and native signed scale/quaternion. Distinctive illustrative proportions are original authoring choices documented in the recipe provenance, **not source measurements**. Keep cues within the reserve; do not shrink, move or replace its envelope to fit a familiar machine picture. Nonuniform/mirrored scale must affect the entire cue and envelope together. Batch by recipe/material/handedness as needed; no retained Object3D per occupant. Do not infer missing centre translations or actual ports from multiple origin-centred clearance boxes.

Reserve-only rows and unknown markers are first-class renderer batches, not exceptions dropped from counts. A marker may be rendered in a fixed pixel size; that does not establish physical extents. A path contact marker follows the same styling-only rule. Empty and all-hidden views retain Back, Reset and explanatory text.

## 4. Explicit provisional coverage / follow-up on 61

| Families not in minimum kit | MVP output | Open refinement on 61 |
| --- | --- | --- |
| Other production machines, generators, miners, stations, Space Elevator, Particle Accelerator | neutral reserve if complete clearance; otherwise location + uncertainty | class inventory and distinctive original cue/model, source support and misleading huge reserves |
| Other floors/roofs/quarter pipes/frames | approximate named box or labeled reserve per metadata, no guessed curved shell | exact-family forms, skin grouping, slope/curvature evidence |
| Beams/catwalks/walkways/pillars other than listed | reserve/approximate box as available; class-reserve-length label where needed | per-instance length/axis and recognizable original support form |
| Conveyor lifts, ladders, passthroughs, plan-only designer/vehicle classes | location + size uncertainty unless a separate complete supported volume exists | recover legitimate instance geometry, not MeshHeight-as-instance or a 1×1×4 m fallback |
| Unknown/modded placed buildables | location + uncertainty, or truthful supported reserve; Unknown shared category if unmapped | real modded fixture 59, data/geometry coverage inventory and explicit additions |

No row closes 61. This package closes **which representations the first implementation must deliver and how to judge them**, not a whole class census or model-research task. A delivered registry extension needs exact classes, size/honesty rule, reference, original provenance and regression case; it cannot redefine sizeKind.

## 5. Acceptance procedure

Automated contract (HEC-09): assert the exact registry above; for every recipe test uncertainty overrides and supported extent/offset/tilt/scale transforms. Unknown or unlisted classes must reach a labeled fallback. For each reserve cue verify the neutral envelope is still submitted and membership uses metadata rather than decorative vertices. Do not pixel-snapshot arbitrary internal meshes as the only protection.

Visual review (S-01 / ticket 54):

1. Build a documented comparison sheet with one case per minimum recipe, showing source class, native pose, sizeKind, known uncertainties and whether the case is synthetic or a real named save/region. No official meshes are shipped in the comparison kit.
2. At readable orbit scale a reviewer must distinguish floor stack, enclosure/support, furnace-like smelter, gantry-like constructor, storage container and power pole **without type text as the only clue**. Failed recognition for one committed cue is unfinished kit work, not a reason to invent dimensions or hide its reserve.
3. Compare floor separation, tilt, non-unit/mirrored scale, reserve offset, vertical run, slope and clipped crossings against save records/reference captures. The reserve bounds need not match the true shell; the distinction must stay visible.
4. Include size-unknown passthrough, unreadable-scale known class, an unlisted reserve class, one-vertex boundary contact, a region with no admitted records and a nonempty all-hidden scene. Readout must explain each without false precision.
5. Toggle walls/foundations, narrow/widen loaded Z, Reset camera and Back. Check legibility, keyboard/focus and narrow viewport reachability using existing chrome.

Record screenshots, source region coordinates, build revision and reviewer outcome for each committed recipe. A reference sheet written before integration is not a passed geometry check.
