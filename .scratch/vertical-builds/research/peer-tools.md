# Peer tools: verticality and moving a factory piece

Survey date: 2026-08-14. First-party docs, GitHub READMEs, and in-product pages. Secondary blogs/videos are marked as such. Unknowns are marked unknown.

Renderer/mesh/license options for later schematic 3D: [3d-fork-options.md](3d-fork-options.md) (annotated 2026-08-15). That note does not reopen this survey’s product gist.

Context already decided on this map (not reopened here): a Build is an XY+Z volume; first MVP is 2.5D; schematic 3D is the later observation objective; transfer is clipboard blob + named file.

## Gist

No surveyed tool both shows stacked floors well enough to isolate an existing factory volume *and* exports that volume as a portable artifact. SCIM is 2D plus an altitude *filter*; the in-game Blueprint Designer is a rebuild-inside-a-cube workflow with a hard size cap; Goz3rr’s editor is dead on current saves and has no map; Factorio/DSP copy 2D (or 2D-on-sphere) layouts whose “height” is not Satisfactory’s continuous Z.

## Comparison

| Tool | Status | Observation | Selection unit | Export artifact | Verticality gap |
| --- | --- | --- | --- | --- | --- |
| In-game Blueprint Designer + Build Gun | Current baseline | First-person 3D in-world; hologram + nudge | Buildings fully inside a 32/40/48 m cube; or one building via eyedropper | `.sbp` + `.sbpcfg` (PC, per session dir); baked into save on console | Cannot lasso an *existing* world factory. Cube is too small for a megabase. No slice/2.5D of the live save. |
| SCIM (Satisfactory Calculator Interactive Map) | Current incumbent web map/editor | 2D map + altitude filter in meters | Map objects (in-product: layers/filters; exact lasso/rect UX not documented first-party) | Edited `.sav`; community **Blueprints** vs **Megaprints** (Interactive Map paste files) | Same 2D silhouette problem as this repo. Z is a filter, not a camera. No 3D/slice. |
| Goz3rr/SatisfactorySaveEditor | Dead for U6+ / 1.0+ | Tree of save tags; no map | Per-entity in a tree | Rewritten `.sav` | No spatial view, no copy-between-saves of a factory piece. Cannot open current saves. |
| moritz-h/satisfactory-3d-map | Alive (1.2 in v0.10.0, 2026-03) | 3D of all save objects | Per-object property list | Same `.sav` (edit existing values) | Sees Z. Does not isolate a volume or export a transferable Build. v0.8.0: cannot add/remove objects in the 3D UI. |
| FICSIT FeliX | Archived 2022-04-28 | Low-poly three.js 3D | Whole save → JSON | `.sav` ↔ `.json` round-trip | 3D inspect, not transfer. Pre-1.0; not maintained. |
| GreyHak/sat_sav_parse | Alive (v1.2) | 2D HTML/PNG of collectables, nodes, power | CLI predicates, not a spatial volume | `.sav` / `.sbp` via CLI; HTML maps | Top-down collectables, not factory floors. Blueprint CLI moves *library entries*, not world geometry. |
| etothepii4/satisfactory-file-parser | Alive (1.2) | None (JSON library) | Whatever the caller writes | `.sav` / `.sbp` / `.sbpcfg` via JSON | No observation. No Build unit. |
| Factorio map editor + blueprints | Contrast only | Top-down 2D (surfaces; elevated rails = discrete upper layer) | Drag-box of entities/tiles | Blueprint / blueprint string; clone mode; import save as a new *surface* | XY tile grid. Height is not a stack of factory floors. A 2D box *is* the factory. |
| DSP Mass Construction + dsp_blueprint_editor | Contrast only | Factory: 2D planetary grid (globe curvature). Sphere editor: orbital layers. | Drag-box on the planet; tropic-band constraints | In-game blueprint library (cross-save); sphere/swarm via OS clipboard text | Factories do not stack in continuous Z. “Layers” are Dyson Sphere orbits, not floors. |

