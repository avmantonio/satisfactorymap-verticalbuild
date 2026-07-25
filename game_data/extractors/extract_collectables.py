"""Regenerate the world-collectible tables in game_data/sav_data/ from the
FModel extraction dump -- replaces the original workflow that derived them
from GreyHak's sat_sav_parse tables / a fully-revealed save.

Sources, all in the world-partition level exports under
<Content>/FactoryGame/Map/GameLevel01/ (each placed actor carries its class,
per-instance properties, and its root component's world transform):

  powerSlugs.json        BP_Crystal_C / _mk2_C / _mk3_C  (blue/yellow/purple)
  somersloops.json       BP_WAT1_C
  mercerSpheres.json     BP_WAT2_C
  crashSites.json        BP_DropPod_C
  freeDroppedItems.json  FGItemPickup_Spawnable
  resourcePurity.json    BP_ResourceNode_C / BP_FrackingSatellite_C /
                         BP_ResourceNodeGeyser_C (mResourceClass + mPurity +
                         mCore are all in the cooked data -- purity was only
                         "not derivable" from SAVES, not from level exports;
                         geysers keep the synthetic Desc_Geyser_C class and
                         an absent mPurity means the RP_Normal default)

One more table goes to game_data/generated/ instead (gitignored: fully
regenerable, no merge state, not consumed by the app yet):

  consumables.json       BP_BerryBush_C / BP_NutBush_C / BP_Shroom_01_C,
                         keyed by the consumable item class they yield
                         (Desc_Berry_C = Paleberry, Desc_Nut_C = Beryl Nut,
                         Desc_Shroom_C = Bacon Agaric)

(Resource deposits were evaluated and rejected: ~75% of BP_ResourceDeposit_C
actors have no cooked resource type -- each save rolls its own
mResourceDepositTableIndex lazily as cells stream in, verified by comparing
rolled indexes across independent worlds -- so a static table can't say
anything useful about them.)

Validated against the previous (reveal-save-derived / upstream-curated)
tables before this became the generator: identical key sets, positions and
rotations for every slug, somersloop, mercer sphere and crash site; all 607
resourcePurity entries match on class, purity, position and fracking-core
link (the dump adds one limestone node the old table missed); the [id, ...]
field of the detailed tables is the world-partition cell name the actor
lives in (confirmed 522/522).

The two other files in game_data/sav_data/ are NOT touched by this script:
readableNameCorrections.json and typePaths.json are small hand-curated
tables (originally converted from GreyHak's sat_sav_parse sav_data package,
see git history for extract_sav_data_tables.py), edited in place.

Fully automated -- nothing curated survives in the output:
  - The metadata dict (4th element) of somersloops/mercerSpheres is written
    empty (the upstream access/sentry notes were never consumed by the map).
    crashSites metadata is DERIVED: the payload builder reads only
    "cost"/"power" (the unlock requirement shown per hard drive), and both
    come from the drop pod's cooked mUnlockCost -- item labels resolved via
    generated/items.json (run extract_docs_json.py first; falls back to the
    short class name with a warning).
  - freeDroppedItems item classes: the item IS cooked into each placed
    actor, but FModel's CUE4Parse has no Satisfactory handler for the
    custom-serialized FInventoryItem struct, so the dump exports
    mPickupItems.Item as null (counts and positions export fine). Items
    therefore merge from, in priority order: --items-from-save (a .sav
    re-serializes the cooked value in a format this script can read;
    validated 659 items / 0 mismatches against the curated table), then
    VERIFIED_PICKUP_ITEMS below, then the existing table by instance name.
    CAVEAT: a save only serializes actors whose world cell has streamed in
    near a player -- a brand-new save carries ~3 pickups (spawn area), a
    well-traveled one nearly all 703. Unknown new pickups are skipped with
    a warning naming their mesh (a hint, but meshes provably lie: one
    pickup renders a turbo motor and drops Packaged Biofuel) -- resolve by
    pointing --items-from-save at a save that has physically visited them
    without collecting them.

Key order preservation: existing tables keep their key/entry order (the
payload builder's output ordering depends on it); genuinely new entries
append at the end.

    py game_data/extractors/extract_collectables.py [path/to/extraction/.../Content]
        [--items-from-save path/to/any.sav] [--check]

--check reparses the dump and verifies the on-disk JSONs match what would be
written (numeric fields compared with a small tolerance), without writing.
"""

