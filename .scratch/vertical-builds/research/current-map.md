# Survey of the Current Map Architecture

This document surveys the architecture of `satisfactorymap` regarding altitude (`z`) handling, rendering, object selection, copy/paste mechanics, known editor holes, WASM memory bounds, and core architectural invariants.

---

## 1. Altitude (`z`) Storage, Filtering, Depth, and Camera

### Storage and Coordinates
- **Units & Stride**: In `sav_core`, world coordinates are stored as centimeters `(x, y, z)`. On the frontend, `(x, y)` are converted to `map_highres.png` pixels via Leaflet's `L.CRS.Simple` (`lat = py`, `lng = px`), while `z` is stored in **meters** (`z_cm / 100.0`) as the **last element** of each point or line stride (`stride - 1`) (`map/static/map/filters.js:405`).
- **Stride Layouts**:
  - Rects (buildings): Stride 4 `[x, y, yaw, z]` (`filters.js:383`).
  - Points (resource nodes, collectables, hard drives): Stride 3 `[x, y, z]`.
  - Lines (belts, pipes): Stride 3 `[x, y, z]` or Stride 7 `[x, y, z, arrivalTangentX, arrivalTangentY, leaveTangentX, leaveTangentY]` (`filters.js:405`).

### Altitude Filter UI & State
- **Scanning (`map/static/map/altitude.js`)**:
  - `computeAltitudeRange(payload)` (`altitude.js:76-106`) and `scanRange(points, stride, current)` (`altitude.js:67-74`) iterate all categories (buildings, resource nodes, collectables, hard drives, polylines, belts, pipes) to find global `min` and `max` altitude meters.
  - Driven by dual range inputs (`minSlider`, `maxSlider`) stacked on a shared track in `#altitudePanel` (`altitude.js:11-20`).
  - `Altitude.ensureRangeCovers(minZ, maxZ)` (`altitude.js:208-222`) automatically widens the altitude window when inspecting specific multi-level features (such as conveyor bottlenecks in `bottleneck.js`).
- **MapApp State (`map/static/map/map.js`)**:
  - `MapApp.altitudeRange = { min: -Infinity, max: Infinity }` (`map.js:2096-2099`).
  - `MapApp.setAltitudeRange(min, max)` sets `MapApp.altitudeRange` and triggers a layer redraw (`requestRedraw()`).

### WebGL2 Rendering & Depth (`map/static/map/webgl_layer.js`)
- **GPU Filtering**:
  - Uniform `u_altRange` is passed to all vertex shaders (`webgl_layer.js:134-145`).
  - Vertex shader rejects out-of-range instances by collapsing corners to an off-screen point (`gl_Position = CULLED`):
    - `RECT_VS` (`webgl_layer.js:199`): `if (a_pos.z < u_altRange.x || a_pos.z > u_altRange.y) gl_Position = CULLED;`
    - `LINE_VS` (`webgl_layer.js:290-291`): `if (a_zrange.x > u_altRange.y || a_zrange.y < u_altRange.x) gl_Position = CULLED;`
    - `CIRCLE_VS` (`webgl_layer.js:337-338`).
- **Altitude Quantization & Z-Sorting**:
  - `Z_SORT_BINS = 4096` (`webgl_layer.js:39`).
  - `_computeZRange()` (`webgl_layer.js:851-891`) measures the global altitude spread across rects and lines.
  - `_buildRectStream` (`webgl_layer.js:910-1131`) and `_buildLineStream` (`webgl_layer.js:1149-1282`) perform an $O(N)$ counting sort over `(quantizedZ, bucketOrdinal)`, pre-baking lowest-z-first instance streams so 0.55-alpha translucent fills blend correctly.
