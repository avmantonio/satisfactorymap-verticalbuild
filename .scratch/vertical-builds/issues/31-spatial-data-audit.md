# Spatial data audit
Level: theme
Kind: ticket
Parent: 69
Status: resolved


## Question

What spatial data exists today, from parser to payload to the 2D viewer, and what is missing for a regional viewer?

Cover classes, coordinates, orientations (including tilt), dimensions, and paths between points. Call out what the 2D map drops. The matrix is: datum, source, reliability, gap, and the change required.

Do not pick silhouettes, a renderer, or a region budget here. [Baseline gate](34-baseline-gate.md) waits on this matrix.

## Answer

The save stores quaternion, centimeter position, and scale; the payload keeps map pixels, yaw or a flat hull, and z in meters. Quaternion, scale, and tangent Z are dropped. Sizes are a class clearance lookup, not a per-instance shell.

Position, orientation, and elevation come from the save. The 2.5D cut’s 4 m stand-in is not a physical measure. A point can be placed by inverting pixels and reading z. A box needs that class lookup; a miss is the point plus an unknown size. Path samples are on the payload; the vertical tangent is not.

Findings: [research/spatial-data-audit.md](../research/spatial-data-audit.md). Decided 2026-11-23. Do not re-grill. Do not pick silhouettes, a renderer, or a region budget from this ticket.