import json
import math
import os
import re
import struct
import sys
import zlib
from collections import Counter

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_CONTENT_ROOT = r"C:\Users\plane.DESKTOP-SAH3OHV\Documents\SatisExtract\FactoryGame\Content"
LEVEL_SUBDIR = os.path.join("FactoryGame", "Map", "GameLevel01")
SAV_DATA_DIR = os.path.join(REPO_ROOT, "game_data", "sav_data")

# actor Type -> (output table, bucket key inside it)
SLUG_CLASSES = {
    "BP_Crystal_C": "blue",
    "BP_Crystal_mk2_C": "yellow",
    "BP_Crystal_mk3_C": "purple",
}
DETAIL_CLASSES = {
    "BP_WAT1_C": "somersloops.json",
    "BP_WAT2_C": "mercerSpheres.json",
    "BP_DropPod_C": "crashSites.json",
}
PICKUP_CLASS = "FGItemPickup_Spawnable"
NODE_CLASSES = ("BP_ResourceNode_C", "BP_FrackingSatellite_C", "BP_ResourceNodeGeyser_C")
PURITY_NAMES = {"RP_Inpure": "IMPURE", "RP_Normal": "NORMAL", "RP_Pure": "PURE"}
# Consumable plant -> the item it yields (stable trio; names per docs.json:
# Paleberry / Beryl Nut / Bacon Agaric).
CONSUMABLE_CLASSES = {
    "BP_BerryBush_C": "Desc_Berry_C",
    "BP_NutBush_C": "Desc_Nut_C",
    "BP_Shroom_01_C": "Desc_Shroom_C",
}
NEEDLES = (b"BP_Crystal", b"BP_WAT", b"BP_DropPod", b"FGItemPickup_Spawnable",
           b"BP_ResourceNode", b"BP_Fracking",
           b"BP_BerryBush", b"BP_NutBush", b"BP_Shroom")
GENERATED_DIR = os.path.join(REPO_ROOT, "game_data", "generated")

# Item classes for pickup instances the existing table doesn't know, verified
# outside the cooked data (which never stores them).
VERIFIED_PICKUP_ITEMS = {
    # Verified against a fully-revealed save (sav-data-from-save branch): a
    # gas nobelisk pickup upstream's table missed.
    "Persistent_Level:PersistentLevel.FGItemPickup_Spawnable_UAID_40B076DF2F7986CE01_1126606299":
        "/Game/FactoryGame/Equipment/NobeliskDetonator/Ammo/Desc_NobeliskGas.Desc_NobeliskGas_C",
    # Verified against a save whose object body carries the item (18 Motors;
    # missing from the reveal save because it had been collected there).
    "Persistent_Level:PersistentLevel.FGItemPickup_Spawnable_UAID_40B076DF2F79A7CD01_2130364060":
        "/Game/FactoryGame/Resource/Parts/Motor/Desc_Motor.Desc_Motor_C",
}


def rotatorToQuat(rot):
    """UE FRotator (degrees) -> [x,y,z,w] quaternion (FRotator::Quaternion).
    Validated numerically against the reveal-save-derived rotations."""
    d2 = math.pi / 360.0
    p, y, r = rot.get("Pitch", 0.0), rot.get("Yaw", 0.0), rot.get("Roll", 0.0)
    sp, cp = math.sin(p * d2), math.cos(p * d2)
    sy, cy = math.sin(y * d2), math.cos(y * d2)
    sr, cr = math.sin(r * d2), math.cos(r * d2)
    return [
        cr * sp * sy - sr * cp * cy,
        -cr * sp * cy - sr * cp * sy,
        cr * cp * sy - sr * sp * cy,
        cr * cp * cy + sr * sp * sy,
    ]


# ---------------------------------------------------------------------------
# Minimal .sav walk: enough of the save format (header, chunked-zlib body,
# per-level actor headers + object spans) to pull each FGItemPickup_Spawnable
# actor's body bytes and read the item path inside. Mirrors the Rust parser's
# level walk (rust_parser/core/src/level.rs), skipping everything unneeded.
# ---------------------------------------------------------------------------

ITEM_PATH_PATTERN = re.compile(rb"/Game/[/A-Za-z0-9_.\-]*\.Desc_[A-Za-z0-9_]+_C")


