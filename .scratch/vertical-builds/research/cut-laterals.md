# Cut laterals: what exists vs what would have to be modeled

Survey date: 2026-08-27. Ticket: [Survey cut laterals](../issues/20-survey-cut-laterals.md).

This note splits **already usable** Cut inputs from **producers that do not exist yet**. It does **not** pick a pipeline. [Cut elevation marks](../issues/19-cut-elevation-marks.md) already named the drawing contract (orthographic lateral, meters, yaw, AABB placeholder, SVG as a *destination format*). [Real-client skeleton](../issues/16-real-client-skeleton.md) already contracted first-ship marks as **projected AABB**. This survey does not reopen either.

Counts below are from `game_data/generated/docs/buildings.json` in **game-data-v3** (546 classes), cited against the extractors and `SCHEMA.md` that produce that file. This checkout did not have generated tables on disk; the zip is the same archive CI unpacks.

## Gist

The map already draws **rotated AABB rectangles** whose XY size comes from `buildings.json` clearance (union) or `dimensions`, in real meters. That is the same “simplified figure, true limits” a Cut AABB needs. Height is **not** on the save payload; a Cut would look it up by class from those tables (clearance Z union, else `dimensions.Height`, else the 4 m dashed fallback 19 already named).

Richer laterals (constructor vs smokestack) have **no producer in this repo**. The game does not ship side elevations. SCIM’s closer-to-model figures are **hand-traced top-down polygons** (JSON, ~67 classes), not laterals, and their license forbids reuse. Menu icons are not elevations (19). Official meshes can be exported locally with FModel (glTF), but `extract_all.py` does not do that today, and Coffee Stain art stays out of git.

AABB peel is unblocked. Glyphs, mesh-to-lateral extract, and lift-height-from-spline would have to be modeled before anyone grills which of those to build.

## What the two maps actually draw (top-down, not Cut)

This is the reference Anto brought in (this app vs SCIM interactive map). It is a **zenith** comparison. It does not answer the Cut’s along×Z question by itself: a top-down outline rotated 90° is still a plan, not an elevation.

### This app — instanced rectangles, real meters

Production buckets are top-down marks: buildings `[x, y, yaw, z]`, belts/pipes as map-pixel polylines with `z` last ([Survey the current map](current-map.md), `filters.js` stride comments at 383 and 405).

WebGL rects are a yawed box from `footprintPixels` half-extents (`webgl_layer.js` `RECT_VS` 175–231; `a_halfBox` is local half width/depth). Color is the sidebar category, not a per-class glyph. Tilted instances and adaptive beams can carry a convex polygon (`geometry.rs` `footprint_for_instance` 421–453; `buildings.rs` `tiltedFootprints` 194–217); that is still a **plan** silhouette, not a side elevation.

XY size is looked up at payload-build time, not stored per instance:

- Clearance boxes → actor-frame XY union (`geometry.rs` `boxes_xy_union` 269–281, `footprint_meters_from_building_entry` 283–309).
- Else `dimensions.Width` / `Depth`.
- Else curated `classFootprintsMeters` / hardcoded Elevator and FloodlightWall (`geometry.rs` 349–373).
- Conveyor lifts: substring fallback **1 m × 1 m** (`FALLBACK_FOOTPRINTS_METERS` 187).

Units: Docs.json centimeters; divide by 100 for meters (`SCHEMA.md` 159–165). The Smelter fixture is a 5 m × 10 m plan (`geometry.rs` test 505–507).

### SCIM — traced plan polygons, not a Cut, not reusable

SCIM is a 2D map + altitude filter ([peer-tools.md](peer-tools.md) §2). README (`dev`, fetched 2026-08-27): reuse of source and **data assets is not permitted**; educational viewing only.

How those “model-like” outlines are made (primary, `src/Models/`):

- Per-class JSON under `src/Models/Buildings/` — **67** `Build_*.json` files on `dev` (jsDelivr package listing 2026-08-27). 546 classes exist here; the rest fall back to a box.
- `__MODELER.html` is a click-to-trace tool: load a bitmap (`data-imgsrc`), snap to a 5 px grid, export `[[x,y], …]` centered on the canvas. Based on matteomattei/jPolygon.
- `__model.png` is the trace background (top-down render/screenshot).

