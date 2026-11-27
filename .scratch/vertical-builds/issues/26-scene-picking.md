# Scene picking
Level: theme
Kind: ticket
Parent: 77
Status: open

## Question

The first delivery ends at [Viewer delivery](58-viewer-delivery.md): a read-only regional viewer, no picking. This point starts the later edit cycle. [Useful viewer](24-3d-observation.md) ships without a click hitting anything. [Scene Z window](22-scene-z-window.md) and [Edit gizmos](23-edit-gizmos.md) need a way to name one actor under the cursor. [3D edits](27-3d-edits.md) waits on it.

[Survey 3D fork options](17-survey-3d-fork-options.md) already rules out a raycast over every actor on a large save.

How does one click resolve to one actor?

Recommend: a GPU id buffer, one id per instance, read back at the cursor. The same id the 2D selection already uses. No raycast over the factory.

## Answer

The first delivery shows only what is already applied. It does not select, move, or preview a placement. This ticket is the later edit cycle, and it does not reopen that. Decided 2026-11-23; do not re-grill.
