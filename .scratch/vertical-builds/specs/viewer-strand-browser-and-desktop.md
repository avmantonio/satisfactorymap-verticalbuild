# Browser and desktop — first regional 3D viewer

Date: 2026-11-25
Status: consolidated strand spec for settled viewer decisions; integration details and implementation remain pending.
Strand: browser-and-desktop
Scope: the viewer-related portion of this strand, not closure of the entire campaign strand.
Package: [Main spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

Separate shell-specific viewers or assumptions based on a tiny browser probe would fragment the product and overstate platform readiness.

## Solution

Keep sav_core as the shared engine. WASM and native sessions expose the same regional record/buffer shape through the existing SaveClient facade. Transport-specific mechanics remain thin shells; adding a WASM binding requires its Tauri parallel.

This document consolidates the settled ticket decisions for this strand into one contract for the future global viewer spec. Per-ticket specs are preserved as supporting traceability; they are not the primary composition unit.

## User Stories

1. As a pioneer, I want to use the same viewer in browser and Tauri, so that I can keep one workflow.

2. As a pioneer, I want to receive equivalent regional data and admission behavior, so that shell choice does not change spatial meaning.

3. As a pioneer, I want to understand experimental limits, so that release status matches the evidence.

## Consolidated Contract

### Shared frontend and engine

Keep sav_core as the shared engine. WASM and native sessions expose the same regional record/buffer shape through the existing SaveClient facade. Transport-specific mechanics remain thin shells; adding a WASM binding requires its Tauri parallel.

The 2D WebGL2 layer stays the Leaflet overlay. The regional scene uses **vendored vanilla Three.js InstancedMesh from typed arrays**, with no retained Object3D per actor. Do not extend the current map layer into a second custom 3D engine or create a desktop-only engine.

Load the adapter and pinned library same-origin as ES modules in the existing frontend/static build; no CDN runtime dependency, bundler or R3F. Preserve existing script order and shared UI rules. Tauri's self-only script CSP and shared dist are integration constraints. If addons are used, they also need an available same-origin supply.

### Data and admission parity

The separate applied-state extract has the same semantics/shape on both transports, independent of renderer objects. Browser, localhost and desktop share the 8,000 regional admission rule, refusal behavior, filters and lifecycle. Native allocator freedom is not an increased ceiling.

### Release honesty

Public presentation must distinguish spatial observation from collision certification and explain the approximation/budget/shrink restriction. A gradual or experimental switch is allowed where machine dependence remains; it is not mandatory or itself specified.

Stable delivery requires credited geometry, stress, resource-release and cross-shell evidence. Tickets 54–56 and gate 58 remain open. A shell difference that breaks the existing 2D editor fails parity; an ordinary region that the browser cannot hold calls for a smaller validated budget, not a second product.

### What the probe actually establishes

The standalone renderer probe drew 25 synthetic instanced boxes on a local COEP server and established the vanilla module seam. Tauri was not rebuilt and the hosted site was not deployed for that probe. Shared dist and CSP inspection are architecture evidence, not runtime parity. The existing vendor module/license files do not by themselves integrate a viewer.

## Interfaces with Other Strands

- **Consumes Regional viewer:** the source-native, renderer-independent data contract.
- **Consumes Runtime limits:** the same count and refusal boundary and bounded visit lifetime.
- **Hosts Visual presentation:** one product module/UI, same category authority and return-to-2D behavior.
- **Coordinates Save integrity:** actual shell tests must preserve existing load/edit/filter behavior and state.

## Testing Decisions

Test records, visual relations and state transitions at the highest existing core/session or product UI seam that can observe them. The following are acceptance requirements, not reported test results.

- Compare decoded WASM/native records for the same region and save state, including omitted/unknown metadata.
- Exercise same-origin module loading under actual hosted/local headers and Tauri CSP; list shells actually run.
- Once 60 exists, run enter/exit, shared filters, rejection and current-save rebuild across available shells; 2D regressions fail parity.
- Review public/experimental wording against actual 54–56 evidence before stable gate 58; no deployment is authorized by this spec.

Implementation 60 must exist before integrated trials 54–56 can credit their results; stable delivery remains on gate 58.

## Definitions Still Needed in the Global Spec

Exact API/command names, WASM transfer versus native serialization, errors, module attachment, addon supply and asynchronous lifetime integration need a common global definition. Any release switch needs actual UI behavior if chosen. Hosted and rebuilt Tauri runtime evidence remains uncredited.

## Out of Scope and Later Work

This is the first regional read-only viewer's contribution from Browser and desktop. It does not specify or implement the later 3D edit cycle, require terrain, close pending acceptance checks or authorize publication. The older 2.5D spec and later editor bar retain their own scope. Do not mark the whole browser-and-desktop strand or root campaign complete merely because this viewer slice is documented.

## Source Decisions and Preserved Supporting Work

The following source tickets are owned by this strand. Their Answers remain the decision record; detailed per-ticket documents are retained for traceability. Cross-strand dependencies are composed through the interfaces above.

| Source ticket | Preserved supporting document |
| --- | --- |
| [18 — Renderer probe](../issues/18-3d-scene-adapter.md) | [Regional renderer adapter](viewer-18-renderer-adapter.md) |
| [57 — Controlled release](../issues/57-controlled-release.md) | [Controlled publication contract](viewer-57-controlled-release.md) |

See the [readiness review](viewer-readiness-review.md) for current code seams, available inputs, evidence limitations and integration definitions shared across strands.

