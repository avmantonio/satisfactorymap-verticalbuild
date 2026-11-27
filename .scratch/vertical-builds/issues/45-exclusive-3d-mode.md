# Exclusive 3D mode
Level: theme
Kind: ticket
Parent: 76
Status: resolved


## Question

After exit, what of the 2D delimitation is still there, and what enter/exit affordance carries that without designing the final control chrome?

Chrome details that are not this lifecycle stay in product design.

## Answer

3D replaces the main 2D map for the visit. Two maps at once are not the base experience. Enter builds the scene from the current save. Exit destroys it. Enter again rebuilds, including edits made in between. No historical scenes and no stale cache. Decided 2026-11-23; do not re-grill.

## Approved clarification — 2026-11-26

On exit preserve map position and zoom, edit Selection, category filters, committed isolation rectangle and Cut Z band. Category-filter changes made during the visit remain effective on return. Height view is closed on return (HeightView.isOpen() false), but the committed delimitation is retained for reopening or re-entry without redrawing. Preserve the committed region separately from the temporary visual Z window; changing visual Z is not a change to that delimitation. Scene destruction and rebuilding from the current save remain mandatory.
