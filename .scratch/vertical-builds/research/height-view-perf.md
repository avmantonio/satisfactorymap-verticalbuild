# Height view: remaining performance after pointerup peel

Survey date: 2026-09-01. Study only — no product code. Occupancy / include-exclude while dragging the Cut Z band is **already being moved to pointerup** (`height_view.js` `bindBand` already comments that live peel is unusable on large builds). Assume that lands. This note is everything else that still hurts on heavy saves (100k–150k foundations, ~14k objects in a committed rectangle, 600k-object world).

Primary sources: `map/static/map/height_view.js`, `selection.js`, `map.js`, `webgl_layer.js`, `filters.js`; spec `.scratch/vertical-builds/specs/2-5d-first-cut.md`; tickets [12](../issues/12-volume-occupancy.md), [13](../issues/13-height-view-chrome.md), [16](../issues/16-real-client-skeleton.md), [19](../issues/19-cut-elevation-marks.md). Architecture survey: [current-map.md](current-map.md).

Does **not** reopen chrome dock (13), occupancy rules (12), host (16), or the AABB drawing contract (19). Several items below **are** 19/16 as written and missing from the walking skeleton.

## Gist

After pointerup-only peel, Height view is still a **main-thread DOM + full-world scan + full selection rewrite**. The Cut draws **one SVG node per occupant per strip** (`drawMark` → `svg.appendChild`). Fourteen thousand objects in the rectangle become ~28k SVG rects/paths, rebuilt from scratch on commit, peel release, filter/altitude change, strip resize, flip, and — in flaps — every map `move`. `collectInBox` still walks every point in every visible bucket even though `map.js` already has a per-bucket `_grid` for this. `SelectionTool.setRecords` always `clear()`s and rebuilds highlight geometry. That is the freeze, not WASM.

Ticket 19 already named **WebGL instanced boxes** and **bin-dedupe**. Ticket 16 already named **sample only the committed XY into instanced arrays, no dual JS tree, no world-scale second buffer**. The skeleton used SVG instead. Bringing the Cut onto the same family as the map (merged typed-array stream, not one DOM node per actor) is the largest remaining win and does not reopen 19.

Do **not** flip Height view to desktop-only. 600k wasm headroom stays fog ([map.md](../map.md) Runtime limits) until someone measures after a non-DOM Cut exists. Hidden classes are already off the payload. Peeling must not hide the rest of the save in WebGL — that would conflate the two Z instruments (13).

## In-flight (not a new recommendation)

**Occupancy recalc on Cut-band drag waits for `pointerup` / `pointercancel`.** `bindBand` already moves only `positionBandEl` on `pointermove` and calls `applyPeel()` + `drawCuts()` on `endDrag` (`height_view.js` ~945–988). Live peel of Selection + SVG on every pointer sample is what made 14k/100k factories unusable. Treat that as landed.

What pointerup **still** pays, every release:

1. `applyPeel` → `collectXyOccupants` → full `collectInBox` (world scan).
2. `recordInBand` filter + `SelectionTool.setRecords` (full Map rewrite + `aggregate` + highlight rebuild).
3. `drawCuts` → wipe both SVGs and recreate every mark.

Those three are the rest of this note.

## Ranked improvements

Impact is relative to a heavy isolation after pointerup-only peel. “14k box” = rectangle that yields ~14k XY occupants on a larger save. “150k foundations” = the box (or the factory) is that large. “600k” = whole-save scan cost even when the box is small.

| Rank | Win | 14k box | 150k foundations | 600k world, small box | Cost / risk | Independent chat? | Closed ticket? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Stop one SVG node per occupant (WebGL/canvas stream + 19 bin-dedupe) | High | Extreme | Low on draw (few marks); still pays collect | Medium: second canvas, pick mapping | Yes — Cut marks renderer | Implements 19/16; skeleton SVG is the shortcut |
| 2 | `collectInBox` / yellow scan via existing `_grid` + `_lineBounds` | Medium | High | Extreme | Low: reuse `map.js` index | Yes — spatial collect | Same occupancy as 12 |
| 3 | Band-only peel: keep XY set; delta `selected` instead of `setRecords` rewrite | High | Extreme | n/a (box small) | Medium: highlight cache invalidation | Yes — selection delta | Same occupants |
| 4 | Coalesce Cut redraws; never rebuild marks on flaps pan | High in flaps | Same | n/a | Low | Yes — draw scheduling | Do not reopen 13 layout |
| 5 | Cheap CPU on the remaining draw/peel (cache extents, one `recordInBand`, skip double collect on commit) | Medium | Medium | Low | Low | Fold into 1 or 3 | None |
| 6 | Worker / OffscreenCanvas for Cut tessellation | Low–medium later | Medium later | Low | High: copy typed arrays, vanilla no bundler | Later, after 1 | 16: same tab, live buckets |
| — | GPU-hide rest of save / expand `hiddenClasses` / desktop-only | — | — | — | — | No | Would violate 12, 13, or 16 |

