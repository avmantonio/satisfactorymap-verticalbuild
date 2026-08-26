# Height view chrome

Type: grilling
Status: resolved
Strand: height-view — Height view
Blocked by: 11

## Question

After [2.5D loop prototype](11-2-5d-loop-prototype.md), how does Height view attach to the *real* map chrome (`ui.js` / `map.css`, existing altitude panel)?

The prototype is throwaway. This ticket is production chrome — layout, gesture, and whether two Z widgets exist:

1. **Replace the altitude panel while isolating** — drawing a rectangle opens A–A′ / B–B′; the shared Z window *is* the altitude control for that isolation. The global slider hides or disables until the rectangle is cleared.
2. **Alongside** — altitude filter stays as a view gate; Height view is a second Z control that only sets the Build’s Z extent. Two Z widgets on screen.
3. **Sequential peel** — use the altitude slider first (optional), then rectangle, then Cut strips to pick the Build Z. Two steps, two widgets.

Also decide: strip dock (under the map vs overlay vs side), Z-window gesture (drag a band vs two handles vs click-min/click-max), and when strips appear (on rectangle complete vs a mode button). Empty volume (zero occupants after Z) is a chrome state, not a new product.

Recommend: **2**, strips docked under the map, band-drag for the shared Z window, strips appear when the rectangle is complete. Isolation already said rectangle then Z on the Cut; the altitude slider is already a view gate ([Survey the current map](04-survey-the-current-map.md)). Conflating them (option 1) makes “what I see” and “what I take” the same control — the hole this campaign is closing.

How each occupant is *drawn* on the Cut is [Cut elevation marks](19-cut-elevation-marks.md) (resolved): WebGL projection, SVG laterals, reversible A↔A′ / B↔B′. This ticket owns the **flip control** and dock; 19 owns that the projection is flippable.

## Answer

Altitude rail caps map and occupancy; the Cut start–end band peels Build Z inside that cap. No rectangle → no Cut. L-frame overlay on the map viewport with a session switch to flaps; independent A↔A′ / B↔B′ via end labels; empty strips stay.

Two Z instruments stay on screen. `#altitudePanel` / `MapApp.altitudeRange` is the **authority cap**: map drawing and `collectInBox` still respect it (today’s gate). The Height-view control is **not** a second slider — it is the **shared start–end band** on the Cut graph (A–A′ and B–B′), two handles plus dragging the band body, same muscle memory as the altitude fill. That band peels Build Z **inside** the global cap. [Volume occupancy](12-volume-occupancy.md)’s “Z window is the altitude gate” means this peel, not permission to ignore the global slider.

No committed XY rectangle → no Cut chrome. Right-drag complete opens the strips; clearing the rectangle removes them. No Height-view mode button. Ctrl+click / Ctrl+A without a rectangle do not open the Cut.

**Layout.** Default is **L-frame overlay** in `#mapOverlays` (map size unchanged; no steal-layout, no re-anchor). A along the visible map’s bottom edge, B along the right, inset so they do not sit under the filter dock or `#toolDock` / altitude rail. Strip depth ~160 px, not scaled to the rectangle. Leaflet zoom/attribution get an extra inset while the frame is up. A control on the Height-view chrome (not the tool dock, not filters) switches **L-frame ↔ flaps** for the session; a new rectangle does not reset that preference. No `localStorage` in the first ship. Stacked strips stay out.

**Flaps.** Overlay on the box: length follows that rectangle side in screen space; depth fixed (~120–160 px); minimum length so a tiny box stays usable.

**Flip (this ticket).** Each strip is independent. The end labels `A` / `A′` and `B` / `B′` **are** the control — click swaps that strip’s ends and depth. No extra flip icon. New rectangle resets to A→A′ / B→B′ ([Cut elevation marks](19-cut-elevation-marks.md) default). Labels need accessible names; tokens stay `ui.js` / `map.css`.

**Empty volume** is a chrome state: strips remain, band still peels, existing empty-selection actions. Do not dismiss Height view at zero occupants.

**Global after commit.** Narrowing the global clamps the band into that range and drops occupants outside it. Widening may add XY occupants that fall in global ∩ band; Cut **domain** may grow (19 pad); the **band does not auto-expand**. Resize XY still does not reset Z ([2.5D loop prototype](11-2-5d-loop-prototype.md)). If the cap leaves no occupants, strips stay. Outside the global cap is **undrawn** on the Cut (not faded, not yellow). Inside XY, inside global, outside the band: still faded per 19.

One-axis rectangle edit from 11 stays: map edge or matching Cut vertical. Production chrome does not restyle unrelated dock widgets.
