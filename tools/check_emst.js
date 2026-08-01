// Correctness gate for map/static/map/emst.js.
//
// Both spanning-tree builders in emst.js are O(n log n) because they only
// ever feed Kruskal a small candidate set that PROVABLY contains the minimum
// spanning tree (the Delaunay triangulation for the Euclidean metric, the
// octant graph for the rectilinear one). If either candidate set is ever
// short of a needed edge -- a triangulation bug, a mis-derived sweep -- the
// result is still a spanning tree, just silently a longer one. Nothing about
// the output looks wrong, so it has to be diffed against a reference.
//
// This runs both metrics against a brute-force O(n^2) Prim over the complete
// graph, which is exact by construction, and compares TOTAL LENGTH (not the
// edge list: co-circular / equidistant point sets have several equally
// minimal trees, and any of them is a correct answer). Point sets are chosen
// to include the cases that break naive geometry: grids (endlessly
// co-circular), collinear runs, duplicated points, tight clusters, and the
// real map's coordinate range.
//
//   node tools/check_emst.js [iterations]

"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(
  path.join(__dirname, "..", "map", "static", "map", "emst.js"), "utf8");
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "emst.js" });
const Emst = sandbox.Emst;

// ---- Reference implementation ---------------------------------------------

// Prim over the complete graph: O(n^2), no candidate set, no geometry
// assumptions. Slow but unarguable.
function bruteForceTotal(xs, ys, distance) {
  const n = xs.length;
  if (n < 2) {
    return 0;
  }
  const inTree = new Array(n).fill(false);
  const best = new Float64Array(n).fill(Infinity);
  best[0] = 0;
  let total = 0;
  for (let step = 0; step < n; step++) {
    let pick = -1;
    for (let i = 0; i < n; i++) {
      if (!inTree[i] && (pick === -1 || best[i] < best[pick])) {
        pick = i;
      }
    }
    inTree[pick] = true;
    total += best[pick];
    for (let i = 0; i < n; i++) {
      if (!inTree[i]) {
        const d = distance(xs[pick], ys[pick], xs[i], ys[i]);
        if (d < best[i]) {
          best[i] = d;
        }
      }
    }
  }
  return total;
}

const euclidean = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const rectilinear = (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);

// ---- Structural checks ------------------------------------------------------

// A spanning tree of n points has exactly n-1 edges and one component.
function assertSpanning(result, n, label) {
  if (n < 2) {
    return;
  }
  if (result.edges.length !== n - 1) {
    throw new Error(`${label}: ${result.edges.length} edges for ${n} points (expected ${n - 1})`);
  }
  const parent = new Int32Array(n).map((_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) {
      x = parent[x] = parent[parent[x]];
    }
    return x;
  };
  for (const edge of result.edges) {
    if (edge.a < 0 || edge.a >= n || edge.b < 0 || edge.b >= n) {
      throw new Error(`${label}: edge index out of range (${edge.a}, ${edge.b})`);
    }
    const ra = find(edge.a);
    const rb = find(edge.b);
    if (ra === rb) {
      throw new Error(`${label}: edges form a cycle`);
    }
    parent[ra] = rb;
  }
}

// ---- Point-set generators ---------------------------------------------------