- **Depth Buffer & Deferred Outline Pass**:
  - Shader maps `z` to Normalized Device Coordinates: `gl_Position.z = clamp((a_pos.z - u_zRange.x) * u_zRange.y - 1.0, -1.0, 1.0)` (`webgl_layer.js:230, 313`).
  - Fills and lines record altitude in the depth buffer (`gl.depthMask(true)`).
  - Deferred outline pass (`webgl_layer.js:1726-1744`) re-draws rect outlines with `u_outlinePass = 1` and `gl.depthFunc(gl.GEQUAL)`. Borders only render where the building is the topmost object at that pixel, preventing lower floor outlines from bleeding through higher floors.

### Camera & Projection Confirmation
- **No 3D Camera / Isometric View / Three.js**:
  - The map renderer is strictly 2D orthographic top-down (`L.CRS.Simple`).
  - WebGL projection function (`webgl_layer.js:150-155`) projects 2D screen pixels to clip space:
    `vec4(screen.x / u_viewport.x * 2.0 - 1.0, 1.0 - screen.y / u_viewport.y * 2.0, 0.0, 1.0)`.
  - `z` is used **only** as a scalar filter gate and depth-buffer ordinal.
  - There is **no 3D camera matrix, no pitch/tilt, no isometric rotation**, and **no Three.js / WebGL 3D scene graph** anywhere in the codebase.

---

## 2. Object Selection (`map/static/map/selection.js`)

### Selection Gestures & Controls
- **Right-Click Drag Rectangle**:
  - Listens to `mousedown` button 2 (`selection.js:739-750`). `MIN_DRAG_PX = 4` (`selection.js:31`) distinguishes drags from context-menu clicks (`selection.js:614-625`).
  - Shows `#selectionRect` and converts client screen coordinates to map coordinates via `clientToMapXY` (`selection.js:120-123`).
- **Additive & Single Toggles**:
  - `Ctrl` / `Cmd` + Right-drag (`selection.js:744`): Additive box select (`selectingAdditive = true`).
  - `Ctrl` + Left-click: `SelectionTool.toggleAtEvent` (`selection.js:689-719`) uses `hitTest` to toggle individual objects in/out of the persistent `selected` Map (`"<bucket.key>#<index>" -> record`).
  - `Ctrl` + `A`: Selects all visible objects (`selection.js:793-819`). If `selectableObjectCount()` exceeds `SELECT_ALL_CONFIRM_THRESHOLD = 500000` (`selection.js:782, 809`), user confirmation is required.

### Filtering Rules (`collectInBox`, lines 127–183)
- Iterates `MapApp.layer.buckets`.
- Skips invisible buckets (`!bucket.visible`).
- Skips `bucket.excludeFromSelection` (e.g. vehicle pin duplicates vs box buckets).
- Skips hidden indices in buckets (`bucket.hiddenIndices`).
- Respects active altitude bounds: `altMin <= z <= altMax` (`selection.js:128-129`).

### Buildings vs Lines & Power-Line Riders
- **Buildings / Points**: Checked if point `(x, y, z)` falls within box coordinates `[minX..maxX, minY..maxY]` and altitude bounds.
- **Lines (Belts, Pipes, Railroads, Hypertubes, Vehicle Paths)**: `isSelectableLineBucket` (`selection.js:41-48`). Selected if **any** polyline vertex falls within the selection box and altitude filter (`selection.js:154-162`).
- **Power Line Riders**:
  - Power lines (`line:powerLines`) are selectable in the UI for visibility and single-wire deletion (`selection.js:36-39`).
  - In the Rust edit engine (`rust_parser/core/src/editor/apply.rs` `expand_duplicate_set` and move wire pass), power lines act as **riders** of their endpoint owners (buildings/power poles).
  - A power line moves or copies **only when both endpoint owners are selected**. A selected wire without both owners selected is dropped during duplicate/copy.

### Floating Panel & Edit Targets (`aggregate()`, lines 197–249)
- Aggregates selection into `editTargets`:
  - `actorNames`: Actor instance names.
  - `lightweight`: `LightweightBuildable` records (`parseLightweightId`, `selection.js:82-88`).
  - `skipped`: Uneditable objects (vehicles, creatures, collectables).
  - `bbox`: Bounds `{ minX, minY, maxX, maxY, minZ, maxZ }` (where `minZ`/`maxZ` are in altitude meters).
