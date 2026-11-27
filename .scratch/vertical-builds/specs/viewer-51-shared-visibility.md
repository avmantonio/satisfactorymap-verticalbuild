# Shared category and Z visibility

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [51 — Shared visibility](../issues/51-shared-visibility.md)
Scope: First regional read-only viewer contract.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

A separate filter system would make floors harder to compare with the current editor.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to use the existing categories to hide foundations and walls, so that interiors and stacks become readable.

2. As a pioneer, I want to keep the same isolation Z authority, so that the scene does not introduce an independent region.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

Z isolation and today’s category filters are in from the start, so foundations and walls can be hidden and stacked floors can be read. This is not a separate opacity toggle and not a second filter list. Wall transparency as its own effect waits. Decided 2026-11-23; do not re-grill.

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Toggle existing categories inside a visit and check only loaded-occupant visibility changes; count and membership remain unchanged.
- Check hiddenIndices affect drawing while hiddenClasses stay excluded from the extract.
- Check narrowing the visible Z cannot expose geometry outside the entered volume; expansion needs a new enter.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

The global spec must define how existing filter state maps to full extract identities and how Z controls behave while Height view is hidden. No second list, independent Z volume, or automatic wall-opacity effect is implied.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