---

### 1. SVG AABB mark count / DOM (largest remaining draw cost)

**What is slow.** `drawOneCut` deletes every child (`while (svg.firstChild) svg.removeChild`) then appends background, four grid lines, and **one SVG `rect` or `path` per occupant** (`height_view.js` `drawOneCut` ~599–654, `drawMark` ~656–757). `drawCuts` does that for **both** A–A′ and B–B′. Occupants outside the band stay in `xyOccupants` and are still drawn faded (19 / spec story 26). Excluded overlap is concatenated onto the same list.

So mark count ≈ `|xyOccupants| + |excludedOverlap|` **times two strips**. A 14k-occupant rectangle is ~28k SVG elements. A 100k–150k foundation slab is 200k–300k. Each mark is `createElementNS` + many `setAttribute`s + `appendChild`. `recordInBand` and `zExtent` run per mark (and again while splitting faded vs in-band).

Triggers that still full-rebuild after pointerup-only peel:

- Peel `pointerup` (`endDrag`).
- `commitRectangle`.
- `onAltitudeChanged` / `onFiltersChanged`.
- `ResizeObserver` on both strips (`ensureChrome` ~295–301) — opening the side panel sizes two strips and can fire **two** `drawCuts`.
- `window.resize`.
- Flip (`flipStrip` → `drawCuts`).
- Flaps: `onMapViewChanged` on Leaflet `"move zoom resize"` (`bindMapEvents` ~438–458) — **every pan frame**.

The file header states the shortcut: “Cut marks are projected AABB in **SVG** — no second canvas, no 3D.”

**Evidence vs closed drawing contract.** [Cut elevation marks](../issues/19-cut-elevation-marks.md) Answer: the strip is drawn in **WebGL** (instanced boxes and polylines, same family as the map). [Real-client skeleton](../issues/16-real-client-skeleton.md) / spec Implementation Decisions: Cut samples **only** the committed XY (∩ rail) from live bucket strides into **instanced arrays**; no dual JS payload tree; no world-scale second buffer. Spec story 49 is that buffer rule.

19 also specified **dedupe** `(typePath + along bin + Z bin)` separately for in-Build vs out-crossing — one mark per bin, no stack count. `drawMark` does not bin. A foundation megabase of one `typePath` at one Z would still emit one rect per actor.

Cherry-pick tension (do not paper over): 16 says Cut click is the **front** mark (19 depth). Dedupe merges actors into a bin. Click then toggles whichever occupant that bin’s front record maps to — 19 already said no stack count. Implementation must keep `data-key` → record for `onCutClick` (`height_view.js` ~893–907). Bin → one representative (painter’s nearest) is consistent with both tickets; a pick buffer / extra id attribute is the engineering, not a re-grill.

**Map WebGL caveat (do not cargo-cult “instanced”).** `webgl_layer.js` ~157–164: ANGLE instancing was **~2.5 s/frame** for 465k rects on SwiftShader; the shipping map uses **non-instanced `drawElements`** with 4 expanded vertices/quad (~95 MB for the big test save). 19’s “instanced” means “same family as the map” (typed-array stream, one draw, not DOM). Copy the merged-stream pattern. Two extra WebGL contexts (one canvas per strip) is the main risk; prefer **one** Cut canvas (or canvas 2D Path2D, which `selection.js` already proved for 100k+ footprints — see highlight comment ~261–266). Canvas 2D would slightly diverge from 19’s word “WebGL” while keeping the AABB contract. Either is a Cut-renderer thread, not a 3D camera (16: no second renderer “to see”).

**Impact.** Dominant remaining jank on 14k and the reason 150k foundations cannot ship as SVG. GPU/canvas of XY-only samples is a few MB, not a second world buffer.

**Cost / risk.** Medium. New canvas in the strip; hit-test for Cut click; context-loss fallback (map already falls back to 2D). Vanilla JS, no bundler. Do not upload save bytes; do not vendor art.

**Independent thread.** Yes: “Cut marks renderer (non-DOM AABB + 19 bins).” Can land after pointerup peel without touching occupancy rules.

**Violates closed ticket?** No. Implements 19/16. Does not reopen laterals (20) or schematic 3D (08/18).

---

