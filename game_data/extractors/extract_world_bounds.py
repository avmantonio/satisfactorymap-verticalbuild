"""Extract the map's two invisible limits -- the damaging world perimeter and
the edge of the real water -- into game_data/sav_data/worldBounds.json.

Both are authored level geometry with no representation in a save, so the
cooked world-partition export under <Content>/FactoryGame/Map/GameLevel01/ is
the only source (same dump extract_collectables.py reads).

1. PERIMETER -- `FGDamageOverTimeVolume` actors whose `mDotComponent` carries
   mDotClass `BP_DoTWorldPerimeter_C`
   (/FactoryGame/World/Hazard/WorldPerimeter/): the volumes that hurt you for
   leaving the map. 15 of them, each a box brush (its shape survives the cook
   as the BrushComponent's BrushBodySetup.AggGeom convex hull, in component
   space):

   - 11 are vertical walls: four axis-aligned slabs (N/S/E/W), three rotated
     blocks that cut the NE/NW/SW corners diagonally -- the NE one is what
     fences off the big empty landmass in the top-right of the map render,
     which carries no resource nodes because you are not meant to stand on it
     -- and four more slabs 1-2 km further out that act as a backstop.
   - 4 are horizontal slabs spanning the whole world in XY: the ceiling and
     the floor. Those are reported as altitudes, not as part of the polygon.

   The polygon written out is the SAFE side: the union of the wall footprints
   is rasterized, the cell holding the world center is flood-filled, and that
   region's outline is traced. Its edges are the inner faces of the walls --
   cross one and the damage starts.

2. WATER -- `FGWaterVolume` actors (all 279 carry mResourceClass
   Desc_Water_C, i.e. this is the water a Water Extractor accepts and the
   water you can swim in). Their footprints are unioned the same way and the
   OUTER ring of the largest connected body is written out: the ocean's real
   edge.

   This matters because the ocean you can SEE goes far past it. The visual
   surface is drawn by 31 `BPW_OceanSplineTool_02_C` water-plane patches,
   three of which are 51 km x 34 km -- the water volumes stop within ~8 km of
   the map center. Between the two limits the ocean renders normally but has
   no water body in it: nothing to swim in, nothing for an extractor.

   Read the ring for what it is: the line where water stops, ALL the way
   round. Offshore that is the answer to "how far out does the sea go"; where
   it runs across land it is the edge of the box a lake or river volume is
   built from (those boxes overlap their own banks), which is the same
   statement -- no water past this line -- but says nothing new about the
   coast, which the map render already draws. `extentBbox` is the blunt
   version: no water exists outside that rectangle at all.

Caveats, deliberate:
  - A water volume is a 3D box, so its footprint covers the shoreline and
    some land as well; only the OUTER boundary of the union is meaningful
    here, which is what gets written. Do not read the polygon as "this is
    where water is" -- read it as "outside this, there is none".
  - Both outlines are traced on a GRID_CM raster, so they are accurate to
    about one cell, and the perimeter's straight walls come out as their
    exact inner faces (verified against a half-plane intersection of the same
    volumes -- see the self-check in buildPerimeter).
  - Nothing here is save-dependent: the table is identical for every world.

    py game_data/extractors/extract_world_bounds.py [path/to/extraction/.../Content]

Re-run whenever the extraction dump is refreshed (new game patch), and review
the git diff: this file is committed (the app must work without game files).

Shape (worldBounds.json):
  {"perimeter": {"polygon": [[x, y], ...], "ceilingZ": z, "floorZ": z,
                 "wallVolumes": n, "altitudeVolumes": n},
   "water": {"outerRing": [[x, y], ...], "extentBbox": [...], "bodies": n,
             "volumes": n, "visualOceanBbox": [...]}}

- polygon / outerRing: closed loops in world cm (integers, first point not
  repeated at the end).
- ceilingZ / floorZ: world cm. Above ceilingZ, or below floorZ, the vertical
  damage slabs start. floorZ is the one you meet by diving.
- extentBbox: [minX, minY, maxX, maxY] over every water volume -- the
  rectangle outside which there is no water at all.
- visualOceanBbox: [minX, minY, maxX, maxY] of the rendered ocean planes --
  the far larger area the water *looks* like it covers.
"""

