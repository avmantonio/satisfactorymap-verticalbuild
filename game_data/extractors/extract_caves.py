"""Extract the map's cave systems -- outline polygons in world coordinates --
into game_data/sav_data/caves.json.

Caves are not actors: nothing in a save (or in docs.json) says "there is a
cave here". They are authored level geometry, so the only source of truth is
the cooked world-partition export under <Content>/FactoryGame/Map/GameLevel01/
(the same dump extract_collectables.py and extract_spawners.py read). Four
independent signals in it mark cave interiors; this script unions all four and
traces the outline of the result:

  1. FGAtmosphereVolume actors whose FGBiome subobject inherits
     Biome_Atmosphere_Cave_Main / _Cave_Desert (108 of the map's 157
     atmosphere volumes). These are the game's own "the player is inside a
     cave now" regions -- the fog/lighting swap you see when you walk in --
     and they are the backbone of the output: authored per cave, and ~25 of
     them even carry a hand-written name (Atmosphere_SwampCave,
     Atmosphere_CraterLakesCave2, ...). Their brush shape survives the cook as
     the BrushComponent's BrushBodySetup.AggGeom convex hulls, in component
     space; the component transform puts them in world space.
  2. BP_CaveFloor_C actors: the spline-built tunnels (CaveTunnel_01 /
     CaveSplitter_01 / CaveExit_01 meshes swept along a spline). The spline
     control points, transformed by the actor, are the tunnel centerline --
     drawn as a fixed-width corridor here.
  3. Cave-only foliage: FGFoliageInstancedSMC components whose mesh is
     one of the World/Environment/Caves/Meshes "*Cave*" assets (cave grass,
     lanterns, stalagmites, ivy...). Per-instance transforms are bulk data
     FModel does not export, but each component's CachedBounds IS exported,
     in world space -- a tight box around the instances it holds. Cave props
     only grow inside caves, so ~3,400 of these boxes trace cave floors
     precisely. SM_NonCave_* (stalactites hung under open-air cliffs) and the
     folder's non-"Cave" props (TubeCoral, Landkelp -- they also grow
     outdoors) are excluded on purpose.
  4. StaticMeshActors placing the cave rock kit itself (SM_Cave_Wall_01,
     SM_CaveFloor_02, the baked SM_MERGED_BP_CaveFloor* tunnels, ...). Only
     their origin is exported, so each contributes a disc, not a footprint.

The union is rasterized on a GRID_CM grid, closed (dilate/erode) to bridge the
gaps between separately-authored chambers of one cave, split into connected
components, and each component's boundary is traced and simplified. So one
output entry = one connected cave system, which may cover several of the
game's volumes (the three Savanna cave volumes come out as one cave).

Known limits, deliberate:
  - An atmosphere volume is a fog region, not a collision mesh: it is drawn
    generously around the cave it covers, so outlines are looser than the real
    rock (typically by tens of meters). They are a "where is the cave" aid,
    not a survey.
  - Interior holes in a footprint are dropped; only outer rings are written.
  - Nothing here is save-dependent -- the table is identical for every world.

    py game_data/extractors/extract_caves.py [path/to/extraction/.../Content]

Re-run whenever the extraction dump is refreshed (new game patch), and review
the git diff: this file is committed (the app must work without game files).

Shape (caves.json):
  {"caves": [{"id", "name", "bbox", "zRange", "areaM2", "volumes", "rings"}]}

- id: stable identifier -- the actor name of the cave's primary atmosphere
  volume (the one with an authored name, else the first by position), or
  "cave_<x>_<y>" in hundreds of meters for a component built purely from
  geometry with no volume in it.
- name: prettified authored name ("Atmosphere_NorthernForestCave6" ->
  "Northern Forest Cave 6") when the game named the volume, else null. The
  frontend numbers the nameless ones itself.
- bbox: [minX, minY, maxX, maxY] in world cm.
- zRange: [minZ, maxZ] in world cm over every source that fed the component
  (atmosphere volumes and foliage boxes carry real Z; mesh discs do not).
- areaM2: footprint area (filled grid cells), square meters.
- volumes: actor names of the atmosphere volumes inside this cave, for
  traceability back into the dump. Empty for geometry-only caves.
- rings: list of outer rings, each a flat [x0, y0, x1, y1, ...] loop in world
  cm (integers, first point not repeated at the end). Usually one ring; more
  when the closing step leaves a component in touching-but-separate pieces.
"""

