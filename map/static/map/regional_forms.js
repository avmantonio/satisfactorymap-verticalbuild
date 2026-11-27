// Exact original recipe registry for the regional viewer kit.
// Coverage: specs/viewer-initial-coverage.md. No official/traced assets.

export const CATEGORY_COLORS = {
  Special: "#e84393",
  Production: "#e67e22",
  Power: "#f1c40f",
  Logistics: "#3498db",
  Organisation: "#1abc9c",
  Walls: "#95a5a6",
  Foundation: "#7a7a7a",
  Unknown: "#e74c3c",
};

export const NEUTRAL_RESERVE_COLOR = "#9aa3b2";
export const UNCERTAIN_MARKER_COLOR = "#f4d35e";

const RECIPE_BY_CLASS = Object.freeze({
  Build_Foundation_8x1_01_C: "grid-floor",
  Build_Foundation_8x2_01_C: "grid-floor",
  Build_Foundation_8x4_01_C: "grid-floor",
  Build_Ramp_8x4_01_C: "grid-ramp-reserve",
  Build_Ramp_8x4_Inverted_01_C: "grid-ramp-reserve",
  Build_Wall_8x4_01_C: "wall-panel",
  Build_Wall_8x4_02_C: "wall-panel",
  Build_PillarMiddle_C: "pillar-reserve",
  Build_SmelterMk1_C: "smelter-cue",
  Build_ConstructorMk1_C: "constructor-cue",
  Build_StorageContainerMk1_C: "storage-cue",
  Build_StorageContainerMk2_C: "storage-cue",
  Build_PowerPoleMk1_C: "power-pole-cue",
});

function boxTriangles(min, max) {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const p = [
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
  ];
  const faces = [
    [0, 1, 2, 0, 2, 3],
    [4, 6, 5, 4, 7, 6],
    [0, 4, 5, 0, 5, 1],
    [3, 2, 6, 3, 6, 7],
    [0, 3, 7, 0, 7, 4],
    [1, 5, 6, 1, 6, 2],
  ];
  const out = [];
  faces.forEach((idx) => idx.forEach((i) => out.push(p[i][0], p[i][1], p[i][2])));
  return out;
}

function boxWire(min, max) {
  const [x0, y0, z0] = min;
  const [x1, y1, z1] = max;
  const c = [
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
  ];
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  const out = [];
  edges.forEach(([a, b]) => {
    out.push(c[a][0], c[a][1], c[a][2], c[b][0], c[b][1], c[b][2]);
  });
  return out;
}

function lineList(pairs) {
  const out = [];
  pairs.forEach((pair) => {
    pair.forEach((p) => out.push(p[0], p[1], p[2]));
  });
  return out;
}

function assertUnit(positions, recipeId) {
  for (let i = 0; i < positions.length; i++) {
    if (positions[i] < -0.5 - 1e-9 || positions[i] > 0.5 + 1e-9) {
      throw new Error("Recipe " + recipeId + " leaves the unit cube");
    }
  }
}

function part(name, kind, positions, recipeId) {
  assertUnit(positions, recipeId);
  return Object.freeze({ name, kind, positions: Object.freeze(positions) });
}

function recipe(id, family, representation, label, sizeKind, parts) {
  parts.forEach((item) => assertUnit(item.positions, id));
  return Object.freeze({
    id,
    family,
    representation,
    label,
    expectedSizeKind: sizeKind,
    hasEnvelope: sizeKind !== "path",
    hasCue: parts.some((item) => item.name !== "envelope" && item.name !== "slab"),
    parts: Object.freeze(parts),
  });
}

const UNIT_MIN = [-0.5, -0.5, -0.5];
const UNIT_MAX = [0.5, 0.5, 0.5];

