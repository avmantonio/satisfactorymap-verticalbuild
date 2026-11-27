# Vertical Build Transfer

Model: 2
**Grilling agreement (2026-11-26):** Q1–Q4 approved and recorded on 42/43/44 (unknown-scale origin admission and uncertainty), 48/50/61 (provisional forms with research/refinement still open), 33/45 (retained 2D state) and 51 (visual Z inside the loaded region). Precedence: unknown scale overrides every volumetric approximation; visual Z never expands or implicitly modifies the loaded volume. Tickets 59 and 61 remain open.


**Pending work correction (2026-11-26):** [59 — Modded save](issues/59-modded-save.md) is open: no real modded-save test has passed. [61 — Free-form and missing 3D shapes](issues/61-free-form-geometry.md) is open for investigation, initial honest simplified forms and tracked refinement with original simplified models. These are deferred work, not completed by the strand specs.

Label: `wayfinder:map`

## Destination

A shipped save editor that isolates a volume and edits/transfers it with real Z. The first 3D cut is a temporary read-only regional viewer of what is already applied; edits in that view come after it ships. Browser and desktop share one frontend. The `.sav` stays on device.

## Notes

**Model 2 organization:** Scheme entries are strands. Ticket files are organized as Level: branch / Kind: group parents and Level: theme / Kind: ticket children. Themes carry no Spec or Supporting spec metadata; per-ticket traceability is listed on parent branches, and primary specs are attached only to branches or strands whose declared scope they cover. The six viewer-strand documents linked in Scheme describe the first viewer slice; they are references, not claims that the full campaign strands are specced. After tracker edits, validate with Wayfinder Graph and fire the chart event to rebuild this map projection.

**3D strand specs prepared (2026-11-25):** [main strand index](specs/viewer-spec-index.md) and [readiness review](specs/viewer-readiness-review.md). Six main viewer strands have consolidated specs, synthesizing 28 previously resolved tickets. Earlier per-ticket specs remain as supporting documents. These partial viewer specs do not close whole strands. The subsequent [global integration closure](specs/viewer-integration-spec.md) now fixes exact interfaces, wire format, retained state/lifetime and initial visual coverage, with an [implementation plan](plans/regional-viewer/PLAN_PHASE_1_core-extract.md) and [exit criteria](specs/viewer-exit-criteria.md). Implementation, acceptance and delivery remain open. Node 59 records a missing modded fixture, not a compatibility pass.

HITL uses grilling and domain-modeling. Tickets stay in English; talk to Anto in Spanish. Product goal: [OBJECTIVE.md](OBJECTIVE.md). Sessions: [CONTINUE.md](CONTINUE.md). Glossary: `CONTEXT.md`.

**First 2.5D cut specced** (2026-08-30): [specs/2-5d-first-cut.md](specs/2-5d-first-cut.md) — Height view on the current tab (chrome 13, occupancy 12, AABB marks 19, loop from 11, Move proof). Do not treat that slice as first ship done. **Bearing moved 2026-11-23:** the first 3D cut follows the regional read-only roadmap. A directive that was already decided is the `Answer` on the ticket it governs; that ticket stays open only for what the directive left unresolved. Edits stay after [Viewer delivery](issues/58-viewer-delivery.md). Named-file polish and remaining fog stay on this map.

**Scheme defines the campaign strands, not process buckets.** Bearing orients; it is not a checkpoint. Missing sections will graduate into fog or tickets when they can be named — do not treat the Scheme strands as exhaustive, and do not treat resolved-ticket count as “app ready.” Closed tickets are product contracts, not a ship.

**A gate is not a cluster.** Next cluster is the parallel tickets that feed a later gate. A session packet must never name Baseline gate, Feasibility gate, or Contract gate as Next cluster. A takeable gate is one HITL ticket after its inputs are closed, not a campaign. [Feasibility gate](issues/41-feasibility-gate.md) is GO. [Scene contract](issues/42-scene-contract.md), [Region occupants](issues/43-region-occupants.md), [Budget precheck](issues/44-budget-precheck.md), [Exclusive 3D mode](issues/45-exclusive-3d-mode.md), [Contract gate](issues/46-contract-gate.md), and the settled representation tickets are resolved. Next cluster is [Geometry check](issues/54-geometry-check.md), [Stress trial](issues/55-stress-trial.md), and [Parity trial](issues/56-parity-trial.md), which feed [Viewer delivery](issues/58-viewer-delivery.md).