import json
import math
import os
import re
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_CONTENT_ROOT = r"C:\Users\plane.DESKTOP-SAH3OHV\Documents\SatisExtract\FactoryGame\Content"
LEVEL_SUBDIR = os.path.join("FactoryGame", "Map", "GameLevel01")
OUTPUT_PATH = os.path.join(REPO_ROOT, "game_data", "sav_data", "caves.json")

# Only files mentioning one of these are parsed (the dump is ~1.5 GB of JSON).
NEEDLES = (b"Cave", b"Atmosphere")

# FGBiome assets that mean "this atmosphere volume is a cave".
CAVE_BIOMES = ("Biome_Atmosphere_Cave_Main", "Biome_Atmosphere_Cave_Desert")
# Cave-only meshes: a "*Cave*" asset from the cave kit or the cave-floor kit.
# NonCave_* is the game's own marker for "same look, used outside a cave".
CAVE_MESH_RE = re.compile(r"/(?:Environment/Caves/Meshes|Rock/CaveFloor)/[^/\".]*Cave[^/\".]*", re.I)
NON_CAVE_RE = re.compile(r"NonCave", re.I)
# Only the real foliage components. HLODInstancedStaticMeshComponent places
# the SAME cave props as a far-distance proxy, but one HLOD component stands
# in for a whole streaming cell, so its CachedBounds is cell-sized (up to
# 1.1 km across, vs 70 m worst case for a real one) -- feeding those in
# smeared several caves into one 300,000 m2 blob.
FOLIAGE_TYPES = ("FGFoliageInstancedSMC",)
# Belt and braces for the above: a foliage cluster wider than this is not a
# cave floor, whatever its type says.
MAX_FOLIAGE_SPAN_CM = 12000.0

# Rasterization. 4 m cells resolve a tunnel; CLOSE_CELLS bridges the ~20 m
# gaps between the separately-authored chambers and tunnels of one cave
# without merging genuinely distinct caves (the closest pair on the map is
# ~150 m apart). MIN_CELLS drops specks (a lone cave rock on the surface).
GRID_CM = 400.0
CLOSE_CELLS = 4
MIN_CELLS = 25
SIMPLIFY_CM = 600.0
# A placed cave-kit mesh is tens of meters across but exports only its origin.
MESH_RADIUS_CM = 1500.0
# BP_CaveFloor tunnels: half-width of the swept corridor.
TUNNEL_HALF_WIDTH_CM = 1000.0

# Authored volume names the game spells oddly; anything not listed is split on
# camel case ("NorthernForestCave6" -> "Northern Forest Cave 6").
NAME_FIXES = {
    "Atmosphere_TitanforesCave2": "Titan Forest Cave 2",
    "Atmosphere_TitanforestCave": "Titan Forest Cave",
    "Atmosphere_DDJungleRiverCave3": "Dune Desert Jungle River Cave 3",
    "Atmosphere_Grassfields_Lower_01": "Grass Fields Lower Cave",
    "Atmosphere_CaveTest": None,  # dev volume, no player-facing name
}


# ---------------------------------------------------------------------------
# Dump walk
# ---------------------------------------------------------------------------

def rotMatrix(pitch, yaw, roll):
    """FRotator (degrees) -> rows of the UE rotation matrix (X fwd, Y right, Z up)."""
    p, y, r = math.radians(pitch), math.radians(yaw), math.radians(roll)
    cp, sp = math.cos(p), math.sin(p)
    cy, sy = math.cos(y), math.sin(y)
    cr, sr = math.cos(r), math.sin(r)
    return (
        (cp * cy, cp * sy, sp),
        (sr * sp * cy - cr * sy, sr * sp * sy + cr * cy, -sr * cp),
        (-(cr * sp * cy + sr * sy), cy * sr - cr * sp * sy, cr * cp),
    )


def toWorld(loc, rot, scale, point):
    """Component-space point -> world, through a component's transform."""
    m = rotMatrix(*rot)
    x, y, z = point[0] * scale[0], point[1] * scale[1], point[2] * scale[2]
    return (loc[0] + x * m[0][0] + y * m[1][0] + z * m[2][0],
            loc[1] + x * m[0][1] + y * m[1][1] + z * m[2][1],
            loc[2] + x * m[0][2] + y * m[1][2] + z * m[2][2])


