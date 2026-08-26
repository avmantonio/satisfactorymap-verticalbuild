# Relocate semantics

Type: grilling
Status: resolved
Strand: edit-controls — Edit controls
Blocked by: 01, 03

## Question

Once a Build exists and has an artifact, what does “move it” mean?

The editor already translates and rotates a selection (ghost placement, paste panel with X/Y/Z and rotation). This ticket is the *product* contract for a Build, not a new transform math.

Decide:

1. **Rigid body only** — translate + yaw the whole set. No retargeting of belts, pipes, or power that crossed the volume boundary. Dangling connections stay dangling (or are stripped).
2. **Closed subgraph** — the Build includes internal belts/pipes/power; anything that crossed the boundary is dropped or listed as a warning before paste.
3. **Reconnect on paste** — try to weld to nearby belts/pipes at the destination. This starts to look like a constructor; keep it out unless the artifact is unusable without it.

Also: altitude on paste (keep relative Z vs snap to a chosen floor), and whether rotate is 90° steps only.

Recommend: **closed subgraph + relative Z + 90° yaw**. Warn on dropped boundary connections; do not auto-weld. Auto-weld is constructor-shaped and belongs in Out of scope until a later map redraws the destination.

Fact from [Survey the current map](04-survey-the-current-map.md): move/paste of chained belts does **not** rewrite `FGConveyorChainActor`. The game rebuilds the chain on load. Closed-subgraph relocate can ship without a chain splice; promising “the belt still runs in the editor” would be a different ticket.

## Answer

Cut at the set boundary using the **existing** copy/paste: whole selected actors travel; connections that left the set are tombstoned; power wires copy only when both endpoints are in the set. Internal connections stay. Do not weld on paste. Do not geometrically split belts/pipes at the volume wall, and do not retouch chain-actor internals — that is how a save corrupts (`docs/chained-belt-delete.md`).

This is the current editor contract, not a new one. A belt with any vertex in the rectangle still copies as a whole actor today; “cut” means the actor-set cut, not a scissors at the XY edge. Relative Z and existing paste rotation stay.
