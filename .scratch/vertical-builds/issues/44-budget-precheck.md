# Budget precheck
Level: theme
Kind: ticket
Parent: 81
Status: resolved


## Question

How is the load estimated before a scene is built, and what does the refusal show?

The check uses the thresholds from [Cost probe](25-scene-budget.md), not a new guess. Leaving the mode is [Exclusive 3D mode](45-exclusive-3d-mode.md). Releasing GPU resources after a scene that did start is [Scene teardown](53-scene-teardown.md).

## Answer

Count unique occupants the [Region occupants](43-region-occupants.md) predicate would admit; refuse if **> 8,000** before 3D buffers or replacing 2D; same cap on wasm and Tauri; `UI.dialog` to shrink XY or Cut Z.

A scene known to exceed the budget never starts. The user is asked to shrink the area, and the 2D map stays available. No LOD. Decided 2026-11-23; do not re-grill.

### What is counted

The estimate is the **admission count**: unique occupants [Region occupants](43-region-occupants.md) would admit to the 3D extract. Each building or path actor counts as **1**, regardless of vertices or length. `hiddenClasses` stay out; filters and `hiddenIndices` do not change the count.

The cap measures **admission**, not an FPS or memory guarantee by itself. Thresholds stay [Cost probe](25-scene-budget.md): refuse if count **> 8,000**; accept if count **≤ 8,000**.

### When

Run the count **before** building 3D pose/path typed buffers and **before** replacing the 2D view ([Scene contract](42-scene-contract.md) already forbids expensive buffers until this gate says go). Use **exactly the same membership predicate** as the extract. Counting MAY short-circuit at 8,001 and report the result as a **minimum**.

[Exclusive 3D mode](45-exclusive-3d-mode.md) owns enter/exit chrome. This ticket only sequences: the count must finish, and a reject must keep 2D, before enter would replace the map.

### Refusal

Keep the 2D map. Show a `UI.dialog` with:

- the limit (8,000),
- the exact count, or the minimum if the counter short-circuited,
- instructions to reduce the isolation XY rectangle or the Cut Z band.

No LOD, no partial scene, no desktop recommendation. Same threshold in the hosted browser, localhost, and Tauri. Do not infer a larger budget from native memory.

GPU release after a scene that **did** start is [Scene teardown](53-scene-teardown.md).

### Not this ticket

- Who is an occupant — [Region occupants](43-region-occupants.md).
- Extract fields and buffers — [Scene contract](42-scene-contract.md).
- Enter/exit affordance and leftover 2D delimitation — [Exclusive 3D mode](45-exclusive-3d-mode.md).
- Intel iGPU / 600k wasm co-residence — [Stress trial](55-stress-trial.md).

### Acceptance

1. An isolation volume with **8,000** admitted occupants is allowed to enter; **8,001** is rejected.
2. On reject, no 3D pose/path scene buffers are allocated.
3. On reject, 2D map state is not lost (the 2D view is not replaced).
4. The counter and the extractor agree: they use the same [Region occupants](43-region-occupants.md) membership predicate.
5. A path actor counts once, regardless of vertex count or clipped length.
6. A short-circuit at 8,001 reports a **minimum**, not an exact total, and still rejects.
7. The refuse dialog names the 8,000 limit, the count or minimum, and shrink-XY-or-Cut-Z; it does not offer LOD, a partial scene, or a desktop-only path.
8. Browser, localhost, and Tauri use the same **> 8,000** rule.

## Comments

Resolved 2026-11-23. Shared understanding is the Answer above. Do not re-grill. Next HITL on this cluster is [Exclusive 3D mode](45-exclusive-3d-mode.md).

## Approved clarification — 2026-11-26

The shared membership predicate includes the approved unknown-scale origin approximation from 42/43. Visual Z and category filtering do not change admission count or rerun admission to silently enlarge the loaded volume.
