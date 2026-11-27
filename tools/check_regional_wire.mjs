#!/usr/bin/env node
// HEC-03/09: import the production decoder and form registry. This runner
// packs reference frames; it is not a second decoder oracle.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VECTOR_PATH = join(ROOT, "rust_parser", "core", "tests", "fixtures", "regional-scene-v1-vectors.json");
const CODEC_URL = pathToFileURL(join(ROOT, "map", "static", "map", "regional_codec.js")).href;
const FORMS_URL = pathToFileURL(join(ROOT, "map", "static", "map", "regional_forms.js")).href;

const { decodeRegionalScene } = await import(CODEC_URL);
const forms = await import(FORMS_URL);

let failed = 0;
function check(name, ok, detail) {
  if (ok) {
    console.log("  PASS  " + name);
  } else {
    failed++;
    console.log("  FAIL  " + name + (detail ? "  -- " + detail : ""));
  }
}

function align8(n) {
  return (n + 7) & ~7;
}

function compact(value) {
  return JSON.stringify(value);
}

function putU32(buf, offset, value) {
  buf.writeUInt32LE(value >>> 0, offset);
}

function putF64(buf, offset, value) {
  buf.writeDoubleLE(value, offset);
}

function putF32(buf, offset, value) {
  buf.writeFloatLE(value, offset);
}

