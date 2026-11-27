// Strict v1 regional-scene decoder. Pure: no renderer, DOM, or save API.
// Contract: specs/viewer-regional-wire-v1.md (scratch). Not a viewer.

export const REGIONAL_MAGIC = new Uint8Array([0x53, 0x4d, 0x52, 0x45, 0x47, 0x33, 0x44, 0x00]);
export const REGIONAL_SCHEMA_VERSION = 1;
export const REGIONAL_HEADER_BYTES = 128;
export const REGIONAL_ADMISSION_LIMIT = 8000;
export const REGIONAL_MAX_FRAME_BYTES = 67108864;

const TYPE_KEYS = ["typePath", "label", "category", "subcategory"];
const OCCUPANT_KEYS = [
  "id", "typeIndex", "sourceKind", "recordKind", "sizeKind",
  "poseFlags", "pathState", "uncertainty",
];
const META_KEYS = [
  "requestId", "admissionCount", "effectiveBoundsM", "emptyReason", "types", "occupants",
];
const SOURCE_KINDS = new Set(["actor", "lightweight"]);
const RECORD_KINDS = new Set(["occupant", "path"]);
const SIZE_KINDS = new Set(["named-box", "clearance-reserve", "unknown"]);
const PATH_STATES = new Set(["not-path", "linear", "unavailable"]);
const EMPTY_REASONS = new Set(["DISJOINT_Z", "NO_OCCUPANTS"]);
const UNCERTAINTY_ORDER = [
  "size-unknown", "scale-unknown", "orientation-unknown", "path-unavailable", "class-reserve-length",
];
const UNCERTAINTY_ALLOWED = new Set(UNCERTAINTY_ORDER);
const LITTLE_ENDIAN = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

function regionalError(code, message, requestId, details) {
  const error = new Error(message);
  error.name = "RegionalError";
  error.code = code;
  error.requestId = requestId == null ? null : requestId;
  error.sessionLost = false;
  error.details = details && typeof details === "object" ? details : {};
  return error;
}

function invalidFrame(message, requestId, details) {
  return regionalError("INVALID_FRAME", message, requestId, details);
}

function align8(n) {
  if (!Number.isInteger(n) || n < 0 || n > 0xffffffff) {
    return null;
  }
  const sum = n + 7;
  if (sum > 0xffffffff) {
    return null;
  }
  return sum & ~7;
}

function u32(view, offset) {
  return view.getUint32(offset, true);
}

function f64(view, offset) {
  return view.getFloat64(offset, true);
}

function asBytes(input) {
  if (input instanceof Uint8Array) {
    return input;
  }
  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  throw invalidFrame("Frame is not a byte array");
}

function textFromUtf8(bytes, start, length) {
  const slice = bytes.subarray(start, start + length);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(slice);
  } catch (error) {
    throw invalidFrame("Metadata is not strict UTF-8");
  }
}

function skipWs(text, i) {
  while (i < text.length) {
    const c = text.charCodeAt(i);
    if (c === 32 || c === 9 || c === 10 || c === 13) {
      i++;
    } else {
      break;
    }
  }
  return i;
}

function parseString(text, i) {
  if (text.charCodeAt(i) !== 34) {
    throw invalidFrame("Expected JSON string");
  }
  i++;
  let out = "";
  while (i < text.length) {
    const c = text.charCodeAt(i);
    if (c === 34) {
      return { value: out, index: i + 1 };
    }
    if (c === 92) {
      if (i + 1 >= text.length) {
        throw invalidFrame("Unterminated JSON escape");
      }
      const e = text.charAt(i + 1);
      const map = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
      if (map[e] !== undefined) {
        out += map[e];
        i += 2;
        continue;
      }
      if (e === "u" && i + 5 < text.length) {
        const hex = text.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
          throw invalidFrame("Invalid JSON unicode escape");
        }
        out += String.fromCharCode(parseInt(hex, 16));
        i += 6;
        continue;
      }
      throw invalidFrame("Invalid JSON escape");
    }
    if (c < 32) {
      throw invalidFrame("Unescaped control in JSON string");
    }
    out += text.charAt(i);
    i++;
  }
  throw invalidFrame("Unterminated JSON string");
}

