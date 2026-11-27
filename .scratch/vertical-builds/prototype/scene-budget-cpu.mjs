#!/usr/bin/env node
/**
 * PROTOTYPE / throwaway — Cost probe (ticket 25).
 * CPU + typed-array construction / hold / teardown. No GPU. No product library.
 * Terrain is not an input. Does not parse .sav bytes.
 *
 * Run: node .scratch/vertical-builds/prototype/scene-budget-cpu.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const STRIDE_BOX = 8; // x y z yaw sx sy sz pad
const SAMPLES_PER_SPLINE = 8;
const STRIDE_SPLINE = 4; // x y z pad
const FAT_BOXES_PER_OCCUPANT = 8;

const CASES = [
  { id: "all-stack", occupants: 11, boxes: 11, splines: 0, note: "All_080726 conveyor-pole stack" },
  { id: "all-pad", occupants: 49, boxes: 49, splines: 0, note: "All 56 m foundation pad" },
  { id: "dense-8m", occupants: 198, boxes: 198, splines: 0, note: "BuildITBIIIIIG densest 8 m cell" },
  { id: "solo-storage", occupants: 452, boxes: 452, splines: 0, note: "solo 56 m PowerStorage field" },
  { id: "ordinary-56m", occupants: 800, boxes: 640, splines: 160, note: "synthetic ordinary 56 m mix" },
  { id: "medium-region", occupants: 2500, boxes: 2000, splines: 500, note: "synthetic multi-pad region" },
  { id: "height-view-14k", occupants: 14000, boxes: 11000, splines: 3000, note: "Height-view documented isolation" },
  { id: "heavy-50k", occupants: 50000, boxes: 40000, splines: 10000, note: "synthetic heavy region" },
  { id: "foundation-150k", occupants: 150000, boxes: 150000, splines: 0, note: "Height-view 150 k foundation slab" },
];

function fillBoxes(n) {
  const data = new Float32Array(n * STRIDE_BOX);
  for (let i = 0; i < n; i += 1) {
    const o = i * STRIDE_BOX;
    data[o] = (i % 80) * 8;
    data[o + 1] = (Math.floor(i / 80) % 80) * 8;
    data[o + 2] = (i % 12) * 4;
    data[o + 3] = (i % 7) * 0.2;
    data[o + 4] = 4;
    data[o + 5] = 4;
    data[o + 6] = 4;
  }
  return data;
}

function fillSplines(n) {
  const data = new Float32Array(n * SAMPLES_PER_SPLINE * STRIDE_SPLINE);
  for (let s = 0; s < n; s += 1) {
    const baseX = (s % 40) * 16;
    const baseY = Math.floor(s / 40) * 16;
    for (let k = 0; k < SAMPLES_PER_SPLINE; k += 1) {
      const o = (s * SAMPLES_PER_SPLINE + k) * STRIDE_SPLINE;
      data[o] = baseX + k * 2;
      data[o + 1] = baseY;
      data[o + 2] = k * 0.8;
    }
  }
  return data;
}

function gpuBytesFor(boxes, splines, fat = false) {
  const boxCount = fat ? boxes * FAT_BOXES_PER_OCCUPANT : boxes;
  const cubeVerts = 24;
  const cubeFloats = cubeVerts * 6; // pos+normal
  const cubeIdx = cubeVerts === 24 ? 36 : 36;
  const meshBytes = cubeFloats * 4 + cubeIdx * 2;
  const instanceBytes = boxCount * STRIDE_BOX * 4;
  const expandedBytes = boxCount * cubeFloats * 4 + boxCount * 36 * 2;
  const splineBytes = splines * SAMPLES_PER_SPLINE * STRIDE_SPLINE * 4;
  const ribbonIdx = splines * (SAMPLES_PER_SPLINE - 1) * 6 * 2;
  return {
    instancedGpuBytes: meshBytes + instanceBytes + splineBytes + ribbonIdx,
    expandedGpuBytes: expandedBytes + splineBytes + ribbonIdx,
    instanceBytes,
    splineBytes,
  };
}

function measureCase(spec, { fat = false } = {}) {
  const boxes = fat ? spec.boxes * FAT_BOXES_PER_OCCUPANT : spec.boxes;
  const before = process.memoryUsage();
  const t0 = performance.now();
  const boxData = fillBoxes(boxes);
  const splineData = fillSplines(spec.splines);
  const constructMs = performance.now() - t0;
  const hold = process.memoryUsage();
  const sizes = gpuBytesFor(spec.boxes, spec.splines, fat);
  const t1 = performance.now();
  boxData.fill(0);
  splineData.fill(0);
  const teardownMs = performance.now() - t1;
  const afterFill = process.memoryUsage();
  return {
    id: spec.id + (fat ? "-fat8" : ""),
    occupants: spec.occupants,
    boxes,
    splines: spec.splines,
    fat,
    note: spec.note,
    constructMs: round(constructMs),
    teardownFillMs: round(teardownMs),
    heapUsedBeforeMb: mb(before.heapUsed),
    heapUsedHoldMb: mb(hold.heapUsed),
    heapDeltaMb: mb(hold.heapUsed - before.heapUsed),
    rssHoldMb: mb(hold.rss),
    externalHoldMb: mb(hold.external),
    arrayBufferHoldMb: mb(hold.arrayBuffers ?? 0),
    cpuArrayBytes: boxData.byteLength + splineData.byteLength,
    ...sizes,
    heapAfterFillMb: mb(afterFill.heapUsed),
  };
}

function mb(bytes) {
  return round(bytes / (1024 * 1024));
}

function round(n) {
  return Math.round(n * 100) / 100;
}

function main() {
  const host = {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    measuredAt: new Date().toISOString(),
  };
  const rows = [];
  for (const spec of CASES) {
    rows.push(measureCase(spec, { fat: false }));
    if (spec.occupants <= 2500) {
      rows.push(measureCase(spec, { fat: true }));
    }
  }
  const out = { host, rows };
  const dir = dirname(fileURLToPath(import.meta.url));
  const jsonPath = join(dir, "..", "research", "scene-budget-cpu.json");
  writeFileSync(jsonPath, `${JSON.stringify(out, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
  process.stderr.write(`wrote ${jsonPath}\n`);
}

main();
