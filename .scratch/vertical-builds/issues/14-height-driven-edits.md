# Height-driven edits

Type: grilling
Status: resolved
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

## Answer

Move and paste share one 2.5D Height-view observation: the same L-frame Cut, retargeted to the destination ghost, showing dest background plus a neighborhood pad, with the traveling set more attenuated; payload Z is the floor of what actually travels, bound to the existing paste numbers (not today’s bbox center, not a Cut drag gizmo).

**Observation (placing, not isolating).** Isolation’s strict XY clip stays the *selection* contract ([Cut elevation marks](19-cut-elevation-marks.md)). Placing uses a different population on the **same** L-frame ([Height view chrome](13-height-view-chrome.md)) — no sibling viewer, no 3D wait ([First observation layer](02-first-observation-layer.md)). On move or paste, the frame **reanchors** to the ghost footprint. If no isolation cube was up, the frame **opens**; cancel dismisses it. If a cube was up, cancel restores that isolation. Top-down occupancy extrusion / paste ghosts on the map stay Visual presentation fog.

**Neighborhood.** Clip expands around the ghost: **20% of that side, min 8 m, max 50 m**. Sample live buckets into instanced arrays for that expanded XY — not a world-scale second buffer ([Real-client skeleton](16-real-client-skeleton.md)). Infinite-axis slabs are out.

**What is drawn.** Destination + pad = background (19 depth fog). Traveling payload = more attenuated than surroundings. Isolation yellow and out-of-band fade **do not** apply to dest (those marks mean “not in the Build”). A **read-only** band shows the payload’s Z slab at the current panel/ghost altitude. It is not a move handle.

**Altitude rail.** Map drawing still respects `MapApp.altitudeRange`. During place, the Cut **does** draw dest + pad + payload in its own Z domain even when part of that sits outside the rail. The rail does not auto-widen.

**Payload Z.** Spatial edits still act on Selection / the clipboard blob, not empty peel air ([What is a Build](01-what-is-a-build.md) volume vs [Real-client skeleton](16-real-client-skeleton.md) cherry-pick). The slab is the vertical extent of **what travels**, using the same vertical rule as Cut marks (clearance box when present, else actor `z`). The anchor is that slab’s **floor**, not today’s bbox-center `anchorZ`. Internals stay rigid ([Relocate semantics](07-relocate-semantics.md)). Copy/paste remain one loop; named file is [Transfer artifact](03-transfer-artifact.md).

**Panel.** Keep X/Y/Z plus dx/dy/dz. Absolute Z is the **destination floor** of that slab. `dz` is an extra offset. “Original” means that floor does not move relative to source. 90° yaw does not change the floor.

**Move.** Same numbers chrome as paste. Ghost still follows the cursor; **click still commits** (current floor/`dz`, default delta 0 = same world altitude). Do not turn move into paste’s click-then-Apply.

**Old blobs.** No Z on the blob → absolute field stays disabled; `dz` still works; the read-only world-meter slab may be omitted. Do not invent altitude 0. Do not refuse the paste.

**Deferred (named, not silent).** Dragging the placement band to edit destination Z (landing gizmo) is **after** this contract. Do not stretch the payload onto a second dest window.

## Notes

2026-08-21 — Isolation clip (19) and paste observation are different jobs, not a collision. Three origin options (selection-only / window-floor / live Cut drag) are downstream and premature. Needs study of possibilities before a contract. Collision-or-overlap preview fog on the map is absorbed here (more than overlap: exterior in the projection, attenuated payload).

2026-08-30 — Grill closed. Isolation window-floor as origin was rejected: the peel already chose membership; empty band air must not become the paste floor. Occupant-min of travelers (floor of the traveling slab) is the origin. Live Cut drag stayed deferred.
