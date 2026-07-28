# game_data/

Everything the app knows about Satisfactory that does not come out of a save.

**One rule: if a script wrote it, it is not in git.**

| Folder | In git? | What |
|---|---|---|
| `curated/` | **yes** | Hand-maintained inputs. No script generates these — a person edits them. |
| `generated/docs/` | no | Extracted from the game's `Docs.json` (items, recipes, buildings, schematics, categories, game phases). |
| `generated/world/` | no | Extracted from the FModel level-export dump (resource nodes, slugs, somersloops, mercer spheres, crash sites, dropped items, creature spawners, caves, the world perimeter and water limit). |
| `generated/` (root) | no | The fused map render and its tile pyramid. |
| `../map/static/map/icons/` | no | Icon PNGs, extracted the same way — outside this folder only because the site serves them. |

So there are exactly two ways to get a working checkout:

```bash
py game_data/extract_all.py            # you have the game installed + an FModel dump
py game_data/package_game_data.py unpack game_data.zip   # you don't
```

The Rust crate `include_str!`s these tables, so **it will not compile until one
of those has run** — that is intentional, not a bug to work around.

## Why the split

`generated/` is game-derived data: it belongs to Coffee Stain Studios and is
not redistributed in this repository (see [NOTICES.md](../NOTICES.md)). Keeping
it entirely out of git also means a game update never shows up as a five-figure
diff, and there is no way for a committed table to drift from what the
extractors actually produce — the failure mode the old layout had, where half
the generated tables were committed and half were not.

`docs/` and `world/` are split because they have different inputs and different
regeneration costs: `docs/` needs one file copied out of the game install,
`world/` needs a multi-gigabyte FModel export with three separate export modes
(`extract_all.py` preflights them and tells you which one you forgot).

## The curated files

| File | What it is |
|---|---|
| `readableNameCorrections.json` | Class name → the name a human should see, where the game's own is wrong, missing or ambiguous. |
| `typePaths.json` | The class lists the parser keys behavior off (belts, miners, power lines, crash sites). |
| `categoryLabels.json`, `categoryOverrides.json` | Build-menu category naming and per-class overrides for the sidebar tree. |
| `pickupItems.json` | Which item each of the 703 world pickups holds. FModel cannot decode the cooked `FInventoryItem` struct, so this is the one world fact no extraction recovers; `extract_collectables.py --items-from-save some.sav` learns new entries from a save and writes them back here. |

Every table's shape is documented where it is produced: `SCHEMA.md` for
`generated/docs/`, the header comment of each script in `extractors/` for the
rest.
