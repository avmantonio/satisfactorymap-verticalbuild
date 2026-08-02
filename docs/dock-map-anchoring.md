# Keeping the map still when a dock opens — two failed attempts

## The problem

The docks are columns of the app-shell grid, so opening one changes the map's
box. Leaflet's `invalidateSize()` preserves the map's **centre**, which is the
wrong invariant when the box changes from one side: opening the ~280px layers
dock moves the map's left edge right by 280 *and* shrinks its width by 280, and
holding the centre still splits the difference. Measured drift of a fixed world
point, in viewport pixels:

| Action | Drift |
| --- | --- |
| Show/hide the layers dock | ±141 px |
| Open/close a tool dock | ±161 px |

This is real and worth fixing. Two attempts were made and **both were
reverted**; `panels.js` is back to a plain `invalidateSize()` in a
rAF-coalesced ResizeObserver.

## Attempt 1 — compensate inside the ResizeObserver

Pin the world point at viewport (0, 0), call
`invalidateSize({pan: false, animate: false})`, measure where that point ended
up, `panBy` the difference. Done synchronously in the observer, which runs
after layout and before paint.

Geometrically correct — before/after drift went to 0 px. But the map still
visibly moved, because the object canvases are positioned relative to Leaflet's
map pane and repaint on the *next* frame via `_requestReset`'s rAF coalescing.
Re-anchoring the pane in one frame while the canvases catch up in the next
leaves a frame where every object is drawn offset from the tiles beneath it.

## Attempt 2 — make the whole transition atomic

Route every chrome mutation through a `withMapAnchored(mutate)` helper so the
resize, the compensation and a forced synchronous canvas repaint
(`MapApp.layer.resetNow()`, added to `map.js`) all happen in one task, and add
an idempotence guard so the helper and the ResizeObserver could not both
correct the same resize.

Reported as **worse than either the bug or attempt 1**. Two likely reasons,
neither of which the tests could see:

1. `resetNow()` forces a full synchronous redraw of every bucket in the click
   handler. On a large save, with hardware acceleration off, that is a
   main-thread stall where there used to be a coalesced repaint one frame
   later. Trading a visual glitch for a freeze is a bad trade.
2. The drag path called it on every `pointermove`, i.e. a full redraw per
   pointer event.

## Why the tests said it was fine

`tools/ui_behaviour.py` sampled `requestAnimationFrame` geometry in **headless**
Chrome against a small save. That measures whether the numbers line up. It does
not measure:

- how long the main thread is blocked (the actual regression in attempt 2),
- what is really painted, as opposed to what the DOM says between frames,
- software rendering, which is how the app runs on at least one real machine.

The lesson is not "add more geometry assertions". It is that this specific
problem cannot be validated headlessly: it needs a headed browser, a large
save, and a measurement of frame timing rather than element positions.

## Resolution — don't resize the map at all

There was no third attempt at compensating. The docks were changed to **overlay
the map** instead of taking grid columns: they are `position: fixed` against the
window's edges, and `#map` fills everything below the app bar at all times.

The map's box is now a function of the window alone, so a dock opening, closing
or being dragged never resizes it, Leaflet is never asked to re-fit it, and
there is nothing to re-centre. The bug is gone by construction rather than by
correction — no compensation code, no forced repaint, no extra work per toggle.

The docks still read as attached: flush to the edge, square, full height, one
border, opaque. What changed is only what is *behind* them.

Costs, accepted:

- A sliver of the world sits behind each dock. Panning reaches it, and closing
  the docks reveals it with no movement at all.
- `#mapOverlays` (the layer holding the hint bars, the selection bar, the
  active-filter banner) insets by `--dock-left-inset` / `--dock-right-inset` so
  those still centre on the *visible* map rather than the full one. Those two
  custom properties, and `body.has-rail` (set by altitude.js), exist only
  because the layout no longer derives the dock widths from content.
- Leaflet's own controls live inside `#map`, so `.leaflet-left` / `.leaflet-right`
  inset by the same values to stay clear of a dock.

`tools/ui_behaviour.py` now asserts the CAUSE rather than the symptom: across
five actions plus a width drag, sampled every animation frame, the map's
bounding box must not change and a pinned world point must not move.
