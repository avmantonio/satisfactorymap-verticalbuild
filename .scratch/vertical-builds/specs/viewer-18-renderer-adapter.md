# Regional renderer adapter

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [18 — Renderer probe](../issues/18-3d-scene-adapter.md)
Scope: Supporting constraint, evidence or decision record.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

The Leaflet bucket layer cannot supply a perspective regional observation by treating altitude as a camera.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to orbit an admitted region in the same application, so that I can read height and crossings.

2. As a pioneer, I want to use the same viewer in the browser and desktop, so that I do not need another product.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

Browser and Tauri share one frontend, if the capacity tests pass. Do not start a desktop-only engine. The probe chose vendored vanilla Three.js. Decided 2026-11-23; do not re-grill.

## Recorded Evidence

The following findings were recorded by the source investigation. They were not rerun in this documentation task. Later contracts 42–45 govern the implemented extract, membership, count and lifecycle where the older notes describe the existing 2D payload or draft alternatives.

The 2D WebGL2 layer stays the Leaflet overlay. The regional scene is vanilla Three.js InstancedMesh from typed arrays (no Object3D per actor), vendored under `map/static` when it leaves scratch.

Prototype: [renderer-probe.html](../prototype/renderer-probe.html). Notes: [renderer-probe-notes.md](../prototype/renderer-probe-notes.md).

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Exercise a representative region through the product adapter once implemented; the 25 synthetic boxes only prove a module-loading seam.
- Check same-origin module loading under the actual browser headers and Tauri CSP; record shells actually run.
- Verify rendering consumes regional typed buffers without one retained Object3D per actor or a duplicate full-save tree.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

Module attachment, control implementation and product lifecycle still need integration. The probe did not rebuild Tauri or deploy the hosted site. A vendored module on disk is not an integrated viewer.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

