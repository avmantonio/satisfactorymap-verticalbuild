# Survey cut laterals

Type: research
Status: resolved
Strand: visual-presentation — Visual presentation
Blocked by: 19

## Question

[Cut elevation marks](19-cut-elevation-marks.md) specified the Cut as an orthographic lateral (clip, fade, yellow, meters, yaw) and named authored SVG laterals as a *destination format*. [Real-client skeleton](16-real-client-skeleton.md) ships the first Cut as **projected AABB** from table height / 4 m dashed; the atlas “can follow.” Neither ticket asked **where those laterals come from**.

The game does not ship side elevations. This research splits **already usable** inputs from **what would have to be modeled** (authored, extracted, or newly computed) before anyone grills the pipeline.

Findings at `.scratch/vertical-builds/research/cut-laterals.md`. Primary sources: this repo’s tables, extractors, and renderer; Satisfactory modding extract docs; ModelingTools license text. Cite files and line ranges. Do not pick the pipeline. Do not author a glyph catalog. Do not reopen 19’s drawing contract. Do not vendor Coffee Stain art in git. Do not treat UI menu icons as Cut marks (19 already forbade that). AABB first-ship in 16 stays; this survey does not block implementing that skeleton.

Cover two columns:

**Already usable** (what exists today that a Cut mark can consume or copy as a pattern):

- `buildings.json` `dimensions` / `clearance` / `adaptiveLength` — coverage of Height vs Z-from-clearance; empty-size classes; known stale clearance ([SCHEMA.md](../../../game_data/SCHEMA.md)).
- Multi-box `clearance`: `geometry.rs` unions to an XY footprint; whether those boxes already give a *stacked* along×Z silhouette with no new art.
- Hand-curated footprints (`categoryOverrides.json` / `HAND_CURATED_FOOTPRINTS`) as the hole list for AABB.
- Icon / game-data pipeline as a **legal and packaging** analogue (`copy_icons.py`, gitignored `map/static/map/icons/`, game-data-v3, [NOTICES.md](../../../NOTICES.md)) — not as pixels to rotate into an elevation.
- FModel dump already required by `extract_all.py`: whether static meshes are in that dump and documented for local-only use ([Survey 3D fork options](17-survey-3d-fork-options.md), [research/3d-fork-options.md](../research/3d-fork-options.md)).
- Payload strides: buildings are `[x, y, yaw, z]` — no per-instance height on the wire; height would come from tables keyed by class.

**Would have to be modeled** (no current producer, or producer is a different job):

- Per-class vs per-family silhouettes; two faces (A-axis / B-axis) vs one mirrored; how many `Build_*` classes actually need a unique pair.
- File format and home: AGPL SVG in git vs generated raster atlas (gitignored, like icons) vs projected boxes only.
- An extractor that orthographically renders official meshes to laterals (local FModel → PNG/atlas) — inputs, units, face axes, LOD, and that this is *not* the later 3D glTF path.
- Conveyor lifts, belts, pipes, beams: vertical extent from spline / `adaptiveLength`, not a building Height.
- Game-patch versioning: tables regenerate; hand art drifts; extract regenerates like icons.
- ModelingTools / lookalike kits as 2.5D elevations (license per file) vs leaving lookalikes to [Schematic 3D bar](08-schematic-3d-bar.md).
- Fallback when a class has no glyph and no size.

Output a table: source → Cut use → git/generated/local → gap (usable now / needs modeling / out). Rank gaps by whether they block a *readable* Cut versus the AABB peel already contracted.

## Answer

Table height and XY already give a true-meter AABB Cut; richer laterals have no producer here. SCIM’s closer-to-model figures are hand-traced top-down polygons (~67 classes, JSON, not reusable) and do not rotate into elevations. SVG/mesh extract would have to be modeled later; AABB first-ship in 16 stays unblocked.

Findings: [research/cut-laterals.md](../research/cut-laterals.md).
