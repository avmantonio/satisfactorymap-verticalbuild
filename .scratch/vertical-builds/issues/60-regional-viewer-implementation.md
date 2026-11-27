# Implement the regional 3D viewer
Level: theme
Kind: ticket
Parent: 79
Status: open

## Objective

Implement the first regional 3D viewer in the existing app, following the settled contracts referenced above. This implementation must exist before the geometry, runtime, and shell-compatibility acceptance checks can be evaluated.

## Scope

- Read-only view of the applied save contents inside the committed Height-view region and Z window.
- Separate regional scene extract; preserve the existing 2D payload and editor path.
- Save-native position, orientation, scale, honest size metadata, clipped static paths, and recognizable simplified silhouettes.
- Shared browser/Tauri frontend, with the same WASM/native record shape.
- Refuse regions above 8,000 admitted occupants before scene buffers are allocated or the 2D view is replaced.
- Destroy scene resources on exit and rebuild from the current save on re-entry.

## Completion

The viewer is integrated in the product and the follow-on acceptance checks [54](54-geometry-check.md), [55](55-stress-trial.md), and [56](56-parity-trial.md) can exercise the implementation. This ticket does not authorize editing in 3D or claiming collision accuracy.