import json
import math
import os
import re
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_CONTENT_ROOT = r"C:\Users\plane.DESKTOP-SAH3OHV\Documents\SatisExtract\FactoryGame\Content"
LEVEL_SUBDIR = os.path.join("FactoryGame", "Map", "GameLevel01")
OUTPUT_PATH = os.path.join(REPO_ROOT, "game_data", "sav_data", "worldBounds.json")

NEEDLES = (b"FGDamageOverTimeVolume", b"FGWaterVolume", b"OceanSplineTool")
# The three damage classes that make up the map's edge, all under
# /FactoryGame/World/Hazard/WorldPerimeter/. The split between them is not
# geometric -- the four outermost backstop walls are tagged ...Bottom_C, and
# one ceiling slab is too -- so this script classifies by SHAPE (a slab that
# spans the whole world in XY is an altitude limit, anything else is a wall)
# and uses the class only to recognise a damage volume as part of the edge.
PERIMETER_DOT_CLASSES = ("BP_DoTWorldPerimeter_C", "BP_DoTWorldTop_C", "BP_DoTWorldBottom_C")
WATER_RESOURCE = "Desc_Water_C"

# 20 m cells: the walls are kilometers long and the water edge is a staircase
# of volume corners, so nothing finer would say anything more.
GRID_CM = 2000.0
# A volume covering more than this in BOTH axes is a ceiling/floor slab, not a
# wall (the real walls are at most ~10 km long on one axis, ~2.4 km on the
# other; the horizontal slabs span the full 10 km x 10 km world).
WORLD_SPAN_CM = 900000.0
# Trace tolerance, in cells. The water edge is a staircase of volume corners,
# so it keeps a looser one -- 30 m of detail there says nothing.
SIMPLIFY_CELLS = 0.75
WATER_SIMPLIFY_CELLS = 1.5
# Grid extent: everything of interest is within +-8 km of the origin; the
# rendered ocean planes (tens of km) are deliberately NOT rasterized.
WORLD_LIMIT_CM = 800000.0


# ---------------------------------------------------------------------------
# Dump walk
# ---------------------------------------------------------------------------

def rotMatrix(pitch, yaw, roll):
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
    m = rotMatrix(*rot)
    x, y, z = point[0] * scale[0], point[1] * scale[1], point[2] * scale[2]
    return (loc[0] + x * m[0][0] + y * m[1][0] + z * m[2][0],
            loc[1] + x * m[0][1] + y * m[1][1] + z * m[2][1],
            loc[2] + x * m[0][2] + y * m[1][2] + z * m[2][2])


def exportIndex(reference):
    if not isinstance(reference, dict):
        return None
    match = re.search(r"\.(\d+)$", reference.get("ObjectPath") or "")
    return int(match.group(1)) if match else None


def quotedName(objectField):
    if not objectField:
        return None
    name = objectField.get("ObjectName", "")
    return name.split("'")[1] if "'" in name else None


def brushHulls(exports, props, resolve):
    """World-space convex hulls of a brush actor, plus its component transform."""
    comp = resolve(props.get("BrushComponent") or props.get("RootComponent"))
    if not comp:
        return [], None
    cp = comp.get("Properties") or {}
    loc = cp.get("RelativeLocation") or {}
    rot = cp.get("RelativeRotation") or {}
    scale = cp.get("RelativeScale3D") or {}
    transform = ([loc.get("X", 0.0), loc.get("Y", 0.0), loc.get("Z", 0.0)],
                 [rot.get("Pitch", 0.0), rot.get("Yaw", 0.0), rot.get("Roll", 0.0)],
                 [scale.get("X", 1.0), scale.get("Y", 1.0), scale.get("Z", 1.0)])
    body = resolve(cp.get("BrushBodySetup"))
    hulls = []
    for elem in ((body or {}).get("Properties") or {}).get("AggGeom", {}).get("ConvexElems") or []:
        verts = [toWorld(*transform, (v["X"], v["Y"], v["Z"])) for v in elem.get("VertexData") or []]
        if verts:
            hulls.append(verts)
    return hulls, transform