### 2. `collectInBox` scans all buckets vs the spatial index that already exists

**What is slow.** `SelectionTool.collectInBox` (`selection.js` ~127–183) iterates `MapApp.layer.buckets`. For every **visible**, non-`excludeFromSelection` bucket it walks **every** rect/point (`pts.length / stride`) or **every vertex of every line**. No use of `bucket._grid` or `bucket._lineBounds`. Altitude is tested per point. `hiddenIndices` are **not** skipped (correct per 12: individually hidden objects stay selectable).

Height view calls that from `collectXyOccupants` on **every** `applyPeel`, plus again from `commitRectangle` before `applyPeel` (double scan on open). `collectExcludedOverlap` (`height_view.js` ~759–848) is a **second** full-bucket walk for yellow dashed overlap (19 drawing, not occupancy). `onAltitudeChanged` / `onFiltersChanged` redo both.

`map.js` `addBucket` (~140–154) already builds:

- `_buildPointGrid` for circle/icon/rect buckets — the comment is that walking the entire `points` array was “zoom freezes for a few seconds.”
- `_lineBounds` for line buckets — O(1) reject vs scanning every vertex (`_buildLineBounds` ~1719–1757).

Redraw and `hitTest` use `_collectGridIndices`. Selection and Height view do not.

**Impact.** On a 600k-object save, committing a **small** rectangle still tests ~every plotted point. A 14k-in-rect factory on a 150k-foundation save still scans the other 136k foundations plus every other visible category. A world-sized 150k box does not get much from the grid (almost every cell hits) — then rank 1 and 3 dominate. Line vertices are extra: belts are not grid-indexed; `_lineBounds` AABB reject is the cheap first cut, then vertex-in-box (12/19 whole-actor rule).

**Cost / risk.** Low. Same occupancy predicate; query acceleration only. Grid cells are coarse — keep the per-point box + altitude test (as `_collectGridIndices` already documents ~1689–1693). Do not change straddler / power-line rider rules (12: silent whole-in; riders still both endpoints).

**Independent thread.** Yes: “Spatial `collectInBox` (+ Height-view yellow scan).” Can ship without Cut-renderer work. Biggest win for **small/medium boxes on huge saves**.

**Violates closed ticket?** No. 12’s occupant set is unchanged. Do not pull `hiddenClasses` back into the payload to “select them faster.”

---

### 3. Full selection-set rewrite vs delta (and XY recollect on band-only peel)

**What is slow.** `applyPeel` (`height_view.js` ~225–244):

1. Re-runs `collectInBox` even when only `band.min`/`band.max` changed.
2. Filters `recordInBand` (line buckets walk vertices again).
3. Rebuilds `next` and calls `SelectionTool.setRecords(next)`.

`setRecords` (`selection.js` ~970–976) always `selected.clear()`, re-`set`s every record, then `refreshUI`:

- `aggregate()` walks every selected record, builds `actorNames` / `lightweight` arrays and bbox (`selection.js` ~197–248).
- `invalidateHighlightCache` + `requestHighlightDraw`.
- `rebuildGroupCache` walks the whole Map again (`selection.js` ~369–415).
- `drawHighlight` rebuilds Path2D footprints (viewport-culled; `closePath` was already banned because 50k footprints were ~4.5 s in Chrome — `appendFootprint` ~417–422).

`selection.js` ~261–266: the highlight canvas exists because a JS loop over every selected object made **100k+ selections crawl**. Peel still throws that cache away on every pointerup even if 90% of ids did not change.

`commitRectangle` collects XY, then `applyPeel` collects XY again (~1023–1030).

**Impact.** High at 14k (aggregate + highlight rebuild on every peel release). Extreme at 100k–150k (this is the same cliff selection already documented). Band-only peel does not need a world `collectInBox` at all: `xyOccupants` is stable until the rectangle, filters, or altitude rail change.

**Cost / risk.** Medium. Delta `selected` (add/remove by `recordKey`) plus a highlight cache that can drop one bucket’s Path2D is more delicate than a spatial collect. Wrong delta breaks Move/copy targets. Cherry-pick `subtractIds` already exists — peel should honor it without rebuilding the XY list.

**Independent thread.** Yes: “Band peel = filter cached XY; `setRecords` delta.” Orthogonal to Cut drawing. Do not invent a parallel Build collection (16: occupants **are** `selected`).

**Violates closed ticket?** No.

---

### 4. Layout / reflow from side panel and flaps (draw scheduling, not chrome redesign)

