# Exclusive visit lifecycle

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [45 — Exclusive 3D mode](../issues/45-exclusive-3d-mode.md)
Scope: First regional read-only viewer contract.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

Two simultaneous maps or stale snapshots would confuse the regional observation.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to enter a temporary 3D visit from the current save, so that I see applied state.

2. As a pioneer, I want to exit and later re-enter after edits, so that the next scene is rebuilt rather than stale.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

3D replaces the main 2D map for the visit. Two maps at once are not the base experience. Enter builds the scene from the current save. Exit destroys it. Enter again rebuilds, including edits made in between. No historical scenes and no stale cache. Decided 2026-11-23; do not re-grill.

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Observe a successful entry replacing the main Leaflet map, an exit restoring 2D and a re-entry reflecting an applied 2D edit.
- Verify a rejected precheck leaves 2D available and never begins the visit.
- Use ticket 33's handoff check, including closed Height view on return; use ticket 53 for resource release.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

The ticket's Answer does not settle the exact entry/exit affordance or which rectangle, band, selection, camera and map-position state survives. The global spec must reconcile those details with ticket 33's explicit HeightView.isOpen() false requirement. No historic-scene cache or simultaneous split view.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

