# First observation layer

Type: grilling
Status: resolved
Strand: height-view — Height view
Blocked by:

## Question

What is the first observation slice this spec actually commits to shipping — not the dream viewport?

Options:

1. **2.5D on the current map** — keep Leaflet top-down; add height as extrusion, floor/slice handles, and occlusion so overlapping builds can be told apart. Does the job of isolating a Build without a 3D camera or mesh library.
2. **Schematic 3D first** — skip the intermediate and go to a fly/orbit viewport of colored boxes and paths (reference: `assets/02-schematic-3d-final.png`).
3. **2.5D as a prototype only** — build it throwaway to learn, then the spec’s first *product* slice is schematic 3D.

Constraints that are facts, not taste ([Survey the current map](04-survey-the-current-map.md)): wasm32 ~4 GB with ~2 GB standing after a 600k-object parse (~1.5–2 GB headroom). WebGL2 buckets, `z` last in the stride, used as altitude *gate* plus depth ordinal for painter’s-algorithm outlines — not a camera. No Three.js, no tilt. A second 3D buffer must be instanced typed arrays, not a duplicated JS object tree. Vanilla JS, no bundler.

Recommend: **option 1**. The user’s own split was “do what the app requires without 3D modeling complexity.” Schematic 3D stays in this map as a later specified phase ([Schematic 3D bar](08-schematic-3d-bar.md)), not as the first ship.

## Answer

The first MVP this spec commits to ship is 2.5D with better verticality handling on the current map. Schematic 3D remains the final observation objective of the same spec, not a later map and not out of scope.

Photorealistic 3D stays out of scope. What 2.5D *means* operationally is [Meaning of 2.5D](06-meaning-of-2-5d.md). What of the schematic mockup is in the 3D phase is [Schematic 3D bar](08-schematic-3d-bar.md).
