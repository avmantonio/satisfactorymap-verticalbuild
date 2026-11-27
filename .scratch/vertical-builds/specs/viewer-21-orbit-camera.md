# Orbit camera

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [21 — Orbit camera](../issues/21-orbit-proxies.md)
Scope: First regional read-only viewer contract.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

A flat map alone makes stacked spatial relations difficult to inspect.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to rotate, pan and zoom around a point of interest, so that I can inspect the region from several angles.

2. As a pioneer, I want to keep navigation observational, so that camera actions do not edit the save.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

The camera is orbit: rotate, pan, and zoom about a point of interest. Free flight is outside this cut. The exact control shape, including a nav cube, is product design and is not decided here. Decided 2026-11-23; do not re-grill.

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- On representative stacked and sloped regions, rotate/pan/zoom and verify the scene remains navigable without changing the save.
- Check the camera does not expose free-flight or editor operations as required first-viewer features.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

The exact initial focus/framing, input mapping, zoom bounds, recovery/reset affordance and height reference are not specified by the short Answer. Define them coherently in the global spec/product design; do not silently import ticket 08's selection pivot or nav cube.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