def exportIndex(reference):
    """{"ObjectPath": ".../ABC.12"} -> 12 (the export's index in the file)."""
    if not isinstance(reference, dict):
        return None
    match = re.search(r"\.(\d+)$", reference.get("ObjectPath") or "")
    return int(match.group(1)) if match else None


def componentTransform(props):
    loc = props.get("RelativeLocation") or {}
    rot = props.get("RelativeRotation") or {}
    scale = props.get("RelativeScale3D") or {}
    return ((loc.get("X", 0.0), loc.get("Y", 0.0), loc.get("Z", 0.0)),
            (rot.get("Pitch", 0.0), rot.get("Yaw", 0.0), rot.get("Roll", 0.0)),
            (scale.get("X", 1.0), scale.get("Y", 1.0), scale.get("Z", 1.0)))


def quotedName(objectField):
    """{"ObjectName": "FGBiome'Biome_Atmosphere_Cave_Main'"} -> the quoted part."""
    if not objectField:
        return None
    name = objectField.get("ObjectName", "")
    return name.split("'")[1] if "'" in name else None


def collectSources(contentRoot, warnings):
    """One walk over the level export. Returns (volumes, boxes, discs, tunnels).

    volumes  [{"name", "hulls": [[(x,y,z)...]], "z": (min,max)}]  cave atmosphere volumes
    boxes    [(minX, minY, maxX, maxY, minZ, maxZ)]               cave-foliage CachedBounds
    discs    [(x, y, z)]                                          placed cave-kit meshes
    tunnels  [[(x, y, z), ...]]                                   BP_CaveFloor centerlines
    """
    levelRoot = os.path.join(contentRoot, LEVEL_SUBDIR)
    if not os.path.isdir(levelRoot):
        raise SystemExit(f"Level export dir not found: {levelRoot}")
    volumes, boxes, discs, tunnels = {}, [], [], []
    for dirPath, _, fileNames in os.walk(levelRoot):
        for fileName in sorted(fileNames):
            if not fileName.endswith(".json"):
                continue
            with open(os.path.join(dirPath, fileName), "rb") as f:
                raw = f.read()
            if not any(needle in raw for needle in NEEDLES):
                continue
            try:
                exports = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if not isinstance(exports, list):
                continue

            def resolve(reference):
                index = exportIndex(reference)
                if index is None or not 0 <= index < len(exports):
                    return None
                return exports[index]

            for obj in exports:
                objType = obj.get("Type", "")
                props = obj.get("Properties") or {}

                if objType == "FGAtmosphereVolume":
                    biome = resolve(props.get("mBiome"))
                    base = quotedName((biome or {}).get("Properties", {}).get("BaseBiome"))
                    if base not in CAVE_BIOMES:
                        continue
                    brush = resolve(props.get("BrushComponent") or props.get("RootComponent"))
                    if not brush:
                        continue
                    loc, rot, scale = componentTransform(brush.get("Properties") or {})
                    body = resolve((brush.get("Properties") or {}).get("BrushBodySetup"))
                    hulls = []
                    aggGeom = ((body or {}).get("Properties") or {}).get("AggGeom") or {}
                    for elem in aggGeom.get("ConvexElems") or []:
                        vertices = [toWorld(loc, rot, scale, (v["X"], v["Y"], v["Z"]))
                                    for v in elem.get("VertexData") or []]
                        if vertices:
                            hulls.append(vertices)
                    if not hulls:
                        warnings.append(f"{obj.get('Name')}: cave atmosphere volume with no "
                                        f"brush geometry in the dump -- skipped")
                        continue
                    # An actor can appear in both Persistent_Level.json and its
                    # own cell file; keyed by name, the copies collapse.
                    volumes[obj.get("Name")] = hulls

                elif objType == "BP_CaveFloor_C":
                    root = resolve(props.get("RootComponent"))
                    spline = resolve(props.get("Spline"))
                    if not root or not spline:
                        continue
                    loc, rot, scale = componentTransform(root.get("Properties") or {})
                    curve = ((spline.get("Properties") or {}).get("SplineCurves") or {})
                    points = (curve.get("Position") or {}).get("Points") or []
                    line = [toWorld(loc, rot, scale,
                                    (p["OutVal"]["X"], p["OutVal"]["Y"], p["OutVal"]["Z"]))
                            for p in points if "OutVal" in p]
                    if len(line) >= 2:
                        tunnels.append(line)

                elif objType in FOLIAGE_TYPES:
                    mesh = (props.get("StaticMesh") or {}).get("ObjectPath") or ""
                    if not CAVE_MESH_RE.search(mesh) or NON_CAVE_RE.search(mesh):
                        continue
                    cached = (props.get("CachedBounds") or {}).get("Value") or {}
                    origin, extent = cached.get("Origin"), cached.get("BoxExtent")
                    if not origin or not extent:
                        continue
                    if max(extent["X"], extent["Y"]) * 2 > MAX_FOLIAGE_SPAN_CM:
                        continue
                    boxes.append((origin["X"] - extent["X"], origin["Y"] - extent["Y"],
                                  origin["X"] + extent["X"], origin["Y"] + extent["Y"],
                                  origin["Z"] - extent["Z"], origin["Z"] + extent["Z"]))

                elif objType == "StaticMeshActor":
                    comp = resolve(props.get("StaticMeshComponent") or props.get("RootComponent"))
                    if not comp:
                        continue
                    compProps = comp.get("Properties") or {}
                    mesh = (compProps.get("StaticMesh") or {}).get("ObjectPath") or ""
                    name = (compProps.get("StaticMesh") or {}).get("ObjectName") or ""
                    isCaveKit = CAVE_MESH_RE.search(mesh) or "MERGED_BP_CaveFloor" in name
                    if not isCaveKit or NON_CAVE_RE.search(mesh):
                        continue
                    loc, _, _ = componentTransform(compProps)
                    discs.append(loc)

    return volumes, boxes, discs, tunnels


