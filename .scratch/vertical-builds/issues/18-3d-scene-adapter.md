# 3D scene adapter

Type: grilling
Status: open
Strand: visual-presentation — Visual presentation
Blocked by: 08

## Question

After [Schematic 3D bar](08-schematic-3d-bar.md) ranks what phase 2 *is*, how does that viewport attach to the current client without a second object tree or a bundler?

Facts from [Survey 3D fork options](17-survey-3d-fork-options.md) / [research/3d-fork-options.md](../research/3d-fork-options.md): 600k draw calls will not fly; picking cannot be `Raycaster` on every actor; wasm32 standing memory is ~2 GB; this repo is vanilla JS, no framework. FeliX (archived) and moritz-h prove a 3D save view is possible; neither isolates a Build. moritz-h is GPLv3 — ideas, not a paste.

Decide the adapter:

1. **Extend WebGL2 buckets** — add a 3D camera/projection to `webgl_layer.js`. No new library. Hardest camera/gizmo work; one buffer.
2. **Three.js beside Leaflet** — script-tag Three.js (`InstancedMesh` / `BatchedMesh`, GPU id-buffer picking, chunked batches). Same WASM session, filters/selection shared. No React Three Fiber, no bundler.
3. **R3F + store + bundler** — as in the fork note. Rejected by `AGENTS.md` (vanilla JS, no bundler).

Also: does 3D consume a `NormalizedWorld` typed-array diet (pos/quat/kind/chunk) built from existing buckets, or duplicate payload objects? Dual JS trees will not fit.

Recommend: **2** if 08 puts 3D beside the map; **1** only if 08 is a cheap tilt of the current layer. Shared typed arrays either way. Not 3. Not a 3D ship in the 2.5D skeleton ([Real-client skeleton](16-real-client-skeleton.md)).
