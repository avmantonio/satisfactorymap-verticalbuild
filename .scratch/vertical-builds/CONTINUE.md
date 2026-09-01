# Continue Vertical Build Transfer

This map is the **app campaign**, not “write a spec then stop.” Feature slug: `vertical-builds`.
Tracker: `.scratch/vertical-builds/`. Glossary: `CONTEXT.md` at repo root. Product goal: `OBJECTIVE.md`.
Talk to Anto in Spanish; tickets stay in English. Do not ask whether the app should be an editor — it already is.

Scheme and Bearing on `map.md` are the campaign sketch; they are not graph nodes. The eight features are not exhaustive — unnamed sections graduate when they can be named. Resolved-ticket count is **not** app readiness.

Do **not** open a second Wayfinder map until this one is specced (or a ticket is explicitly ruled into a new destination). The **2.5D first cut** is specced ([specs/2-5d-first-cut.md](specs/2-5d-first-cut.md)); the campaign (schematic 3D, named-file polish, remaining fog) is not. Keep this map.

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

Tickets 12–16 exist. Do not re-chart Next cluster. Do not invent tickets to fill remaining Scheme arms (Visual presentation, Browser and desktop, Build package file). Do not `/to-spec`. 12, 14, and 15 are resolved; graduate remaining fog only when a question is sharp. Cut elevation marks (19) graduated after 11.

### 2. Height view chrome — done 2026-08-20

- **Ticket:** [Height view chrome](issues/13-height-view-chrome.md) is specced. Do not re-grill dock, two Z widgets, or A↔A′ / B↔B′ flip chrome. Placement of the Cuts was amended 2026-09-01 after the walking skeleton: default is the docked side panel (stacked halves), flaps stay as a session mode, L-frame overlay is out.
- **Predecessor:** [2.5D loop prototype](issues/11-2-5d-loop-prototype.md) is specced. [Cut elevation marks](issues/19-cut-elevation-marks.md) is specced.
- **Job:** [Real-client skeleton](issues/16-real-client-skeleton.md) implementation **started** in the current client (`map/static/map/height_view.js`): rectangle → side-panel/flaps Cuts, Cut band peel, dashed AABB marks, Move still the proof. Not shipped. Next: one-axis rectangle edit, then remaining 16 polish. Cut marks in that walk are projected AABB.
- **Must not:** 3D camera, Three.js, belt splitting, sav_core mutation, named-file export, claiming the first ship is done because 16 is specced. Do not reopen [Survey cut laterals](issues/20-survey-cut-laterals.md). Do not fuse [Height-driven edits](issues/14-height-driven-edits.md) into the skeleton chat.

### 3. Parallel Next cluster — 14 done 2026-08-30 (15 resolved)

- **Tickets:** [Height-driven edits](issues/14-height-driven-edits.md) is resolved (second implementation thread after 16). Occupancy ([12](issues/12-volume-occupancy.md)) is specced. [Save integrity gates](issues/15-save-integrity-gates.md) stays resolved (first-ship CI, not this cut).
- **Job (14):** Spec only in that chat — implement relocate observation in a dedicated client chat, not a re-grill. Isolation Cut remains 19’s XY clip; placing retargets the same Height-view Cuts to the ghost (dest + pad, attenuated payload, floor of travelers, existing panel, no band drag).
- **Integrity contract (15):** `sav_core` CI isolate+copy/paste/delete/undo with occupant snapshot; first-ship in-game load is human smoke. Do not implement that CI in a 14 chat.
- **Must not:** re-grill 14; start from [Relocate semantics](issues/07-relocate-semantics.md) as if Height-view paste Z were unspecified; mix 13 chrome into a 14 re-open.

### 4. Browser and desktop / Runtime limits / Visual presentation / Build package

- **Ticket:** [Real-client skeleton](issues/16-real-client-skeleton.md) is specced: additive in the tab; Height view is not a browser/desktop split. Integrity “re-parse” in the UI walk is existing Move; CI remains the 15 contract.
- **Job:** Implementation of 16 against [specs/2-5d-first-cut.md](specs/2-5d-first-cut.md) is **in progress** in this tab (`height_view.js`) — walking skeleton on the client, not closed. Chart further only when that work makes a question sharp (wasm headroom numbers, named-file). Adding from outside the cube stays Horizon fog.
- **Must not:** build a second renderer “to see”; do not vendor Coffee Stain art; do not re-grill 16’s host.

### 5. Schematic 3D — Horizon; do not mix with Next cluster

- **Tickets:** [Schematic 3D bar](issues/08-schematic-3d-bar.md) is **resolved**. Next HITL is [3D scene adapter](issues/18-3d-scene-adapter.md) (unblocked — WebGL2 vs vanilla Three.js, not R3F).
- **Research:** [Survey 3D fork options](issues/17-survey-3d-fork-options.md) / [research/3d-fork-options.md](research/3d-fork-options.md). Do not redo.
- **Job (18):** How the ranked bar attaches without a second object tree or a bundler. Do not re-rank 08 (lookalikes, orbit, dock mode, one Z window, two render ceilings).
- **Must not:** build a 3D renderer in an 08 chat; do not reopen Height view as the first ship; do not treat 3D as a different app; do not re-grill the bar.