def collectSources(contentRoot, warnings):
    """(perimeterVolumes, waterVolumes, oceanPlaneBounds) from one dump walk."""
    levelRoot = os.path.join(contentRoot, LEVEL_SUBDIR)
    if not os.path.isdir(levelRoot):
        raise SystemExit(f"Level export dir not found: {levelRoot}")
    perimeter, water, oceanBounds = {}, {}, []
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
                name = obj.get("Name")
                props = obj.get("Properties") or {}

                if objType == "FGDamageOverTimeVolume":
                    dot = resolve(props.get("mDotComponent"))
                    dotClass = quotedName((dot or {}).get("Properties", {}).get("mDotClass"))
                    if dotClass not in PERIMETER_DOT_CLASSES:
                        warnings.append(f"{name}: damage volume with mDotClass {dotClass!r}, "
                                        f"which is not one of the world-edge classes -- skipped "
                                        f"(a new hazard type? check whether it fences the map)")
                        continue
                    hulls, _ = brushHulls(exports, props, resolve)
                    if not hulls:
                        warnings.append(f"{name}: perimeter volume with no brush geometry")
                        continue
                    perimeter[name] = (dotClass, hulls)

                elif objType == "FGWaterVolume":
                    resource = quotedName(props.get("mResourceClass"))
                    if resource != WATER_RESOURCE:
                        warnings.append(f"{name}: water volume yields {resource!r}, not "
                                        f"{WATER_RESOURCE} -- skipped")
                        continue
                    hulls, _ = brushHulls(exports, props, resolve)
                    if not hulls:
                        # 9 of these exist: no transform, no body setup, no
                        # geometry at all in the dump -- editor leftovers.
                        continue
                    water[name] = hulls

                elif objType == "BPW_OceanSplineTool_02_C":
                    lo, hi = props.get("Bounds Min") or {}, props.get("Bounds Max") or {}
                    if "X" in lo and "X" in hi:
                        oceanBounds.append([lo["X"], lo["Y"], hi["X"], hi["Y"]])
    return perimeter, water, oceanBounds


# ---------------------------------------------------------------------------
# Raster helpers (same approach as extract_caves.py, at a coarser grid)
# ---------------------------------------------------------------------------

class Grid:
    def __init__(self, minX, minY, maxX, maxY):
        self.originX, self.originY = minX, minY
        self.width = int((maxX - minX) / GRID_CM) + 2
        self.height = int((maxY - minY) / GRID_CM) + 2
        self.cells = bytearray(self.width * self.height)

    def cellOf(self, x, y):
        return (int((x - self.originX) / GRID_CM), int((y - self.originY) / GRID_CM))

    def worldOf(self, cx, cy):
        return (self.originX + cx * GRID_CM, self.originY + cy * GRID_CM)

    def fillPolygon(self, points):
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


def convexHull2d(points):
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


def floodFrom(grid, startCell, wanted):
    """Cells reachable from startCell through cells whose value == wanted."""
    sx, sy = startCell
    start = sy * grid.width + sx
    if grid.cells[start] != wanted:
        return []
    seen = bytearray(len(grid.cells))
    seen[start] = 1
    stack, cells = [start], []
    while stack:
        index = stack.pop()
        cx, cy = index % grid.width, index // grid.width
        cells.append((cx, cy))
        for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
            if not (0 <= nx < grid.width and 0 <= ny < grid.height):
                continue
            n = ny * grid.width + nx
            if grid.cells[n] == wanted and not seen[n]:
                seen[n] = 1
                stack.append(n)
    return cells


