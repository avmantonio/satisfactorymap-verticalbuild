# Regional viewer — first regional 3D viewer

Date: 2026-11-25
Status: consolidated settled decisions; integration is bound by the [global contract](viewer-integration-spec.md); implementation/runtime evidence remain pending.
Strand: regional-viewer
Scope: the viewer-related portion of this strand, not closure of the entire campaign strand.
Package: [Main spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

The top-down map and Cuts cannot alone provide an orbitable reading of stacked floors and spatial relations. The first 3D delivery needs trustworthy applied-state data without becoming another editor.

## Solution

The first delivery is a **temporary regional read-only observation** of applied save contents. It is useful for height, stacks and spatial relations after a copy or import. Selection/picking, moves, gizmos, fine adjustment, move previews and tentative paste are after delivery 58. Terrain is optional and not required.

This document consolidates the settled ticket decisions for this strand as decision-level input to the global integration contract. Per-ticket specs are preserved as supporting traceability; they are not the primary composition unit.

## User Stories

1. As a pioneer, I want to inspect the already-applied contents of a delimited factory section, so that I can understand height and over/under relations after copy or import.

2. As a pioneer, I want to orbit, pan and zoom around a point of interest, so that I can inspect stacks from useful angles.

3. As a pioneer, I want to see save-native pose and honest uncertainty, so that a plausible image does not hide missing data.

4. As a pioneer, I want to re-enter after a 2D edit with a new snapshot, so that the observation reflects the current save.

## Consolidated Contract

### First-viewer purpose and scope

The first delivery is a **temporary regional read-only observation** of applied save contents. It is useful for height, stacks and spatial relations after a copy or import. Selection/picking, moves, gizmos, fine adjustment, move previews and tentative paste are after delivery 58. Terrain is optional and not required.

The later editor bar in 08 remains documented, but its whole filtered save, selection pivot, nav cube, cheaper rest-of-save, interior opacity, gizmos and different browser/desktop render ceilings are not inherited by this first viewer. The same application and save editor remain the product; no rival fork, constructor, React/R3F or bundler.

### Scene data

Build an on-demand **3D extract** from the current session store, separate from the standing 2D JSON. Do not add quaternion, scale, tangent Z, sizeKind or volumeOffsetM to the 2D payload. Keep it compact: numeric buffers plus a parallel identity/honesty table, independent of renderer objects.

| Field / record | Contract |
| --- | --- |
| positionM | Save header/lightweight position in centimetres divided by 100; elevation is save Z, never Cut DEFAULT_HEIGHT_M |
| quat | Save quaternion [x, y, z, w], retaining tilt; not flattened hull or 2D yaw |
| scale | Header scale, or the three lightweight record doubles at record_off + 56 when readable; unreadable is explicitly unknown, never silently unit scale |
| sizeKind | named-box, clearance-reserve, or unknown; classify truthfully |
| extentM | Optional complete known volume extents [w, d, h] in metres; unknown size has no invented extents |
| volumeOffsetM | Optional actor-local offset from origin to known AABB centre, derived from table min/max after box yaw; omit if coincident; transform with actor orientation; no invented dropped translation or Height-view floor rewrite |
| Path | World-metre XYZ vertices from the path actor; optional real 3D arrive/leave tangents from its spline; omission stays omission |
| Power cable / lift | Cable uses vertex chords; lift is an occupant rather than a trace |
| Identity | Full normal instanceName; lightweight synthetic LightweightBuildable:<typePath>:<idx>, valid only for current loaded save state |

Regional-origin-relative Float32 transport is allowed to preserve precision; original parser coordinates remain authoritative. A first renderer may draw segments linearly without manufacturing missing tangents. Chain-actor triples are not a reconstruction source.

### Camera and evidence

Use orbit, pan and zoom about a point of interest. Free flight/WASD is outside this cut. Exact camera/control shape is a design detail, not permission to import 08's nav cube or selection pivot.

Baseline and feasibility gates are settled decision records, not product test results. The source data audit and transform proof establish usable pose/traces and known losses in the 2D payload. Use the three representative saves and their recorded regions: All_080726-163150.sav, solo_autosave_1.sav and BuildITBIIIIIG_210726-231135.sav. They cover stacks, rotations/tilt, slopes, repeated modules, unknown vanilla classes and density. A cell altitude maximum is not a building's height. A real modded fixture is still absent; node 59 remains open for obtaining and testing a real modded fixture. Acknowledging the gap is not task completion.

The accepted GO is bounded by the actual recorded MX110/Electron probes. It does not credit the unrun integrated geometry/stress/parity checks.

## Interfaces with Other Strands

- **Provides:** the applied-state extract and truthful pose/identity metadata; camera observation and representative-case references.
- **Consumes Volume selection:** a committed immutable-for-the-visit region and the common spatial membership predicate.
- **Consumes Runtime limits:** successful admission before expensive buffers; lifetime constraints after entry.
- **Feeds Visual presentation:** source records independent of meshes; rendering never manufactures physical certainty.
- **Feeds Browser and desktop / Save integrity:** equivalent decoded records on both shells and an observation that performs no save operation.

## Testing Decisions

Test records, visual relations and state transitions at the highest existing core/session or product UI seam that can observe them. The following are acceptance requirements, not reported test results.

- At the core/session seam compare actor and lightweight poses, including tilt, non-unit scale, a nonzero local volume offset, unreadable scale and absent dimensions; retain omissions.
- Check all seven acceptance clauses of ticket 42 and verify the 2D payload is unchanged by extraction.
- Use the integrated scene for stack/yaw/tilt/slope comparisons against actual save records and the transform exception list; known gaps must stay labeled.
- Orbit/pan/zoom must not mutate the save. Tickets 54–56 remain open until implementation 60 exists.

Implementation 60 must exist before integrated trials 54–56 can credit their results; stable delivery remains on gate 58.

## Global Integration Binding

The [global integration spec](viewer-integration-spec.md), [wire v1](viewer-regional-wire-v1.md) and [API/event map](viewer-integration-map.md) now fix request/response layout, origin/strides/validity, identity/category mapping, errors and initial/reset camera/input behavior. This section's former design gaps are closed by those definitions; implementation and actual checks remain pending. Unknown-scale precedence below is unchanged.

## Out of Scope and Later Work

This is the first regional read-only viewer's contribution from Regional viewer. It does not specify or implement the later 3D edit cycle, require terrain, close pending acceptance checks or authorize publication. The older 2.5D spec and later editor bar retain their own scope. Do not mark the whole regional-viewer strand or root campaign complete merely because this viewer slice is documented.

## Source Decisions and Preserved Supporting Work

The following source tickets are owned by this strand. Their Answers remain the decision record; detailed per-ticket documents are retained for traceability. Cross-strand dependencies are composed through the interfaces above.

| Source ticket | Preserved supporting document |
| --- | --- |
| [08 — Schematic 3D bar](../issues/08-schematic-3d-bar.md) | [Later schematic editor bar](viewer-08-schematic-3d-bar.md) |
| [17 — Survey 3D fork options](../issues/17-survey-3d-fork-options.md) | [3D direction and stack constraints](viewer-17-3d-fork-options.md) |
| [21 — Orbit camera](../issues/21-orbit-proxies.md) | [Orbit camera](viewer-21-orbit-camera.md) |
| [24 — Useful viewer](../issues/24-3d-observation.md) | [Useful regional observation](viewer-24-useful-viewer.md) |
| [31 — Spatial data audit](../issues/31-spatial-data-audit.md) | [Spatial source and fidelity](viewer-31-spatial-data.md) |
| [32 — Representative cases](../issues/32-representative-cases.md) | [Representative spatial corpus](viewer-32-representative-cases.md) |
| [34 — Baseline gate](../issues/34-baseline-gate.md) | [Baseline decision record](viewer-34-baseline-gate.md) |
| [35 — Transform proof](../issues/35-transform-proof.md) | [Transform fidelity and exceptions](viewer-35-transform-proof.md) |
| [41 — Feasibility gate](../issues/41-feasibility-gate.md) | [Feasibility GO and its limits](viewer-41-feasibility-gate.md) |
| [42 — Scene contract](../issues/42-scene-contract.md) | [Regional 3D extract](viewer-42-scene-extract.md) |
| [46 — Contract gate](../issues/46-contract-gate.md) | [Contract closure record](viewer-46-contract-gate.md) |
| [59 — Modded save](../issues/59-modded-save.md) | [Explicit modded-save coverage gap](viewer-59-modded-corpus-gap.md) |

See the [readiness review](viewer-readiness-review.md) for current code seams, available inputs, evidence limitations and integration definitions shared across strands.


## Approved clarification — 2026-11-26

Unknown scale takes precedence over every volumetric approximation, including a named box, clearance reserve or available simplified model. For an occupant whose scale cannot be read, admit by the save origin as an explicit approximation and show its location with scale-unknown uncertainty; do not assume unit scale or draw a purported physical volume. Known reference dimensions may remain metadata but do not establish a usable world-space volume. Apply the identical origin predicate in precheck and extraction; this condition alone does not reject the whole region.

Allow a visual Z window within the interval loaded at entry, using the existing shared filtering authority rather than a second filter list. Narrowing and widening that visual window only changes visibility among already-loaded occupants. The visual Z filter never expands or implicitly modifies the loaded volume, membership or admission count. To observe outside the loaded interval, return to 2D, explicitly change the committed region and enter again through admission. Retain the committed Cut band independently so visual filtering does not silently overwrite the next entry region. Exact widget design remains an implementation detail.