### 6. Survey cut laterals — done 2026-08-27

- **Ticket:** [Survey cut laterals](issues/20-survey-cut-laterals.md) is resolved. Findings: [research/cut-laterals.md](research/cut-laterals.md).
- **Job:** Do not redo. Table AABB is usable now; SVG/mesh laterals have no producer. Next HITL in this strand is implementing 16 (`height_view.js`) with projected AABB, not a glyph catalog.
- **Must not:** author a glyph catalog; vendor Coffee Stain art into git; reopen [Cut elevation marks](issues/19-cut-elevation-marks.md) drawing contract; pick the laterals pipeline; treat menu icons or SCIM models as elevations.

### 7. Spec close — done 2026-08-30

- **Spec:** [specs/2-5d-first-cut.md](specs/2-5d-first-cut.md) (`Status: ready-for-agent`). Slice specced (not the campaign, not 3D): [2.5D loop prototype](issues/11-2-5d-loop-prototype.md), [Volume occupancy](issues/12-volume-occupancy.md), [Height view chrome](issues/13-height-view-chrome.md), [Real-client skeleton](issues/16-real-client-skeleton.md), [Cut elevation marks](issues/19-cut-elevation-marks.md).
- **Job:** Continue **implement 16** (`height_view.js`) against that spec. Walking skeleton is on the tab (uncommitted until asked); one-axis edge edit and remaining 16 polish still open. [Height-driven edits](issues/14-height-driven-edits.md) is a dedicated client chat *after* the skeleton — same first-ship, not fused into cut 1.
- **Must not:** start a full 3D ship in an implement-16 chat; treat specced 16 as first ship done; reopen 13/16/19/20/08/14 as grills; mark root/the whole map specced.

## Already decided (do not re-grill)

Build = XY+Z volume. MVP Height view = top-down + A–A′ / B–B′, one Z window. Isolation = rectangle then Z. Occupants = today’s `collectInBox` (layer filters, no `hiddenClasses` expansion); global altitude caps the set; Cut Z band peels inside that cap; straddlers silent whole-in. Height view chrome = docked side panel (A–A′ top half, B–B′ bottom half) + session flaps switch; L-frame overlay dropped after the walking skeleton; flip via A/A′ and B/B′ labels; no rectangle → no Cut. First non-throwaway Height view is additive in the current tab (`height_view.js`); proof walk is existing Move; cherry-pick only inside the cube; Ctrl+A stays today’s global select and dismisses the Cut. Integrity = `sav_core` CI snapshot after isolate+copy/paste/delete/undo; in-game load is first-ship smoke; wasm OOM is not corruption. Height-driven relocate = same Height-view Cuts on move/paste, retargeted to the ghost: dest + 20%/8–50 m pad, payload attenuated, Z = floor of travelers (not bbox center), existing panel, click still commits move, no Cut-band drag. Schematic 3D bar (later observation): tool-dock mode, lookalikes, orbit, synced filters, interior toggle, gizmos XYZ+rotate, one Z window, optional strips, filtered save with cheaper rest-of-save, browser 3D cap below desktop. Build package = clipboard + named file, same bytes. Relocate = existing copy/paste; no weld; no chain surgery. Constructor and photorealistic 3D are out.

Surveys (do not redo): [current map](research/current-map.md), [peer tools](research/peer-tools.md), [3D fork options](research/3d-fork-options.md), [cut laterals](research/cut-laterals.md).

## Fog — which Scheme feature owns it

| Fog | Feature | Cluster |
| --- | --- | --- |
| Occupancy drawing, extrusion vs flat, ghosts on the top-down map | Visual presentation | After [Cut elevation marks](issues/19-cut-elevation-marks.md) |
| Occupancy summary before copy (counts, types; no straddler warning) | Volume selection + Edit controls | Horizon |
| Drag placement Cut band to edit dest Z (landing gizmo) | Edit controls | After [Height-driven edits](issues/14-height-driven-edits.md) |
| Browser vs desktop files/caps/memory (Height view is in the page) | Browser and desktop | Horizon |
| Cut-buffer / 3D headroom on a 600k save | Runtime limits | After 16 is in the client |
| Add-from-outside-the-cube (grow rectangle vs second category) | Volume selection | Horizon |
| Named-file caps, extension, import | Build package | Horizon |
| 3D scene adapter (WebGL2 vs Three.js); NormalizedWorld; GPU picking / chunks / cheaper rest-of-save; exact 3D caps | Runtime limits + Visual presentation | [3D scene adapter](issues/18-3d-scene-adapter.md) |
| Terrain low-poly; WASD fly; in-world labels | Height view + Visual presentation | After schematic |
| UnknownProxy | Visual presentation | After 08 |
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
