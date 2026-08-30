# Satisfactory Save Map

Client-side Satisfactory save viewer/editor. This glossary is the product language for isolating and moving factory pieces; it is not a spec.

## Language

**Build**:
A spatial volume — an XY region plus its Z extent. Occupants of that volume are who isolation can take. A committed Height-view cube can stay put while Selection is a subset of those occupants (remove / re-add inside the cube).
_Avoid_: Cut, selection, factory, blueprint

**Selection**:
The editor’s current object set: right-drag box, Ctrl+click toggle, Ctrl+A (visible buckets, altitude rail). Spatial edits (move, copy, delete) act on this. It is not a Build.
_Avoid_: Build, Cut

**Cut**:
A pair of linked orthographic lateral projections (A–A′ and B–B′) of a Build’s XY rectangle onto along × Z. The 2.5D way to see verticality and pick one shared Z extent. Not a camera; not a slice that draws objects outside that XY.
_Avoid_: using Cut to mean the Build; a single section plane chosen without a rectangle; treating the strips as 3D

**Observation**:
The view (map, Cut, later 3D) used to see Z while editing a save.
_Avoid_: treating Observation as the whole product (the product is the save editor)

**Spatial edit**:
What this save editor already does: move, rotate, copy, paste, delete of objects already in the save, now including a usable Z.
_Avoid_: constructor (placing new machines, routing new belts); asking whether the app “should edit”

**Build package**:
The bytes that carry a Build between saves — on the clipboard in-session, or as a named file to keep or share. Same payload, two homes.
_Avoid_: blueprint, blob