class _SaveCursor:
    def __init__(self, data, pos=0):
        self.data = data
        self.pos = pos

    def u32(self):
        v = struct.unpack_from("<I", self.data, self.pos)[0]
        self.pos += 4
        return v

    def u64(self):
        v = struct.unpack_from("<Q", self.data, self.pos)[0]
        self.pos += 8
        return v

    def string(self):
        n = struct.unpack_from("<i", self.data, self.pos)[0]
        self.pos += 4
        if n == 0:
            return ""
        if n < 0:  # UTF-16
            s = self.data[self.pos : self.pos + (-n) * 2 - 2].decode("utf-16-le")
            self.pos += (-n) * 2
            return s
        s = self.data[self.pos : self.pos + n - 1].decode("utf-8", "replace")
        self.pos += n
        return s

    def skipVersionData(self):
        self.pos += 16 + 6 + 4  # versions, engine maj/min/patch, changelist
        self.string()  # engine branch
        count = self.u32()  # separate statement: `pos += u32()*20` would load
        self.pos += count * 20  # pos before u32()'s own advance and lose it


def readPickupItemsFromSave(savPath):
    """{instanceName: itemFullPath} for every FGItemPickup_Spawnable actor in
    the save (pickups already collected in that save are absent)."""
    data = open(savPath, "rb").read()
    c = _SaveCursor(data)
    if c.u32() != 14:
        raise SystemExit(f"{savPath}: unsupported save header")
    saveVersion = c.u32()
    c.pos += 4
    for _ in range(4):
        c.string()
    c.pos += 4 + 8 + 1 + 4
    c.string()
    c.pos += 4
    c.string()
    c.pos += 4 + 4 + 8 + 8 + 4
    chunks = []
    pos = c.pos
    while pos < len(data):
        if struct.unpack_from("<I", data, pos)[0] != 0x9E2A83C1:
            raise SystemExit(f"{savPath}: bad chunk signature")
        pos += 8 + 1 + 4 + 4
        comp1, _u1, _c2, _u2 = struct.unpack_from("<QQQQ", data, pos)
        pos += 32
        chunks.append(zlib.decompress(data[pos : pos + comp1]))
        pos += comp1
    body = b"".join(chunks)

    c = _SaveCursor(body, 8)
    if saveVersion >= 53:
        c.skipVersionData()
    for _ in range(c.u32()):  # partitions
        c.string()
        c.pos += 8
        for _ in range(c.u32()):
            c.string()
            c.pos += 4
    items = {}
    sublevels = c.u32()
    for levelIndex in range(sublevels + 1):
        persistent = levelIndex == sublevels
        if not persistent:
            c.string()
        headerBlobSize = c.u64()
        headerStart = c.pos
        count = c.u32()
        pickupSlots = {}
        for i in range(count):
            headerType = c.u32()
            if headerType == 1:  # actor: typePath, root, instance, transform
                typePath = c.string()
                c.string()
                instanceName = c.string()
                c.pos += 8 + 40 + 4
                if typePath == "/Script/FactoryGame.FGItemPickup_Spawnable":
                    pickupSlots[i] = instanceName
            else:  # component
                c.string(); c.string(); c.string()
                c.pos += 4
                c.string()
        if persistent and c.u32():
            c.string()  # "Persistent_Level"
        if headerBlobSize != c.pos - headerStart:  # collectables #1
            for _ in range(c.u32()):
                c.string(); c.string()
        allObjectsSize = c.u64()
        objectStart = c.pos
        oc = _SaveCursor(body, objectStart)
        oc.u32()  # objectCount
        if pickupSlots:
            for i in range(count):
                gameVersion = oc.u32()
                oc.pos += 4
                objectSize = oc.u32()
                span = body[oc.pos : oc.pos + objectSize]
                oc.pos += objectSize
                if gameVersion >= 53 and oc.u32():
                    oc.skipVersionData()
                if i in pickupSlots:
                    m = ITEM_PATH_PATTERN.search(span)
                    if m:
                        items[pickupSlots[i]] = m.group(0).decode()
        c.pos = objectStart + allObjectsSize
        c.u32()  # levelSaveVersion
        if not persistent:
            for _ in range(c.u32()):  # collectables #2
                c.string(); c.string()
            if saveVersion >= 53 and c.u32():
                c.skipVersionData()
    return items


def quotedName(objectField):
    """{"ObjectName": "BlueprintGeneratedClass'Desc_Stone_C'"} -> "Desc_Stone_C"."""
    if not objectField:
        return None
    name = objectField.get("ObjectName", "")
    return name.split("'")[1] if "'" in name else None


