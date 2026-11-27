# Regional 3D viewer — readiness review

Date: 2026-11-25
Scope: inspect the existing tickets, specifications, prototypes, relevant code and test seams; create specs for resolved 3D nodes. No application behavior was changed.

## 1. Verification of sufficiency for creating the 3D viewer

**Verdict: enough settled decisions to author the global spec and proceed toward implementation 60; no integrated viewer or delivery evidence yet.** The global spec still has to bind the contracts to exact interfaces, interaction/lifecycle rules and acceptance procedures. This review does not reopen baseline, feasibility, the renderer choice, membership or the 8,000 limit.

The destination considered here is the **first regional read-only viewer**. A full 3D editor with picking/gizmos/move/paste is a later cycle, not an unresolved prerequisite for this viewer.

### Settled coverage

| Concern | Settled owner | What is sufficient |
| --- | --- | --- |
| Purpose and sequence | 24, 57, 60; map Bearing | Applied contents, region only, observation first; implementation before trials, then delivery |
| Source fidelity | 31, 35, 42 | Save-native position/quaternion/scale, optional actor tangents, identity and uncertainty; separate from 2D |
| Membership | 43 | Isolation XY ∩ Cut Z ∩ altitude cap; conservative box intersection; clipped paths; not Selection |
| Admission | 25, 44 | Unique admitted buildings/path actors; >8,000 refuses before buffers and view replacement; same shells |
| Renderer and supply | 17, 18, 28, 40, 41 | Vendored vanilla Three.js instancing, typed arrays, original geometry, no second whole-save tree |
| Appearance and visibility | 21, 48–52 | Orbit, recognizable simplified forms, honest reserves/unknowns, shared category filters, no collision certification |
| Lifetime | 33, 45, 53 | Exclusive visit, return to 2D, destruction, current-state rebuild, no persistent growth |
| Validation ownership | 32, 54–56, 58 | Named real cases; geometry/stress/parity checks after 60; stable delivery still gated |

### Current code and local inputs

Paths below are owning sources inspected during this review. Their presence is not a runtime pass.

| Existing seam / input | Observed support | Work still needed for 60 |
| --- | --- | --- |
| [ActorHeader / LightweightInstance](../../../rust_parser/core/src/store.rs), [lightweight record parser](../../../rust_parser/core/src/object.rs) | Actor pose/scale retained; lightweight pose and record offsets retained; three scale doubles read but not stored in LightweightInstance | Recover readable lightweight scale from retained bytes; build regional extraction from the current lean store |
| [Extraction utilities](../../../rust_parser/core/src/extract.rs), [geometry](../../../rust_parser/core/src/mapdata/geometry.rs), [line collectors](../../../rust_parser/core/src/mapdata/collectors/lines.rs) | Existing spatial/spline readers and 2D conversion rules | Separate 3D source-native extraction; no promotion of flattened yaw, floored clearance or Cut defaults |
| [WASM session](../../../rust_parser/wasm/src/lib.rs), [native session](../../../rust_parser/tauri/src/session.rs), [native commands](../../../rust_parser/tauri/src/main.rs) | Parallel session/query transports | Mirrored regional precheck/extract query; no regional viewer query exists in these inspected interfaces |
| [SaveClient](../../../map/static/map/save_client.js), [worker](../../../map/static/map/worker.js) | Shared frontend facade and ID-based worker requests; lean handoff/stateVersion machinery | Expose regional query and connect current-session lifetime to async scene construction |
| [Height view](../../../map/static/map/height_view.js), [selection](../../../map/static/map/selection.js), [filters](../../../map/static/map/filters.js) | Committed isolation/band and existing visibility; HeightView exposes isOpen/dismiss/commit hooks | Expose a coherent volume snapshot; separate regional membership from selection; map visibility to extract identities |
| [Page entry](../../../map/static/map/index.html), [build](../../../tools/build_site.py), [Tauri configuration](../../../rust_parser/tauri/tauri.conf.json) | Existing script order; static vendor copy; shared dist; Tauri self-only script CSP | Attach one same-origin module/scene in the actual product. The local Three module/license are present but untracked and not loaded by the page |
| [Renderer probe](../prototype/renderer-probe.html), [probe notes](../prototype/renderer-probe-notes.md) | Standalone 25-instance synthetic loading/instancing experiment | Integrated renderer, camera, region, category visibility and teardown; no product scene exists yet |
| [Generated tables](../../../game_data/README.md), [fixture manifest](../../../tools/fetch_test_saves.py) | Generated docs/world folders and the three named representative saves are present locally; belt_item_state is also present | Consume available input; do not claim fresh parsing, a current table-coverage census or real modded coverage |
| [UI behaviour guard](../../../tools/ui_behaviour.py), [class guard](../../../tools/ui_classes.py), [core editor tests](../../../rust_parser/core/tests/editor_move.rs) | Existing load/chrome/static/editor seams; no integrated enter/exit assertion yet | Add viewer handoff evidence to the existing UI guard; core predicate/extract evidence and later actual shell trials |

