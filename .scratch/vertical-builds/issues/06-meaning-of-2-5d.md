# Meaning of 2.5D

Type: grilling
Status: resolved
Strand: height-view — Height view
Blocked by: 02

## Question

If the first observation layer is 2.5D (or a 2.5D prototype), what does the player actually *see and do*?

This is not “is 2.5D first?” — that is [First observation layer](02-first-observation-layer.md). This is the operational meaning.

Candidates, mixable:

1. **Extruded footprints** — current colored rects gain height from altitude (and maybe known building height). Still a top-down camera; overlap becomes visible as stacked boxes.
2. **Floor / slice handles** — a discrete floor picker or a thicker altitude window, maybe snapping to foundation Z. The existing slider stays, but it becomes the way you *choose a Build’s Z*, not just a filter.
3. **Occlusion / peel** — hide roofs, foundations, or anything above the slice so the floor you meant is clickable.
4. **Cheap isometric tilt** — rotate the current 2D layer a few degrees; no free camera.
5. **Linked cross-section** — keep the map; add a live A–A′ strip for the current selection (reference: `assets/04-cross-section.png`).

Recommend: **1 + 2 + 3**. Extrusion so vertical overlap is visible; slice/peel so the rectangle can capture one floor; no new camera. Isometric and a dedicated cross-section viewer are optional later, not the 2.5D definition.

[First observation layer](02-first-observation-layer.md) resolved: 2.5D is the MVP, so this ticket is now the definition of that MVP.

## Answer

2.5D is the current top-down map plus a linked A–A′ Cut. The Cut is required to see verticality — not an optional later viewer.

The top-down view still draws the XY rectangle. The Cut is the profile of that rectangle, where Z becomes visible. Extrusion, peel, and isometric tilt are not required for this MVP; they stay fog. What direction A–A′ takes through the rectangle is [Section plane](10-section-plane.md).
