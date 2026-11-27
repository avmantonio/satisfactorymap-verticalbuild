# 3D direction and stack constraints

Status: specified decision; implementation and validation are not credited.
Date: 2026-11-25
Source node: [17 — Survey 3D fork options](../issues/17-survey-3d-fork-options.md)
Scope: Supporting constraint, evidence or decision record.
Package: [Viewer spec index](viewer-spec-index.md) · [Readiness review](viewer-readiness-review.md).

## Problem Statement

A separate fork or incompatible frontend would fragment the save editor.

## Solution

Formalize the resolved node's contract for composition into the future global viewer spec. The source ticket remains the decision record. “Specced” means this decision has a document, not that the viewer or an acceptance trial is complete.

## User Stories

1. As a pioneer, I want to keep schematic 3D in this editor, so that my saves and Build workflow keep one home.

2. As a pioneer, I want to use locally available assets and on-device saves, so that the viewer preserves the current privacy and distribution rules.

## Implementation Decisions

The resolved Answer is reproduced below with links adjusted for this directory. Its first-viewer scope is constrained by the boundary notes in this spec and the package's precedence rules; historical findings are evidence, not additional product decisions.

Keep `sav_core`. Schematic 3D (instanced proxies, camera, synced filters) **is this app’s later observation** — same editor, same Build loop; Height view ships first. Three.js as a vanilla scene adapter is the live stack option. R3F/bundler, `.sbp` as the Build package, and Coffee Stain glTF in git stay out. Real meshes stay local/out of git, after schematic.

Findings: [research/3d-fork-options.md](../research/3d-fork-options.md). Ranking of the 3D bar stays [Schematic 3D bar](../issues/08-schematic-3d-bar.md); how the viewport attaches is [3D scene adapter](../issues/18-3d-scene-adapter.md).

## Testing Decisions

Validate observable records, visual relations and lifecycle outcomes at the existing core/session or product UI seam. Avoid assertions about a private function name, a specific DOM tree or an incidental draw-call count.

- Check the future adapter uses the existing session and shared frontend rather than a second application.
- Review distribution for framework/bundler additions or shipped game meshes; these are excluded.

These are required evidence or review criteria, not checks reported as run. Integrated acceptance remains on open tickets 54–56 after implementation 60.

## Integration Boundaries

This is the settled direction, not permission to implement the later editor bar. Ticket 18 subsequently selected vanilla Three.js.

## Out of Scope

This node spec does not implement the viewer, close an open acceptance/delivery ticket, publish a feature or define the global spec. For the first viewer, picking, gizmos, edits, tentative paste, collision certification, terrain, animated flow and whole-save rendering remain outside the cut. Node 08 records a later horizon only.

## First cut / later

- **First regional cut:** the stories above to the extent defined by this node's Scope; supporting evidence constrains implementation without becoming a new UI feature.
- **Later:** global composition must bind this contract to the other node specs and the real integration seams. Implementation 60 precedes trials 54–56; stable delivery stays on 58. Unresolved product-design details must not be represented as decisions already made.

## Further Notes

Use the [index and coverage matrix](viewer-spec-index.md) to find adjacent contracts. The [readiness review](viewer-readiness-review.md) records present code support, missing integration definitions and uncredited runtime evidence. The existing 2.5D spec remains separate and unchanged.

