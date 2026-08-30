# 2.5D Height view — first vertical cut

Status: ready-for-agent

This spec closes the **Next cluster 2.5D slice** of Vertical Build Transfer. It is not the campaign spec, not schematic 3D, and not “first ship done.” Tickets it absorbs: [2.5D loop prototype](../issues/11-2-5d-loop-prototype.md), [Volume occupancy](../issues/12-volume-occupancy.md), [Height view chrome](../issues/13-height-view-chrome.md), [Real-client skeleton](../issues/16-real-client-skeleton.md), [Cut elevation marks](../issues/19-cut-elevation-marks.md). AABB first-ship is unblocked by [Survey cut laterals](../issues/20-survey-cut-laterals.md) / [research/cut-laterals.md](../research/cut-laterals.md). Glossary: `CONTEXT.md`. Product goal: [OBJECTIVE.md](../OBJECTIVE.md).

**Second implementation thread (same first-ship, not fused into this cut):** [Height-driven edits](../issues/14-height-driven-edits.md) — relocate Observation, resolved 2026-08-30 — ships in a dedicated client chat *after* the skeleton is on the tab. Not Horizon 3D. Not a new grill.

## Problem Statement

The save editor already isolates by XY rectangle and spatially edits (move, copy, paste, delete, rotate). The zenith map hides stacked floors: the player cannot see or peel Z, so the set they take is often the wrong floor. Satisfactory rewards vertical factories; the map still works as if they were flat.

A throwaway 2.5D loop proved the gesture. Production still has no Height view on the real tab: no linked Cuts, no shared Z band, no occupancy peel inside the altitude rail, no readable laterals. Without that Observation, isolation stays a 2D silhouette.

## Solution

Add **Height view** to the current map tab: after a committed XY rectangle, show linked A–A′ and B–B′ Cuts, peel one shared Z band, take occupants of that Build (XY + Z), and prove the walk with existing **Move** (re-parse). Chrome is the L-frame overlay (session switch to flaps). Cut marks are projected AABB. Occupants are today’s Selection rules plus the Cut peel. Additive module on the existing page; desktop inherits the same `dist/`. No 3D camera, no glyph catalog, no named-file UX in this cut.

The loop: rectangle → Cuts → Z band → occupants → Move.

## User Stories

1. As a pioneer, I want to right-drag an XY rectangle on the current map and immediately see linked A–A′ and B–B′ Cuts of that rectangle, so that I can read stacked floors instead of a flat silhouette.

2. As a pioneer, I want one shared Z window on either strip (handles plus dragging the band body), so that picking altitude on A–A′ or B–B′ peels the same Build extent.

3. As a pioneer, I want the Cut to appear only after a committed rectangle, so that object-toggle and select-all never accidentally open Height view.

4. As a pioneer, I want clearing the rectangle to tear down the Cuts, so that Height view is isolation chrome, not a standing mode.

5. As a pioneer, I want the global altitude rail to stay on screen as the map and occupancy cap, so that “what I see on the map” and “what I peel on the Cut” stay two instruments.

6. As a pioneer, I want the Cut band to peel only inside that global cap, so that I cannot take occupants the altitude rail has already hidden.

7. As a pioneer, I want Height view as an L-frame overlay on the map viewport (A along the bottom, B along the right, inset off docks), so that the map size does not jump and the map is not re-anchored.

8. As a pioneer, I want a session control on Height-view chrome (not the tool dock, not filters) that switches L-frame ↔ flaps, so that I can work on a tiny box without losing the overlay default.

9. As a pioneer, I want a new rectangle to keep my L-frame/flaps preference for the session, so that I am not reset every isolation.

10. As a pioneer, I want flap length to follow the rectangle side in screen space with a usable minimum, so that a small factory still has a readable Cut.

11. As a pioneer, I want to click the `A`/`A′` and `B`/`B′` end labels to reverse that strip (ends and depth), so that I can read the other face without a second icon.

12. As a pioneer, I want a new rectangle to reset strip direction to A→A′ / B→B′, so that each isolation starts from a known default.

13. As a pioneer, I want empty strips (zero occupants after peel) to stay up, with the band still movable, so that an empty volume is chrome, not a dismiss.

14. As a pioneer, I want Leaflet zoom/attribution inset while the L-frame is up, so that chrome does not cover map controls.

15. As a pioneer, I want occupants of the committed cube to be today’s Selection (`collectInBox` ∩ global altitude ∩ Cut band), so that Height view does not invent a parallel Build collection.

16. As a pioneer, I want layer-off buckets to stay out of the occupant set, so that filters remain a gate on who is taken, not only on what is drawn.