def connectedComponents(grid):
    seen = bytearray(len(grid.cells))
    out = []
    for start in range(len(grid.cells)):
        if not grid.cells[start] or seen[start]:
            continue
        stack, cells = [start], []
        seen[start] = 1
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
        out.append(cells)
    return out


def traceRings(cells):
    """Outer rings of a cell set, in cell-corner coordinates (see extract_caves)."""
    filled = set(cells)
    edges = {}
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
        ring, current, previous = [start], start, None
        while True:
            options = edges.get(current)
            if not options:
                break
            if len(options) == 1 or previous is None:
                nextPoint = options.pop()
            else:
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
        if len(ring) < 4:
            continue
        area = 0.0
        for i in range(len(ring)):
            ax, ay = ring[i]
            bx, by = ring[(i + 1) % len(ring)]
            area += ax * by - bx * ay
        if area > 0:
            rings.append((ring, area))
    rings.sort(key=lambda r: -r[1])
    return [r[0] for r in rings]


def simplifyRing(points, epsilon):
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
            distance = (math.hypot(px - ax, py - ay) if norm == 0
                        else abs(dy * px - dx * py + bx * ay - by * ax) / norm)
            if distance > worst:
                worst, worstIndex = distance, i
        if worst <= epsilon:
            return [chunk[0], chunk[-1]]
        return rdp(chunk[:worstIndex + 1])[:-1] + rdp(chunk[worstIndex:])

    startIndex = min(range(len(points)), key=lambda i: points[i])
    rotated = points[startIndex:] + points[:startIndex]
    half = len(rotated) // 2
    return rdp(rotated[:half + 1])[:-1] + rdp(rotated[half:] + [rotated[0]])[:-1]


# ---------------------------------------------------------------------------
# The two boundaries
# ---------------------------------------------------------------------------

def clipHalfPlane(polygon, point, normal):
    """Sutherland-Hodgman clip to {X : (X - point) . normal <= 0}."""
    out = []
    for i in range(len(polygon)):
        a, b = polygon[i], polygon[(i + 1) % len(polygon)]
        da = (a[0] - point[0]) * normal[0] + (a[1] - point[1]) * normal[1]
        db = (b[0] - point[0]) * normal[0] + (b[1] - point[1]) * normal[1]
        if da <= 0:
            out.append(a)
        if (da <= 0) != (db <= 0):
            t = da / (da - db)
            out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out


def exactSafePolygon(walls, center):
    """The safe area as an exact half-plane intersection.

    Each wall is a convex box, so "outside this wall" is a half-plane bounded
    by the box face nearest the map center. Used to check the rasterized
    outline, which is what actually gets written (it does not assume the
    result is convex).
    """
    limit = WORLD_LIMIT_CM
    polygon = [(-limit, -limit), (limit, -limit), (limit, limit), (-limit, limit)]
    for hulls in walls.values():
        verts = [p for hull in hulls for p in hull]
        cx = sum(v[0] for v in verts) / len(verts)
        cy = sum(v[1] for v in verts) / len(verts)
        best = None
        # Box axes recovered from the footprint hull: the two edge directions.
        footprint = convexHull2d([(v[0], v[1]) for v in verts])
        for i in range(len(footprint)):
            ax, ay = footprint[i]
            bx, by = footprint[(i + 1) % len(footprint)]
            ex, ey = bx - ax, by - ay
            length = math.hypot(ex, ey)
            if length < 1.0:
                continue
            # Outward normal of this edge (footprint is counter-clockwise).
            nx, ny = ey / length, -ex / length
            # Distance from the center to this edge's line, positive outside.
            distance = (center[0] - ax) * nx + (center[1] - ay) * ny
            if distance > 0 and (best is None or distance > best[0]):
                best = (distance, (ax, ay), (-nx, -ny))
        if best:
            polygon = clipHalfPlane(polygon, best[1], best[2])
    return polygon


