# Representative spatial corpus

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [32 — Representative cases](../issues/32-representative-cases.md)
Scope: Supporting constraint, evidence or decision record.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

A few generic boxes cannot expose systematic errors in a real factory.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to validate stacks, tilt, slopes and repeated modules on named saves, so that the viewer is checked against real cases.

2. As a pioneer, I want to see corpus gaps stated, so that unknown vanilla classes are not described as mod coverage.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

The three fetched saves cover stacks, rotation, slopes, repeated modules, unknown vanilla classes, and density. A modded save is still a gap.

`All_080726`, `solo_autosave_1`, and `BuildITBIIIIIG_210726` are the corpus. Use the big save’s pillar-and-lift block and All’s conveyor-pole stack for height, the big save’s off-axis signs for yaw, solo’s rail and the big save’s Mk5 belt for slope, solo’s power-storage field for a repeated module, and Unknown-category flow indicators and potties for a class the menu does not name. The big save is the dense world (762,512 headers). None of the three sets `isModdedSave`. Extreme bins (726 m, 23,500 m) are not floor heights.

Findings: [research/representative-cases.md](../research/representative-cases.md).

Decided 2026-11-23. Do not re-grill.

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Use the regions and references in the representative-cases research with All_080726-163150.sav, solo_autosave_1.sav and BuildITBIIIIIG_210726-231135.sav.
- Record the particular region and reference used for each geometry comparison; large altitude bins are not floor heights.
- Keep actual modded-save coverage absent until a real fixture is available (ticket 59).

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

Fixtures exist locally at this review; no new parsing or in-game comparison was performed. Research coordinates and screenshots are evidence to consume in ticket 54, not a passed product trial.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