That is **authored 2D plan polygons**, stored as JSON point lists, not SVG, not side elevations, not generated at save-load time. Pattern is educational only. Copying those JSON files or their coordinates is out.

## Already usable

### 1. Table height / XY for AABB (usable now)

`extract_docs_json.py` stores three independent size buckets (`SCHEMA.md` 148–222; `extractBuilding` 275–285).

**game-data-v3, 546 `Build_*` classes:**

| Bucket | Count | Cut implication |
| --- | --- | --- |
| Non-empty `clearance` | 501 | 19: height = clearance min/max Z relative to actor `z` |
| `dimensions.Height` ≠ 0 | 354 | Fallback when clearance is empty |
| Both Height and clearance | 351 | Prefer clearance (19). Watch disagreements below |
| Height, no clearance | 3 | `Build_ConveyorPole_C`, `Build_PipeHyperSupport_C`, `Build_PipelineSupport_C` (all Height 100 cm) |
| Clearance, no Height | 150 | Z from boxes is the only table height |
| Non-empty `adaptiveLength` | 32 | Length is per-instance; see lifts/belts/beams |
| All three buckets empty | 17 | 19’s **4 m dashed** until curated or SVG |

`geometry.rs` already computes a Z half-extent from the clearance **union** (`footprint_half_extents_meters` 311–322: `min` of all `min.z`, `max` of all `max.z`). That value is used today only for **tilted plan** polygons, not sent on the wire. A Cut AABB can recompute it from the same embedded `buildings.json` (`gamedata/mod.rs` 192).

**Known table quirks (Cut AABB will inherit them):**

- **Stale garage-door clearance** (`SCHEMA.md` 200–208): `Build_BigGarageDoor_16x8_*` clearance Z span 400 cm vs `dimensions.Height` 800 cm (and Width 1600 vs a too-small clearance XY). The map already bumps XY from `dimensions.Width` (`geometry.rs` 288–298); 19 prefers clearance for *height*, so these three would draw **4 m tall** unless a Cut height path also applies the Width-style correction, or uses Height when it exceeds clearance Z.
- **Double ramps** go the other way: `dimensions.Height` 400 cm vs clearance Z 800 cm (and `Build_Ramp_8x8x8_C` the same). Clearance-first matches the physical AABB better here.
- **Space Elevator**: six clearance boxes; one spans `z = 0 … 100000` cm (1 km). Clearance-union height would dominate the Cut’s vertical domain (19 pads 20% of occupant span, max 50 m — a 1 km mark still sets the domain).
- **Alien Power** box 0 starts at `z = -2000` cm (extends below origin).
- **Blueprint Designers**: extractor converts `mDimensions` grid to Width/Depth and **drops grid Z** (`extract_docs_json.py` 186–190: `_gridZ` unused). No clearance. Mk.1/2/3 would AABB as 4 m dashed unless someone restores that Z (32 / 40 / 48 m per wiki, already in [peer-tools.md](peer-tools.md)).
- **Elevator** / **FloodlightWall**: SCHEMA hole list (`SCHEMA.md` 196–200). Elevator has `Height: 0` (treated as no height). XY is hardcoded 8×8 m and 0.6×0.3 m (`geometry.rs` 353–354). Height still missing → 4 m dashed.

### 2. Multi-box clearance is not a stacked lateral (usable only as union AABB)

`parseClearanceBoxes` keeps every box’s min/max **including Z**, plus optional rotation; **it does not capture `RelativeTransform` translation** (`extract_docs_json.py` 151–176; `SCHEMA.md` 188–190: “footprints are rendered centered on the actor”).

`geometry.rs` then **unions XY** (`boxes_xy_union` 269–281). It never draws per-box stacks.

game-data-v3: **34** classes have more than one box (max **24**). Constructor Mk.1 is typical:

| Box | XY cm | Z cm |
| --- | --- | --- |
| 0 | 800 × 1000 | 0–600 |
| 1 | 40 × 40 | 0–250 |
| 2 | 50 × 50 | 0–130 |

All three start at `z = 0` and would be drawn **concentric on the actor origin** without translation. The 40 cm posts (ports) are not at the ports. Assembler Mk.1’s taller 9×5.5 m volume (0–500) vs the 9×16 m body (0–300) would sit in the middle, not at the back.

