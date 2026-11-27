# Regional 3D extract

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [42 — Scene contract](../issues/42-scene-contract.md)
Scope: First regional read-only viewer contract.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

The scene needs a compact, truthful snapshot without expanding the standing 2D payload.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to receive the applied save's position, quaternion and scale, so that 3D preserves pose instead of guessing from map marks.

2. As a pioneer, I want to distinguish named sizes, reserves and unknowns, so that the apparent shell does not overstate precision.

3. As a pioneer, I want to rebuild a regional snapshot on each visit, so that edits applied between visits appear.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

The scene receives a separate regional 3D extract of save-native pose, honest sizeKind, and path-actor traces; the 2D payload is unchanged; expensive buffers wait on [Budget precheck](../issues/44-budget-precheck.md).

Position, orientation, and elevation come from the save. A missing dimension is not invented in silence. A real measure and an approximation are distinguishable in the data (`sizeKind`). Decided 2026-11-23; do not re-grill.

### Occupant pose

Each occupant record carries:

- `positionM` — header/lightweight position, centimeters / 100.
- `quat` — `[x, y, z, w]` from the save. Not 2D payload yaw. Not a flattened hull.
- `scale` — `[sx, sy, sz]` from the save when readable. Actor headers already keep scale. Lightweight instances: recover the three doubles still on the decompressed record (`record_off + 56`) when that record can be read. **Unknown scale** only if the record cannot be read — never assume unit scale for modified objects, never silently write `[1, 1, 1]`.
- Elevation is save Z in meters. Never Height-view `DEFAULT_HEIGHT_M`.

The parser keeps original coordinates. The wire may carry Float32 values **relative to the regional origin** so precision holds; that is a transport encoding, not a second pose.

### Honesty

- `sizeKind`: `named-box` | `clearance-reserve` | `unknown`.
- Optional `extentM` `[w, d, h]` meters when a known table size exists.
- Optional `volumeOffsetM` — actor-local meters from the actor origin to the known volume’s AABB center, derived from table min/max after box yaw, then transformed with the actor orientation. Omit when coincident. Do not invent dropped RelativeTransform translation. Do not reuse Height-view `floor_clearance_extent_m`.
- `named-box` is Docs W×D×H, not the mesh. `clearance-reserve` is a labeled approximation, not physical geometry ([Reserve volumes](../issues/50-reserve-volumes.md)). `unknown` is location plus uncertainty: no silent 4 m, no invented box.

### Paths

- World-meter XYZ vertices from the **path actor**.
- Optional 3D arrive/leave tangents, copied from that actor’s spline (`mSplineData` / `mSplinePoints`) when present. Missing tangents stay omitted — not zero-filled as if real, not reconstructed from chain-actor triples.
- Power cables are vertex chords (no spline tangents).
- Conveyor lifts are occupants, not traces.
- Initial render may approximate segments linearly. That is a draw allowance, not permission to invent arriveZ/leaveZ.

Who is clipped at the region edge is [Region occupants](../issues/43-region-occupants.md). How a ribbon looks is [Static networks](../issues/49-static-networks.md).

### Identity

- Normal actors: full `instanceName`.
- Lightweight: synthetic `LightweightBuildable:<typePath>:<idx>`, valid only inside the currently loaded save state. No stability promise across reconstructions.
- No pick events, no editor ops. Picking UX is [Scene picking](../issues/26-scene-picking.md) after [Viewer delivery](../issues/58-viewer-delivery.md).

### Transport

- The 3D contract is **separate** from the 2D payload. The extract does not add fields to, or rewrite, the standing 2D JSON.
- Built **on demand** from the current session store (`sav_wasm` and `sav_tauri`, same record/buffer shape).
- Compact numeric buffers plus a parallel identity/honesty table. Renderer-library-agnostic (not Three-specific). [Renderer probe](../issues/18-3d-scene-adapter.md) still stands for the later adapter; this ticket does not name a GPU object.
- [Budget precheck](../issues/44-budget-precheck.md) must precede expensive typed-buffer allocations. Count/estimate and refusal UI live on that ticket; this contract only forbids allocating those buffers before that gate says go.
- Enter/exit lifecycle is [Exclusive 3D mode](../issues/45-exclusive-3d-mode.md): enter builds from the current save, exit destroys, re-enter rebuilds including edits. No historical scenes.

### Not this ticket

- Membership of the region — [Region occupants](../issues/43-region-occupants.md).
- Budget numbers and refusal chrome — [Budget precheck](../issues/44-budget-precheck.md).
- Enter/exit affordance and leftover 2D delimitation — [Exclusive 3D mode](../issues/45-exclusive-3d-mode.md).
- Meshes / recognizable silhouettes — [Family silhouettes](../issues/48-family-silhouettes.md).
- How traces are drawn — [Static networks](../issues/49-static-networks.md).
- GPU teardown — [Scene teardown](../issues/53-scene-teardown.md).
- Picking, gizmos, edits.

### Acceptance

1. A 3D extract does not add quaternion, scale, tangent Z, `sizeKind`, or `volumeOffsetM` onto the 2D payload.
2. An occupant with `sizeKind: unknown` has no `extentM` and is not given Height-view `DEFAULT_HEIGHT_M` (4 m).
3. Unreadable lightweight scale is flagged unknown, not `[1, 1, 1]`.
4. A path actor with no spline tangents omits arrive/leave; zeros are not stored as if they were save tangents. Chain-actor triples are not a source.
5. `volumeOffsetM` is omitted when the known AABB center coincides with the actor origin; it is never an invented Docs translation or a Cut Z-floor rewrite.
6. `sav_wasm` and `sav_tauri` expose the same record/buffer shape.
7. Expensive typed pose/path buffers are not allocated before [Budget precheck](../issues/44-budget-precheck.md) says go.

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Exercise all seven Acceptance items on ticket 42 at the core extract/transport boundary.
- Include non-unit and unreadable lightweight scale, a nonzero local volume offset, absent dimensions, real versus absent tangents and full normal/synthetic identities.
- Compare the decoded WASM/native shape and ensure precheck runs before expensive scene-buffer allocation.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

The exact numeric buffer layout, offsets, validity representation, type/category linkage, origin metadata, API names and error/cancellation shape are integration definitions for the global spec. Preserve the fields and omissions below. In particular, the ticket does not define how unreadable scale affects conservative membership; make that limitation explicit instead of assuming unit scale.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

