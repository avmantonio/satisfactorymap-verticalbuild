# Asset supply: generate, author, or refuse

Survey date: 2026-11-23. Ticket: [Asset supply](../issues/40-asset-supply.md).

This note is the **supply and licensing procedure** for regional-viewer proxies. It does **not** pick a visual kit (boxes vs wedges vs lookalikes), a renderer (WebGL2 vs Three.js), or the shipped family catalog. Those stay [Proxy catalog](../issues/28-proxy-modeling.md), [Family silhouettes](../issues/48-family-silhouettes.md), and [Renderer probe](../issues/18-3d-scene-adapter.md). [Baseline gate](../issues/34-baseline-gate.md) is closed and is not reopened.

The settled directive on the ticket stands: recognizable does not mean the game’s mesh; Coffee Stain meshes, icons, and map art stay out of git; a local extract that never ships is optional later living, not this kit; no game-derived mesh enters the supply without this check.

`game_data/generated/` is not on disk in this checkout. Size and coverage numbers below are from [cut-laterals.md](cut-laterals.md) (game-data-v3, 546 classes) and from the extractors/`SCHEMA.md` contract, not a fresh class count.

## Gist

This kit ships **original geometry**. Sizes, pose, category color, and family keys come from tables and payload we already use. Distinctive family forms are **authored here** (AGPL), not extracted. Coffee Stain meshes, icons, and map art stay out of git. FModel glTF/meshes stay out of git **and** out of releases (including `game_data.zip`). The existing game-data-v3 archive remains JSON tables + 2D icons + map art for the current app; it is not a 3D mesh pack. A user-local FModel extract that never ships is later living, after schematic, not this kit. SCIM traces and ModelingTools lookalikes are not a supply.

## Supply decision

Three buckets. A candidate is in exactly one.

| Bucket | What it is | May enter this kit? | Home |
| --- | --- | --- | --- |
| **A. Generate from our data** | Runtime primitives (box, cylinder, capsule, extruded path, union AABB) sized and posed from `buildings.json` clearance/dimensions/`adaptiveLength`, curated footprints, payload stride, and our category colors | **Yes** | Code in git (AGPL). Numbers from generated tables at build/runtime, same as today’s 2D rects. No new art files. |
| **B. Per-family original** | A silhouette a person can tell from another family (constructor vs smelter vs splitter vs pole), drawn by us | **Yes, as original AGPL art** | Authored files in git, keyed by **family**, not 546 `Build_*` classes. Ticket 48 authors the shapes. Ticket 28 catalogues which families have a reliable size. |
| **C. Game-derived / third-party mesh** | Coffee Stain static/skeletal mesh, glTF, uasset, texture, icon-as-mesh, map art as terrain, SCIM traced polygons, ModelingTools lookalikes, mixed Sketchfab/STL | **No for this kit** | Local machine only, and only as later living after schematic. Never git, never `game_data.zip`, never `dist/`. |

**This kit** = bucket A plus whatever bucket B [Family silhouettes](../issues/48-family-silhouettes.md) later authors. It is not a Coffee Stain mesh pack and not a lookalike pack. [Schematic 3D bar](../issues/08-schematic-3d-bar.md) already ranked lookalikes for the **later** editor-shaped 3D; that is not this kit and still cannot vendor official glTF.

Unknown or sizeless objects stay [Reserve volumes](../issues/50-reserve-volumes.md): labeled approximation, or location plus uncertainty — not an invented solid and not a ripped mesh.

## Reproducible procedure

Run this check **before** any mesh, atlas, SVG, glTF, PNG, or third-party kit is added to the viewer supply. Record the answers on the consuming ticket (48, or a later lookalike ticket). No game-derived mesh skips the check.

### 1. Name the candidate

Class or family key, file path, producer (runtime generator / hand-authored / extractor / downloaded kit).

### 2. Classify origin

Ask, in order:

1. Is it **generated at runtime** from numbers we already have (`buildings.json`, `categoryOverrides.json` `classFootprintsMeters`, `typePaths.json`, payload stride, `filters.js` colors) using **our** primitives? → **A**.
2. Did **we** model it without tracing an official mesh, icon, SCIM polygon, or ripped screenshot? → **B**.
3. Did it come from the game pak/utoc, FModel, Docs.json pixels, `copy_icons.py`, SCIM `src/Models`, ModelingTools, Sketchfab, Printables, or a screenshot trace? → **C**.

If 3 is yes, it is **C** even if we converted format (uasset → glTF → simplified OBJ → “our” SVG). Format change is not a new work.

