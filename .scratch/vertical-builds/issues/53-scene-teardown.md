# Scene teardown
Level: theme
Kind: ticket
Parent: 81
Status: resolved


## Question

What is released on exit, and how do we tell a leak from ordinary allocator noise?

The refusal path that never built a scene is [Budget precheck](44-budget-precheck.md).

## Answer

Exit destroys the scene. The 2D session does not keep the 3D render cost. A session of repeated visits must not show persistent growth. Decided 2026-11-23; do not re-grill.

## Comments

Resolved 2026-11-25. Next HITL on this cluster is [Useful viewer](24-3d-observation.md).
