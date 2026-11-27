# Recognizable simplified forms

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [48 — Family silhouettes](../issues/48-family-silhouettes.md)
Scope: First regional read-only viewer contract.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

Identical generic boxes are not enough to distinguish the main families.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to recognize buildings and structures from simplified silhouettes, so that I can read their layout.

2. As a pioneer, I want to keep reserve and unknown markers visibly approximate, so that a recognizable form is not mistaken for the game mesh.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

Buildings and structures are simplified silhouettes a person can recognize. Recognizable does not mean the game mesh. Decided 2026-11-23; do not re-grill.

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Review representative production, logistics, power and support forms at useful orbit distances.
- Check that a valid reserve remains neutral/labeled and a sizeless actor remains a location plus uncertainty (50).
- Review every authored form against supply 40 and preserve pose/honesty metadata independently of the decorative form.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

The resolved Answer sets a recognizability requirement, not a completed asset kit. No shipped family-to-form table exists in this package. The global spec must describe the initial family coverage and the relationship between an original decorative silhouette and its separately labeled reserve; do not silently turn clearance into exact machine geometry.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

