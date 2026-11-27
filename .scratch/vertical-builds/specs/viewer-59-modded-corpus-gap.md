**Status correction — 2026-11-26:** Source ticket 59 is OPEN. This document is preserved as the missing-fixture record; it is not a completed test or approval.

# Explicit modded-save coverage gap

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [59 — Modded save](../issues/59-modded-save.md)
Scope: Supporting constraint, evidence or decision record.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

Unknown vanilla classes do not demonstrate support for a real modded save.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to see real modded coverage reported accurately, so that I know which cases remain untested.

2. As a pioneer, I want to keep missing fixtures visible, so that future validation can add a real case.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

No fetched modded save is available. The local corpus contains `All_080726-163150.sav`, `solo_autosave_1.sav`, `BuildITBIIIIIG_210726-231135.sav`, and `belt_item_state.sav`; the first three are the representative corpus named in [Representative cases](../issues/32-representative-cases.md), which records that none sets `isModdedSave`. `belt_item_state.sav` is the equipment-state fixture, not a modded-save claim. Keep a real modded save as a corpus gap until one is supplied or added to the fetch manifest. No filename or mod class is inferred.

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Check the named local/fetched corpus against the fixture manifest before claiming modded coverage.
- Do not relabel belt_item_state.sav or an Unknown category as a modded save.
- Keep this task open while the fixture is missing and until real modded-save validation is recorded; this does not block composing the existing viewer contract.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

The prior resolved status was incorrect: acknowledgement of the gap did not complete the task. No modded filename, class, parse or support guarantee is invented.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