def collectActors(contentRoot):
    """Walk every level export once; return {pathName: record} per class kind.
    Actors can appear both in Persistent_Level.json and in their _Generated_
    cell -- the cell record wins (its file name is the actor's cell id)."""
    levelRoot = os.path.join(contentRoot, LEVEL_SUBDIR)
    if not os.path.isdir(levelRoot):
        raise SystemExit(f"Level export dir not found: {levelRoot}")
    slugs = {}   # pathName -> (bucket, pos, fromCell)
    detail = {}  # pathName -> (tableName, cell, quat, pos, unlockCost, fromCell)
    pickups = {}  # pathName -> (num, pos, mesh, fromCell)
    nodes = {}   # pathName -> (desc, purity, pos, core, fromCell)
    consumables = {}  # pathName -> (itemClass, pos, fromCell)
    for dirPath, _, fileNames in os.walk(levelRoot):
        for fileName in fileNames:
            if not fileName.endswith(".json"):
                continue
            with open(os.path.join(dirPath, fileName), "rb") as f:
                raw = f.read()
            if not any(n in raw for n in NEEDLES):
                continue
            try:
                exports = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if not isinstance(exports, list):
                continue
            cell = fileName[:-5]
            fromCell = os.path.basename(dirPath) == "_Generated_"
            for obj in exports:
                objType = obj.get("Type", "")
                isSlug = objType in SLUG_CLASSES
                isDetail = objType in DETAIL_CLASSES
                isPickup = objType == PICKUP_CLASS
                isNode = objType in NODE_CLASSES
                isConsumable = objType in CONSUMABLE_CLASSES
                if not (isSlug or isDetail or isPickup or isNode or isConsumable):
                    continue
                outer = (obj.get("Outer") or {}).get("ObjectName", "")
                levelIdentity = outer.removeprefix("Level'").removesuffix("'")
                pathName = f"{levelIdentity}.{obj['Name']}"
                props = obj.get("Properties") or {}
                pos, quat, mesh = [0.0, 0.0, 0.0], [0.0, 0.0, 0.0, 1.0], None
                rootRef = props.get("RootComponent")
                if rootRef:
                    try:
                        index = int(rootRef["ObjectPath"].rsplit(".", 1)[1])
                        cprops = exports[index].get("Properties", {})
                        loc = cprops.get("RelativeLocation")
                        if loc:
                            pos = [loc["X"], loc["Y"], loc["Z"]]
                        rot = cprops.get("RelativeRotation")
                        if rot:
                            quat = rotatorToQuat(rot)
                        sm = cprops.get("StaticMesh")
                        if sm:
                            mesh = sm.get("ObjectName")
                    except (KeyError, IndexError, ValueError):
                        pass
                if isSlug:
                    if pathName not in slugs or (fromCell and not slugs[pathName][2]):
                        slugs[pathName] = (SLUG_CLASSES[objType], pos, fromCell)
                elif isDetail:
                    # An actor can appear in both Persistent_Level.json and
                    # its cell; keep the cell record but keep mUnlockCost
                    # from whichever copy carries it.
                    unlockCost = props.get("mUnlockCost")
                    previous = detail.get(pathName)
                    if previous is not None:
                        unlockCost = unlockCost or previous[4]
                    if previous is None or (fromCell and not previous[5]):
                        detail[pathName] = (DETAIL_CLASSES[objType], cell, quat, pos, unlockCost, fromCell)
                    elif unlockCost is not previous[4]:
                        detail[pathName] = previous[:4] + (unlockCost, previous[5])
                elif isNode:
                    desc = quotedName(props.get("mResourceClass")) or (
                        "Desc_Geyser_C" if objType == "BP_ResourceNodeGeyser_C" else None
                    )
                    purity = PURITY_NAMES.get(props.get("mPurity", "RP_Normal"))
                    core = quotedName(props.get("mCore"))
                    if pathName not in nodes or (fromCell and not nodes[pathName][4]):
                        nodes[pathName] = (desc, purity, pos, core, fromCell)
                elif isConsumable:
                    if pathName not in consumables or (fromCell and not consumables[pathName][2]):
                        consumables[pathName] = (CONSUMABLE_CLASSES[objType], pos, fromCell)
                else:
                    num = (props.get("mPickupItems") or {}).get("NumItems", 0)
                    if pathName not in pickups or (fromCell and not pickups[pathName][3]):
                        pickups[pathName] = (num, pos, mesh, fromCell)
    return slugs, detail, pickups, nodes, consumables


