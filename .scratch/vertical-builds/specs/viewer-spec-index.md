# Regional 3D viewer — strand specifications

Date: 2026-11-25
Status: settled strand decisions plus implementation-ready global integration contract; implementation and runtime acceptance pending.

## Global implementation contract — integration closure

The [global integration contract](viewer-integration-spec.md) closes the five integration prerequisites identified by the historical readiness review. It composes, rather than replaces, the six strand decisions and their approved clarifications.

| Integration artifact | Authority |
| --- | --- |
| [Global spec](viewer-integration-spec.md) | Scope, persistent delimitation, coherent snapshot, session/visit lifecycle, camera, controls, errors and ownership |
| [Regional wire v1](viewer-regional-wire-v1.md) | Exact binary/header/strides/metadata/validity/identity/path/error and boundary rules |
| [Integration map](viewer-integration-map.md) | APIs, event receivers, ordering, secondary paths, file/module supply |
| [Initial coverage](viewer-initial-coverage.md) | Exact minimum original kit and reserve/uncertainty fallbacks; 61 remains open |
| [Execution phases](../plans/regional-viewer/PLAN_PHASE_1_core-extract.md) | Core → state/transports → renderer/kit → actual product integration → final smoke |
| [Exit criteria](viewer-exit-criteria.md) | HEC commands, trial procedures and evidence rules; runtime criteria all OPEN |
| [Reference vectors and validator](../validation/check_viewer_integration.py) | Executable documentation/format consistency, not a production runtime pass |

Next action is product implementation 60 against these interfaces. No further integration-design round is a prerequisite.

## Purpose and readiness

The primary composition unit is **one consolidated spec per main strand involved in the first viewer**, bringing together **28 previously resolved tickets** in the existing Vertical Build Transfer map. The previously created per-ticket documents are all preserved below as supporting traceability. The six strand specs remain the decision-level inputs. The global package above supplies the previously missing integration spec and implementation plan; neither package is a shipped viewer or passed trial.