---

## 1. In-game Blueprint Designer / copier (player baseline)

Sources:

- https://satisfactory.wiki.gg/wiki/Blueprint_Designer
- https://satisfactory.wiki.gg/wiki/Blueprint
- https://satisfactory.wiki.gg/wiki/Build_Gun
- https://satisfactory.wiki.gg/wiki/Controls

**Observation:** First-person 3D. Placement uses a hologram with a forward arrow. Nudge mode steps 1 m (0.5 m with Ctrl) in horizontal *and vertical* planes. Auto-connect (R) tries belts/pipes/rails/vehicle paths up to 16 m.

**Selection unit:** Whatever the player *rebuilds inside* a Blueprint Designer frame. Buildings must sit fully inside the boundary (pillars may clip edges).

| Mark | Unlock | Volume |
| --- | --- | --- |
| Mk.1 | Tier 4 — FICSIT Blueprints | 32 m × 32 m × 32 m |
| Mk.2 | Tier 6 — FICSIT Blueprints Mk.2 | 40 m × 40 m × 40 m |
| Mk.3 | Tier 9 — FICSIT Blueprints Mk.3 | 48 m × 48 m × 48 m |

Wiki trivia: designer pad is 1 m thick and the frame extends 1 m above, so total Mk.1 height is 34 m. A blueprint is bound to the Mark it was designed in; lower-Mark prints can be nested into a higher-Mark designer, not the reverse.

Cannot go in a designer (wiki table): HUB, Space Elevator, miners, water/oil extractors, resource-well pressurizer/extractor, geothermal. Quantum Encoder and Nuclear Power Plant need Mk.3; Particle Accelerator / train platforms need Mk.2+.

There is **no** documented in-game “select this existing factory volume and copy it.” The copier-like tools are:

- **Eyedropper** (middle mouse, also from dismantle): copies *one* building or blueprint type. Wiki: recipe/clock *is* copied (Controls notes); Build Gun page also says configuration is copied.
- **Settings clipboard:** Right Ctrl+C / Right Ctrl+V. Patch 1.0.1.0: also works on generators and extractors.
- **Mass dismantle:** up to 50 structures (Ctrl in dismantle). Not a copy.
- Controls wiki has an undocumented line “Copy Factory Ctrl+C / Paste Factory Ctrl+V.” **Unknown** whether that is a volume copier or a misnamed settings clipboard. Not treated as a factory-volume tool here.

**Export artifact (PC):** two files, not in the `.sav`:

- `.sbp` — layout (header includes size X/Y/Z in 8 m foundation units, then compressed object headers/bodies like a save)
- `.sbpcfg` — description, icon, icon color

Path: `%LOCALAPPDATA%\FactoryGame\Saved\SaveGames\blueprints\{SESSION NAME}`. Not cloud-synced. Categories/sub-categories live in the *save*, so a copied `.sbp` lands in Undefined Category until the player refiles it. Transfer to a new save: unlock designer, save one dummy blueprint to create the session folder, copy files, **reload**. Console: blueprints are baked into the save; no separate directory.

**Verticality gap:** The game already *is* 3D, but the transfer unit is a designer cube the player fills, not an XY+Z volume cut from the live factory. A 48 m cube cannot hold a stacked megabase. Isolation of “this floor of that tower” is walking around in first person, not a map Cut.

---

## 2. SCIM — Satisfactory Calculator Interactive Map

Sources:

- README: https://github.com/AnthorNet/SC-InteractiveMap (`dev` README, fetched 2026-08-14)
- Home: https://satisfactory-calculator.com/
- Map: https://satisfactory-calculator.com/en/interactive-map
- Blueprints: https://satisfactory-calculator.com/en/blueprints
- Megaprints: https://satisfactory-calculator.com/en/megaprints

**Observation:** README: “a **2D** map rendering engine and a full-featured save editor.” In-product map chrome includes **“Filter altitudes: In meters”**, plus Coordinates, Biome, Statistics, Research, Options, fog of war, resource layers. Not a 3D camera. Not a slice. Same class of tool as this repo’s Leaflet + altitude min/max filter.

