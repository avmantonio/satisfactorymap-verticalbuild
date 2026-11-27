# Regional 3D viewer — global integration contract

Status: implementation-ready contract; product implementation and runtime acceptance remain OPEN.
Owner: implementation ticket 60, under branch 79. This document closes integration design, not delivery.
Approval: the user approved the documentation-only integration closure in this session.
Baseline inspected: product main `367da83`; tracker `e1b4acb`. Existing local vendor/proof work is not implementation evidence.

## 1. Executive summary and scope

Build one temporary, read-only, regional observation of **already applied** save contents. Compose the six [strand contracts](viewer-spec-index.md#main-strand-specifications), preserving the approved unknown-scale, retained-state and visual-Z clarifications. The integration choices below are now normative; implementation agents must not choose incompatible interfaces independently.

Objectives:

1. Rust admission and extraction use one spatial predicate and one immutable applied session; exactly 8,000 occupants may enter, 8,001 refuses before regional output buffers or replacing 2D.
2. WASM and native return the same versioned binary format and normalized errors through one frontend facade.
3. Enter, exit, failure, cancellation and save replacement cannot lose committed delimitation or display a prior save.
4. The initial representation kit has finite, reviewable coverage and explicit uncertainty.
5. Acceptance has observable evidence requirements; documentation checks never stand in for product trials.

Includes regional native pose/scale/size, static clipped traces, orbit/pan/zoom, shared filters, bounded visual Z, current-state rebuild and deterministic resource destruction. Excludes edits/picking/gizmos, terrain, flight, simulation, collision certification, official mesh supply, historical scene caches, a new framework or separate desktop engine. No save data leaves the machine.

## 2. Context and technical diagnosis

The current map consumes a lean 2D payload; it cannot reconstruct tilt, lightweight scale, physical size or 3D tangents. The worker/native sessions can query retained save bytes but expose no regional query. The client revision counter is private and currently protects lean handoff, not a viewer. Height View conflates open chrome with `isolation`: closing destroys that rectangle and temporary occupants; creating a rectangle resets its Cut band. Neither behavior is a persistent-region API.

Integration therefore needs new query/state seams, not another product decision or renderer investigation. During transition the existing editor remains fully usable and the entry action stays unavailable until the real query and renderer are connected. Test fixtures are never shipped as an alternate data source. There is no save-format migration or irreversible edit: this feature is a query plus disposable presentation.

## 3. Conceptual architecture

```text
Height View gestures ---> HeightRegion (committed rectangle + Cut band)
                                   |
Shared Filters + altitude ---- snapshot ---- Applied session authority
                                   |                 |
                                   +---- RegionalViewer controller
                                                   |
                                         SaveClient regional query
                                            /              \
                                      WASM worker       native command
                                            \              /
                                              sav_core
                                    count -> admit -> extract
                                                   |
                                      versioned bytes + identity
                                                   |
                                   decoder -> visibility -> adapter
                                                   |
                                   Three.js batches / orbit / readout
```

The architecture is snapshot-query plus disposable view. The source engine owns spatial meaning; neither renderer recipes nor category toggles can change membership. The controller owns the visit, not save state. The shared filtering authority owns visibility, not a second 3D filter store.

| Component | Sole responsibility | Input → output |
| --- | --- | --- |
| HeightRegion | Persistent, committed delimitation for the loaded save | committed gestures → copied region, region revision |
| Height View | Temporary Cut UI and existing selection interactions | committed region → chrome/preview; explicit gestures → commits |
| Applied session authority / SaveClient | Ready/busy/lost state, revisions, visit lease and request transport | immutable query → bytes or normalized error |
| Regional core | Source-native interpretation, common membership, early admission and binary encoding | store + region → v1 frame; no editor op |
| Decoder | Validate the entire frame before exposing typed views | bytes → checked records, no render objects |
| Visibility bridge | Resolve stable identities to existing filter controls and hidden marks | checked identities + shared state → draw masks |
| RegionalViewer | Single visit FSM, async correlation, UI handoff and cleanup | entry/exit/session events → owned visit or intact 2D |
| Scene adapter | Batched geometry, camera, interaction and resource disposal | checked regional arrays + masks → temporary scene |
| Form registry | Original recipe dispatch and coverage classification | exact short class / path kind → recipe or honest fallback |

Exact method names, transport commands, wire layout and error data are fixed in the [wire contract](viewer-regional-wire-v1.md); event wiring and file ownership are in the [integration map](viewer-integration-map.md).

## 4. State and data authority

### Persistent delimitation

HeightRegion stores `{saveEpoch, revision, rectMapPx, cutZM}`. `rectMapPx` is `{minX,maxX,minY,maxY}` in the existing Leaflet/map-image pixel frame; `cutZM` is `{min,max}` in absolute save metres. All values are finite; XY must have positive width and depth; Cut permits equality. Store copies, not mutable references to Cut controls, buckets or Selection.

- A newly committed rectangle may initialize the Cut using the existing Height-view behavior, then commits that result. Subsequent explicit XY edge commits retain the committed band. Explicit Cut gestures commit the band on release.
- Closing/dismissing chrome does **not** clear HeightRegion. Add an explicit Clear region action and a separate `clear()` operation. New load, unload and lost-session reset clear it; an edit/undo in the same save preserves the coordinates but requires a new query.
- Altitude-cap clamps, category refreshes and reopening may derive a displayed effective band; they do not implicitly overwrite the committed band. Only an explicit region gesture changes it.
- `HeightView.dismiss()` releases chrome/caches and makes `isOpen()` false. A dedicated `suspendForViewer()` also guarantees no selection/peel operation. `reopenCommitted()` rebuilds temporary caches from current 2D buckets without resetting the band or applying a new Selection. Ordinary edit/peel behavior resumes only after an explicit gesture.
- The enter action is available from the retained region even when Height View is closed. It is disabled if there is no region, a load/edit is busy, or placement/rectangle/Cut dragging has not committed. Do not cancel an uncommitted placement in order to enter.

### Coherent entry snapshot

Capture synchronously, without an `await`: session stamp, copied HeightRegion, current altitude cap, map centre/zoom, focused element and Selection identity snapshot; check the same session stamp again. The session must be ready and the region saveEpoch must match. Freeze this value for the visit. Preserve Selection by suspending its input, not by clearing/reselecting it through peel. No whole-save or bucket copy is needed.

Convert all four XY corners using the existing map/world inverse, take world minima/maxima (map Y is flipped), divide centimetres by 100, and intersect Cut Z with the altitude cap. Do not use rounded payload positions. The exact inverse and request fields are specified in the wire contract. An empty cap intersection is a successful empty region; malformed XY is an error, not an auto-expanded box.

### Session stamp and visit identity

SaveClient exposes an opaque copied stamp `{saveEpoch, stateVersion}` and `isReady()`. Epoch changes on load/unload/reset/session loss, including native dispose and worker crashes. State version changes **before dispatch** of any mutation attempt, including failed edits/undo/replay. Readiness remains false until the resulting payload has been integrated into the 2D editor, not merely received. A ready notification must come from the existing payload-install completion, so an extract cannot combine a new store with old filters. Each state-changing load/edit method returns the existing payload Promise with an immutable `.sessionStamp` property captured at dispatch; this is an API property, never a payload field. The installer captures that operation's stamp, rejects stale payload installation by comparing it to the current stamp, then calls `markPayloadInstalled(capturedStamp)` only after all current buckets/filters are installed. Never obtain a fresh stamp at completion and use it to acknowledge an old payload. A confirmed **pre-mutation healthy edit refusal** may return to ready at the advanced version with the unchanged already-installed payload, only if the rejected operation is still current and the backend proves it retained the original store. It still invalidates the old visit. Failed loads, unknown mutation outcomes and session loss never take this shortcut; they remain not-ready until existing recovery/install finishes.

Each enter obtains a strictly increasing controller `visitId`. A completion may affect UI only if visitId, session stamp and entry-region revision all still match, the visit is not aborted and its lease is live. Check after every asynchronous boundary and immediately before attaching the canvas. A failure from a stale visit is discarded just like stale success; it must not close or show a dialog over a newer visit.

`SaveClient.acquireRegionalVisit(stamp)` returns an idempotently releasable lease. While held, defer lean handoff start/swap; abort an already-preparing handoff without terminating the serving worker. Recheck the lease at the actual swap guard as well as scheduling. Same-state handoff is an optimization, not a save mutation; after release it may resume only for the still-ready current revision. Mutations/loss invalidate the lease synchronously. Do not allow overlapping regional queries: cancellation retires UI ownership immediately, but a new enter waits until the old query settles. A cancelled synchronous WASM/native query need not be preemptible.

## 5. Regional query and spatial rules

One public query, `SaveClient.queryRegionalScene(request, {stamp, signal})`, performs **atomic count then extraction** against the same store. There is no separately reusable admission token. WASM executes synchronously within its worker event; native holds the session guard through both passes. Never await while holding the native guard. Client mutations invalidate the result even if the backend has just finished its old query.

Eligible sources are placed buildable actor headers/lightweight instances and recognized static path actors, using the same class exclusions and category authority as the existing map. Exclude hiddenClasses, components, chain-internal actors, resources, collectable pins, players and transient simulation entities. Unknown placed buildable classes remain eligible, not silently dropped for lacking a table row. Lifts remain occupants, not belt paths. An actor with both point and path interpretations yields one record, with the path representation preferred when usable. Identity is full actor instance name, or the documented current-state lightweight synthetic id. No identity-prefix stripping on this transport.

### Volume interpretation

Use complete finite nonzero named W/D/H as `named-box`; otherwise a valid complete clearance union is `clearance-reserve`; otherwise `unknown`. Normalize each available clearance box by its published yaw, union its eight corners in actor-local XYZ and retain its unfloored centre. Missing source translations are not invented. For a complete named box plus clearance, expand the union about its existing centre to at least named Width on local X, Depth on local Y and Height on local Z; never shrink larger source ranges. With only complete named dimensions use an explicitly origin-centred approximate box and zero offset. With clearance only use its actual union/centre. Non-finite, inverted or incomplete dimensions do not establish a volume. Do not promote plan-only overrides, repeating MeshLength, Cut defaults or decorative forms into dimensions. Adaptive beam length may specialize the local longitudinal range only when its source property and axis are readable; otherwise retain and label the class reserve, without claiming instance-length fidelity.

Transform a local known volume with save scale, normalized quaternion for calculation, and position: `centre = position + R(scale * offset)`; `halfWorld = abs(R * diag(scale)) * (extent/2)`. Preserve signed scale. Use f64 for predicate/clipping and encode only afterwards. Membership uses conservative world AABB intersection, not exact mesh overlap. Quaternion metadata remains source-native even if a normalized copy is used in calculation.

For non-path occupants, unknown size, unreadable scale or unreadable orientation uses **origin-only admission** and location plus uncertainty. A usable source path supplies its own spatial geometry without complete box dimensions; sizeKind unknown alone does not demote that path to a point. Scale uncertainty overrides known dimensions, clearance, paths dependent on actor transform and every decorative recipe. Zero scale is readable, not silently one; it can produce a degenerate world AABB. A non-finite/missing origin cannot be honestly located: return `SOURCE_DATA_INVALID` rather than fabricating or silently skipping an eligible unreadable actor. No unit-scale fallback.

### Boundaries and paths

- All spatial intervals are **closed**: box/point face, edge and corner contact are admitted. No epsilon expansion or rounded-number comparison.
- Positive XY spans are required. Zero-width/depth XY or inverted intervals → `INVALID_REGION`; equal Z bounds are a valid slab, not an invalid region. Disjoint Cut/cap → successful empty scene with no admitted occupants.
- v1 path geometry is the **linear chord chain between original save-native XYZ samples**, not the existing projected 2D Hermite. Use source actor transforms including scale; real world tangents are retained as metadata but not used for membership or drawing in v1. Cables use source chords. This may miss a curved excursion between samples; disclose the linear approximation, never claim exact spline/connection fidelity.
- Stream segment/AABB clipping using the closed slab predicate. A crossing with no source vertex inside counts. A point-only contact yields a one-vertex fragment and a styled contact marker, not a zero-length solid. Preserve disjoint fragments and source order; never bridge across an outside section. Consecutive identical clipped vertices are coalesced in f64 before encoding. Missing/unusable path data falls back to a labeled origin-only record; do not reconstruct chain internals.
- Count each admitted identity once, regardless of fragment count or filters. Admission and extraction invoke the same geometry iterator/predicate. The count pass may parse bounded actor-local scratch and stop at 8,001, but must not allocate regional pose/path output, whole-save caches or renderer buffers. Transient per-actor scratch is released as scanning proceeds. The admitted pass encodes only after count success; checked arithmetic/allocation failure aborts the whole query without partial publication. v1 also applies a shared 64 MiB encoded-frame safety bound before final allocation/transfer, specified in the wire contract. This is a transport resource guard, not a second occupant admission ceiling or a performance promise; exceeding it yields RESOURCE_EXHAUSTED and keeps 2D, never partial geometry/LOD.

## 6. Visit flow and presentation

```text
2D_READY --capture/lease--> QUERYING --admitted/decoded--> BUILDING
   ^                          |                            |
   |                     refuse/error/cancel         attach if current
   |                          |                            v
   +------ idempotent cleanup <------------------------- ACTIVE
                            exit / loss / context loss / mutation
```

During QUERYING and BUILDING keep 2D visible, freeze spatial edit/placement/region commits and the global altitude rail, and show a cancellable progress state. Shared category controls remain usable; resolve the **latest** visibility immediately before mounting. A refusal or construction failure leaves original Height View open if it was open: it has not yet been suspended. Only a fully built, still-current scene may atomically suspend Height View, hide Leaflet, install the scene and transfer focus. Successful empty regions may enter a camera/region-outline view with an empty-state message.

ACTIVE has one main canvas, existing sidebar filters, existing altitude rail in visit mode, a small shared-UI toolbar containing **Back to 2D** and **Reset camera**, and a persistent approximation legend/count summary. Editing shortcuts and Selection mutations are gated while the visit is querying/building/active; loading another save and Back/Cancel remain available. Save export is not a 3D edit but must not gain a new scene-based serialization path.

### Camera

Use a perspective camera with Z-up, the unchanged save-native XYZ basis and no Leaflet Y flip. Compute initial target from the centre of the entered world region, not Selection or unbounded clearance extrema. Frame its eight corners with a 45-degree vertical field of view, aspect-aware fit and 15% margin; use a 1 m numerical framing floor for a flat/tiny volume (not object dimensions). Initial eye direction from target is normalized `(1,-1,1)`; preserve the entire loaded region in frame. Reset restores this same target, angle and fit for the current canvas size. Choose near/far from the fitted region and distance; no clipping of the region corners. Resize preserves the current target/orbit and updates projection; it must not silently reset the camera.

Supply pinned, same-origin OrbitControls matching the vendored Three version. Left drag orbit; right/middle drag pan; wheel/pinch dolly; one-finger orbit, two-finger pan/pinch. No auto-rotate or damping requiring a permanent loop. Render on invalidation/control changes. Canvas is focusable; arrows orbit, Shift+arrows pan, +/- dolly, Home resets, Escape returns unless a topmost shared dialog consumes it. These keys act only in viewer focus; typing in filters/numeric controls is unaffected. Back/Reset remain ordinary keyboard-accessible buttons.

### Visibility and visual Z

Resolve full ids against current 2D bucket ids once for the visit; retain only admitted identity → matching bucket/index references. Do not build a new whole-save id tree. Multiple marks for one id are visible if any non-hidden matching mark belongs to a visible shared layer; hide the identity when every matching mark is hidden or its authoritative shared type/layer is off. Resolve layer/category via the shared Filters registry, not by guessing from a mesh name or representative Mk type. Grouped 2D path types must register all constituent type paths with that same row. Wire metadata never carries a native bucket array index.

For eligible types without a 2D bucket, register a temporary reference in the existing filter registry under the same category/subcategory or Unknown; reuse saved type/category choices and existing sidebar controls, with no second list. Release these references on exit, preserving intentional choices in the shared visibility store. Missing registration is a visible integration error (`VISIBILITY_UNMAPPED`), not permission to force-show the actor. These additions do not alter the standing 2D payload or 2D buckets.

The existing altitude rail gets an explicit visit mode through `Altitude.beginRegionalWindow(loadedZ)` / `endRegionalWindow()`. Capture its pre-visit cap. Its min/max handles and numeric metre inputs operate only within the loaded effective interval; Reset means **Loaded Z range**. Equal handles permit a slab. Category state and altitude state remain single authorities: add a scoped mode to existing setters/MapApp notifications, not a private competing 3D list. Visual Z clips path fragments and masks volumes by the same closed world-AABB interval, origin-only records by origin. It does not change admitted identities/count or committed Cut. Restore the prior 2D altitude cap on exit (visual Z is temporary), while retaining intentional category-filter changes. Disable controls and state why when the loaded interval is empty. Looking outside it requires Back, an explicit region/cap change and a new admission.

### Honest forms and messages

The [initial coverage matrix](viewer-initial-coverage.md) fixes the first kit and the override order. Neutral reserve outlines and a persistent legend coexist with any original stylized recognition cue. Decorative detail never changes the volume, membership, classification or camera frame.

Required messages (equivalent localized wording is allowed):

- Refusal: “3D is limited to 8,000 occupants. This region contains at least 8,001. Reduce the XY rectangle or Cut Z band.” Use exact/minimum per the error data, never a made-up total.
- Empty admission: “No eligible occupants intersect this region.” If Cut/cap are disjoint, add “The Cut band and altitude cap do not overlap.”
- Nonempty but invisible: “No loaded occupants are visible. Check categories, hidden objects or the visual Z range.” Offer existing filter controls, not a re-extract.
- Legend: “Simplified observation — not collision or connection validation. Named boxes are approximate; reserves are not shells; uncertain markers show locations only. Paths use straight segments between saved samples.”
- Summary: admitted unique count, currently visible unique count, reserve count, size/scale/orientation/path-uncertain counts. Uncertainty counters may overlap and are explicitly non-additive. Never call fragment count an occupant total.
- Error: short actionable failure + retry/Back; no raw save contents in telemetry or network requests. Session loss uses the existing recovery path, never claims the old scene is usable.

Use existing UI primitives/tokens. On narrow layouts toolbar/readout wrap without covering Back or the canvas interaction area; category and rail access stay reachable. Focus returns to the invoking action if still valid, otherwise the ready map/load action. Labels, keyboard help and uncertainty must not depend on color alone; status uses polite live announcements, progress supports Cancel, and errors use the existing dialog semantics.

## 7. Exit, resource ownership and failure handling

On exit: increment visitId/abort first; stop render scheduling and detach controls/listeners/observers; destroy partial or complete adapter resources; release decoded buffers/references; end altitude visit mode; show/invalidate the existing map; release lease; restore focus. Keep Height View closed after a **successful** visit. Restore map centre/zoom and map width within 1 px only if returning to the same save. Keep original buckets and Selection; visibility reflects current shared choices, not an unconditional pre-visit rollback. A new load owns new buckets and must never receive an old snapshot restoration.

The controller owns query signal, lease, saved handoff UI state and subscriptions. The adapter owns camera, controls, renderer/context, instance/line buffers, geometry, materials, context listeners, ResizeObserver and its pending RAF. Every allocation is registered for cleanup **before** the next fallible step. `dispose()` is idempotent before/after partial build, including context loss; stop RAF, dispose controls/materials/geometries/render lists/renderer, release the exclusively owned context and detach the canvas. No globally retained geometry/material/GPU cache survives visits. The pinned module/recipe definitions may remain loaded; per-visit data may not. Reusable scratch matrix math is allowed; retained Object3D per actor is not.

AbortSignal gives logical cancellation, not a promise to interrupt synchronous Rust. A late transferred frame is immediately dereferenced without decode/render. Tauri returns a raw response owned by that call and keeps no regional server-side stash. OOM/trap may lose the save session: invalidate stamps, clean the scene and invoke existing recovery; never turn it into an empty-scene success. GPU/context loss closes to 2D with an explanation; do not leave both the map and viewer unavailable.

## 8. Transition, ordering and rollback

Implement behind unavailable entry until all seams are real. Land core/transport/state first, adapter second, then connect the actual action and UI guard. The same existing 2D editor is present through every phase; do not replace the parser, payload, selection semantics or editor undo path. Rollback removes/disables the entry and releases viewer hooks; no save migration/rewrite is necessary. Do not deploy or advertise stable delivery based on this documentation package.

Ordering and secondary paths are binding in the [integration map](viewer-integration-map.md). The [phase plan](../plans/regional-viewer/PLAN_PHASE_1_core-extract.md) provides file/task ownership; [exit criteria](viewer-exit-criteria.md) provides evidence and commands. Acceptance 54–56 and delivery 58 remain open. Nodes 59/61 and optional terrain remain independent open work.

## 9. Risks and required coverage

| Risk | Probability / impact | Mitigation and fallback | Coverage |
| --- | --- | --- | --- |
| Count/extract disagree at boundaries, scale or fragments | High / high | One f64 iterator, closed boundaries; reject inconsistent frames rather than render | TEST: HEC-01, HEC-02 in exit criteria |
| Binary layout, omissions or cross-shell decode drift | Medium / high | Versioned canonical frame, strict decoder, golden vectors; fail unsupported versions | TEST: HEC-03, HEC-04 |
| Delimitation or Selection destroyed by chrome teardown | High / high | Persistent owner, non-peeling suspend/reopen; retain same-save state | TEST: HEC-05 |
| Late response/error attaches old scene or restores old buckets | High / high | Session stamp + visitId + lease, guards after every await; dispose stale work | TEST: HEC-06 |
| Filters silently show hidden/misclassified types or expand Z | Medium / high | Identity bridge, shared registry/mode; unmapped is an error | TEST: HEC-07 |
| Partial GPU failure, listeners or RAF survive exit | Medium / high | Allocation ledger and idempotent dispose; return to 2D | TEST: HEC-08; SMOKE: S-04 |
| Decorative cue becomes fake measured shell | Medium / high | Fixed kit, neutral reserves and independent sizeKind | TEST: HEC-09; SMOKE: S-01 |
| CSP/module or shell difference breaks 2D | Medium / high | Same-origin pinned modules, same decoded format, actual shell trials | TEST: HEC-10; SMOKE: S-03 |
| Occupant cap still admits expensive paths / 600k co-residence OOM | Medium / high | Checked allocation, whole-query failure and recovery; shrink region | SMOKE: S-04; no universal memory/FPS guarantee |
| Linear chords miss curved excursions / unknown origins miss crossing unknown geometry | Known / medium | Explicit approximation, no collision certification | ACCEPTED: v1 source-sample chords and origin-only uncertainty, disclosed in legend |
| Real modded corpus is absent; free-form coverage incomplete | Known / medium | Keep 59/61 open and show honest fallback | ACCEPTED: not a compatibility or full-model pass |

## 10. Decision record

- **Atomic query over two public count/extract calls:** prevents stale admission authorization; two internal passes retain the cheap rejection gate. Cost: no persistent count preview/cache in this MVP.
- **Persistent region separate from chrome:** makes closed-on-return compatible with re-entry; costs an explicit clear/reopen API rather than serializing temporary occupants.
- **One versioned binary frame over numeric JSON/base64:** fixed strides and one decoder, raw native response and worker transfer; costs strict validation/alignment. Transport details are not delegated independently to shells.
- **Linear source-sample paths over an unbounded sampling study:** consistent finite membership/clipping now; real tangents survive where present, but curved excursions are an explicit v1 limitation.
- **Visit-scoped altitude mode over overwriting the committed Cut:** same filtering authority, fixed membership and reversible UI; category changes persist, temporary Z does not.
- **Small original recognition kit over completing research 61 first:** gives a finite visual acceptance target without pretending missing shape data exists. Unsupported classes remain reserves/uncertain markers.
- **Logical cancellation over killing the serving worker:** protects the editor session; stale work can finish, but cannot publish or overlap a new query.
- **64 MiB common frame guard over unbounded raw IPC:** avoids the existing WebView2 large-response hazard without a regional native stash, JSON/base64 expansion or a different native admission ceiling. A small admitted count with pathological traces may fail cleanly for resources; this is disclosed rather than silently truncating paths.

This contract closes the five requested design prerequisites. It does not claim any new runtime/build/test pass or start ticket 60 implementation.
