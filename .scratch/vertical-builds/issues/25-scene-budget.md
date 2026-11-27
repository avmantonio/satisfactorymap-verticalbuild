# Cost probe
Level: theme
Kind: ticket
Parent: 81
Status: resolved

Asset: .scratch/vertical-builds/prototype/scene-budget.html, .scratch/vertical-builds/research/scene-budget.md, .scratch/vertical-builds/research/scene-budget-gpu-sync.json, .scratch/vertical-builds/research/scene-budget-gpu-pass1.json, .scratch/vertical-builds/research/scene-budget-cpu.json, .scratch/vertical-builds/prototype/scene-budget-cpu.mjs

## Question

What does a regional scene cost to build, hold, navigate, and release, across densities and the machines we can actually run?

Measure construction, memory, navigation, and teardown. Propose conservative budgets and the refusal rule from those measurements. Terrain is not an input. If ordinary regions do not fit the browser, the answer is a smaller region budget, not a second product.

## Answer

The budget is closed: an oversized region is refused, and the user is asked to shrink it. No LOD and no automatic degradation in this version. Do not publish FPS, GPU megabytes, or a maximum region size before this probe. The old cheaper-rest-of-save split and the two render ceilings are not this delivery. Decided 2026-11-23; do not re-grill.

## Findings

Count occupants of the delimited volume. If **> 8,000**, do not start the 3D scene; keep 2D; ask to shrink. Ordinary corpus regions (49–800) fit. GPU megabytes are not the limiter. Measured on ASUS VivoBook / NVIDIA MX110 / Cursor Electron; Intel iGPU and a loaded 600k wasm tab were not measured. Alternative 14,000 was rejected.

Measurements: [research/scene-budget.md](../research/scene-budget.md). Harness: [prototype/scene-budget.html](../prototype/scene-budget.html).
