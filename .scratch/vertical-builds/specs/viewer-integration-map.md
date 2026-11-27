# Regional viewer — integration map and ownership

Status: normative wiring for the [global integration contract](viewer-integration-spec.md). No handlers below are claimed implemented.

## 1. State machine

```text
NO_SAVE --load + payload installed--> READY_2D
READY_2D --valid capture + lease--> QUERYING --frame validated--> BUILDING
    ^                                |                           |
    |                                +--refuse/fail/cancel-------+
    |                                                            |
    +--cleanup + same-save restore--- ACTIVE <---current attach---+
                                       |
                         exit / mutation / context loss

any state --load/unload/reset/session loss--> INVALIDATING
INVALIDATING --retire visit + release resources--> loading/recovery/NO_SAVE
```

Cancellation leaves a retired backend query drain pending; entry cannot overlap it. Query completion does not imply ACTIVE. Region changes cannot happen during a pending/active visit; category changes can. The only return path that restores an old map snapshot is the same-ready-save path.

## 2. Actors and event receivers

Actor abbreviations: **R** HeightRegion/Height View; **S** SaveClient/session authority (including worker/native backend); **V** RegionalViewer controller; **F** shared Filters/Altitude authority; **A** scene adapter/decoder; **E** existing editor/map/load/payload installer. These are all participating actors. The final column explicitly lists non-receivers; they must not perform a hidden side effect for that event.

| Event | Receiver actions, in order | Explicit non-receivers |
| --- | --- | --- |
| REGION_COMMITTED (rectangle/edge/Cut release) | R commits copied delimiter and revision; E applies only existing explicit gesture's peel behavior; V updates entry availability | ~~S~~, ~~F~~, ~~A~~ — no query, filter mutation or scene |
| PAYLOAD_INSTALLED | E finishes current bucket/filter/selection install; F completes existing registrations; R clears for new save or rebuilds temporary same-save caches without rewriting committed coordinates; S marks ready for matching stamp; V enables eligible entry | ~~A~~ — no historical scene resurrected |
| ENTER_REQUESTED | V rejects busy/uncommitted placement, captures coherent state, increments visitId; S acquires lease and dispatches single atomic query; E gates edit/placement inputs; F remains interactive | ~~R~~, ~~A~~ — no close/clear or GPU allocation yet |
| REGIONAL_FRAME_RECEIVED | S verifies stamp/signal; V verifies visit/region and passes expected requestId; A strictly validates bytes then builds detached resources; F resolves identity registrations/current choices | ~~R~~, ~~E~~ — no peel/map replacement yet |
| SCENE_READY | V rechecks stamp/visit/region/lease; F begins scoped altitude mode and supplies latest mask; R suspends chrome without peel/clear; E hides Leaflet and suspends its interactions; A attaches canvas, frames camera and renders; V focuses viewer | ~~S~~ — no mutation or new extraction |
| CATEGORY_OR_HIDDEN_CHANGED | F changes the existing shared choice; E updates original bucket flags/hidden marks; V requests mask refresh; A updates loaded draw mask/readout only | ~~R~~, ~~S~~ — no new delimiter, count or extraction |
| VISUAL_Z_CHANGED | F clamps within loaded interval and notifies scoped existing altitude authority; V requests refresh; A clips/masks loaded data and updates summary | ~~R~~, ~~S~~, ~~E~~ — no Cut commit, extraction or selection mutation; suspended map need not redraw |
| EXIT_OR_CANCEL | V invalidates visit first; S logically cancels pending result (not serving session); A disposes partial/full scene; F ends visit mode/unregisters references retaining shared choices; E restores same-save map/input/focus; S releases lease; R remains committed, chrome closed only if entry succeeded | none — all participate; R must not reopen or re-peel |
| REGION_REFUSED_OR_HEALTHY_FAILURE | S returns normalized error; V retires current visit; A releases any partial resources; F drops temporary refs/mode if acquired; E keeps original map/Height View state, releases input gate; S releases lease; V displays current-visit error only | ~~R~~ — no close, clear, new selection or band reset |
| SESSION_INVALIDATED (load/edit/undo/reset/dispose/crash) | S bumps epoch/version as specified and emits before dispatch; V retires visit before further async completions; A disposes; F ends regional mode without restoring old state over a new payload; R clears on new save/loss, retains coordinates for same-save edits; E owns actual mutation/recovery/payload install and later calls matching ready acknowledgement | none — all participate; no viewer-initiated save replay |
| EDIT_REFUSED_UNCHANGED | S confirms same current operation and backend unchanged healthy store, marks advanced revision ready against unchanged installed payload; E reports existing edit refusal and releases busy state; R keeps delimiter; V stays in 2D and permits fresh entry | ~~F~~, ~~A~~ — no filter rebuild or old scene resurrection; failed load/loss cannot use this path |
| LEAN_HANDOFF_REQUESTED | S defers preparation/swap under live lease; if not leased uses existing same-state handoff machinery and checks pending RPCs and leases again at swap | ~~R~~, ~~V~~, ~~F~~, ~~A~~, ~~E~~ — no region/UI/save revision changes |
| CONTEXT_OR_MODULE_FAILURE | A reports current failure and disposes; V follows current-visit exit/error path; F restores scoped state; E restores same-save map; S releases lease | ~~R~~ — no delimitation/Selection mutation |

