# Survey 3D fork options

Type: research
Status: resolved
Strand: height-view — Height view
Blocked by: 05

## Question

An external investigation (`satisfactorymap-3d-fork-investigacion.md`, 2026-08-15) proposed forking this editor into a Three.js 3D app (semantic proxies, then Blueprint Lab, then local FModel meshes). This app **will** become schematic 3D — that is this destination’s later observation, not a rival product. What of the note is the path to that future, versus sequencing/stack/artifact this map already ruled out?

Cover: renderer stack vs vanilla JS; semantic proxies vs Coffee Stain glTF; `.sbp` vs our Build package; wasm/instancing; licenses (moritz-h GPLv3, no vendor art). Do not reopen 2.5D-first or constructor.

## Answer

Keep `sav_core`. Schematic 3D (instanced proxies, camera, synced filters) **is this app’s later observation** — same editor, same Build loop; Height view ships first. Three.js as a vanilla scene adapter is the live stack option. R3F/bundler, `.sbp` as the Build package, and Coffee Stain glTF in git stay out. Real meshes stay local/out of git, after schematic.

Findings: [research/3d-fork-options.md](../research/3d-fork-options.md). Ranking of the 3D bar stays [Schematic 3D bar](08-schematic-3d-bar.md); how the viewport attaches is [3D scene adapter](18-3d-scene-adapter.md).
