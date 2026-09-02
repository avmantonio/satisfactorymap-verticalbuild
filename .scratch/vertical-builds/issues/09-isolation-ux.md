# Isolation UX

Type: grilling
Status: resolved
Strand: volume-selection — Volume selection
Blocked by: 01

## Question

How does the player *get* the intended Build, once we know what a Build is?

Today: right-click-drag a rectangle, altitude slider as a gate, then Copy. Drawing a Cut (section plane) is the metaphor that fails — you cannot tell which plane is the right one from the 2D silhouette.

Given ticket 01’s answer, pick the isolation gesture:

1. **Rectangle + altitude window** — same as now, but the window is first-class (snap to floors, peel occlusion) so the set matches what you *see*.
2. **Volume draw** — drag a 3D box (or 2.5D prism): XY on the map, Z with a handle.
3. **Flood from a seed** — click a foundation or machine; grow to connected buildings / same-Z platforms; trim.
4. **Named recall** — isolation is picking a saved Build, not drawing.

Recommend: **1 now**, **3 later** (still in this spec as a follow-on, not fog, if 01 is a spatial volume). Volume-draw is the 2.5D/3D chrome around 1. Named recall waits until a Build can persist (ticket 03).

The observation layer (2.5D vs 3D) changes how the set is *previewed*, not which gesture we pick first.

Fact from [Survey the current map](04-survey-the-current-map.md): hidden objects are not selected, so they are not copied (sign poles are the documented case). Isolation that only sees the 2D silhouette will keep dropping those children unless the gesture includes hidden occupants of the volume. Power lines copy only when both endpoint owners are in the set.

## Answer

Draw an XY rectangle on the map; then pick the Z extent on the A–A′ Cut of that rectangle. The Build is that XY plus that Z window.

Not flood, not a 3D prism handle, not named recall as the first gesture. The Cut is both how you *see* Z ([Meaning of 2.5D](06-meaning-of-2-5d.md)) and how you *choose* Z. Hidden occupants of the volume remain a known hole (today’s selection skips them).
