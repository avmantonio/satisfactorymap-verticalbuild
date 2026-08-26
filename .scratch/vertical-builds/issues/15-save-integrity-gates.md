# Save integrity gates

Type: grilling
Status: resolved
Strand: save-integrity — Save integrity
Blocked by: 07

## Question

After a Height-view isolation plus existing copy/paste/delete, what evidence is enough that the `.sav` is not corrupt?

Today: byte-splice + re-parse; undo from pristine; do not synthesize `FGConveyorChainActor` ([Relocate semantics](07-relocate-semantics.md), `docs/chained-belt-delete.md`). That is a prohibition, not a gate list.

Decide the gates this spec requires before the first ship:

1. **Re-parse only** — editor already re-parses after every op; fail the op if parse fails. No extra fixture.
2. **Re-parse + automated round-trip** — fixture save(s) with stacked floors: isolate, copy, paste, delete, undo; parser accepts; actor counts and bounds match a snapshot. CI on `sav_core`.
3. **Re-parse + round-trip + load-in-game** — someone loads the edited `.sav` in Satisfactory at least once per release (manual). Automated gates as in 2.

Also: is a dedicated stacked-floor fixture required (`tools/fetch_test_saves.py` / gitignored `.sav`), or do existing test saves suffice?

Independent oracle (optional, not the engine): `@etothepii/satisfactory-file-parser` can round-trip `.sav` to JSON. Use as a second parser check on fixtures, or stay `sav_core`-only. It also reads `.sbp`; that does **not** make the game blueprint this map’s Build package ([Transfer artifact](03-transfer-artifact.md), [Survey 3D fork options](17-survey-3d-fork-options.md)).

Recommend: **2** as the spec gate; **3** as first-ship smoke (human), not CI. `sav_core` remains the engine; etothepii is an optional fixture oracle, not a second writer. The gate is “parser still accepts and undo restores,” not a new belt model.

## Answer

Spec gate is `sav_core` CI: isolate with today’s occupancy plus a Z window, then copy, paste, delete, undo; parser accepts; occupant counts and bounds match a fixture snapshot; undo restores payload to pristine. wasm OOM on a 600k save is Runtime limits, not this gate. First-ship smoke is one in-game load of that edited `.sav` (human, not CI). `All_080726` is the fixture unless it lacks two floors in the same XY — then add a gitignored stacked save via `fetch_test_saves.py`. etothepii is an optional oracle, not a second writer and not CI. No new belt model; no chain-actor surgery.
