# Runtime limits — first regional 3D viewer

Date: 2026-11-25
Status: consolidated strand spec for settled viewer decisions; integration details and implementation remain pending.
Strand: runtime-limits
Scope: the viewer-related portion of this strand, not closure of the entire campaign strand.
Package: [Main spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

A regional scene needs a predictable admission rule and bounded lifetime while a large save and the existing 2D session remain in memory.

## Solution

Count unique occupants the Volume selection predicate would admit. Each building or path actor counts **once**, independent of vertices, length or clipped fragment count. hiddenClasses stay out; category filters, Selection and hiddenIndices cannot lower the count.

This document consolidates the settled ticket decisions for this strand into one contract for the future global viewer spec. Per-ticket specs are preserved as supporting traceability; they are not the primary composition unit.

## User Stories

1. As a pioneer, I want to have a known oversized region refused before construction, so that the map remains available.

2. As a pioneer, I want to receive a count and shrink instruction, so that I can choose a smaller region.

3. As a pioneer, I want to leave a scene without sustained 3D cost, so that repeated observations do not accumulate resources.

## Consolidated Contract

### Admission unit and limit

Count unique occupants the Volume selection predicate would admit. Each building or path actor counts **once**, independent of vertices, length or clipped fragment count. hiddenClasses stay out; category filters, Selection and hiddenIndices cannot lower the count.

| Admission count | Result |
| --- | --- |
| ≤8,000 | Allowed by this admission gate |
| >8,000 | Refuse before expensive 3D pose/path buffers and before replacing 2D |

Use exactly the same membership predicate for count and extract. Counting may short-circuit at 8,001; then report a **minimum**, not an exact total. The same cap applies in hosted browser, localhost and Tauri. It is admission, not an FPS, vertex, GPU-memory or heap guarantee.

On refusal keep the existing 2D map/state available and use UI.dialog to give the limit, count or minimum, and reduce-XY-or-Cut-Z instruction. No partial scene, LOD, automatic degradation or desktop recommendation.

### Renderer and memory shape

Consume regional typed arrays through the shared vanilla Three.js instanced adapter. Never keep one scene Object3D per actor or a second whole-save JS tree. The parser's wasm32 ~4 GB ceiling and large-save standing heap remain relevant; native memory capacity does not raise the first-viewer admission cap.

### Scene lifetime

Exit destroys the scene, stops its ongoing rendering and releases owned resources; the 2D session must not retain 3D render cost. A later entry rebuilds current save state. Repeated comparable visits must not exhibit persistent growth.

Ownership should account for scene CPU/GPU buffers, geometry/materials, controls, listeners, render scheduling and references, including partial construction. The contract is observable release/no sustained growth, not a requirement that browser allocator or WASM linear-memory high-water immediately falls.

### Evidence limits

The recorded cost probe used MX110/Electron, typed-array/primitives experiments and ordinary 49–800-occupant regions. The older note retains a rejected draft 14,000 alternative; the settled limit is 8,000 with regional membership, not Height-view Selection.

Intel iGPU and a scene co-resident with a loaded ~600k-object WASM save were not measured by those probes. Dummy GPU buffers and standalone teardown are not product lifetime proof. Actual integrated stress remains ticket 55.

## Interfaces with Other Strands

- **Consumes Volume selection:** a common admission/extraction predicate and unique identity count.
- **Gates Regional viewer and Visual presentation:** success before expensive buffers or view replacement; refusal leaves 2D intact.
- **Constrains Browser and desktop:** identical limit, compact buffer shape, one shared frontend.
- **Supports Save integrity:** cleanup must preserve the existing save session; scene exit does not terminate the editor session.

## Testing Decisions

Test records, visual relations and state transitions at the highest existing core/session or product UI seam that can observe them. The following are acceptance requirements, not reported test results.

- Prove exact boundary 8,000 accepted / 8,001 refused, no scene pose/path buffers on reject and 2D state retained.
- Check unique counting across multi-fragment paths; filters/hiddenIndices do not reduce count; short-circuit output is labeled minimum.
- Repeat comparable visits and entry/exit sequences, observing retained resources and ongoing render activity; distinguish persistent growth from GC/allocator noise.
- Stress actual available hardware with large loaded WASM sessions, dense regions and recovery; credit only environments and procedures actually run.

Implementation 60 must exist before integrated trials 54–56 can credit their results; stable delivery remains on gate 58.

## Definitions Still Needed in the Global Spec

The global spec needs resource ownership, cancellation/late-result handling after exit or save changes, partial-failure cleanup and a measurable repeated-visit procedure. No quantitative leak tolerance or universal FPS claim is already decided. Any change to the settled limit after trials must be recorded rather than inferred from desktop headroom.

## Out of Scope and Later Work

This is the first regional read-only viewer's contribution from Runtime limits. It does not specify or implement the later 3D edit cycle, require terrain, close pending acceptance checks or authorize publication. The older 2.5D spec and later editor bar retain their own scope. Do not mark the whole runtime-limits strand or root campaign complete merely because this viewer slice is documented.

## Source Decisions and Preserved Supporting Work

The following source tickets are owned by this strand. Their Answers remain the decision record; detailed per-ticket documents are retained for traceability. Cross-strand dependencies are composed through the interfaces above.

| Source ticket | Preserved supporting document |
| --- | --- |
| [25 — Cost probe](../issues/25-scene-budget.md) | [Regional cost and admission ceiling](viewer-25-scene-budget.md) |
| [44 — Budget precheck](../issues/44-budget-precheck.md) | [Admission precheck and refusal](viewer-44-budget-precheck.md) |
| [53 — Scene teardown](../issues/53-scene-teardown.md) | [Scene resource lifetime](viewer-53-scene-teardown.md) |

See the [readiness review](viewer-readiness-review.md) for current code seams, available inputs, evidence limitations and integration definitions shared across strands.

