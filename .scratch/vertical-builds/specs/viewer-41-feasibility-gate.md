# Feasibility GO and its limits

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [41 — Feasibility gate](../issues/41-feasibility-gate.md)
Scope: Supporting constraint, evidence or decision record.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

The team needs a bounded GO rather than treating prototypes as universal hardware proof.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to proceed with the accepted regional approach, so that settled feasibility is not re-litigated.

2. As a pioneer, I want to know which environments remain untested, so that a measured GO is not a platform-wide promise.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

GO. A real multi-height region can be drawn with checkable spatial relations and stable behavior in the environments the phase-1 probes actually ran.

Anto, 2026-11-23:

- Spatial relations: YES. Stacking, over/under, and heading are checkable without true machine hulls. Checkable means pose + traces + honest clearance reserves/primitives, not Coffee Stain volumetric meshes.
- Stable behavior: YES. The gate passes on the environments the phase-1 probes actually ran (ASUS VivoBook / NVIDIA MX110 / Cursor Electron; ordinary regions 49–800 occupants; reject > 8,000). Unmeasured hardware (Intel iGPU, wasm tab with a 600k-object save) is deferred to [Stress trial](../issues/55-stress-trial.md) — not a fail of this gate.

Terrain is not required to pass. If a region does not hold, change technology, catalog, or budget before [Scene contract](../issues/42-scene-contract.md) / [Contract gate](../issues/46-contract-gate.md). Technology means a change inside the already-chosen stack (vanilla Three.js InstancedMesh), not a re-pick versus WebGL2.

Decided 2026-11-23. Do not re-grill.

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Preserve the six accepted inputs: transform, paths, catalog, renderer, cost and supply (35, 36, 28, 18, 25, 40).
- Require integrated stress/parity evidence separately; MX110/Electron probes do not credit Intel iGPU, large loaded WASM sessions or Tauri runtime.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

The accepted stack remains vanilla Three.js instancing. Technology/catalog/budget changes, if actual trials require them, must be recorded; this document does not revise the 8,000 contract.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