def loadItemLabels(warnings):
    """{Desc_*_C: displayName} from generated/items.json + resources.json,
    for crash-site cost labels. Empty (with a warning) if not generated yet."""
    labels = {}
    for name in ("items.json", "resources.json"):
        path = os.path.join(REPO_ROOT, "game_data", "generated", name)
        if not os.path.isfile(path):
            warnings.append(f"{path} missing (run extract_docs_json.py first) -- "
                            f"crash-site cost labels fall back to class names")
            continue
        with open(path, encoding="utf-8") as f:
            for cls, entry in json.load(f).items():
                if entry.get("displayName"):
                    labels[cls] = entry["displayName"]
    return labels


def deriveRequirement(unlockCost, itemLabels, warnings):
    """Drop pod mUnlockCost -> {"cost": [label, qty]} | {"power": MW} | {} --
    the exact shape the payload builder reads (collect_hard_drives)."""
    costType = (unlockCost or {}).get("CostType", "")
    if costType.endswith("::Item"):
        itemCost = unlockCost.get("ItemCost") or {}
        cls = quotedName(itemCost.get("ItemClass"))
        if cls is None or "Amount" not in itemCost:
            warnings.append(f"crashSites: unresolvable ItemCost {unlockCost!r}")
            return {}
        return {"cost": [itemLabels.get(cls, cls), itemCost["Amount"]]}
    if costType.endswith("::Power"):
        power = unlockCost.get("PowerConsumption")
        if power is None:
            warnings.append(f"crashSites: Power unlock without PowerConsumption {unlockCost!r}")
            return {}
        return {"power": power}
    return {}


def loadExisting(name, directory=SAV_DATA_DIR):
    path = os.path.join(directory, name)
    if not os.path.isfile(path):
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def groupByBucket(records, existing):
    """{pathName: (bucket, pos, ...)} -> {bucket: {pathName: pos}}, keeping
    the existing table's bucket and key order where present."""
    grouped = {}
    for pathName, rec in records.items():
        grouped.setdefault(rec[0], {})[pathName] = rec[1]
    out = {}
    for bucket in orderedKeys(existing, grouped):
        old = existing.get(bucket, {})
        out[bucket] = {k: grouped[bucket][k] for k in orderedKeys(old, grouped[bucket])}
    return out


def orderedKeys(existing, new):
    """Existing key order first (for keys still present), new keys appended
    in sorted order -- keeps diffs minimal and downstream ordering stable."""
    kept = [k for k in existing if k in new]
    added = sorted(k for k in new if k not in existing)
    return kept + added


def buildTables(slugs, detail, pickups, nodes, consumables, saveItems=None):
    warnings = []

    existingSlugs = loadExisting("powerSlugs.json")
    slugsOut = {}
    for bucket in ("blue", "yellow", "purple"):
        new = {k: pos for k, (b, pos, _) in slugs.items() if b == bucket}
        old = existingSlugs.get(bucket, {})
        slugsOut[bucket] = {k: new[k] for k in orderedKeys(old, new)}
        for k in old:
            if k not in new:
                warnings.append(f"powerSlugs/{bucket}: {k} disappeared from the dump")

    itemLabels = loadItemLabels(warnings)
    detailOut = {}
    for tableName in ("somersloops.json", "mercerSpheres.json", "crashSites.json"):
        old = loadExisting(tableName)
        new = {k: v for k, v in detail.items() if v[0] == tableName}
        table = {}
        for k in orderedKeys(old, new):
            _, cell, quat, pos, unlockCost, _ = new[k]
            metadata = {}
            if tableName == "crashSites.json":
                metadata = deriveRequirement(unlockCost, itemLabels, warnings)
            table[k] = [cell, quat, pos, metadata]
        for k in old:
            if k not in new:
                warnings.append(f"{tableName}: {k} disappeared from the dump")
        detailOut[tableName] = table

    # freeDroppedItems: {itemPath: [[count, pos, instanceName], ...]} --
    # resolve each instance's item from the existing table, then the verified
    # overrides; keep existing item-key and entry order.
    oldItems = loadExisting("freeDroppedItems.json")
    itemByInstance = dict(VERIFIED_PICKUP_ITEMS)
    for itemPath, entries in oldItems.items():
        for _count, _pos, instanceName in entries:
            itemByInstance.setdefault(instanceName, itemPath)
    for instanceName, itemPath in (saveItems or {}).items():
        previous = itemByInstance.get(instanceName)
        if previous is not None and previous != itemPath:
            warnings.append(f"freeDroppedItems: {instanceName} item differs between "
                            f"save ({itemPath}) and table ({previous}) -- save wins")
        itemByInstance[instanceName] = itemPath
    grouped = {}
    for instanceName, (num, pos, mesh, _) in pickups.items():
        itemPath = itemByInstance.get(instanceName)
        if itemPath is None:
            warnings.append(f"freeDroppedItems: {instanceName} has no known item "
                            f"(mesh {mesh}, count {num}) -- skipped, needs verification")
            continue
        grouped.setdefault(itemPath, []).append((num, pos, instanceName))
    itemsOut = {}
    for itemPath in orderedKeys(oldItems, grouped):
        oldOrder = {e[2]: i for i, e in enumerate(oldItems.get(itemPath, []))}
        entries = sorted(grouped[itemPath], key=lambda e: (oldOrder.get(e[2], len(oldOrder)), e[2]))
        itemsOut[itemPath] = [[num, pos, name] for num, pos, name in entries]
        for _c, _p, name in oldItems.get(itemPath, []):
            if name not in pickups:
                warnings.append(f"freeDroppedItems: {name} ({itemPath}) disappeared from the dump")

    oldPurity = loadExisting("resourcePurity.json")
    purityOut = {}
    for k in orderedKeys(oldPurity, nodes):
        desc, purity, pos, core, _ = nodes[k]
        if desc is None or purity is None:
            warnings.append(f"resourcePurity: {k} has unresolvable class/purity -- skipped")
            continue
        purityOut[k] = [desc, purity, pos, core]
    for k in oldPurity:
        if k not in nodes:
            warnings.append(f"resourcePurity: {k} disappeared from the dump")

    consumablesOut = groupByBucket(consumables, loadExisting("consumables.json", GENERATED_DIR))
    return slugsOut, detailOut, itemsOut, purityOut, consumablesOut, warnings