export const RECIPES = Object.freeze({
  "grid-floor": recipe(
    "grid-floor",
    "support",
    "named-grid-slab",
    "Approximate named slab",
    "named-box",
    [
      part("slab", "solid", boxTriangles(UNIT_MIN, UNIT_MAX), "grid-floor"),
      part("seams", "line", lineList([
        [[-0.25, -0.5, 0.5], [-0.25, 0.5, 0.5]],
        [[0.25, -0.5, 0.5], [0.25, 0.5, 0.5]],
        [[-0.5, -0.25, 0.5], [0.5, -0.25, 0.5]],
        [[-0.5, 0.25, 0.5], [0.5, 0.25, 0.5]],
      ]), "grid-floor"),
    ],
  ),
  "grid-ramp-reserve": recipe(
    "grid-ramp-reserve",
    "support",
    "named-ramp-box",
    "Approximate box, exact surface pending",
    "named-box",
    [
      part("slab", "solid", boxTriangles(UNIT_MIN, UNIT_MAX), "grid-ramp-reserve"),
      part("diagonal", "line", lineList([
        [[-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]],
        [[-0.5, 0.5, -0.5], [0.5, -0.5, 0.5]],
      ]), "grid-ramp-reserve"),
    ],
  ),
  "wall-panel": recipe(
    "wall-panel",
    "enclosure",
    "reserve-panel",
    "Reserve + schematic cue",
    "clearance-reserve",
    [
      part("envelope", "wire", boxWire(UNIT_MIN, UNIT_MAX), "wall-panel"),
      part("cue", "line", lineList([
        [[-0.17, -0.5, -0.5], [-0.17, -0.5, 0.5]],
        [[0.17, -0.5, -0.5], [0.17, -0.5, 0.5]],
        [[-0.5, -0.5, 0], [0.5, -0.5, 0]],
      ]), "wall-panel"),
    ],
  ),
  "pillar-reserve": recipe(
    "pillar-reserve",
    "support",
    "reserve-prism",
    "Reserve + schematic cue",
    "clearance-reserve",
    [
      part("envelope", "wire", boxWire(UNIT_MIN, UNIT_MAX), "pillar-reserve"),
      part("caps", "line", lineList([
        [[-0.35, -0.35, 0.5], [0.35, -0.35, 0.5]],
        [[0.35, -0.35, 0.5], [0.35, 0.35, 0.5]],
        [[0.35, 0.35, 0.5], [-0.35, 0.35, 0.5]],
        [[-0.35, 0.35, 0.5], [-0.35, -0.35, 0.5]],
        [[-0.35, -0.35, -0.5], [0.35, -0.35, -0.5]],
        [[0.35, -0.35, -0.5], [0.35, 0.35, -0.5]],
        [[0.35, 0.35, -0.5], [-0.35, 0.35, -0.5]],
        [[-0.35, 0.35, -0.5], [-0.35, -0.35, -0.5]],
      ]), "pillar-reserve"),
    ],
  ),
  "smelter-cue": recipe(
    "smelter-cue",
    "production",
    "reserve-furnace",
    "Reserve + schematic cue",
    "clearance-reserve",
    [
      part("envelope", "wire", boxWire(UNIT_MIN, UNIT_MAX), "smelter-cue"),
      part("body", "solid", boxTriangles([-0.46, -0.46, -0.5], [0.46, 0.18, 0.05]), "smelter-cue"),
      part("chimney", "solid", boxTriangles([0.04, 0.14, -0.42], [0.46, 0.48, 0.5]), "smelter-cue"),
    ],
  ),
  "constructor-cue": recipe(
    "constructor-cue",
    "production",
    "reserve-gantry",
    "Reserve + schematic cue",
    "clearance-reserve",
    [
      part("envelope", "wire", boxWire(UNIT_MIN, UNIT_MAX), "constructor-cue"),
      part("base", "solid", boxTriangles([-0.45, -0.45, -0.5], [0.45, 0.45, -0.18]), "constructor-cue"),
      part("gantry", "solid", boxTriangles([-0.08, -0.42, -0.18], [0.08, 0.42, 0.42]), "constructor-cue"),
      part("arm", "solid", boxTriangles([0.08, 0.18, 0.22], [0.42, 0.32, 0.32]), "constructor-cue"),
    ],
  ),
  "storage-cue": recipe(
    "storage-cue",
    "logistics",
    "reserve-container",
    "Reserve + schematic cue",
    "clearance-reserve",
    [
      part("envelope", "wire", boxWire(UNIT_MIN, UNIT_MAX), "storage-cue"),
      part("body", "solid", boxTriangles([-0.4, -0.46, -0.46], [0.4, 0.46, 0.46]), "storage-cue"),
      part("ribs", "line", lineList([
        [[0.4, -0.3, -0.4], [0.4, -0.3, 0.4]],
        [[0.4, 0, -0.4], [0.4, 0, 0.4]],
        [[0.4, 0.3, -0.4], [0.4, 0.3, 0.4]],
      ]), "storage-cue"),
    ],
  ),
  "storage-cue-mk2": recipe(
    "storage-cue-mk2",
    "logistics",
    "reserve-container",
    "Reserve + schematic cue",
    "clearance-reserve",
    [
      part("envelope", "wire", boxWire(UNIT_MIN, UNIT_MAX), "storage-cue-mk2"),
      part("body", "solid", boxTriangles([-0.4, -0.46, -0.46], [0.4, 0.46, 0.46]), "storage-cue-mk2"),
      part("ribs", "line", lineList([
        [[0.4, -0.3, -0.4], [0.4, -0.3, 0.4]],
        [[0.4, 0, -0.4], [0.4, 0, 0.4]],
        [[0.4, 0.3, -0.4], [0.4, 0.3, 0.4]],
        [[0.4, -0.46, -0.16], [0.4, 0.46, -0.16]],
        [[0.4, -0.46, 0.16], [0.4, 0.46, 0.16]],
      ]), "storage-cue-mk2"),
    ],
  ),
  "power-pole-cue": recipe(
    "power-pole-cue",
    "power",
    "reserve-mast",
    "Reserve + schematic cue",
    "clearance-reserve",
    [
      part("envelope", "wire", boxWire(UNIT_MIN, UNIT_MAX), "power-pole-cue"),
      part("mast", "solid", boxTriangles([-0.08, -0.08, -0.5], [0.08, 0.08, 0.5]), "power-pole-cue"),
      part("crossbar", "solid", boxTriangles([-0.42, -0.06, 0.28], [0.42, 0.06, 0.38]), "power-pole-cue"),
    ],
  ),
  "named-box-pending": recipe(
    "named-box-pending",
    "fallback",
    "named-box",
    "Form coverage pending",
    "named-box",
    [part("slab", "solid", boxTriangles(UNIT_MIN, UNIT_MAX), "named-box-pending")],
  ),
  "reserve-pending": recipe(
    "reserve-pending",
    "fallback",
    "reserve",
    "Form coverage pending",
    "clearance-reserve",
    [part("envelope", "wire", boxWire(UNIT_MIN, UNIT_MAX), "reserve-pending")],
  ),
});

