# Regional form recipes — original provenance

Hand-authored schematic cues for ticket 60 phase 3. Not game meshes, not
traced Coffee Stain geometry, not generated docs-table output. Numeric
clearance/named sizes in the coverage spec establish only the classified
volume; proportions below are original authoring choices kept inside that
volume.

| Recipe | Exact classes | What was authored | Honesty |
| --- | --- | --- | --- |
| `grid-floor` | `Build_Foundation_8x1_01_C`, `Build_Foundation_8x2_01_C`, `Build_Foundation_8x4_01_C` | A unit slab plus a shallow original top-face seam grid. Thickness comes from the extracted named extent, not a constant 4 m. | Named-box approximate grid piece. |
| `grid-ramp-reserve` | `Build_Ramp_8x4_01_C`, `Build_Ramp_8x4_Inverted_01_C` | Named-box slab with one schematic diagonal edge. Not a recovered wedge or handed slope surface. | Label: approximate box, exact surface pending. |
| `wall-panel` | `Build_Wall_8x4_01_C`, `Build_Wall_8x4_02_C` | Neutral wire reserve plus original panel subdivisions. No doorway. | Clearance reserve; thickness is not invented from Width/Height. |
| `pillar-reserve` | `Build_PillarMiddle_C` | Neutral tilted reserve prism plus original end-cap squares. | Clearance reserve; quaternion/scale retained. |
| `smelter-cue` | `Build_SmelterMk1_C` | Original furnace-like body and one asymmetric chimney, inside the reserve. | Neutral envelope stays visible; 5×10×4.5 m reserve is membership, not parts. |
| `constructor-cue` | `Build_ConstructorMk1_C` | Original low base and open gantry/arm cue. No ports. | Neutral envelope stays visible; 8×10×6 m reserve is membership. |
| `storage-cue` | `Build_StorageContainerMk1_C`, `Build_StorageContainerMk2_C` | Original ribbed box; Mk2 repeats the frame motif vertically. Origin-centred, not floor-rewritten. | Neutral envelope stays visible. |
| `power-pole-cue` | `Build_PowerPoleMk1_C` | Original slender mast and crossbar inside the reserve. No wire sockets. | Neutral envelope stays visible; negative local Z is kept. |
| `static-path` | Shared core belt/pipe/hypertube/rail/vehicle-path/cable type sets | Straight chords between admitted clipped samples. Family styling from category metadata. | Linear approximation; tangents unused for drawing. |

Unlisted classes use honest fallback (named box, labeled reserve, or location
marker) and never substring-match into a listed recipe. Distinctive cue
vertices are original and must stay inside `[-0.5, +0.5]` of each extent axis.