**Selection unit:** In-product page lists structure/building/power/transportation/mod panels and map layers. Exact rectangle vs circle vs polygon tools are **not** described in the README. Steam threads (secondary) describe rectangle/circle/lasso then “copy to megaprint.” Treat the lasso details as unverified here.

**Export artifact:**

- Download an edited `.sav` (issue #476: huge saves can OOM on export — 3M objects reported).
- **Blueprints** library: community `.sbp`-style shares (home, 2026-08-14: ~4,900 blueprints).
- **Megaprints:** first-party: “Megaprints are the good old Interactive Map blueprints, the files are intended to be pasted directly on the Interactive Map.” Home: ~460 megaprints, ~9.8M buildings. File extension (often reported as `.cbp` on Steam) is **not** stated on the megaprints page — unknown from first-party text.

Remote load: `?url=SAVE_LINK` with CORS + SSL, same idea as this site.

**Verticality gap:** SCIM already *moves* factories between saves (megaprint paste, download `.sav`). The missing piece this map cares about is *seeing* stacked floors so the selection is the intended set. Altitude is a numeric filter, not occupancy extrusion, not a Cut, not schematic 3D.

---

## 3. Other save editors

### Goz3rr/SatisfactorySaveEditor — does not work on current saves

https://github.com/Goz3rr/SatisfactorySaveEditor

README banner: “Update 6/7 is not yet supported” and points users to SCIM. Pinned issue [#267](https://github.com/Goz3rr/SatisfactorySaveEditor/issues/267) retitled through Update 8 / 1.0; last activity on that issue 2024-10-16. Not archived, but not usable for 1.x.

**Observation:** WPF tree of save tags. Screenshot/README: no map.

**Selection:** Per-entity. Features listed: dismantle a portion into one crate, edit inventories, teleport player, unlock milestones, spawn doggos. **No** “copy this factory to another save.”

**Artifact:** rewritten `.sav`.

**Gap:** Dead parser + no spatial isolation.

### moritz-h/satisfactory-3d-map — 3D inspect, not transfer

https://github.com/moritz-h/satisfactory-3d-map

README: “visualization of all objects contained in a save game in **3D space**.” Property listing, edit values. Releases: [v0.8.0](https://github.com/moritz-h/satisfactory-3d-map/releases/tag/v0.8.0) (2025-01, 1.0 + “now a save game editor”); [v0.10.0](https://github.com/moritz-h/satisfactory-3d-map/releases/tag/v0.10.0) (2026-03-20, 1.2). Python lib can parse/write blueprints.

v0.8.0 known limitation: “The 3D Map editor only can edit existing values. Adding/Removing properties/objects will be added in a future version.” Whether v0.10.0 lifted that is **unknown** from the v0.10.0 notes (they mention 1.2 + game-file parsing, not add/remove).

**Selection:** one object’s properties. **Artifact:** the same `.sav`. **Gap:** 3D observation exists; volume isolate + export does not.

### FICSIT FeliX — archived 3D viewer

https://github.com/ficsit-felix/ficsit-felix — **archived 2022-04-28**. Last release v0.0.44.

README / https://ficsit-felix.netlify.app/: low-poly three.js of the factory; save processed in-browser; `.sav` ↔ `.json` for external edits. Prototype. No copy-between-saves of a spatial subset in the README.

**Gap:** Historical proof that schematic-ish 3D of a save is doable. Not a 1.x transfer tool.

### GreyHak/sat_sav_parse — CLI + 2D HTML maps

https://github.com/GreyHak/sat_sav_parse — supports v1.2.x.

**Observation:** `sav_to_html.py` draws **2D** PNG maps (slugs, somersloops, spheres, hard drives, power grid, resource nodes) on a blank top-down map derived from SCIM art. Not factory buildings as a 3D stack.

**Selection / artifact:** CLI ops (`--move-player`, `--add-foundation`, `--rotate-foundations`, `--blueprint --export/--import` for *blueprint library categories*). `sbp_parse.py` reads/writes `.sbp` / `.sbpcfg`. No “extract these world actors as a Build.”

### etothepii4/satisfactory-file-parser — library only

https://github.com/etothepii4/satisfactory-file-parser — TypeScript, 1.2, `.sav` and `.sbp`/`.sbpcfg` to JSON. Explicitly: “game logic is not known.” Examples include printing a hub’s `transform.translation` (x,y,z) and nudging players in XY. A caller *could* slice by Z; the library does not.

---

## 4. Contrast: Factorio and Dyson Sphere Program

Why a 2D map-editor assumption fails for Satisfactory: Satisfactory factories occupy **continuous world Z** (meters). A top-down box selects every floor at once. Factorio and DSP do not have that problem, so their copy UX does not solve it.

### Factorio

- Map editor: https://wiki.factorio.com/Map_editor — clone areas/entities; import another save as a **new surface** (a separate 2D plane, not a floor).
- Blueprints: https://wiki.factorio.com/Blueprint — drag-box on the XY tile grid; ghosts; blueprint string (base64 JSON); library is cross-save. Max size 10k×10k **tiles**.
- Elevated rails (2.0 / Space Age): https://factorio.com/blog/post/fff-378 — a **discrete upper rail layer** (ramp + supports), not stacked assemblers. Terrain gen still “X and Y position” (FFF-390).
- Surfaces (planets, platforms) are extra 2D maps, not altitude inside one factory.

A Factorio-style rectangle *is* the intended set. That is exactly what breaks on a Satisfactory tower.

### Dyson Sphere Program

- Factory blueprints: https://dsp-wiki.com/Blueprint and https://dyson-sphere-program.fandom.com/wiki/Mass_Construction_(Lv1) — Ctrl+C drag-box on the **planetary grid**; library is shared across saves/clusters; Mass Construction caps size until upgraded. Placement fails across tropic/fault bands because the grid spacing changes with latitude — a curvature problem, not a floor problem.
- Dyson Sphere “layers” are **orbital shells**, copied separately in the sphere editor (OS clipboard text). Not factory floors.
- https://github.com/huww98/dsp_blueprint_editor — web Three.js viewer for factory blueprints (last push 2024-08). Visualizes a 2D-on-sphere layout; not a Satisfactory analogue.

DSP’s hard copy constraint is latitude bands. Satisfactory’s is overlapping Z.

---

## What this project is trying to close

| Need (already decided on this map) | Who almost has it | Who does not |
| --- | --- | --- |
| See stacked floors (2.5D Cut, later schematic 3D) | moritz-h and archived FeliX see 3D but do not isolate a volume | SCIM, GreyHak HTML, Factorio, DSP factory BP, this repo today |
| Isolate an XY+Z volume of an *existing* factory | In-game designer isolates a cube you **rebuild**; SCIM selects in 2D (+ altitude filter) | Nobody surveyed combines volume isolation with a map Cut |
| Transfer clipboard + named file | This repo already has the clipboard blob; SCIM has megaprint files + `.sav`; game has `.sbp` (size-capped, rebuild-only) | Goz3rr (dead); FeliX (JSON of whole save); moritz-h (edit in place) |

SCIM is the product to beat on **transfer** (megaprint + save download). The in-game Designer is the product to beat on **player-understood unit** (a 3D box) — but it is a constructor, and construction is out of scope for this map. The 3D maps prove **observation** is possible; they do not ship the Build artifact.

## Unknowns (not filled from first-party)

- Exact SCIM selection geometry (rect / circle / lasso) and megaprint file extension/schema.
- Whether moritz-h v0.10.0 can add/remove objects (v0.8.0 said no).
- Whether Controls’ undocumented “Copy Factory” is a real volume copier.
- Whether any current tool offers a true Z slice / cross-section (none of the first-party pages above describe one).