### Integration definitions for the global spec

These details can be designed without reversing settled decisions. They must be explicit before a global spec is called implementation-ready; this review leaves them visible instead of fabricating approved answers.

| Definition still needed | Why it matters | Contract boundary to preserve |
| --- | --- | --- |
| Exact regional request/response schema | Buffer layout/strides, origin, identity/type/category linkage, omitted versus unknown values, clipping fragments, decoding parity and errors are not yet an executable transport contract | 42: compact numeric buffers + parallel identity/honesty table, same WASM/native shape, 2D payload unchanged |
| Boundary edge cases (unknown-scale policy settled 2026-11-26) | Unknown scale uses origin-only admission and location plus uncertainty, overriding volumetric fallbacks. Boundary-touch and empty/degenerate intersections still need one consistent rule | 42–44: never silently use unit scale; counter/extractor share exactly one predicate; unknown-size origin test stays an approximation |
| Entry/exit and returned state | Retention is settled on 33/45: preserve map position/zoom, Selection, committed rectangle/band and shared filters including intentional visit changes; Height view returns closed. Exact widgets remain to design | 33 requires restored width/buckets/visibility and HeightView.isOpen() false; 43 requires new entry to expand membership |
| Orbit behavior | Initial point of interest, framing, input mapping and recover/reset behavior remain unspecified by 21 | Orbit/pan/zoom only; no imported selection pivot/nav-cube requirement from horizon 08 |
| Representation kit and honesty | 48/61 now permit explicit provisional coverage; family inventory and original-model refinement remain open on 61, with scale uncertainty taking precedence | Original forms only; reserve is not shell; unknown size is not a 4 m solid; define first coverage and how original decorative forms coexist with reserves |
| Paths and category/Z controls | 51 settles visual Z within the loaded interval, without implicit region changes. Curve approximation/clipping, category mapping and exact widgets remain integration work | Static actor traces, power chords, lifts as occupants; no membership growth from toggles and no geometric save edits |
| Async construction and resource ownership | A late extract response after exit/load/handoff, partial construction failure or cancellation must not retain stale scene resources | Current-save snapshots, no historical scenes, reject before allocation, no persistent 3D render cost after exit |
| Messages and validation procedure | Empty/unknown/reserve/refusal presentation, initial form coverage, comparison references and leak measurement need concrete reviewable criteria | No invented precision, minimum count labeled correctly, no unearned FPS/memory guarantee; runtime thresholds credited by actual trials |

A global author can choose routine implementation details within these boundaries. If a choice would change membership, uncertainty guarantees, retained editor state or the published scope, record that decision explicitly rather than describing it as already settled by a short Answer.

### Evidence limits and nonblockers