export const MINIMUM_CLASS_RECIPES = Object.freeze({ ...RECIPE_BY_CLASS });

export function shortClassName(typePath) {
  if (typeof typePath !== "string" || !typePath) {
    return "";
  }
  const dot = typePath.lastIndexOf(".");
  return dot >= 0 ? typePath.slice(dot + 1) : typePath;
}

export function recipeIdForClass(typePath) {
  const short = shortClassName(typePath);
  if (short === "Build_StorageContainerMk2_C") {
    return "storage-cue-mk2";
  }
  return RECIPE_BY_CLASS[short] || null;
}

function has(uncertainty, token) {
  return Array.isArray(uncertainty) && uncertainty.indexOf(token) >= 0;
}

function categoryColor(category) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Unknown;
}

function poseKnown(occupant) {
  const flags = occupant.poseFlags;
  const scaleUnknown = !(flags & 2) || has(occupant.uncertainty, "scale-unknown");
  const orientUnknown = !(flags & 1) || has(occupant.uncertainty, "orientation-unknown");
  return { scaleUnknown, orientUnknown, unknownTransform: scaleUnknown || orientUnknown };
}

/**
 * Override order from the coverage spec. SizeKind is never upgraded by a recipe.
 */
export function classifyOccupant(occupant, typeRow) {
  const typePath = typeRow && typeRow.typePath ? typeRow.typePath : "";
  const category = typeRow && typeRow.category ? typeRow.category : "Unknown";
  const recipeId = recipeIdForClass(typePath);
  const mapped = recipeId ? RECIPES[recipeId] : null;
  const pose = poseKnown(occupant);
  const color = categoryColor(category);
  const base = {
    id: occupant.id,
    typePath,
    category,
    color,
    recipeId: null,
    envelope: false,
    cue: false,
    sizeKind: occupant.sizeKind,
  };

  if (pose.unknownTransform) {
    const why = pose.scaleUnknown && pose.orientUnknown
      ? "scale and orientation unknown"
      : pose.scaleUnknown ? "scale unknown" : "orientation unknown";
    return Object.assign(base, {
      visual: "uncertain-marker",
      label: "Location marker — " + why,
      summary: "Uncertain location. Known class dimensions are not drawn as a solid.",
    });
  }

  if (occupant.recordKind === "path" && occupant.pathState === "linear") {
    return Object.assign(base, {
      visual: "static-path",
      recipeId: "static-path",
      label: "Clipped linear trace",
      summary: "Straight segments between saved samples. Not a measured cross-section.",
    });
  }

  if (occupant.sizeKind === "unknown" || occupant.pathState === "unavailable") {
    const why = occupant.pathState === "unavailable" ? "path unavailable" : "size unknown";
    return Object.assign(base, {
      visual: "uncertain-marker",
      label: "Location marker — " + why,
      summary: "No complete volume. A known plan axis is not extruded into a solid.",
    });
  }

  if (occupant.sizeKind === "named-box") {
    if (mapped && mapped.expectedSizeKind === "named-box") {
      return Object.assign(base, {
        visual: "named-form",
        recipeId: mapped.id,
        envelope: true,
        cue: mapped.hasCue,
        label: mapped.label,
        summary: "Named box uses an original approximate grid-piece form.",
      });
    }
    return Object.assign(base, {
      visual: "named-box",
      recipeId: "named-box-pending",
      envelope: true,
      label: "Approximate named box — form coverage pending",
      summary: "Complete named dimensions, no committed family form.",
    });
  }

  if (occupant.sizeKind === "clearance-reserve") {
    if (mapped && mapped.expectedSizeKind === "clearance-reserve") {
      return Object.assign(base, {
        visual: "reserve-cue",
        recipeId: mapped.id,
        envelope: true,
        cue: true,
        label: mapped.label,
        summary: "Neutral reserve remains the size authority; cue is schematic.",
      });
    }
    return Object.assign(base, {
      visual: "reserve",
      recipeId: "reserve-pending",
      envelope: true,
      label: "Neutral reserve — form coverage pending",
      summary: "Clearance envelope only. Unlisted class is not guessed into a family form.",
    });
  }

  return Object.assign(base, {
    visual: "uncertain-marker",
    label: "Location marker — unsupported volume",
    summary: "No honest solid for this record.",
  });
}