Do not reopen whether this app is an editor. The first 3D cut is a regional read-only viewer of the same save, not a rival fork and not a second editor. Constructor, photorealistic 3D, belt weld, geometric chain surgery, Coffee Stain art in git, in-game `.sbp` as the Build package, React/R3F/bundler, and uploading `.sav` bytes stay out.

Current map facts: Leaflet `CRS.Simple` + WebGL2 buckets; `z` is altitude in meters, last in the stride; `altitude.js` is a min/max filter, not a camera. Copy/paste across saves already exists. Hidden objects are not copied. Vanilla JS, no bundler; `sav_core` is the engine; wasm32 ~4 GB; browser clipboard caps vs desktop uncapped.

Reference frames: [01](assets/01-current-2d-map.png) is a capture of the current app; [02](assets/02-schematic-3d-final.png) and [04](assets/04-cross-section.png) are product concepts. [03](assets/03-photorealistic-pareto.png) is out of scope.

## Scheme

- **height-view** — Height view — Seeing and choosing Z on the current map: A–A′ / B–B′ strips and the shared Z band.
- **regional-viewer** — Regional viewer — The temporary read-only 3D scene of one delimited area: what it trusts, how you orbit it, and when it is ready to ship. [Viewer strand spec](specs/viewer-strand-regional-viewer.md).
- **volume-selection** — Volume selection — Rectangle plus Z window → the occupant set (straddlers, hidden children, filters). [Viewer strand spec](specs/viewer-strand-volume-selection.md).
- **edit-controls** — Edit controls — Move, rotate, copy, paste, delete as one loop, driven by that volume and Z.
- **build-package** — Build package — The bytes: clipboard and named file, same payload, not the game blueprint.
- **visual-presentation** — Visual presentation — How occupancy, height, ghosts, filters, and later schematic shapes/opacity are drawn; chrome stays `ui.js` / `map.css`. [Viewer strand spec](specs/viewer-strand-visual-presentation.md).
- **save-integrity** — Save integrity — Anti-corruption: byte-splice + re-parse, undo from pristine, no chain-actor surgery, verification the `.sav` still loads. [Viewer strand spec](specs/viewer-strand-save-integrity.md).
- **browser-and-desktop** — Browser and desktop — What the WASM tab can do versus what belongs in Tauri (caps, filesystem, memory, feature parity). [Viewer strand spec](specs/viewer-strand-browser-and-desktop.md).
- **runtime-limits** — Runtime limits — wasm32 ~4 GB, standing memory, instanced buffers, vanilla JS, 600k-object saves. [Viewer strand spec](specs/viewer-strand-runtime-limits.md).

## Strand specs

- **height-view** — .scratch/vertical-builds/specs/2-5d-first-cut.md

## Branches

