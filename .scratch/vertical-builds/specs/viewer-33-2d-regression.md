# 2D regression and viewer handoff

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [33 — 2D regression guard](../issues/33-2d-regression-guard.md)
Scope: Supporting constraint, evidence or decision record.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

Entering an observation must preserve the save editor people already use.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to return from 3D to the current 2D editor, so that I can continue working.

2. As a pioneer, I want to retain map layers and dimensions across the visit, so that the observation does not corrupt my workspace.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

Load and existing edits already have checks (`ui_behaviour.py`, `cargo test -p sav_core --release`); Height view is the manual runtime script; the viewer handoff has no automated check until enter/exit exists, and that check belongs in `ui_behaviour.py`.

While the regional viewer is open it replaces the main map. Closing it returns the current 2D editor, intact. The check has to prove that handoff. That visit is [Exclusive 3D mode](../issues/45-exclusive-3d-mode.md): enter builds from the current save, exit destroys the scene, two maps at once are not the base experience. Nothing in the client implements enter/exit, so the assertion cannot be run yet. When it can, add it to `py tools/ui_behaviour.py --serve` after the load wait: record `#map` width, bucket count, and each `visible` flag; enter hides the leaflet map and shows only the scene; exit restores that width within 1 px, the same buckets and flags, `HeightView.isOpen()` false, and no pageerror. Fail any of those. The script already exits non-zero.

Baseline that must stay green, and what each one proves:

- Load and shell: `py tools/ui_behaviour.py --serve` (fetched save in `map/uploads/`, built `dist/`). Exit 0 means the save loads, buckets exist, and the altitude rail docks. It does not drag a selection or toggle a layer.
- Selection and editor class hooks: `py tools/ui_classes.py`. Exit 0. Static. It does not select or edit.
- Filters: no command. `filters.js` sets `bucket.visible`; the layer and `selection.js` skip hidden buckets. No new harness.
- Height view: the manual script in `CONTINUE.md` (Runtime test). Pass is one axis at a time, peel on pointerup, Move commits, side panel and flaps both work, dismiss hides `#heightView`. That is not the viewer handoff. Height view’s own ship stays as it is.
- Edits that already exist: `cd rust_parser && cargo test -p sav_core --release`. Move, rotate, delete, undo replay to pristine, copy/paste, and export re-parse. [Save integrity gates](../issues/15-save-integrity-gates.md) still owes the Z-window isolate snapshot; no such test exists, and it does not block this gate.

Findings: [research/2d-regression-guard.md](../research/2d-regression-guard.md).

Decided 2026-11-23. Do not re-grill.

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Extend the existing UI behaviour guard after load: capture #map width, bucket count and each visible flag; enter shows only the scene; exit restores width within 1 px, buckets and flags, HeightView.isOpen() false and no pageerror.
- Keep the existing Rust editor tests as save-operation evidence and the manual Height-view runtime walk as its own evidence.
- Do not describe the existing UI script as testing selections, filter toggles or the not-yet-existing 3D handoff.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

The handoff assertions are specified but not implemented. The Height-view isolate snapshot/in-game ship obligations remain on ticket 15 and do not block this viewer's contract.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

