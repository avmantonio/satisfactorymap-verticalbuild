# v0.1.7

Creature spawners on the map, a calmer first load, saves loadable straight
from a URL — and under the hood, the map's world data now regenerates from
the game's own files.

## New

- **Creature spawners on the map.** A new Spawners category pins every
  creature spawn point on the planet — Hogs, Crab Hatchers, Stingers and
  Spitters as toggleable families, plus Lizard Doggos, Flightless Birbs and
  the Space Giraffe-Tick-Penguin-Whale Thing — about 2,800 pins, each with
  the game's own creature icon. The data comes from the game's level files
  (a save never records which creature a spawner spawns), so it's identical
  on every save.
- **A calmer first load.** The world layers — resource nodes, resource
  wells, collectables, spawners, and dropped items — now start hidden, so
  loading a save shows your factory instead of thousands of pins. Switching
  any of them on is remembered like every other filter choice.
- **Load a save from a URL.** Append `?url=<address-of-a-save>` to the map's
  address and the file downloads straight into your browser (with progress)
  and parses as usual — so a dedicated server's autosave can be shared as a
  plain link. The save never passes through this site's servers; the host
  must allow cross-origin (CORS) requests, and failures say so.
- **Every solid resource node now reads as an ore.** The game names only
  some ores with the suffix (Iron Ore, but bare Uranium / Bauxite /
  Limestone / Coal...); the Resource Nodes list now shows Uranium Ore,
  Bauxite Ore, Limestone Ore and friends consistently. Crude Oil and
  Geysers stay as they are.

## UI fixes

- **Pipe bottleneck warnings are now scoped like belt ones.** A Mk2 pipe
  feeding two Mk1 pipes through a junction no longer warns — the detector
  follows the pipe line and stops at junctions that actually split or merge
  the flow (junctions used as plain couplings don't cut the line, so a Mk1
  segment inside a Mk2 run is still flagged).
- Turning a whole sidebar group on or off is now remembered as exactly that:
  group toggles persist at the group level instead of as per-row states.
- Lift-placed splitters and mergers fold into their base attachment rows
  (the "... on Lift" variants), and Power Lines are one row — searchable —
  instead of two.
- Brighter, higher-contrast colors for belts/pipes/wires at full zoom-out.
- Updating the site can no longer leave your browser running the previous
  build's parser: every asset is now content-hash versioned, so a refresh
  always picks up the new code.

## Under the hood

- All static world tables (power slugs, somersloops, mercer spheres, crash
  sites, dropped items, resource-node purity) now regenerate from the
  game's own level data via a one-command pipeline — validated 1:1 against
  the previous tables, and recovering two dropped-item pickups and one
  resource node the old data missed. Extracted the same way: the spawner
  and creature-name/icon tables behind the new Spawners category (all 159
  Lizard Doggo spawns included), plus consumable plants as groundwork.

## Checksums (SHA-256)

```
{CHECKSUMS}
```
