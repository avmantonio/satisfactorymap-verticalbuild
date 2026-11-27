# Renderer probe — measured notes

Throwaway. Ticket: [Renderer probe](../issues/18-3d-scene-adapter.md).
Does not reopen Baseline gate, proxy-kit, or [Survey 3D fork options](../issues/17-survey-3d-fork-options.md).
Does not set scene budgets (sibling Cost probe).

## Run

```
python .scratch/vertical-builds/prototype/renderer-probe-serve.py
```

Open http://127.0.0.1:8792/renderer-probe.html

The server copies production COOP/COEP (`tools/serve_site.py` / Cloudflare `_headers`). `--no-coep` is only for contrast.

## What ran

| Host | Result |
| --- | --- |
| Local server `127.0.0.1:8792` with COEP `require-corp` | Both panes drew. `crossOriginIsolated === true`. |
| Hosted-browser assumption | Same COOP/COEP as Cloudflare Pages. Not deployed to satisfactorymap.net (scratch). Script-loading environment matches. |
| `file://` | Browser automation cannot open it. Product already requires `serve_site.py` for wasm. ES module Three.js is not a double-click path. |
| Tauri / desktop shell | Not rebuilt. Evidence from the existing shell: `tauri.conf.json` `frontendDist` is `../../dist` (byte-identical frontend); `save_client.js` switches transport on `window.__TAURI__`; CSP is `script-src 'self'`. WebView2 is Chromium: WebGL2 + `type="module"` work. A CDN `<script>` does not. |

## Scene

25 boxes from one `Float32Array` of offsets/scales/colors. Shared orbit. Zero Object3D-per-actor. No gizmos, no terrain, no save payload, no second object tree.

## Measurements (2026-11-23, NVIDIA GeForce MX110, ANGLE D3D11)

| | WebGL2 sibling (perspective + `drawArraysInstanced`) | Three.js r170 `InstancedMesh` |
| --- | --- | --- |
| Drew the scene | yes | yes |
| Load | none (inline) | `./vendor/three.module.min.js` **691 648 bytes**, `type="module"` |
| ms / frame (first 60, this tiny scene) | 3.63 then 3.83 | 1.67 |
| CDN `cdn.jsdelivr.net` under COEP | n/a | **loaded** — jsdelivr sends `Cross-Origin-Resource-Policy: cross-origin` |

The 25-instance frame times are not a region budget. They only show both paths are cheap at probe scale.

## Recommendation

**Vanilla Three.js, vendored same-origin as an ES module, shared by browser and Tauri.** Do not extend `map/static/map/webgl_layer.js` into the 3D viewport. Do not start a desktop-only engine. Do not use R3F or a bundler.

The current WebGL2 layer is a Leaflet 2D overlay: map-pixel affine `project(vec2)`, `z` is altitude filter + depth ordinal, not a camera. It **avoided** GPU instancing because SwiftShader paid ~5–7 µs per instance (465k rects → ~2.5 s/frame). A regional orbit view needs perspective, a look-at camera, and instanced proxies. The left pane of this probe is that sibling program — it works, and it reused **zero** shaders from `webgl_layer.js`. Choosing “extend the current layer” means writing a second mini-engine next to the map. Three.js already has `PerspectiveCamera` + `InstancedMesh`; this probe fed it from the same typed arrays with one dummy `Object3D`.

CDN Three.js is not the product load path even though jsdelivr currently survives COEP. Tauri CSP is `script-src 'self'`. The app already vendors Leaflet and PostHog for the same class of reason (`analytics.js`). Pin a MIT copy under `map/static/map/vendor/` when this leaves scratch — not this throwaway file.

## Known limits

- **wasm32 standing ~2 GB** is the parser heap. Three.js parse is JS (~0.7 MB min). A second full JS object tree of the save still will not fit; keep instanced typed arrays (survey already said this).
- **`type="module"` seam** next to today’s IIFE scripts. Import map or a single module that publishes `window.MapApp…`. No bundler.
- **Map layer stays WebGL2 2D.** Two canvases / two pipelines. Do not hijack the Leaflet GL context for orbit.
- **Z-up** (save meters) is a later mapping. This probe used Three’s Y-up. Not a library fork.
- **Picking, gizmos, terrain, whole-save, belts as tubes** are out of this probe. GPU id-buffer picking remains the survey option.
- **SwiftShader instancing tax** is still real on the 2D map; a 3D regional set is a different size. Cost probe owns the budget, not this ticket.
- **OrbitControls / addons** were not loaded. A few dozen lines of orbit were enough. If an addon is used later, vendor it too.
- HITL: Anto accepted (2026-11-23). Ticket resolved. Do not extend `webgl_layer.js`; CDN is not the product path.

## Product attach (when accepted)

One vendored `three.module.min.js` in `dist/` (copied from `map/static/map/vendor/` by `build_site.py`, same as Leaflet). One `type="module"` adapter. Same bytes in Cloudflare Pages and the Tauri webview. No second frontend.