function parseNumber(text, i) {
  const start = i;
  if (text.charAt(i) === "-") {
    i++;
  }
  if (i >= text.length) {
    throw invalidFrame("Invalid JSON number");
  }
  if (text.charAt(i) === "0") {
    i++;
  } else if (text.charCodeAt(i) >= 49 && text.charCodeAt(i) <= 57) {
    while (i < text.length && text.charCodeAt(i) >= 48 && text.charCodeAt(i) <= 57) {
      i++;
    }
  } else {
    throw invalidFrame("Invalid JSON number");
  }
  if (text.charAt(i) === ".") {
    i++;
    const frac = i;
    while (i < text.length && text.charCodeAt(i) >= 48 && text.charCodeAt(i) <= 57) {
      i++;
    }
    if (i === frac) {
      throw invalidFrame("Invalid JSON number");
    }
  }
  if (text.charAt(i) === "e" || text.charAt(i) === "E") {
    i++;
    if (text.charAt(i) === "+" || text.charAt(i) === "-") {
      i++;
    }
    const exp = i;
    while (i < text.length && text.charCodeAt(i) >= 48 && text.charCodeAt(i) <= 57) {
      i++;
    }
    if (i === exp) {
      throw invalidFrame("Invalid JSON number");
    }
  }
  const value = Number(text.slice(start, i));
  if (!Number.isFinite(value)) {
    throw invalidFrame("Non-finite JSON number");
  }
  return { value, index: i };
}

function parseValue(text, i) {
  i = skipWs(text, i);
  if (i >= text.length) {
    throw invalidFrame("Truncated JSON");
  }
  const ch = text.charAt(i);
  if (ch === "{") {
    return parseObject(text, i);
  }
  if (ch === "[") {
    return parseArray(text, i);
  }
  if (ch === "\"") {
    return parseString(text, i);
  }
  if (ch === "t" && text.slice(i, i + 4) === "true") {
    return { value: true, index: i + 4 };
  }
  if (ch === "f" && text.slice(i, i + 5) === "false") {
    return { value: false, index: i + 5 };
  }
  if (ch === "n" && text.slice(i, i + 4) === "null") {
    return { value: null, index: i + 4 };
  }
  if (ch === "-" || (ch >= "0" && ch <= "9")) {
    return parseNumber(text, i);
  }
  throw invalidFrame("Invalid JSON value");
}

function parseObject(text, i) {
  if (text.charAt(i) !== "{") {
    throw invalidFrame("Expected JSON object");
  }
  i = skipWs(text, i + 1);
  const out = Object.create(null);
  const keys = new Set();
  if (text.charAt(i) === "}") {
    return { value: out, index: i + 1 };
  }
  while (i < text.length) {
    i = skipWs(text, i);
    const parsedKey = parseString(text, i);
    if (keys.has(parsedKey.value)) {
      throw invalidFrame("Duplicate JSON key: " + parsedKey.value);
    }
    keys.add(parsedKey.value);
    i = skipWs(text, parsedKey.index);
    if (text.charAt(i) !== ":") {
      throw invalidFrame("Expected colon in JSON object");
    }
    const parsedVal = parseValue(text, i + 1);
    out[parsedKey.value] = parsedVal.value;
    i = skipWs(text, parsedVal.index);
    if (text.charAt(i) === ",") {
      i++;
      continue;
    }
    if (text.charAt(i) === "}") {
      return { value: out, index: i + 1 };
    }
    throw invalidFrame("Invalid JSON object");
  }
  throw invalidFrame("Unterminated JSON object");
}

