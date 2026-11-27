# Transform fidelity and exceptions

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [35 — Transform proof](../issues/35-transform-proof.md)
Scope: Supporting constraint, evidence or decision record.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

Wrong units, axes or flattened tilt can make a plausible but false scene.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to retain save-native position, rotation and elevation, so that floors and slopes stay in their actual spatial relation.

2. As a pioneer, I want to see unsupported sizes and path fidelity reported, so that the viewer does not fill gaps with invented measurements.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

Position, orientation, and elevation come from the save. A class with no trustworthy Z or rotation is reported, not drawn as if it were exact. Shapes may be approximate later; this proof does not invent a number to fill a hole. Decided 2026-11-23; do not re-grill.

## Recorded Evidence

The following findings were recorded by the source investigation. They were not rerun in this documentation task. Later contracts 42–45 govern the implemented extract, membership, count and lifecycle where the older notes describe the existing 2D payload or draft alternatives.

Conversion on representative cases has no inverted axis or unit error. The save has pose (place, heading, height), not Coffee Stain volumetry. The viewer must not fake flattened tilt, a missing vertical curve between path samples, a missing table size, or a cell-max as building height. Mk5 belt is enough slope proof; the solo rail was a dump sampling gap, labeled. Wall poles and passthroughs stand in for this proof where signs, flow, and potties were not sampled. Coherent later drawing is not this ticket inventing a mesh: it already lives on resolved [Proxy catalog](../issues/28-proxy-modeling.md) and [Asset supply](../issues/40-asset-supply.md) and on open [Family silhouettes](../issues/48-family-silhouettes.md) — table reserve box or original authored form, never presented as the true shell; official meshes stay out.

Prototype: [prototype/transform-proof.html](../prototype/transform-proof.html). Exceptions: [prototype/transform-exceptions.md](../prototype/transform-exceptions.md).

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Use the captured stack/yaw/tilt/slope samples and the exception list as references for the integrated geometry check.
- Deliberately compare wrong-axis, swapped-XY, centimetre/metre and invented-4-m cases to ensure the evidence would expose systematic mistakes.
- Keep the solo-rail sampling gap and unsampled sign/flow/potty poses labeled; do not invent reference samples.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

The prototype is a captured conversion proof, not the product scene or camera. The extract must recover quaternion/scale and optional actor tangents directly rather than preserve the old payload's known losses.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