# ---------------------------------------------------------------------------
# Raster: union of every source, closed, split into connected components
# ---------------------------------------------------------------------------

class Grid:
    """Boolean occupancy grid over the world, GRID_CM per cell."""

    def __init__(self, minX, minY, maxX, maxY):
        pad = CLOSE_CELLS + 2
        self.originX = minX - pad * GRID_CM
        self.originY = minY - pad * GRID_CM
        self.width = int((maxX - minX) / GRID_CM) + 2 * pad + 2
        self.height = int((maxY - minY) / GRID_CM) + 2 * pad + 2
        self.cells = bytearray(self.width * self.height)

    def cellOf(self, x, y):
        return (int((x - self.originX) / GRID_CM), int((y - self.originY) / GRID_CM))

    def worldOf(self, cx, cy):
        return (self.originX + cx * GRID_CM, self.originY + cy * GRID_CM)

    def set(self, cx, cy):
        if 0 <= cx < self.width and 0 <= cy < self.height:
            self.cells[cy * self.width + cx] = 1

    def fillBox(self, minX, minY, maxX, maxY):
        cx0, cy0 = self.cellOf(minX, minY)
        cx1, cy1 = self.cellOf(maxX, maxY)
        for cy in range(max(cy0, 0), min(cy1, self.height - 1) + 1):
            row = cy * self.width
            for cx in range(max(cx0, 0), min(cx1, self.width - 1) + 1):
                self.cells[row + cx] = 1

    def fillDisc(self, x, y, radius):
        cx0, cy0 = self.cellOf(x - radius, y - radius)
        cx1, cy1 = self.cellOf(x + radius, y + radius)
        r2 = radius * radius
        for cy in range(max(cy0, 0), min(cy1, self.height - 1) + 1):
            wy = self.originY + (cy + 0.5) * GRID_CM
            for cx in range(max(cx0, 0), min(cx1, self.width - 1) + 1):
                wx = self.originX + (cx + 0.5) * GRID_CM
                if (wx - x) ** 2 + (wy - y) ** 2 <= r2:
                    self.cells[cy * self.width + cx] = 1

    def fillPolygon(self, points):
        """Scanline fill of a simple polygon given as world-space (x, y)."""
        if len(points) < 3:
            return
        cellPoints = [((px - self.originX) / GRID_CM, (py - self.originY) / GRID_CM)
                      for px, py in points]
        yMin = max(int(math.floor(min(p[1] for p in cellPoints))), 0)
        yMax = min(int(math.ceil(max(p[1] for p in cellPoints))), self.height - 1)
        for cy in range(yMin, yMax + 1):
            scanY = cy + 0.5
            crossings = []
            for i in range(len(cellPoints)):
                ax, ay = cellPoints[i]
                bx, by = cellPoints[(i + 1) % len(cellPoints)]
                if (ay <= scanY < by) or (by <= scanY < ay):
                    crossings.append(ax + (scanY - ay) * (bx - ax) / (by - ay))
            crossings.sort()
            row = cy * self.width
            for i in range(0, len(crossings) - 1, 2):
                cx0 = max(int(math.floor(crossings[i])), 0)
                cx1 = min(int(math.ceil(crossings[i + 1])), self.width - 1)
                for cx in range(cx0, cx1 + 1):
                    self.cells[row + cx] = 1

    def fillCorridor(self, line, halfWidth):
        """Discs along a polyline, stepped fine enough to leave no gaps."""
        step = GRID_CM
        for i in range(len(line) - 1):
            ax, ay = line[i][0], line[i][1]
            bx, by = line[i + 1][0], line[i + 1][1]
            length = math.hypot(bx - ax, by - ay)
            steps = max(int(length / step), 1)
            for s in range(steps + 1):
                t = s / steps
                self.fillDisc(ax + (bx - ax) * t, ay + (by - ay) * t, halfWidth)


