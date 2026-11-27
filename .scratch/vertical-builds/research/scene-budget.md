# Cost probe measurements

Survey date: 2026-11-23. Ticket: [Cost probe](../issues/25-scene-budget.md). Draft for HITL — not a resolution.

Throwaway harness, not a product renderer and not a library choice. Terrain is not an input. No LOD, no automatic degradation, no cheaper-rest-of-save split, no desktop-only engine.

## Gist

Ordinary representative regions fit this browser. The cliff is **occupant count × proxy weight × frame time**, not GPU megabytes and not wasm. On the MX110 in Cursor’s Electron tab, 14k cheap boxes orbit at ~3 ms GPU+CPU (readPixels stall); 14k with an 8× fatter proxy bound is ~13 ms p95; 150k cheap boxes is **tight** (18 ms p95 vs 16.7 ms vsync). JS/GPU teardown of buffers is <2 ms; JS heap release is GC.

**Draft refuse (for Anto):** count occupants of the delimited volume. If the count is **greater than 8,000**, do not start the scene; keep the 2D map; ask the user to shrink the area. 8,000 is half of the last density where 8×-fatter proxies still stayed under 16 ms on the MX110. The alternative ceiling **14,000** is that measured fat8 point itself — pick one. Do not refuse by meters of region. Do not split the rest of the save. Do not move 3D to desktop.

## Machines actually run

| Environment | What ran |
| --- | --- |
| Host | ASUS VivoBook X512FB, Windows 11, Intel i5-8265U (4c/8t), 20 GB RAM |
| GPU measured | NVIDIA GeForce MX110 2 GB, ANGLE D3D11, WebGL2 in Cursor 3.31.15 / Chrome 150 / Electron 43 |
| GPU **not** measured | Intel UHD Graphics 620 (same laptop, 1 GB shared) |
| CPU ladder | Node v24.11.1, `scene-budget-cpu.mjs` — typed arrays only |
| Browser tab | `http://127.0.0.1:8797/scene-budget.html` — no `.sav` parse, no 2 GB wasm standing |
| Corpus | Representative occupant counts from [representative-cases.md](representative-cases.md); saves were on disk and were not re-parsed |

wasm32 ~4 GB / ~2 GB standing on a 600k save is the **parse** wall. This probe’s scene is extra JS + GPU in a throwaway tab. Co-residence with a loaded 600k map was **not** measured (a 95 MB dummy buffer was allocated in the same WebGL context and succeeded).

## What was measured

Scratch-local WebGL2: unit boxes (24 verts, instanced) plus 8-sample belt polylines. `fat8` draws 8 boxes per occupant as a bound for richer silhouettes. Dummy 95 MB GPU buffer stands in for the 2D map’s rect stream (`webgl_layer.js` ~95 MB on the big save). No terrain. No Three.js.

Densities follow Representative cases plus Height-view cliffs: All stack 11, All pad 49, densest 8 m cell 198, solo PowerStorage 56 m 452, synthetic ordinary 56 m 800, medium 2,500, Height-view isolation 14,000, heavy 50,000, foundation slab 150,000.

Pass 1 (vsync `requestAnimationFrame`, 90 frames) only proved the compositor stayed at ~16.7 ms. `gl.finish()` on ANGLE was a no-op (~0 ms at 150k). The numbers below are **draw + `readPixels(1×1)`**, 30 frames, instanced.

### GPU-sync (readPixels stall, MX110)

| Case | Occupants | Boxes | GPU MB | p50 ms | p95 ms | max ms | Verdict |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| ordinary-56m | 800 | 640+160 splines | 0.05 | 3.4 | 13.4 | 25.7 | ok (warmup; first case) |
| medium-region | 2,500 | 2,000+500 | 0.16 | 1.9 | 4.2 | 6.9 | ok |
| medium-region fat8 | 2,500 | 16,000 | 0.74 | 2.7 | 5.6 | 14.5 | ok |
| height-view-14k | 14,000 | 11,000+3,000 | 0.90 | 2.5 | 5.8 | 6.5 | ok |
| height-view-14k fat8 | 14,000 | 88,000 | 4.13 | 9.8 | 13 | 16.5 | ok |
| heavy-50k | 50,000 | 40,000+10,000 | 3.13 | 4.5 | 6.9 | 10.1 | ok |
| foundation-150k | 150,000 | 150,000 | 6.29 | 13.9 | 18 | 23.8 | **tight** |

