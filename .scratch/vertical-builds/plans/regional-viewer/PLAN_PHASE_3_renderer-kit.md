# Phase 3 — decoder, original kit and disposable adapter

Tasks: 1 A, 2 B, 1 C. Status: NOT STARTED. Requires Phase 1 format; production attachment waits for [Phase 2](PLAN_PHASE_2_state-transports.md).

Authority: [wire](../../specs/viewer-regional-wire-v1.md), [initial coverage](../../specs/viewer-initial-coverage.md), [global lifecycle](../../specs/viewer-integration-spec.md), [map](../../specs/viewer-integration-map.md).

## Phase contracts

### Built in this phase

| Task | Output |
| --- | --- |
| A-009 | Pure strict v1 decoder and golden/malformed-frame runner |
| B-010 | Exact original recipe registry and honest fallback batches |
| B-011 | Detached Z-up camera/controls/Three adapter and partial-build cleanup |
| C-012 | Pinned same-origin module/addon supply and stamped import graph |

### Required but not built

Main product entry remains disabled until Phase 4 connects real state/query/masks. Adapter tests may use frozen protocol fixtures in the behavior guard; any debug host/diagnostic data is test-only, not a shipped synthetic mode. No replacement save API, preview editor or research prototype is introduced.

### Phase exit

- [ ] `node tools/check_regional_wire.mjs` passes HEC-03/09 decoder/registry assertions (new runner from A-009).
- [ ] `py tools/build_site.py` succeeds and `py tools/check_regional_assets.py` passes HEC-10 (new check from C-012).
- [ ] `py tools/ui_behaviour.py --serve` passes adapter build/cancel/partial failure/context disposal and previous UI guards (HEC-08); no live per-visit resources after fixture teardown.
- [ ] Every minimum recipe has an original implementation/provenance record; labels/override behavior match coverage matrix. This is not yet actual-save geometry acceptance.

## Execution queue

- [ ] **A-009** Strict frame decoder `[A]` atomic; requires A-003 → [spec](#a-009)
- [ ] **B-010** Initial original form kit `[B]` batch split by exact recipe; requires A-009 → [spec](#b-010)
- [ ] **B-011** Camera/adapter/lifetime `[B]` batch split into controls and resource ledger; requires A-009/B-010 → [spec](#b-011)
- [ ] **C-012** Module supply/cache/CSP packaging `[C]` atomic; requires B-011 → [spec](#c-012)

## Specs appendix

### A-009

Type: A — decoding logic. Difficulty: medium. Status: TODO. Dependency: A-003.

**Files:** `map/static/map/regional_codec.js`, `tools/check_regional_wire.mjs`, product copy of frozen protocol vectors.

**Contract:** `decodeRegionalScene(bytes, expectedRequestId)` validates full v1 frame before exposing typed views, without renderer imports or DOM dependency. Strict UTF-8/duplicate keys/offsets/counts/optional fields; no implicit defaults or ID expansion.

**Criteria:** golden named/unknown-scale/Unicode/path/empty records decode exactly; corrupt magic/version/offset/size/padding/nonfinite float/flags/duplicate keys/fragment links fail before render. Include accepted 8,000 and rejected forged N=8,001. Runner exits nonzero, imports the actual production decoder, and does not maintain a second mirrored decoder as its oracle.

### B-010

Type: B — spatial representation. Difficulty: medium. Status: TODO. Dependency: A-009.

**Files:** `map/static/map/regional_forms.js`, a small human-authored provenance note next to recipes, `tools/check_regional_wire.mjs` registry/transform cases, `tools/ui_behaviour.py` rendered review fixtures.

**Contract:** exact registry and precedence in initial coverage document; complete known native transforms feed normalized original cues; neutral clearance envelope remains present even for distinctive cue. Unknown orientation/scale/size overrides every volumetric recipe.

**Visual states:** named grid slab/ramp-box; reserve with/without cue; screen-space uncertain marker; source-chord line/contact marker; unlisted class pending form. Each has textual legend/summary, not color-only distinction.

**Criteria:** committed floor/wall/pillar/smelter/constructor/storage/pole recipes are recognizable at readable scale, no official/traced assets; negative scale/nonzero offsets affect all parts together; fallback never silently drops objects or extrudes plan-only dimensions. Family visual review is S-01, not a passing registry-name test alone.

### B-011

Type: B — scene interaction/lifetime. Difficulty: high. Status: TODO. Dependencies: A-009, B-010.

**Files:** `map/static/map/regional_scene.js`, `tools/ui_behaviour.py`.

**Contract:** detached `createRegionalScene(...) -> Promise<SceneHandle>` and handle methods fixed in integration map. Z-up native world; perspective 45°, region-centred aspect-aware fit, initial direction `(1,-1,1)`, 15% frame margin, reset; input mappings in global spec. Typed-array/InstancedMesh batches, no retained actor Object3D tree.

**Interactions:** orbit/pan/dolly, keyboard only in canvas focus, on-demand renders without damping loop, resize keeps orbit. setVisibility/setVisualZ changes only loaded drawing; source fragments never joined across gaps.

**Failure criteria:** register allocation ownership before fallible next step; abort/dispose at each async/allocation boundary, simulate shader/context failure and repeated dispose; stop RAF and release controls/observers/listeners/geometries/materials/renderer/render lists/owned context/canvas and decoded references. Factory rejection cleans before handle exists. Do not dispose Leaflet's context or SaveClient session.

**Accessibility/responsive:** focusable named canvas, accessible keyboard help, Back/Reset from controller; tiny/flat/empty region frames safely without invented dimensions; controls work at narrow aspect ratios.

### C-012

Type: C — packaging integration. Difficulty: medium. Status: TODO. Dependency: B-011.

**Files:** `map/static/map/vendor/three.module.min.js`, `OrbitControls.js`, `THREE-LICENSE.txt`, `tools/build_site.py`, `tools/check_regional_assets.py`.

**Contract:** r170 core and addon same-origin/pinned, matching license/hash; only addon bare module specifier changed to relative core. Build stamps actual new import graph in dist using same version as controller import, leaving source and existing script order unchanged.

**Criteria:** all new module URLs resolve in built dist, no CDN/bare imports/inline import map, a single resolved Three core URL; changed decoder/forms/adapter/addon invalidates nested cache URLs. Static check covers CSS load order and preserved incumbent classic-script subsequence. Actual browser COEP and native CSP are S-03 after product attachment, not inferred from static resolution.

Next: [Phase 4](PLAN_PHASE_4_product-integration.md).
