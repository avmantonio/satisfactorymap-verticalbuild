# Continue Vertical Build Transfer

**Grilling agreement (2026-11-26):** Q1–Q4 approved and recorded on 42/43/44 (unknown-scale origin admission and uncertainty), 48/50/61 (provisional forms with research/refinement still open), 33/45 (retained 2D state) and 51 (visual Z inside the loaded region). Precedence: unknown scale overrides every volumetric approximation; visual Z never expands or implicitly modifies the loaded volume. Tickets 59 and 61 remain open.


**Pending work correction (2026-11-26):** [59 — Modded save](issues/59-modded-save.md) is open: no real modded-save test has passed. [61 — Free-form and missing 3D shapes](issues/61-free-form-geometry.md) is open for investigation, initial honest simplified forms and tracked refinement with original simplified models. These are deferred work, not completed by the strand specs.

This map is the **app campaign**, not “write a spec then stop.” Feature slug: `vertical-builds`.
Tracker: `.scratch/vertical-builds/`. Glossary: `CONTEXT.md` at repo root. Product goal: `OBJECTIVE.md`.
Talk to Anto in Spanish; tickets stay in English. Do not ask whether the app should be an editor — it already is.

Scheme on `map.md` defines graph strands; ticket groups are branch nodes and individual tickets are theme nodes. Themes must not carry Spec or Supporting spec metadata. Put per-ticket traceability links on the parent branch; attach primary specs only to a branch or strand whose declared scope the spec covers. Bearing orients the campaign but is not a node. The Scheme is not exhaustive — unnamed sections graduate when they can be named. Resolved-ticket count is **not** app readiness.

Do **not** open a second Wayfinder map until this one is specced (or a ticket is explicitly ruled into a new destination). The **2.5D first cut** is specced ([specs/2-5d-first-cut.md](specs/2-5d-first-cut.md)); the campaign (schematic 3D, named-file polish, remaining fog) is not. Keep this map.

## Open a new chat

**Refresh the star map:** after tracker mutations, validate Model 2 with Wayfinder Graph, then fire the chart event for vertical-builds. The chart rebuilds the projection from the tracker. The six viewer-strand links in Scheme are partial-scope references; do not mark whole strands specced from those links.

Paste one block. Read only what that ambit names. One HITL ticket per session. After any tracker write: Wayfinder Graph event (`chart` / `resolve` / `graduate` / `specced` / `asset`).

A **gate is not a cluster.** Session packet `Next cluster` names the parallel tickets on `map.md` Bearing. Never put Baseline gate, Feasibility gate, or Contract gate in that field. A gate is one HITL ticket when its inputs are already closed.

```
Continúa Vertical Build Transfer (wayfinder).
Ambit: <name below>
Lee `.scratch/vertical-builds/CONTINUE.md`, `OBJECTIVE.md`, `map.md`, `CONTEXT.md`, and only the ticket named for that ambit.
Do not implement sav_core editor internals. Do not weld belts. Do not geometric-split chains.
```

