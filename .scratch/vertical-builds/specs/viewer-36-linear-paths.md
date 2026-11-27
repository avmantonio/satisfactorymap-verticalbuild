# Static path source and fidelity

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [36 — Linear paths](../issues/36-linear-paths.md)
Scope: Supporting constraint, evidence or decision record.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

Connections must retain elevation and crossings without reconstructing belt-chain internals.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to see rising and falling static connections in XYZ, so that crossings do not collapse onto the map plane.

2. As a pioneer, I want to keep missing path information explicit, so that an approximate trace is not presented as a true routed shell.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

Belts, pipes, and connections are static geometry. No animated item flow and no production simulation. Decided 2026-11-23; do not re-grill.

## Recorded Evidence

The following findings were recorded by the source investigation. They were not rerun in this documentation task. Later contracts 42–45 govern the implemented extract, membership, count and lifecycle where the older notes describe the existing 2D payload or draft alternatives.

Payload samples plus XY Hermite already draw belts, pipes, hypertubes, rails, and vehicle paths as static 3D traces; Z between vertices is linear because tangent Z and chain-actor triples are dropped. Power cables are straight 3D chords. Rise, fall, and region-cross are drawable without animated flow. Lifts are the missing trace.

Full note: [research/linear-paths.md](../research/linear-paths.md).

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Check belts, pipes, hypertubes, rails, vehicle paths and power chords against their actor geometry where available.
- Include a path crossing the region with no original vertex inside; ticket 43 requires generated clipping intersections.
- Assert no chain-actor reconstruction or save mutation; lifts remain occupants rather than traces.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

Historical payload samples establish feasibility: XY Hermite and linear Z are not a mandate to source the new extract from 2D. Ticket 42 uses actor XYZ and optional real 3D tangents; linear drawing is allowed without inventing tangents.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