17. As a pioneer, I want `hiddenClasses` (sign poles, path nodes, …) to stay out of the payload and out of the Build, so that isolation matches today’s documented hole rather than expanding it.

18. As a pioneer, I want an individually hidden object (`hiddenIndices`) to remain selectable as today, so that hide-this-object does not silently drop a machine I meant to take.

19. As a pioneer, I want a belt or pipe in the set when any vertex is in XY and that vertex’s Z is in the window, whole actor, so that isolation never geometrically splits a chain.

20. As a pioneer, I want power lines to copy only when both endpoint owners are in the set, so that dangling wires follow today’s relocate contract.

21. As a pioneer, I want straddlers to copy silently (no warning, no block), so that occupancy does not add a new confirmation the current editor does not have.

22. As a pioneer, I want the Cut to draw an orthographic lateral of the rectangle (along × Z) and nothing outside that XY, so that the strip is a profile of the Build, not a side camera of the world.

23. As a pioneer, I want building marks on the Cut to be projected AABB in real meters (yawed footprint × table height), so that stacked machines have visible height, not a single altitude stamp.

24. As a pioneer, I want missing table height to draw a 4 m dashed AABB, so that unknown classes are placeholders, not holes.

25. As a pioneer, I want belts, pipes, rails, and hypertubes as vertex polylines on the Cut (`along`, `z`), clipped to the XY grid, so that lines stay whole actors and readable in Z.

26. As a pioneer, I want occupants inside XY and global altitude but outside the Z band to stay drawn faded, so that I can raise or lower the peel without losing context.

27. As a pioneer, I want anything outside the global altitude cap to be undrawn on the Cut (not faded, not yellow), so that the rail remains the hard visibility cap.

28. As a pioneer, I want excluded actors that still cross the rectangle (origin out, belt with no in-box vertex, …) drawn yellow dashed on the clipped overlap, so that I can see “this is not in the Build” without changing occupancy.

29. As a pioneer, I want included straddlers not to be yellow — they clip to the grid — so that yellow means exclusion, not “sticks out.”

30. As a pioneer, I want nearer-to-origin marks more solid and farther more transparent (painter’s depth on the perpendicular), so that overlapping floors on a strip are ordered.

31. As a pioneer, I want yaw as hover-only (angle relative to that strip), so that the Cut stays an elevation, not a ¾ view.

32. As a pioneer, I want the strip’s vertical domain to be occupant min/max plus 20% pad (min 4 m, max 50 m), not the game’s ±500 m, so that the band is a peel on a readable scale.

33. As a pioneer, I want peeling the band not to recompact that scale, so that moving the window does not jump the graph.

34. As a pioneer, I want narrowing the global altitude rail to clamp the band and drop occupants outside the cap, so that the two Z instruments stay consistent.

35. As a pioneer, I want widening the rail to possibly add XY occupants in global ∩ band without auto-expanding the band, so that I do not silently re-take floors I already peeled off.

36. As a pioneer, I want one-axis rectangle edit after commit (map edge or matching Cut vertical; opposite side stays), so that I can trim the cube without a two-axis drag.

37. As a pioneer, I want resizing XY not to reset the Z window, so that a peel survives a width tweak.

38. As a pioneer, I want a new right-drag while the Cut is up to *replace* the isolation rectangle (not union a second cube), so that additive union of isolation cubes stays out until add-from-outside is specified.

39. As a pioneer, I want cherry-pick only inside the committed cube (map Ctrl+click if the object is in the cube; Cut click on the front mark), so that Selection can be a subset of occupants without growing the Build.

40. As a pioneer, I want Ctrl+click / Cut click outside XY, band, or rail to no-op while the cube is up, so that I cannot add from outside the cube in this cut.

41. As a pioneer, I want in-cube deselect to look like today’s unselected object (no selection highlight) while the rectangle stays, so that empty Selection with the cube up is empty-volume chrome, not Clear.

42. As a pioneer, I want subtracts to persist by actor id while that actor stays in the cube, and actors that enter to start selected / that leave to drop, so that peel and cherry-pick do not fight.

43. As a pioneer, I want Ctrl+A to stay today’s global `collectInBox` over the whole map (same layer / rail / visibility skips, same 500k confirm) and to dismiss the rectangle and Cut, so that select-all is not “all occupants of the cube.”

44. As a pioneer, I want Clear to clear Selection and tear down rectangle and Cut, so that leaving isolation is one gesture.