function packVector(vector) {
  const meta = vector.metadata;
  const n = vector.poses.length;
  const f = vector.fragments.length;
  const v = vector.vertices.length;
  const metadata = Buffer.from(compact(meta), "utf8");
  const po = align8(128 + metadata.length);
  const fo = align8(po + n * 64);
  const vo = align8(fo + f * 16);
  const vf = align8(vo + v * 36);
  const total = align8(vf + v * 4);
  const frame = Buffer.alloc(total);
  frame.write("SMREG3D\0", 0, 8, "latin1");
  putU32(frame, 8, 1);
  putU32(frame, 12, 128);
  putU32(frame, 16, total);
  putU32(frame, 20, metadata.length);
  putU32(frame, 24, n);
  putU32(frame, 28, f);
  putU32(frame, 32, v);
  putU32(frame, 36, 0);
  putF64(frame, 40, vector.originM[0]);
  putF64(frame, 48, vector.originM[1]);
  putF64(frame, 56, vector.originM[2]);
  const bounds = meta.effectiveBoundsM;
  const nums = bounds ? bounds.min.concat(bounds.max) : [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 6; i++) {
    putF64(frame, 64 + i * 8, nums[i]);
  }
  putU32(frame, 112, po);
  putU32(frame, 116, fo);
  putU32(frame, 120, vo);
  putU32(frame, 124, vf);
  metadata.copy(frame, 128);
  vector.poses.forEach((row, i) => {
    row.forEach((value, k) => putF32(frame, po + i * 64 + k * 4, value));
  });
  vector.fragments.forEach((row, i) => {
    row.forEach((value, k) => putU32(frame, fo + i * 16 + k * 4, value));
  });
  vector.vertices.forEach((row, i) => {
    row.forEach((value, k) => putF32(frame, vo + i * 36 + k * 4, value));
  });
  vector.vertexFlags.forEach((flags, i) => putU32(frame, vf + i * 4, flags));
  return frame;
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function codeOf(run) {
  try {
    run();
    return { ok: true };
  } catch (error) {
    return { ok: false, code: error && error.code, name: error && error.name, message: error && error.message };
  }
}

const document = JSON.parse(readFileSync(VECTOR_PATH, "utf8"));
check("vector file schema", document.schemaVersion === 1 && document.vectors.length === 6);

for (const vector of document.vectors) {
  const frame = packVector(vector);
  check(
    "golden pack " + vector.name,
    sha256(frame) === vector.expected.frameSha256,
    sha256(frame),
  );
  const decoded = decodeRegionalScene(new Uint8Array(frame), vector.request.requestId);
  check("decode requestId " + vector.name, decoded.requestId === vector.metadata.requestId);
  check("decode N " + vector.name, decoded.occupants.length === vector.metadata.admissionCount);
  check("decode emptyReason " + vector.name, decoded.emptyReason === vector.metadata.emptyReason);
  if (vector.metadata.occupants.length) {
    const first = decoded.occupants[0];
    const expect = vector.metadata.occupants[0];
    check(
      "decode occupant " + vector.name,
      first.id === expect.id
        && first.sizeKind === expect.sizeKind
        && first.poseFlags === expect.poseFlags
        && JSON.stringify(first.uncertainty) === JSON.stringify(expect.uncertainty),
    );
    const pose = Array.from(decoded.poses.subarray(0, 16));
    const match = pose.every((value, i) => Math.abs(value - vector.poses[0][i]) < 1e-6);
    check("decode pose " + vector.name, match);
  }
  if (vector.name === "unicode-reserve") {
    check("unicode label", decoded.types[0].label === "Dépôt");
    check("unicode id", decoded.occupants[0].id === "Factory:Dépot_1");
  }
  if (vector.name === "two-fragments-real-and-absent-tangents") {
    check("fragment count", decoded.counts.fragments === 2 && decoded.counts.vertices === 4);
    check("generated flag", decoded.vertexFlags[0] === 4);
    check("arrive tangent flag", decoded.vertexFlags[1] === 1);
  }
  if (vector.name === "zero-z-slab-point-contact") {
    check("point contact", decoded.counts.fragments === 1 && decoded.fragments[2] === 1);
  }
}

const named = document.vectors.find((v) => v.name === "named-box-offset");
const namedFrame = packVector(named);

function expectFail(name, bytes, expectedId, code) {
  const result = codeOf(() => decodeRegionalScene(bytes, expectedId || named.request.requestId));
  check(name, !result.ok && result.code === code, JSON.stringify(result));
}

{
  const bad = Buffer.from(namedFrame);
  bad[0] = 0x58;
  expectFail("reject magic", new Uint8Array(bad), named.request.requestId, "INVALID_FRAME");
}
{
  const bad = Buffer.from(namedFrame);
  putU32(bad, 8, 2);
  expectFail("reject version", new Uint8Array(bad), named.request.requestId, "UNSUPPORTED_SCHEMA");
}
{
  const bad = Buffer.from(namedFrame);
  putU32(bad, 112, named.expected.offsets[0] + 8);
  expectFail("reject offset", new Uint8Array(bad), named.request.requestId, "INVALID_FRAME");
}
{
  const bad = Buffer.from(namedFrame);
  bad[128 + named.expected.metadataBytes] = 1;
  expectFail("reject padding", new Uint8Array(bad), named.request.requestId, "INVALID_FRAME");
}
{
  const bad = Buffer.from(namedFrame);
  const nan = Buffer.alloc(4);
  nan.writeFloatLE(Number.NaN, 0);
  nan.copy(bad, named.expected.offsets[0]);
  expectFail("reject nonfinite", new Uint8Array(bad), named.request.requestId, "INVALID_FRAME");
}
{
  const meta = JSON.parse(JSON.stringify(named.metadata));
  meta.occupants[0].poseFlags = 16;
  const forged = Object.assign({}, named, { metadata: meta });
  expectFail("reject flags", new Uint8Array(packVector(forged)), named.request.requestId, "INVALID_FRAME");
}
{
  const json = compact(named.metadata);
  const dup = json.replace('"requestId":"regional:box"', '"requestId":"regional:box","requestId":"regional:box"');
  const metadata = Buffer.from(dup, "utf8");
  const po = align8(128 + metadata.length);
  const total = align8(po + 64);
  const frame = Buffer.alloc(total);
  namedFrame.copy(frame, 0, 0, 128);
  putU32(frame, 16, total);
  putU32(frame, 20, metadata.length);
  putU32(frame, 112, po);
  putU32(frame, 116, po + 64);
  putU32(frame, 120, po + 64);
  putU32(frame, 124, po + 64);
  metadata.copy(frame, 128);
  namedFrame.copy(frame, po, named.expected.offsets[0], named.expected.offsets[0] + 64);
  expectFail("reject duplicate keys", new Uint8Array(frame), named.request.requestId, "INVALID_FRAME");
}
{
  const bad = Buffer.from(namedFrame);
  bad[130] = 0x80;
  expectFail("reject utf-8", new Uint8Array(bad), named.request.requestId, "INVALID_FRAME");
}
{
  const forged = Object.assign({}, document.vectors.find((v) => v.name === "two-fragments-real-and-absent-tangents"));
  forged.fragments = [[1, 0, 2, 0], [1, 2, 2, 0]];
  expectFail(
    "reject fragment link",
    new Uint8Array(packVector(forged)),
    forged.request.requestId,
    "INVALID_FRAME",
  );
}
{
  const extra = Buffer.concat([namedFrame, Buffer.from([0])]);
  expectFail("reject trailing bytes", new Uint8Array(extra), named.request.requestId, "INVALID_FRAME");
}

function occupantRow(id) {
  return {
    id,
    typeIndex: 0,
    sourceKind: "actor",
    recordKind: "occupant",
    sizeKind: "named-box",
    poseFlags: 7,
    pathState: "not-path",
    uncertainty: [],
  };
}

function capFrame(count) {
  const occupants = [];
  const poses = [];
  for (let i = 0; i < count; i++) {
    occupants.push(occupantRow("Cap:" + i));
    poses.push([-7, -6, -7, 0, 0, 0, 1, 1, 1, 1, 8, 8, 4, 0, 0, 0]);
  }
  return packVector({
    request: named.request,
    originM: [8, 8, 10],
    metadata: {
      requestId: "regional:box",
      admissionCount: count,
      effectiveBoundsM: { min: [0, 0, 0], max: [16, 16, 20] },
      emptyReason: null,
      types: [{ typePath: "/Fixture/Build_Box.Build_Box_C", label: "Box", category: "Foundation", subcategory: "Floors" }],
      occupants,
    },
    poses,
    fragments: [],
    vertices: [],
    vertexFlags: [],
  });
}

{
  const decoded = decodeRegionalScene(new Uint8Array(capFrame(8000)), "regional:box");
  check("accept N=8000", decoded.occupants.length === 8000);
}
{
  const result = codeOf(() => decodeRegionalScene(new Uint8Array(capFrame(8001)), "regional:box"));
  check("reject N=8001", !result.ok && result.code === "INVALID_FRAME", JSON.stringify(result));
}

const required = {
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
  Build_StorageContainerMk2_C: "storage-cue-mk2",
  Build_PowerPoleMk1_C: "power-pole-cue",
};
for (const [cls, recipe] of Object.entries(required)) {
  check("registry " + cls, forms.recipeIdForClass("/Game/FactoryGame/Buildable/." + cls) === recipe);
}
check(
  "no substring match",
  forms.recipeIdForClass("/Game/FactoryGame/Buildable/Build_Foundation_8x1_01_C_Mod") === null,
);

function occupant(partial) {
  return Object.assign({
    id: "x",
    typeIndex: 0,
    sourceKind: "actor",
    recordKind: "occupant",
    sizeKind: "named-box",
    poseFlags: 15,
    pathState: "not-path",
    uncertainty: [],
  }, partial);
}

function typeRow(path, category) {
  return { typePath: path, label: "L", category: category || "Production", subcategory: null };
}

check(
  "override scale",
  forms.classifyOccupant(
    occupant({ poseFlags: 13, uncertainty: ["scale-unknown"] }),
    typeRow("/X.Build_SmelterMk1_C"),
  ).visual === "uncertain-marker",
);
check(
  "override orientation",
  forms.classifyOccupant(
    occupant({ poseFlags: 14, uncertainty: ["orientation-unknown"] }),
    typeRow("/X.Build_ConstructorMk1_C"),
  ).visual === "uncertain-marker",
);
check(
  "usable path",
  forms.classifyOccupant(
    occupant({ recordKind: "path", sizeKind: "unknown", poseFlags: 3, pathState: "linear" }),
    typeRow("/X.Build_ConveyorBeltMk1_C", "Logistics"),
  ).visual === "static-path",
);
check(
  "size unknown",
  forms.classifyOccupant(
    occupant({ sizeKind: "unknown", poseFlags: 3, uncertainty: ["size-unknown"] }),
    typeRow("/X.Build_SmelterMk1_C"),
  ).visual === "uncertain-marker",
);
{
  const smelter = forms.classifyOccupant(
    occupant({ sizeKind: "clearance-reserve", poseFlags: 7 }),
    typeRow("/X.Build_SmelterMk1_C"),
  );
  check("smelter envelope+cue", smelter.visual === "reserve-cue" && smelter.envelope && smelter.cue);
  check("smelter sizeKind unchanged", smelter.sizeKind === "clearance-reserve");
}
{
  const unlisted = forms.classifyOccupant(
    occupant({ sizeKind: "clearance-reserve", poseFlags: 7 }),
    typeRow("/X.Build_MinerMk1_C"),
  );
  check("unlisted reserve pending", unlisted.visual === "reserve" && unlisted.envelope && unlisted.label.indexOf("pending") >= 0);
}
{
  const pending = forms.classifyOccupant(
    occupant({ sizeKind: "named-box", poseFlags: 7 }),
    typeRow("/X.Build_Foundation_8x1_02_C"),
  );
  check("unlisted named box pending", pending.visual === "named-box" && pending.label.indexOf("pending") >= 0);
}

{
  const pose = [-7, -6, -7, 0, 0, 0, 1, 1, 1, 1, 8, 8, 4, 0, 0, 2];
  const centre = forms.occupantWorldPoint(pose, [0, 0, 0]);
  check("offset centre", Math.abs(centre[2] - (-7 + 2)) < 1e-6, JSON.stringify(centre));
  const flipped = pose.slice();
  flipped[7] = -1;
  const a = forms.occupantWorldPoint(pose, [0.5, 0, 0]);
  const b = forms.occupantWorldPoint(flipped, [0.5, 0, 0]);
  check("negative scale flips", Math.abs(a[0] - (-7 + 4)) < 1e-5 && Math.abs(b[0] - (-7 - 4)) < 1e-5, JSON.stringify({ a, b }));
  const parts = forms.recipeParts("smelter-cue");
  check("smelter has envelope and chimney", parts.some((p) => p.name === "envelope") && parts.some((p) => p.name === "chimney"));
  const env = parts.find((p) => p.name === "envelope");
  const cue = parts.find((p) => p.name === "chimney");
  const envPt = forms.occupantWorldPoint(flipped, [env.positions[0], env.positions[1], env.positions[2]]);
  const cuePt = forms.occupantWorldPoint(flipped, [cue.positions[0], cue.positions[1], cue.positions[2]]);
  const envPos = forms.occupantWorldPoint(pose, [env.positions[0], env.positions[1], env.positions[2]]);
  check(
    "scale applies to envelope and cue",
    Math.abs((envPt[0] - (-7)) + (envPos[0] - (-7))) < 1e-4
      && Math.abs((cuePt[0] - (-7)) + (forms.occupantWorldPoint(pose, [cue.positions[0], cue.positions[1], cue.positions[2]])[0] - (-7))) < 1e-4,
  );
}

check("legend not color-only", forms.LEGEND_TEXT.indexOf("Named boxes") >= 0);
check("visual states labeled", forms.visualLegendEntries().length >= 6);

console.log("\n" + failed + " check(s) failed");
console.log("Decoder/registry checks are not actual-save geometry acceptance and not a completed viewer.");
process.exit(failed ? 1 : 0);
