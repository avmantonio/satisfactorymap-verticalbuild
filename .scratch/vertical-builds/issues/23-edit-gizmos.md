# Edit gizmos
Level: theme
Kind: ticket
Parent: 68
Status: open

## Question

[Scene Z window](22-scene-z-window.md) chooses the volume. This point is how that volume is edited. [3D edits](27-3d-edits.md) does not open until this answer exists.

Scope: [Viewer delivery](58-viewer-delivery.md) is read-only. Hiding foundations and walls in that viewer is category filters ([Shared visibility](51-shared-visibility.md)), not an opacity toggle. Do not pull gizmos or a transparency effect into the first delivery.

How do move and rotate bind to the editor that already exists?

Still open here:

- Gizmos act on Selection. Commit is still the existing edit path (`applyEdits`, re-parse), not a second writer.
- Which Z the gizmo writes. Height view already uses the floor of what travels, not the bbox center.
- The paste panel stays for numbers and the clipboard.
- No weld, no geometric belt split, no new chain actor.
- Interior opacity is not carried in from the old bar. Reopen it only as its own later decision.

Recommend: gizmos move and rotate the current Selection; the Z they write is that floor. Click still commits through the editor you have. No opacity toggle in this answer.

## Answer

Move, rotate, and placement preview are outside the first delivery. Hiding foundations and walls there is the category filters on Shared visibility, not an opacity toggle. Decided 2026-11-23; do not re-grill.