// Deterministic PRNG so a failure is always reproducible from its seed.
function makeRandom(seed) {
  let state = seed >>> 0;
  return function() {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const MAP_SIZE = 8192; // The map's real coordinate range (see map.js).

const GENERATORS = {
  // Plain uniform scatter over the map.
  uniform(rnd, n) {
    const xs = [], ys = [];
    for (let i = 0; i < n; i++) {
      xs.push(rnd() * MAP_SIZE);
      ys.push(rnd() * MAP_SIZE);
    }
    return [xs, ys];
  },
  // Buildings snapped to the foundation grid: massively co-circular, the
  // worst case for a floating-point in-circle test.
  grid(rnd, n) {
    const side = Math.max(2, Math.round(Math.sqrt(n)));
    const step = 8 + Math.floor(rnd() * 40);
    const xs = [], ys = [];
    for (let i = 0; i < n; i++) {
      xs.push((i % side) * step);
      ys.push(Math.floor(i / side) * step);
    }
    return [xs, ys];
  },
  // A belt run: every point on one line, so there is no triangulation at all.
  collinear(rnd, n) {
    const dx = rnd() * 2 - 1;
    const dy = rnd() * 2 - 1;
    const xs = [], ys = [];
    for (let i = 0; i < n; i++) {
      const t = rnd() * 1000;
      xs.push(500 + dx * t);
      ys.push(500 + dy * t);
    }
    return [xs, ys];
  },
  // Perfectly vertical / horizontal rows -- collinear AND axis-aligned, where
  // the rectilinear sweep's tie-breaking has to be right.
  axisAligned(rnd, n) {
    const vertical = rnd() < 0.5;
    const xs = [], ys = [];
    for (let i = 0; i < n; i++) {
      const t = Math.round(rnd() * 20) * 50;
      xs.push(vertical ? 1000 : t);
      ys.push(vertical ? t : 1000);
    }
    return [xs, ys];
  },
  // Exact duplicates and near-duplicates: stacked machines, the same object
  // added twice, coordinates a float apart.
  duplicates(rnd, n) {
    const xs = [], ys = [];
    for (let i = 0; i < n; i++) {
      if (i > 0 && rnd() < 0.4) {
        const source = Math.floor(rnd() * i);
        const jitter = rnd() < 0.5 ? 0 : 1e-9;
        xs.push(xs[source] + jitter);
        ys.push(ys[source]);
      } else {
        xs.push(rnd() * 2000);
        ys.push(rnd() * 2000);
      }
    }
    return [xs, ys];
  },
  // A few dense factories far apart -- the shape a real "connect my bases"
  // query has, and the one where a missing long candidate edge shows up.
  clusters(rnd, n) {
    const clusterCount = 1 + Math.floor(rnd() * 5);
    const centers = [];
    for (let c = 0; c < clusterCount; c++) {
      centers.push([rnd() * MAP_SIZE, rnd() * MAP_SIZE]);
    }
    const xs = [], ys = [];
    for (let i = 0; i < n; i++) {
      const c = centers[Math.floor(rnd() * clusterCount)];
      xs.push(c[0] + (rnd() - 0.5) * 60);
      ys.push(c[1] + (rnd() - 0.5) * 60);
    }
    return [xs, ys];
  },
  // Points on a circle: every triple is co-circular with every other.
  circle(rnd, n) {
    const radius = 100 + rnd() * 3000;
    const xs = [], ys = [];
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2;
      xs.push(4096 + Math.cos(angle) * radius);
      ys.push(4096 + Math.sin(angle) * radius);
    }
    return [xs, ys];
  },
};

// ---- The gate ---------------------------------------------------------------

// Total lengths are sums of square roots -- compare with a relative epsilon,
// not exactly. Anything above this is a real missing edge, not rounding: a
// dropped candidate changes a total by a visible fraction, never by 1e-9.
const TOLERANCE = 1e-9;

// With a destination set, the tree comes from the Prim-Dijkstra knob instead
// of Kruskal. Its two endpoints are the ones that can be checked against a
// reference, and they are the ones that claim to be optimal:
//
//   alpha = 0 -> plain Prim, so the total must still equal the true MST.
//   alpha = 1 -> plain Dijkstra over a candidate set that includes every
//                destination edge, so every point must join the destination
//                directly: the trip total must equal the sum of direct
//                distances, which is the least it can possibly be.
//
// In between, only the invariants hold (a spanning tree, never shorter than
// the MST, trips never shorter than direct) -- there is no reference to diff
// against, because the exact answer there is NP-hard.
function checkDestination(name, xs, ys, seed) {
  const n = xs.length;
  if (n < 2) {
    return;
  }
  const cases = [
    ["euclidean", Emst.euclidean, euclidean],
    ["rectilinear", Emst.rectilinear, rectilinear],
  ];
  for (const [metric, solve, distance] of cases) {
    const root = seed % n;
    const label = `${name}/${metric}/dest n=${n} seed=${seed}`;
    const mstTotal = bruteForceTotal(xs, ys, distance);

    const atZero = solve(xs, ys, { root, alpha: 0 });
    assertSpanning(atZero, n, label + " alpha=0");
    if (Math.abs(atZero.total - mstTotal) > TOLERANCE * Math.max(1, mstTotal)) {
      throw new Error(`${label} alpha=0: total ${atZero.total} != MST ${mstTotal}`);
    }

    const atOne = solve(xs, ys, { root, alpha: 1 });
    assertSpanning(atOne, n, label + " alpha=1");
    if (Math.abs(atOne.pathTotal - atOne.directTotal) > TOLERANCE * Math.max(1, atOne.directTotal)) {
      throw new Error(
        `${label} alpha=1: trips sum to ${atOne.pathTotal}, direct is ${atOne.directTotal}` +
        ` -- alpha=1 must be the star`);
    }

    for (const alpha of [0.15, 0.5, 0.85]) {
      const tree = solve(xs, ys, { root, alpha });
      assertSpanning(tree, n, `${label} alpha=${alpha}`);
      if (tree.total < mstTotal * (1 - TOLERANCE)) {
        throw new Error(`${label} alpha=${alpha}: total ${tree.total} beats the MST ${mstTotal}`);
      }
      if (tree.pathTotal < tree.directTotal * (1 - TOLERANCE)) {
        throw new Error(
          `${label} alpha=${alpha}: trips ${tree.pathTotal} beat direct ${tree.directTotal}`);
      }
      // The reported trip distances have to match the tree that is drawn, or
      // the panel's headline number describes a different network.
      const walked = walkTripDistances(tree, n, root);
      for (let i = 0; i < n; i++) {
        if (Math.abs(walked[i] - tree.paths[i]) > TOLERANCE * Math.max(1, walked[i])) {
          throw new Error(
            `${label} alpha=${alpha}: point ${i} reports trip ${tree.paths[i]}` +
            ` but the tree walks ${walked[i]}`);
        }
      }
    }
  }
}

// Trip distance to the root for every point, read off the returned edges.
function walkTripDistances(tree, n, root) {
  const adjacency = Array.from({ length: n }, () => []);
  for (const edge of tree.edges) {
    adjacency[edge.a].push([edge.b, edge.len]);
    adjacency[edge.b].push([edge.a, edge.len]);
  }
  const out = new Float64Array(n).fill(Infinity);
  out[root] = 0;
  const queue = [root];
  for (let head = 0; head < queue.length; head++) {
    const at = queue[head];
    for (const [to, len] of adjacency[at]) {
      if (out[to] === Infinity) {
        out[to] = out[at] + len;
        queue.push(to);
      }
    }
  }
  return out;
}

function checkOne(name, xs, ys, seed) {
  const n = xs.length;
  const cases = [
    ["euclidean", Emst.euclidean(xs, ys), bruteForceTotal(xs, ys, euclidean)],
    ["rectilinear", Emst.rectilinear(xs, ys), bruteForceTotal(xs, ys, rectilinear)],
  ];
  for (const [metric, result, reference] of cases) {
    const label = `${name}/${metric} n=${n} seed=${seed}`;
    assertSpanning(result, n, label);
    // The reported total must also match the tree the caller will actually
    // draw, or the summary lies about the edges on screen.
    const summed = result.edges.reduce((acc, edge) => acc + edge.len, 0);
    if (Math.abs(summed - result.total) > TOLERANCE * Math.max(1, summed)) {
      throw new Error(`${label}: reported total ${result.total} != summed edges ${summed}`);
    }
    if (Math.abs(result.total - reference) > TOLERANCE * Math.max(1, reference)) {
      throw new Error(
        `${label}: total ${result.total.toFixed(6)} != brute force ${reference.toFixed(6)}` +
        ` (excess ${(result.total - reference).toFixed(6)})`);
    }
  }
  checkDestination(name, xs, ys, seed);
}

function main() {
  const iterations = parseInt(process.argv[2], 10) || 300;
  const names = Object.keys(GENERATORS);
  let checked = 0;

  // Tiny inputs first: 0, 1 and 2 points are the ones a UI actually hits.
  for (const [xs, ys] of [[[], []], [[5], [5]], [[0, 3], [0, 4]], [[1, 1], [1, 1]]]) {
    checkOne("edge-case", xs, ys, 0);
    checked++;
  }

  for (let iteration = 0; iteration < iterations; iteration++) {
    const seed = iteration + 1;
    const rnd = makeRandom(seed);
    for (const name of names) {
      const n = 3 + Math.floor(rnd() * 60);
      const [xs, ys] = GENERATORS[name](rnd, n);
      checkOne(name, xs, ys, seed);
      checked++;
    }
  }

  // A couple of bigger runs per generator: enough points that the hull hash,
  // the flip cascade and the Fenwick sweep all get properly exercised.
  for (const name of names) {
    for (const n of [500, 2000]) {
      const rnd = makeRandom(n + name.length);
      const [xs, ys] = GENERATORS[name](rnd, n);
      checkOne(name, xs, ys, n);
      checked++;
    }
  }

  // Scaling check: the whole point of the candidate sets is that 100k points
  // stay interactive. Brute force is O(n^2), so this one is timed, not diffed.
  const rnd = makeRandom(99);
  const [bigX, bigY] = GENERATORS.uniform(rnd, 100000);
  for (const metric of ["euclidean", "rectilinear"]) {
    const started = process.hrtime.bigint();
    const result = Emst[metric](bigX, bigY);
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    assertSpanning(result, bigX.length, `scale/${metric}`);
    console.log(`  100,000 points, ${metric}: ${ms.toFixed(0)} ms, total ${Math.round(result.total).toLocaleString()} px`);
  }
  // Same again through the destination knob, which swaps Kruskal for a
  // heap-based Prim-Dijkstra -- the panel recomputes on every slider drag, so
  // this path has to stay in the same league.
  for (const alpha of [0, 0.5, 1]) {
    const started = process.hrtime.bigint();
    const result = Emst.euclidean(bigX, bigY, { root: 0, alpha });
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    assertSpanning(result, bigX.length, `scale/dest alpha=${alpha}`);
    console.log(`  100,000 points, euclidean, destination alpha=${alpha}: ${ms.toFixed(0)} ms,`
      + ` total ${Math.round(result.total).toLocaleString()} px,`
      + ` trips ${Math.round(result.pathTotal).toLocaleString()} px`);
  }

  console.log(`OK -- ${checked} point sets, both metrics, all matching brute force.`);
}

main();
