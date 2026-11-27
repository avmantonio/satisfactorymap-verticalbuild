# Free-form and missing 3D shapes
Level: theme
Kind: ticket
Parent: 85
Status: open

## Objective

Recover the deferred investigation for objects whose 2D projection does not establish their 3D form, and whose save pose or available metadata does not describe that form. Do not infer a solid from a flat footprint or equate missing shape with missing pose or dimensions.

## Remaining work

- Inventory affected classes/families against the existing proxy catalog and representative saves; identify what comes from the save, table, 2D projection, or remains unavailable.
- Investigate whether legitimate source data can describe the form. Save-native spline geometry remains governed by 42/49; this research concerns the shapes that those records do not supply.
- Specify an honest initial simplified representation for each supported family where evidence allows one, and keep its limitations visible. With no supported dimensions, preserve location and uncertainty under 50; do not invent physical dimensions or silently extrude the 2D projection.
- Record a per-family follow-up backlog to refine the initial form with original simplified models recognizable against the original object. Asset provenance remains governed by 40; official meshes are not shipped.
- Separate shape uncertainty from sizeKind: a known box or clearance reserve is not evidence of the true shell.

## Completion

A referenced class/family inventory, evidence of available/missing geometry, initial fallback decisions and explicit refinement tasks exist. A generic unknown marker or the statement that approximations are allowed does not complete this investigation. If refinement is deferred, its remaining scope stays tracked as open work rather than being silently closed with this ticket.

## Scope and dependencies

Related: [Proxy catalog](28-proxy-modeling.md), [Family silhouettes](48-family-silhouettes.md), [Reserve volumes](50-reserve-volumes.md), [Asset supply](40-asset-supply.md), [Implementation](60-regional-viewer-implementation.md). Research can proceed in parallel; absent forms must not be described as delivered. This ticket does not reopen the agreed renderer or the regional read-only scope.

## Origin

User correction, 2026-11-26: this investigation and later simplified-model refinement were deferred, not approved or completed.

## Approved clarification — 2026-11-26

The first viewer may include provisional representations while research 61 remains open: an evidence-supported simplified form where available, a labeled neutral reserve where only clearance is known, or location plus uncertainty when dimensions are unsupported. Recognizable silhouettes are required for families with an available simplified model; other families remain explicitly pending coverage in 61. Unknown scale overrides every volumetric fallback under 42/43. Agreement on these rules does not complete the class inventory, research or later refinement with original simplified models.

Status remains open. User approval settles the provisional-coverage policy, not the outstanding research or model production.
