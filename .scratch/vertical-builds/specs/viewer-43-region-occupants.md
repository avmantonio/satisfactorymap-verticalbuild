# Regional membership and clipping

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [43 — Region occupants](../issues/43-region-occupants.md)
Scope: First regional read-only viewer contract.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

The observation inventory must match the isolation volume rather than the editor Selection.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to observe all admitted occupants of the committed XY and Z volume, so that deselecting an actor does not erase it from observation.

2. As a pioneer, I want to see only in-region path geometry, so that a crossing does not pull distant segments into the scene.

3. As a pioneer, I want to toggle visibility without loading more actors, so that the admission budget stays stable.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

3D occupants are the Height-view isolation volume (XY rectangle + Cut Z band + altitude rail), not Selection; conservative AABB with orientation, scale, and `volumeOffsetM`; paths clip at the bound; filters hide, they do not change membership.

The scene draws every physical object inside that delimited volume, including objects that are not the active edit Selection. Bounds stay conservative. Decided 2026-11-23; do not re-grill.

### Isolation volume

The delimited map area is the Height-view isolation volume:

- XY rectangle of the isolation,
- Cut Z band,
- AND the altitude rail cap.

Occupants outside that volume are not loaded into the 3D extract. Expanding the volume requires a **new enter** into the viewer ([Exclusive 3D mode](../issues/45-exclusive-3d-mode.md) owns enter/exit chrome; this ticket only states that membership does not grow mid-visit). Internal filters only change **visibility** among already-loaded occupants; they do not change membership.

Fields and transport stay [Scene contract](../issues/42-scene-contract.md). Count, the 8 000 cap, and refusal UI stay [Budget precheck](../issues/44-budget-precheck.md).

### Paths

A path is in when its **approximate geometry** intersects the isolation volume. The extract **clips traces to the volume bounds and generates intersection points**. Distant segments are not pulled in. No chain-actor reconstruction.

Copy/edit semantics are unchanged: [Volume occupancy](../issues/12-volume-occupancy.md) / [Relocate semantics](../issues/07-relocate-semantics.md) — whole-in, silent straddlers, no geometric split. That set is a later edit cycle, not this visual inventory.

Power-line both-owners remains a copy rule, not visual membership. How clipped ribbons look is [Static networks](../issues/49-static-networks.md).

### Filters and hidden classes

Spatial membership is independent of layer filters and `hiddenIndices`. Those affect visibility **inside** the viewer.

Curated `hiddenClasses` stay excluded. The visual universe is **not** literally every physical save actor.

### Conservative inclusion

An occupant is in when its conservative AABB intersects the isolation volume AABB. That AABB uses orientation, scale, and `volumeOffsetM` from [Scene contract](../issues/42-scene-contract.md).

For `sizeKind: unknown`, the origin is an **explicit approximation**. The extract does not guarantee detecting an unknown-size object whose true volume crosses the border. Not a true-hull test. Clearance remains a labeled reserve ([Reserve volumes](../issues/50-reserve-volumes.md)).

### Not this ticket

- Field list and 3D extract transport — [Scene contract](../issues/42-scene-contract.md).
- Count, 8 000, refusal chrome — [Budget precheck](../issues/44-budget-precheck.md).
- Enter/exit affordance and leftover 2D delimitation — [Exclusive 3D mode](../issues/45-exclusive-3d-mode.md).
- How traces are drawn — [Static networks](../issues/49-static-networks.md).
- Meshes — [Family silhouettes](../issues/48-family-silhouettes.md).
- Picking and spatial edits of this set — after [Viewer delivery](../issues/58-viewer-delivery.md).

### Acceptance

1. An object whose conservative AABB lies entirely outside the isolation volume is absent from the 3D extract.
2. Expanding XY or Z after enter does not grow the loaded set; a new enter is required.
3. Toggling a layer filter or `hiddenIndices` does not add or remove extract records; it only changes visibility.
4. A `hiddenClasses` actor is not an occupant of the 3D extract.
5. A path that straddles the volume contributes only clipped in-region geometry (with generated intersection points). Distant vertices are not in the extract.
6. Copy/paste of a straddling belt remains whole-in (Volume occupancy); this ticket does not change that.
7. `sizeKind: unknown` is tested at the origin as an explicit approximation; a miss across the border is allowed. Named-box and clearance-reserve use oriented, scaled AABB + `volumeOffsetM`. True hulls are not used.
8. The 3D occupant set is not required to equal Selection.

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Exercise all eight Acceptance items on ticket 43 using the same membership predicate for count and extract.
- Cover rotated/scaled/off-centre boxes crossing a boundary, fully outside boxes, origin-based unknowns, hiddenClasses, filter/hidden-index changes and paths with no in-volume source vertex.
- Verify clipped visual paths never change the editor's whole-actor copy semantics.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

Global integration must state boundary-touch/degenerate-band handling and the unknown-scale case consistently for count and extract. Approximate path sampling/clipping must be coherent; no new true-hull guarantee is inferred.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

