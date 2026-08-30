# Real-client skeleton

Type: grilling
Status: specced
Strand: runtime-limits — Runtime limits
Blocked by: 11, 15
Spec: .scratch/vertical-builds/specs/2-5d-first-cut.md

## Question

[2.5D loop prototype](11-2-5d-loop-prototype.md) is throwaway. [Survey the current map](04-survey-the-current-map.md): wasm32 ~4 GB, ~2 GB standing, vanilla JS, WebGL2 buckets. Where does the first *non-throwaway* Height view run, and what loop proves it?

1. **Additive in the current client** — Leaflet map + Cut strips in the existing page (`map.js` / DOM), sampled from live buckets. Same WASM session. Browser tab is the skeleton; desktop inherits `dist/`.
2. **Sidecar until 3D** — keep Height view off `map.js` until schematic 3D; first ship is still 2.5D but in a parallel HTML. Conflicts with [First observation layer](02-first-observation-layer.md).
3. **Desktop-first** — Tauri only, because clipboard caps / memory. Browser gets Height view later.

The walking skeleton must cross: rectangle → Cut → Z window → occupant set → one existing edit (copy or move) → re-parse. Not a second renderer “to see.” Not named-file export (Horizon, [Transfer artifact](03-transfer-artifact.md)). Not a Three.js scene — that is Horizon ([Survey 3D fork options](17-survey-3d-fork-options.md), [3D scene adapter](18-3d-scene-adapter.md)).

Recommend: **1**. Option 2 reopens the MVP. Option 3 only if the skeleton cannot fit in remaining wasm headroom — measure on a 600k-object save before flipping. [Save integrity gates](15-save-integrity-gates.md) names what “re-parse” must prove.

## Answer

First non-throwaway Height view is **additive in the current tab**: same `index.html`, same WASM session, live buckets. Desktop inherits `dist/`. Not a sidecar HTML, not Tauri-only, not Three.js, not a second renderer “to see.”

New module `height_view.js` (after `selection.js`, before `editor.js`). Chrome is [Height view chrome](13-height-view-chrome.md) as written (L-frame, session flaps, label flip). Cut marks are [Cut elevation marks](19-cut-elevation-marks.md) **projected AABB** (table height / 4 m dashed); richer laterals follow without reopening this ticket — that pipeline is [Survey cut laterals](20-survey-cut-laterals.md). Top-down occupancy drawing stays fog.

Occupants **are** today’s `selected` / `editTargets` — no parallel Build collection. The set is [Volume occupancy](12-volume-occupancy.md): `collectInBox` ∩ global altitude rail ∩ Cut band. The Cut samples **only** that committed XY (∩ rail) from live bucket strides into instanced arrays; no dual JS payload tree; no world-scale second buffer. Measure 600k headroom **after** this exists; flip to desktop-only only if that OOM’s.

Proof walk: rectangle → Cut → band → occupants → existing **Move** (`applyEdits` + re-parse + fresh payload). Copy is `extractClipboard` and does **not** prove re-parse. Height-view paste observation stays [Height-driven edits](14-height-driven-edits.md).

While the rectangle is committed, cherry-pick is **inside the cube only** (remove / re-add). Map: Ctrl+click if the object is in the cube. Cut: click the front mark (19 depth). Outside XY, band, or rail: no-op. A new right-drag **replaces** the isolation rectangle (not additive union). Subtracts persist **by id** while the actor stays in the cube; actors that enter start selected; actors that leave drop from `selected` and from the subtract list. In-cube deselected looks like today (no selection highlight). Adding from *outside* the cube is Horizon (does the rectangle grow as select-all-then-subtract, or is extra-cube a second category?).

**Ctrl+A is unchanged:** today’s `collectInBox` over the whole map (same layer / rail / visibility skips). It does not mean “all occupants of the cube.” That jump is global selection, so the committed rectangle and Cut **dismiss**. Clear still clears selection and tears down the rectangle and Cut.

## Notes

Selection gestures vs earlier tickets (the app already had these; they were not re-grilled in 13):

- [Height view chrome](13-height-view-chrome.md) only specified **without** a rectangle: Ctrl+click / Ctrl+A do not open the Cut. That matches today (object toggle and select-all never start isolation). [Isolation UX](09-isolation-ux.md) stays rectangle-then-Z.
- **With** a rectangle, this ticket owns the rest. Ctrl+click is cube-gated. Ctrl+A is still global `collectInBox(-Infinity, …)` (and the 500k confirm), then isolation ends.
- Today **Ctrl+right-drag** *unions* a second box into Selection. [Height view chrome](13-height-view-chrome.md) opens the Cut on every completed right-drag, and this ticket **replaces** the isolation rectangle. Additive union of two isolation cubes is out while the Cut is up — that is the same “add from outside” Horizon as Ctrl+click outside the cube. Without a Cut, there is no committed cube yet; the first completed right-drag both selects and opens Height view.
- [What is a Build](01-what-is-a-build.md) still names the **volume**. Move/copy use Selection, which may be a subset of occupants. Empty Selection with the rectangle still up is [Height view chrome](13-height-view-chrome.md)’s empty-volume chrome (strips stay), not Clear.
