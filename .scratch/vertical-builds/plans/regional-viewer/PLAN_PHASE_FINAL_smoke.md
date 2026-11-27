# Final smoke — integrated regional viewer

Status: NOT STARTED. Prerequisite: real [Phase 4 implementation](PLAN_PHASE_4_product-integration.md) plus HEC-01…10 evidence in [exit criteria](../../specs/viewer-exit-criteria.md). This file is an acceptance procedure, not reported results.

## Phase contracts

Built here: recorded actual geometry 54, stress 55 and parity 56 evidence and an explicit delivery-58 decision input. No product placeholder remains. Unavailable fixtures/environments stay OPEN; do not mark successful skips. Run reliability/acceptance before a stable-release merge, never as untracked post-deployment hardening. No deployment is authorized by this plan.

## Main paths

### S-01 — geometry and original kit (54)

- [ ] Review every exact family in the [minimum kit](../../specs/viewer-initial-coverage.md) with a comparison sheet: pass only when source class/pose/sizeKind, build, case origin (synthetic versus real), screenshot and reviewer outcome are recorded. Real-case gaps remain explicit, not false passes.
- [ ] `All_080726-163150.sav`, around map px (2721,1505), Z 32…45 m, and foundations around (2650,1420): pass if distinct floors/pole stack stay separated, native thickness/pose matches records, not constant 4 m or cell-max height. This small case does not cover every required recipe.
- [ ] `BuildITBIIIIIG_210726-231135.sav`, constructor stack px x449…475/y5787…5822, Z -17…15 m; rotated neighborhood (807,4328); tilted pillars near (1401,3672): pass if tilt/off-axis headings and unfloored native centres match the source, not flattened payload yaw/hulls. Capture actual chosen region coordinates/band.
- [ ] Sloped Mk5 belt near px x7669…7670/y5124…5175 and solo rail region (4725,2145)…(4776,2233), plus a vertical pipeline: pass if saved vertex XYZ rise/fall and crossings read correctly, outside portions are clipped, separate fragments are not joined, and linear-sample approximation remains disclosed. The older tight rail dump had a sampling gap; locate real samples, do not invent them.
- [ ] Unknown-size passthrough, known-size unreadable-scale fixture, unlisted clearance class and a point boundary contact: pass if each remains visible in the appropriate truthful fallback, without invented solids/scale/curve. HiddenClasses remain absent even if older research expected their pins.
- [ ] Compare smelter/constructor/storage/power cues at readable orbit scale: pass if families are distinguishable without type text as the sole cue, neutral reserves remain evident and the legend does not claim measured parts/ports. Record original asset provenance.

### S-02 — actual observation/editor loop (60/56)

- [ ] Commit a rectangle/Cut band, subtract one occupant from Selection, enter: pass if 3D includes spatial occupants independently of Selection, keeps 2D visible until admission/build succeeds, and issues no editor operation.
- [ ] Orbit/pan/dolly, keyboard arrows/Shift+arrows/+/-/Home and Reset at wide/narrow aspect: pass if region is initially framed, Reset returns to the documented region target, resize does not reset current orbit, text inputs do not trigger canvas shortcuts, and no camera action mutates save/undo.
- [ ] Hide walls/foundations through existing sidebar, hide an individual mark, narrow/widen loaded visual Z and reset: pass if only drawing changes, count/membership/Cut do not, absent-bucket types obey shared authority, and widening cannot see outside loaded interval.
- [ ] Back: pass if map width returns within 1 px, same buckets/map centre/zoom/Selection survive, category changes persist, prior 2D altitude cap is restored, Height View is closed, and its committed rectangle/band remain available. No pageerror.
- [ ] Reopen committed Height View and re-enter without drawing: pass if no band reset/re-peel or lost delimiter. Return, perform an existing 2D edit/undo, re-enter: pass if the new current-state extract is used with no stale synthetic-id map.
- [ ] Empty region, disjoint Cut/cap and nonempty all-hidden region: pass if each has its distinct message, accurate admitted/visible counts, accessible Back/Reset and no fake occupants.
- [ ] Refuse an 8,001+ fixture: pass if message says limit 8,000 and **at least 8,001**, asks to shrink XY/Cut Z, leaves 2D/previously open Height View usable, and never starts output/scene construction. At 8,000 admission succeeds, subject only to separately reported resource failures.
- [ ] Keyboard/focus/Cancel/Back at narrow viewport: pass if actions and filters/rail remain reachable, status is announced, uncertainty is not color-only, Escape respects topmost dialog and focus returns to a valid invoking action.

