# Scene Z window
Level: theme
Kind: ticket
Parent: 63
Status: open

## Question

[Scene picking](26-scene-picking.md) names an actor under the cursor. This point is how that becomes a volume you can edit. It does not move anything. [Edit gizmos](23-edit-gizmos.md) is the next edit point. [3D edits](27-3d-edits.md) waits on this one.

Scope: the first delivery is the regional read-only viewer through [Viewer delivery](58-viewer-delivery.md). That viewer already delimits a region and already isolates Z ([Shared visibility](51-shared-visibility.md)). This ticket does not reopen region-versus-selection, and it does not pull the first viewer back to a whole-save entry.

How does a click plus today’s Z window become an edit volume after that delivery?

Still open here:

- Click a proxy to select it, the same Selection as the map. The region already exists; this ticket does not drop it.
- The 3D clip uses that shared window, not a second height slider.
- Cherry-pick inside the volume only.
- Out-of-window occupants: clipped out of the solid scene, faded, or left solid.

Recommend: click selects inside the region the viewer already has. Rail caps; the window peels inside it. Out of window leaves the solid scene. No gizmos on this point.

## Answer

The first delivery is a delimited region of what is already applied, not a selection and not a preview. This ticket starts only after that delivery and does not reopen region-versus-selection. Decided 2026-11-23; do not re-grill.
