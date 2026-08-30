# Schematic 3D bar

Type: grilling
Status: resolved
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

## Answer

Schematic 3D is a **tool-dock mode** in the **same viewport** (Leaflet hidden while on): **lookalike** proxies, **orbit**, **filtered save**, gizmos **XYZ+rotate**, **one Z window**, cheaper **rest-of-save** still visible; **one product, two render ceilings**.

It is this campaign’s later observation of the same editor, after Height view — not a fork, not the first ship, not a constructor, not `assets/03`. Official glTF / Coffee Stain meshes stay out of git. How the scene attaches (WebGL2 vs vanilla Three.js, typed-array diet, picking) is [3D scene adapter](18-3d-scene-adapter.md).

**Enter.** A **tool dock** button, not Height-view observation chrome and not a second HTML. The 3D view occupies the map pane. It opens on the **layer- and altitude-filtered save**; isolating a Build is not the toll. Isolation in 3D is the **same rectangle gesture**, then the **shared Z window**. Gizmos act on **Selection**, as today.

**Camera.** **Orbit** (not WASD fly, not a 2.5D tilt). **Nav cube** with view shortcuts (top / front / side). Pivot: **current selection**; if none, **midpoint of the area in view**.

**Shapes.** **Lookalike kit** in this bar (not flat category boxes). Later, proxies may move closer to real meshes (local extract, never in git). `UnknownProxy` for unmapped `typePath`s stays fog.

**Filters.** Today’s **layer filters**, synced with the 2D session.

**Interiors.** A **toggle** (“see interiors”), **on** when entering 3D. Walls, roofs, decorative, and **foundations** drop opacity; production, logistics, and power stay solid. Not a second filter list.

**Z and Cut.** **One Z window**: 3D clip and Cut band are the same start–end; the global altitude rail remains the cap. A–A′ / B–B′ **strips are optional** and **do not auto-open** in 3D; a control shows them. They edit that same window, not a second height.

**Edit.** **Move gizmos on XYZ and rotate** in this bar. The paste panel may remain for numbers / clipboard; 3D is not observation-only.

**Scene budget.** The bar is the **whole filtered factory**, not cube-only. **Rest of the save** (out of the cube / out of focus) stays **visible but cheaper**. **One schematic**, **two ceilings**: the browser’s 3D render cap is **lower** than desktop (clipboard-style), not a lite web SKU vs a full PC app. Exact numbers and LOD/chunk machinery are Runtime limits after 18.

**Out of this bar.** Terrain (optional later low-poly for world height, not blocking). WASD fly. In-world labels (`PROD-1` / `FAC-A`). Photorealistic meshes. Dual Leaflet+3D split-screen.
