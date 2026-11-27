# Feasibility gate
Level: theme
Kind: ticket
Parent: 69
Status: resolved


## Question

Can a real multi-height region be drawn with checkable spatial relations and stable behavior in the environments the phase-1 probes actually ran?

Inputs: [Transform proof](35-transform-proof.md), [Linear paths](36-linear-paths.md), [Proxy catalog](28-proxy-modeling.md), [Renderer probe](18-3d-scene-adapter.md), [Cost probe](25-scene-budget.md), [Asset supply](40-asset-supply.md). This gate does not design the product chrome.

## Answer

GO. A real multi-height region can be drawn with checkable spatial relations and stable behavior in the environments the phase-1 probes actually ran.

Anto, 2026-11-23:

- Spatial relations: YES. Stacking, over/under, and heading are checkable without true machine hulls. Checkable means pose + traces + honest clearance reserves/primitives, not Coffee Stain volumetric meshes.
- Stable behavior: YES. The gate passes on the environments the phase-1 probes actually ran (ASUS VivoBook / NVIDIA MX110 / Cursor Electron; ordinary regions 49–800 occupants; reject > 8,000). Unmeasured hardware (Intel iGPU, wasm tab with a 600k-object save) is deferred to [Stress trial](55-stress-trial.md) — not a fail of this gate.

Terrain is not required to pass. If a region does not hold, change technology, catalog, or budget before [Scene contract](42-scene-contract.md) / [Contract gate](46-contract-gate.md). Technology means a change inside the already-chosen stack (vanilla Three.js InstancedMesh), not a re-pick versus WebGL2.

Decided 2026-11-23. Do not re-grill.
