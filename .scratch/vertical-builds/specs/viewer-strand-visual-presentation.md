# Visual presentation — first regional 3D viewer

Date: 2026-11-25
Status: consolidated settled decisions; integration is bound by the [global contract](viewer-integration-spec.md); implementation/runtime evidence remain pending.
Strand: visual-presentation
Scope: the viewer-related portion of this strand, not closure of the entire campaign strand.
Package: [Main spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

A useful 3D observation must be recognizable and readable without presenting clearance boxes, invented dimensions or decorative forms as exact game geometry.

## Solution

During a visit, 3D replaces the main 2D map. Two simultaneous maps are not the base experience. Entry builds from the current applied save; exit destroys the scene; a later entry rebuilds including intervening edits. Keep no historical scene cache. Admission must succeed before buffers or view replacement.

This document consolidates the settled ticket decisions for this strand as decision-level input to the global integration contract. Per-ticket specs are preserved as supporting traceability; they are not the primary composition unit.

## User Stories

1. As a pioneer, I want to recognize simplified buildings and structures, so that I can read the layout from orbit.

2. As a pioneer, I want to see reserves and missing sizes clearly distinguished, so that I understand the drawing's uncertainty.

3. As a pioneer, I want to hide foundations and walls through existing category filters, so that I can read stacked floors.

4. As a pioneer, I want to enter a temporary exclusive scene and return to 2D, so that the observation fits the existing editor.

## Consolidated Contract

### Exclusive observation

During a visit, 3D replaces the main 2D map. Two simultaneous maps are not the base experience. Entry builds from the current applied save; exit destroys the scene; a later entry rebuilds including intervening edits. Keep no historical scene cache. Admission must succeed before buffers or view replacement.

Ticket 33's explicit return check includes restored map width, bucket count/visible flags and HeightView.isOpen() false. Retained rectangle/band/selection state is settled by the approved clarification below; entry/Back/reopen/clear affordances are now fixed in the global integration contract.

### Size honesty and form supply

| Classification | Required reading |
| --- | --- |
| named-box | Published complete W×D×H approximate grid box; still not the game mesh |
| clearance-reserve | Neutral labeled reserve, not a physical shell |
| unknown / no complete size | Location plus uncertainty, no invented box, no silent 4 m, no dropped actor |

Buildings and structures use recognizable simplified silhouettes. Recognizable does not mean the game mesh. A distinctive original silhouette is not a precision certificate and cannot turn clearance metadata into an exact shell. The global integration spec and initial kit now require a visible neutral reserve alongside any original recognition cue; decorative detail cannot establish measured geometry.

The catalog's surveyed 227 complete boxes / 274 clearance-only / 45 incomplete classes explains data coverage, not a completed family asset kit or permanent counts. Plan-only footprints, repeating segment MeshLength/MeshHeight and incomplete axes must not be promoted into complete volumes. Preserve source-native quaternion/scale and unfloored offset semantics; the old 2D lookup/flooring recipes are not the 3D contract.

Supply is original primitives sized from allowed numeric data plus original per-family authored forms. Distinctive forms are authored here. Do not introduce extracted Coffee Stain meshes, traced kits or FModel glTF into git or releases. Optional later user-local extraction is outside this delivery. Existing generated 2D game data remains under its separate packaging rules.

### Static networks

Draw belts, pipes, hypertubes, rails, vehicle paths and relevant connections as static spatial geometry from admitted actor traces. Power is chords; lifts remain occupants. Read rise/fall and crossings in XYZ, not projected XY. Tangents are real or omitted; linear segment drawing is allowed. Clip display to the entered region. Stroke/ribbon thickness is styling, not a measured cross-section.

No animated items, production simulation, collision certification, connection validation or future-paste prediction.

### Shared visibility and messages

Use existing category filters and Z authority from the start. Foundations and walls can be hidden. No second filter list, separate interior-opacity toggle or automatic wall-transparency effect is required by this cut. Filters and hiddenIndices change visibility only; hiddenClasses stay outside membership.

Messages must state restrictions and uncertainty without claiming collision precision. Budget refusal names 8,000, exact count or labeled minimum, and asks to shrink XY or Cut Z while keeping 2D. Empty/unknown/reserve states need clear presentation; this document does not claim final message wording, contrast or visual QA has been approved.

## Interfaces with Other Strands

- **Consumes Regional viewer:** applied-state pose, identities, sizeKind and path fidelity.
- **Consumes Volume selection:** fixed admitted inventory and clipped fragments; shared Z authority.
- **Consumes Runtime limits:** admission success, refusal count and scene cleanup.
- **Consumes Browser and desktop:** the same adapter and UI primitives on each shell.
- **Consumes Save integrity:** return-state and non-mutation requirements; reuses existing ui.js/ui.css/map.css chrome.

## Testing Decisions

Test records, visual relations and state transitions at the highest existing core/session or product UI seam that can observe them. The following are acceptance requirements, not reported test results.

- Review recognizable production/logistics/power/support cases, along with clearance-only and unknown classes; approximation labels must survive styling.
- Compare a vertical run, slope and crossing with actor traces; verify line clipping and no manufactured tangents.
- Toggle existing categories/hiddenIndices and observe only visibility changing; membership/count remain unchanged.
- Exercise entry/exit/re-entry and the existing UI handoff criteria; no stale scene or concurrent base split view.
- Review actual refusal, empty, reserve and unknown messages and original asset provenance. Do not claim these visual checks have run.

Implementation 60 must exist before integrated trials 54–56 can credit their results; stable delivery remains on gate 58.

## Global Integration Binding

The [global contract](viewer-integration-spec.md), [initial exact-class kit](viewer-initial-coverage.md) and [integration map](viewer-integration-map.md) now define entry/exit/camera controls, source-chord rendering, shared identity/hidden-index mapping, scoped rail/numeric Z controls, empty/unknown/refusal messages and visual acceptance. The kit is a required implementation target, not delivered assets or closed research 61. Approved retained-state/Z rules below remain unchanged. Terrain, wall-transparency effects and later editor-bar chrome remain outside this cut.

## Out of Scope and Later Work

This is the first regional read-only viewer's contribution from Visual presentation. It does not specify or implement the later 3D edit cycle, require terrain, close pending acceptance checks or authorize publication. The older 2.5D spec and later editor bar retain their own scope. Do not mark the whole visual-presentation strand or root campaign complete merely because this viewer slice is documented.

## Source Decisions and Preserved Supporting Work

The following source tickets are owned by this strand. Their Answers remain the decision record; detailed per-ticket documents are retained for traceability. Cross-strand dependencies are composed through the interfaces above.

| Source ticket | Preserved supporting document |
| --- | --- |
| [28 — Proxy catalog](../issues/28-proxy-modeling.md) | [Size and proxy classification](viewer-28-proxy-catalog.md) |
| [36 — Linear paths](../issues/36-linear-paths.md) | [Static path source and fidelity](viewer-36-linear-paths.md) |
| [40 — Asset supply](../issues/40-asset-supply.md) | [Original geometry supply](viewer-40-asset-supply.md) |
| [45 — Exclusive 3D mode](../issues/45-exclusive-3d-mode.md) | [Exclusive visit lifecycle](viewer-45-exclusive-mode.md) |
| [48 — Family silhouettes](../issues/48-family-silhouettes.md) | [Recognizable simplified forms](viewer-48-family-silhouettes.md) |
| [49 — Static networks](../issues/49-static-networks.md) | [Static network representation](viewer-49-static-networks.md) |
| [50 — Reserve volumes](../issues/50-reserve-volumes.md) | [Reserve and unknown representation](viewer-50-reserve-volumes.md) |
| [51 — Shared visibility](../issues/51-shared-visibility.md) | [Shared category and Z visibility](viewer-51-shared-visibility.md) |
| [52 — Honest readout](../issues/52-honest-readout.md) | [Honest restrictions and scene messages](viewer-52-honest-readout.md) |

See the [readiness review](viewer-readiness-review.md) for current code seams, available inputs, evidence limitations and integration definitions shared across strands.


## Deferred work remains open

[61 — Free-form and missing 3D shapes](../issues/61-free-form-geometry.md) tracks investigation of shapes absent from save metadata, initial honest simplified representations and later refinement with original simplified models. A 2D projection is not a 3D shell; neither sizeKind nor the settled fallback rule closes this work.

## Approved clarification — 2026-11-26

The first viewer may include provisional representations while research 61 remains open: an evidence-supported simplified form where available, a labeled neutral reserve where only clearance is known, or location plus uncertainty when dimensions are unsupported. Recognizable silhouettes are required for families with an available simplified model; other families remain explicitly pending coverage in 61. Unknown scale overrides every volumetric fallback under 42/43. Agreement on these rules does not complete the class inventory, research or later refinement with original simplified models.

On exit preserve map position and zoom, edit Selection, category filters, committed isolation rectangle and Cut Z band. Category-filter changes made during the visit remain effective on return. Height view is closed on return (HeightView.isOpen() false), but the committed delimitation is retained for reopening or re-entry without redrawing. Preserve the committed region separately from the temporary visual Z window; changing visual Z is not a change to that delimitation. Scene destruction and rebuilding from the current save remain mandatory.

Allow a visual Z window within the interval loaded at entry, using the existing shared filtering authority rather than a second filter list. Narrowing and widening that visual window only changes visibility among already-loaded occupants. The visual Z filter never expands or implicitly modifies the loaded volume, membership or admission count. To observe outside the loaded interval, return to 2D, explicitly change the committed region and enter again through admission. Retain the committed Cut band independently so visual filtering does not silently overwrite the next entry region. Exact widget design remains an implementation detail.
