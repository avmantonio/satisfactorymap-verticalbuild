# Regional cost and admission ceiling

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [25 — Cost probe](../issues/25-scene-budget.md)
Scope: Supporting constraint, evidence or decision record.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

An overly dense region can exhaust the viewer's usable rendering budget.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to have oversized regions refused before entry, so that the map stays usable.

2. As a pioneer, I want to get the same admission ceiling on browser and desktop, so that the product has one predictable first-viewer limit.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

The budget is closed: an oversized region is refused, and the user is asked to shrink it. No LOD and no automatic degradation in this version. Do not publish FPS, GPU megabytes, or a maximum region size before this probe. The old cheaper-rest-of-save split and the two render ceilings are not this delivery. Decided 2026-11-23; do not re-grill.

## Recorded Evidence

The following findings were recorded by the source investigation. They were not rerun in this documentation task. Later contracts 42–45 govern the implemented extract, membership, count and lifecycle where the older notes describe the existing 2D payload or draft alternatives.

Count occupants of the delimited volume. If **> 8,000**, do not start the 3D scene; keep 2D; ask to shrink. Ordinary corpus regions (49–800) fit. GPU megabytes are not the limiter. Measured on ASUS VivoBook / NVIDIA MX110 / Cursor Electron; Intel iGPU and a loaded 600k wasm tab were not measured. Alternative 14,000 was rejected.

Measurements: [research/scene-budget.md](../research/scene-budget.md). Harness: [prototype/scene-budget.html](../prototype/scene-budget.html).

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Exercise admission at 8,000 and 8,001 with the region predicate from ticket 43.
- Repeat integrated builds, navigation and teardown on available hardware, including a loaded large WASM session; report environments actually run.
- Do not turn probe frame times or GPU memory into a product performance guarantee.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

The resolved ticket selects 8,000. Historical research still contains draft 14,000 and Height-view-selection language: neither overrides tickets 43–44. Intel iGPU and 600k-WASM co-residence remain unmeasured acceptance work.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