### 3. Git gate

`.gitignore` already keeps `game_data/generated/`, `map/static/map/icons/`, `dist/`, `*.sav`, `game_data.zip`, `game_data/docs.json` out of git ([`.gitignore`](../../../.gitignore) 12–30, 45–46). `AGENTS.md` and [game_data/README.md](../../../game_data/README.md): if a script wrote it, it is not in git.

Refuse the add if the file is:

- A Coffee Stain mesh, texture, glTF, uasset, icon PNG, or map render.
- An atlas or silhouette **derived** from those (orthographic render of official LOD0, icon extruded to 3D, SCIM JSON polygons).
- FModel output of any kind.

Allow in git only:

- AGPL code that **generates** primitives (A).
- AGPL original silhouettes we authored (B), plus any family-key table we write by hand under `game_data/curated/` or a sibling curated file.
- Hand-measured numbers in `classFootprintsMeters` (already the pattern).

### 4. Release / CI gate

[NOTICES.md](../../../NOTICES.md) 50–57: game-derived **tables, icons, map image** are Coffee Stain’s; they are not in the repository; `game_data.zip` is a convenience for people who already own the game, used by CI as **game-data-v3** ([`.github/workflows/ci.yml`](../../../.github/workflows/ci.yml) 26–37). [package_game_data.py](../../../game_data/package_game_data.py) 8–15, 39–42 packs **only** `game_data/generated/` and `map/static/map/icons/`, recursively.