**What is slow.** Spec 13 / CSS: the side panel is an **overlay** in `#mapOverlays`; map size does not change; no steal-layout, no re-anchor (`map.css` ~3056–3061, `body.height-view-side` only insets Leaflet controls and `#selectionPanel`). That already avoids `invalidateSize` on open — [dock-map-anchoring.md](../../../docs/dock-map-anchoring.md) is why docks overlay the map. **Do not** steal layout or re-try dock re-anchoring.

Remaining costs:

- `stripGeom` reads `svg.clientWidth` / `clientHeight` (`height_view.js` ~539–541) — layout read, then thousands of DOM writes (`drawMark`). Classic forced reflow if a ResizeObserver callback does this.
- `ResizeObserver` on **both** strips calls `drawCuts` (full SVG rebuild) whenever either strip’s box changes. Side-panel open, window resize, and flaps `positionChrome()` (inline width/height on the strips) all retrigger it.
- Flaps: `MapApp.map.on("move zoom resize", onMapViewChanged)` redraws the entire Cut while the map is **panning**. Side panel only `positionChrome()` on move (no-op unless flaps) — side is fine for pan; flaps are not.

**Impact.** Opening the panel: one or two extra full Cut rebuilds on top of `commitRectangle`’s own `drawCuts`. Flaps + 14k marks: pan is unusable until marks leave the DOM (rank 1) **or** pan stops calling `drawCuts` (this rank). After a canvas Cut, pan still must not rebuild GPU buffers every frame — flaps only need to **reposition** the host.

**Cost / risk.** Low. rAF-coalesce observers; flaps pan → `positionChrome` only; rebuild marks on `moveend` / zoom. Do not change default side panel vs flaps (13 amendment 2026-09-01). Do not resurrect L-frame.

**Independent thread.** Yes: “Cut draw scheduling.” Can land on SVG or canvas.

**Violates closed ticket?** No, if chrome placement stays 13.

---

### 5. Hidden work on the CPU path (extents, double collect, O(n) toggle)

Smaller than 1–4; fold into those chats rather than a solo thread.

- **`recordInBand` / `zExtent` / `altitudeCap` recompute per occupant, per strip, per draw.** `drawOneCut` splits faded vs in-band with `recordInBand`, then `drawMark` calls `recordInBand` again and `zExtent` (line buckets walk vertices; buildings always `z`…`z+DEFAULT_HEIGHT_M` — table height is not on the payload yet, 19’s 4 m dashed). Cache `{zMin, zMax, inBand}` on the XY occupant list when the band or rail changes.
- **`commitRectangle` collects XY twice.**
- **`allowToggle` is `cubeOccupants.some(...)`** (`height_view.js` ~246–253) — O(n) per Ctrl+click. Use a `Set` of keys. Not a heavy-save freeze by itself.
- **Table height missing** is a drawing-correctness hole, not a perf hole (every foundation is a 4 m dashed box). Laterals survey already said table Z is usable ([cut-laterals.md](cut-laterals.md)). Filling height does not make 150k SVG rects cheap.

---

### 6. WebGL map visibility vs JS selection

**What is true.** Peel does **not** flip `bucket.visible`. Filters own that (`filters.js` `redrawBuckets` → `requestRedraw` + `HeightView.onFiltersChanged`). The map WebGL layer still draws the altitude-capped save (`webgl_layer.js` `RECT_VS` culls on `u_altRange`, visibility texel, `a_hidden`). Selection is a separate 2D overlay canvas (`selection.js` highlight). Height view’s occupant set is `selected`, not GPU visibility.

That split is the product: [13](../issues/13-height-view-chrome.md) two Z instruments — rail = map + occupancy cap; Cut band = peel inside that cap. Faded marks on the Cut are 19. Zenith occupancy drawing / extrusion / ghosts stay Visual presentation **fog** (spec Out of Scope, [map.md](../map.md)).

**Do not recommend** using `a_hidden` or `bucket.visible` to hide the rest of the factory when Height view opens. That would make “what I see” and “what I take” the same control — the hole 13 closed. GPU load of the zenith map is the existing 600k draw cost, not incremental Height-view peel cost. Incremental cost is SVG + collect + selection rewrite.

If a later Visual-presentation ticket wants cheaper rest-of-save on the map, that is 08/18 / fog, not a Height-view perf cheat.

---

### 7. `hiddenClasses` / straddlers / `hiddenIndices`

**`hiddenClasses`.** Dropped in `sav_core` at payload build (`categories.rs` `is_hidden_class`; `buildings.rs` collectors `continue`). Sign poles / path nodes never reach JS buckets. Height view pays **zero** for them. Ticket 12 / spec story 17: they stay out of the Build. Expanding them into the payload would **hurt** perf and reopen 12. Not a Height-view optimization.

