# Height-driven edits

Type: grilling
Status: open
Strand: edit-controls — Edit controls
Blocked by: 07, 12

## Question

[Relocate semantics](07-relocate-semantics.md) keeps existing copy/paste (relative Z, paste panel). Height view now *chooses* the Z window that defines occupants. How do move / copy / paste / ghost read that Z — and **see the destination** — instead of only the altitude slider and the paste-panel Z field?

This is not a three-way close. The isolation Cut is specified; the **paste Cut is not**.

[Cut elevation marks](19-cut-elevation-marks.md) is the **selection** contract: orthographic laterals of the XY rectangle, strict XY clip, faded in-box / out-of-band, yellow for excluded crossers. That clip was drawn so the player can *pick a volume*. It does not forbid a different population rule when the job is **placing**. Blind paste (today’s panel + bbox center, Cut unused) is not an acceptable product for Height-driven relocate: you are not in sync with what sits outside the cube.

What this ticket must specify, after study — not by picking 1/2/3 first:

- **Paste-time observation.** How the Cut (or a sibling projection) shows the exterior of each face / around the volume so mobility is possible. Candidates include: project neighborhood beyond the rectangle; keep destination as background; draw the payload more attenuated than the surroundings. This is Height view + Visual presentation in service of Edit controls, not a reopen of 19’s isolation marks.
- **Z of the payload.** Once that observation exists: how ghost / paste origin / panel / in-save move read the shared Z window (floor vs occupant min vs today’s bbox center; panel as delta; whether the destination band is a landing). Isolation UX still forbids turning the *selection* Cut into a second move gizmo; paste-time drag is a different question.
- **Copy remains one loop** with paste. Clipboard vs named file is [Transfer artifact](03-transfer-artifact.md).

Do not resolve this ticket as “window is selection only for MVP.” Occupancy-only Height view can still ship for *isolation*; this ticket is the relocate half and stays open until paste observation has been studied.

## Notes

2026-08-21 — Isolation clip (19) and paste observation are different jobs, not a collision. Three origin options (selection-only / window-floor / live Cut drag) are downstream and premature. Needs study of possibilities before a contract. Collision-or-overlap preview fog on the map is absorbed here (more than overlap: exterior in the projection, attenuated payload).