That zip is **not** a mesh exception. Adding glTF, uasset, wem, or a 3D atlas to either packed folder would ship Coffee Stain meshes in a GitHub release. FICSIT’s extract docs (fetched 2026-11-23): redistributing extracted assets is not allowed without permission ([Extract Game Files](https://docs.ficsit.app/satisfactory-modding/latest/Development/ExtractGameFiles.html)).

Refuse if the candidate would land in:

- `game_data.zip` / a `game-data-vN` release
- `dist/` (Cloudflare Pages copies `map/static/map/` including `icons/`, plus tiles from `map_highres.png` — [build_site.py](../../../tools/build_site.py) 4–6, 24–25)
- The Tauri bundle of that same `dist/`

Do **not** widen `PACKAGED_DIRS` for 3D.

### 5. “Reuse without shipping” does not apply here

FICSIT [Reusing Base Game Files](https://docs.ficsit.app/satisfactory-modding/latest/Development/ReuseGameFiles.html) (fetched 2026-11-23): a **mod** can placeholder a mesh and resolve it at runtime inside the game, so the mod zip contains no Coffee Stain bytes. This app is a browser + Tauri map, not a packed Unreal mod. There is no in-game asset registry to resolve against. A desktop-only engine that reads the user’s install is out of the destination ([map.md](../map.md) Out of scope). Shared frontend means if it is not shippable in the tab, it is not this kit.

### 6. Record

On the consuming ticket, write: bucket (A/B/C), git yes/no, release yes/no, producer, and the family key if B. If C, stop. Later living (local FModel, never shipped) is recorded as fog, not as a file in this repo.

## What can be generated from our data (bucket A)

These already feed the 2D map. A 3D primitive generator may consume the same sources. That is not a new extract.

| Datum | Source | Primitive it can size |
| --- | --- | --- |
| Plan XY | `buildings.json` clearance union or `dimensions` Width/Depth (`SCHEMA.md` 148–208; `geometry.rs` `footprint_meters_from_building_entry`) | Yawed box / AABB |
| Height | clearance Z union, else `dimensions.Height`, else 4 m dashed stand-in ([cut-laterals.md](cut-laterals.md); [spatial-data-audit.md](spatial-data-audit.md)) | Box height. Not a mesh shell. |
| Pose | payload stride 4 `[px, py, yaw, z]` (`buildings.rs`; `filters.js`) | Place and yaw. Quaternion/scale are not on the payload. |
| Category / color | `buildingCategories.json` + curated `categoryLabels.json` / `categoryOverrides.json` (`categories.rs`); `BUILDING_CATEGORY_COLORS` in `filters.js` 26–35 | Production orange, logistics blue, power yellow, … |
| Family key | curated subcategories (`SC_Smelters`, `SC_Manufacturers`, `SC_Miners`, `SC_Generators`, … in `categoryLabels.json`); `typePaths.json` belts/miners/powerLine; `LAYER_CATEGORY_DEFS` belts/lifts/pipes (`filters.js` 730–734) | Which bucket B silhouette to instance. Not the silhouette itself. |
| Paths | belt/pipe/rail/hypertube stride 7; power lines stride 3 ([spatial-data-audit.md](spatial-data-audit.md)) | Static extruded ribbon / polyline. Ticket 36 owns fidelity. |
| Hole-list XY | `classFootprintsMeters` and hardcoded Elevator / FloodlightWall (`geometry.rs` 349–373) | Plan box. Height still missing. |
| Unknown | no table size | Point + uncertainty ([Reserve volumes](../issues/50-reserve-volumes.md)). Do not invent a mesh. |

Today’s WebGL2 layer already draws **our** yawed quads from those half-extents (`webgl_layer.js` `RECT_VS` 175–231). A 3D box extruded from the same numbers is the same legal pattern: original primitive, game-derived **measure**.

`extract_all.py` does **not** export static meshes. It runs Docs.json extracts, world JSON, the sliced map, and `copy_icons.py` (`extract_all.py` 65–77). `copy_icons.py` 1–8 says the rest of the dump — “tens of thousands of unrelated meshes/textures/blueprints” — can be deleted after the PNGs are copied. Mesh names appear in collectables/caves extractors as **classifiers**, not as shipped geometry.

## What needs per-family treatment (bucket B)

A union AABB does not tell a constructor from an assembler: Constructor Mk.1’s three clearance boxes collapse to an 8×10 m × 6 m AABB with ports concentric on the origin, not at the ports ([cut-laterals.md](cut-laterals.md) 83–93). Distinctive reading is a **form** problem, not a size problem.

Per-family means:

- One original silhouette per **recognizable family** (smelter, constructor, manufacturer, miner, generator, storage, splitter/merger, pole, foundation slab, …), instanced across Mk variants that share the form.
- Sized at runtime from bucket A (so a 5×10×6 m constructor box does not become a 4 m cube).
- Authored by us, AGPL, in git. Ticket 48 owns the shapes. This ticket does not draw them.
- Not 546 unique official meshes. Cut-laterals counted 546 `Build_*` in game-data-v3; most are foundation/wall/ramp skins of the same box. SCIM traced 67 **plan** polygons and boxed the rest — and those traces are not reusable (below).
- Not menu icons billboarded as the family identity. Ticket 19 already forbade icons as Cut elevations; the same pixels are not a 3D mesh supply. They already ship for the **2D** map via game-data-v3 and `dist/icons/`; this kit does not add a second icon extract and does not treat those PNGs as silhouettes.
- Conveyor lifts, Space Elevator, Blueprint Designers, and the 17 empty-size classes remain table holes ([cut-laterals.md](cut-laterals.md) 160–182, 212–217). Family silhouettes do not invent a shell for them; Reserve volumes / dashed AABB stay.

A family-key table (class → silhouette id) is curated data, like `categoryOverrides.json`. It may live in git. The **mesh it points at** must be A or B, never C.

## What would break this repo’s distribution rules (bucket C)

Coffee Stain art is **not licensed by AGPL**. AGPL covers **our** code ([LICENSE](../../../LICENSE), [NOTICES.md](../../../NOTICES.md) 4–5, 48–57). The name, logo, and domain are a separate unlicensed mark (README License & trademark). Game-derived tables/icons/map art “belong to Coffee Stain and are not in git” ([AGENTS.md](../../../AGENTS.md)).

| Material | Git | `game_data.zip` / GitHub release | `dist/` / hosted site | This kit |
| --- | --- | --- | --- | --- |
| Our AGPL primitives and authored silhouettes | yes | n/a (source) | yes, as code/art we own | **in** |
| Curated JSON (`typePaths`, `categoryLabels`, `classFootprintsMeters`) | yes | no (already in git) | compiled into wasm / fetched as needed | **in** (keys and numbers, not meshes) |
| Docs.json extracts (`buildings.json`, items, world tables) | **no** | yes, existing v3 convenience | embedded in wasm, not as glTF | data for A, **not** a mesh pack |
| Icon PNGs + `map_highres.png` tiles | **no** | yes, existing v3 | **yes, already**, for the 2D map | **not** a 3D supply; do not add more |
| FModel glTF / static meshes / textures / uasset | **no** | **no** (would be a new redistribution) | **no** | **out** |
| Orthographic atlas rendered from official LOD0 | **no** | **no** (same pixels, different format) | **no** | **out** of this kit; later living if local-only |
| SCIM `src/Models/Buildings/*.json` | **no** | **no** | **no** | **out**. README (dev, fetched 2026-11-23): “Reuse of the source code and data assets is not permitted in any case.” |
| ModelingTools lookalikes | not this kit | no | no | **out of this kit**. README license (surveyed 2026-08-27 in [cut-laterals.md](cut-laterals.md) 172–176): built by referencing ripped assets; only for free use with Satisfactory mods, memes, videos, content, reviews. Later 08 lookalikes still need a per-file check; they are not a silent import. |
| moritz-h meshes or code | no drop | no | no | ideas only unless an AGPL combination is an explicit later decision (`CONTINUE.md` landmine; GPLv3). |
| Sketchfab / Printables / STL of mixed license | only if the file is original-enough **and** the license allows AGPL combination | no game rips | no | default **out**; per-file check required, never a back door for official forms. |

FICSIT Extract Game Files (2026-11-23): FModel → glTF 2.0 + PNG, `FactoryGame.usmap`, First Level Only. “redistributing these assets should not be done without permission, as they are copyrighted content of Coffee Stain Studios.” There is no complete redistributable official GLB pack ([3d-fork-options.md](3d-fork-options.md) 67–73).

**Local extract that never ships** (map fog; [map.md](../map.md) Out of scope “User-local FModel → glTF extract shipped in git or in releases”): allowed only as optional later living **after schematic ships**, on the user’s machine, never committed, never packed, never attached to a release. It is **not this kit**. Do not build `extract_all.py` mesh export for the regional viewer.

## How Family silhouettes should consume this

[Family silhouettes](../issues/48-family-silhouettes.md) may:

- Instance bucket A primitives immediately.
- Author bucket B silhouettes keyed by family, AGPL, in git.
- Size those silhouettes from the same clearance/dimensions lookup the 2D map uses.

It may not:

- Import FModel/glTF/uasset/icons-as-mesh/SCIM polygons/ModelingTools into git, zip, or `dist/`.
- Trace official meshes or SCIM plans and call the result original.
- Treat “recognizable” as “the game’s mesh” (already the Answer on 48 and on 40).

[Proxy catalog](../issues/28-proxy-modeling.md) lists which types have a reliable size vs a reserve vs neither. It does not author shipped silhouettes and does not replace this licensing gate.

## Out of this ticket

- Picking boxes vs lookalikes as the product kit (08 later; 48 for first-viewer forms).
- WebGL2 vs Three.js (18).
- Scene budget (25).
- Authoring any silhouette file.
- Widening game-data-v3.
- Reopening Baseline gate, phase 0, or the Answer on this ticket.

## Sources

- [NOTICES.md](../../../NOTICES.md), [AGENTS.md](../../../AGENTS.md), [game_data/README.md](../../../game_data/README.md), [`.gitignore`](../../../.gitignore), [LICENSE](../../../LICENSE), README License & trademark
- [package_game_data.py](../../../game_data/package_game_data.py), [extract_all.py](../../../game_data/extract_all.py), [copy_icons.py](../../../game_data/extractors/copy_icons.py), [SCHEMA.md](../../../game_data/SCHEMA.md), [extract_docs_json.py](../../../game_data/extractors/extract_docs_json.py)
- [geometry.rs](../../../rust_parser/core/src/mapdata/geometry.rs), [categories.rs](../../../rust_parser/core/src/mapdata/categories.rs), [filters.js](../../../map/static/map/filters.js), [webgl_layer.js](../../../map/static/map/webgl_layer.js), [build_site.py](../../../tools/build_site.py), [ci.yml](../../../.github/workflows/ci.yml)
- Curated: [typePaths.json](../../../game_data/curated/typePaths.json), [categoryLabels.json](../../../game_data/curated/categoryLabels.json), [categoryOverrides.json](../../../game_data/curated/categoryOverrides.json)
- Prior surveys: [3d-fork-options.md](3d-fork-options.md), [cut-laterals.md](cut-laterals.md), [spatial-data-audit.md](spatial-data-audit.md)
- FICSIT [Extract Game Files](https://docs.ficsit.app/satisfactory-modding/latest/Development/ExtractGameFiles.html) and [Reusing Base Game Files](https://docs.ficsit.app/satisfactory-modding/latest/Development/ReuseGameFiles.html) (fetched 2026-11-23)
- SCIM `dev` README license (fetched 2026-11-23): https://github.com/AnthorNet/SC-InteractiveMap
- ModelingTools README license as recorded 2026-08-27 in cut-laterals (live LICENSE URL 404 on 2026-11-23)
