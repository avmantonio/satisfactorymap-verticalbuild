# Admission precheck and refusal

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [44 — Budget precheck](../issues/44-budget-precheck.md)
Scope: First regional read-only viewer contract.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

A known oversize region must be refused while 2D is still usable.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to enter a region of at most 8,000 admitted occupants, so that the ceiling has an exact boundary.

2. As a pioneer, I want to receive a count and shrink instruction on refusal, so that I can reduce XY or Cut Z and try again.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

Count unique occupants the [Region occupants](../issues/43-region-occupants.md) predicate would admit; refuse if **> 8,000** before 3D buffers or replacing 2D; same cap on wasm and Tauri; `UI.dialog` to shrink XY or Cut Z.

A scene known to exceed the budget never starts. The user is asked to shrink the area, and the 2D map stays available. No LOD. Decided 2026-11-23; do not re-grill.

### What is counted

The estimate is the **admission count**: unique occupants [Region occupants](../issues/43-region-occupants.md) would admit to the 3D extract. Each building or path actor counts as **1**, regardless of vertices or length. `hiddenClasses` stay out; filters and `hiddenIndices` do not change the count.

The cap measures **admission**, not an FPS or memory guarantee by itself. Thresholds stay [Cost probe](../issues/25-scene-budget.md): refuse if count **> 8,000**; accept if count **≤ 8,000**.

### When

Run the count **before** building 3D pose/path typed buffers and **before** replacing the 2D view ([Scene contract](../issues/42-scene-contract.md) already forbids expensive buffers until this gate says go). Use **exactly the same membership predicate** as the extract. Counting MAY short-circuit at 8,001 and report the result as a **minimum**.

[Exclusive 3D mode](../issues/45-exclusive-3d-mode.md) owns enter/exit chrome. This ticket only sequences: the count must finish, and a reject must keep 2D, before enter would replace the map.

### Refusal

Keep the 2D map. Show a `UI.dialog` with:

- the limit (8,000),
- the exact count, or the minimum if the counter short-circuited,
- instructions to reduce the isolation XY rectangle or the Cut Z band.

No LOD, no partial scene, no desktop recommendation. Same threshold in the hosted browser, localhost, and Tauri. Do not infer a larger budget from native memory.

GPU release after a scene that **did** start is [Scene teardown](../issues/53-scene-teardown.md).

### Not this ticket

- Who is an occupant — [Region occupants](../issues/43-region-occupants.md).
- Extract fields and buffers — [Scene contract](../issues/42-scene-contract.md).
- Enter/exit affordance and leftover 2D delimitation — [Exclusive 3D mode](../issues/45-exclusive-3d-mode.md).
- Intel iGPU / 600k wasm co-residence — [Stress trial](../issues/55-stress-trial.md).

### Acceptance

1. An isolation volume with **8,000** admitted occupants is allowed to enter; **8,001** is rejected.
2. On reject, no 3D pose/path scene buffers are allocated.
3. On reject, 2D map state is not lost (the 2D view is not replaced).
4. The counter and the extractor agree: they use the same [Region occupants](../issues/43-region-occupants.md) membership predicate.
5. A path actor counts once, regardless of vertex count or clipped length.
6. A short-circuit at 8,001 reports a **minimum**, not an exact total, and still rejects.
7. The refuse dialog names the 8,000 limit, the count or minimum, and shrink-XY-or-Cut-Z; it does not offer LOD, a partial scene, or a desktop-only path.
8. Browser, localhost, and Tauri use the same **> 8,000** rule.

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Exercise all eight Acceptance items on ticket 44, especially exactly 8,000 versus 8,001.
- Show filters/hiddenIndices cannot reduce admission count and each path actor is counted once across clipped fragments.
- Verify rejection allocates no pose/path scene buffers, keeps 2D intact and labels a short-circuit result as a minimum.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

The ceiling is admission, not FPS, vertices, bytes or a memory warranty. It is identical on hosted browser, localhost and Tauri. No LOD, partial result or desktop recommendation is authorized.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