def pointToPolygonDistance(point, polygon):
    best = float("inf")
    for i in range(len(polygon)):
        ax, ay = polygon[i]
        bx, by = polygon[(i + 1) % len(polygon)]
        ex, ey = bx - ax, by - ay
        length2 = ex * ex + ey * ey
        t = 0.0 if length2 == 0 else max(0.0, min(1.0, ((point[0] - ax) * ex + (point[1] - ay) * ey) / length2))
        best = min(best, math.hypot(point[0] - (ax + ex * t), point[1] - (ay + ey * t)))
    return best


def buildPerimeter(perimeter, warnings):
    walls, altitude = {}, {}
    for name, (_dotClass, hulls) in perimeter.items():
        verts = [p for hull in hulls for p in hull]
        spanX = max(v[0] for v in verts) - min(v[0] for v in verts)
        spanY = max(v[1] for v in verts) - min(v[1] for v in verts)
        if spanX > WORLD_SPAN_CM and spanY > WORLD_SPAN_CM:
            altitude[name] = (min(v[2] for v in verts), max(v[2] for v in verts))
        else:
            walls[name] = hulls
    if not walls:
        raise SystemExit("No perimeter wall volumes found -- wrong Content path?")

    # The world center, i.e. a point that is certainly inside: the altitude
    # slabs are centered on it (they span the whole world).
    if altitude:
        anyName = next(iter(altitude))
        verts = [p for hull in perimeter[anyName][1] for p in hull]
        center = (sum(v[0] for v in verts) / len(verts), sum(v[1] for v in verts) / len(verts))
    else:
        center = (0.0, 0.0)

    # Each wall is a convex box, so the safe area is the intersection of one
    # half-plane per wall (bounded by the box face nearest the center). That
    # is exact -- straight walls come out as their true inner faces, and the
    # three diagonal corner cuts as three clean lines.
    exact = exactSafePolygon(walls, center)
    polygon = [[round(x), round(y)] for x, y in exact]

    # ...but "intersection of half-planes" is only the right model if the
    # walls really do enclose a convex area. Cross-check against a model that
    # assumes nothing: rasterize the walls, flood-fill from the center, trace
    # that region. The two outlines must agree to within a couple of cells in
    # BOTH directions (one-way would pass even if the raster region were far
    # bigger than the convex one).
    grid = Grid(-WORLD_LIMIT_CM, -WORLD_LIMIT_CM, WORLD_LIMIT_CM, WORLD_LIMIT_CM)
    for hulls in walls.values():
        for hull in hulls:
            footprint = convexHull2d([(p[0], p[1]) for p in hull])
            if len(footprint) >= 3:
                grid.fillPolygon(footprint)
    safeCells = floodFrom(grid, grid.cellOf(*center), 0)
    if not safeCells:
        raise SystemExit("World center is inside a perimeter wall -- geometry changed?")
    traced = [grid.worldOf(cx, cy) for cx, cy in simplifyRing(traceRings(safeCells)[0], SIMPLIFY_CELLS)]
    worst = max(max(pointToPolygonDistance(p, traced) for p in exact),
                max(pointToPolygonDistance(p, exact) for p in traced))
    if worst > 3 * GRID_CM:
        warnings.append(f"the exact and rasterized perimeters disagree by up to {worst:.0f} cm "
                        f"(expected under {3 * GRID_CM:.0f}) -- the walls may no longer enclose "
                        f"a convex area, in which case the written polygon is wrong")

    ceiling = min((lo for lo, _hi in altitude.values() if lo > 0), default=None)
    floor = max((hi for _lo, hi in altitude.values() if hi < 0), default=None)
    return {
        "polygon": polygon,
        "ceilingZ": round(ceiling) if ceiling is not None else None,
        "floorZ": round(floor) if floor is not None else None,
        "wallVolumes": len(walls),
        "altitudeVolumes": len(altitude),
    }, worst


