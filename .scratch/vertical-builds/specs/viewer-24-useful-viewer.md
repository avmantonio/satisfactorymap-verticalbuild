# Useful regional observation

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [24 — Useful viewer](../issues/24-3d-observation.md)
Scope: First regional read-only viewer contract.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

A pioneer needs a trustworthy reading of an applied factory section in Z.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to inspect applied structures in one delimited region, so that I can understand height and stacked floors after a copy or import.

2. As a pioneer, I want to see approximate relations described honestly, so that I do not mistake the scene for a collision certificate.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

The first 3D delivery is a trustworthy reading of one delimited factory section: height, stacked floors, and the spatial relations that matter after a copy or import. It shows only what is already applied. Move preview, tentative placement, and fine adjustment are a later cycle. Terrain is not required. Decided 2026-11-23; do not re-grill.

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Geometry, stress and parity evidence must come from the integrated viewer through tickets 54–56.
- Read a representative stack, sloped trace and crossing from multiple viewpoints without tentative placement or editing.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

Resolved means the usefulness contract is settled. It does not mean comparison against Height view has passed, implementation 60 is complete, or delivery 58 is approved.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