def valuesClose(a, b, tol=1e-3):
    """Structural equality with float tolerance (regenerated floats differ
    from the old save-derived ones at sub-unit level)."""
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return abs(a - b) <= tol
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(valuesClose(x, y, tol) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return list(a.keys()) == list(b.keys()) and all(valuesClose(a[k], b[k], tol) for k in a)
    return a == b


def main():
    check = False
    savPath = None
    contentRoot = DEFAULT_CONTENT_ROOT
    argv = sys.argv[1:]
    while argv:
        arg = argv.pop(0)
        if arg == "--check":
            check = True
        elif arg == "--items-from-save":
            if not argv:
                sys.exit("--items-from-save needs a .sav path")
            savPath = argv.pop(0)
        else:
            contentRoot = arg

    saveItems = None
    if savPath:
        saveItems = readPickupItemsFromSave(savPath)
        print(f"{len(saveItems)} pickup items read from {savPath}")

    slugs, detail, pickups, nodes, consumables = collectActors(contentRoot)
    slugsOut, detailOut, itemsOut, purityOut, consumablesOut, warnings = buildTables(
        slugs, detail, pickups, nodes, consumables, saveItems)
    for w in warnings:
        print(f"WARNING: {w}")

    outputs = {"powerSlugs.json": (SAV_DATA_DIR, slugsOut),
               "freeDroppedItems.json": (SAV_DATA_DIR, itemsOut),
               "resourcePurity.json": (SAV_DATA_DIR, purityOut),
               **{name: (SAV_DATA_DIR, table) for name, table in detailOut.items()},
               "consumables.json": (GENERATED_DIR, consumablesOut)}
    failures = []
    for name, (directory, table) in outputs.items():
        path = os.path.join(directory, name)
        if check:
            if not valuesClose(loadExisting(name, directory), table, tol=1.0):
                failures.append(name)
            continue
        os.makedirs(directory, exist_ok=True)
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            json.dump(table, f, ensure_ascii=False, indent=1)
            f.write("\n")
        print(f"wrote {path}")

    counts = {b: len(v) for b, v in slugsOut.items()}
    print(f"slugs {counts}, somersloops {len(detailOut['somersloops.json'])}, "
          f"mercerSpheres {len(detailOut['mercerSpheres.json'])}, "
          f"crashSites {len(detailOut['crashSites.json'])}, "
          f"droppedItems {sum(len(v) for v in itemsOut.values())} in {len(itemsOut)} item classes, "
          f"resourceNodes {len(purityOut)}")
    print(f"consumables {({b: len(v) for b, v in consumablesOut.items()})}")
    if check:
        if failures:
            print(f"MISMATCH: {', '.join(failures)}")
            sys.exit(1)
        print(f"OK: all {len(outputs)} tables match the dump")


if __name__ == "__main__":
    main()