No event bus framework is required. Direct calls plus explicit unsubscribe callbacks suffice. The table specifies semantics, not an additional global store.

## 3. Exact frontend seams

| Owner | Required API / responsibility |
| --- | --- |
| HeightRegion | `getCommitted()` returns copy or null; `commitRectangle(rectMapPx, initialCutZM, saveEpoch)`, `commitBand(cutZM)`, `commitEdge(rectMapPx)`, `clear(reason)`; revision changes only on actual commits/clear |
| HeightView | Existing `dismiss()` becomes chrome/cache teardown only; `suspendForViewer()`, `reopenCommitted()`; `isOpen()` reports actual chrome/isolation state, not persisted delimitation |
| SaveClient | Session stamp/readiness/invalidated subscription/lease/query APIs from wire contract; invalidate before mutation and on crash/dispose in **both** transports |
| RegionalViewer | `enter() -> Promise<void>`, `exit(reason) -> void`, `isBusyOrActive() -> boolean`; owns visitId, signal, stamp, region revision, resource ledger and current UI restore context |
| Filters | `registerRegionalTypes(types) -> release()`, `resolveRegionalVisibility(occupants)`, `onVisibilityChanged(listener) -> unsubscribe`; reuse existing saved visibility and row checkboxes, index only admitted ids |
| Altitude | `beginRegionalWindow(loadedZOrNull) -> end()` and normal shared setters/getters; temporary mode bounds, numeric metre inputs and Loaded Z reset; end is idempotent and restores only matching-save 2D cap |
| Adapter | `createRegionalScene({host, model, visibility, signal, onFailure}) -> Promise<SceneHandle>`; host detached while building; factory cleans its own allocations if rejecting before returning handle |
| SceneHandle | `attach()`, `setVisibility(mask)`, `setVisualZ(range)`, `resetCamera()`, `resize()`, `dispose()`; dispose works at any construction stage and is idempotent |
| Editor/load integration | Existing edit commands/shortcuts ask the visit gate; load/unload can invalidate at any time; load/edit Promise exposes immutable dispatch-time `.sessionStamp`; skip stale payloads before installation and acknowledge that captured stamp only after buckets/filters are ready |

The controller registers factory cleanup immediately; if the factory has not returned yet, AbortSignal and its internal ledger own cleanup. Never rely on receiving a SceneHandle to clean a failed factory. Observers and error subscriptions are acquired/released with the same visit.

## 4. Entry sequence and ordering constraints