def convexHull2d(points):
    """Monotone-chain hull of world (x, y, z) points -> [(x, y)] CCW."""
    pts = sorted(set((round(p[0], 2), round(p[1], 2)) for p in points))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lower = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    return lower[:-1] + upper[:-1]


def morphologicalClose(grid, radius):
    """Dilate then erode by a Chebyshev radius: bridges gaps, keeps size."""
    def spread(source, width, height, value):
        # Separable: horizontal pass then vertical pass.
        temp = bytearray(len(source))
        for y in range(height):
            row = y * width
            run = -1
            for x in range(width):
                if source[row + x] == value:
                    run = x
                if run >= 0 and x - run <= radius:
                    temp[row + x] = value
            run = -1
            for x in range(width - 1, -1, -1):
                if source[row + x] == value:
                    run = x
                if run >= 0 and run - x <= radius:
                    temp[row + x] = value
        out = bytearray(len(source))
        for x in range(width):
            run = -1
            for y in range(height):
                if temp[y * width + x] == value:
                    run = y
                if run >= 0 and y - run <= radius:
                    out[y * width + x] = value
            run = -1
            for y in range(height - 1, -1, -1):
                if temp[y * width + x] == value:
                    run = y
                if run >= 0 and run - y <= radius:
                    out[y * width + x] = value
        return out

    dilated = spread(grid.cells, grid.width, grid.height, 1)
    # Erode = dilate the complement, then invert.
    inverted = bytearray(1 - c for c in dilated)
    grown = spread(inverted, grid.width, grid.height, 1)
    grid.cells = bytearray(1 - c for c in grown)


def connectedComponents(grid):
    """4-connected components of the filled cells -> [[(cx, cy), ...]]."""
    seen = bytearray(len(grid.cells))
    components = []
    for start in range(len(grid.cells)):
        if not grid.cells[start] or seen[start]:
            continue
        stack = [start]
        seen[start] = 1
        cells = []
        while stack:
            index = stack.pop()
            cx, cy = index % grid.width, index // grid.width
            cells.append((cx, cy))
            for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                if not (0 <= nx < grid.width and 0 <= ny < grid.height):
                    continue
                n = ny * grid.width + nx
                if grid.cells[n] and not seen[n]:
                    seen[n] = 1
                    stack.append(n)
        components.append(cells)
    return components


def traceRings(cells):
    """Outer boundary rings of a set of cells, in cell-corner coordinates.

    Every filled cell contributes the sides that face an empty cell, as
    directed edges wound clockwise around the cell; chaining them end to end
    yields closed loops with the interior on the right. Loops enclosing
    negative area are interior holes and are dropped (see module docstring).
    """
    filled = set(cells)
    edges = {}  # start corner -> [end corners]
    for cx, cy in filled:
        if (cx, cy - 1) not in filled:
            edges.setdefault((cx, cy), []).append((cx + 1, cy))
        if (cx + 1, cy) not in filled:
            edges.setdefault((cx + 1, cy), []).append((cx + 1, cy + 1))
        if (cx, cy + 1) not in filled:
            edges.setdefault((cx + 1, cy + 1), []).append((cx, cy + 1))
        if (cx - 1, cy) not in filled:
            edges.setdefault((cx, cy + 1), []).append((cx, cy))

    rings = []
    while edges:
        start = next(iter(edges))
        ring = [start]
        current = start
        previous = None
        while True:
            options = edges.get(current)
            if not options:
                break
            if len(options) == 1 or previous is None:
                nextPoint = options.pop()
            else:
                # Diagonal touch: two ways out. Take the sharpest right turn,
                # which keeps the loop hugging this side of the pinch.
                inX, inY = current[0] - previous[0], current[1] - previous[1]

                def turn(option):
                    outX, outY = option[0] - current[0], option[1] - current[1]
                    return math.atan2(inX * outY - inY * outX, inX * outX + inY * outY)

                nextPoint = min(options, key=turn)
                options.remove(nextPoint)
            if not edges[current]:
                del edges[current]
            previous, current = current, nextPoint
            if current == start:
                break
            ring.append(current)
        if len(ring) >= 4:
            area = 0.0
            for i in range(len(ring)):
                ax, ay = ring[i]
                bx, by = ring[(i + 1) % len(ring)]
                area += ax * by - bx * ay
            # Clockwise in cell space (y down) = positive shoelace = outer ring.
            if area > 0:
                rings.append(ring)
    return rings


