# Reserve and unknown representation

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [50 — Reserve volumes](../issues/50-reserve-volumes.md)
Scope: First regional read-only viewer contract.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

A clearance box can be mistaken for a machine shell and an absent size can be hidden by an invented solid.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to see a valid clearance as a labeled reserve, so that I understand it is an approximation.

2. As a pioneer, I want to see an unknown-size occupant at its location, so that missing size is visible without a fabricated box.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

A valid `clearance` is a neutral reserve volume, labeled as an approximation, not as the true shell. With no dimensions, show the location and the uncertainty, and do not invent a size. The object is not dropped and is not drawn as an exact solid. Decided 2026-11-23.

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- A clearance-only class displays a neutral approximation label and never an exact-shell claim.
- A sizeless class is present with location/uncertainty and no invented extent or silent 4 m.
- A named-box is described as a published approximate grid box rather than the mesh; retain scale/offset semantics from 42.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

Marker style and label placement remain design details. This rule must survive recognizable silhouettes, filters and empty/unknown readout; it cannot be defeated by falling back to an exact-looking generic cube.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

