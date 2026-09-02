# Survey the current map

Type: research
Status: resolved
Strand: runtime-limits — Runtime limits
Blocked by:

## Question

What can this repo already do for altitude, selection, copy/paste across saves, and rendering — and where are the hard walls?

Need a findings note at `.scratch/vertical-builds/research/current-map.md`, citing files and line ranges, covering:

- How `z` is stored and used (`filters.js`, `webgl_layer.js`, `map.js`, `altitude.js`). Filter vs depth vs camera.
- How a selection is made (`selection.js`): rectangle, altitude, hidden objects, lines vs buildings, power-line riders.
- Copy/paste (`editor.js`, `save_client.js`, `worker.js`, Rust `extract_clipboard` / `pasteExternal`): blob shape, caps (`CROSS_TAB_MAX_OBJECTS`, `COPY_MAX_OBJECTS`, 200 MB), desktop vs browser, undo/pristine replay.
- Known holes already documented (`TODO.md` hidden-object copy; `docs/chained-belt-delete.md` if it affects a moved belt set).
- wasm32 ~4 GB standing memory after lean parse; native/Tauri unconstrained. What that implies for a second 3D buffer.
- Invariants from `AGENTS.md` that a 2.5D or 3D layer must not break (vanilla JS, no bundler, `ui.js`/`map.css`, payload diet).

Primary source is this repo. No peer-tool comparison here — that is [Survey peer tools](05-survey-peer-tools.md).

## Answer

The map uses a 2D orthographic WebGL2 bucket renderer with 1D altitude filtering/depth sorting, selection rectangle/toggles, zstd-compressed cross-save clipboard with browser caps (50k/150k/200MB) vs native slots, and pristine body replay; hard walls are wasm32 4GB memory (~2GB standing) and Vanilla JS no-bundler constraints.

Full survey findings are documented in [.scratch/vertical-builds/research/current-map.md](../research/current-map.md).
