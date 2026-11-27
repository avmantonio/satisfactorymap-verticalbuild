# Volume selection — first regional 3D viewer

Date: 2026-11-25
Status: consolidated settled decisions; integration is bound by the [global contract](viewer-integration-spec.md); implementation/runtime evidence remain pending.
Strand: volume-selection
Scope: the viewer-related portion of this strand, not closure of the entire campaign strand.
Package: [Main spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

The editor Selection is not a trustworthy visual inventory of a region: deselections and whole-actor copy rules differ from what the regional observer needs to draw.

## Solution

The entered region is the committed Height-view **XY rectangle ∩ Cut Z band ∩ global altitude rail cap**. It is not the map viewport or current Selection. Once entered, the loaded membership does not grow; expanding XY or Z requires a new enter.

This document consolidates the settled ticket decisions for this strand as decision-level input to the global integration contract. Per-ticket specs are preserved as supporting traceability; they are not the primary composition unit.

## User Stories

1. As a pioneer, I want to observe all occupants admitted by the committed volume, so that the current Selection does not decide what exists in the scene.

2. As a pioneer, I want to see in-region pieces of crossing paths, so that distant segments are not loaded.

3. As a pioneer, I want to change category visibility without admitting more actors, so that the visit and its budget remain bounded.

## Consolidated Contract

### Spatial authority

The entered region is the committed Height-view **XY rectangle ∩ Cut Z band ∩ global altitude rail cap**. It is not the map viewport or current Selection. Once entered, the loaded membership does not grow; expanding XY or Z requires a new enter.

Layer filters and hiddenIndices affect drawing among already-loaded occupants. They do not add/remove extract records and do not change admission count. Curated hiddenClasses remain excluded; the extract is not literally every physical actor in the save.

### Buildings and other occupants

Admit when the conservative occupant AABB intersects the isolation-volume AABB. Derive it from the known volume, actor orientation, actor scale and actor-local volumeOffsetM from the Regional viewer extract contract. Clearance is an approximate reserve, not a true hull.

For sizeKind unknown, use the origin as an **explicit approximation**. An unknown-size actor whose origin is outside may be missed even if its actual geometry crosses the boundary. Never fabricate dimensions to avoid acknowledging this limitation.

The same membership predicate must be used for admission count and extraction. Selection removal must not remove a spatially admitted visible actor from observation.

### Path actors

Admit a path when its approximate geometry intersects the volume, even when no original sample vertex lies inside. Clip its visual traces to the volume and generate intersection points. Do not retain distant vertices or reconstruct conveyor-chain internals. Multiple clipped fragments still represent one path actor for admission.

Power-line both-owner inclusion is a **copy rule**, not visual membership. Visual path clipping never changes the save.

### Existing edit/isolation rules remain separate

The 2.5D selection contract admits whole actors under its current vertex/altitude rules, with silent straddlers, layer exclusions and clipboard semantics. This viewer's conservative geometry inventory and clipped draw traces do not replace that edit set. No geometric belt split, weld or new chain-actor surgery is authorized.

## Interfaces with Other Strands

- **Consumes Height view:** a volume snapshot in the same coordinate/unit authority as the scene extract.
- **Consumes Regional viewer:** trustworthy pose, sizeKind, extents and local centre offset.
- **Provides Runtime limits and extraction:** one shared membership predicate and unique occupant identities.
- **Provides Visual presentation:** fixed membership and in-volume trace fragments; visibility changes stay a separate mask.
- **Preserves Save integrity:** clipped visual traces do not become edited/save geometry.

## Testing Decisions

Test records, visual relations and state transitions at the highest existing core/session or product UI seam that can observe them. The following are acceptance requirements, not reported test results.

- Exercise every acceptance clause of ticket 43 with rotated/scaled/off-centre boxes crossing boundaries and fully outside boxes.
- Include paths that cross with no in-volume original vertex, multiple fragments of one actor and paths outside the band.
- Compare count and extracted unique identities; toggle layer filters/hiddenIndices and verify membership is unchanged while hiddenClasses stay absent.
- Exercise unknown-size origin inclusion explicitly; verify Selection subtraction and whole-actor copy keep their independent meaning.

Implementation 60 must exist before integrated trials 54–56 can credit their results; stable delivery remains on gate 58.

## Global Integration Binding

The [global contract](viewer-integration-spec.md) and [wire v1](viewer-regional-wire-v1.md) now fix closed boundary contacts, invalid zero-XY/inverted regions, valid zero-Z slabs, success-empty disjoint Z, source-sample chord clipping and shared count/extract semantics. The global spec and integration map fix persistent delimitation and scoped existing altitude controls. The approved scale/Z rules below remain unchanged; no design gap in this section blocks implementation.

## Out of Scope and Later Work

This is the first regional read-only viewer's contribution from Volume selection. It does not specify or implement the later 3D edit cycle, require terrain, close pending acceptance checks or authorize publication. The older 2.5D spec and later editor bar retain their own scope. Do not mark the whole volume-selection strand or root campaign complete merely because this viewer slice is documented.

## Source Decisions and Preserved Supporting Work

The following source tickets are owned by this strand. Their Answers remain the decision record; detailed per-ticket documents are retained for traceability. Cross-strand dependencies are composed through the interfaces above.

| Source ticket | Preserved supporting document |
| --- | --- |
| [43 — Region occupants](../issues/43-region-occupants.md) | [Regional membership and clipping](viewer-43-region-occupants.md) |

See the [readiness review](viewer-readiness-review.md) for current code seams, available inputs, evidence limitations and integration definitions shared across strands.


## Approved clarification — 2026-11-26

Unknown scale takes precedence over every volumetric approximation, including a named box, clearance reserve or available simplified model. For an occupant whose scale cannot be read, admit by the save origin as an explicit approximation and show its location with scale-unknown uncertainty; do not assume unit scale or draw a purported physical volume. Known reference dimensions may remain metadata but do not establish a usable world-space volume. Apply the identical origin predicate in precheck and extraction; this condition alone does not reject the whole region.

Allow a visual Z window within the interval loaded at entry, using the existing shared filtering authority rather than a second filter list. Narrowing and widening that visual window only changes visibility among already-loaded occupants. The visual Z filter never expands or implicitly modifies the loaded volume, membership or admission count. To observe outside the loaded interval, return to 2D, explicitly change the committed region and enter again through admission. Retain the committed Cut band independently so visual filtering does not silently overwrite the next entry region. Exact widget design remains an implementation detail.
