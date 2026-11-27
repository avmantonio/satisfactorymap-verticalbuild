# 2D regression guard
Level: theme
Kind: ticket
Parent: 73
Status: open


## Question

What is the baseline measurement and the reproducible regression check for load, selection, filters, Height view, and the edits that already exist?

Height view’s own ship stays as it is. This ticket does not implement the 3D mode and does not reopen those contracts.

## Answer

Load and existing edits already have checks (`ui_behaviour.py`, `cargo test -p sav_core --release`); Height view is the manual runtime script; the viewer handoff has no automated check until enter/exit exists, and that check belongs in `ui_behaviour.py`.

While the regional viewer is open it replaces the main map. Closing it returns the current 2D editor, intact. The check has to prove that handoff. That visit is [Exclusive 3D mode](45-exclusive-3d-mode.md): enter builds from the current save, exit destroys the scene, two maps at once are not the base experience. Nothing in the client implements enter/exit, so the assertion cannot be run yet. When it can, add it to `py tools/ui_behaviour.py --serve` after the load wait: record `#map` width, bucket count, and each `visible` flag; enter hides the leaflet map and shows only the scene; exit restores that width within 1 px, the same buckets and flags, `HeightView.isOpen()` false, and no pageerror. Fail any of those. The script already exits non-zero.

Baseline that must stay green, and what each one proves:

- Load and shell: `py tools/ui_behaviour.py --serve` (fetched save in `map/uploads/`, built `dist/`). Exit 0 means the save loads, buckets exist, and the altitude rail docks. It does not drag a selection or toggle a layer.
- Selection and editor class hooks: `py tools/ui_classes.py`. Exit 0. Static. It does not select or edit.
- Filters: no command. `filters.js` sets `bucket.visible`; the layer and `selection.js` skip hidden buckets. No new harness.
- Height view: the manual script in `CONTINUE.md` (Runtime test). Pass is one axis at a time, peel on pointerup, Move commits, side panel and flaps both work, dismiss hides `#heightView`. That is not the viewer handoff. Height view’s own ship stays as it is.
- Edits that already exist: `cd rust_parser && cargo test -p sav_core --release`. Move, rotate, delete, undo replay to pristine, copy/paste, and export re-parse. [Save integrity gates](15-save-integrity-gates.md) still owes the Z-window isolate snapshot; no such test exists, and it does not block this gate.

Findings: [research/2d-regression-guard.md](../research/2d-regression-guard.md).

Decided 2026-11-23. Do not re-grill.

## Approved clarification — 2026-11-26

On exit preserve map position and zoom, edit Selection, category filters, committed isolation rectangle and Cut Z band. Category-filter changes made during the visit remain effective on return. Height view is closed on return (HeightView.isOpen() false), but the committed delimitation is retained for reopening or re-entry without redrawing. Preserve the committed region separately from the temporary visual Z window; changing visual Z is not a change to that delimitation. Scene destruction and rebuilding from the current save remain mandatory.

The earlier same-visible-flags check is conditional: without filter changes restore the original flags; with intentional category changes, assert the resulting shared filter flags instead. The unchanged-state check must not undo user filter changes. Add position/zoom, Selection and retained rectangle/band checks when the handoff exists; no runtime pass is credited here.
