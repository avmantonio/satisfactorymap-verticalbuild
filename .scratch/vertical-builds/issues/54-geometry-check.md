# Geometry check
Level: theme
Kind: ticket
Parent: 71
Status: open

## Question

How do locations and orientations compare with the save, the 2.5D checks, and any contrastable game reference?

Classify the discrepancies. A class already marked untrustworthy in [Transform proof](35-transform-proof.md) stays an exception. Do not certify collisions.

## Answer

A pass has no systematic axis, height, or rotation error. Decided 2026-11-23; do not re-grill.

## Comments

2026-11-25 inspection: the product scene is not integrated; the standalone renderer probe exercises 25 synthetic instances. This acceptance check is blocked by [Implement the regional 3D viewer](60-regional-viewer-implementation.md). Keep open until the implemented scene can be compared against representative save regions and the transform exceptions.
