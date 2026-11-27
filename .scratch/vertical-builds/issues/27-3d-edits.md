# 3D edits
Level: theme
Kind: ticket
Parent: 68
Status: open

## Question

This checkpoint is the edit cycle after the read-only delivery. It stays blocked until [Viewer delivery](58-viewer-delivery.md) is behind [Scene picking](26-scene-picking.md), and until the edit path has answered:

1. [Scene picking](26-scene-picking.md) — a click names one actor.
2. [Scene Z window](22-scene-z-window.md) — choosing the volume.
3. [Edit gizmos](23-edit-gizmos.md) — moving and rotating.

With those three answers, is selection and editing in the schematic viewport specified enough to build?

Recommend: yes, and not before. The regional viewer ships without this checkpoint.

## Answer

The first delivery does not move structures, confirm collisions, validate connections, or predict a future paste. This checkpoint is the later cycle. Decided 2026-11-23; do not re-grill.