- The accepted feasibility GO is based on recorded MX110/Electron environments. The renderer probe and cost harness were separate experiments; neither is an integrated save-loaded Three.js viewer.
- Intel iGPU, co-residence with a loaded ~600k-object WASM session, repeated product visits, actual hosted browser and rebuilt Tauri parity are not credited. Tickets 55–56 own that evidence.
- Geometry must still be compared through the integrated viewer against real regions and the transform exceptions. Ticket 54 remains open.
- Terrain 29 blocks nothing on this viewer. Node 59 is open after the 2026-11-26 correction: acknowledging a missing fixture did not complete modded-save testing. Node 61 separately tracks missing/free-form shape research and subsequent simplified-model refinement.
- The older 2.5D spec's open-adapter language, draft budget notes and catalog's floored-clearance recipes are historical. Use the newer source-native and regional contracts for the first viewer.
- No source-mesh supply is missing as a prerequisite: primitives/original forms are the agreed supply. The initial recognizable kit still needs to be authored and checked during implementation.

## 2. Consolidated specifications by main strand

The primary deliverables are **six consolidated strand specs**, listed in the [main strand index](viewer-spec-index.md#main-strand-specifications): Regional viewer, Volume selection, Visual presentation, Runtime limits, Browser and desktop, and Save integrity. Each brings together its settled tickets into a coherent contract, defines its interfaces with the other strands and identifies remaining global integration definitions. Height view keeps its existing 2.5D spec; Edit controls and Build package remain separate/later scope.

The **28 per-ticket specs created earlier are preserved** in the [supporting coverage matrix](viewer-spec-index.md#coverage-matrix). They provide source-level traceability rather than the primary spec structure. Supporting research/gates stay evidence/constraints, and node 08 is labeled as the later editor horizon.

Source tickets associate their primary consolidated strand spec through Status: specced and Spec metadata; Supporting spec metadata retains each earlier per-ticket document. Their Answers, findings and dependencies are preserved. The graph projects the primary associations. No open task is promoted to passed or delivered, and no root/whole strand is marked specced by this viewer-slice package.

### What remains open

| Node | Remaining work |
| --- | --- |
| 59 | Obtain a real modded fixture and record actual validation; no compatibility pass exists |
| 61 | Investigate missing/free-form 3D geometry, define initial honest forms and keep refinement tracked |
| 60 | Implement the regional viewer after composing the global spec and making the integration definitions concrete |
| 54 | Actual geometry comparison against representative regions and recorded exceptions |
| 55 | Actual admission, density, repeated visits, failure recovery and resource-release stress evidence |
| 56 | Actual browser/localhost/Tauri viewer and 2D regression parity |
| 58 | Delivery decision after those checks and controlled-release requirements |
| 26, 22, 23, 27 | Later picking/Z/edit-control/edit cycle after viewer delivery |
| 29 | Optional nonblocking terrain investigation |

### Verification scope

This task uses documentation/link/coverage checks and a graph consistency review. Application tests, the WASM/native build, browser flows, performance runs and in-game checks were not run; they would not prove a viewer that is not implemented. The final task report records the document checks actually executed.

The working tree already contained untracked campaign documents, rules, vendor Three files and a Rust transform-proof example. This package preserves that unrelated local work. No staging, commit, worktree, push or deployment is part of this task.

### Documentation checks executed

- Six consolidated strand documents and all 28 supporting ticket documents exist; each ticket's primary Spec points to its owning strand and Supporting spec retains its earlier document.
- 526 local Markdown links and five anchor references in the viewer package, map and continuation instructions resolve.
- Graph associations agree with all 28 ticket/spec pairs. The root and ten checked open implementation, acceptance, delivery, terrain and later-edit nodes remain open with no completion spec assigned.
- Comparison against the pre-edit snapshot preserves all 28 ticket bodies, including Answers, findings and dependencies, apart from the intended status/spec metadata. No pre-existing campaign file was removed; the 2.5D spec, research and prototype files are unchanged.
- Git diff whitespace check passed. Because the campaign directory was already untracked, scoped snapshot/content comparisons also checked changes that ordinary git diff does not show.

No application runtime/build/test result is credited by these documentation checks.

