# Controlled publication contract

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [57 — Controlled release](../issues/57-controlled-release.md)
Scope: First regional read-only viewer contract.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

Users must understand the scope and machine-dependent limits of the first release.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to recognize this as a spatial viewer with limits, so that I do not mistake it for a collision certifier.

2. As a pioneer, I want to see an experimental designation when appropriate, so that release status matches available evidence.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

A person can tell this spatial viewer from a collision certifier. A gradual or experimental switch is allowed when behavior still depends on the machine. Decided 2026-11-23; do not re-grill.

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Review public-facing scope and limitations against the actual geometry, stress and parity results.
- Keep stable delivery blocked until 54–56 and gate 58 credit their evidence.
- If an experimental/gradual switch is used, exercise its actual entry and exit behavior on available shells.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

An experimental switch is allowed, not mandatory or specified in detail. This document authorizes no deployment, external write or stable-delivery claim.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

