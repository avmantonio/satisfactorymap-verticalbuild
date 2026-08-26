# What is a Build

Type: grilling
Status: resolved
Strand: volume-selection — Volume selection
Blocked by:

## Question

A Build is the unit the player isolates, copies, and moves between saves. What *is* that unit?

Options on the table:

1. **The current selection** — whatever the right-click rectangle (plus altitude filter) captured. No new object; a Build is ephemeral.
2. **A spatial volume** — an axis-aligned box in map pixels plus an altitude window. Objects inside are the Build, including ones the 2D silhouette would hide.
3. **A named persistent group** — a list of actor ids the player saves with the session (or into the `.sav`), recalled later.
4. **A detected cluster** — the tool proposes groups (foundations, connected belts, density). The player accepts or trims.

The pain today is not “there is no copy.” Copy/paste already exists. The pain is *getting the intended set*: vertical overlap, decorative shells, and a 2D silhouette that cannot show which floor you meant. A Cut (a 2D section plane) is the old metaphor; this ticket names the replacement unit.

Do not pick “a factory you construct in this app.” Construction is out of scope.

Recommend: **spatial volume** as the canonical Build, with the current rectangle+altitude as the first way to *draw* that volume. Named groups and clustering can wait — they hang on Isolation UX and on fog still too dim to ticket.

## Answer

A Build is a spatial volume: an XY region plus its Z extent. Occupants of that volume are the transfer set, including objects the 2D silhouette would hide.

The current rectangle + altitude slider is a way to *draw* that volume, not a different unit. A ten-story tower from which you want floors 3–5 is one Build (that XY, that Z window), not the whole tower and not a Cut. Named groups and clustering stay fog. Glossary: `CONTEXT.md`.