- **volume-selection / 62 — 2.5D volume contract** — Define the 2.5D Build volume and Height-view admission rules. Spec: .scratch/vertical-builds/specs/2-5d-first-cut.md
- **volume-selection / 63 — Height slicing** — Define the later 3D scene Z window; this remains after first-viewer delivery and has no spec yet.
- **height-view / 64 — 2.5D contract** — Set the first-cut product and interaction contract for linked top-down and lateral views with one shared Z window. Spec: .scratch/vertical-builds/specs/2-5d-first-cut.md
- **height-view / 65 — Height-view delivery** — Specify the first Height-view loop, integrated client skeleton, and projected Cut marks. Spec: .scratch/vertical-builds/specs/2-5d-first-cut.md
- **build-package / 66 — Build artifact** — Define the transferable artifact and its relationship to peer tools. Named-file UX details remain open.
- **edit-controls / 67 — Relocation semantics** — Preserve safe actor-set relocation and specify Height-view move and paste. Spec: .scratch/vertical-builds/specs/2-5d-first-cut.md
- **edit-controls / 68 — 3D edit loop** — Define later selection and edit controls inside the 3D scene, after viewer delivery.
- **regional-viewer / 69 — Viewer feasibility and architecture** — Establish the feasible rendering approach and prove representative spatial data before integration. Spec: .scratch/vertical-builds/specs/viewer-strand-regional-viewer.md
- **regional-viewer / 70 — Regional viewer contracts** — Consolidate the settled read-only regional viewer experience, scene, camera, and lifecycle contracts. Spec: .scratch/vertical-builds/specs/viewer-strand-regional-viewer.md
- **regional-viewer / 71 — Viewer validation and delivery** — Define remaining geometry acceptance and the delivery decision. Runtime evidence is pending.
- **runtime-limits / 72 — Runtime baseline survey** — Record current map, client, and memory constraints that inform later runtime decisions.
- **save-integrity / 73 — Viewer save integrity and regression** — Preserve the existing 2D session state and regression boundary around viewer entry and exit. Spec: .scratch/vertical-builds/specs/viewer-strand-save-integrity.md
- **browser-and-desktop / 74 — Shell renderer and release** — Keep the shared renderer viable across browser and Tauri and define controlled-release claims. Spec: .scratch/vertical-builds/specs/viewer-strand-browser-and-desktop.md
- **visual-presentation / 75 — Spatial presentation data** — Establish source and asset constraints for static paths and original visual geometry. Spec: .scratch/vertical-builds/specs/viewer-strand-visual-presentation.md
- **visual-presentation / 76 — Scene representation and readability** — Define recognizable simplified forms, static networks, visibility, uncertainty, and honest readouts. Spec: .scratch/vertical-builds/specs/viewer-strand-visual-presentation.md
- **visual-presentation / 77 — Terrain and scene picking** — Investigate optional terrain and define picking for a later 3D interaction cycle.
- **volume-selection / 78 — Regional occupant contract** — Specify regional 3D membership, conservative bounds, and path clipping. Spec: .scratch/vertical-builds/specs/viewer-strand-volume-selection.md
- **regional-viewer / 79 — Regional viewer implementation** — Implement the regional viewer against the completed global integration contract, wire v1, event map, initial kit and phased plan. Product implementation remains open.
- **regional-viewer / 80 — Modded-save corpus gap** — Track acquisition and validation of a real modded save. Existing documentation records a corpus gap, not compatibility.
- **runtime-limits / 81 — Runtime budget and resource lifecycle** — Set regional scene admission and resource-lifetime limits for browser and native shells. Spec: .scratch/vertical-builds/specs/viewer-strand-runtime-limits.md
- **runtime-limits / 82 — Runtime stress trial** — Run the pending stress, recovery, and resource-release trial against the integrated viewer.
- **save-integrity / 83 — First-ship save integrity** — Specify first-ship parser, edit, undo, snapshot, and in-game integrity gates. Spec: .scratch/vertical-builds/specs/2-5d-first-cut.md
- **browser-and-desktop / 84 — Cross-shell parity trial** — Run the pending browser, localhost, Tauri, and 2D regression trial.
- **visual-presentation / 85 — Free-form geometry research** — Investigate missing/free-form shapes and define honest initial forms before tracking model refinement.

## Bearing

- **Next ticket** — [Implement the regional 3D viewer](issues/60-regional-viewer-implementation.md), beginning with [Phase 1](plans/regional-viewer/PLAN_PHASE_1_core-extract.md) against the [closed global integration contract](specs/viewer-integration-spec.md). Tickets 54–56 are downstream acceptance checks and are blocked by 60; they feed [Viewer delivery](issues/58-viewer-delivery.md). The camera, silhouettes, networks, visibility, readout, teardown, and useful-viewer contracts are settled. [Terrain study](issues/29-simplified-map.md) and [Modded save](issues/59-modded-save.md) may run beside the viewer path and block nothing. The 2.5D spec stays; leftover Height-view implementation is not this work item.
- **Horizon** — [Contract gate](issues/46-contract-gate.md) → [Implement the regional 3D viewer](issues/60-regional-viewer-implementation.md) → acceptance checks 54–56 → [Viewer delivery](issues/58-viewer-delivery.md). Edits open only after delivery: [Scene picking](issues/26-scene-picking.md) → [Scene Z window](issues/22-scene-z-window.md) → [Edit gizmos](issues/23-edit-gizmos.md) → [3D edits](issues/27-3d-edits.md). Terrain integration stays fog until the study is practicable and funded. Height-view relocate observation and integrity CI stay owed by the 2.5D ship and do not block the viewer. Named-file polish and the rest of the fog stay here. A modded save remains an open corpus gap and does not block the contract.