**Already usable:** the union AABB (Constructor: 8×10 m plan, 6 m tall). **Not usable without new extract work:** a stacked along×Z silhouette from those boxes. Capturing translation (and using rotation that is already stored — 16 boxes have a quaternion) is a different job.

### 3. Hand-curated footprints — hole list for XY, not height

`categoryOverrides.json` `classFootprintsMeters` (32–48): 14 classes, `[widthMeters, depthMeters]` only (HUB props, lift-mounted splitters, fence/railing ramps, railroad switch). Comment: measured from comparable clearance or the wiki. No Z.

Hardcoded in `geometry.rs` 353–354: `Build_Elevator_C` (8, 8), `Build_FloodlightWall_C` (0.6, 0.3).

These fill the **plan** hole so the map is not a red dot. They do not give Cut height. 19’s 4 m dashed still applies.

### 4. Icon / game-data pipeline — legal and packaging analogue, not pixels to rotate

- Generated tables and icons are **not in git** (`game_data/README.md`; `.gitignore` `game_data/generated/`, `map/static/map/icons/`).
- `copy_icons.py` 1–8, 88–108: copies `mPersistentBigIcon` PNGs out of an FModel texture dump, keyed by ClassName, so the rest of the dump can be deleted. ~2 buildings have no icon (`SCHEMA.md` 119–121).
- CI unpacks **game-data-v3** (`.github/workflows/ci.yml` 26–36).
- `NOTICES.md` 38–46: game-derived data is Coffee Stain’s; the zip is a convenience for owners, not this project’s art.

19 already forbade treating UI/menu icons as Cut marks. A 256 px isometric-ish icon is not an orthographic elevation and must not be stretched into the AABB. The **pattern** that *would* apply to a generated lateral atlas is: local extract → gitignored files → zip for CI → never commit Coffee Stain pixels.

Authored **our** SVG in git is the other home 19 named (AGPL, keyed by class + face, rasterized to an atlas at load). That producer does not exist yet.

### 5. FModel dump this repo already requires — JSON + textures, not meshes

`extract_all.py` 10–32, 52–63: the Content dump must include Package **Properties (.json)** and Package **Textures**, plus Localization raw CSVs. Preflight paths: GamePhases, creature descriptors, `Map/GameLevel01`, sliced map, `World_Data.csv`. `copy_icons.py` explicitly treats meshes in that dump as disposable (lines 6–8).

