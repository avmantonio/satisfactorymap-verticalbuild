"""Extract every creature spawner on the map -- world position + spawned
creature class -- into game_data/generated/creatureSpawners.json.

Reads the FModel-style JSON export of the game paks (the same extraction dump
extract_game_phases.py and copy_icons.py read): the world-partition cell
exports under <Content>/FactoryGame/Map/GameLevel01/ carry each placed
BP_CreatureSpawner_C actor with its per-instance mCreatureClass and its root
CollisionCapsule's world position.

Why game files and not a save: every save contains all ~2,277 spawner actors
(they are world actors, present regardless of exploration), but a save does
NOT say which creature a spawner spawns -- the save-side SpawnData "creature"
reference only points at a live creature instance while one is streamed in
near a player, so classifying from saves comes out nearly empty in practice.
The cooked level data's mCreatureClass is the static truth.

Also writes game_data/generated/creatures.json: official display name + icon
per creature class. The class-to-name join comes from the FGCreatureDescriptor
assets in the same dump (<Content>/FactoryGame/Character/Creature/
CreatureDescriptors/): each descriptor carries mCreatureClass and an
mDisplayName that is a key into the World_Data string table. The display
strings come from that table's source CSV
(<Content>/Localization/StringTables/World_Data.csv) -- the game's own
English strings, including quirks like the Space Giraffe's actual in-game
name "Unknown File Error #6265616e". Creatures are not in docs.json at all
(they have no item/build descriptor), which is why this reads the FModel
dump instead. If the CSV is absent from the dump, names degrade to strings
derived from the localization keys, with warnings.

NOTE for dump refreshes: the StringTables CSVs are loose files in
FactoryGame-Windows.pak, NOT assets in the .utoc -- FModel shows them in the
same tree but a normal package export skips them. Also select
FactoryGame/Content/Localization/StringTables and use FModel's raw-data
export (same output layout, the two containers share one path tree).

    py game_data/extractors/extract_spawners.py [path/to/extraction/.../Content]

Re-run whenever the extraction dump is refreshed (new game patch).

Shapes:
  creatureSpawners.json  {creatureShortClass|"unknown": {instancePathName: [x,y,z]}}
  creatures.json         {creatureShortClass: {"displayName": str, "icon": assetPath|null}}

- creatureShortClass: e.g. "Char_SpaceRabbit_C" (the lizard doggo); "unknown"
  collects spawners whose export carries no mCreatureClass.
- instancePathName: "Persistent_Level:PersistentLevel.<ActorName>" -- the
  same identity the save's spawner actor headers use (verified an exact
  1:1 name match against a save's 2,277 spawner actors, suffixed names
  like BP_CreatureSpawner1002_99 included).
- [x,y,z]: world position in centimeters (the game's native units).
"""

import csv
import json
import os
import re
import sys
from collections import Counter

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_CONTENT_ROOT = r"C:\Users\plane.DESKTOP-SAH3OHV\Documents\SatisExtract\FactoryGame\Content"
LEVEL_SUBDIR = os.path.join("FactoryGame", "Map", "GameLevel01")
DESCRIPTORS_SUBDIR = os.path.join("FactoryGame", "Character", "Creature", "CreatureDescriptors")
# Loose file from the pak, exported raw via FModel (see docstring NOTE);
# lives under Content/Localization/, not Content/FactoryGame/.
WORLD_DATA_CSV = os.path.join("Localization", "StringTables", "World_Data.csv")
OUTPUT_DIR = os.path.join(REPO_ROOT, "game_data", "generated")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "creatureSpawners.json")
NAMES_OUTPUT_PATH = os.path.join(OUTPUT_DIR, "creatures.json")

CLASS_NAME_PATTERN = re.compile(r"'([^']+)'$")  # "BlueprintGeneratedClass'Char_Hog_C'"

# Creatures with neither an FGCreatureDescriptor nor any World_Data
# localization entry -- genuinely unnamed in-game, so these fallback names
# (and icon reuse) are ours: {class: (displayName, iconAssetPath|None)}.
NO_DESCRIPTOR_NAMES = {
    # Spawner-placed, no descriptor, no icon anywhere.
    "Char_Beetle_C": ("Beetle", None),
    # World actor like the small hatcher (151 placed vs 398), but the game's
    # single hatcher descriptor/string ("Tropical Crab Hatcher") covers only
    # Char_CrabHatcher_C; the icon genuinely depicts both.
    "Char_BigCrabHatcher_C": ("Big Crab Hatcher",
                              "/FactoryGame/Character/Creature/CreatureDescriptors/UI/IconDesc_Hatcher_256"),
}