Raw: [scene-budget-gpu-sync.json](scene-budget-gpu-sync.json). Vsync pass (not headroom): [scene-budget-gpu-pass1.json](scene-budget-gpu-pass1.json).

### Construction, hold, teardown

Instanced typed-array **construction** (Node and browser): 1–20 ms through 150k. Expanded (non-instanced) 50k: **109 ms** construct, **29 MB** GPU, **+31 MB** JS heap. Instanced 150k GPU buffers: **6.3 MB**. CPU array bytes at 150k: 4.8 MB.

GPU `deleteBuffer` teardown: **0–1.1 ms**. JS heap did not reliably drop without GC.

Pass-1 vsync orbit stayed at ~60 FPS through 150k instanced and 50k expanded on this MX110 tab (vsync-capped; not used as the budget). Expanded 150k was not drawn.

CPU ladder: [scene-budget-cpu.json](scene-budget-cpu.json).

## Draft budgets

Unit is **occupant count** of the delimited XY+Z (today’s occupancy), not metres of rectangle.

| Draft | Occupants | Why |
| --- | ---: | --- |
| Ordinary regions | 50–800 | Representative 56 m windows. Cheap on this GPU. |
| Comfortable (boxes) | ≤ 14,000 | Height-view isolation size; ~3 ms mean, 5.8 ms p95. |
| Comfortable (8× fatter proxies) | ≤ 14,000 | fat8 p95 13 ms, max 16.5 ms — last measured fat density under 16.7 ms vsync. |
| Conservative refuse | **> 8,000** | Half of that fat8-ok density. Leaves room for Intel iGPU, a live 2D map draw, and wasm co-residence, none of which were in this tab. |
| MX110 fat8 ceiling (alternative) | **> 14,000** | Measured. Do not pick this without an iGPU pass. |
| Tight on MX110 boxes | 150,000 | p95 18 ms. Not a ship target: fat8 unmeasured, iGPU unmeasured. |

**GPU megabytes are not the limiter** on the MX110 (6.3 MB at 150k instanced; 29 MB expanded 50k; 95 MB dummy allocated). Frame time is. wasm standing ~2 GB is unchanged; the regional scene must stay a small typed-array sample of the region, never a second world buffer.

## Draft refusal rule

Already decided: an oversized region is refused; the user is asked to shrink it; the 2D map stays; no LOD; no automatic degradation.

From these measurements, implement the check as:

1. Count occupants of the committed volume (same set Height view already collects).
2. If count **> 8,000** (or **> 14,000** if Anto takes the MX110 fat8 ceiling), **do not build the scene**.
3. Tell the user the area is too dense / too large and to shrink the rectangle (or the Z band). Stay on the 2D map.
4. Do not start a degraded scene. Do not drop to desktop. Do not draw a cheaper rest-of-save.

Ordinary 56 m factories in the corpus (49–452, synthetic mix 800) are far under 8,000. The product stays one browser frontend. A megabase isolation of 50k–150k is the thing that is refused, not the ordinary region.

## What this does not close

- Intel UHD 620 (same machine, unmeasured). If that GPU is slower, 8,000 may still be high — Anto can cut further after an iGPU pass, still as a smaller region budget.
- A tab that already holds a 600k wasm parse (~2 GB) plus the live 2D map **drawn**, not a dummy buffer.
- Honest proxy kits (Renderer probe / Proxy catalog). fat8 is a geometry-weight bound, not a silhouette.
- Product library (WebGL2 vs Three.js) — ticket 18.
- Publishing FPS in chrome. These numbers are evidence for the refuse threshold, not a HUD.

## Harness

- [../prototype/scene-budget.html](../prototype/scene-budget.html) — open `?syncOnly=1` for the readPixels cliff pass.
- [../prototype/scene-budget-cpu.mjs](../prototype/scene-budget-cpu.mjs) — `node` typed-array ladder.
