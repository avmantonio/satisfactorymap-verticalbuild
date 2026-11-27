# Spatial source and fidelity

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [31 — Spatial data audit](../issues/31-spatial-data-audit.md)
Scope: Supporting constraint, evidence or decision record.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

The compact 2D payload loses information a 3D observation needs.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to see position, tilt and scale from the save, so that the scene does not reconstruct false poses from flattened map marks.

2. As a pioneer, I want to see missing geometry identified, so that a placeholder is not presented as a measurement.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

The save stores quaternion, centimeter position, and scale; the payload keeps map pixels, yaw or a flat hull, and z in meters. Quaternion, scale, and tangent Z are dropped. Sizes are a class clearance lookup, not a per-instance shell.

Position, orientation, and elevation come from the save. The 2.5D cut’s 4 m stand-in is not a physical measure. A point can be placed by inverting pixels and reading z. A box needs that class lookup; a miss is the point plus an unknown size. Path samples are on the payload; the vertical tangent is not.

Findings: [research/spatial-data-audit.md](../research/spatial-data-audit.md). Decided 2026-11-23. Do not re-grill. Do not pick silhouettes, a renderer, or a region budget from this ticket.

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Compare extracted poses to actor headers and lightweight record bytes, including tilt and non-unit scale.
- Check that the standing 2D payload retains its current shape and that 3D does not depend on map-pixel round trips.
- Exercise omitted path tangents and missing dimensions without manufacturing replacement data.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

The audit establishes sources and losses. Ticket 42 supplies the later normative extract contract; the earlier suggestion to place a point by inverting pixels is not the product's 3D pose source.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