function parseArray(text, i) {
  if (text.charAt(i) !== "[") {
    throw invalidFrame("Expected JSON array");
  }
  i = skipWs(text, i + 1);
  const out = [];
  if (text.charAt(i) === "]") {
    return { value: out, index: i + 1 };
  }
  while (i < text.length) {
    const parsed = parseValue(text, i);
    out.push(parsed.value);
    i = skipWs(text, parsed.index);
    if (text.charAt(i) === ",") {
      i++;
      continue;
    }
    if (text.charAt(i) === "]") {
      return { value: out, index: i + 1 };
    }
    throw invalidFrame("Invalid JSON array");
  }
  throw invalidFrame("Unterminated JSON array");
}

function parseJsonStrict(text) {
  const parsed = parseValue(text, 0);
  const end = skipWs(text, parsed.index);
  if (end !== text.length) {
    throw invalidFrame("Trailing JSON content");
  }
  return parsed.value;
}

function exactKeys(object, expected, label) {
  if (object === null || typeof object !== "object" || Array.isArray(object)) {
    throw invalidFrame(label + " is not an object");
  }
  const keys = Object.keys(object);
  if (keys.length !== expected.length) {
    throw invalidFrame(label + " has unknown or missing keys");
  }
  for (let i = 0; i < expected.length; i++) {
    if (!Object.prototype.hasOwnProperty.call(object, expected[i])) {
      throw invalidFrame(label + " missing " + expected[i]);
    }
  }
}

function requireString(value, label) {
  if (typeof value !== "string") {
    throw invalidFrame(label + " is not a string");
  }
  return value;
}

function requireInt(value, label) {
  if (typeof value !== "number" || !Number.isInteger(value) || !Number.isFinite(value)) {
    throw invalidFrame(label + " is not an integer");
  }
  return value;
}

function requireFinite(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw invalidFrame(label + " is not a finite number");
  }
  return value;
}

function vec3(value, label) {
  if (!Array.isArray(value) || value.length !== 3) {
    throw invalidFrame(label + " is not a 3-vector");
  }
  return [
    requireFinite(value[0], label + "[0]"),
    requireFinite(value[1], label + "[1]"),
    requireFinite(value[2], label + "[2]"),
  ];
}

function sameF64(a, b) {
  return a === b;
}

function zeroPadding(bytes, start, end) {
  for (let i = start; i < end; i++) {
    if (bytes[i] !== 0) {
      throw invalidFrame("Non-zero padding");
    }
  }
}

function typedF32(bytes, offset, count) {
  if (count === 0) {
    return new Float32Array(0);
  }
  if (LITTLE_ENDIAN && (bytes.byteOffset + offset) % 4 === 0) {
    return new Float32Array(bytes.buffer, bytes.byteOffset + offset, count);
  }
  if (!LITTLE_ENDIAN) {
    const out = new Float32Array(count);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < count; i++) {
      out[i] = view.getFloat32(offset + i * 4, true);
    }
    return out;
  }
  const copy = new ArrayBuffer(count * 4);
  new Uint8Array(copy).set(bytes.subarray(offset, offset + count * 4));
  return new Float32Array(copy);
}

function typedU32(bytes, offset, count) {
  if (count === 0) {
    return new Uint32Array(0);
  }
  if (LITTLE_ENDIAN && (bytes.byteOffset + offset) % 4 === 0) {
    return new Uint32Array(bytes.buffer, bytes.byteOffset + offset, count);
  }
  if (!LITTLE_ENDIAN) {
    const out = new Uint32Array(count);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < count; i++) {
      out[i] = view.getUint32(offset + i * 4, true);
    }
    return out;
  }
  const copy = new ArrayBuffer(count * 4);
  new Uint8Array(copy).set(bytes.subarray(offset, offset + count * 4));
  return new Uint32Array(copy);
}

function finiteF32Group(view, start, end, label) {
  for (let i = start; i < end; i++) {
    if (!Number.isFinite(view[i])) {
      throw invalidFrame("Non-finite float in " + label);
    }
  }
}

function zeros(view, start, end, label) {
  for (let i = start; i < end; i++) {
    if (view[i] !== 0) {
      throw invalidFrame(label + " must be zero when its flag is clear");
    }
  }
}

