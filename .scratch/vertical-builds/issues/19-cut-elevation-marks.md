# Cut elevation marks

Type: grilling
Status: resolved
Strand: visual-presentation — Visual presentation
Blocked by: 11

## Question

The [2.5D loop prototype](11-2-5d-loop-prototype.md) proved the Cut gesture with toy boxes: a machine is a blob at one Z, a belt is an XY polyline sampled onto the section. That is enough to *pick* a window. It is not how the real map draws.

Production buckets are **top-down marks**: building rects `[x, y, yaw, z]`, belts/pipes as map-pixel polylines with `z` last in the stride ([Survey the current map](04-survey-the-current-map.md)). Those figures are silhouettes for a zenith camera. A–A′ / B–B′ need a **vertical mark** per occupant — height, not just a plotted altitude — or the Cut stays a Z ruler with unreadable dots.

This is Height-view drawing, not schematic 3D ([Schematic 3D bar](08-schematic-3d-bar.md) / lookalike kit). No Coffee Stain art in git. No belt split.

Pick the first-ship Cut mark:

1. **Altitude stamps** — keep the prototype: one box/dot at the actor’s `z`, belts as polylines through vertex Z. Cheap; stacked machines at the same X collapse; building *height* is invisible.
2. **Extruded AABB** — project the footprint onto the section axis; give it a vertical extent from known building height (curated/generated tables, not meshes). Belts stay vertex polylines (whole actor). Foundations become slabs. Unknown `typePath` gets a default height, not a hole.
3. **Per-type elevation glyphs** — a 2D side drawing per class (constructor, smelter, stack). Readable; a new asset table; still not game art.
4. **Wait for schematic 3D proxies** — the Cut reuses whatever 08/18 pick (boxes vs lookalike). Blocks Height view on Horizon.

Recommend: **2** for the first Height view ship. **1** is what the throwaway already did and Anto called too simple. **3** if table height is too dumb for constructors vs smokestacks once 2 is on the real client. **4** is out — the Cut has to ship before schematic 3D.

Also: does the *top-down* map stay flat footprints (today), or does extrusion belong in the same ticket? Prototype left top-down flat. Extrusion-on-map and paste ghosts can stay fog until the Cut marks exist.

## Notes

Graduated from map fog after ticket 11: occupancy drawing on the Cut is now a named question. Chrome layout is [Height view chrome](13-height-view-chrome.md). Who is in the set is [Volume occupancy](12-volume-occupancy.md), not how they are drawn.

## Answer

The first-ship Cut is an **orthographic lateral projection** onto A–A′ and onto B–B′ (along × Z), not a 3D camera and not a slice that shows objects outside the XY rectangle. Existing map/UI icons are unchanged. Who enters the Build stays [Volume occupancy](12-volume-occupancy.md) / today’s XY rules; this ticket is drawing only.

**Scene vs art.** The strip is drawn in **WebGL** (instanced boxes and polylines, same family as the map). Authored laterals are **SVG in git** (our art, AGPL), keyed by class + face, rasterized to a texture atlas at load. Coffee Stain PNGs stay out of git and are not Cut marks.

**Scale.** Marks use real meters (Q7). Width = XY footprint projected onto that axis, **including yaw** (`|w cos θ| + |d sin θ|`). Height from `clearance` min/max relative to actor `z` when present; else `z` → `z + dimensions.Height`. Missing height → **4 m**, **dashed**, until table height and/or official SVG exist. Placeholders are that projected AABB (generic family shapes optional inside the true box — never a 4 m square for a 10 m machine). Official SVG stretches into the same box, **upright** — no foreshortening, no ¾.

**Faces.** Two elevations per class (each axis is a face). The strip uses the actor-local face with **greater along projection**; 45° snaps, never blends. Yaw is **hover-only** (angle relative to that strip). Depth: painter’s algorithm along the perpendicular; nearer to the origin edge more solid, farther more transparent. Default along is left-to-right A→A′ / B→B′; “front” is that origin edge. Each strip is **reversible** (swap ends and depth). The flip control is chrome ([Height view chrome](13-height-view-chrome.md)); this ticket requires the projection be flippable.

**Population.** Strict **XY clip**: nothing outside the rectangle is drawn, even if a side camera would see it. Outside the global altitude cap is **undrawn** ([Height view chrome](13-height-view-chrome.md)). Inside XY, inside global, and outside the Z window: still drawn **faded** (Q3) so the player can raise/lower the band. Strip vertical **domain** = min/max of XY-occupant boxes, pad **20% of span, min 4 m, max 50 m** — not the game’s ±500 m. The Z window is a band in that domain; peeling does not recompact the scale.

**Lines.** Belts/pipes/rails/hypertubes are **vertex polylines** projected `(along, z)`, stroke by type, whole actor, no geometric split. Clip drawing to the XY grid.

**Overlap / dedupe.** Superimpose in depth. Dedupe `(typePath + along bin + Z bin)` **separately** for in-Build vs out-crossing — one mark per bin, no stack count in the first ship.

**Yellow (drawing only).** If today’s XY rule **excludes** an actor (building origin outside, belt with no vertex in the box, …) but the footprint or segment still **crosses** the rectangle, draw the **clipped overlap** in yellow + dashed on both strips: “this is not in the Build.” Included straddlers are not yellow; they clip to the grid. Layer-off buckets stay undrawn (not yellow). Occupancy logic is not modified.

**Out of this ticket.** Top-down stays flat footprints; extrusion-on-map and paste ghosts stay Visual presentation fog. No belt split. Schematic 3D proxies (08/18) do not block Height view.