- Panel actions: "List objects" (`selection.js:833`), "Total inventory" (`SaveClient.selectionInventory`, `selection.js:846`), "Move", "Offset", "Copy", "Delete", "Clear".

### Highlight Overlay Rendering (`drawHighlight()`, lines 448–608)
- Transparent canvas attached to Leaflet's `overlayPane` (`selection.js:290-299`).
- `rebuildGroupCache()` (`selection.js:369-415`) bakes map-pixel path geometry into Path2D objects per bucket.
- Draws rotated building footprints or switches to fixed-size dots when small on screen (`MIN_HALF_SCREEN_PX = 2.5`, `selection.js:282`).
- If dots exceed `DOT_DEDUP_THRESHOLD = 20000` (`selection.js:283`), dots are deduplicated on a spatial grid cell (`selection.js:584-590`).

---

## 3. Copy / Paste Mechanics & Limits

### Blob Format & Version Locking (`rust_parser/core/src/editor/clipboard.rs`)
- `extract_clipboard_with_meta` (`clipboard.rs:113-280`) serializes selected actors and lightweight records into portable JSON (`ClipboardBlobV2`).
- Structure: JSON containing base64 zstd-compressed `h` (header) and `b` (body) byte blobs, plus metadata (`v: 2`, `anchor: [x,y,z]`, `anchorZ` meters, `bbox`, `actorCount`, `lightweightCount`, `extRefs`).
- **Version Locked**: `paste_refuses_version_mismatch` (`tests/editor_clipboard.rs:570-588`) enforces that cross-save pastes fail if save versions do not match.
- **Compression**: zstd compresses object bytes ~6-10x (`clipboard.rs:229`), keeping 100k-object blobs small.

### Browser Copy Tiers & Caps (`map/static/map/editor.js:509-544`)
- **`CROSS_TAB_MAX_OBJECTS = 50000`** (`editor.js:518`):
  - Copies above 50,000 objects are **not** written to the OS system clipboard (`navigator.clipboard.writeText`) to prevent system-wide freezes caused by clipboard history listeners.
  - The blob stays tab-held (`heldBlob`, `editor.js:571`), allowing cross-save paste within the same tab.
- **`COPY_MAX_OBJECTS = 150000`** (`editor.js:519`):
  - Copies above 150,000 objects are **refused outright** in the browser (`editor.js:534-543`).
- **200 MB Payload Limit**:
  - `editor.js:560`: If extracted JSON string length exceeds `200e6` bytes (200 MB), browser throws an error to prevent WASM heap exhaustion.

### Desktop (Tauri) vs Browser (`rust_parser/tauri/src/main.rs`)
- Desktop app (`window.__TAURI__`) is **exempt** from `COPY_MAX_OBJECTS` and `CROSS_TAB_MAX_OBJECTS` caps (`editor.js:534`).
- **Native Clipboard Slots**: `clipboard_slots` Map in Tauri `AppState` (`tauri/src/main.rs:32-37, 718`).
- Large blobs stay in Rust desktop memory slots; only a lightweight pointer JSON (`{"op": "pasteExternal", "slot": N, ...}`) passes through WebGL2/WebView2 to bypass string truncation and permission prompts (`tauri/src/main.rs:32-37, 362-370`).
- OS clipboard is accessed via `clipboard-win` crate (`tauri/src/main.rs:268-305`).

### Undo & Pristine Replay (`fromPristine`)
- Editor principle (`AGENTS.md:30-34`): The editor is **byte-splice + re-parse**.
- Edits mutate the decompressed body retained in worker memory (`map/static/map/worker.js:148`).
- Undo (`undo()` in `editor.js:416-424`) does **not** execute inverse edit operations. Instead, it replays the remaining edit history `actions[0..N-1]` from the **pristine save body** (`fromPristine = true`, `save_client.js:241, 458`).
- Guarantees exact byte validity and prevents operation drift.