Static meshes **live in the same utoc**, but this extract path does not export them. Official mesh extract is a **different FModel action**: Settings → Models → glTF 2.0, First Level Only, PNG textures ([FICSIT Extract Game Files](https://docs.ficsit.app/satisfactory-modding/latest/Development/ExtractGameFiles.html), fetched 2026-08-27). Redistribution of those assets is not allowed without permission (same page). [3d-fork-options.md](3d-fork-options.md): FModel → glTF is local, never in git, after schematic 3D — and that path is **3D proxies**, not Cut laterals.

An orthographic-render-to-lateral extractor would need: mesh export (glTF), a local renderer (Blender/headless), face axes, LOD choice, and a gitignored atlas. That is **not** `extract_all.py` today and **not** the later 3D glTF scene.

### 6. Payload — no per-instance height

Buildings: stride 4 `[x, y, yaw, z]` meters (`buildings.rs` 109–112; `filters.js` 383). Bucket also carries `footprintPixels` `[halfWidth, halfDepth]` map-px (`buildings.rs` 193–215) so XY is already on the client **per type**, not per instance.

Height for a Cut AABB is a **class table lookup** (same `buildings.json` the WASM already embeds), not a new wire field. Adaptive beams already send a per-instance polygon when length/tilt requires it; belts send vertex `z`. Lifts do not (next section).

## Would have to be modeled

### Per-class vs per-family; two faces

19: two elevations per class; the strip picks the actor-local face with greater along projection; 45° snaps; SVG stretches **upright** into the AABB.

If every `Build_*` needed a unique pair: 546 × 2 = **1092** faces. Most of those 546 are foundation/wall/ramp **skins** of the same box. Distinctive production machines are a much smaller set (SCIM traced 67 **plan** polygons and left the rest as boxes). Mk.1–Mk.6 belts/lifts share a silhouette. A family key (smelter, constructor, 8×4 foundation, …) would shrink the catalog; this repo has build-menu categories (`categoryLabels.json`) but no “same lateral as” table.

One mirrored face vs two authored faces is also unmodeled: many machines are not front/back symmetric (inputs vs outputs). 19 requires two faces; whether the second is a mirror is a later grill.

### File format and home (named, not chosen)

19 named **SVG in git** (our art, AGPL) → raster atlas at load. Alternatives that would have to be specified later:

| Home | Who owns the pixels | Regenerates on patch? |
| --- | --- | --- |
| Authored SVG in git | This project (AGPL) | No — drifts vs new `Build_*` |
| Generated raster atlas, gitignored, game-data-vN zip | Coffee Stain (extract) | Yes, like icons |
| Projected boxes only | No art | Tables already regenerate |

Do not pick among these here.

### Mesh orthographic extractor (no producer)

Inputs that would exist after a *local* FModel mesh export: glTF 2.0 + PNG, LOD0, actor-local axes (game cm). Face cameras: two orthographic views along actor X and Y (matching 19’s A-axis / B-axis). Output: PNG or SVG silhouette per class+face, packed like icons.

This is a new script, not `copy_icons.py`, not the 3D scene adapter, not schematic lookalikes. Legal home = gitignored / zip / owner’s machine, same as icons (`NOTICES.md`).

### Conveyor lifts, belts, pipes, beams

**Belts / pipes / rails / hypertubes — usable now as 19 specified:** `collect_belts` uses `conveyor_belt_only_type_paths()` which **drops** `ConveyorLift` (`consts.rs` 109–120, `lines.rs` 235–237). Remaining belts are `mSplineData` polylines, stride 7, `z` last (`filters.js` 402–407). Cut: project `(along, z)`, whole actor, no split.

**Lifts — would have to be modeled.** They are in `typePaths.json` `conveyorBelts` (9–14) but **excluded from line buckets**. `filters.js` 719–722: a lift is a vertical structure drawn as a **building box**. Table: no clearance, no dimensions, `adaptiveLength.MeshHeight = 200` cm (one repeating segment, not the instance). Map fallback: 1×1 m (`geometry.rs` 187). Save actors still have `mSplineData` (same property belts use); this payload **does not collect it**. A Cut AABB would be 1×1 m × 4 m dashed (or 2 m if someone misreads MeshHeight as height). Real lift height is per-instance spline Z. Collecting lift splines (or min/max vertex Z) is a new payload job, not a glyph.

**Beams:** `adaptiveLength` DefaultLength + MaxLength plus clearance (`geometry.rs` 375–396). Length is per-instance (`BeamLength` on lightweight data, `buildings.rs` 39–47). Plan polygon already exists. Cut extent along the beam is that length; height is the clearance cross-section — usable if the Cut reads adaptive specs, not `dimensions.Height`.

**Ladders:** `MeshHeight` + Width 80 cm, no clearance — similar “segment vs instance” hole.

### Game-patch versioning

- Docs.json tables: re-run `extract_docs_json.py` / `extract_all.py`. AABB height follows.
- Authored SVG: new classes ship as 4 m dashed until someone draws them; old drawings drift if a machine’s real size changes (garage-door class of bug).
- Mesh extract atlas: regenerates like icons; needs a new FModel mesh pass each patch, which `extract_all.py` does not preflight today.

### ModelingTools / lookalikes

[DavidHGillen/Satisfactory_ModelingTools](https://github.com/DavidHGillen/Satisfactory_ModelingTools) README license (fetched 2026-08-27): built from scratch by referencing ripped assets; **only** for free use with Satisfactory mods, memes, videos, content, reviews; any other use “will be terminated.” FICSIT docs present them as re-modeled *pieces* of machines for mod authors ([ModelingTools](https://docs.ficsit.app/satisfactory-modding/latest/CommunityResources/ModelingTools.html) via the Extract Game Files page).

Using those meshes as 2.5D elevations would be a license-per-file / “is a save-map Cut ‘content’?” question this survey does not answer. [Schematic 3D bar](../issues/08-schematic-3d-bar.md) already ranked **lookalike kit** for the later 3D dock. Cut marks are Height-view drawing, not that kit. Leave lookalikes on 08.

### Fallback (already contracted)

19: missing height → **4 m**, **dashed**, until table height and/or official SVG exist. Placeholder is the **projected AABB** (true XY × that height) — never a 4 m square for a 10 m machine. Generic family shapes optional *inside* that box.

Empty-size classes (17), designers (no Z), lifts (no instance height), Elevator/FloodlightWall (XY only) all hit this fallback unless a later producer fills them.

## Source table

| Source | Cut use | git / generated / local | Gap |
| --- | --- | --- | --- |
| `buildings.json` `clearance` Z union + XY union | AABB width (with yaw) and height | generated (embedded) | **Usable now** for ~501 classes. Garage-door / Space Elevator / Alien Power quirks. |
| `buildings.json` `dimensions.Height` / Width / Depth | Height when no clearance; XY when no clearance | generated | **Usable now**. Designers: XY only (grid Z dropped). |
| `adaptiveLength` (beams) | Instance length + clearance cross-section | generated + save `BeamLength` | **Usable now** if Cut reads beam specs / tilted polygon. |
| Belt/pipe/rail/hypertube splines | Vertex polyline `(along, z)` | save payload | **Usable now** (19). |
| `classFootprintsMeters` + Elevator/FloodlightWall hardcoded | XY only | curated / code | **Usable now** for plan; height still 4 m dashed. |
| Conveyor lift spline / MeshHeight | Vertical extent | save has spline; payload does not | **Needs modeling** (collect spline or instance Z). Blocks *readable* lifts, not AABB peel of machines. |
| Multi-box clearance as stacked volumes | Silhouette without new art | generated, but translation omitted | **Needs modeling** (capture translation) or treat as union AABB (usable). |
| Authored SVG laterals (class + face) | Stretch into AABB, upright | git (AGPL), atlas at load | **Needs modeling**. Destination format named by 19; no catalog. |
| FModel mesh → orthographic PNG/SVG atlas | Same stretch | local / gitignored / zip, like icons | **Needs modeling**. New extractor; not `extract_all.py`; not 3D glTF path. |
| Menu / map icons | — | gitignored PNGs | **Out** (19). |
| SCIM `src/Models/Buildings/*.json` | — | their repo | **Out** (no reuse). Educational: trace polygons from a render. |
| ModelingTools lookalikes | 2.5D elevations | license: mods/content only | **Out** of Cut; belongs to 08 if anywhere. |
| Official glTF in git | — | — | **Out** (`NOTICES.md`, 08, 17). |

## Ranked gaps

Does **not** block the AABB Cut peel [16] already contracted:

1. SVG catalog (per-class or per-family).
2. Mesh orthographic extractor.
3. Multi-box stacked silhouette.
4. ModelingTools.
5. Two-face authorship vs mirror.

Blocks a **readable** Cut for some occupants, but 19 already specified the fallback (4 m dashed / polyline):

1. **Conveyor lifts** — drawn as 1×1 m buildings; instance height is on unused spline data. A stacked factory’s lifts will look like short posts.
2. **Space Elevator** 1 km clearance box — domain/scale, not missing data.
3. **17 empty-size classes** + designers’ dropped Z + Elevator/FloodlightWall — 4 m dashed placeholders.
4. **Garage-door height** if clearance-first is applied without the Width-style correction.

None of those block implementing `height_view.js` with projected AABB.

## How laterals could be obtained (inventory, not a pick)

Three producers, all still unbuilt. AABB from tables is the fourth option and already contracted as first ship.

1. **Keep boxes.** Class table XY × table Z (or 4 m dashed). Same scheme as today’s map, true meters. Matches a “simplified figure, no false limits” MVP.
2. **Author traces.** Same *job* as SCIM’s MODELER, but from **side** renders, two faces, our art. Store as SVG (19) or JSON polygons (SCIM). Git, AGPL. Start with distinctive machines; families share; the rest stay AABB.
3. **Extract from official meshes.** Local FModel glTF → orthographic silhouette → gitignored atlas (icon pipeline). Regenerates on patch. Never commit the meshes or the atlas as project art.

SCIM proves (2) is how a peer got “closer to the model” for **plans**, with a small catalog and a box fallback — not a full 546-class SVG set, and not elevations.
