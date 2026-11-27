# Stress trial
Level: theme
Kind: ticket
Parent: 82
Status: open

## Question

What happens under dense regions, area changes, back-to-back loads, unknown classes, and the weaker hardware available?

[Budget precheck](44-budget-precheck.md) and [Scene teardown](53-scene-teardown.md) defined the limits this trial tries to break.

## Answer

The limit hits before a failure. The way back to 2D still works, and memory is released. No LOD is added to survive the trial. Decided 2026-11-23; do not re-grill.

## Comments

2026-11-25 inspection: the product has no regional scene lifecycle to stress; the standalone probe is limited to 25 synthetic instances. This acceptance check is blocked by [Implement the regional 3D viewer](60-regional-viewer-implementation.md). Keep open until the admission boundary, repeated visits, and resource release can be exercised in the product.
