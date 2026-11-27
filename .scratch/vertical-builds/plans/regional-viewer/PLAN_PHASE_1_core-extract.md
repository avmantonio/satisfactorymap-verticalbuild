# Phase 1 — source-native regional core

Tasks: 3 A (logic). Status: NOT STARTED. Owner: ticket 60, no product work authorized by the documentation-only closure.

Inputs: [global contract](../../specs/viewer-integration-spec.md), [wire v1](../../specs/viewer-regional-wire-v1.md), [wiring](../../specs/viewer-integration-map.md), [exit criteria](../../specs/viewer-exit-criteria.md). Product paths are relative to a feature branch from main, not this tracker worktree.

## Phase contracts

### Built in this phase

| Task | Output / file ownership |
| --- | --- |
| A-001 | Request/errors and retained-store native record reader in `rust_parser/core/src/regional_scene/mod.rs` |
| A-002 | Single f64 membership/clipping iterator in `regional_scene/membership.rs` |
| A-003 | Atomic admission/extract and canonical v1 frame in `regional_scene/wire.rs`; exported from `core/src/lib.rs` |

### Required but not built

No production placeholder. Frontend entry remains absent/disabled. Development fixtures live only in `rust_parser/core/tests/regional_scene.rs` and its hand-authored protocol fixtures. Copy the frozen [canonical vectors](../../validation/regional-scene-v1-vectors.json) into `rust_parser/core/tests/fixtures/regional-scene-v1-vectors.json` when implementing; do not add a product dependency on `.scratch/` or game-data output to git.

### Phase exit

- [ ] `cd rust_parser && cargo test -p sav_core --release --test regional_scene` passes HEC-01/02 and producer half of HEC-03.
- [ ] `cd rust_parser && cargo test -p sav_core --release` passes existing parser/editor tests; regional query does not mutate retained body, undo or standing 2D output.
- [ ] 8,001 rejects before output buffers; 8,000 is admitted. Source bytes and 2D editor behavior remain unchanged.
- [ ] Existing site remains buildable; no viewer action points at a fixture.

Generated data must be available locally first, per CONTRIBUTING; missing inputs are setup failures, not waived tests.

## Execution queue

- [ ] **A-001** Native records and request validation `[A]` atomic → [spec](#a-001)
- [ ] **A-002** Common membership/clipping iterator `[A]` atomic → [spec](#a-002); requires A-001
- [ ] **A-003** Count gate and v1 frame `[A]` batch of admission/encoding checks → [spec](#a-003); requires A-002

Tasks share one contract test file and run sequentially. Each task adds its own meaningful seam-level cases, rather than a separate implementation-mirroring suite.

## Specs appendix

### A-001

Type: A — logic. Difficulty: high. Status: TODO. Dependency: none. Test: core integration fixture.

**Context:** establish source-native input without reconstructing 2D geometry.

**Files:** `core/src/regional_scene/mod.rs`, `core/src/lib.rs`, `core/tests/regional_scene.rs`.

**Steps:** define exact request/error enums; stream eligible headers/lightweight records from current effective retained bytes; recover lightweight scale at record offset +56 with bounds checks; classify complete named/clearance/unknown ranges with unfloored offset; read path samples/tangents with native transform including signed scale.

**Contract:** immutable store + validated request yields source record iterator or RegionalError; no payload mutation, editor op or whole-save JS/object duplication.

**Criteria:**
- Happy: actor/LW position, raw quaternion, nonunit/mirrored scale and offset survive; source cable chords and lift-as-occupant remain distinct.
- Edges: missing scale/orientation/dimensions is explicitly flagged; unknown classes admitted as candidates; hiddenClasses/components/chain internals excluded; zero scale is not unit scale.
- Errors: invalid request/required origin is a structured failure; partial/unavailable path becomes labeled origin fallback, never a manufactured chain.

### A-002

Type: A — logic. Difficulty: high. Status: TODO. Dependency: A-001. Test: same core contract file.

**Files:** `core/src/regional_scene/membership.rs`, `core/tests/regional_scene.rs`.

**Steps:** implement world AABB from native pose/scale/offset; origin-only override; source-chord streaming slab clip; yield unique admitted actors and ordered separate fragments; use one iterator for both modes.

**Contract:** request volume + source record → absent or admitted identity plus optional fragments. Closed intervals, no epsilon expansion; zero-Z slab valid, zero-XY invalid, disjoint Z success-empty.

**Criteria:**
- Happy: rotated/scaled/off-centre crossings, no-inside-vertex path crossing, multiple fragments one actor.
- Edges: face/edge/corner and point contacts, boundary vertices, negative/zero scale, unknown-scale known-volume origin inside/outside, empty/disjoint region, unavailable path.
- Errors: malformed geometry is labeled/fails per wire rules, never NaN comparison that silently drops an actor. Count and extraction unique identity sets agree for every fixture.

### A-003

Type: A — logic. Difficulty: medium. Status: TODO. Dependency: A-002. Test: same core contract file plus frozen vectors.

**Files:** `core/src/regional_scene/wire.rs`, `core/tests/regional_scene.rs`, `core/tests/fixtures/regional-scene-v1-vectors.json`.

**Steps:** bound count at 8,001 without regional output buffers; after success encode from the same immutable store with deterministic order; checked u32 offset arithmetic and allocation; prefix serializable domain errors in bindings later.

**Contract:** `regional_scene(&SaveStore, &RegionalRequest) -> Result<Vec<u8>, RegionalError>` exactly matching wire v1; no reusable external admission token.

**Criteria:**
- Happy: canonical header/UTF-8/padding/strides, f64 origin and relative f32 values match frozen vectors; preserve absence bits and full ids.
- Edges: exact 8,000/8,001, multiple path fragments, Unicode metadata bytes, empty scene, no filter/Selection influence.
- Errors: rejection demonstrably occurs before numeric output construction (bounded allocator/encoder test seam or allocation evidence), all overflow/try-reserve failures and the common 64 MiB frame guard unwind without partial publication; a pathological path below the occupant cap produces RESOURCE_EXHAUSTED rather than truncation; body/payload/undo baseline unchanged.

Next: [Phase 2](PLAN_PHASE_2_state-transports.md). Reliability cases above are part of this phase, not deferred until after merge.