**The integration definitions are now concrete and ticket 60 is ready to implement.** The [readiness review](viewer-readiness-review.md#integration-definitions-for-the-global-spec) records why the glue was needed; its closure addendum links each gap to the new contract. Integrated/runtime evidence is still required before calling the viewer complete or stable.

## Main strand specifications

| Strand | Consolidated spec | Settled source tickets |
| --- | --- | --- |
| Regional viewer | [Regional viewer](viewer-strand-regional-viewer.md) | 08, 17, 21, 24, 31, 32, 34, 35, 41, 42, 46, 59 |
| Volume selection | [Volume selection](viewer-strand-volume-selection.md) | 43 |
| Visual presentation | [Visual presentation](viewer-strand-visual-presentation.md) | 28, 36, 40, 45, 48, 49, 50, 51, 52 |
| Runtime limits | [Runtime limits](viewer-strand-runtime-limits.md) | 25, 44, 53 |
| Browser and desktop | [Browser and desktop](viewer-strand-browser-and-desktop.md) | 18, 57 |
| Save integrity | [Save integrity](viewer-strand-save-integrity.md) | 33 |

These documents specify the settled **viewer slice** of each strand. They do not close whole campaign strands whose later work remains open.

## Other campaign strands

| Strand | Relationship to this first viewer |
| --- | --- |
| Height view | Existing [2.5D first-cut spec](2-5d-first-cut.md); supplies the committed rectangle, Cut band and altitude authority. No replacement spec or completed-ship claim |
| Edit controls | Existing 2D editor remains intact. New picking/gizmos/3D edits are after delivery 58; not promoted into a settled first-viewer spec |
| Build package | Clipboard/named-file transfer is the separate product contract. The viewer observes applied contents; it does not define new package/file UX |

## Coverage matrix

Preserved per-ticket supporting documents. Read the consolidated strand spec as the primary contract.

| Node | Specification | Role |
| --- | --- | --- |
| [08](../issues/08-schematic-3d-bar.md) | [Later schematic editor bar](viewer-08-schematic-3d-bar.md) | Later editor horizon only |
| [17](../issues/17-survey-3d-fork-options.md) | [3D direction and stack constraints](viewer-17-3d-fork-options.md) | Supporting constraint / evidence / decision |
| [18](../issues/18-3d-scene-adapter.md) | [Regional renderer adapter](viewer-18-renderer-adapter.md) | Supporting constraint / evidence / decision |
| [21](../issues/21-orbit-proxies.md) | [Orbit camera](viewer-21-orbit-camera.md) | First regional viewer |
| [24](../issues/24-3d-observation.md) | [Useful regional observation](viewer-24-useful-viewer.md) | First regional viewer |
| [25](../issues/25-scene-budget.md) | [Regional cost and admission ceiling](viewer-25-scene-budget.md) | Supporting constraint / evidence / decision |
| [28](../issues/28-proxy-modeling.md) | [Size and proxy classification](viewer-28-proxy-catalog.md) | Supporting constraint / evidence / decision |
| [31](../issues/31-spatial-data-audit.md) | [Spatial source and fidelity](viewer-31-spatial-data.md) | Supporting constraint / evidence / decision |
| [32](../issues/32-representative-cases.md) | [Representative spatial corpus](viewer-32-representative-cases.md) | Supporting constraint / evidence / decision |
| [33](../issues/33-2d-regression-guard.md) | [2D regression and viewer handoff](viewer-33-2d-regression.md) | Supporting constraint / evidence / decision |
| [34](../issues/34-baseline-gate.md) | [Baseline decision record](viewer-34-baseline-gate.md) | Supporting constraint / evidence / decision |
| [35](../issues/35-transform-proof.md) | [Transform fidelity and exceptions](viewer-35-transform-proof.md) | Supporting constraint / evidence / decision |
| [36](../issues/36-linear-paths.md) | [Static path source and fidelity](viewer-36-linear-paths.md) | Supporting constraint / evidence / decision |
| [40](../issues/40-asset-supply.md) | [Original geometry supply](viewer-40-asset-supply.md) | Supporting constraint / evidence / decision |
| [41](../issues/41-feasibility-gate.md) | [Feasibility GO and its limits](viewer-41-feasibility-gate.md) | Supporting constraint / evidence / decision |
| [42](../issues/42-scene-contract.md) | [Regional 3D extract](viewer-42-scene-extract.md) | First regional viewer |
| [43](../issues/43-region-occupants.md) | [Regional membership and clipping](viewer-43-region-occupants.md) | First regional viewer |
| [44](../issues/44-budget-precheck.md) | [Admission precheck and refusal](viewer-44-budget-precheck.md) | First regional viewer |
| [45](../issues/45-exclusive-3d-mode.md) | [Exclusive visit lifecycle](viewer-45-exclusive-mode.md) | First regional viewer |
| [46](../issues/46-contract-gate.md) | [Contract closure record](viewer-46-contract-gate.md) | Supporting constraint / evidence / decision |
| [48](../issues/48-family-silhouettes.md) | [Recognizable simplified forms](viewer-48-family-silhouettes.md) | First regional viewer |
| [49](../issues/49-static-networks.md) | [Static network representation](viewer-49-static-networks.md) | First regional viewer |
| [50](../issues/50-reserve-volumes.md) | [Reserve and unknown representation](viewer-50-reserve-volumes.md) | First regional viewer |
| [51](../issues/51-shared-visibility.md) | [Shared category and Z visibility](viewer-51-shared-visibility.md) | First regional viewer |
| [52](../issues/52-honest-readout.md) | [Honest restrictions and scene messages](viewer-52-honest-readout.md) | First regional viewer |
| [53](../issues/53-scene-teardown.md) | [Scene resource lifetime](viewer-53-scene-teardown.md) | First regional viewer |
| [57](../issues/57-controlled-release.md) | [Controlled publication contract](viewer-57-controlled-release.md) | First regional viewer |
| [59](../issues/59-modded-save.md) | [Explicit modded-save coverage gap](viewer-59-modded-corpus-gap.md) | Supporting constraint / evidence / decision |

## Composition traceability

The global integration contract composes the six strand specs above: Regional viewer defines purpose and source data; Volume selection fixes inventory; Runtime limits gates admission and owns resource lifetime; Visual presentation defines the visit and honest drawing; Browser and desktop supplies shared integration/release constraints; Save integrity preserves the editor. Its exact interfaces and integration definitions now govern independent producer/consumer implementation.

The ticket-level cross-check remains useful as supporting detail:

1. Use 24 for the first viewer's purpose: a regional read-only view of **already applied** save contents. Keep the later editor bar 08 outside this cut.
2. Compose data 42, membership 43, admission 44 and lifecycle 45; 46 records their decision closure. Read their full acceptance clauses, not just the one-line Answers.
3. Add adapter 18, camera 21, representation 48–50, shared visibility 51, readout 52 and teardown 53. Use supply 40 and the fidelity/corpus evidence as constraints.
4. Implement the exact integration definitions in the global package above. The historical readiness gaps are closed by specification, not permission to reopen settled product choices.
5. Carry the required evidence into implementation 60 and the still-open acceptance checks 54–56, followed by delivery 58. Controlled release 57 does not substitute for those checks.

## Precedence and scope

- **First-viewer contracts govern the first viewer.** Node 08's whole-save entry, selection pivot, nav cube, gizmos, interior opacity, rest-of-save and different shell ceilings describe the later editor bar. They do not override regional membership, one shared 8,000 admission cap or read-only observation.
- **Source-native extract over 2D reconstruction.** Older research describes current map pixels/yaw, Height-view floored clearances, a 4 m Cut fallback and dropped tangents. Contract 42 requires the separate save-native extract, honest sizeKind and volumeOffsetM. Never copy those 2D shortcuts into physical 3D geometry.
- **Settled budget over draft measurements.** Research retains 14,000 as a draft alternative and selection-based wording. Tickets 25/43/44 settle a limit of 8,000 *unique regional occupants*, independently of Selection, category filters and hiddenIndices; hiddenClasses remain excluded. 8,000 enters; 8,001 refuses before scene buffers or replacing 2D.
- **Silhouette is not evidence of a true shell.** An original recognizable form cannot turn a clearance reserve into measured machine geometry. Unknown-size actors remain locations plus uncertainty. The global spec and initial kit now make the relationship between forms and reserves explicit.
- **Decision closure is not validation.** “Specced” on these nodes only associates a document with a resolved decision. Root/strands and open nodes 60, 54–56, 58 remain open. Node 59 is open for real modded-save validation. Node 61 is open for missing/free-form geometry investigation and tracked model refinement. Neither is completed by a spec association.
- **Historical evidence is dated.** Source research and probes were not rerun by this documentation task. Current generated tables and fixture files are available locally, although older notes say the generated tree had not been unpacked at their survey date.

## Existing and pending work

The [2.5D first-cut spec](2-5d-first-cut.md) remains separate and unchanged. Its leftover implementation/ship obligations are not silently folded into the regional viewer. Terrain study 29 is optional and nonblocking. Picking 26, scene Z/edit controls 22–23 and edits 27 remain after delivery 58. The integration closure adds a four-phase implementation plan plus mandatory final smoke; it creates no external issues.

See the [readiness review](viewer-readiness-review.md) for owning code, concrete integration gaps and the distinction between documentation checks and unrun runtime acceptance.

