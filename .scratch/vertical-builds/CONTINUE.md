# Continue Vertical Build Transfer

This map is the **app campaign**, not “write a spec then stop.” Feature slug: `vertical-builds`.
Tracker: `.scratch/vertical-builds/`. Glossary: `CONTEXT.md` at repo root. Product goal: `OBJECTIVE.md`.
Talk to Anto in Spanish; tickets stay in English. Do not ask whether the app should be an editor — it already is.

Scheme and Bearing on `map.md` are the campaign sketch; they are not graph nodes. The eight features are not exhaustive — unnamed sections graduate when they can be named. Resolved-ticket count is **not** app readiness.

Do **not** open a second Wayfinder map until this one is specced (or a ticket is explicitly ruled into a new destination).

## Open a new chat

Paste one block. Read only what that ambit names. One HITL ticket per session. After any tracker write: Wayfinder Graph event (`chart` / `resolve` / `graduate` / `specced` / `asset`).

```
Continúa Vertical Build Transfer (wayfinder).
Ambit: <name below>
Lee `.scratch/vertical-builds/CONTINUE.md`, `OBJECTIVE.md`, `map.md`, `CONTEXT.md`, and only the ticket named for that ambit.
Do not implement sav_core editor internals. Do not weld belts. Do not geometric-split chains.
```

## Ambits (different chats, different jobs)

### 1. Chart the Next cluster — done 2026-08-15

Tickets 12–16 exist. Do not re-chart Next cluster. Do not invent tickets to fill remaining Scheme arms (Visual presentation, Browser and desktop, Build package file). Do not `/to-spec`. 12 and 15 are resolved; graduate remaining fog only when a question is sharp. Cut elevation marks (19) graduated after 11.

### 2. Height view chrome — done 2026-08-20

- **Ticket:** [Height view chrome](issues/13-height-view-chrome.md) is resolved. Do not re-grill dock, two Z widgets, or A↔A′ / B↔B′ flip chrome.
- **Predecessor:** [2.5D loop prototype](issues/11-2-5d-loop-prototype.md) is resolved. [Cut elevation marks](issues/19-cut-elevation-marks.md) is resolved.
- **Job:** [Real-client skeleton](issues/16-real-client-skeleton.md) is resolved. Next HITL in this strand is **implementing** that contract in the current client (`height_view.js`), not another grill. Graduate Visual presentation only if a new drawing question is sharp (top-down occupancy still fog).
- **Must not:** 3D camera, Three.js, belt splitting, sav_core mutation, named-file export, claiming the first ship is done because 16 is resolved.

### 3. Parallel Next cluster — 14 (15 resolved)

- **Tickets:** [Height-driven edits](issues/14-height-driven-edits.md) (unblocked). Occupancy ([12](issues/12-volume-occupancy.md)) and [Save integrity gates](issues/15-save-integrity-gates.md) are resolved.
- **Job (14):** Open — not a 3-way close. Isolation Cut (19 XY clip) is selection; paste-time observation (exterior / background on the projection, attenuated payload) is unspecified and in this ticket. Blind paste is out as a first-ship “done.” Study before origin-Z math. Copy/paste stay one loop; clipboard vs file is Build package.
- **Integrity contract (15):** `sav_core` CI isolate+copy/paste/delete/undo with occupant snapshot; first-ship in-game load is human smoke. Do not implement that CI in a 14 chat.
- **Must not:** start from [Relocate semantics](issues/07-relocate-semantics.md) as if Height-view paste Z were specified. Do not mix 13 into these chats.

### 4. Browser and desktop / Runtime limits / Visual presentation / Build package

- **Ticket:** [Real-client skeleton](issues/16-real-client-skeleton.md) is resolved: additive in the tab; Height view is not a browser/desktop split. Integrity “re-parse” in the UI walk is existing Move; CI remains the 15 contract.
- **Job:** Implementation of 16 in a dedicated chat. Chart further only when that work makes a question sharp (wasm headroom numbers, named-file). Adding from outside the cube stays Horizon fog.
- **Must not:** build a second renderer “to see”; do not vendor Coffee Stain art; do not re-grill 16’s host.

### 5. Schematic 3D — Horizon; do not mix with Next cluster

