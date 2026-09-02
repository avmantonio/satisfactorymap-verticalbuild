# Volume occupancy

Type: grilling
Status: specced
Strand: volume-selection — Volume selection
Blocked by: 09
Spec: .scratch/vertical-builds/specs/2-5d-first-cut.md

## Question

[Isolation UX](09-isolation-ux.md) picks an XY rectangle, then a Z window. [Relocate semantics](07-relocate-semantics.md) copies whole actors — no geometric clip. Who is in the Build once that volume is set?

Today’s `collectInBox` skips invisible buckets, `hiddenIndices`, and the altitude slider. A belt copies if **any** vertex is in the XY box. Hidden children (sign poles) are not selected, so they never copy. Layer filters hide buckets from view **and** from selection.

Decide the occupant set:

1. **Today’s rules + Z window** — same skips (hidden, invisible buckets). Z window replaces the altitude slider for this isolation. Straddling belts still copy whole if any vertex is in XY **and** the actor’s Z range overlaps the window.
2. **Geometric volume, view-only filters** — every occupant of the XY+Z box, including hidden children. Layer filters change what you *see* on the map and Cut, not who is taken. Straddling belts: whole actor if any vertex is in XY and Z overlaps (cannot split).
3. **Visible plus hidden children** — layer filters still exclude buckets; sign-pole-style children of a selected parent come along. Straddlers follow the whole-actor rule.

Also: when a belt/pipe extends outside the XY rectangle, is that a warning, a block, or silent (today is silent)?

Recommend: **2**, with a warning (not a block) when a belt/pipe extends outside the XY rectangle. Hidden children are the documented copy hole; filters remaining a view gate matches “a Build is a spatial volume.” Volume-complete surprises less than dropping children the player thought they grabbed.

Fact: [Relocate semantics](07-relocate-semantics.md) forbids geometric split, so the live options for straddlers are whole-in or whole-out, plus a warning.

## Answer

Occupants are today’s `collectInBox` rules, with the isolation Z window as the altitude gate. [Height view chrome](13-height-view-chrome.md) reads that gate as: `MapApp.altitudeRange` still caps the set; the Cut band peels **inside** that cap (AND), and cannot take what the global slider hides. Layer-off buckets stay out. `hiddenClasses` (sign poles, path nodes, …) stay out of the payload and out of the Build. Individually hidden objects (`hiddenIndices`) remain selectable, as they are today. Belts/pipes: whole actor if any vertex is in XY and that vertex’s Z is in the window. Power lines still copy only when both endpoint owners are in the set. Straddlers copy silently — no warning, no block, no Cut-exclusion mark as an occupancy contract. No geometric split.
