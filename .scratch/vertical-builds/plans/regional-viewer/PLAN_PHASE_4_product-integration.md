# Phase 4 — actual product visit and regression evidence

Tasks: 1 B, 3 C. Status: NOT STARTED. Requires [Phase 2](PLAN_PHASE_2_state-transports.md) and [Phase 3](PLAN_PHASE_3_renderer-kit.md).

Authority: [global contract](../../specs/viewer-integration-spec.md), [event wiring](../../specs/viewer-integration-map.md), [exit criteria](../../specs/viewer-exit-criteria.md).

## Phase contracts

### Built in this phase

| Task | Output |
| --- | --- |
| C-013 | One controller connects real snapshot/query/decoder/adapter/visibility with guarded entry/exit |
| B-014 | Actual entry/Back/Reset/readout/Cancel/clear-region UI using shared chrome |
| C-015 | Product handoff, async races, filters/Z and edit regression in existing UI guard |
| C-016 | Repeated-visit and failure resource evidence hooks for integrated trials |

### Required but not built

No production placeholders are allowed at exit. Integrated manual/hardware/shell trials are intentionally still OPEN until [final smoke](PLAN_PHASE_FINAL_smoke.md) executes. Implementation 60 enables acceptance 54–56; it does not itself close delivery 58. Missing modded corpus/research remains 59/61, not a fake pass.

### Phase exit

- [ ] `py tools/build_site.py` and `py tools/ui_classes.py` succeed.
- [ ] All HEC-01…10 commands in [exit criteria](../../specs/viewer-exit-criteria.md) pass with recorded output/build revision, no missing-tests-success behavior.
- [ ] Product enter/exit works with actual current-save query, no diagnostic fixture path in production.
- [ ] No known async/lifetime regression is deferred to after merge. Actual resource/hardware thresholds remain measured in 55, not invented here.
- [ ] Ticket 60 may be considered implemented only when follow-on checks can exercise the real viewer. Stable delivery/publication waits 54–56 → 58 and is not authorized by this plan.

## Execution queue

- [ ] **C-013** Guarded controller/handoff `[C]` atomic; requires C-005/A-006/B-007/B-011/C-012 → [spec](#c-013)
- [ ] **B-014** Product chrome and messages `[B]` atomic; requires C-013 → [spec](#b-014)
- [ ] **C-015** Adversarial integrated behavior guard `[C]` atomic; requires C-013/B-014 → [spec](#c-015)
- [ ] **C-016** Stress evidence hooks `[C]` atomic; requires C-015 → [spec](#c-016)

## Specs appendix

### C-013

Type: C — integration. Difficulty: high. Status: TODO. Dependencies: C-005, A-006, B-007, B-011, C-012.

**Files:** `map/static/map/regional_viewer.js`, `index.html`, `height_view.js`, `save_client.js`, `editor.js`, `selection.js`, `data.js`, `tools/ui_behaviour.py`.

**Contract:** single FSM in global spec; synchronous immutable snapshot, single-query drain/lease, visit+stamp+region guard after every await, decode and detached construction before UI replacement. Selection and committed delimiter remain separate. Editor shortcuts gated only during pending/active visit; load can always invalidate.

**Criteria:** latest category masks at mount; no stale success/error/restore from old save; successful exit keeps Height View closed with delimiter retained, original buckets/Selection/map centre+zoom and width within 1 px; visit filter choices persist, old altitude cap returns; failures before attach leave existing Height View open. All acquired resources/leases/subscriptions released after refusal, error, cancel, context loss or new load. Re-entry queries current applied state, never cache.

### B-014

Type: B — shared product UI. Difficulty: medium. Status: TODO. Dependency: C-013.

**Files:** `index.html`, `map.css`, `regional_viewer.js`, existing shared UI API (consume, do not restyle feature primitives), `tools/ui_behaviour.py`.

**States:** entry disabled with reason for no delimiter/busy/placement; querying/building cancellable while 2D stays visible; ACTIVE Back/Reset/legend/unique counts; refusal modal says at least 8,001 and shrink instruction; empty, disjoint, all-hidden and uncertainty distinct; recoverable failure; explicit Clear region and reopen committed affordance available in 2D.

**Interactions:** actual buttons and keyboard focus, canvas-specific navigation shortcuts, topmost dialog Escape priority, Back always reachable; shared rail numeric min/max and Loaded Z reset from B-007; category controls are existing sidebar, no duplicate list.

**Accessibility/responsive:** native button/input semantics, visible focus, polite status announcements, non-color uncertainty text; at narrow width toolbar wraps without obscuring Back, filters or rail. No new shell framework or dock/map anchoring behavior.

### C-015

Type: C — integrated contract tests. Difficulty: high. Status: TODO. Dependencies: C-013/B-014.

**Files:** `tools/ui_behaviour.py`, existing editor test suite as unchanged regression gate.

**Contract:** extend existing loaded-save guard, preserving every incumbent check; controlled deferred query/build boundaries test user-visible invariants, not private mesh topology.

**Required sequences:**
- enter/exit/re-enter without redraw; same-save edit/undo then enter observes new records; original save bytes/undo not modified by visit;
- subtract Selection member then enter still includes spatial occupant; no automatic re-peel on close/reopen;
- hide walls/foundations, hiddenIndices and absent-bucket Unknown mapping; intentional category changes persist, visual Z never changes committed band/count;
- cancel/query-drain/late success, late failure, exit during lazy import/build, concurrent new save/reset/loss, queued lean handoff, partial adapter failure/context loss;
- refusal leaves 2D/open Height View untouched; empty and all-hidden messages distinct; no pageerror, zero old canvas/RAF/listeners after cleanup.

**Criteria:** same-save width ≤1 px difference, same buckets and expected shared visibility, map centre/zoom and Selection equality, HeightView.isOpen() false only after actual successful visit exit. New save never gets old restoration. No fake timer-only idle check: advance controlled promises and observe state/output.

### C-016

Type: C — runtime evidence support. Difficulty: medium. Status: TODO. Dependency: C-015.

**Files:** `regional_scene.js`, `regional_viewer.js`, `tools/ui_behaviour.py`; trial reports on tracker branch only.

**Contract:** test/debug-only local counters expose owned adapter resource counts, pending RAFs/listeners and current visit activity without save contents or network telemetry. Release hooks must not retain the scene they measure. Runner can capture JS heap/native/WASM stats where available; unavailable metrics are explicitly marked.

**Criteria:** 20 comparable visits after warm-up, forced partial failures and cancel/retry produce zero owned live resources/active loops after each exit. Record rather than promise heap behavior; a retained-object/resource trend is investigated before delivery. Actual Intel iGPU/600k co-residence, hosted browser and rebuilt Tauri are final trial requirements, not synthetic substitutes.

Next: [Final smoke and delivery gates](PLAN_PHASE_FINAL_smoke.md). Use a phase handoff record when executing phases across sessions; this documentation task has not executed a phase.
