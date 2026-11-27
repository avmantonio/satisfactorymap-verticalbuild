# Transform proof
Level: theme
Kind: ticket
Parent: 69
Status: resolved

Assets: .scratch/vertical-builds/prototype/transform-proof.html, .scratch/vertical-builds/prototype/transform-exceptions.md, .scratch/vertical-builds/prototype/transform-samples.json

## Question

On the representative cases, do X, Y, Z, and rotations convert without an inverted axis, a unit error, or an invented elevation?

Classify the exceptions, including tilt and point-to-point paths the 2D payload drops. Output is a reference prototype and that list. Not a product camera, not silhouettes, not a region policy.

## Prototype

Throwaway conversion demo (not a product camera): [../prototype/transform-proof.html](../prototype/transform-proof.html)

Open the HTML (needs sibling [../prototype/transform-samples.data.js](../prototype/transform-samples.data.js), generated from [../prototype/transform-samples.json](../prototype/transform-samples.json)). Walk the tabs: axes/units, stack, yaw, tilt, slope, holes. Counterfactual buttons show a forgotten Y-flip, swapped XY, Z-as-cm, and an invented 4 m.

Classified exceptions: [../prototype/transform-exceptions.md](../prototype/transform-exceptions.md).

## Answer

Position, orientation, and elevation come from the save. A class with no trustworthy Z or rotation is reported, not drawn as if it were exact. Shapes may be approximate later; this proof does not invent a number to fill a hole. Decided 2026-11-23; do not re-grill.

## Findings

Conversion on representative cases has no inverted axis or unit error. The save has pose (place, heading, height), not Coffee Stain volumetry. The viewer must not fake flattened tilt, a missing vertical curve between path samples, a missing table size, or a cell-max as building height. Mk5 belt is enough slope proof; the solo rail was a dump sampling gap, labeled. Wall poles and passthroughs stand in for this proof where signs, flow, and potties were not sampled. Coherent later drawing is not this ticket inventing a mesh: it already lives on resolved [Proxy catalog](28-proxy-modeling.md) and [Asset supply](40-asset-supply.md) and on open [Family silhouettes](48-family-silhouettes.md) — table reserve box or original authored form, never presented as the true shell; official meshes stay out.

Prototype: [prototype/transform-proof.html](../prototype/transform-proof.html). Exceptions: [prototype/transform-exceptions.md](../prototype/transform-exceptions.md).
