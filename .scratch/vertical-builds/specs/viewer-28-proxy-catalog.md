# Size and proxy classification

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [28 — Proxy catalog](../issues/28-proxy-modeling.md)
Scope: Supporting constraint, evidence or decision record.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

Not every building table entry describes a real shell or a complete box.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to distinguish a named box, reserve and missing size, so that I can interpret the apparent volume correctly.

2. As a pioneer, I want to keep sizeless objects visible as uncertain locations, so that missing table data does not silently remove them.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

Shapes may be approximate. An approximation must not be presented as an exact measure. Official meshes stay out. Decided 2026-11-23; do not re-grill.

## Recorded Evidence

The following findings were recorded by the source investigation. They were not rerun in this documentation task. Later contracts 42–45 govern the implemented extract, membership, count and lifecycle where the older notes describe the existing 2D payload or draft alternatives.

Named W×D×H is a foundation-family box (227 classes), not a machine shell. Production, power, and most logistics stations are clearance reserves (274). Paths, lifts, empty-table actors, and pins have neither. Simple prisms read for pads, walls, beams, and lines; not for machines or lifts.

Catalog: [research/proxy-catalog.md](../research/proxy-catalog.md).

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Check representative complete-box, clearance-only and missing-size classes retain their honesty classification.
- Verify incomplete dimensions, plan-only footprints, repeating mesh lengths and lift fallbacks are not promoted into complete 3D volumes.
- Use ticket 42 for the live extract; do not copy the research note's Height-view floored clearance or flattened yaw into the new pose.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

The catalog is historical evidence and classification, not an authored silhouette kit. Its 227/274/45 counts describe the surveyed 546 classes; do not promise permanent coverage. Actor-native pose and unfloored volumeOffsetM from ticket 42 take precedence over the note's existing 2D recipes.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

