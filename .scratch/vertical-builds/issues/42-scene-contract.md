# Scene contract
Level: theme
Kind: ticket
Parent: 70
Status: resolved


## Question

Which fields does the scene receive so one region reproduces position, rotation, paths, and the difference between a real measure and an approximation?

Acceptance so far: a region comes back without inventing elevation from the Height view boxes. This ticket names the fields, not the meshes.

## Answer

The scene receives a separate regional 3D extract of save-native pose, honest sizeKind, and path-actor traces; the 2D payload is unchanged; expensive buffers wait on [Budget precheck](44-budget-precheck.md).

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
- `named-box` is Docs W×D×H, not the mesh. `clearance-reserve` is a labeled approximation, not physical geometry ([Reserve volumes](50-reserve-volumes.md)). `unknown` is location plus uncertainty: no silent 4 m, no invented box.

### Paths

- World-meter XYZ vertices from the **path actor**.
- Optional 3D arrive/leave tangents, copied from that actor’s spline (`mSplineData` / `mSplinePoints`) when present. Missing tangents stay omitted — not zero-filled as if real, not reconstructed from chain-actor triples.
- Power cables are vertex chords (no spline tangents).
- Conveyor lifts are occupants, not traces.
- Initial render may approximate segments linearly. That is a draw allowance, not permission to invent arriveZ/leaveZ.

Who is clipped at the region edge is [Region occupants](43-region-occupants.md). How a ribbon looks is [Static networks](49-static-networks.md).

### Identity

- Normal actors: full `instanceName`.
- Lightweight: synthetic `LightweightBuildable:<typePath>:<idx>`, valid only inside the currently loaded save state. No stability promise across reconstructions.
- No pick events, no editor ops. Picking UX is [Scene picking](26-scene-picking.md) after [Viewer delivery](58-viewer-delivery.md).

### Transport

- The 3D contract is **separate** from the 2D payload. The extract does not add fields to, or rewrite, the standing 2D JSON.
- Built **on demand** from the current session store (`sav_wasm` and `sav_tauri`, same record/buffer shape).
- Compact numeric buffers plus a parallel identity/honesty table. Renderer-library-agnostic (not Three-specific). [Renderer probe](18-3d-scene-adapter.md) still stands for the later adapter; this ticket does not name a GPU object.
- [Budget precheck](44-budget-precheck.md) must precede expensive typed-buffer allocations. Count/estimate and refusal UI live on that ticket; this contract only forbids allocating those buffers before that gate says go.
- Enter/exit lifecycle is [Exclusive 3D mode](45-exclusive-3d-mode.md): enter builds from the current save, exit destroys, re-enter rebuilds including edits. No historical scenes.

### Not this ticket

- Membership of the region — [Region occupants](43-region-occupants.md).
- Budget numbers and refusal chrome — [Budget precheck](44-budget-precheck.md).
- Enter/exit affordance and leftover 2D delimitation — [Exclusive 3D mode](45-exclusive-3d-mode.md).
- Meshes / recognizable silhouettes — [Family silhouettes](48-family-silhouettes.md).
- How traces are drawn — [Static networks](49-static-networks.md).
- GPU teardown — [Scene teardown](53-scene-teardown.md).
- Picking, gizmos, edits.

### Acceptance

1. A 3D extract does not add quaternion, scale, tangent Z, `sizeKind`, or `volumeOffsetM` onto the 2D payload.
2. An occupant with `sizeKind: unknown` has no `extentM` and is not given Height-view `DEFAULT_HEIGHT_M` (4 m).
3. Unreadable lightweight scale is flagged unknown, not `[1, 1, 1]`.
4. A path actor with no spline tangents omits arrive/leave; zeros are not stored as if they were save tangents. Chain-actor triples are not a source.
5. `volumeOffsetM` is omitted when the known AABB center coincides with the actor origin; it is never an invented Docs translation or a Cut Z-floor rewrite.
6. `sav_wasm` and `sav_tauri` expose the same record/buffer shape.
7. Expensive typed pose/path buffers are not allocated before [Budget precheck](44-budget-precheck.md) says go.

## Comments

Resolved 2026-11-23. Shared understanding is the Answer above. Do not re-grill. Next HITL on this cluster is [Region occupants](43-region-occupants.md).

## Approved clarification — 2026-11-26

Unknown scale takes precedence over every volumetric approximation, including a named box, clearance reserve or available simplified model. For an occupant whose scale cannot be read, admit by the save origin as an explicit approximation and show its location with scale-unknown uncertainty; do not assume unit scale or draw a purported physical volume. Known reference dimensions may remain metadata but do not establish a usable world-space volume. Apply the identical origin predicate in precheck and extraction; this condition alone does not reject the whole region.

Acceptance: a known-size occupant with unreadable scale keeps its uncertainty even when a model exists; no fallback silently replaces the missing scale.
