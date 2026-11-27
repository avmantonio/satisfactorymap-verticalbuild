# Parity trial
Level: theme
Kind: ticket
Parent: 84
Status: open

## Question

What differs across the hosted browser, localhost, and Tauri, including existing 2D functions, WASM and native parse, enter/exit, and filters?

[Renderer probe](18-3d-scene-adapter.md) already tried a small scene. This ticket checks the viewer we would ship, and checks that the 2D editor did not regress.

## Answer

One frontend covers those shells. A difference that blocks the 2D editor fails the trial. A browser that cannot hold an ordinary region is a budget cut, not a second product. Decided 2026-11-23; do not re-grill.

## Comments

2026-11-25 inspection: the product has no regional viewer integration or `SaveClient` query; the renderer probe only establishes the shared local-module seam. This acceptance check is blocked by [Implement the regional 3D viewer](60-regional-viewer-implementation.md). Keep open until available browser and Tauri shells can exercise enter/exit, filters, and existing 2D behavior against the integrated viewer.