```text
User      Controller        SaveClient        core         Adapter       2D/chrome
 | enter      |                 |               |              |              |
 |----------->| sync snapshot   |               |              |              |
 |            | acquire lease->|               |              |              |
 |            | query--------->| count-------->|              |              |
 |            |                | <=8000? encode|              |              |
 |            |<---------------|<--------------|              |              |
 |            | check tokens / validate---------------------->|              |
 |            | detached construction------------------------>|              |
 |            |<---------------------------------------------| ready        |
 |            | check tokens, latest mask, scoped Z                          |
 |            | suspend Height View + hide map----------------------------->|
 |            | attach + focus------------------------------->|              |
 | exit       |                 |               |              |              |
 |----------->| invalidate first|               |              |              |
 |            | dispose------------------------------------->|              |
 |            | restore same-save map / cap-------------------------------->|
 |            | release lease->|               |              |              |
```

| Must happen first | Before | Failure if inverted |
| --- | --- | --- |
| Save revision invalidation | mutation dispatch / crash recovery | old frame can mount against new save |
| Matching payload installation | isReady / region query allowed | new geometry gets old category/id mapping |
| Commit gesture and synchronous snapshot | first await | mixed rectangle/Cut/cap or partial placement |
| Admission success | regional pose/path output buffers | refused save consumes expensive scene memory |
| Full frame validation | GPU allocation | malformed buffers become renderer state |
| Latest token and visibility checks | chrome suspend/canvas attach | stale scene or obsolete category masks flash |
| Register cleanup ownership | next fallible allocation/await | partial build leaks |
| Retire visitId/abort | disposing/restoring | late error can tear down successor visit |
| Stop RAF/listeners | renderer/context disposal | callbacks use disposed GPU resources |
| Same-save check | map/altitude/focus restoration | old snapshot overwrites a new save |
| Lease released | lean handoff may resume | swap strands regional construction or adds memory peak |

## 5. Secondary paths

| Path | Required behavior, compared with first entry |
| --- | --- |
| Existing ready save / closed Height View | Use retained delimiter directly; do not require redrawing or call rectangle commit |
| Re-entry without edits | Fresh query/arrays/scene; no historical scene cache; current shared filter choices |
| Re-entry after edit/undo | Same coordinates, new state stamp and lightweight identity domain; no reused identity-to-bucket map |
| Refusal at 8,001 | No regional numeric output/adapter allocation, 2D and existing open Height View unchanged; exact minimum wording |
| Cancel while Rust is synchronous | UI immediately retired; backend allowed to finish, frame dereferenced; successor entry waits for drain |
| Enter then load another save | New load invalidates first; old success/error ignored; old snapshot never restores over new buckets |
| Partial decode/build/module failure | No canvas mount; decoder/factory/controller each release only their owned resources; map remains usable |
| Empty effective Z / empty inventory | Valid empty frame; region outline/camera and clear reason, no fabricated object |
| All admitted records filtered out | Nonempty admitted count; no-visible message and current shared controls, not “empty save” |
| Background lean handoff prepared | Abort preparation and defer reschedule while visit lease held; serving worker continues |
| Worker crash / native unhealthy state | SESSION_LOST, stamp invalidation, teardown and existing load/replay recovery; no false healthy retry |
| GPU context loss in ACTIVE | Tear down visit, restore same-save 2D and show retry explanation; no persistent fallback scene |
| Shared category changes during query | Do not affect admission; apply latest choice before first attach and preserve on return |
| Visual Z narrows then widens | Only within loaded interval; membership/count unchanged; prior 2D rail restored on exit |

## 6. Product file ownership and module supply

These are target files for implementation on a product feature branch, **not changes made by the documentation closure**. New names are fixed to let separate agents divide work.

