# Shared visibility
Level: theme
Kind: ticket
Parent: 76
Status: resolved


## Question

How do the current Z band and the existing category toggles drive the regional scene without changing the region?

## Answer

Z isolation and today’s category filters are in from the start, so foundations and walls can be hidden and stacked floors can be read. This is not a separate opacity toggle and not a second filter list. Wall transparency as its own effect waits. Decided 2026-11-23; do not re-grill.

## Comments

Resolved 2026-11-25. Next HITL on this cluster is [Useful viewer](24-3d-observation.md).

## Approved clarification — 2026-11-26

Allow a visual Z window within the interval loaded at entry, using the existing shared filtering authority rather than a second filter list. Narrowing and widening that visual window only changes visibility among already-loaded occupants. The visual Z filter never expands or implicitly modifies the loaded volume, membership or admission count. To observe outside the loaded interval, return to 2D, explicitly change the committed region and enter again through admission. Retain the committed Cut band independently so visual filtering does not silently overwrite the next entry region. Exact widget design remains an implementation detail.

Acceptance: narrowing then widening restores only already-loaded content; an attempted expansion beyond the loaded bounds never triggers implicit extraction or changes the committed region.