export function recipeParts(recipeId) {
  const rec = RECIPES[recipeId];
  return rec ? rec.parts : [];
}

export function normalizeQuat(q) {
  const n = Math.hypot(q[0], q[1], q[2], q[3]);
  if (!(n > 0)) {
    return [0, 0, 0, 1];
  }
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

export function rotateByQuat(v, q) {
  const [x, y, z] = v;
  const [qx, qy, qz, qw] = q;
  const ix = qw * x + qy * z - qz * y;
  const iy = qw * y + qz * x - qx * z;
  const iz = qw * z + qx * y - qy * x;
  const iw = -qx * x - qy * y - qz * z;
  return [
    ix * qw + iw * -qx + iy * -qz - iz * -qy,
    iy * qw + iw * -qy + iz * -qx - ix * -qz,
    iz * qw + iw * -qz + ix * -qy - iy * -qx,
  ];
}

/**
 * World reconstruction: origin-relative position + R(scale * (offset + localPoint)).
 * `localNorm` is in [-0.5,+0.5] of each extent axis.
 */
export function occupantWorldPoint(pose, localNorm) {
  const offset = [pose[13], pose[14], pose[15]];
  const extent = [pose[10], pose[11], pose[12]];
  const scale = [pose[7], pose[8], pose[9]];
  const local = [
    offset[0] + localNorm[0] * extent[0],
    offset[1] + localNorm[1] * extent[1],
    offset[2] + localNorm[2] * extent[2],
  ];
  const scaled = [local[0] * scale[0], local[1] * scale[1], local[2] * scale[2]];
  const rotated = rotateByQuat(scaled, normalizeQuat([pose[3], pose[4], pose[5], pose[6]]));
  return [pose[0] + rotated[0], pose[1] + rotated[1], pose[2] + rotated[2]];
}

export function occupantAabb(pose) {
  const corners = [];
  for (const x of [-0.5, 0.5]) {
    for (const y of [-0.5, 0.5]) {
      for (const z of [-0.5, 0.5]) {
        corners.push(occupantWorldPoint(pose, [x, y, z]));
      }
    }
  }
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  corners.forEach((p) => {
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], p[i]);
      max[i] = Math.max(max[i], p[i]);
    }
  });
  return { min, max };
}

export const LEGEND_TEXT =
  "Simplified observation — not collision or connection validation. Named boxes are approximate; reserves are not shells; uncertain markers show locations only. Paths use straight segments between saved samples.";

export function visualLegendEntries() {
  return [
    { visual: "named-form", structure: "solid grid-piece edges", label: "Named grid slab / ramp-box" },
    { visual: "named-box", structure: "solid approximate box", label: "Named box, form coverage pending" },
    { visual: "reserve-cue", structure: "open wire volume plus inner cue", label: "Reserve + schematic cue" },
    { visual: "reserve", structure: "open wire volume", label: "Neutral reserve, form coverage pending" },
    { visual: "uncertain-marker", structure: "screen-space cross/diamond", label: "Uncertain location marker" },
    { visual: "static-path", structure: "source-chord line / contact marker", label: "Clipped linear trace" },
  ];
}
