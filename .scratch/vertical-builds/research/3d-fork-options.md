# 3D fork options (annotated for this map)

Survey date: 2026-08-15. Source: Anto’s investigation note
`satisfactorymap-3d-fork-investigacion.md` (Downloads). That note is a **3D
path** for this editor (semantic proxies, then optional meshes). This file
keeps the facts. It does **not** adopt 3D-first sprints, R3F, or `.sbp` as the
Build package. Schematic 3D remains **this destination’s later body** — the
same save editor, not a fork of a different product.

First-party / repo sources below are preferred when they conflict with the note.

## Gist

Keep `sav_core` / WASM. The app ships Height view (2.5D Cut) first, then
**becomes** schematic 3D observation: instanced proxies, camera, synced
filters, the same select / move / Z / export loop ([OBJECTIVE.md](../OBJECTIVE.md),
[First observation layer](../issues/02-first-observation-layer.md)). React Three
Fiber, a bundler, in-game `.sbp` as the Build package, and Coffee Stain glTF in
git stay out. moritz-h is a 3D precedent (ideas, not a code drop — GPLv3).

## What the note gets right (this app’s 3D future)

| Claim | Why it matters here | Lands on |
| --- | --- | --- |
| Do not replace the Rust→WASM parse/write pipeline | Same as [Survey the current map](04-survey-the-current-map.md) | Already decided |
| Semantic 3D before real meshes: category boxes, colored networks, orbit/fly, vertical clip, filters reused | This **is** the later product (`assets/02`); photorealistic `assets/03` stays out | [Schematic 3D bar](../issues/08-schematic-3d-bar.md) |
| 600k objects cannot be 600k draw calls: instancing, chunks, LOD, GPU picking, typed arrays | wasm32 ~4 GB; the 3D buffer must be instanced | Runtime limits fog; [3D scene adapter](../issues/18-3d-scene-adapter.md) |
| `UnknownProxy` for unmapped `typePath`s | Schematic view must not crash on mods / new buildings | Visual presentation fog |
| FModel → glTF is **local**, never redistributed | After schematic ships; never in git | Fog / optional later living — not phase 2 |
| ModelingTools / factory materials are lookalikes, not official packs | Possible proxy “face” without rip | Fog until 08 says boxes vs lookalikes |
| etothepii TS parser: `.sav` / `.sbp` fixtures, not the engine | Independent round-trip oracle | [Save integrity gates](../issues/15-save-integrity-gates.md) |
| moritz-h: 3D of save objects, GPLv3 | Already in [peer tools](peer-tools.md); license is extra | Landmine: ideas not code unless AGPL combination is explicit |
| SCIM: study UX only; repo forbids reuse | Already surveyed | No ticket |
| Decouple domain / scene / UI | Cut then 3D share editor semantics, not a second app | [Real-client skeleton](../issues/16-real-client-skeleton.md) (2.5D) then 18 |

## What this map still rejects (sequencing, stack, artifact — not the 3D future)

The 3D **destination** is in. These **means** are out:

| Note recommendation | Conflict |
| --- | --- |
| MVP = Three.js scene as the *first* product slice | [First observation layer](../issues/02-first-observation-layer.md): Cut on the current map first; 3D is the same spec’s later observation |
| React Three Fiber + Zustand/Redux + bundler | Vanilla JS, no bundler, no framework (`AGENTS.md`). Vanilla Three.js remains a live option for the later viewport |
| Blueprint Lab: parse/write `.sbp` + `.sbpcfg` as the portable unit | [Transfer artifact](../issues/03-transfer-artifact.md): clipboard + named file, **same payload**, not the game blueprint. 3D still exports a Build, not a designer cube |
| Sprint 0 “save visible with 3D proxies” *before* Height view | Would skip the Cut; [2.5D loop prototype](../issues/11-2-5d-loop-prototype.md) is the gesture lab. 3D comes after that loop exists |
| Playwright/Vitest as the chrome/parser test stack | This repo’s gates are `cargo test -p sav_core`, `ui_behaviour.py`, `ui_classes.py` |
| `pnpm assets:extract` into the app | No package manager in the frontend; extract stays user-local and out of git |

`.sbp` remains a **peer** format (in-game Designer cube, 32–48 m). Using etothepii to *read* fixtures is allowed; shipping a Blueprint Lab is not this destination’s Build package.

## Architecture sketch (later observation of this app)

After Height view exists, the same session grows a 3D adapter — not a second product:

```text
.sav  →  sav_core / WASM  →  existing buckets (2D + Cut)     ← first ship
                         ↘  3D scene adapter (this app, later)
```

A shared `NormalizedWorld` (Float32 position/quat, Uint32 kind/flags, separate
belt/pipe/power graphs) is a **candidate diet** for the 3D buffer, not a rewrite
of the payload builder. Dual full JS object trees will not fit wasm32.

Renderer options for later grilling (ticket 18): extend WebGL2 buckets vs Three.js
via script tag (`InstancedMesh` / `BatchedMesh`, GPU id-buffer picking). Not R3F.

## Mesh / license facts (do not vendor)

- Official static meshes: FModel, `FactoryGame.usmap`, glTF 2.0 + PNG, LOD. Modding docs: [Extract Game Files](https://docs.ficsit.app/satisfactory-modding/latest/Development/ExtractGameFiles.html). **Not in git, not in releases.**
- Lookalikes: [Satisfactory_ModelingTools](https://github.com/DavidHGillen/Satisfactory_ModelingTools); factory materials on Ficsit. License per file.
- Sketchfab / Printables / STL: mixed licenses; silhouettes only.
- There is no complete redistributable official GLB pack.

## Links (from the note)

- https://github.com/valentinps/satisfactorymap
- https://github.com/etothepii4/satisfactory-file-parser
- https://github.com/moritz-h/satisfactory-3d-map
- https://docs.ficsit.app/satisfactory-modding/latest/Development/ExtractGameFiles.html
- https://docs.ficsit.app/satisfactory-modding/latest/Development/Modeling/MainMaterials.html
- https://github.com/DavidHGillen/Satisfactory_ModelingTools
- https://github.com/AnthorNet/SC-InteractiveMap
- https://github.com/crossedxd/satisfactory-blueprints
- https://github.com/ficsit-felix/ficsit-felix (archived three.js viewer; already in peer-tools)
