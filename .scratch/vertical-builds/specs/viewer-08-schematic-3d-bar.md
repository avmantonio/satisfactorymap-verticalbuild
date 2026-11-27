# Later schematic editor bar

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [08 — Schematic 3D bar](../issues/08-schematic-3d-bar.md)
Scope: Later editor horizon; excluded from the first regional viewer.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

A pioneer needs the later editor-shaped 3D goal to remain distinct from the regional read-only delivery.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to see the later 3D editor goal kept explicit, so that the regional viewer does not accidentally acquire gizmos or a whole-save scene.

2. As a pioneer, I want to keep the same save editor and Build vocabulary, so that future observation work remains one product.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

Schematic 3D is a **tool-dock mode** in the **same viewport** (Leaflet hidden while on): **lookalike** proxies, **orbit**, **filtered save**, gizmos **XYZ+rotate**, **one Z window**, cheaper **rest-of-save** still visible; **one product, two render ceilings**.

It is this campaign’s later observation of the same editor, after Height view — not a fork, not the first ship, not a constructor, not `assets/03`. Official glTF / Coffee Stain meshes stay out of git. How the scene attaches (WebGL2 vs vanilla Three.js, typed-array diet, picking) is [3D scene adapter](../issues/18-3d-scene-adapter.md).

**Enter.** A **tool dock** button, not Height-view observation chrome and not a second HTML. The 3D view occupies the map pane. It opens on the **layer- and altitude-filtered save**; isolating a Build is not the toll. Isolation in 3D is the **same rectangle gesture**, then the **shared Z window**. Gizmos act on **Selection**, as today.

**Camera.** **Orbit** (not WASD fly, not a 2.5D tilt). **Nav cube** with view shortcuts (top / front / side). Pivot: **current selection**; if none, **midpoint of the area in view**.

**Shapes.** **Lookalike kit** in this bar (not flat category boxes). Later, proxies may move closer to real meshes (local extract, never in git). `UnknownProxy` for unmapped `typePath`s stays fog.

**Filters.** Today’s **layer filters**, synced with the 2D session.

**Interiors.** A **toggle** (“see interiors”), **on** when entering 3D. Walls, roofs, decorative, and **foundations** drop opacity; production, logistics, and power stay solid. Not a second filter list.

**Z and Cut.** **One Z window**: 3D clip and Cut band are the same start–end; the global altitude rail remains the cap. A–A′ / B–B′ **strips are optional** and **do not auto-open** in 3D; a control shows them. They edit that same window, not a second height.

**Edit.** **Move gizmos on XYZ and rotate** in this bar. The paste panel may remain for numbers / clipboard; 3D is not observation-only.

**Scene budget.** The bar is the **whole filtered factory**, not cube-only. **Rest of the save** (out of the cube / out of focus) stays **visible but cheaper**. **One schematic**, **two ceilings**: the browser’s 3D render cap is **lower** than desktop (clipboard-style), not a lite web SKU vs a full PC app. Exact numbers and LOD/chunk machinery are Runtime limits after 18.

**Out of this bar.** Terrain (optional later low-poly for world height, not blocking). WASD fly. In-world labels (`PROD-1` / `FAC-A`). Photorealistic meshes. Dual Leaflet+3D split-screen.

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Compare the first-viewer scope with tickets 24, 43, 44, 45, 51 and 60: no picking, gizmos, rest-of-save, two caps, or interior-opacity toggle is inherited from this horizon.
- Do not claim these later editor stories have runtime coverage or are ready to ship.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

All detailed interactions in this ticket describe the later bar. Its whole-filtered-save entry, selection pivot, nav cube, interior opacity, gizmos and separate render ceilings must not override the newer first-viewer contracts. No implementation readiness for the later edit cycle is claimed.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** none of this horizon's editor stories; retain only the separation of scope above.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