45. As a pioneer, I want the proof walk to be existing Move (`applyEdits` + re-parse + fresh payload) after occupants are set, so that Height view is an editor Observation, not a viewer.

46. As a pioneer, I want copy during this cut to remain today’s clipboard extract, so that I can still copy — knowing copy does **not** prove re-parse.

47. As a pioneer, I want Height view additive on the current tab (same page, same WASM session, live buckets), so that I do not load a sidecar HTML or a Tauri-only preview.

48. As a pioneer using desktop, I want the same Height view from the inherited `dist/`, so that the skeleton is not a browser-only experiment.

49. As a pioneer, I want Cut samples taken only from the committed XY (∩ rail) into instanced arrays, so that Height view does not duplicate the world as a second JS object tree.

50. As a pioneer, I want existing map/UI icons unchanged, so that Cut marks are laterals, not a restyle of the zenith map.

51. As a pioneer, I want no Height-view mode button in the tool dock, so that isolation stays rectangle-then-Z.

52. As a pioneer, I want stacked (under-map) strips out of the first cut, so that production chrome matches the prototype’s L-frame/flaps contract, not variant A.

53. As a pioneer, I want no `localStorage` for the flaps switch in this cut, so that preference is session-only until a later decision.

54. As an agent implementing this, I want chrome tokens from existing `ui.js` / `ui.css` / `map.css` (load `ui.css` before `map.css`), so that Height view does not restyle unrelated dock widgets.

55. As an agent implementing this, I want vanilla JS and no bundler, so that script order stays the existing page contract.

56. As a pioneer, I want the save to stay on-device, so that Height view never uploads `.sav` bytes.

57. As a pioneer, I want no Coffee Stain art in git as Cut marks, so that AABB placeholders are the legal first laterals.

58. As a pioneer, I want relocate Observation — destination neighborhood on the same L-frame, payload floor as paste Z, no band-drag gizmo — in a **later dedicated chat** after this skeleton, so that placing is specified ([Height-driven edits](../issues/14-height-driven-edits.md)) without blocking the isolation walk. *(later — second thread)*

59. As a pioneer, I want copy/paste/delete/undo after Z-window isolate to be proven in `sav_core` CI with occupant snapshots, so that first **ship** integrity is stronger than the Move proof walk. *(later — first ship, [Save integrity gates](../issues/15-save-integrity-gates.md))*

60. As a pioneer, I want in-game load of an edited `.sav` as human smoke at first ship, so that CI is parser+snapshot, not Satisfactory. *(later — first ship)*

61. As a pioneer, I want a named-file Build package with the same bytes as the clipboard, so that I can keep or share a Build. *(later — product contract from [Transfer artifact](../issues/03-transfer-artifact.md); file UX is fog)*

62. As a pioneer, I want authored SVG / mesh-extract laterals instead of AABB, so that constructors are readable vs smokestacks. *(later — no producer yet; [Survey cut laterals](../issues/20-survey-cut-laterals.md))*

63. As a pioneer, I want occupancy, extrusion, and ghosts drawn on the top-down map, so that the zenith view shows height too. *(later — Visual presentation fog)*

64. As a pioneer, I want schematic 3D (lookalikes, orbit, gizmos, interior opacity) as this editor’s later Observation. *(later — Horizon; [Schematic 3D bar](../issues/08-schematic-3d-bar.md), [3D scene adapter](../issues/18-3d-scene-adapter.md))*

65. As a pioneer, I want to add occupants from outside the committed cube, cluster a proposed Build, or keep two saves in one tab. *(later — Horizon fog)*

66. As a pioneer, I want to drag the placement Cut band to set destination Z (landing gizmo). *(later — fog after 14)*

## Implementation Decisions

- **Host.** First non-throwaway Height view is additive in the current tab: same page, same WASM session, live buckets. Not a sidecar HTML, not Tauri-only, not a second renderer “to see,” not Three.js. Desktop inherits the site build.

- **Module seam.** New Height-view module, loaded after selection and before the editor. Occupants **are** today’s `selected` / `editTargets`. No parallel Build collection.

- **Loop.** Productize the throwaway prototype’s loop on the real client: committed XY rectangle → linked A–A′ / B–B′ Cuts → one shared start–end band → occupant set → existing Move. Z after commit starts as the full altitude span of XY occupants, then the player peels. Resize XY does not reset the window. One-axis edge edit (map or matching Cut vertical).

- **Two Z instruments.** Global altitude rail = authority cap for map drawing and `collectInBox`. Cut start–end band = Build peel inside that cap (AND). The Height-view control is that band (two handles plus body drag), not a second slider. No rectangle → no Cut. No mode button. Ctrl+click / Ctrl+A without a rectangle do not open the Cut.

