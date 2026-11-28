# UI behaviour: daily guard and opt-in diagnostics

`tools/ui_behaviour.py` is the runner, not a catalogue of every UI option.
The default is **shell + 3d**. Each group has a fresh browser context and
reloads the save so injected failures, edits and resets cannot leak across groups.
All groups run against `dist/`; rebuild before attributing failures to source.

```sh
py tools/build_site.py --skip-wasm  # reuse an existing WASM build
py tools/ui_behaviour.py --serve
py tools/ui_behaviour.py --serve --suite 3d
py tools/ui_behaviour.py --serve --suite hooks renderer
py tools/ui_behaviour.py --serve --suite stress
py tools/ui_behaviour.py --serve --suite all
```

Omit `--serve` when a server is already running. `--port`, `--headed` and
`--save` remain available. Regional groups require the known layout of
`solo_autosave_1.sav`; they do not silently pick another arbitrary factory.

## Groups and ownership

| Group | File under `tools/` | Purpose / when to run |
| --- | --- | --- |
| `shell` | `ui_behaviour_shell.py` | Empty state, dialogs, Escape, search and dock geometry. Shell/layout changes. |
| `3d` | `ui_regional_smoke.py` | Small real-control journey: enter and submit WebGL geometry, orbit, shared filters, altitude section/reset, safe return, cancellation/late reply and failure/retry. Daily guard. |
| `hooks` | `ui_regional_hooks.py` | Session stamps, cancellation precedence, healthy edit refusal and shared visibility authority. SaveClient/filter integration changes. |
| `renderer` | `ui_regional_renderer.py` | Synthetic geometry/forms, nonzero world-Z, clipping, camera bounds, allocation reuse and disposal. Renderer/recipe changes. |
| `stress` | `ui_regional_stress.py` | Extended real-save integration: placement gates, selection versus membership, edit/undo, empty states, races, context loss, reset and 20 repeated visits. Lifecycle/transport changes or a deliberate extended check. |

`stress` is intentionally broader than a pure benchmark: it preserves the
previous extended acceptance checks without making every daily run pay for them.
It still contains legacy large JavaScript evaluations. Extracted does **not**
mean those internals have all been redesigned.

The existing CI command now runs the daily guard. Specialized groups remain
explicit commands; they are not automatically scheduled by this change.

## Old-to-new guarantee map

No existing assertion was discarded in the extraction:

- Original empty-state through search checks → `shell`.
- Original HEC-05/06/07 hook block → `hooks`.
- Original detached HEC-08/09 renderer kit → `renderer`.
- Original C-015/C-016 product visit and repeated visits → `stress`.
- Global uncaught/console error guard → runner, checked independently per group.

The new `3d` group adds actual button/keyboard interactions rather than
calling `RegionalViewer.enter/exit` as its main interaction. It observes
WebGL draw submissions as well as semantic state: `inspect().drawn` alone
cannot prove that the renderer ever issued a draw call. This is not a pixel
oracle for correct shapes, lighting or placement.

## Audit evidence and limits

The old suite passed after rebuilding stale `dist/` assets. Two independent,
response-only mutations also passed that entire old suite:

1. Disconnect the Enter, Back and Cancel click handlers.
2. Remove the regional `renderer.render(scene, camera)` call.

No production files were mutated on disk. The new daily journey detected the
disconnected-handler mutation. The follow-up no-render mutation verification
was inconclusive due to a run timeout; do not claim executed mutation resistance
for that case merely from the new draw-submission assertion.

**Pointer regression found and fixed:** with a selected object,
`#selectionPanel` covered `#regionalViewerCancelBtn` while a query was pending.
Preparation now occupies the top region-actions slot, with idle actions hidden
until preparation finishes. The daily cancellation scenario uses a real pointer
click with the selection still present, protecting against that obstruction.

The stress group records heap/WASM samples but does not assert a bounded memory
trend. Its resource counters detect tracked resource leaks, not all possible
retained JS/WASM allocations. Twenty samples are not a memory-leak verdict.

## Keep the daily guard small

- Add a daily scenario only for a distinct, important user-visible failure.
- Prefer a representative interaction over a matrix of every option.
- Put coordinate/geometry boundaries in `renderer`, session races in `hooks`,
  and repeated or destructive integration sequences in `stress`.
- Use app APIs for fixture setup and observation; use real controls for the
  interaction being protected. Do not replace blocked clicks with forced clicks.
- Keep diagnostics callable on their own. A failure must name its group;
  a group must not depend on another group having run first.
- Moving a check out of the daily guard is not deleting its guarantee. If a
  specialized check is later removed, identify its surviving protection first.
