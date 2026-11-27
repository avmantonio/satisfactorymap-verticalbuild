# Linear paths
Level: theme
Kind: ticket
Parent: 75
Status: resolved


## Question

Is there enough geometry in the save to draw belts, pipes, cables, and other traces that rise, fall, or cross a region, and what static representation does that geometry support?

Output: a fidelity check and a static drawing strategy. How a path is clipped at the region edge is [Region occupants](43-region-occupants.md).

## Answer

Belts, pipes, and connections are static geometry. No animated item flow and no production simulation. Decided 2026-11-23; do not re-grill.

## Findings

Payload samples plus XY Hermite already draw belts, pipes, hypertubes, rails, and vehicle paths as static 3D traces; Z between vertices is linear because tangent Z and chain-actor triples are dropped. Power cables are straight 3D chords. Rise, fall, and region-cross are drawable without animated flow. Lifts are the missing trace.

Full note: [research/linear-paths.md](../research/linear-paths.md).
