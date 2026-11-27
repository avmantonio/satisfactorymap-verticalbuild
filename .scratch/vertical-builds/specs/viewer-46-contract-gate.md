# Contract closure record

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [46 — Contract gate](../issues/46-contract-gate.md)
Scope: Supporting constraint, evidence or decision record.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

Representation work needs a stable source, membership, admission and lifecycle contract.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to keep the four accepted contracts as the basis for the viewer, so that representation work does not redefine the data source.

2. As a pioneer, I want to separate decision closure from delivery, so that I can tell what still needs implementation and checks.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

Yes. The regional scene data contract ([Scene contract](../issues/42-scene-contract.md)), isolation-volume membership ([Region occupants](../issues/43-region-occupants.md)), >8,000 admission refusal before scene allocation ([Budget precheck](../issues/44-budget-precheck.md)), and enter/exit/rebuild lifecycle ([Exclusive 3D mode](../issues/45-exclusive-3d-mode.md)) are settled. Phase 2 is closed. The next tickets build representation and experience; they do not reopen these contracts. Decided 2026-11-25; do not re-grill.

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Confirm the global spec composes 42–45 without using Selection for visual membership or allocating a scene before admission.
- Keep implementation 60 and checks 54–56 open; this gate supplies no runtime pass.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

Closed as a decision gate. No new geometry, camera policy or product release is decided here.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