---

## 4. Known Holes & Limitations

### 1. Hidden Object Copy Hole (`TODO.md:5`)
- *Hole*: "Hidden objects are not copied because they are not selected. Example: sign poles never show in copied buildings." (`TODO.md:5`).
- *Mechanism*: When selecting buildings, child components that are categorized into non-building buckets or hidden sub-objects (like `FGBuildableWidgetSign` poles or attached internal actors) are omitted from `selection.js` records. As a result, `EditorTool.copyTargets` never extracts them into the clipboard blob.

### 2. Chained Belt Move/Paste Limitation (`docs/chained-belt-delete.md`)
- *Mechanism*: In Satisfactory 1.0+, belts/lifts do not own items; items are owned by `FGConveyorChainActor` in a ring buffer.
- *Belt Deletion Trick*: Deleting a belt removes the belt and its `FGConveyorChainActor`, writing items back to pre-1.0 belt `InventoryItem` arrays so the game re-builds chain actors on next load (`docs/chained-belt-delete.md`).
- *Move / Paste Limit*: When a set of belts in a chain is **moved** (`startMove`) or **pasted** (`pasteExternal`), the edit engine updates belt spline coordinates, but **does NOT move or split the `FGConveyorChainActor`**. The chain actor's items and world-space spline references remain at the original coordinates, disconnecting chain rendering/item motion until re-chained in game.

---

## 5. WASM Memory Constraints & 3D Buffer Hard Walls

### Address Space Ceiling
- `wasm32` target has a hard 4 GB (`2^32` bytes) virtual address space cap (`AGENTS.md:35-37`).
- On a 600k-object save file (~100-200 MB compressed `.sav`), decompression produces ~2.5-3.0 GB of raw byte data.
- **Lean Parse**: `docs/streaming-payload-builder.md` describes the streaming parser, which drops the full save model post-parse to achieve ~2.0 GB standing memory in WASM heap (`AGENTS.md:35`).

### Hard Wall for 2.5D / 3D Buffers
- With ~2.0 GB standing memory on 600k-object saves, **only ~1.5 - 2.0 GB of WASM/JS memory remains** before hitting fatal `wasm32` Out-Of-Memory (OOM) panics.
- **Native Tauri**: Uses 64-bit architecture (`usize` is 64-bit), so memory is unconstrained (`AGENTS.md:36`).
- **Implications for 3D Layer**:
  - Any 2.5D or 3D visualization buffer must **not** duplicate save object trees or build heavy JS 3D mesh node structures.
  - Geometry for 3D must be stored in highly compressed, typed array buffers (e.g. GPU vertex buffers) similar to `webgl_layer.js`'s 32-byte rect instances (~95 MB total GPU buffer for 465k rects).

---

## 6. Core Project Invariants (`AGENTS.md`)

A 2.5D or 3D layer must strictly preserve the following workspace invariants:

1. **Vanilla JS, No Bundler**:
   - Scripts are loaded in strict `<script>` order in `map/static/map/index.html`.
   - No npm, Webpack, Vite, or Rollup bundler pipeline for the site (`AGENTS.md:38-40`).
2. **CSS Token & Hierarchy Invariant**:
   - `ui.js` / `ui.css` provide shared UI primitives; tokens live in `map.css`.
   - `ui.css` MUST load *before* `map.css` (`AGENTS.md:38-40`).
3. **Payload Diet & Engine Binding**:
   - `sav_core` is the engine (`sav_wasm` and `sav_tauri` are thin parallel shells).
   - Saved payloads must remain lean (floats rounded to 2 decimals, `worldPositions` derived client-side).
4. **Private by Construction**:
   - Save bytes stay local on device. No server uploads.
5. **Byte-Splice + Re-Parse Editor Model**:
   - Edits mutate decompressed body; undo replays from pristine body (`fromPristine = true`).
   - Any visual layer (2D or 3D) must remain a view layer over `save_client.js` / `EditorTool` state, rather than maintaining independent state.
