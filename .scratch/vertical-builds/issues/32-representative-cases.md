# Representative cases
Level: theme
Kind: ticket
Parent: 69
Status: resolved


## Question

[Spatial data audit](31-spatial-data-audit.md) can list fields and still miss a stacked, rotated, sloped factory. [Baseline gate](34-baseline-gate.md) needs cases that would show a wrong axis, a fake height, or a broken path.

Assemble a reproducible set of real saves or regions that covers stacked buildings, rotated structures, sloped lines, repeated modules, unknown or modded classes, and high density. Each case needs a visual reference strong enough to spot a spatial miss.

Prefer fixtures already fetched for this repo. Where a case is missing, name the gap instead of inventing a save. Do not start a 3D scene in this ticket.

## Answer

The three fetched saves cover stacks, rotation, slopes, repeated modules, unknown vanilla classes, and density. A modded save is still a gap.

`All_080726`, `solo_autosave_1`, and `BuildITBIIIIIG_210726` are the corpus. Use the big save’s pillar-and-lift block and All’s conveyor-pole stack for height, the big save’s off-axis signs for yaw, solo’s rail and the big save’s Mk5 belt for slope, solo’s power-storage field for a repeated module, and Unknown-category flow indicators and potties for a class the menu does not name. The big save is the dense world (762,512 headers). None of the three sets `isModdedSave`. Extreme bins (726 m, 23,500 m) are not floor heights.

Findings: [research/representative-cases.md](../research/representative-cases.md).

Decided 2026-11-23. Do not re-grill.
