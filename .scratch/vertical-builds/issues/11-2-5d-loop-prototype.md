# 2.5D loop prototype

Type: prototype
Status: specced
Strand: height-view — Height view
Blocked by: 10
Spec: .scratch/vertical-builds/specs/2-5d-first-cut.md

## Question

Throwaway UI that walks the MVP loop: draw an XY rectangle on the current map → show linked A–A′ and B–B′ Cuts of that rectangle → pick a Z window on either strip (same min/max) → the selected occupants are the Build.

This is not the shipping renderer. It exists so Anto can react to the gesture before the spec hardens. Use the current Leaflet map and fake or sampled Z from existing bucket altitudes. Do not invent belt splitting. Do not add a 3D camera.

Blocked on [Section plane](10-section-plane.md) (now resolved: both planes). Isolation contract: [Isolation UX](09-isolation-ux.md). Observation contract: [Meaning of 2.5D](06-meaning-of-2-5d.md).

## Prototype

Throwaway HTML (not the shipping renderer): [../prototype/2-5d-loop.html](../prototype/2-5d-loop.html)

Open in a browser. Right-drag a rectangle, then drag the Z band on either Cut. After the volume exists, drag one rectangle edge on the map or one Cut vertical (A or A′, B or B′) — one axis, opposite side stays. Occupants of XY + Z are the Build; belts stay whole actors (no split). Layout variants via `?variant=A|B|C`: A stacked cuts, B L-frame, C flaps on the box.

## Answer

The MVP loop is: draw the XY rectangle → linked A–A′ and B–B′ Cuts → one shared Z window on either strip → occupants of that volume are the Build. Not flood, not a 3D prism, not a camera.

Height-view chrome for the Cuts is **L-frame or flaps**, with a switch so the player can interchange them. Stacked strips (variant A) are not the first-ship default.

After the rectangle is committed, Z starts as the **full altitude span of the XY occupants**, then the player peels the window on a Cut. Resizing XY later does not reset that window.

The committed rectangle is still editable **one axis at a time**: drag one edge of the box on the map, or the matching vertical on that Cut (A vs A′, or B vs B′). The opposite side stays put. Corners and two-axis drags are out. Belts stay whole actors; no geometric split.

Prototype: [../prototype/2-5d-loop.html](../prototype/2-5d-loop.html). Production layout, dock, and altitude-filter vs Z-window live in [Height view chrome](13-height-view-chrome.md).