- **Chrome.** Default L-frame overlay in the map overlay host (map size unchanged; no steal-layout, no re-anchor). A along the visible map’s bottom, B along the right, inset off filter dock / tool dock / altitude rail. Strip depth ~160 px, not scaled to the rectangle. Session switch L-frame ↔ flaps on Height-view chrome; no `localStorage` this cut; new rectangle does not reset the preference. Flaps overlay the box: length follows that side in screen space, depth ~120–160 px, minimum length for tiny boxes. Stacked strips stay out. Flip = click `A`/`A′` or `B`/`B′` labels (accessible names); independent per strip; new rectangle resets to A→A′ / B→B′. Empty volume: strips remain. Tokens stay shared UI / map CSS; do not restyle unrelated dock widgets.

- **Occupancy.** Today’s `collectInBox` skips: invisible buckets, layer-off, `hiddenClasses` out. Individually hidden objects remain selectable. Isolation Z = global cap AND Cut band. Belts/pipes whole-in on any in-window vertex. Power lines only if both endpoint owners are in the set. Straddlers silent. No geometric split, no weld, no chain-actor surgery.

- **Cherry-pick (with cube).** Inside the cube only (remove / re-add). Map: Ctrl+click if the object is in the cube. Cut: click the front mark (19 depth). Outside XY, band, or rail: no-op. New right-drag **replaces** the isolation rectangle. Subtracts persist by id while the actor stays in the cube; enter → selected; leave → drop from Selection and subtract list. Ctrl+A unchanged (global, dismisses Cut). Clear clears Selection and tears down rectangle and Cut. Adding from outside the cube is Horizon.

- **Cut marks (isolation, AABB).** Orthographic lateral onto A–A′ and B–B′ (along × Z). WebGL instanced boxes and polylines, same family as the map. Width = XY footprint projected onto that axis including yaw. Height from clearance min/max relative to actor `z` when present, else `z` → `z + dimensions.Height`, else **4 m dashed**. Placeholders are that projected AABB (never a 4 m square for a 10 m machine). Strict XY clip. Outside global cap: undrawn. Inside XY, inside global, outside band: faded. Yellow dashed = excluded overlap only (drawing, not occupancy). Lines = vertex polylines. Domain = occupant min/max, pad 20% of span (min 4 m, max 50 m). Dedupe `(typePath + along bin + Z bin)` separately for in-Build vs out-crossing; no stack count. Face = actor-local face with greater along projection; 45° snaps, never blends. Flip must be a flippable projection; chrome owns the control. Authored SVG is a destination format, not this cut’s pipeline.

- **Proof vs copy.** Proof walk is existing Move: apply edits, re-parse, fresh payload. Copy is clipboard extract and does **not** prove re-parse. Height-view paste Observation is ticket 14, not this cut.

- **Buffers.** Cut samples only the committed XY (∩ rail) from live bucket strides into instanced arrays. No dual JS payload tree. No world-scale second buffer. Measure 600k headroom **after** this exists.

- **Invariants.** Vanilla JS, no bundler, no React/R3F. `sav_core` stays the engine; wasm and Tauri shells stay parallel. Saves on-device. AGPL-3.0. No Coffee Stain art in git. Mapdata quirks and byte-splice editor stay. Read chained-belt-delete before any conveyor edit (this cut does not change that).

- **14 is not this implementation.** Move/paste relocate Observation (same L-frame retargeted to the ghost: dest + 20%/8–50 m pad, payload more attenuated, Z = floor of travelers, existing panel, click still commits move, no Cut-band drag) is a **second client chat** after the skeleton. Isolation clip (19) and placement population (14) are different jobs. Do not merge them in the skeleton.

- **15 is not this cut’s CI.** Isolate+copy/paste/delete/undo snapshot CI is the first-ship integrity gate. This cut’s proof is Move on the tab.

## Testing Decisions

Good tests check **external behavior** of isolation and the proof walk, not module internals, not WebGL draw-call lists, not whether a particular overlay node exists.

Highest seam: the live map tab. Walk rectangle → Cuts appear → band peels occupants → Move commits and the payload comes back. That is the feature.

Prefer existing seams over new ones:

- Occupancy: today’s box collection plus the two Z instruments (rail cap AND band peel). Assert who is in Selection after peel / cherry-pick / Ctrl+A dismiss — not a new occupancy engine.
- Proof: existing Move / apply-edits / re-parse. Copy is not the proof assertion.
- Chrome: shared UI behaviour / class guards after CSS class names; L-frame vs flaps, no Cut without rectangle, empty strips stay. Do not restyle unrelated chrome to make a test pass.
- Marks: AABB height vs 4 m dashed, fade outside the band, yellow only for excluded overlap, undrawn outside the rail. Do not require SVG glyphs.