## Decisions so far

- [Survey the current map](issues/04-survey-the-current-map.md) — 2D orthographic WebGL2 buckets; `z` is a filter and depth ordinal, not a camera. Cross-save clipboard already exists (browser 50k/150k/200 MB; desktop uncapped). wasm32 ~4 GB is the hard wall for a second 3D buffer.
- [What is a Build](issues/01-what-is-a-build.md) — A Build is a spatial volume (XY + Z extent). Occupants of that volume are the transfer set.
- [First observation layer](issues/02-first-observation-layer.md) — First MVP is 2.5D with better verticality; schematic 3D remains this spec’s final observation objective.
- [Transfer artifact](issues/03-transfer-artifact.md) — Clipboard for in-session paste, plus a named file for keep/share. Same payload.
- [Meaning of 2.5D](issues/06-meaning-of-2-5d.md) — 2.5D is top-down plus a linked A–A′ Cut; the Cut is required to see verticality.
- [Isolation UX](issues/09-isolation-ux.md) — Draw XY rectangle, then pick Z on that Cut.
- [Relocate semantics](issues/07-relocate-semantics.md) — Existing copy/paste actor-set cut (tombstones, rider wires). No geometric belt split, no weld, no chain-actor surgery.
- [Section plane](issues/10-section-plane.md) — Both A–A′ and perpendicular B–B′; one shared Z window.
- [Survey peer tools](issues/05-survey-peer-tools.md) — Nobody isolates an existing XY+Z factory volume and exports it. SCIM is 2D+altitude filter; in-game Designer is rebuild-inside-a-cube (32–48 m); moritz-h sees Z but does not transfer.
- [Survey 3D fork options](issues/17-survey-3d-fork-options.md) — Schematic 3D is this app’s later observation (same editor, same Build loop); Height view ships first. Vanilla Three.js is a live stack option. R3F/bundler, `.sbp` as the package, and Coffee Stain glTF in git stay out.
- [Volume occupancy](issues/12-volume-occupancy.md) — Occupants are today’s selection: layer filters and off-payload `hiddenClasses` stay out; hide-this-object can still copy; the Z window is the altitude gate. Belts/pipes whole-in on any in-window vertex. Copy stays silent on straddlers. Read with 13: global altitude still caps `collectInBox`; the Cut band peels inside that cap.
- [Height view chrome](issues/13-height-view-chrome.md) — Two Z instruments: altitude rail = map + occupancy cap; Cut start–end band = Build peel. No rectangle → no Cut. Docked side panel (A–A′ top half, B–B′ bottom half) + session switch to flaps. Independent A↔A′ / B↔B′ via end labels. Empty strips stay. L-frame overlay dropped after the walking skeleton.
- [Save integrity gates](issues/15-save-integrity-gates.md) — Spec gate is `sav_core` CI: Z-window isolate + copy/paste/delete/undo; parser accepts; occupant counts/bounds match the fixture snapshot; undo restores payload. In-game load is first-ship smoke, not CI. wasm OOM is not this gate.
- [Real-client skeleton](issues/16-real-client-skeleton.md) — Additive in the current tab (`height_view.js`); desktop inherits `dist/`. Chrome is 13; Cut marks are projected AABB. Occupants are today’s selection; proof walk is Move. Cherry-pick only inside the cube (map + Cut); Ctrl+A stays global and dismisses the Cut.
- [Cut elevation marks](issues/19-cut-elevation-marks.md) — First-ship Cut is an orthographic lateral onto A–A′ and B–B′ (along × Z): meters, yaw, XY clip, fade outside the band, yellow dashed for excluded overlap. Marks are projected AABB; authored SVG is a destination format, not this ticket’s pipeline.
- [Height-driven edits](issues/14-height-driven-edits.md) — Move/paste share one L-frame observation retargeted to the ghost: dest background + 20%/8–50 m pad, payload more attenuated; Z anchor is the floor of what travels (not bbox center); existing panel; click-to-commit move; no Cut-band drag in this contract.
- [Survey cut laterals](issues/20-survey-cut-laterals.md) — Table XY/Z already feed a true-meter AABB Cut; glyphs and mesh extract have no producer. SCIM’s detailed marks are traced top-down polygons, not laterals, and are not reusable. AABB first-ship in 16 stays.
- [Schematic 3D bar](issues/08-schematic-3d-bar.md) — Later editor-shaped 3D: lookalikes, orbit, nav cube, interior opacity, gizmos, filtered save with a cheaper rest-of-save, browser cap below desktop. Not the first delivery.
- [Reserve volumes](issues/50-reserve-volumes.md) — A valid `clearance` is a labeled reserve volume, not the true shell. No dimensions means show the location and the uncertainty. Do not invent a size, do not drop the object, do not draw it as an exact solid.
- [Spatial data audit](issues/31-spatial-data-audit.md) — The save stores quaternion, centimeter position, and scale. The payload keeps map pixels, yaw or a flat hull, and z in meters. Quaternion, scale, and tangent Z are dropped. Sizes are a class clearance lookup, not a per-instance shell.
- [Representative cases](issues/32-representative-cases.md) — The three fetched saves cover stacks, rotation, slopes, repeated modules, unknown vanilla classes, and density. A modded save is still a gap.
- [2D regression guard](issues/33-2d-regression-guard.md) — Load and existing edits already have checks (`ui_behaviour.py`, `cargo test -p sav_core --release`); Height view is the manual runtime script; the viewer handoff has no automated check until enter/exit exists, and that check belongs in `ui_behaviour.py`.
- [Baseline gate](issues/34-baseline-gate.md) — Phase 0 is closed. Feasibility investigations may open. This gate does not pick a library or a proxy kit.
- [Asset supply](issues/40-asset-supply.md) — Original primitives sized from our tables can ship; distinctive family forms are authored here. Coffee Stain meshes stay out of git; FModel glTF stays out of git and releases. Local extract is later living, not this kit. Procedure: [research/asset-supply.md](research/asset-supply.md).
- [Linear paths](issues/36-linear-paths.md) — Payload samples already draw static 3D traces that rise, fall, and cross: XY Hermite plus linear Z for belts, pipes, hypertubes, rails, and vehicle paths; straight chords for power. Tangent Z and chain-actor triples are dropped; conveyor lifts stay boxes until a collector emits their spline. Procedure: [research/linear-paths.md](research/linear-paths.md).
- [Proxy catalog](issues/28-proxy-modeling.md) — Named W×D×H is a foundation-family box (227), not a machine shell. Production, power, and most logistics stations are clearance reserves (274). Paths, lifts, empty-table actors, and pins have neither. Simple prisms read for pads, walls, beams, and lines — not machines or lifts. Catalog: [research/proxy-catalog.md](research/proxy-catalog.md).
- [Cost probe](issues/25-scene-budget.md) — Count occupants of the delimited volume; if **> 8,000**, do not start the 3D scene, keep 2D, and ask to shrink. Ordinary corpus regions (49–800) fit. GPU megabytes are not the limiter. Measured on ASUS VivoBook / NVIDIA MX110 / Cursor Electron; Intel iGPU and a loaded 600k wasm tab were not measured. Alternative 14,000 was rejected. Measurements: [research/scene-budget.md](research/scene-budget.md).
- [Transform proof](issues/35-transform-proof.md) — Conversion on representative cases has no inverted axis or unit error. The save has pose (place, heading, height), not Coffee Stain volumetry. The viewer must not fake flattened tilt, a missing vertical curve between path samples, a missing table size, or a cell-max as building height. Mk5 belt is enough slope proof; the solo rail was a dump sampling gap, labeled. Wall poles and passthroughs stand in for this proof where signs, flow, and potties were not sampled. Coherent later drawing is not this ticket inventing a mesh: it already lives on resolved Proxy catalog and Asset supply and on open Family silhouettes — table reserve box or original authored form, never presented as the true shell; official meshes stay out. Prototype: [prototype/transform-proof.html](prototype/transform-proof.html). Exceptions: [prototype/transform-exceptions.md](prototype/transform-exceptions.md).
- [Renderer probe](issues/18-3d-scene-adapter.md) — The 2D WebGL2 layer stays the Leaflet overlay. The regional scene is vanilla Three.js InstancedMesh from typed arrays (no Object3D per actor), vendored under map/static when it leaves scratch. Prototype: [prototype/renderer-probe.html](prototype/renderer-probe.html) + [prototype/renderer-probe-notes.md](prototype/renderer-probe-notes.md).
- [Feasibility gate](issues/41-feasibility-gate.md) — GO. Checkable relations are pose + traces + honest reserves, not true hulls. Passes on the measured MX110/Electron environments; Intel iGPU and 600k wasm defer to Stress trial.
- [Scene contract](issues/42-scene-contract.md) — The scene receives a separate regional 3D extract of save-native pose, honest sizeKind, and path-actor traces; the 2D payload is unchanged; expensive buffers wait on Budget precheck.
- [Region occupants](issues/43-region-occupants.md) — 3D occupants are the Height-view isolation volume (XY + Cut Z + altitude cap), not Selection; conservative AABB (orientation, scale, volumeOffsetM); paths clip at the bound; filters hide, they do not change membership.
- [Budget precheck](issues/44-budget-precheck.md) — Count unique occupants the Region occupants predicate would admit; refuse if > 8,000 before 3D buffers or replacing 2D; same cap on wasm and Tauri; UI.dialog to shrink XY or Cut Z.

