# Schematic 3D bar

Type: grilling
Status: open
Strand: height-view — Height view
Blocked by: 02

## Question

The desired product is a **3D save editor** (simplified shapes, 3D controls, filters, opacity for interiors) — see [OBJECTIVE.md](../OBJECTIVE.md). The mockup is `assets/02-schematic-3d-final.png`. Photorealistic `assets/03` is out of this map.

What of that bar is **in this spec as phase 2**, versus later fog?

Must-rank:

- Free fly / WASD vs orbit vs tilt from the 2.5D map.
- Simplified boxes/paths vs game-like meshes vs lookalike kit (ModelingTools). Official glTF is not a phase-2 option (not in git).
- 3D gizmos for move/Z vs keeping the current paste panel.
- Layer filters + opacity for interiors: in phase 2 or later?
- 3D viewport replaces Leaflet vs sits beside it.
- Vertical clip in 3D = the same Z window as Height view, or an independent 3D control?

Recommend: phase 2 = simplified boxes/paths, orbit, 3D move/Z gizmos, existing layer filters, opacity to see interiors, clip = Height view Z window. No game meshes. Fly and in-world labels can wait. How the viewport is wired is [3D scene adapter](18-3d-scene-adapter.md).

Fact from [Survey peer tools](05-survey-peer-tools.md): moritz-h already shows Z and edits properties, but cannot isolate a volume or export a Build. This bar is the existing save editor in 3D (select, move, Z, export), not a second property inspector and not a constructor.

Fact from [Survey 3D fork options](17-survey-3d-fork-options.md): semantic proxies + instancing + synced filters match this bar; R3F/bundler and `.sbp` Blueprint Lab do not. FeliX is an archived three.js proof, not a 1.x transfer tool.