Prior art: editor Move already drives progress UI and re-parse; selection already owns rectangle / Ctrl+click / Ctrl+A; altitude already gates buckets. Height view sits on those. Frontend has no unit tests; chrome guards are the Python UI scripts. `sav_core` CI for copy/paste/delete/undo + occupant snapshot is ticket 15 — **first ship**, not a gate to merge this cut.

Do not add a second renderer “to see.” Do not use in-game load as CI for this cut (that smoke is first-ship). Do not treat wasm OOM as a save-integrity failure.

## Out of Scope

Out of **this spec** (later / Horizon / campaign remainder). Still in the map unless listed on `map.md` Out of scope.

- Schematic 3D bar (resolved as Horizon ranking). 3D scene adapter (still open). NormalizedWorld diet, GPU picking, chunks, cheaper rest-of-save, exact 3D caps.
- Named-file Build package UX (extension, import, caps). Clipboard + named file remains the product contract; this cut does not ship file chrome.
- Occupancy drawing / extrusion / ghosts on the zenith map.
- SVG catalog, mesh-to-lateral extract, lifts-as-splines. AABB is the Cut.
- Add-from-outside-the-cube, clustering, two-save workspace.
- wasm 600k Cut-buffer headroom (measure after 16 is in the client).
- Landing gizmo (drag placement band to edit dest Z) — fog after 14.
- Occupancy summary before copy (counts, types).
- Terrain, WASD fly, in-world labels, `UnknownProxy`.
- Constructor, photorealistic 3D, `.sbp` Blueprint Lab, React/R3F/bundler, Coffee Stain art in git, uploading `.sav` bytes, weld, geometric chain split.

## First cut / later

- **First vertical cut** (this spec; stories **1–57**): Additive Height view on the current tab — chrome 13, occupancy 12, AABB marks 19, loop from 11, Move as proof. Survey 20 confirms AABB is not blocked. Implementing [Real-client skeleton](../issues/16-real-client-skeleton.md) **is** this cut; a resolved ticket is not a shipped skeleton.

- **Same first-ship, second implementation thread** (story **58**): [Height-driven edits](../issues/14-height-driven-edits.md). Dedicated client chat after the skeleton. Isolation marks (19) stay XY clip; placing retargets the same L-frame to the ghost. Do not fuse into cut 1. Do not wait on Horizon 3D.

- **First ship, not this cut** (stories **59–61**): Integrity CI and in-game smoke (15). OBJECTIVE’s copy/export. Named-file bytes (03) without file UX. Copy on the tab during cut 1 is allowed; it does not prove re-parse and does not close 15.

- **Later / Horizon** (stories **62–66**): glyphs/meshes, zenith occupancy drawing, schematic 3D, add-from-outside, clustering, two-save, landing gizmo, 600k measure.

Do not write an implementation plan or phases here. Next chat: implement 16 against this spec.

## Further Notes

**First cut vs first ship.** OBJECTIVE talks about copy/export. Ticket 15 requires copy/paste/delete/undo in CI. Ticket 16’s proof walk is Move. Resolve: the **first cut** proves Height view isolation + Move re-parse on the real tab. The **first ship** still owes 15’s CI, 14’s relocate Observation, and human in-game smoke. Clipboard copy may exist throughout; it is not the skeleton’s proof. Closing 16 as a decision is not “first ship done.”

**19 vs 14.** [Cut elevation marks](../issues/19-cut-elevation-marks.md) = isolation clip marks (strict XY, fade, yellow excluded overlap). [Height-driven edits](../issues/14-height-driven-edits.md) = placement population (dest neighborhood, attenuated payload, floor of travelers). Different jobs. Cite both. Do not merge.

**AABB is unblocked.** [Survey cut laterals](../issues/20-survey-cut-laterals.md): table XY/Z already feed a true-meter AABB Cut; glyphs and mesh extract have no producer; SCIM traces are top-down polygons, not laterals. Do not wait on laterals.

**Open on this map after this spec.** [3D scene adapter](../issues/18-3d-scene-adapter.md) stays open. Fog on `map.md` stays. The destination (Height view first, schematic 3D later) is not fully specced.

**Throwaway.** `prototype/2-5d-loop.html` is not the shipping renderer. Layout variants A/B/C informed chrome; production default is L-frame with session flaps.
