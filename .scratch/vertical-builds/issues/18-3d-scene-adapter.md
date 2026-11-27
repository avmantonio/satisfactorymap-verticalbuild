# Renderer probe
Level: theme
Kind: ticket
Parent: 74
Status: resolved

Asset: ../prototype/renderer-probe.html, ../prototype/renderer-probe-notes.md

## Question

Which shared renderer can draw a small experimental scene in the hosted browser, on a local server, and in the desktop shell?

Candidates remain an extension of the current WebGL2 layer, or vanilla Three.js from a script tag. [Survey 3D fork options](17-survey-3d-fork-options.md) still stands: no R3F, no bundler, no Coffee Stain glTF in git, wasm32 standing memory is about 2 GB. Do not redo that survey. The output is a technical decision and its known limits, from the probe. No gizmos, no terrain, no whole-save scene, no second object tree.

## Answer

Browser and Tauri share one frontend, if the capacity tests pass. Do not start a desktop-only engine. The probe chose vendored vanilla Three.js. Decided 2026-11-23; do not re-grill.

## Findings

The 2D WebGL2 layer stays the Leaflet overlay. The regional scene is vanilla Three.js InstancedMesh from typed arrays (no Object3D per actor), vendored under `map/static` when it leaves scratch.

Prototype: [renderer-probe.html](../prototype/renderer-probe.html). Notes: [renderer-probe-notes.md](../prototype/renderer-probe-notes.md).

## Notes

Run: `python .scratch/vertical-builds/prototype/renderer-probe-serve.py` → http://127.0.0.1:8792/renderer-probe.html

Local COEP server: both panes drew; `crossOriginIsolated` true; Three r170 `InstancedMesh` from typed arrays (0 Object3D per actor); 691 648 byte module. jsdelivr CDN loaded under COEP (`CORP: cross-origin`) — still not the product path: Tauri CSP is `script-src 'self'`; vendor like Leaflet/PostHog. Desktop not rebuilt; shared `dist/` + that CSP is the shell evidence.
