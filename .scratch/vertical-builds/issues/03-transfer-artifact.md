# Transfer artifact

Type: grilling
Status: resolved
Strand: build-package — Build package
Blocked by:

## Question

This is **not** about the reference images. Those are already classified: `assets/01` is a capture of the current app; `02`/`03`/`04` are product concepts (`03` out of scope).

This is about the **package that carries a Build from save A to save B**.

Today, Ctrl+C already copies selected objects into an in-memory / OS-clipboard package, and Ctrl+V pastes them after you load another save. There is no file on disk you can keep or send to someone.

When the player has isolated a Build (the XY+Z volume), how should that package exist?

1. **Clipboard only** — keep Ctrl+C / Ctrl+V as the transfer pipe. Observation/isolation is the missing piece; do not add export-to-file.
2. **Named file only** — export/import a Build file (shareable, archivable). Clipboard is not the product path.
3. **Both** — Ctrl+C/V for the same session or same machine; a file when they want to keep or share the Build.

Recommend: **both**, using the existing clipboard package as v1 of the file. Do not invent a new object model; the editor splices save bytes.

Caps confirmed by [Survey the current map](04-survey-the-current-map.md): blob is JSON + zstd/base64 v2, version-locked to the save; browser 50k / 150k / 200 MB; desktop native slots, uncapped. Hidden children (e.g. sign poles) are not in the selection, so they never enter the blob. That is an isolation hole, not a reason to invent a new format.

## Answer

Both: the existing clipboard package for in-session Ctrl+C/V, and a named file for keep/share. Same payload; the file is that package with a name. Not a new object model, not the game’s blueprint.
