# Section plane

Type: grilling
Status: resolved
Strand: height-view — Height view
Blocked by: 06

## Question

After the player draws the XY rectangle, which plane is A–A′?

[Meaning of 2.5D](06-meaning-of-2-5d.md) made the linked Cut required. [Isolation UX](09-isolation-ux.md) picks Z on that Cut. This ticket is only the plane.

Options:

1. **Long axis of the rectangle** — A–A′ runs along the longer side; the profile looks “down the length” of the Build.
2. **Short axis** — A–A′ cuts across the shorter span (a facade).
3. **Player-rotatable** — a handle on the rectangle sets the section bearing after the box is drawn.
4. **Both** — two strips (plan’s A–A′ and a perpendicular B–B′).

Recommend: **1**, with **3** as a later affordance if the long axis is the wrong read. Two strips is extra chrome for the MVP.

## Answer

Both: A–A′ and a perpendicular B–B′. The Cut is a pair of profiles through the rectangle, not one plane you hope is the right read.

One Z window for the Build, shown on both strips — picking altitude on either sets the same min/max. A rotatable handle is not required for the MVP.
