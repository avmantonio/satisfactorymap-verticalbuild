# Baseline decision record

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [34 — Baseline gate](../issues/34-baseline-gate.md)
Scope: Supporting constraint, evidence or decision record.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

Feasibility needs known sources, representative cases and regression ownership.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to keep the accepted baseline explicit, so that later work uses the sources and cases already established.

2. As a pioneer, I want to track missing corpus coverage without fabricating fixtures, so that the baseline remains auditable.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

Phase 0 is closed. Feasibility investigations may open. This gate does not pick a library or a proxy kit.

[Spatial data audit](../issues/31-spatial-data-audit.md), [Representative cases](../issues/32-representative-cases.md), and [2D regression guard](../issues/33-2d-regression-guard.md) already stand: the payload keeps map pixels, yaw or a flat hull, and z in meters (quaternion, scale, and tangent Z dropped; sizes are a class clearance lookup); All_080726, solo_autosave_1, and BuildITBIIIIIG_210726 cover stacks, rotation, slopes, repeated modules, unknown vanilla classes, and density; load and existing edits stay on `ui_behaviour.py` and `cargo test -p sav_core --release`, Height view stays the manual runtime script, and the viewer handoff check belongs in `ui_behaviour.py` when enter/exit exists. [Modded save](../issues/59-modded-save.md) stays open and does not block this gate or the feasibility work.

Decided 2026-11-23. Do not re-grill.

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Check that the global spec links the spatial audit, corpus and regression contracts (31–33).
- Preserve the modded-save gap; do not use this decision gate as evidence that the viewer has run.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

Baseline is closed as a decision. It selects neither a library nor a proxy kit and does not certify implemented geometry.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