- **Tickets:** [Schematic 3D bar](issues/08-schematic-3d-bar.md) (rank the bar); [3D scene adapter](issues/18-3d-scene-adapter.md) (blocked by 08 — WebGL2 vs vanilla Three.js, not R3F).
- **Research:** [Survey 3D fork options](issues/17-survey-3d-fork-options.md) / [research/3d-fork-options.md](research/3d-fork-options.md). Do not redo.
- **Job:** Rank what of `assets/02-schematic-3d-final.png` is this app’s later Height view / Visual presentation / Edit controls. That 3D **is** the product destination — same editor, after the Cut. Peer fact: moritz-h already shows Z and does not transfer. Investigation: semantic proxies + instancing yes; 3D-*first* sprints / Blueprint Lab / FModel-in-git / R3F no.
- **Must not:** build a 3D renderer in that chat; do not reopen Height view as the first ship; do not treat 3D as a different app.

### 6. Spec close — only when Next cluster is decided and Horizon is ranked or left fog

- **Job:** `/to-spec`. First vertical cut vs later. Mark the map `specced` only for the *specified* slice — not because “most tickets are resolved.”
- **Must not:** start a full 3D ship in the same chat.

## Already decided (do not re-grill)

Build = XY+Z volume. MVP Height view = top-down + A–A′ / B–B′, one Z window. Isolation = rectangle then Z. Occupants = today’s `collectInBox` (layer filters, no `hiddenClasses` expansion); global altitude caps the set; Cut Z band peels inside that cap; straddlers silent whole-in. Height view chrome = L-frame overlay + session flaps switch; flip via A/A′ and B/B′ labels; no rectangle → no Cut. First non-throwaway Height view is additive in the current tab (`height_view.js`); proof walk is existing Move; cherry-pick only inside the cube; Ctrl+A stays today’s global select and dismisses the Cut. Integrity = `sav_core` CI snapshot after isolate+copy/paste/delete/undo; in-game load is first-ship smoke; wasm OOM is not corruption. Schematic 3D stays in this destination as later observation. Build package = clipboard + named file, same bytes. Relocate = existing copy/paste; no weld; no chain surgery. Constructor and photorealistic 3D are out.

Surveys (do not redo): [current map](research/current-map.md), [peer tools](research/peer-tools.md), [3D fork options](research/3d-fork-options.md).

## Fog — which Scheme feature owns it

| Fog | Feature | Cluster |
| --- | --- | --- |
| Occupancy drawing, extrusion vs flat, ghosts on the top-down map | Visual presentation | After [Cut elevation marks](issues/19-cut-elevation-marks.md) |
| Occupancy summary before copy (counts, types; no straddler warning) | Volume selection + Edit controls | Horizon unless 14 needs it |
| Browser vs desktop files/caps/memory (Height view is in the page) | Browser and desktop | Horizon |
| Cut-buffer / 3D headroom on a 600k save | Runtime limits | After 16 is in the client |
| Add-from-outside-the-cube (grow rectangle vs second category) | Volume selection | Horizon |
| Named-file caps, extension, import | Build package | Horizon |
| Schematic 3D camera / Leaflet vs replace / gizmos / terrain / opacity | Height view + Visual presentation + Edit controls | Horizon ([Schematic 3D bar](issues/08-schematic-3d-bar.md)) |
| NormalizedWorld vs bucket strides; GPU picking / chunks / LOD | Runtime limits + Visual presentation | After 08+18 |
| Lookalike kit vs boxes; UnknownProxy | Visual presentation | After 08 |
| Clustering vs manual set | Volume selection | Horizon |
| Two-save workspace vs sequential load | Browser and desktop | Horizon |
| Local FModel extract after schematic (never in git) | Visual presentation | After schematic ships |
| Sections not yet named | (graduate when sharp) | — |

## Landmines

- wasm32 ~4 GB, ~2 GB standing on a 600k save. Second buffer = instanced typed arrays.
- `z` is filter + depth ordinal, not a camera.
- Hidden objects are not in today’s selection.
- Belt with any vertex in the rectangle copies as a whole actor.
- `docs/chained-belt-delete.md`: do not synthesize `FGConveyorChainActor`.
- Browser clipboard caps 50k / 150k / 200 MB; desktop uncapped.
- AGPL-3.0; no Coffee Stain art in git; save never leaves the machine.
- Vanilla JS, no bundler, no R3F/React store for the map. Vanilla Three.js is still allowed later.
- moritz-h is GPLv3: reuse ideas, not a code drop, unless an AGPL combination is an explicit later decision.
- 3D-*first* sprints, `.sbp` Blueprint Lab, and FModel in git are out. Schematic 3D itself is this app’s later body.