function quatNormSq(view, i) {
  return view[i] * view[i] + view[i + 1] * view[i + 1] + view[i + 2] * view[i + 2] + view[i + 3] * view[i + 3];
}

/**
 * Validate a v1 regional scene frame and expose typed views into the owned bytes.
 * @param {Uint8Array|ArrayBuffer} bytes
 * @param {string} expectedRequestId
 */
export function decodeRegionalScene(bytes, expectedRequestId) {
  const frame = asBytes(bytes);
  if (frame.byteLength > REGIONAL_MAX_FRAME_BYTES) {
    throw invalidFrame("Frame exceeds 64 MiB");
  }
  if (frame.byteLength < REGIONAL_HEADER_BYTES) {
    throw invalidFrame("Frame shorter than header");
  }
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  for (let i = 0; i < 8; i++) {
    if (frame[i] !== REGIONAL_MAGIC[i]) {
      throw invalidFrame("Bad magic");
    }
  }
  const schemaVersion = u32(view, 8);
  if (schemaVersion !== REGIONAL_SCHEMA_VERSION) {
    throw regionalError(
      "UNSUPPORTED_SCHEMA",
      "Unsupported regional schema",
      null,
      { receivedVersion: schemaVersion },
    );
  }
  const headerBytes = u32(view, 12);
  const totalBytes = u32(view, 16);
  const metadataBytes = u32(view, 20);
  const n = u32(view, 24);
  const f = u32(view, 28);
  const vCount = u32(view, 32);
  const reserved = u32(view, 36);
  if (headerBytes !== REGIONAL_HEADER_BYTES) {
    throw invalidFrame("headerBytes must be 128");
  }
  if (totalBytes !== frame.byteLength) {
    throw invalidFrame("totalBytes does not match frame length");
  }
  if (totalBytes > REGIONAL_MAX_FRAME_BYTES) {
    throw invalidFrame("Frame exceeds 64 MiB");
  }
  if (n > REGIONAL_ADMISSION_LIMIT) {
    throw invalidFrame("Occupant count exceeds 8000");
  }
  if (reserved !== 0) {
    throw invalidFrame("Reserved header field is not zero");
  }
  const originM = [f64(view, 40), f64(view, 48), f64(view, 56)];
  const headerMin = [f64(view, 64), f64(view, 72), f64(view, 80)];
  const headerMax = [f64(view, 88), f64(view, 96), f64(view, 104)];
  if (![...originM, ...headerMin, ...headerMax].every(Number.isFinite)) {
    throw invalidFrame("Non-finite header float");
  }
  const poseOffset = u32(view, 112);
  const fragmentOffset = u32(view, 116);
  const vertexOffset = u32(view, 120);
  const vertexFlagsOffset = u32(view, 124);

  const expectedPose = align8(REGIONAL_HEADER_BYTES + metadataBytes);
  if (expectedPose == null) {
    throw invalidFrame("Metadata size overflow");
  }
  const poseBytes = n * 64;
  const expectedFrag = align8(expectedPose + poseBytes);
  if (expectedFrag == null || poseBytes / 64 !== n) {
    throw invalidFrame("Pose section overflow");
  }
  const fragBytes = f * 16;
  const expectedVert = align8(expectedFrag + fragBytes);
  if (expectedVert == null || fragBytes / 16 !== f) {
    throw invalidFrame("Fragment section overflow");
  }
  const vertBytes = vCount * 36;
  const expectedFlags = align8(expectedVert + vertBytes);
  if (expectedFlags == null) {
    throw invalidFrame("Vertex section overflow");
  }
  const flagBytes = vCount * 4;
  const expectedTotal = align8(expectedFlags + flagBytes);
  if (expectedTotal == null || expectedTotal > REGIONAL_MAX_FRAME_BYTES) {
    throw invalidFrame("Frame size overflow");
  }
  if (
    poseOffset !== expectedPose ||
    fragmentOffset !== expectedFrag ||
    vertexOffset !== expectedVert ||
    vertexFlagsOffset !== expectedFlags ||
    totalBytes !== expectedTotal
  ) {
    throw invalidFrame("Noncanonical section offsets");
  }
  if (128 + metadataBytes > poseOffset) {
    throw invalidFrame("Metadata overruns pose section");
  }
  zeroPadding(frame, 128 + metadataBytes, poseOffset);
  zeroPadding(frame, poseOffset + poseBytes, fragmentOffset);
  zeroPadding(frame, fragmentOffset + fragBytes, vertexOffset);
  zeroPadding(frame, vertexOffset + vertBytes, vertexFlagsOffset);
  zeroPadding(frame, vertexFlagsOffset + flagBytes, totalBytes);

  const metaText = textFromUtf8(frame, 128, metadataBytes);
  const meta = parseJsonStrict(metaText);
  exactKeys(meta, META_KEYS, "metadata");
  const requestId = requireString(meta.requestId, "requestId");
  if (typeof expectedRequestId === "string" && requestId !== expectedRequestId) {
    throw invalidFrame("requestId mismatch", requestId);
  }
  const admissionCount = requireInt(meta.admissionCount, "admissionCount");
  if (admissionCount !== n) {
    throw invalidFrame("admissionCount does not match N", requestId);
  }
  if (!Array.isArray(meta.types) || !Array.isArray(meta.occupants)) {
    throw invalidFrame("types/occupants are not arrays", requestId);
  }
  if (meta.occupants.length !== n) {
    throw invalidFrame("occupants.length does not match N", requestId);
  }
  if (n === 0 && (f !== 0 || vCount !== 0)) {
    throw invalidFrame("Empty frame has path geometry", requestId);
  }
  if (n === 0 && meta.types.length !== 0) {
    throw invalidFrame("Unused type rows", requestId);
  }

  let effectiveBoundsM = null;
  if (meta.effectiveBoundsM === null) {
    if (meta.emptyReason !== "DISJOINT_Z") {
      throw invalidFrame("Null bounds require DISJOINT_Z", requestId);
    }
    if (![...headerMin, ...headerMax].every((x) => x === 0)) {
      throw invalidFrame("DISJOINT_Z header bounds are not +0", requestId);
    }
    if (n !== 0) {
      throw invalidFrame("DISJOINT_Z frame is not empty", requestId);
    }
  } else {
    exactKeys(meta.effectiveBoundsM, ["min", "max"], "effectiveBoundsM");
    effectiveBoundsM = {
      min: vec3(meta.effectiveBoundsM.min, "effectiveBoundsM.min"),
      max: vec3(meta.effectiveBoundsM.max, "effectiveBoundsM.max"),
    };
    if (
      !sameF64(headerMin[0], effectiveBoundsM.min[0]) ||
      !sameF64(headerMin[1], effectiveBoundsM.min[1]) ||
      !sameF64(headerMin[2], effectiveBoundsM.min[2]) ||
      !sameF64(headerMax[0], effectiveBoundsM.max[0]) ||
      !sameF64(headerMax[1], effectiveBoundsM.max[1]) ||
      !sameF64(headerMax[2], effectiveBoundsM.max[2])
    ) {
      throw invalidFrame("Header bounds do not match metadata", requestId);
    }
    if (n === 0) {
      if (meta.emptyReason !== "NO_OCCUPANTS") {
        throw invalidFrame("Empty nonempty volume requires NO_OCCUPANTS", requestId);
      }
    } else if (meta.emptyReason !== null) {
      throw invalidFrame("Nonempty frame has emptyReason", requestId);
    }
  }
  if (meta.emptyReason !== null && !EMPTY_REASONS.has(meta.emptyReason)) {
    throw invalidFrame("Unknown emptyReason", requestId);
  }

  const types = [];
  const typePaths = new Set();
  for (let i = 0; i < meta.types.length; i++) {
    const row = meta.types[i];
    exactKeys(row, TYPE_KEYS, "types[" + i + "]");
    const typePath = requireString(row.typePath, "typePath");
    if (!typePath || typePaths.has(typePath)) {
      throw invalidFrame("Invalid or duplicate typePath", requestId);
    }
    typePaths.add(typePath);
    if (row.subcategory !== null) {
      requireString(row.subcategory, "subcategory");
    }
    types.push({
      typePath,
      label: requireString(row.label, "label"),
      category: requireString(row.category, "category"),
      subcategory: row.subcategory,
    });
  }

  const occupants = [];
  const ids = new Set();
  const usedTypes = new Set();
  let firstUseCursor = 0;
  for (let i = 0; i < n; i++) {
    const row = meta.occupants[i];
    exactKeys(row, OCCUPANT_KEYS, "occupants[" + i + "]");
    const id = requireString(row.id, "id");
    if (!id || ids.has(id)) {
      throw invalidFrame("Invalid or duplicate occupant id", requestId);
    }
    ids.add(id);
    const typeIndex = requireInt(row.typeIndex, "typeIndex");
    if (typeIndex < 0 || typeIndex >= types.length) {
      throw invalidFrame("typeIndex out of range", requestId);
    }
    if (!usedTypes.has(typeIndex)) {
      if (typeIndex !== firstUseCursor) {
        throw invalidFrame("types are not ordered by first admitted use", requestId);
      }
      usedTypes.add(typeIndex);
      firstUseCursor++;
    }
    if (!SOURCE_KINDS.has(row.sourceKind) || !RECORD_KINDS.has(row.recordKind)
        || !SIZE_KINDS.has(row.sizeKind) || !PATH_STATES.has(row.pathState)) {
      throw invalidFrame("Unknown occupant enum", requestId);
    }
    const poseFlags = requireInt(row.poseFlags, "poseFlags");
    if (poseFlags < 0 || poseFlags > 15) {
      throw invalidFrame("poseFlags uses reserved bits", requestId);
    }
    if ((poseFlags & 8) && !(poseFlags & 4)) {
      throw invalidFrame("Offset flag requires complete extent", requestId);
    }
    if (!Array.isArray(row.uncertainty)) {
      throw invalidFrame("uncertainty is not an array", requestId);
    }
    const seenU = new Set();
    let lastOrder = -1;
    for (let u = 0; u < row.uncertainty.length; u++) {
      const item = row.uncertainty[u];
      if (!UNCERTAINTY_ALLOWED.has(item) || seenU.has(item)) {
        throw invalidFrame("Invalid uncertainty", requestId);
      }
      const order = UNCERTAINTY_ORDER.indexOf(item);
      if (order < lastOrder) {
        throw invalidFrame("Uncertainty order is not canonical", requestId);
      }
      lastOrder = order;
      seenU.add(item);
    }
    if (row.recordKind === "occupant" && row.pathState !== "not-path") {
      throw invalidFrame("Occupant pathState must be not-path", requestId);
    }
    if (row.recordKind === "path" && row.pathState === "not-path") {
      throw invalidFrame("Path record has not-path state", requestId);
    }
    if (row.sizeKind === "unknown") {
      if (poseFlags & 4 || poseFlags & 8) {
        throw invalidFrame("Unknown sizeKind has extent flags", requestId);
      }
      if (row.pathState !== "linear" && !seenU.has("size-unknown")) {
        throw invalidFrame("Missing size-unknown", requestId);
      }
    } else if (!(poseFlags & 4)) {
      throw invalidFrame("Known sizeKind missing extent flag", requestId);
    }
    if (!(poseFlags & 2) && !seenU.has("scale-unknown")) {
      throw invalidFrame("Missing scale-unknown", requestId);
    }
    if (!(poseFlags & 1) && !seenU.has("orientation-unknown")) {
      throw invalidFrame("Missing orientation-unknown", requestId);
    }
    if (row.pathState === "unavailable" && !seenU.has("path-unavailable")) {
      throw invalidFrame("Missing path-unavailable", requestId);
    }
    occupants.push({
      id,
      typeIndex,
      sourceKind: row.sourceKind,
      recordKind: row.recordKind,
      sizeKind: row.sizeKind,
      poseFlags,
      pathState: row.pathState,
      uncertainty: row.uncertainty.slice(),
    });
  }
  if (usedTypes.size !== types.length) {
    throw invalidFrame("Unused type rows", requestId);
  }

  const poses = typedF32(frame, poseOffset, n * 16);
  const fragments = typedU32(frame, fragmentOffset, f * 4);
  const vertices = typedF32(frame, vertexOffset, vCount * 9);
  const vertexFlags = typedU32(frame, vertexFlagsOffset, vCount);
  finiteF32Group(poses, 0, poses.length, "pose");
  finiteF32Group(vertices, 0, vertices.length, "vertex");

  for (let i = 0; i < n; i++) {
    const flags = occupants[i].poseFlags;
    const base = i * 16;
    if (!(flags & 1)) {
      zeros(poses, base + 3, base + 7, "quaternion");
    } else if (!(quatNormSq(poses, base + 3) > 0)) {
      throw invalidFrame("Known quaternion has zero norm", requestId);
    }
    if (!(flags & 2)) {
      zeros(poses, base + 7, base + 10, "scale");
    }
    if (!(flags & 4)) {
      zeros(poses, base + 10, base + 13, "extent");
    } else if (!(poses[base + 10] > 0 && poses[base + 11] > 0 && poses[base + 12] > 0)) {
      throw invalidFrame("Complete extent is not strictly positive", requestId);
    }
    if (!(flags & 8)) {
      zeros(poses, base + 13, base + 16, "offset");
    }
  }

  let cursor = 0;
  let lastOwner = -1;
  const linearOwners = new Set();
  for (let i = 0; i < f; i++) {
    const owner = fragments[i * 4];
    const first = fragments[i * 4 + 1];
    const count = fragments[i * 4 + 2];
    const flags = fragments[i * 4 + 3];
    if (flags !== 0) {
      throw invalidFrame("Fragment reserved flags are not zero", requestId);
    }
    if (owner >= n || owner < lastOwner || first !== cursor || count < 1) {
      throw invalidFrame("Bad fragment partition", requestId);
    }
    const occupant = occupants[owner];
    if (occupant.recordKind !== "path" || occupant.pathState !== "linear") {
      throw invalidFrame("Fragment owner is not a linear path", requestId);
    }
    linearOwners.add(owner);
    cursor += count;
    lastOwner = owner;
  }
  if (cursor !== vCount) {
    throw invalidFrame("Unreferenced or missing vertices", requestId);
  }
  for (let i = 0; i < n; i++) {
    const linear = occupants[i].pathState === "linear";
    if (linear !== linearOwners.has(i)) {
      throw invalidFrame("Linear path fragment ownership mismatch", requestId);
    }
  }
  for (let i = 0; i < vCount; i++) {
    const flags = vertexFlags[i];
    if (flags > 7) {
      throw invalidFrame("Vertex reserved flags are not zero", requestId);
    }
    if ((flags & 4) && (flags & 3)) {
      throw invalidFrame("Generated vertex has invented tangents", requestId);
    }
    const base = i * 9;
    if (!(flags & 1)) {
      zeros(vertices, base + 3, base + 6, "arrive tangent");
    }
    if (!(flags & 2)) {
      zeros(vertices, base + 6, base + 9, "leave tangent");
    }
  }

  const model = {
    schemaVersion: REGIONAL_SCHEMA_VERSION,
    requestId,
    originM,
    effectiveBoundsM,
    emptyReason: meta.emptyReason,
    types,
    occupants,
    poses,
    fragments,
    vertices,
    vertexFlags,
    bytes: frame,
    counts: { occupants: n, fragments: f, vertices: vCount },
  };
  Object.freeze(model.types);
  Object.freeze(model.occupants);
  Object.freeze(model.originM);
  Object.freeze(model.counts);
  return Object.freeze(model);
}
