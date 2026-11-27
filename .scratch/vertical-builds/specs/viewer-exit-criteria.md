# Regional viewer — executable exit criteria

Status: implementation criteria OPEN. Documentation readiness is tracked separately below.
Contracts: [global](viewer-integration-spec.md), [wire v1](viewer-regional-wire-v1.md), [event map](viewer-integration-map.md), [initial kit](viewer-initial-coverage.md).
Plan: [Phase 1](../plans/regional-viewer/PLAN_PHASE_1_core-extract.md) → [Phase 2](../plans/regional-viewer/PLAN_PHASE_2_state-transports.md) → [Phase 3](../plans/regional-viewer/PLAN_PHASE_3_renderer-kit.md) → [Phase 4](../plans/regional-viewer/PLAN_PHASE_4_product-integration.md) → [final smoke](../plans/regional-viewer/PLAN_PHASE_FINAL_smoke.md).

## 1. Documentation closure versus implementation

The approved task closes integration design only. A CLOSED documentation check never closes HEC, implementation 60, trials 54–56 or delivery 58. Keep 59/61 open. The historical readiness review remains a dated diagnosis, with a closure addendum pointing here.

| Documentation check | Verification | State / evidence |
| --- | --- | --- |
| DOC-01 | `python .scratch/vertical-builds/validation/check_viewer_integration.py` from scratch worktree; local Markdown links/anchors, required integration artifacts, protocol reference vectors and open ticket statuses | CLOSED — 6 reference vectors, 671 local links and 22 anchor references passed; documentation consistency only |
| DOC-02 | Wayfinder Graph `validate-v2`, then chart/sync and render once; graph source is tracker Markdown | CLOSED — 80 tickets, 90 nodes validated; chart/sync + HTML render completed, statuses/Spec associations preserved |
| DOC-03 | `git diff --check` and scoped changed-file review; product checkout unchanged by this task | CLOSED — tracked diff check and explicit new-artifact whitespace/syntax review passed; product checkout retains only its original three untracked files |

The local reference-vector validator is a **document consistency** check. It is not the production core extractor or JS decoder and must not be cited as their passing test.

## 2. Automated implementation contracts (HEC)

Commands below run on the future product feature branch with generated game data and fetched fixtures installed per CONTRIBUTING. New runners/test targets listed here are tasks in the plan, **not commands that currently exist or have been run**. A missing runner/test, silent skip, all-empty parity comparison or untested shell cannot produce CLOSED. Record command, exit status/output, build/commit, fixture/cases and environment for each closure.

| ID | Behavioral criterion / risk covered | Verification command | State / evidence |
| --- | --- | --- | --- |
| HEC-01 | Count/extract share eligible identities and closed f64 membership: rotated/scaled/off-centre boxes, unknown-size/scale/orientation origin fallback, zero/negative scale, touching, slab, invalid XY, disjoint Z, hiddenClasses vs filters/Selection | `cd rust_parser && cargo test -p sav_core --release --test regional_scene` | OPEN — not implemented/run |
| HEC-02 | Exact 8,000 admit / 8,001 early minimum refusal, no regional numeric buffers on occupant reject, checked allocation/64 MiB frame resource failure without truncation, unique multi-fragment count, chord crossing with no original vertex inside, point contact and clipping omission rules; nonmutation of body/payload/undo | `cd rust_parser && cargo test -p sav_core --release --test regional_scene` | OPEN — not implemented/run |
| HEC-03 | Core frame matches canonical v1 vectors; actual JS decoder accepts them and rejects forged version/count/offset/flags/nonfinite/UTF-8/duplicate-key/fragment cases before rendering | `cd rust_parser && cargo test -p sav_core --release --test regional_scene`; then `node tools/check_regional_wire.mjs` from product root | OPEN — new targets planned |
| HEC-04 | Native binding/session and WASM SaveClient decode equal nonempty actual records, omissions, ordering, fragments and errors; actual wrapper normalization tested, not only core roundtrip | `cd rust_parser && cargo test -p sav_tauri --release --test regional_scene`; then `py tools/check_regional_parity.py --serve --save map/uploads/solo_autosave_1.sav --cases tools/fixtures/regional-viewer-regions.json` from product root | OPEN — new native probe/runner/cases planned |
| HEC-05 | Successful visit/return retains rectangle/band/Selection/map centre+zoom and original buckets; width within 1 px; HeightView.isOpen false; reopen/re-entry requires no redraw and causes no peel/reset; same-save edit rebuilds | `py tools/ui_behaviour.py --serve` | OPEN — existing runner must gain these assertions |
| HEC-06 | Cancel/drain/late success **and error**, exit during import/build, new save/edit/reset/crash/dispose, stale ready acknowledgement and queued handoff cannot mount or restore stale state; confirmed unchanged healthy edit refusal returns ready for fresh entry without reviving old visit; matching leases/revisions gate every boundary | `py tools/ui_behaviour.py --serve` | OPEN — controlled deferred boundaries required |
| HEC-07 | Shared category/hidden-index identity resolution including grouped types/absent buckets; category changes persist; scoped rail Z only clips/masks loaded records, preserves count/Cut and restores pre-visit 2D altitude | `py tools/ui_behaviour.py --serve` | OPEN — product integration required |
| HEC-08 | Partial factory failure/abort/context loss and repeated disposal leave no owned live resources, controls/listeners/observer/canvas/RAF; no surviving activity after exit or callbacks mutating successor visit | `py tools/ui_behaviour.py --serve` | OPEN — adapter test counters and integrated sequences required |
| HEC-09 | Exact minimum form registry and fallback precedence; native scale/tilt/offset applied to cue and reserve together; sizeKind never upgraded by recipe, envelope present for clearance cues; unsupported class remains labeled | `node tools/check_regional_wire.mjs`; then `py tools/ui_behaviour.py --serve` | OPEN — tests plus S-01 visual review required |
| HEC-10 | Same-origin r170 module/addon graph, license, one resolved core URL, nested build cache invalidation, existing script/CSS order and incumbent UI/editor regressions | `py tools/build_site.py && py tools/check_regional_assets.py && py tools/ui_classes.py`; `cd rust_parser && cargo test -p sav_core --release`; then `py tools/ui_behaviour.py --serve` from product root | OPEN — new asset check planned; full build/guards unrun |

