# Satisfactory Save Map

Client-side Satisfactory save viewer/editor. A `.sav` is parsed on-device
(Rust `sav_core` → WASM worker in the browser, or native Tauri on desktop).
Nothing is uploaded. Production: [satisfactorymap.net](https://satisfactorymap.net/).
License is AGPL-3.0; the name, logo, and domain are *not* licensed with the
code. Game-derived tables/icons/map art belong to Coffee Stain and are not
in git.

Build, layout, tests, and data extraction: [CONTRIBUTING.md](CONTRIBUTING.md).
Parser design: [rust_parser/README.md](rust_parser/README.md). Generated vs
curated data: [game_data/README.md](game_data/README.md).

## Invariants

- **Private by construction.** The save never leaves the machine. `?url=`
  fetches a hosted `.sav` straight into the browser (CORS on the host), never
  through this site's servers.
- **No generated data in git.** `game_data/generated/`, `map/static/map/icons/`,
  `dist/`, `*.sav` are gitignored. `sav_core` `include_str!`s the tables, so
  the crate does not compile until you unpack `game_data.zip` (CI uses
  **game-data-v3**) or run `game_data/extract_all.py`. Edit `game_data/curated/`
  by hand; never commit extractor output.
- **`sav_core` is the engine.** `sav_wasm` and `sav_tauri` are thin parallel
  shells over the same session API. Change one binding, change the other.
- **Mapdata is a behavioral port.** Python dict-order, `py_hypot`, banker's
  rounding, absence-vs-null-vs-0 are deliberate. Do not "simplify" without a
  payload gate. Payload diet already landed (floats to 2 decimals, client
  derives `worldPositions`, id prefixes stripped in `save_client.js`).
- **Editor is byte-splice + re-parse.** Edits mutate the retained decompressed
  body; the parser re-validates after every op. Undo replays from the pristine
  body (`fromPristine=true`), not inverse ops. Conveyor-chain delete is a
  documented trick — read [docs/chained-belt-delete.md](docs/chained-belt-delete.md)
  before touching it.
- **wasm32 is 4 GB.** Standing memory after lean parse + model drop is ~2 GB
  on a 600k-object save. Native/Tauri has no cap (`usize` is 64-bit; the
  decompress guard is `#[cfg(target_pointer_width = "32")]`).
- **Vanilla JS, no bundler.** Scripts load in `index.html` order. Chrome
  reuses `ui.js` / `ui.css`; tokens live in `map.css`. Load `ui.css` *before*
  `map.css`. Do not restyle a feature's own buttons/rows/dialogs.

## Frontend modules (`map/static/map/`)

| File | Role |
| --- | --- |
| `save_client.js` + `worker.js` | Transport facade. Same API on WASM and `window.__TAURI__`. |
| `data.js` | Load/drop/progress UI. Save never leaves the tab. |
| `map.js` + `webgl_layer.js` | Bucket renderer. WebGL2 default; canvas fallback on context loss. Coords are `map_highres.png` pixels via `L.CRS.Simple` (`lat=py`, `lng=px`). `z` is always last in the stride. |
| `filters.js` | Sidebar → bucket `.visible` flags. No re-fetch on toggle. |
| `editor.js` | Move/copy/paste/rotate/delete + undo. Projection constants must stay in lockstep with `mapdata/geometry.rs`. |
| `ui.js` / `ui.css` | Shared primitives. Features supply content, not chrome. |
| `network.js` + `emst.js` | Shortest-link network finder. |

Script order is a silent perf cliff — do not reorder without measuring.
Dock-open map-anchor attempts were tried and reverted; leave
`panels.js` on `invalidateSize()` ([docs/dock-map-anchoring.md](docs/dock-map-anchoring.md)).

## Verify

```
py tools/fetch_test_saves.py
cd rust_parser && cargo test -p sav_core --release
py tools/build_site.py && py tools/serve_site.py   # dist/ at :8791
py tools/ui_behaviour.py --serve
py tools/ui_classes.py                             # after CSS class renames
```

Frontend has no unit tests; `ui_shots.py` / `ui_behaviour.py` / `ui_classes.py`
are the chrome guards. Every push to `main` auto-deploys via Cloudflare Pages.

## Pointers

- [docs/tauri-desktop-app.md](docs/tauri-desktop-app.md) — native shell, same `dist/`.
- [docs/streaming-payload-builder.md](docs/streaming-payload-builder.md) — lean parse, no full-model peak.
- [docs/server-fetch.md](docs/server-fetch.md) — dedicated-server HTTPS API, TCP 7777.
- [docs/code-review-2026-07.md](docs/code-review-2026-07.md) — remaining Medium/Low findings.
- [game_data/SCHEMA.md](game_data/SCHEMA.md) — generated docs JSON shapes.
- [TODO.md](TODO.md) — product backlog (filter icons, hidden-object copy, consumable pins, foundation search).