def shortClassName(objectField):
    """{"ObjectName": "BlueprintGeneratedClass'Char_Hog_C'"} -> "Char_Hog_C"."""
    if not objectField:
        return None
    match = CLASS_NAME_PATTERN.search(objectField.get("ObjectName", ""))
    return match.group(1) if match else None


def rootPosition(obj, exports):
    """World position from the actor's root component (same-file export index)."""
    rootRef = (obj.get("Properties") or {}).get("RootComponent")
    if not rootRef:
        return None
    try:
        index = int(rootRef["ObjectPath"].rsplit(".", 1)[1])
        location = exports[index].get("Properties", {}).get("RelativeLocation")
    except (KeyError, IndexError, ValueError):
        return None
    if location is None:  # omitted when default -- an actor exactly at origin
        return [0.0, 0.0, 0.0]
    return [location["X"], location["Y"], location["Z"]]


def iterLevelExports(levelRoot):
    """Yield the parsed export list of every level JSON that can contain
    spawners (cheap byte pre-filter before the expensive json parse)."""
    for dirPath, _, fileNames in os.walk(levelRoot):
        for fileName in fileNames:
            if not fileName.endswith(".json"):
                continue
            path = os.path.join(dirPath, fileName)
            with open(path, "rb") as f:
                raw = f.read()
            if b"Spawner" not in raw:
                continue
            exports = json.loads(raw)
            if isinstance(exports, list):
                yield path, exports


def extractSpawners(contentRoot):
    levelRoot = os.path.join(contentRoot, LEVEL_SUBDIR)
    if not os.path.isdir(levelRoot):
        raise SystemExit(f"Level export dir not found: {levelRoot}")

    spawners = {}  # creatureShortClass -> {pathName: [x,y,z]}
    otherSpawnerTypes = Counter()
    missingPosition = []
    for path, exports in iterLevelExports(levelRoot):
        for obj in exports:
            objType = obj.get("Type", "")
            if "Spawner" not in objType:
                continue
            if "CreatureSpawner" not in objType:
                otherSpawnerTypes[objType] += 1
                continue
            outer = (obj.get("Outer") or {}).get("ObjectName", "")
            levelIdentity = outer.removeprefix("Level'").removesuffix("'")
            pathName = f"{levelIdentity}.{obj['Name']}"
            creature = shortClassName((obj.get("Properties") or {}).get("mCreatureClass")) or "unknown"
            position = rootPosition(obj, exports)
            if position is None:
                missingPosition.append(pathName)
                continue
            existing = spawners.setdefault(creature, {})
            if pathName in existing and existing[pathName] != position:
                print(f"WARNING: {pathName} appears twice with different positions "
                      f"({existing[pathName]} vs {position}, latest kept from {path})")
            existing[pathName] = position
    return spawners, otherSpawnerTypes, missingPosition


def iconAssetPath(objectField):
    """Icon ObjectPath -> the asset-path form items.json/copy_icons.py use:
    /Game/Foo/Bar.0 -> /Foo/Bar (the /Game prefix and export index stripped)."""
    if not objectField:
        return None
    path = objectField.get("ObjectPath", "")
    return path.removeprefix("/Game").rsplit(".", 1)[0] or None


def derivedNameFromKey(locKey):
    """Last-resort readable name when the pak's string table is unavailable
    or lacks the key: "Creatures/Spitter/Desert/Small" -> "Small Desert
    Spitter" (segments reversed)."""
    segments = [s for s in locKey.split("/") if s and s != "Creatures"]
    return " ".join(reversed(segments)) or locKey