## Secondary paths

- [ ] Already-loaded/cached page with closed Height View: pass if entry uses retained current-save delimiter, no historical scene cache or redraw prerequisite.
- [ ] Cancel in query, import and build stages; let late success **and late error** settle: pass if no canvas/dialog/restore from retired visit, no session termination and no overlap with successor regional query before drain.
- [ ] Load a different save during each stage and while ACTIVE: pass if old result cannot attach, old map/rail/Selection snapshot cannot overwrite new buckets, and load/recovery remains available.
- [ ] Partial adapter failure, module failure and GPU context loss: pass if owned resources are released exactly once, current same-save 2D returns, correct error is visible, and retry builds fresh.
- [ ] Pending background lean handoff: pass if no swap/preparation occurs while lease is held, no RPC is stranded, and current ready session can resume handoff after clean exit.
- [ ] Worker loss/native unhealthy session: pass if epoch/readiness invalidates, scene retires and existing load/replay recovery owns repair; never display a false empty-success or replay from scene objects.

## S-03 — actual shell/environment parity (56)

- [ ] Localhost served dist with intended COOP/COEP: pass if same-origin pinned core/addon loads once, no stale nested modules or CSP/console error, and main/secondary product paths work.
- [ ] Actual hosted-browser test environment under production-equivalent headers: same pass conditions. A local assumption about Cloudflare is not a run. Use an explicitly authorized preview/deployment; this task does not deploy.
- [ ] Rebuilt Tauri using the same dist and actual raw command: pass if CSP allows module graph, decoded records/errors match browser for same save/regions and all entry/exit/filter/refusal/regression flows work. Shared dist or native library tests alone do not close this item.
- [ ] Record OS/browser/WebView/GPU/build/header details and normalized parity outputs; absent shells are OPEN, not passed.

## S-04 — density, failure recovery and release (55)

- [ ] Measure ordinary, dense and cap-boundary regions on actual available hardware, including Intel iGPU and the named large-save WASM co-residence: pass only with recorded admit/reject/build/failure-recovery results for each required case. Do not infer from the 25-box renderer probe or MX110 standalone cost probe.
- [ ] Run the [3 warm-up + 20 measured visits procedure](../../specs/viewer-exit-criteria.md#repeated-visit-measurement): pass if every exit has zero owned GPU resources/canvas/controls/listeners/observers/RAF, no continuing 3D render work and no unexplained per-visit retained buffers/trend. Report heap/live/high-water metrics distinctly.
- [ ] Repeat with cancellation/partial failure/context loss: same release conditions, usable current-save editor and fresh retry. Resource failure must not silently degrade to a partial scene/LOD or recommend desktop as a different ceiling.

## Existing feature regressions

- [ ] Existing load/drop/progress/unload/recovery: same-save bytes stay local and editor session remains healthy; no network save upload.
- [ ] Existing Selection/copy/paste/move/rotate/delete/undo/export outside a visit: pass existing core/UI guards and a real editor walk; no scene-derived save geometry or changed chain/copy semantics.
- [ ] Height View explicit rectangle/one-axis edges/Cut band/side-panel/flaps: existing gestures still work, closing/reopening does not silently select new occupants, current 2.5D obligations remain tracked separately.
- [ ] Existing sidebar/dock/altitude/chrome/static class behavior: no reordered incumbent scripts, CSS primitive restyling or dock-open map-anchor change; existing UI behavior/class guards still pass.

## Deferred work and delivery decision

No known essential async/lifecycle/format reliability phase may be deferred past merge. If a required environment/test cannot run, record the precise symptom/risk it leaves uncovered and keep the corresponding trial/delivery gate OPEN.

- Real modded compatibility (59) and missing/free-form model inventory/refinement (61) remain open; symptoms could include unsupported class metadata/forms, handled by labeled fallback, not certified coverage.
- Exact spline excursions, shells/collision/connection validation, terrain and later 3D edits remain outside this MVP; do not present linear/reserve observations as those capabilities.
- [ ] Update 54/55/56 only with their actual evidence; then make the separate 58 delivery/controlled-release decision. Passing a documentation validator or implementing 60 alone cannot close it.
