# Phase 2 — persistent region, session lifetime and parallel transports

Tasks: 1 A, 1 B, 3 C. Status: NOT STARTED. Requires [Phase 1](PLAN_PHASE_1_core-extract.md).

Authority: [global contract](../../specs/viewer-integration-spec.md), [wire](../../specs/viewer-regional-wire-v1.md), [map](../../specs/viewer-integration-map.md), [exit criteria](../../specs/viewer-exit-criteria.md).

## Phase contracts

### Built in this phase

| Task | Output |
| --- | --- |
| C-004 | Parallel WASM/native binding, worker operation and native raw command |
| C-005 | SaveClient session stamps/readiness/lease/query/error normalization |
| A-006 | HeightRegion persistence and non-peeling Height View suspend/reopen |
| B-007 | Shared visibility registration and scoped altitude mode |
| C-008 | Native/WASM parity probe and state-contract evidence |

### Required but not built

No product renderer or enabled entry yet. Tests may issue regional queries directly and exercise state hooks in the existing UI guard; fixtures are test-only and must not become fallback runtime data. Future adapter contract is fixed, not a function pretending to draw successfully.

### Phase exit

- [ ] Both shells bind the exact core query and structured errors, with no native JSON number-array transport.
- [ ] `cd rust_parser && cargo test -p sav_tauri --release --test regional_scene` passes native session/nonmutation/error checks.
- [ ] `py tools/build_site.py` succeeds, preserving existing script order.
- [ ] `py tools/check_regional_parity.py --serve --save map/uploads/solo_autosave_1.sav --cases tools/fixtures/regional-viewer-regions.json` passes HEC-04 (new runner/cases from C-008; not available before this task).
- [ ] `py tools/ui_behaviour.py --serve` passes HEC-05/06/07 hook-level cases and all existing assertions; integrated enter/exit remains required in Phase 4.

## Execution queue

- [ ] **C-004** Shell bindings `[C]` atomic; requires A-003 → [spec](#c-004)
- [ ] **C-005** Session/query facade `[C]` atomic; requires C-004 → [spec](#c-005)
- [ ] **A-006** Persistent delimiter `[A]` atomic; requires A-003, can be developed independently of C-004/005 → [spec](#a-006)
- [ ] **B-007** Shared visibility/Z hooks `[B]` batch of registry and rail hooks; requires C-005, A-006 → [spec](#b-007)
- [ ] **C-008** Cross-shell/state contract probe `[C]` atomic; requires C-004/005, A-006, B-007 → [spec](#c-008)

Avoid parallel edits of SaveClient/UI guard; the registry/rail hooks remain owned by B-007 until their combined tests settle.

## Specs appendix

### C-004

Type: C — integration. Difficulty: medium. Status: TODO. Dependency: A-003. Test: native session integration + WASM build.

**Files:** `rust_parser/wasm/src/lib.rs`, `tauri/src/session.rs`, `tauri/src/main.rs`, `tauri/tests/regional_scene.rs`, `map/static/map/worker.js`.

**Contract:** exact `regional_scene` method/command from wire v1; core count/encode under one immutable session/guard; success raw bytes, error prefix with structured fields. Worker copies WASM bytes to transferable ownership without transferring linear memory.

**Criteria:** core shapes/ids/unknowns survive; native guard spans both passes, no awaits inside; command registered; NO_SESSION/lost/limit errors normalize without altering existing error behavior; no standing-payload stash or save upload.

### C-005

Type: C — integration. Difficulty: high. Status: TODO. Dependency: C-004. Test: controlled deferred responses through UI guard.

**Files:** `map/static/map/save_client.js`, `data.js`, `editor.js`, `worker.js`, `tools/ui_behaviour.py`.

**Contract:** session APIs and atomic query from wire v1; invalidate **before** every mutation attempt; load/edit Promise retains dispatch-time `.sessionStamp`; skip stale payloads before installation, ready only after matching 2D payload install; epoch also changes on crash/dispose/native reset. Lease defers handoff start/swap, including scheduled swaps already queued. Cancelled query drains before next query.

**Criteria:**
- Correct bytes/errors through either dispatch; stamp/abort checked before/after await.
- Deferred success and deferred failure after cancel/load/reset/edit cannot publish; load payload completion from old revision cannot install stale buckets or mark new revision ready. Confirmed unchanged healthy edit refusal re-enables a fresh query at the new revision with existing installed state; failed load/unknown outcome does not.
- Lease release is idempotent on every partial failure; handoff cannot strand requests or start a competing memory peak while leased; query cancellation never terminates the serving worker.

### A-006

Type: A — state logic. Difficulty: medium. Status: TODO. Dependency: A-003. Test: existing UI behavior seam.

**Files:** `map/static/map/height_region.js` (new), `height_view.js`, `selection.js`, `index.html`, `tools/ui_behaviour.py`.

**Contract:** copied committed delimiter with saveEpoch/revision, exact commit/get/clear methods in map; chrome dismiss/suspend does not clear or peel; reopen reconstructs from retained current coordinates/band without resetting Selection.

**Criteria:** close/reopen retains XY/Z; edge edits keep band; explicit Cut commit increments revision; altitude/filter refresh does not commit; clear/new save removes delimiter, same-save edit/undo retains coordinates. Snapshot during uncommitted pointer/placement work is rejected. Audit all dismiss callers. Append script after existing tags, no reorder/top-level early reference.

### B-007

Type: B — shared UI/state hooks. Difficulty: high. Status: TODO. Dependencies: C-005, A-006. Test: UI behavior guard.

**Files:** `filters.js`, `altitude.js`, `map.js`, `map.css`, `tools/ui_behaviour.py`.

**Steps:** expose existing registry notifications; map only admitted ids to current marks; register all grouped type paths and absent-bucket Unknown references; add scoped rail mode, numeric metre inputs and Loaded Z reset using shared primitives.

**Visual states:** normal rail unchanged; visit rail bounded; disjoint-loaded interval disabled with reason; no second list; unmappable reference yields explicit build failure, not a default-on mesh.

**Interactions:** latest category/hidden changes update mask only and persist on return; visual Z uses closed bounds, restores old 2D cap and never writes committed Cut. Multiple marks obey any-visible-nonhidden rule.

**Accessibility/responsive:** labeled min/max metre inputs and reset button, native keyboard operation, visible focus; rail/category controls reachable in narrow viewport, no clipped Back affordance in later phase.

### C-008

Type: C — contract verification. Difficulty: medium. Status: TODO. Dependencies: C-004/005, A-006, B-007.

**Files:** `tools/check_regional_parity.py` (new), `tools/fixtures/regional-viewer-regions.json` (hand-authored, new), `rust_parser/tauri/examples/regional_scene_dump.rs` (new), `tools/ui_behaviour.py`.

**Contract:** local-only runner loads the same save and request into built WASM via SaveClient and native AppSession probe, compares decoded semantics, flags/ids/order/fragments and normalized errors; nonzero exit on mismatch. Temporary dumps remain outside git. No new remote service or alternate product transport.

**Cases:** curate actual nonempty solo regions for repeated constructors, sloped rail and size-unknown passthrough/vertical pipe using representative research coordinates; include empty/disjoint and refused fixtures separately. Require coverage counters so all-empty equality cannot pass parity. Mark missing real cases as failures/gaps, not successful skips.

**Criteria:** frontend hooks prove retention, ready/invalidation and shared controls under controlled async interleavings; actual native command/CSP remains S-03, not credited merely by library parity.

Next: [Phase 3](PLAN_PHASE_3_renderer-kit.md).