Open next: compose the global regional-viewer spec from the [six consolidated main-strand specs](specs/viewer-spec-index.md#main-strand-specifications) and [readiness review](specs/viewer-readiness-review.md). The 28 per-ticket documents are preserved as supporting traceability. Make the listed integration definitions concrete without reopening settled decisions. Then implement 60; only the integrated viewer can be exercised by acceptance checks 54–56. Do not begin with a validation-only session against the standalone probes.

**Spec package (2026-11-25):** settled 3D ticket decisions are consolidated into Regional viewer, Volume selection, Visual presentation, Runtime limits, Browser and desktop, and Save integrity specs. All earlier per-ticket documents are retained, including supporting evidence/gates, the later editor horizon (08), and the explicit missing-modded-fixture record (59). Whole strands remain open for their later campaign work. The global viewer spec, implementation 60, acceptance 54–56 and delivery 58 are not completed by this documentation work. Follow the package's precedence rules where older notes mention 14,000, whole-save 3D, two ceilings, Height-view floored geometry or an open modded-save task.

## Runtime test (user)

Not CI. Human smoke for ticket 16 one-axis edit + Move proof.

1. Serve `dist/` at **http://127.0.0.1:8791/** (`python tools/serve_site.py`). After editing `map/static/map/*`, copy those files into `dist/` or run `python tools/build_site.py` so the served site picks them up. Only one `serve_site` may bind the port on Windows.
2. Load a save: drop a local `.sav`, or `map/uploads/All_080726-163150.sav` (after `python tools/fetch_test_saves.py`; gitignored). Hard-refresh the tab.
3. **Open Height view:** right-drag a rectangle over a factory. Side-panel Cuts (A–A′ top, B–B′ bottom) appear. Empty volume still keeps the strips.
4. **Map-edge (XY):** drag one isolation-bar on the map (east/west or north/south). Opposite side stays. Corners do not start a two-axis drag. Occupants/peel update **on release**, not while dragging. The Z band does **not** reset.
5. **Cut vertical (XY):** drag the A / A′ bar on A–A′ (X) or B / B′ on B–B′ (Y). Same contract: one axis, opposite stays, Z kept. Cut **band** (handles + body) is Z peel, not XY — occupancy updates on release.
6. **Move proof:** with occupants selected, click **Move**, click the map to place. Existing editor runs (`applyEdits` + re-parse + fresh payload). Copy is allowed; it does not prove re-parse.
7. **Flaps:** switch Side panel → Flaps on Height-view chrome (not the tool dock). Repeat a map-edge drag and a Cut vertical. New rectangle keeps the session preference.

**Pass:** one axis at a time; peel/occupancy after pointerup; Move still commits; side panel and flaps both work. **Still open in 16:** table height (not on the payload — 4 m dashed). **Not this cut:** 14 Relocate on place; 15 isolate+copy/paste/delete/undo CI.

## Ambits (different chats, different jobs)

### 1. Chart the Next cluster — done 2026-08-15

Tickets 12–16 exist. Do not re-chart Next cluster. Do not invent tickets to fill remaining Scheme arms (Visual presentation, Browser and desktop, Build package file). Do not `/to-spec`. 12, 14, and 15 are resolved; graduate remaining fog only when a question is sharp. Cut elevation marks (19) graduated after 11.

### 2. Height view chrome — done 2026-08-20

- **Ticket:** [Height view chrome](issues/13-height-view-chrome.md) is specced. Do not re-grill dock, two Z widgets, or A↔A′ / B↔B′ flip chrome. Placement of the Cuts was amended 2026-09-01 after the walking skeleton: default is the docked side panel (stacked halves), flaps stay as a session mode, L-frame overlay is out.
- **Predecessor:** [2.5D loop prototype](issues/11-2-5d-loop-prototype.md) is specced. [Cut elevation marks](issues/19-cut-elevation-marks.md) is specced.
- **Job:** [Real-client skeleton](issues/16-real-client-skeleton.md) implementation **started** in the current client (`map/static/map/height_view.js`): rectangle → side-panel/flaps Cuts, Cut band peel, AABB marks, Move still the proof. Not shipped. Perf A–E landed. One-axis rectangle edit is in (map-edge + matching Cut vertical; Z band kept). Table height is not on the payload — 4 m dashed still. Worker / 600k measure is research stage F. Human smoke: [Runtime test (user)](#runtime-test-user).
- **Must not:** 3D camera, Three.js, belt splitting, sav_core mutation, named-file export, claiming the first ship is done because 16 is specced. Do not reopen [Survey cut laterals](issues/20-survey-cut-laterals.md). Do not fuse [Height-driven edits](issues/14-height-driven-edits.md) into the skeleton chat.

### 3. Parallel Next cluster — 14 done 2026-08-30 (15 resolved)

- **Tickets:** [Height-driven edits](issues/14-height-driven-edits.md) is resolved (second implementation thread after 16). Occupancy ([12](issues/12-volume-occupancy.md)) is specced. [Save integrity gates](issues/15-save-integrity-gates.md) stays resolved (first-ship CI, not this cut).
- **Job (14):** Spec only in that chat — implement relocate observation in a dedicated client chat, not a re-grill. Isolation Cut remains 19’s XY clip; placing retargets the same Height-view Cuts to the ghost (dest + pad, attenuated payload, floor of travelers, existing panel, no band drag).
- **Integrity contract (15):** `sav_core` CI isolate+copy/paste/delete/undo with occupant snapshot; first-ship in-game load is human smoke. Do not implement that CI in a 14 chat.
- **Must not:** re-grill 14; start from [Relocate semantics](issues/07-relocate-semantics.md) as if Height-view paste Z were unspecified; mix 13 chrome into a 14 re-open.

### 4. Browser and desktop / Runtime limits / Visual presentation / Build package

- **Ticket:** [Real-client skeleton](issues/16-real-client-skeleton.md) is specced: additive in the tab; Height view is not a browser/desktop split. Integrity “re-parse” in the UI walk is existing Move; CI remains the 15 contract.
- **Job:** Implementation of 16 against [specs/2-5d-first-cut.md](specs/2-5d-first-cut.md) is **in progress** in this tab (`height_view.js`) — walking skeleton + perf A–E + one-axis edge edit, not closed. Chart further only when that work makes a question sharp (wasm headroom numbers, named-file). Adding from outside the cube stays Horizon fog.
- **Must not:** build a second renderer “to see”; do not vendor Coffee Stain art; do not re-grill 16’s host.

### 5. Regional viewer — contract cluster (Feasibility gate is GO, not a cluster)

[Baseline gate](issues/34-baseline-gate.md), [Feasibility gate](issues/41-feasibility-gate.md), [Scene contract](issues/42-scene-contract.md), [Region occupants](issues/43-region-occupants.md), [Budget precheck](issues/44-budget-precheck.md), [Exclusive 3D mode](issues/45-exclusive-3d-mode.md), and [Contract gate](issues/46-contract-gate.md) are resolved. Feasibility was **one HITL** over the six closed probes, not a cluster. **GO**: checkable pose + traces + honest reserves on the measured MX110/Electron environments; Intel iGPU and 600k wasm defer to [Stress trial](issues/55-stress-trial.md). Do not re-grill the gate. Do not emit it as Next cluster. Do not reopen Budget precheck, Region occupants, Scene contract, Contract gate, Baseline gate, fase 0, las seis pruebas, Three.js vs WebGL2, or Feasibility gate.

- **Next ticket:** [Implement the regional 3D viewer](issues/60-regional-viewer-implementation.md).
- **After implementation:** [Geometry check](issues/54-geometry-check.md), [Stress trial](issues/55-stress-trial.md), and [Parity trial](issues/56-parity-trial.md) are acceptance checks blocked by ticket 60. [Useful viewer](issues/24-3d-observation.md) and [Controlled release](issues/57-controlled-release.md) are resolved. [Viewer delivery](issues/58-viewer-delivery.md) remains downstream of those checks.
- **Beside, not blocking:** [Terrain study](issues/29-simplified-map.md) (`/research`), [Modded save](issues/59-modded-save.md). Do not put ground on the viewer path.
- **After contract:** [Contract gate](issues/46-contract-gate.md) → [Implement the regional 3D viewer](issues/60-regional-viewer-implementation.md) → acceptance checks 54–56 → [Viewer delivery](issues/58-viewer-delivery.md). Edits start at [Scene picking](issues/26-scene-picking.md) only after delivery.
- **Already on the route:** the six probes, [Reserve volumes](issues/50-reserve-volumes.md), [Scene contract](issues/42-scene-contract.md) (regional 3D extract, 2D payload unchanged, budget gate before expensive buffers), [Region occupants](issues/43-region-occupants.md) (isolation volume, conservative AABB, clipped paths, filters hide only), [Budget precheck](issues/44-budget-precheck.md) (admission count, refuse > 8,000 before buffers/replace-2D, same cap wasm and Tauri), and [Schematic 3D bar](issues/08-schematic-3d-bar.md) (later editor-shaped picture). [Cost probe](issues/25-scene-budget.md) refuses above **8,000** occupants. [Renderer probe](issues/18-3d-scene-adapter.md) already picked vanilla Three.js InstancedMesh.
- **Must not:** implement the regional viewer in a contract chat; reopen Budget precheck, Region occupants, Scene contract, the six probes, or the renderer pick; claim Exclusive 3D mode plus another ticket in one session; treat this GO as a ship; require terrain; steal enter/exit chrome into a closed budget ticket.

### 6. Survey cut laterals — done 2026-08-27

- **Ticket:** [Survey cut laterals](issues/20-survey-cut-laterals.md) is resolved. Findings: [research/cut-laterals.md](research/cut-laterals.md).
- **Job:** Do not redo. Table AABB is usable now; SVG/mesh laterals have no producer. Next HITL in this strand is implementing 16 (`height_view.js`) with projected AABB, not a glyph catalog.
- **Must not:** author a glyph catalog; vendor Coffee Stain art into git; reopen [Cut elevation marks](issues/19-cut-elevation-marks.md) drawing contract; pick the laterals pipeline; treat menu icons or SCIM models as elevations.

### 7. Spec close — done 2026-08-30

- **Spec:** [specs/2-5d-first-cut.md](specs/2-5d-first-cut.md) (`Status: ready-for-agent`). Slice specced (not the campaign, not 3D): [2.5D loop prototype](issues/11-2-5d-loop-prototype.md), [Volume occupancy](issues/12-volume-occupancy.md), [Height view chrome](issues/13-height-view-chrome.md), [Real-client skeleton](issues/16-real-client-skeleton.md), [Cut elevation marks](issues/19-cut-elevation-marks.md).
- **Job:** Continue **implement 16** (`height_view.js`) against that spec. Walking skeleton `a5e93d1`; perf A–E `47e53f9`; one-axis edge edit on this branch. Table height stays open (not on the payload). [Height-driven edits](issues/14-height-driven-edits.md) is a dedicated client chat *after* the skeleton — same first-ship, not fused into cut 1.
- **Must not:** start a full 3D ship in an implement-16 chat; treat specced 16 as first ship done; reopen 13/16/19/20/08/14 as grills; mark root/the whole map specced.

## Already decided (do not re-grill)

Build = XY+Z volume. MVP Height view = top-down + A–A′ / B–B′, one Z window. Isolation = rectangle then Z. Occupants = today’s `collectInBox` (layer filters, no `hiddenClasses` expansion); global altitude caps the set; Cut Z band peels inside that cap; straddlers silent whole-in. Height view chrome = docked side panel (A–A′ top half, B–B′ bottom half) + session flaps switch; L-frame overlay dropped after the walking skeleton; flip via A/A′ and B/B′ labels; no rectangle → no Cut. First non-throwaway Height view is additive in the current tab (`height_view.js`); proof walk is existing Move; cherry-pick only inside the cube; Ctrl+A stays today’s global select and dismisses the Cut. Integrity = `sav_core` CI snapshot after isolate+copy/paste/delete/undo; in-game load is first-ship smoke; wasm OOM is not corruption. Height-driven relocate = same Height-view Cuts on move/paste, retargeted to the ghost: dest + 20%/8–50 m pad, payload attenuated, Z = floor of travelers (not bbox center), existing panel, click still commits move, no Cut-band drag. Schematic 3D bar is the later editor-shaped picture (gizmos, rest-of-save, interior opacity, nav cube, two ceilings) and is not the first delivery. [Feasibility gate](issues/41-feasibility-gate.md) is GO: checkable relations are pose + traces + honest reserves, not true hulls; the measured MX110/Electron environments pass; Intel iGPU and 600k wasm defer to Stress trial; terrain is not required; a region that does not hold changes technology (inside vanilla Three.js InstancedMesh), catalog, or budget before contract. [Scene contract](issues/42-scene-contract.md): separate regional 3D extract of save-native pose, honest sizeKind, and path-actor traces; 2D payload unchanged; expensive buffers wait on Budget precheck. [Region occupants](issues/43-region-occupants.md): 3D occupants are the Height-view isolation volume, not Selection; conservative AABB; paths clip at the bound; filters hide only; expanding the volume needs a new enter. [Budget precheck](issues/44-budget-precheck.md): admission count of that set; refuse if > 8,000 before 3D buffers or replacing 2D; 8,000 enters; same cap on wasm and Tauri; UI.dialog to shrink XY or Cut Z. Settled viewer directives live as the Answer on the ticket they govern: applied state only, region rather than the selection, orbit, honest proxies, hard budget, one shared frontend, terrain not required. Fly, animated flow, collision certification, LOD, and a desktop-only engine are out of that delivery. Build package = clipboard + named file, same bytes. Relocate = existing copy/paste; no weld; no chain surgery. Constructor and photorealistic 3D are out.

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
| WASD fly; in-world labels; exact orbit chrome; wall transparency; per-object inspection | Height view + Visual presentation | After the viewer contract |
| Edit-cycle gizmos, rest-of-save, nav cube, interior opacity | Edit controls | After [Viewer delivery](issues/58-viewer-delivery.md) |
| Terrain mesh integration (switchable, not required) | Visual presentation | After [Terrain study](issues/29-simplified-map.md), and only if funded |
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
- 3D-*first* sprints, `.sbp` Blueprint Lab, and FModel in git are out. The first 3D body is the regional read-only viewer, not a second editor.