| File(s) | Owner / change |
| --- | --- |
| `rust_parser/core/src/regional_scene/{mod.rs,membership.rs,wire.rs}` + `core/src/lib.rs` | Core request/errors, source-native reader, f64 common iterator/predicate, admission and v1 encoder; reuse retained store, no editor changes |
| `rust_parser/core/tests/regional_scene.rs` | Higher-level core contract fixtures and golden protocol assertions |
| `rust_parser/wasm/src/lib.rs` | Thin `regional_scene` binding and error prefix |
| `rust_parser/tauri/src/session.rs`, `tauri/src/main.rs` | Mirrored native method/raw command under session guard, command registration; not standing-payload stash |
| `map/static/map/save_client.js`, `worker.js`, `data.js`, `editor.js` | Version/ready/lease/query handling, transfer and prefix errors; actual mutation and payload-install invalidation wiring |
| `map/static/map/height_region.js` (new), `height_view.js`, `selection.js` | Persistent owner, explicit commit/clear/reopen/suspend; audit every dismiss caller and avoid automatic Selection rewrite |
| `map/static/map/regional_codec.js` (new) | Strict v1 frame decoder, pure no-render API |
| `map/static/map/regional_forms.js` (new) | Exact class registry and original normalized form recipes; no generated data copied into git |
| `map/static/map/regional_scene.js` (new) | ES-module Three adapter, batching, OrbitControls/camera, resource ledger |
| `map/static/map/regional_viewer.js` (new) | Classic-script controller/action attachment, sync snapshot, FSM and lazy module import |
| `map/static/map/filters.js`, `altitude.js`, `map.js` | Existing shared registry hooks/temporary Z mode and visibility notifications, not replacement filters |
| `map/static/map/index.html`, `map.css` | Semantic host/action/readout, shared UI tokens; no feature-local primitive restyling |
| `map/static/map/vendor/three.module.min.js`, `OrbitControls.js`, `THREE-LICENSE.txt` | Pinned Three r170 and matching MIT addon; preserve existing unrelated local copies until verified |
| `tools/build_site.py` | Copy same-origin modules/addon; stamp new module graph's relative imports in dist as well as entry URLs |
| `tools/ui_behaviour.py`, `ui_classes.py` | Extend existing behavior guard for handoff, races, filters/Z and ownership; retain existing assertions; class guard only for actual class changes |

Append `height_region.js` and `regional_viewer.js` as classic scripts after the existing `data.js` tag; existing script order stays unchanged. `height_view.js` may call HeightRegion only after startup/user gestures; no top-level reference before the appended owner initializes. Controller starts after both scripts are evaluated. It lazily imports `regional_scene.js` only on valid entry, propagating its stamped script query. `regional_codec.js` and `regional_forms.js` are ES modules consumed by the adapter/controller's import graph.

Pin core and addon to r170 (the inspected vendor core reports revision 170). On vendoring OrbitControls, make only its module specifier a same-origin relative `./three.module.min.js`; preserve copyright/license and record the upstream version/hash. No bare `three`, CDN, inline import map or bundler. Keep core and addon using **the same resolved module URL**, so a stamped/unstamped duplicate core cannot load.

Build computes the existing asset hash from original copied files, then stamps literal relative JS imports in the new module graph and the addon in `dist/`, including their shared core URL. It must not rewrite source files or existing unrelated script order. Add a static build assertion for every new import URL, same-origin resolution and one shared core identity; unchanged deployments may cache pinned bytes, changed own modules must not reuse stale imports. Headers remain existing COOP/COEP; test actual Tauri self-only CSP. Module load failure is recoverable entry failure, not an excuse to open a CDN.

## 7. Integration risks

| Risk | Probability / impact | Mitigation | Coverage |
| --- | --- | --- | --- |
| Handler omitted for native dispose/crash or payload install | High / high | Explicit invalidation/ready ownership on both shells | TEST: HEC-06 |
| Region dismissal or scoped Z writes persistent state | High / high | Separate owner; no commit from filter callbacks | TEST: HEC-05, HEC-07 |
| Empty registry mapping falls back to always-visible | Medium / high | Register shared reference or reject VISIBILITY_UNMAPPED | TEST: HEC-07 |
| Cached addon imports duplicate/stale Three | Medium / high | Stamp module graph and assert URL identity | TEST: HEC-10; SMOKE: S-03 |
| Disposal callbacks restore old save or run after disposal | High / high | Token guard before restore; idempotent ownership ledger | TEST: HEC-06, HEC-08 |

Follow [execution phases](../plans/regional-viewer/PLAN_PHASE_1_core-extract.md) in dependency order. No wiring row is permission to claim a runtime pass before implementation and trials.