**`hiddenIndices`.** Per-object hide (`map.js` `_isHidden` ~1897–1904). `collectInBox` does **not** skip them. [12](../issues/12-volume-occupancy.md) Answer: they remain selectable. [current-map.md](current-map.md) §2 claiming `collectInBox` skips `hiddenIndices` is **stale** vs today’s `selection.js`. Leave as-is.

**Straddlers.** Occupancy: whole actor, silent (12). Yellow dashed = excluded overlap **drawing** only (19). `collectExcludedOverlap` is the extra full scan (rank 2). Do not add a straddler warning (12 closed). Do not geometrically split belts.

---

### 8. Worker vs main thread

Parse/edit already run on the WASM worker (`save_client.js` / `worker.js`). After load, **buckets live on the main thread** (`filters.js` `Float32Array` points). Height view is 100% main: collect, SVG, selection.

Moving `collectInBox` into the worker means posting box bounds and copying result records back — the points are not in the worker after the payload transfer. A Cut **geometry** worker (build typed arrays / OffscreenCanvas) can help **after** rank 1 chooses a non-DOM renderer. Cost: duplicate XY sample bytes, extra thread, vanilla script (no bundler). 16: same tab, same WASM session, live buckets — do not spin a second parser or a sidecar HTML.

**Impact.** Not the first win. Rank 1–4 are main-thread algorithm/DOM. Worker is a later overlay.

**Do not** use worker difficulty as a reason for Tauri-only Height view (16 closed: additive in the current tab; desktop inherits `dist/`).

---

### 9. 600k-object wasm headroom (fog — not “desktop only”)

[map.md](../map.md) / CONTINUE fog: Cut-buffer / 3D headroom on a 600k save — measure **after** 16 is in the client. Spec Out of Scope: wasm 600k Cut-buffer headroom. 16: flip to desktop-only **only if that OOM’s**.

Today’s Height-view extra memory is **JS**: `xyOccupants` / `cubeOccupants` record objects, `subtractIds`, SVG DOM, plus selection’s `selected` Map (which isolation already needed). It is **not** a second copy of the decompressed save in WASM. Standing wasm ~2 GB on 600k ([AGENTS.md](../../../AGENTS.md), [current-map.md](current-map.md) §5) is the parse wall; Cut SVG does not eat that heap, it stalls the **UI thread**.

A non-DOM Cut of **XY ∩ rail only** (16) is small: even 150k quads × 32 bytes × 2 strips is order ~10 MB, vs ~95 MB for the **world** rect stream (`webgl_layer.js` ~163–164). The landmine is a **world-scale second buffer** — already forbidden.

**Recommendation.** Keep measuring as fog. After rank 1, record JS heap + wasm memory on a 600k save with Height view open. Do not pre-emptively split browser/desktop for this feature.

---

## What not to do

- Re-grill 12 occupancy, 13 side vs flaps, 16 host, 19 AABB vs glyphs.
- Live-peel occupancy on `pointermove` (in-flight / already rejected in-file).
- Hide rest-of-save in WebGL as a peel optimization.
- Put `hiddenClasses` back on the wire.
- Second Three.js scene “to see” the Cut.
- Bundler / React.
- Treat wasm OOM as the current slowness (it is not).

## Suggested future implementation chats (separate)

1. **Cut marks renderer** — non-DOM AABB (map-family WebGL stream or canvas 2D), 19 bin-dedupe, Cut-click → occupant mapping. Largest remaining win.
2. **Spatial collect** — `collectInBox` + `collectExcludedOverlap` use `_grid` / `_lineBounds`. Largest win for small boxes on huge saves. Can parallel 1.
3. **Band peel delta** — cache `xyOccupants`; peel = `recordInBand` + delta `selected`; do not `collectInBox` or `setRecords` rewrite when only the band moved.
4. **Draw scheduling** — coalesce ResizeObserver; flaps pan repositions chrome only. Small, safe, can merge with 1.

Later, not now: Cut tessellation worker; 600k heap measurement once (1) exists. Height-driven edits (14) and integrity CI (15) stay their own chats and are not perf.

## Ticket map

| Closed decision | Perf implication |
| --- | --- |
| 12 occupancy | Same `collectInBox` skips; faster query OK; do not expand hidden classes |
| 13 chrome | Overlay side panel stays; do not steal map layout; flaps scheduling OK |
| 16 skeleton | Same tab; occupants = Selection; XY-only instanced buffers; measure 600k later |
| 19 marks | WebGL/AABB/dedupe/fade/yellow are the contract; SVG skeleton is the gap |
