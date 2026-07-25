# v0.1.7

Load saves straight from a URL, sturdier sidebar filtering, consistent ore
labels — and under the hood, the map's world data now regenerates from the
game's own files.

## New

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

- **Copying on very large saves no longer crashes the editor.** On saves
  above roughly a gigabyte of decompressed data, any copy/paste could die
  with "Edit failed: unreachable" in the browser: growing the save to fit
  the copied objects briefly needed twice the save's memory, blowing the
  browser's 4 GB WebAssembly limit. Small and medium copies now grow the
  save in place (built-in headroom); bigger ones rebuild through a
  compressed snapshot without ever leaving the session, and only when even
  that wouldn't fit under the 4 GB limit does the editor rebuild in a
  fresh worker and re-apply your edits — a progress bar instead of a
  crash, and the paste lands applied.
- **Copy a build from one save into another — right in the browser.** Copy,
  load the other save (same tab), paste. Copies up to 50,000 objects also go
  through the OS clipboard, so they paste in another browser tab too; bigger
  copies stay inside the tab — mirroring them onto the OS clipboard could
  stall the whole machine — so for those, cross-save means the same-tab flow
  above. Above 150,000 objects the browser refuses the copy outright
  (nothing is copied — a selection that size can't paste reliably inside
  the browser's 4 GB limit) and points at the desktop app, which has no
  such limits.
- **Hypertube entrances are back on the map** — and with them, copies of
  daisy-chained builds keep their power wires. Entrances were treated as
  line-only geometry, but an entrance with its default tube shape carries no
  spline in the save, leaving it invisible and unselectable — so wires
  between chained entrances could never travel with a copy. They now render
  as regular powered buildings again.
- **Power lines are selectable** — they highlight in box selections and can
  be deleted individually. For move and copy they act as riders: a wire
  travels exactly when both the things it connects travel, so a selected
  wire can never be dragged off a pole or pasted dangling.
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
  resource node the old data missed. New groundwork tables extracted the
  same way: every creature spawner on the map (all 159 Lizard Doggo spawns
  included), crab hatcher locations, consumable plants, and the official
  creature names with icons.

## Checksums (SHA-256)

```
{CHECKSUMS}
```
