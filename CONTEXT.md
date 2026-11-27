# Satisfactory Save Map

Client-side Satisfactory save viewer/editor. This glossary is the product language for isolating and moving factory pieces; it is not a spec.

## Language

**Build**:
A spatial volume — an XY region plus its Z extent. Occupants of that volume are who isolation can take. A committed Height-view cube can stay put while Selection is a subset of those occupants (remove / re-add inside the cube).
_Avoid_: Cut, selection, factory, blueprint

**Occupant**:
A physical object or path inside a Build or isolation volume. Isolation can take occupants; Selection may be a subset of them.
_Avoid_: Selection, using Occupant to mean the 2D payload bucket, treating a hiddenClasses exclusion as an Occupant

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

### Regional viewer

**3D extract**:
An on-demand regional snapshot of save-native pose, traces, and honesty for the 3D Observation. Separate from the 2D payload.
_Avoid_: map payload, clipboard blob, treating the 2D payload as the scene input

**2D payload**:
The document the current map Observation already draws. It is not the 3D extract.
_Avoid_: 3D extract, clipboard blob

**sizeKind**:
Whether a volume is a named-box, a clearance-reserve, or unknown. A named-box is still not the mesh; a clearance-reserve is a labeled approximation.
_Avoid_: true hull, physical geometry, mesh size, Height-view 4 m as a size

**volumeOffsetM**:
Optional actor-local offset from the actor origin to the known volume center. Omitted when they coincide.
_Avoid_: invented Docs translation, Height-view floor rewrite, originOffsetM

**Lightweight synthetic id**:
A name of the form `LightweightBuildable:<typePath>:<idx>` that identifies a lightweight instance only inside the currently loaded save state.
_Avoid_: treating it as a stable instanceName across reconstructions

**Isolation volume**:
The Height-view cube that delimits a 3D extract: XY rectangle, Cut Z band, and altitude rail. Occupants outside it are not loaded; expanding it requires a new enter.
_Avoid_: Selection, map viewport, treating a layer filter as this volume

**Viewer visibility**:
Whether an already-loaded occupant is drawn inside the 3D visit. Layer filters and `hiddenIndices` change this; they do not change membership.
_Avoid_: membership, Selection, isolation volume

**Admission count**:
How many unique occupants the isolation volume would admit to the 3D extract. One per building or path actor. The 8,000 cap is this count, not an FPS or memory guarantee.
_Avoid_: vertex count, GPU megabytes, wasm heap, FPS budget
