# Asset supply
Level: theme
Kind: ticket
Parent: 75
Status: resolved


## Question

What can be generated from our own data and primitives, what needs a per-family treatment, and which game-derived materials would break this repo’s distribution rules?

Output: a reproducible procedure and a supply decision. [Family silhouettes](48-family-silhouettes.md) consumes it.

## Answer

Recognizable does not mean the game’s mesh. Coffee Stain meshes, icons, and map art stay out of git. A local extract that never ships is optional later living, not this kit. No game-derived mesh enters the supply without this check. Decided 2026-11-23; do not re-grill.

## Findings

Original primitives sized from our tables can ship; distinctive family forms must be authored here, not extracted. Coffee Stain meshes stay out of git; FModel glTF stays out of git and out of releases. Local extract that never ships is later living, not this kit.

Procedure and decision: [research/asset-supply.md](../research/asset-supply.md).