Use the highest stable seam that can observe each contract. Core/session tests own geometry and immutable extraction; pure decoder/registry runner owns format validation; existing UI guard owns state transitions and product chrome. Do not replace meaningful integration protection with tests asserting private mesh counts or incidental DOM hierarchy.

## 3. Integrated smoke and acceptance ownership

Every item has explicit pass/fail details in [FINAL_smoke](../plans/regional-viewer/PLAN_PHASE_FINAL_smoke.md).

| ID | Evidence owner / procedure | State |
| --- | --- | --- |
| S-01 | 54 geometry: real named save regions and minimum recipe comparison sheet; truthful approximation/uncertainty, transform exceptions and static-path clipping | OPEN |
| S-02 | 60/56 product loop: enter/Back/re-enter, edits/undo outside 3D, persistence, filters/Z, empty/refusal/readout, keyboard and narrow viewport | OPEN |
| S-03 | 56 parity: actual localhost and hosted-browser environment with intended headers plus rebuilt Tauri/CSP; same queries, entry/exit and incumbent 2D editor behavior | OPEN |
| S-04 | 55 stress: admission boundary, actual dense/large WASM co-residence, hardware coverage, 20 repeated comparable visits, injected failure/recovery and resource release | OPEN |

### Repeated-visit measurement

Use one recorded build/save/region/filter set; warm up 3 complete visits, then measure **20** comparable enter/exit cycles, recording before/active/after samples and per-cycle resource counters. Mix at least one query cancellation, one partial construction failure and one context-loss recovery in a separately labeled sequence. After each completed exit: zero live viewer canvases, zero viewer controls/listeners/observers, zero scheduled/ongoing viewer RAF and zero adapter-owned GPU resources. No single-scene historical cache.

Where supported record settled JS heap snapshots/retainer paths, native memory and WASM `memStats` live/high-water separately. A high-water allocator plateau is not itself a leak; retained per-visit buffers, nonzero ownership counters, ongoing rendering or a persistent cycle-correlated retaining path fails. Report unsupported metrics instead of inventing values. GC noise alone is not a pass/fail number; investigate a sustained trend and demonstrate its owner/release. The fixed 8,000 cap is not a universal FPS, vertex or memory promise.

Actual Intel iGPU and co-resident large (~600k-object class) WASM results remain owed by 55; an MX110 standalone probe does not substitute. If any environment is unavailable, record the unrun case and leave the relevant criterion/gate open. Geometry comparison does not certify collision or connections. Real modded compatibility is not credited without fixture 59.

## 4. Completion rules

- Documentation closure: all five requested integration points have normative definitions, reference vectors are self-consistent, links resolve and tracker/graph no longer say the global spec is missing.
- Implementation 60: real current-save frontend/backend exists, HEC contracts are implemented and pass, and 54–56 can exercise it. It is not a delivered/stable-viewer verdict.
- Acceptance 54/55/56: close only on actually executed respective geometry/stress/parity evidence; retain exceptions and unrun environments.
- Delivery 58: separate decision after acceptance and controlled-release obligations. No commit, push, deployment or merge is authorized by this documentation task.
