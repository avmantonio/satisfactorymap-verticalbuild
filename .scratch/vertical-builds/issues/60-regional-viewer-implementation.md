# Implement the regional 3D viewer
Level: theme
Kind: ticket
Parent: 79
Status: open

## Objective

Implement the first regional 3D viewer in the existing app, following the settled strand contracts and the closed [global integration contract](../specs/viewer-integration-spec.md). This implementation must exist before the geometry, runtime, and shell-compatibility acceptance checks can be evaluated.

## Scope

- Read-only view of the applied save contents inside the committed Height-view region and Z window.
- Separate regional scene extract; preserve the existing 2D payload and editor path.
- Save-native position, orientation, scale, honest size metadata, clipped static paths, and recognizable simplified silhouettes.
- Shared browser/Tauri frontend, with the same WASM/native record shape.
- Refuse regions above 8,000 admitted occupants before scene buffers are allocated or the 2D view is replaced.
- Destroy scene resources on exit and rebuild from the current save on re-entry.

## Integration prerequisite — closed by specification

The five integration-design prerequisites are now explicit; this is not an implemented viewer or a runtime pass:

- [Global integration](../specs/viewer-integration-spec.md): module responsibilities, atomic entry/query/exit, retained 2D state, async lifetime and failure recovery.
- [Regional wire v1](../specs/viewer-regional-wire-v1.md): exact frame/strides/validity/identity/path/error contract and boundary/degenerate-region rules, shared by Rust/WASM/native/JS.
- [Integration map](../specs/viewer-integration-map.md): exact APIs, event receivers, file ownership, ordering, handoff lease and same-origin module supply.
- [Initial visual kit](../specs/viewer-initial-coverage.md): exact minimum class coverage and honest reserve/unknown overrides; research 61 remains open.
- [Execution phases](../plans/regional-viewer/PLAN_PHASE_1_core-extract.md) and [exit criteria](../specs/viewer-exit-criteria.md): implementation order, commands, risks and final integrated smoke.

Begin product implementation with Phase 1 on a feature branch from main, not by modifying this tracker branch. Do not reopen the renderer, membership, cap or read-only scope. Status remains open until the product implementation exists.

## Completion

The viewer is integrated in the product and the follow-on acceptance checks [54](54-geometry-check.md), [55](55-stress-trial.md), and [56](56-parity-trial.md) can exercise the implementation. This ticket does not authorize editing in 3D or claiming collision accuracy.
