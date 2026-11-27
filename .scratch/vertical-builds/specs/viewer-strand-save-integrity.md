# Save integrity — first regional 3D viewer

Date: 2026-11-25
Status: consolidated strand spec for settled viewer decisions; integration details and implementation remain pending.
Strand: save-integrity
Scope: the viewer-related portion of this strand, not closure of the entire campaign strand.
Package: [Main spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

A read-only observation can still regress the existing editor through session loss, altered selection semantics or a broken handoff back to 2D.

## Solution

The first viewer reads current **applied** session state. It emits no pick/edit operation and performs no byte-splice, geometric belt split, reconnect or conveyor-chain reconstruction. Visual path clipping is only scene geometry; existing whole-actor copy and power-owner rules remain unchanged.

This document consolidates the settled ticket decisions for this strand into one contract for the future global viewer spec. Per-ticket specs are preserved as supporting traceability; they are not the primary composition unit.

## User Stories

1. As a pioneer, I want to return from observation to an intact editor, so that I can keep editing the same save.

2. As a pioneer, I want to keep observation read-only, so that viewing a clipped path does not rewrite it.

3. As a pioneer, I want to retain proven edit and undo behavior, so that the new view does not weaken save integrity.

## Consolidated Contract

### Read-only scene boundary

The first viewer reads current **applied** session state. It emits no pick/edit operation and performs no byte-splice, geometric belt split, reconnect or conveyor-chain reconstruction. Visual path clipping is only scene geometry; existing whole-actor copy and power-owner rules remain unchanged.

Keep sav_core's byte-splice + re-parse editor path and undo replay from pristine. Adding regional extraction must work with the retained lean session, without rewriting the standing 2D payload or replacing the edit authority with scene objects.

### Return-to-2D contract

The explicit regression requirement from ticket 33 belongs in the existing UI behaviour guard after load:

1. Capture #map width, bucket count and each visible flag.
2. Enter hides Leaflet and displays the scene only.
3. Exit restores map width within 1 px, the same buckets and visibility flags, HeightView.isOpen() false and no pageerror.

This requirement must compose with exclusive mode 45 and resource release 53. It does not decide all retained rectangle, Selection or map-position details; those need a consistent global lifecycle definition. It does require a usable editor session on return.

### Existing evidence and remaining obligations

| Existing check / reference | What it proves, and its limit |
| --- | --- |
| UI behaviour script | Existing load/chrome baseline; not yet the 3D handoff, selection or filter-toggle coverage |
| UI class guard | Static styled-class hooks; not runtime selection/edit proof |
| Rust core editor suite | Existing move/rotate/delete/copy/paste/undo/export re-parse contracts |
| CONTINUE manual Height-view walk | Existing rectangle/Cut/peel/Move observation checks; distinct from viewer handoff |
| Ticket 15 / 2.5D ship | Z-isolate snapshot CI and human in-game load remain owed by their original scope; not a newly introduced viewer gate |

The resolved regression node specifies the future handoff check; it has not implemented or run it. Baseline closure is not a test result for the regional viewer. Parser acceptance is not collision certification, and WASM OOM is a runtime-limit issue rather than evidence of corrupted edits.

## Interfaces with Other Strands

- **Constrains Regional viewer:** extraction is a query against current session state and does not alter save data or 2D payload.
- **Constrains Volume selection:** visual membership/clipping never replaces clipboard/edit semantics.
- **Consumes Visual presentation / Runtime limits:** state restoration and cleanup on exit or rejected entry.
- **Feeds Browser and desktop:** existing 2D behavior and handoff must remain usable in actual parity checks.

## Testing Decisions

Test records, visual relations and state transitions at the highest existing core/session or product UI seam that can observe them. The following are acceptance requirements, not reported test results.

- Add observable enter/exit assertions at the existing UI guard seam exactly as ticket 33 defines; do not test incidental DOM internals.
- After a successful visit and return, exercise existing 2D load/selection/filter/edit flows through the appropriate existing checks and actual parity trial.
- Verify scene entry/extraction does not mutate the current save, edited body, undo authority or standing 2D payload.
- Retain original Height-view and first-ship integrity obligations without claiming them passed or silently merging them into 60.

Implementation 60 must exist before integrated trials 54–56 can credit their results; stable delivery remains on gate 58.

## Definitions Still Needed in the Global Spec

The actual handoff assertion, extraction non-mutation proof and shell-integrated regression checks remain implementation work. Global integration must define retained editor state and failure/late-result recovery while preserving the explicit width/bucket/flag/HeightView requirement. No new in-game smoke or full-suite result is credited here.

## Out of Scope and Later Work

This is the first regional read-only viewer's contribution from Save integrity. It does not specify or implement the later 3D edit cycle, require terrain, close pending acceptance checks or authorize publication. The older 2.5D spec and later editor bar retain their own scope. Do not mark the whole save-integrity strand or root campaign complete merely because this viewer slice is documented.

## Source Decisions and Preserved Supporting Work

The following source tickets are owned by this strand. Their Answers remain the decision record; detailed per-ticket documents are retained for traceability. Cross-strand dependencies are composed through the interfaces above.

| Source ticket | Preserved supporting document |
| --- | --- |
| [33 — 2D regression guard](../issues/33-2d-regression-guard.md) | [2D regression and viewer handoff](viewer-33-2d-regression.md) |

See the [readiness review](viewer-readiness-review.md) for current code seams, available inputs, evidence limitations and integration definitions shared across strands.


## Approved clarification — 2026-11-26

On exit preserve map position and zoom, edit Selection, category filters, committed isolation rectangle and Cut Z band. Category-filter changes made during the visit remain effective on return. Height view is closed on return (HeightView.isOpen() false), but the committed delimitation is retained for reopening or re-entry without redrawing. Preserve the committed region separately from the temporary visual Z window; changing visual Z is not a change to that delimitation. Scene destruction and rebuilding from the current save remain mandatory.

Visibility flags must match the shared filters after any intentional visit changes, rather than always restoring the pre-visit flags.
