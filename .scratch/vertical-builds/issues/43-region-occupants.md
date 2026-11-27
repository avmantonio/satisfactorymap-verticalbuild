# Region occupants
Level: theme
Kind: ticket
Parent: 78
Status: resolved


## Question

What happens to objects and paths that cross the border, without pulling distant actors into the scene?

Reuse the existing spatial delimitation. Acceptance: the visual inventory matches the area. Editing that set is a later cycle.

## Answer

3D occupants are the Height-view isolation volume (XY rectangle + Cut Z band + altitude rail), not Selection; conservative AABB with orientation, scale, and `volumeOffsetM`; paths clip at the bound; filters hide, they do not change membership.

The scene draws every physical object inside that delimited volume, including objects that are not the active edit Selection. Bounds stay conservative. Decided 2026-11-23; do not re-grill.

### Isolation volume

The delimited map area is the Height-view isolation volume:

- XY rectangle of the isolation,
- Cut Z band,
- AND the altitude rail cap.

Occupants outside that volume are not loaded into the 3D extract. Expanding the volume requires a **new enter** into the viewer ([Exclusive 3D mode](45-exclusive-3d-mode.md) owns enter/exit chrome; this ticket only states that membership does not grow mid-visit). Internal filters only change **visibility** among already-loaded occupants; they do not change membership.

Fields and transport stay [Scene contract](42-scene-contract.md). Count, the 8 000 cap, and refusal UI stay [Budget precheck](44-budget-precheck.md).

### Paths

A path is in when its **approximate geometry** intersects the isolation volume. The extract **clips traces to the volume bounds and generates intersection points**. Distant segments are not pulled in. No chain-actor reconstruction.

Copy/edit semantics are unchanged: [Volume occupancy](12-volume-occupancy.md) / [Relocate semantics](07-relocate-semantics.md) — whole-in, silent straddlers, no geometric split. That set is a later edit cycle, not this visual inventory.

Power-line both-owners remains a copy rule, not visual membership. How clipped ribbons look is [Static networks](49-static-networks.md).

### Filters and hidden classes

Spatial membership is independent of layer filters and `hiddenIndices`. Those affect visibility **inside** the viewer.

Curated `hiddenClasses` stay excluded. The visual universe is **not** literally every physical save actor.

### Conservative inclusion

An occupant is in when its conservative AABB intersects the isolation volume AABB. That AABB uses orientation, scale, and `volumeOffsetM` from [Scene contract](42-scene-contract.md).

For `sizeKind: unknown`, the origin is an **explicit approximation**. The extract does not guarantee detecting an unknown-size object whose true volume crosses the border. Not a true-hull test. Clearance remains a labeled reserve ([Reserve volumes](50-reserve-volumes.md)).

### Not this ticket

- Field list and 3D extract transport — [Scene contract](42-scene-contract.md).
- Count, 8 000, refusal chrome — [Budget precheck](44-budget-precheck.md).
- Enter/exit affordance and leftover 2D delimitation — [Exclusive 3D mode](45-exclusive-3d-mode.md).
- How traces are drawn — [Static networks](49-static-networks.md).
- Meshes — [Family silhouettes](48-family-silhouettes.md).
- Picking and spatial edits of this set — after [Viewer delivery](58-viewer-delivery.md).

### Acceptance

1. An object whose conservative AABB lies entirely outside the isolation volume is absent from the 3D extract.
2. Expanding XY or Z after enter does not grow the loaded set; a new enter is required.
3. Toggling a layer filter or `hiddenIndices` does not add or remove extract records; it only changes visibility.
4. A `hiddenClasses` actor is not an occupant of the 3D extract.
5. A path that straddles the volume contributes only clipped in-region geometry (with generated intersection points). Distant vertices are not in the extract.
6. Copy/paste of a straddling belt remains whole-in (Volume occupancy); this ticket does not change that.
7. `sizeKind: unknown` is tested at the origin as an explicit approximation; a miss across the border is allowed. Named-box and clearance-reserve use oriented, scaled AABB + `volumeOffsetM` only when scale is readable; otherwise the approved unknown-scale origin rule takes precedence. True hulls are not used.
8. The 3D occupant set is not required to equal Selection.

## Comments

Resolved 2026-11-23. Shared understanding is the Answer above. Do not re-grill. Next HITL on this cluster is [Budget precheck](44-budget-precheck.md).

## Approved clarification — 2026-11-26

Unknown scale takes precedence over every volumetric approximation, including a named box, clearance reserve or available simplified model. For an occupant whose scale cannot be read, admit by the save origin as an explicit approximation and show its location with scale-unknown uncertainty; do not assume unit scale or draw a purported physical volume. Known reference dimensions may remain metadata but do not establish a usable world-space volume. Apply the identical origin predicate in precheck and extraction; this condition alone does not reject the whole region.

This is an explicit exception to the oriented/scaled AABB rule. A true-volume crossing may be missed when the origin lies outside. The visual Z filter never expands or implicitly modifies the loaded volume or its membership.
