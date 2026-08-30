# Vertical Build Transfer

Label: `wayfinder:map`

## Destination

A shipped save editor that isolates a volume and edits/transfers it with real Z — Height view on the current map first, schematic 3D later; browser and desktop; without corrupting the `.sav`.

## Notes

HITL uses grilling and domain-modeling. Tickets stay in English; talk to Anto in Spanish. Product goal: [OBJECTIVE.md](OBJECTIVE.md). Sessions: [CONTINUE.md](CONTINUE.md). Glossary: `CONTEXT.md`.

**First 2.5D cut specced** (2026-08-30): [specs/2-5d-first-cut.md](specs/2-5d-first-cut.md) — Height view on the current tab (chrome 13, occupancy 12, AABB marks 19, loop from 11, Move proof). The campaign is not closed: schematic 3D, named-file polish, and remaining fog stay on this map. Do not treat this slice as first ship done.

**Scheme is features, not process buckets and not graph nodes.** Bearing orients; it is not a checkpoint. Missing sections will graduate into fog or tickets when they can be named — do not treat the eight arms as exhaustive, and do not treat resolved-ticket count as “app ready.” Closed tickets are product contracts, not a ship.

Do not reopen whether this app is an editor. Schematic 3D is **this campaign’s later observation of the same editor** (select, move, Z, export) — not a rival fork. Constructor, photorealistic 3D, belt weld, geometric chain surgery, Coffee Stain art in git, in-game `.sbp` as the Build package, React/R3F/bundler, and uploading `.sav` bytes stay out.

Current map facts: Leaflet `CRS.Simple` + WebGL2 buckets; `z` is altitude in meters, last in the stride; `altitude.js` is a min/max filter, not a camera. Copy/paste across saves already exists. Hidden objects are not copied. Vanilla JS, no bundler; `sav_core` is the engine; wasm32 ~4 GB; browser clipboard caps vs desktop uncapped.

Reference frames: [01](assets/01-current-2d-map.png) is a capture of the current app; [02](assets/02-schematic-3d-final.png) and [04](assets/04-cross-section.png) are product concepts. [03](assets/03-photorealistic-pareto.png) is out of scope.

## Scheme

- **Height view** — Seeing and choosing Z: A–A′ / B–B′ strips on the current map, later schematic 3D viewport.
- **Volume selection** — Rectangle plus Z window → the occupant set (straddlers, hidden children, filters).
- **Edit controls** — Move, rotate, copy, paste, delete as one loop, driven by that volume and Z.
- **Build package** — The bytes: clipboard and named file, same payload, not the game blueprint.
- **Visual presentation** — How occupancy, height, ghosts, filters, and later schematic shapes/opacity are drawn; chrome stays `ui.js` / `map.css`.
- **Save integrity** — Anti-corruption: byte-splice + re-parse, undo from pristine, no chain-actor surgery, verification the `.sav` still loads.
- **Browser and desktop** — What the WASM tab can do versus what belongs in Tauri (caps, filesystem, memory, feature parity).
- **Runtime limits** — wasm32 ~4 GB, standing memory, instanced buffers, vanilla JS, 600k-object saves.

## Bearing

- **Next cluster** — Specified as the 2.5D first cut ([specs/2-5d-first-cut.md](specs/2-5d-first-cut.md)): Height view chrome + volume occupancy + AABB Cut marks + walking skeleton on the real client. Next work is implementing that spec, not another grill. Unblocks the first ship; does not *be* the first ship (integrity CI, relocate Observation, and in-game smoke remain).
- **Horizon** — **This same editor in schematic 3D** (lookalike proxies, orbit, the Build loop). Then: Build package polish, clustering, two-save workspace, collision preview, terrain. Interior opacity is in the schematic bar. The 3D investigation is input to that phase, not another app.

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
- [Height view chrome](issues/13-height-view-chrome.md) — Two Z instruments: altitude rail = map + occupancy cap; Cut start–end band = Build peel. No rectangle → no Cut. L-frame overlay on the map viewport + session switch to flaps. Independent A↔A′ / B↔B′ via end labels. Empty strips stay.
- [Save integrity gates](issues/15-save-integrity-gates.md) — Spec gate is `sav_core` CI: Z-window isolate + copy/paste/delete/undo; parser accepts; occupant counts/bounds match the fixture snapshot; undo restores payload. In-game load is first-ship smoke, not CI. wasm OOM is not this gate.
- [Real-client skeleton](issues/16-real-client-skeleton.md) — Additive in the current tab (`height_view.js`); desktop inherits `dist/`. Chrome is 13; Cut marks are projected AABB. Occupants are today’s selection; proof walk is Move. Cherry-pick only inside the cube (map + Cut); Ctrl+A stays global and dismisses the Cut.
- [Cut elevation marks](issues/19-cut-elevation-marks.md) — First-ship Cut is an orthographic lateral onto A–A′ and B–B′ (along × Z): meters, yaw, XY clip, fade outside the band, yellow dashed for excluded overlap. Marks are projected AABB; authored SVG is a destination format, not this ticket’s pipeline.
- [Height-driven edits](issues/14-height-driven-edits.md) — Move/paste share one L-frame observation retargeted to the ghost: dest background + 20%/8–50 m pad, payload more attenuated; Z anchor is the floor of what travels (not bbox center); existing panel; click-to-commit move; no Cut-band drag in this contract.
- [Survey cut laterals](issues/20-survey-cut-laterals.md) — Table XY/Z already feed a true-meter AABB Cut; glyphs and mesh extract have no producer. SCIM’s detailed marks are traced top-down polygons, not laterals, and are not reusable. AABB first-ship in 16 stays.
- [Schematic 3D bar](issues/08-schematic-3d-bar.md) — Tool-dock mode, same viewport: lookalikes, orbit + nav cube, synced layer filters, interior-opacity toggle (foundations included), gizmos XYZ+rotate, one Z window, optional Cut strips (not auto). Scene is the filtered save; rest-of-save cheaper but visible; one product, browser 3D cap lower than desktop. Terrain, fly, in-world labels, and official meshes stay out. Wiring is [3D scene adapter](issues/18-3d-scene-adapter.md).

## Not yet specified

- How occupancy, extrusion vs flat, and ghosts are drawn on the top-down map (Visual presentation).
- What stays in the browser tab versus what requires the desktop app (files, caps, memory). Height view itself is in the page; both shells inherit it. Caps/filesystem/headroom can still split later.
- Headroom under Runtime limits for Height view Cut buffers and later 3D (instanced typed arrays, payload diet) — measure on a 600k save after the skeleton is in the client.
- Adding occupants from outside the committed cube (Ctrl+click / Cut): whether the rectangle grows (as if select-all then subtract) or extras are a second category — Horizon, not the first skeleton.
- Occupancy summary before copy (counts, types) — straddler warning is out (silent, same as today).
- Named-file Build package beyond same-bytes-as-clipboard (extension, import, caps).
- Schematic 3D viewport attach (WebGL2 buckets vs vanilla Three.js, no R3F) — [3D scene adapter](issues/18-3d-scene-adapter.md).
- Shared `NormalizedWorld` typed-array diet vs current bucket strides for Cut + later 3D (wasm: no dual JS trees).
- GPU picking, spatial chunks, and how “cheaper rest-of-save” is drawn (600k ≠ 600k draw calls); exact browser vs desktop 3D render caps — measure after 18.
- World terrain (optional later low-poly; not on the schematic bar). WASD fly and in-world labels.
- `UnknownProxy` for unmapped `typePath`s in schematic 3D.
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
