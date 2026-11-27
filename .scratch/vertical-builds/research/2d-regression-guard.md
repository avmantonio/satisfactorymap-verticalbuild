# 2D regression guard

Survey date: 2026-11-23. Ticket: [2D regression guard](../issues/33-2d-regression-guard.md).

## Gist

Load and the edit engine already have commands. Height view is the manual runtime script. The viewer-replaces-map handoff has no automated check until enter/exit exists; that check belongs in `tools/ui_behaviour.py`, not a new harness.

## What already runs

| Concern | Command | What a pass proves | What it does not prove |
| --- | --- | --- | --- |
| Load and shell | `py tools/ui_behaviour.py --serve` | Exit 0. A `.sav` from `map/uploads/` loads, `MapApp.layer.buckets.length > 0`, no pageerror, empty state hides, altitude rail docks (`tools/ui_behaviour.py` load block). Needs `py tools/fetch_test_saves.py` and a built `dist/`. | A rectangle selection, a layer toggle, Height view, or a viewer enter/exit. The script forces `#selectionPanel` and `#activeFilterBanner` visible only to check that those bars share the window centre. |
| Selection and editor class hooks | `py tools/ui_classes.py` | Exit 0. Elements built in `map/static/map/*.js` still have a styled class. Static; no browser and no save. | That a drag selects objects or that an edit commits. |
| Edits that already exist | `cd rust_parser && cargo test -p sav_core --release` | Green run on the fetched saves. Move and rotate (`core/tests/editor_move.rs`), delete plus undo replay to the pristine body (`core/tests/editor_delete.rs`), copy/paste (`core/tests/editor_clipboard.rs`, `core/tests/editor_duplicate.rs`), export decompresses and re-parses (`core/tests/editor_roundtrip.rs`). | A Z-window isolate. No test under `rust_parser` names an isolate or a Z window. That snapshot stays the contract in [Save integrity gates](../issues/15-save-integrity-gates.md) and is still owed by the 2.5D ship. It does not block this gate. |

Filters flip `bucket.visible` in `map/static/map/filters.js` (group checkbox handler) and both the WebGL layer and `selection.js` skip hidden buckets. No tool asserts that toggle. Do not add a harness for it in this ticket.

## Height view

No tool mentions `HeightView`. The reproducible check is the manual script in [CONTINUE.md](../CONTINUE.md) (Runtime test): serve `dist/` at `http://127.0.0.1:8791/`, load a save, right-drag a rectangle, drag one isolation edge, drag one Cut bar, Move, then repeat on flaps.

Pass: one axis at a time; occupancy updates on pointerup; Move commits; side panel and flaps both work. `HeightView.dismiss` (`map/static/map/height_view.js`) hides `#heightView` and clears the isolation; `#map` was never removed. Fail: a drag moves two axes, the Z band resets, Move does not commit, or the Cut host stays open after dismiss.

That script is the Height-view ship check. It is not the regional-viewer handoff. Height view is a side panel on the same map.

## Viewer handoff

[Exclusive 3D mode](../issues/45-exclusive-3d-mode.md) already specifies the visit: 3D replaces the main 2D map, two maps at once are not the base experience, enter builds from the current save, exit destroys the scene, enter again rebuilds. Nothing in `map/static/map/` implements that enter/exit. `#map` (`map/static/map/index.html`) is the only map surface.

Smallest check, once that enter/exit is callable from the page: one more `check()` in the existing `py tools/ui_behaviour.py --serve` run, after the load wait. Do not add a second Playwright file.

1. Record `#map` width, `MapApp.layer.buckets.length`, each bucket’s `visible`, and that `HeightView.isOpen()` is false.
2. Enter. Pass only if the leaflet map is not the visible surface, a scene host is, and both are not visible together.
3. Exit. Pass only if `#map` width matches the recorded width within 1 px, the bucket count and `visible` flags match, `HeightView.isOpen()` is false, and the pageerror list is still empty.

Fail any of those; `ui_behaviour.py` already exits non-zero. Until enter/exit exists, this assertion cannot be run, and this ticket does not add it.