def loadDisplayStrings(contentRoot):
    """World_Data string-table source CSV -> {key: officialEnglishString};
    {} with a warning when the CSV isn't in the dump."""
    path = os.path.join(contentRoot, WORLD_DATA_CSV)
    if not os.path.isfile(path):
        print(f"WARNING: {path} not found (export it raw from the pak with "
              f"FModel, see docstring); falling back to names derived from "
              f"localization keys")
        return {}
    with open(path, encoding="utf-8-sig", newline="") as f:
        rows = csv.reader(f)
        header = next(rows)
        keyCol, valueCol = header.index("Key"), header.index("SourceString")
        return {row[keyCol]: row[valueCol] for row in rows if len(row) > max(keyCol, valueCol)}


def extractCreatureNames(contentRoot, displayStrings):
    """FGCreatureDescriptor assets -> {creatureShortClass: {displayName, icon}}."""
    descriptorsDir = os.path.join(contentRoot, DESCRIPTORS_SUBDIR)
    creatures = {}
    for fileName in sorted(os.listdir(descriptorsDir)):
        if not (fileName.startswith("Desc_") and fileName.endswith(".json")):
            continue
        with open(os.path.join(descriptorsDir, fileName), encoding="utf-8") as f:
            exports = json.load(f)
        for obj in exports:
            props = obj.get("Properties") or {}
            if "mDisplayName" not in props:
                continue
            creature = shortClassName(props.get("mCreatureClass"))
            if creature is None:  # e.g. the hatcher descriptor: class only via scan target
                scanTarget = (props.get("mClassToScanFor") or {}).get("AssetPathName", "")
                creature = scanTarget.rsplit(".", 1)[-1] or None
            if creature is None:
                print(f"WARNING: {fileName}: descriptor without a resolvable creature class")
                continue
            locKey = (props.get("mDisplayName") or {}).get("Key", "")
            displayName = displayStrings.get(locKey)
            if displayName is None:
                displayName = derivedNameFromKey(locKey)
                if displayStrings:
                    print(f"WARNING: {locKey!r} ({creature}) missing from World_Data, "
                          f"derived {displayName!r}")
            creatures[creature] = {
                "displayName": displayName,
                "icon": iconAssetPath(props.get("mPersistentBigIcon")),
            }
    return creatures


def main():
    contentRoot = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_CONTENT_ROOT
    spawners, otherSpawnerTypes, missingPosition = extractSpawners(contentRoot)

    displayStrings = loadDisplayStrings(contentRoot)
    creatures = extractCreatureNames(contentRoot, displayStrings)
    # Classes without a descriptor still deserve a name row (whether
    # spawner-placed like the Beetle or free world actors like big hatchers).
    for creature, (displayName, icon) in NO_DESCRIPTOR_NAMES.items():
        if creature not in creatures:
            creatures[creature] = {"displayName": displayName, "icon": icon}
    for creature in spawners:
        if creature not in creatures and creature != "unknown":
            print(f"WARNING: spawned creature {creature} has no descriptor and no "
                  f"fallback display name")
    creatures = dict(sorted(creatures.items()))
    with open(NAMES_OUTPUT_PATH, "w", encoding="utf-8", newline="\n") as f:
        json.dump(creatures, f, ensure_ascii=False, indent=1)
        f.write("\n")

    ordered = {
        creature: dict(sorted(spawners[creature].items()))
        for creature in sorted(spawners)
    }
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8", newline="\n") as f:
        json.dump(ordered, f, ensure_ascii=False, indent=1)
        f.write("\n")

    total = sum(len(v) for v in ordered.values())
    print(f"wrote {OUTPUT_PATH}")
    print(f"wrote {NAMES_OUTPUT_PATH} ({len(creatures)} creatures)")
    print(f"{total} creature spawners:")
    for creature, entries in sorted(ordered.items(), key=lambda kv: -len(kv[1])):
        displayName = creatures.get(creature, {}).get("displayName", "?")
        print(f"{len(entries):6}  {creature}  ({displayName})")
    if missingPosition:
        print(f"WARNING: {len(missingPosition)} spawners skipped (no resolvable "
              f"root position): {missingPosition[:5]}{'...' if len(missingPosition) > 5 else ''}")
    if otherSpawnerTypes:
        skipped = ", ".join(f"{t} x{n}" for t, n in otherSpawnerTypes.most_common())
        print(f"(other *Spawner* actor types in the level data, not extracted: {skipped})")


if __name__ == "__main__":
    main()