def buildWater(water, oceanBounds):
    grid = Grid(-WORLD_LIMIT_CM, -WORLD_LIMIT_CM, WORLD_LIMIT_CM, WORLD_LIMIT_CM)
    for hulls in water.values():
        for hull in hulls:
            footprint = convexHull2d([(p[0], p[1]) for p in hull])
            if len(footprint) >= 3:
                grid.fillPolygon(footprint)
    components = connectedComponents(grid)
    components.sort(key=len, reverse=True)
    # The ocean and everything draining into it are one component holding
    # ~95% of all water footprint; the rest are inland lakes well inside it.
    rings = traceRings(components[0])
    ring = simplifyRing(rings[0], WATER_SIMPLIFY_CELLS)
    outer = [[round(grid.worldOf(cx, cy)[0]), round(grid.worldOf(cx, cy)[1])] for cx, cy in ring]
    bbox = None
    if oceanBounds:
        bbox = [round(min(b[0] for b in oceanBounds)), round(min(b[1] for b in oceanBounds)),
                round(max(b[2] for b in oceanBounds)), round(max(b[3] for b in oceanBounds))]
    allVerts = [p for hulls in water.values() for hull in hulls for p in hull]
    return {
        "outerRing": outer,
        "extentBbox": [round(min(v[0] for v in allVerts)), round(min(v[1] for v in allVerts)),
                       round(max(v[0] for v in allVerts)), round(max(v[1] for v in allVerts))],
        "bodies": len(components),
        "volumes": len(water),
        "visualOceanBbox": bbox,
    }


def main():
    argv = sys.argv[1:]
    contentRoot = argv[0] if argv else DEFAULT_CONTENT_ROOT
    warnings = []
    perimeterVolumes, waterVolumes, oceanBounds = collectSources(contentRoot, warnings)
    print(f"Sources: {len(perimeterVolumes)} world-perimeter damage volumes, "
          f"{len(waterVolumes)} water volumes, {len(oceanBounds)} ocean plane patches.")
    perimeter, worst = buildPerimeter(perimeterVolumes, warnings)
    water = buildWater(waterVolumes, oceanBounds)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump({"perimeter": perimeter, "water": water}, f, ensure_ascii=False, indent=1)

    xs = [p[0] for p in perimeter["polygon"]]
    ys = [p[1] for p in perimeter["polygon"]]
    wxs = [p[0] for p in water["outerRing"]]
    wys = [p[1] for p in water["outerRing"]]
    print(f"Perimeter: {len(perimeter['polygon'])} vertices, "
          f"X[{min(xs)}, {max(xs)}] Y[{min(ys)}, {max(ys)}] cm "
          f"({(max(xs) - min(xs)) / 100:.0f} x {(max(ys) - min(ys)) / 100:.0f} m), "
          f"ceiling {perimeter['ceilingZ']}, floor {perimeter['floorZ']} "
          f"(exact-vs-traced worst deviation {worst:.0f} cm)")
    print(f"Water: {len(water['outerRing'])} vertices, X[{min(wxs)}, {max(wxs)}] "
          f"Y[{min(wys)}, {max(wys)}] cm, {water['bodies']} separate bodies")
    print(f"Visual ocean planes cover {water['visualOceanBbox']} -- "
          f"{(water['visualOceanBbox'][2] - water['visualOceanBbox'][0]) / 100000:.0f} km wide.")
    print(f"Wrote {OUTPUT_PATH} ({os.path.getsize(OUTPUT_PATH) / 1024:.0f} KB).")
    for warning in warnings:
        print(f"WARNING: {warning}")


if __name__ == "__main__":
    main()
