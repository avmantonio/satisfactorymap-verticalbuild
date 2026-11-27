# Original geometry supply

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [40 — Asset supply](../issues/40-asset-supply.md)
Scope: Supporting constraint, evidence or decision record.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

The first viewer needs distributable forms with an identifiable origin.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to recognize structures using original simplified forms, so that the viewer remains distributable under the repository rules.

2. As a pioneer, I want to keep game meshes outside the shipped kit, so that the viewer does not depend on a local extraction.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

Recognizable does not mean the game’s mesh. Coffee Stain meshes, icons, and map art stay out of git. A local extract that never ships is optional later living, not this kit. No game-derived mesh enters the supply without this check. Decided 2026-11-23; do not re-grill.

## Recorded Evidence

The following findings were recorded by the source investigation. They were not rerun in this documentation task. Later contracts 42–45 govern the implemented extract, membership, count and lifecycle where the older notes describe the existing 2D payload or draft alternatives.

Original primitives sized from our tables can ship; distinctive family forms must be authored here, not extracted. Coffee Stain meshes stay out of git; FModel glTF stays out of git and out of releases. Local extract that never ships is later living, not this kit.

Procedure and decision: [research/asset-supply.md](../research/asset-supply.md).

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Review each added family asset or generator against the existing generate/author/refuse procedure.
- Check the shipped kit contains original primitives or authored forms, without extracted meshes, traced third-party kits or game art introduced into git.
- Retain provenance of authored assets; existing generated 2D game data remains governed by its own packaging rules.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

This spec adds no assets. A future optional user-local extraction is outside the first viewer and cannot become a release mesh pack.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

