# Modded save
Level: theme
Kind: ticket
Parent: 80
Status: open

Related strand spec: .scratch/vertical-builds/specs/viewer-strand-regional-viewer.md

## Question

Which real modded save, already fetched or named as a gap, covers an unknown or mod class so the baseline corpus can show a class that is not vanilla FactoryGame?

Do not invent a filename. Fixture discovery can proceed before the viewer exists; integrated validation requires implementation 60.

## Answer

No fetched modded save is available. The local corpus contains `All_080726-163150.sav`, `solo_autosave_1.sav`, `BuildITBIIIIIG_210726-231135.sav`, and `belt_item_state.sav`; the first three are the representative corpus named in [Representative cases](32-representative-cases.md), which records that none sets `isModdedSave`. `belt_item_state.sav` is the equipment-state fixture, not a modded-save claim. Keep a real modded save as a corpus gap until one is supplied or added to the fetch manifest. No filename or mod class is inferred.

## Comments

Reopened 2026-11-26 after user correction. Acknowledging an absent fixture did not complete this task. Modded-save compatibility has not been tested or approved.

## Remaining work and completion

- Obtain or identify a real modded save with provenance and the relevant mod/class list; record availability honestly while unavailable.
- Check parsing, unknown/mod class retention and honest fallback representation.
- Once 60 exists, exercise a modded region in the viewer: admission, pose, missing geometry, filters and return to 2D. Record observed results and failures.
- Close only with recorded evidence or an explicit user decision to defer or exclude coverage. The existing gap document is preserved as historical evidence, not a passing result. This remains parallel to implementation, without claiming mod compatibility.