## Not yet specified

- How occupancy, extrusion vs flat, and ghosts are drawn on the top-down map (Visual presentation).
- What stays in the browser tab versus what requires the desktop app (files, caps, memory). Height view itself is in the page; both shells inherit it. Caps/filesystem/headroom can still split later.
- Headroom under Runtime limits for Height view Cut buffers — measure on a 600k save after the skeleton is in the client. Regional 3D cost is [Cost probe](issues/25-scene-budget.md), not a guess.
- Adding occupants from outside the committed cube (Ctrl+click / Cut): whether the rectangle grows (as if select-all then subtract) or extras are a second category — Horizon, not the first skeleton.
- Occupancy summary before copy (counts, types) — straddler warning is out (silent, same as today).
- Named-file Build package beyond same-bytes-as-clipboard (extension, import, caps).
- WASD fly and in-world labels, after the regional viewer. Fly is outside the first cut.
- Later object inspection, wall transparency and richer in-world label detail. MVP orbit/input/reset controls and honest readout are now fixed by the global integration contract; richer navigation remains later scope.
- Whether a later edit cycle restores gizmos, a cheaper rest-of-save, a nav cube, or an interior-opacity toggle. The first delivery does not.
- Terrain mesh integration, only if [Terrain study](issues/29-simplified-map.md) shows a practicable source and it is funded. It must switch off, and the factory viewer does not require it.
- Whether the tool proposes a Build by clustering, or only accepts a manual volume.
- Two-save workspace versus sequential load in one tab.
- Local FModel → glTF extract after schematic 3D ships (user-run, never in git) — optional fidelity, not the schematic bar.
- Dragging the placement Cut band to edit destination Z (landing gizmo) — after [Height-driven edits](issues/14-height-driven-edits.md)’s read-only band + panel.
- Development sections not yet named that only show up once Height view is on the real client.

