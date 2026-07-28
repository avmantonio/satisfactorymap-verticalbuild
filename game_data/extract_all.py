"""One-shot refresh of every game-derived artifact after a game update.

Runs the scripts under game_data/extractors/ in dependency order, fed by the
two inputs a game update changes:

 1. docs.json -- the game's own reflection dump, straight from the install:
        <install>\\CommunityResources\\Docs\\en-US.json
    (copied to game_data/docs.json, which the extractors read).

 2. The FModel extraction dump ("Content" folder). One shared path tree, but
    it mixes TWO different archives, and exports from BOTH are required:

    - .utoc/.ucas (cooked assets). FModel: right-click
      FactoryGame/Content/FactoryGame -> "Save Folder's Packages Properties
      (.json)" AND "Save Folder's Packages Textures". Provides GamePhases,
      the creature descriptors, the Map/GameLevel01 world cells (spawners,
      collectibles, resource nodes), the sliced map render, and every icon
      PNG.

Most steps write to the gitignored game_data/generated/;
extract_collectables.py instead rewrites the COMMITTED world tables under
game_data/sav_data/ (slugs, somersloops, mercer spheres, crash sites,
dropped items, resource purity), and extract_world_bounds.py the committed
worldBounds.json (the damaging map perimeter and the water limit) -- review
their git diffs after a game update.
    - .pak (loose files -- a normal package export SKIPS these). FModel:
      right-click FactoryGame/Content/Localization/StringTables -> "Export
      Folder's Packages Raw Data". Provides the string-table source CSVs
      (official display strings, e.g. creature names in World_Data.csv).

    Both land in the same <...>/FactoryGame/Content/... layout, so one dump
    directory holds them all; the preflight below tells you exactly which
    export you forgot if something is missing.

Usage:
    py game_data/extract_all.py [path\\to\\en-US.json] [path\\to\\extraction\\Content] [--pack]

Both paths optional: without the first, the existing game_data/docs.json is
used as-is; without the second, the default extraction location. --pack also
refreshes game_data.zip (package_game_data.py pack) at the end.
"""

import os
import shutil
import subprocess
import sys

GAME_DATA_DIR = os.path.dirname(os.path.abspath(__file__))
EXTRACTORS_DIR = os.path.join(GAME_DATA_DIR, "extractors")
DOCS_JSON = os.path.join(GAME_DATA_DIR, "docs.json")
DEFAULT_CONTENT_ROOT = r"C:\Users\plane.DESKTOP-SAH3OHV\Documents\SatisExtract\FactoryGame\Content"

# (required path relative to the Content root, which FModel export produces it)
UTOC_JSON = 'right-click FactoryGame/Content/FactoryGame -> "Save Folder\'s Packages Properties (.json)"'
UTOC_TEXTURES = 'right-click FactoryGame/Content/FactoryGame -> "Save Folder\'s Packages Textures"'
PAK_RAW = ('right-click FactoryGame/Content/Localization/StringTables -> '
           '"Export Folder\'s Packages Raw Data" (loose .pak files -- package exports skip these)')
PREFLIGHT = (
    (os.path.join("FactoryGame", "GamePhases"), UTOC_JSON),
    (os.path.join("FactoryGame", "Character", "Creature", "CreatureDescriptors"), UTOC_JSON),
    (os.path.join("FactoryGame", "Map", "GameLevel01"), UTOC_JSON),
    (os.path.join("FactoryGame", "Interface", "UI", "Assets", "MapTest", "SlicedMap"), UTOC_TEXTURES),
    (os.path.join("Localization", "StringTables", "World_Data.csv"), PAK_RAW),
)

# (script, needs the content root as argument) -- dependency order:
# extract_docs_json and extract_spawners write the generated JSONs that
# copy_icons reads to know which PNGs to pull.
STEPS = (
    ("extract_docs_json.py", False),
    ("extract_game_phases.py", True),
    ("extract_spawners.py", True),
    ("extract_collectables.py", True),
    ("extract_world_bounds.py", True),
    ("extract_map_image.py", True),
    ("copy_icons.py", True),
)


def preflight(contentRoot):
    problems = []
    if not os.path.isfile(DOCS_JSON):
        problems.append(f"  {DOCS_JSON}\n    -> copy it from <install>\\CommunityResources\\Docs\\en-US.json")
    for relPath, source in PREFLIGHT:
        if not os.path.exists(os.path.join(contentRoot, relPath)):
            problems.append(f"  {os.path.join(contentRoot, relPath)}\n    -> FModel: {source}")
    if problems:
        print("Missing inputs -- nothing was run:\n" + "\n".join(problems))
        sys.exit(1)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    pack = "--pack" in sys.argv
    docsSource = None
    contentRoot = DEFAULT_CONTENT_ROOT
    for arg in args:
        if arg.lower().endswith(".json"):
            docsSource = arg
        else:
            contentRoot = arg

    if docsSource:
        if not os.path.isfile(docsSource):
            sys.exit(f"docs.json source not found: {docsSource}")
        if os.path.abspath(docsSource) != os.path.abspath(DOCS_JSON):
            shutil.copyfile(docsSource, DOCS_JSON)
            print(f"copied {docsSource} -> {DOCS_JSON}")

    preflight(contentRoot)

    steps = list(STEPS) + ([("../package_game_data.py", None)] if pack else [])
    for i, (script, needsContent) in enumerate(steps, 1):
        if needsContent is None:
            command = [sys.executable, os.path.join(GAME_DATA_DIR, "package_game_data.py"), "pack"]
            name = "package_game_data.py pack"
        else:
            command = [sys.executable, os.path.join(EXTRACTORS_DIR, script)]
            if needsContent:
                command.append(contentRoot)
            name = script
        print(f"\n=== [{i}/{len(steps)}] {name} ===", flush=True)
        result = subprocess.run(command)
        if result.returncode != 0:
            sys.exit(f"\n{name} failed with exit code {result.returncode}; aborting.")
    print("\nAll game data regenerated.")


if __name__ == "__main__":
    main()