def simplifyRing(points, epsilon):
    """Ramer-Douglas-Peucker on a closed ring (kept closed)."""
    if len(points) < 4:
        return points

    def rdp(chunk):
        if len(chunk) < 3:
            return chunk
        ax, ay = chunk[0]
        bx, by = chunk[-1]
        dx, dy = bx - ax, by - ay
        norm = math.hypot(dx, dy)
        worst, worstIndex = -1.0, 0
        for i in range(1, len(chunk) - 1):
            px, py = chunk[i]
            if norm == 0:
                distance = math.hypot(px - ax, py - ay)
            else:
                distance = abs(dy * px - dx * py + bx * ay - by * ax) / norm
            if distance > worst:
                worst, worstIndex = distance, i
        if worst <= epsilon:
            return [chunk[0], chunk[-1]]
        return rdp(chunk[:worstIndex + 1])[:-1] + rdp(chunk[worstIndex:])

    # Split the loop at its two extreme points so RDP sees open chains.
    startIndex = min(range(len(points)), key=lambda i: points[i])
    rotated = points[startIndex:] + points[:startIndex]
    half = len(rotated) // 2
    first = rdp(rotated[:half + 1])
    second = rdp(rotated[half:] + [rotated[0]])
    return first[:-1] + second[:-1]


# ---------------------------------------------------------------------------
# Naming and assembly
# ---------------------------------------------------------------------------

def prettifyName(actorName):
    """Authored volume name -> player-facing name, or None if it has none."""
    if actorName in NAME_FIXES:
        return NAME_FIXES[actorName]
    if not actorName.startswith("Atmosphere_"):
        return None
    stem = actorName[len("Atmosphere_"):]
    if not stem or stem.startswith("FGAtmosphere"):
        return None
    stem = stem.replace("_", " ")
    # camelCase / digit runs -> words: "NorthernForestCave6" -> the obvious.
    words = re.findall(r"[A-Z]+(?![a-z])|[A-Z][a-z]+|[a-z]+|\d+[a-z]?", stem)
    return " ".join(words) if words else None


def caveId(volumeNames, centerX, centerY):
    named = [n for n in volumeNames if prettifyName(n)]
    if named:
        return sorted(named)[0]
    if volumeNames:
        return sorted(volumeNames)[0]
    return f"cave_{round(centerX / 100):+07d}_{round(centerY / 100):+07d}"