## Out of scope

- In-map constructor: placing machines, routing belts, adjusting connections or recipes. Lower-priority than transfer, and past this destination.
- Photorealistic / high-fidelity 3D (the 3–5% Pareto mockup). A later effort if this ever becomes a living.
- In-game `.sbp` / `.sbpcfg` Blueprint Lab as the portable unit — designer cube, not a Build. etothepii may oracle fixtures; it does not change Transfer artifact (clipboard + named file, not the game blueprint).
- React, React Three Fiber, Zustand/Redux, or a bundler for map/3D chrome. Vanilla JS stays.
- User-local FModel → glTF extract shipped in git or in releases. Optional later living; never Coffee Stain art in this repo.
- Monetization, marketplace, or “living off this.”
- Vendoring Coffee Stain meshes, icons, or map art into git.
- Reconnect / weld belts or pipes on paste.
- Geometric split of belts/pipes at the volume wall, or any new `FGConveyorChainActor` surgery — save corruption; the existing copy already cuts by actor set.
- Uploading `.sav` bytes to a server.
- Animated item flow or a production simulation inside the 3D view.
- Using the 3D view to certify collisions, validate connections, or predict a future paste.
- A desktop-only 3D engine. The first viewer is one shared frontend, or it does not ship.
- Keeping historical 3D scenes across visits.
