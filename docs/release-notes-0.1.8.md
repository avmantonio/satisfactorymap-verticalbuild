# v0.1.8

Update 8 saves open, your tamed doggos are on the map, the search bar finds
layers and not just things, and a bottleneck warning finally shows you which
belt it means.

## New

- **Update 8 saves open — experimental.** Saves from Update 8 (save version
  42) load and map like 1.0/1.1 ones: the handful of places the file layout
  changed at 1.0 — the save name in the header, the per-level version field,
  the flags on every actor, and the collectables list at the end of the
  persistent level — are now read according to the save's own version.
  Verified on a 6 GB Update 8 save of 5.4 million objects, with the whole
  1.0/1.1 test suite still passing. Two things to know: the versions
  *between* U8 and 1.0 (43–51) are refused outright rather than guessed at,
  with a message saying so; and an Update 8 save is **view-only** — the save
  editor only knows how to write 1.0-format records, so it declines to edit
  one rather than hand you a file the game would refuse to load. Everything
  else — the map, search, tooltips, the progression view — works as usual.
- **Tamed Lizard Doggos on the map.** A doggo you've tamed is a permanent,
  hand-fed part of your world, so it now gets a pin of its own — the same
  species artwork the spawners use, wearing a heart so it can't be mistaken
  for one, and labelled "Lizard Doggo (Tamed)" in the sidebar and in its
  tooltip. Wild doggos are deliberately not plotted: one only exists in a
  save because you happened to be standing near it when you saved, and it
  despawns the moment you walk away, so a pin would promise a doggo that
  isn't really there. Where the wild ones live is the Spawners layer's job.
- **The search bar finds layers, not just items and buildings.** Four new
  kinds of result, each opening the same panel a building does — a count, a
  breakdown, and "Show only this on map":
  - **Ore nodes and resource wells.** "Iron Ore (Resource Node)" tells you
    how many exist, how many are still untapped, and how they split across
    Pure / Normal / Impure — in the map's own purity colours. Kept clearly
    apart from the ore *item* of the same name, which is still there too.
  - **Creature spawners**, by species, with the count of spawn points.
  - **Tamed creatures**, with how many you have.
  - **Conveyor Belts, Conveyor Lifts and Pipelines** as whole categories,
    each with a per-tier breakdown — so "am I still running Mk.1 belts
    anywhere?" is one search away. Their rows are scattered across the
    build-menu subcategories, so there was no single toggle for them before.
- **Middle-click hides whatever is under the cursor** — the same per-object
  hide the right-click menu offers, in one gesture, for digging a machine out
  from under the roof covering it. "Restore N hidden objects" in the sidebar
  undoes them all.
- **Ctrl+F jumps to the search box**, and focusing or clicking it selects
  whatever is already typed, so the next keystroke replaces the old query
  instead of appending to it.

## UI fixes

- **Bottleneck warnings now show the whole line.** Marking a belt line's slow
  segments used to drop a lone warning pin and leave you to work out which
  belt it meant. The whole run is now traced in amber with its limiting
  segments in red — conveyor *lifts* included, which are drawn as structures
  rather than belts and are very often the slow link — and each warning pin
  sits at the middle of its segment instead of on the joint it shares with
  its neighbour, so there's no guessing which of two belts is being blamed.
  The altitude filter also widens to cover the line while the markers are up
  (and goes back to where you had it afterwards): the slow belt is routinely
  a floor or two away from the one you were inspecting, and used to be
  filtered out of sight along with the warning itself.
- **Creatures no longer clutter the item search.** Hogs, Spitters, Stingers
  and friends were listed among Iron Plate and Screws — 21 entries that are
  animals, not things you can hold, and the only ones with no icon at all.
  Searching "hog" now finds Hog Remains, the Silver Hog Statue, and the hog
  spawners.
- **Every spawner species has a distinct name.** Two different Forest Spitter
  variants shared one name, showing as two identical rows in the sidebar with
  no way to tell which was which; species are now named from the same table
  the rest of the map uses, which distinguishes them ("Alpha Red Forest
  Spitter"). A few species read slightly differently as a result.
- **Crude Oil nodes and oil wells are independent layers again.** Both were
  filed under the same internal key, so hiding one hid the other, and a
  remembered filter choice for one was silently applied to the other.

## Under the hood

- The spawner-name and item-catalog rules are now pinned by tests: species
  names must be unique and hand-curated, and no creature may reach the item
  search under either of the two names the code knows it by (that check
  immediately caught a Crab Hatcher that had been missed).

## Checksums (SHA-256)

```
{CHECKSUMS}
```