def buildCaves(volumes, boxes, discs, tunnels, warnings):
    xs = [p[0] for hulls in volumes.values() for h in hulls for p in h]
    ys = [p[1] for hulls in volumes.values() for h in hulls for p in h]
    xs += [b[0] for b in boxes] + [b[2] for b in boxes] + [d[0] for d in discs]
    ys += [b[1] for b in boxes] + [b[3] for b in boxes] + [d[1] for d in discs]
    xs += [p[0] for line in tunnels for p in line]
    ys += [p[1] for line in tunnels for p in line]
    if not xs:
        raise SystemExit("No cave geometry found in the dump -- wrong Content path?")
    grid = Grid(min(xs) - MESH_RADIUS_CM, min(ys) - MESH_RADIUS_CM,
                max(xs) + MESH_RADIUS_CM, max(ys) + MESH_RADIUS_CM)

    # Sources, in the order the docstring lists them.
    volumeFootprints = {}  # name -> [[(x, y)]]
    volumeZ = {}
    for name, hulls in volumes.items():
        footprints = []
        for hull in hulls:
            footprint = convexHull2d(hull)
            if len(footprint) >= 3:
                footprints.append(footprint)
                grid.fillPolygon(footprint)
        volumeFootprints[name] = footprints
        zs = [p[2] for hull in hulls for p in hull]
        volumeZ[name] = (min(zs), max(zs))
    for line in tunnels:
        grid.fillCorridor(line, TUNNEL_HALF_WIDTH_CM)
    for minX, minY, maxX, maxY, _minZ, _maxZ in boxes:
        grid.fillBox(minX, minY, maxX, maxY)
    for x, y, _z in discs:
        grid.fillDisc(x, y, MESH_RADIUS_CM)

    morphologicalClose(grid, CLOSE_CELLS)

    caves = []
    for cells in connectedComponents(grid):
        if len(cells) < MIN_CELLS:
            continue
        cellSet = set(cells)
        worldXs = [grid.worldOf(cx, cy)[0] for cx, cy in cells]
        worldYs = [grid.worldOf(cx, cy)[1] for cx, cy in cells]
        bbox = [min(worldXs), min(worldYs), max(worldXs) + GRID_CM, max(worldYs) + GRID_CM]
        centerX, centerY = (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2

        # Which atmosphere volumes landed in this component?
        memberVolumes = []
        for name, footprints in volumeFootprints.items():
            for footprint in footprints:
                cx, cy = grid.cellOf(sum(p[0] for p in footprint) / len(footprint),
                                     sum(p[1] for p in footprint) / len(footprint))
                if (cx, cy) in cellSet:
                    memberVolumes.append(name)
                    break

        zValues = [z for name in memberVolumes for z in volumeZ[name]]
        for minX, minY, maxX, maxY, minZ, maxZ in boxes:
            bx, by = (minX + maxX) / 2, (minY + maxY) / 2
            if grid.cellOf(bx, by) in cellSet:
                zValues.extend((minZ, maxZ))

        rings = []
        for ring in traceRings(cells):
            simplified = simplifyRing(ring, SIMPLIFY_CM / GRID_CM)
            if len(simplified) < 3:
                continue
            flat = []
            for cx, cy in simplified:
                wx, wy = grid.worldOf(cx, cy)
                flat.extend((round(wx), round(wy)))
            rings.append(flat)
        if not rings:
            warnings.append(f"component at ({centerX:.0f}, {centerY:.0f}) traced to nothing")
            continue

        names = sorted(set(filter(None, (prettifyName(n) for n in memberVolumes))))
        caves.append({
            "id": caveId(memberVolumes, centerX, centerY),
            "name": names[0] if names else None,
            "bbox": [round(v) for v in bbox],
            "zRange": [round(min(zValues)), round(max(zValues))] if zValues else None,
            "areaM2": round(len(cells) * (GRID_CM / 100.0) ** 2),
            "volumes": sorted(memberVolumes),
            "rings": rings,
        })

    # Stable order: north to south, then west to east (bbox top-left).
    caves.sort(key=lambda c: (-c["bbox"][3], c["bbox"][0]))
    return caves


def main():
    argv = sys.argv[1:]
    contentRoot = argv[0] if argv else DEFAULT_CONTENT_ROOT
    warnings = []
    volumes, boxes, discs, tunnels = collectSources(contentRoot, warnings)
    print(f"Sources: {len(volumes)} cave atmosphere volumes, {len(boxes)} cave-foliage bounds, "
          f"{len(discs)} cave-kit meshes, {len(tunnels)} tunnel splines.")
    caves = buildCaves(volumes, boxes, discs, tunnels, warnings)
    placed = sum(len(c["volumes"]) for c in caves)
    if placed != len(volumes):
        warnings.append(f"{len(volumes) - placed} atmosphere volume(s) did not land in any "
                        f"traced cave")
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump({"caves": caves}, f, ensure_ascii=False, indent=1)
    named = sum(1 for c in caves if c["name"])
    points = sum(len(r) // 2 for c in caves for r in c["rings"])
    print(f"Wrote {OUTPUT_PATH}: {len(caves)} caves ({named} named), {points} outline points, "
          f"{os.path.getsize(OUTPUT_PATH) / 1024:.0f} KB.")
    for warning in warnings:
        print(f"WARNING: {warning}")


if __name__ == "__main__":
    main()
