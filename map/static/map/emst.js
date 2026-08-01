// Minimum-spanning-tree geometry for the "Optimal network finder" tool (see
// network.js). Pure math -- no DOM, no Leaflet -- so tools/check_emst.js can
// load this file straight into node and diff every result against a
// brute-force O(n^2) tree. Two metrics, both EXACT (a real minimum spanning
// tree, not an approximation) and both O(n log n):
//
//   Emst.euclidean(xs, ys)    -- straight-line links, total length minimised
//     under ordinary distance. The Euclidean MST is a subgraph of the
//     Delaunay triangulation, so triangulating first (sweep-hull, below)
//     shrinks the candidate set from n(n-1)/2 edges to under 3n; Kruskal over
//     those is then the dominant O(n log n).
//
//   Emst.rectilinear(xs, ys)  -- links that may only run along X or Y (each
//     edge drawn as an L of two axis-aligned legs). This minimises total L1
//     length, and it is NOT the Euclidean tree redrawn with corners: changing
//     the metric changes which pairs the optimal tree even connects. The
//     rectilinear MST is a subgraph of the OCTANT GRAPH -- every point joined
//     to its L1-nearest neighbour inside each of the eight 45-degree sectors
//     around it (Guibas & Stolfi 1983; Zhou et al. 2001) -- and inside one
//     sector the L1 distance collapses to a linear function of the far
//     endpoint, which is what lets a sweep with a Fenwick tree find all eight
//     at once. Under 4n candidates, again O(n log n).
//
// Both entry points optionally take a DESTINATION as well (see
// primDijkstra): with one set, what is minimised stops being total length
// alone and slides -- by a single 0..1 knob -- toward the distance each point
// has to travel through the tree to reach that destination.
//
// Both entry points take parallel coordinate arrays and return
// { edges: [{a, b, len}], total } with a/b indexing back into those arrays,
// plus { paths, pathTotal, directTotal } when a destination was given.
// Coordinates are map pixels everywhere in this project; since the world ->
// map projection is a single uniform scale with no rotation (see
// rust_parser/core/src/mapdata/geometry.rs), a tree that is optimal in map
// pixels is optimal in world metres, and X/Y stay the world's own axes.

var Emst = {};

(function() {
  "use strict";

  // ---- Kruskal over a candidate edge set -----------------------------------

  // Both metrics reduce to the same final step: a candidate set that provably
  // CONTAINS the MST, then Kruskal. Union-find with path compression + union
  // by rank makes that step effectively linear, so the sort is what costs the
  // log.
  function kruskal(n, candidates) {
    candidates.sort(function(a, b) { return a.len - b.len; });
    var parent = new Int32Array(n);
    var rank = new Uint8Array(n);
    for (var i = 0; i < n; i++) {
      parent[i] = i;
    }

    function find(x) {
      var root = x;
      while (parent[root] !== root) {
        root = parent[root];
      }
      while (parent[x] !== root) {
        var next = parent[x];
        parent[x] = root;
        x = next;
      }
      return root;
    }

    var edges = [];
    var total = 0;
    for (var e = 0; e < candidates.length && edges.length < n - 1; e++) {
      var candidate = candidates[e];
      var ra = find(candidate.a);
      var rb = find(candidate.b);
      if (ra === rb) {
        continue;
      }
      if (rank[ra] < rank[rb]) {
        var swap = ra; ra = rb; rb = swap;
      }
      parent[rb] = ra;
      if (rank[ra] === rank[rb]) {
        rank[ra]++;
      }
      edges.push(candidate);
      total += candidate.len;
    }
    return { edges: edges, total: total };
  }

  // ---- Prim-Dijkstra: the total-length / trip-distance knob ----------------
  //
  // Prim's shape with one changed key. Growing the tree outward from the
  // destination, the next edge taken is the one minimising
  //
  //     alpha * (distance from the destination to u through the tree)
  //     + w(u, v)                                   [u already in, v not yet]
  //
  // At alpha = 0 the first term vanishes and this IS Prim, so the result is a
  // genuine minimum spanning tree. At alpha = 1 it IS Dijkstra, so every
  // point ends up on a shortest path to the destination -- and since the
  // candidate set is augmented with a direct destination-to-everywhere edge
  // (see solve), that means every point joined straight to it, which is the
  // exact minimum of "sum of every point's trip distance". Between the two
  // the costs trade off smoothly. This is Alpert, Hu, Huang & Kahng's
  // Prim-Dijkstra tradeoff, from VLSI routing, where the same tension buys
  // signal delay with wire length.
  //
  // Only the two endpoints are provably optimal for their own objective:
  // "shortest network whose trip distances sum to at most X" is NP-hard, so
  // strictly-between settings are a principled heuristic, not an optimum.
  // network.js's panel says as much rather than implying otherwise.
  //
  // Cost is Prim's: every candidate edge is pushed at most once onto a binary
  // heap, so O(m log m) over a candidate set that is already O(n) -- the same
  // O(n log n) budget as the Kruskal path.
  function primDijkstra(count, candidates, root, alpha) {
    // Adjacency in compressed-row form (counts, then prefix sums, then fill).
    // Flat typed arrays rather than arrays-of-arrays: at 100,000 points this
    // is half a million directed entries, where per-edge objects would cost
    // more in allocation than the whole search costs in work.
    var degree = new Int32Array(count);
    var i;
    for (i = 0; i < candidates.length; i++) {
      degree[candidates[i].a]++;
      degree[candidates[i].b]++;
    }
    var start = new Int32Array(count + 1);
    for (i = 0; i < count; i++) {
      start[i + 1] = start[i] + degree[i];
    }
    var cursor = start.slice(0, count);
    var target = new Int32Array(candidates.length * 2);
    var weight = new Float64Array(candidates.length * 2);
    for (i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      target[cursor[candidate.a]] = candidate.b;
      weight[cursor[candidate.a]++] = candidate.len;
      target[cursor[candidate.b]] = candidate.a;
      weight[cursor[candidate.b]++] = candidate.len;
    }

    // Binary heap over (key, node, cameFrom, edgeLength), parallel arrays.
    // Each directed entry is pushed at most once, plus the root's seed.
    var capacity = candidates.length * 2 + 1;
    var heapKey = new Float64Array(capacity);
    var heapNode = new Int32Array(capacity);
    var heapFrom = new Int32Array(capacity);
    var heapLen = new Float64Array(capacity);
    var heapSize = 0;
    var poppedNode = 0, poppedFrom = 0, poppedLen = 0;

    function heapSwap(a, b) {
      var k = heapKey[a]; heapKey[a] = heapKey[b]; heapKey[b] = k;
      var n = heapNode[a]; heapNode[a] = heapNode[b]; heapNode[b] = n;
      var f = heapFrom[a]; heapFrom[a] = heapFrom[b]; heapFrom[b] = f;
      var l = heapLen[a]; heapLen[a] = heapLen[b]; heapLen[b] = l;
    }

    function heapPush(key, node, from, len) {
      var at = heapSize++;
      heapKey[at] = key;
      heapNode[at] = node;
      heapFrom[at] = from;
      heapLen[at] = len;
      while (at > 0) {
        var parent = (at - 1) >> 1;
        if (heapKey[parent] <= heapKey[at]) {
          break;
        }
        heapSwap(at, parent);
        at = parent;
      }
    }

    function heapPop() {
      poppedNode = heapNode[0];
      poppedFrom = heapFrom[0];
      poppedLen = heapLen[0];
      heapSize--;
      if (heapSize > 0) {
        heapKey[0] = heapKey[heapSize];
        heapNode[0] = heapNode[heapSize];
        heapFrom[0] = heapFrom[heapSize];
        heapLen[0] = heapLen[heapSize];
        var at = 0;
        for (;;) {
          var left = at * 2 + 1;
          var right = left + 1;
          var smallest = at;
          if (left < heapSize && heapKey[left] < heapKey[smallest]) {
            smallest = left;
          }
          if (right < heapSize && heapKey[right] < heapKey[smallest]) {
            smallest = right;
          }
          if (smallest === at) {
            break;
          }
          heapSwap(at, smallest);
          at = smallest;
        }
      }
    }

    var inTree = new Uint8Array(count);
    var paths = new Float64Array(count); // Distance to the destination through the tree.
    var edges = [];
    var total = 0;
    heapPush(0, root, -1, 0);
    while (heapSize > 0 && edges.length < count - 1) {
      heapPop();
      var node = poppedNode;
      if (inTree[node]) {
        continue; // Already reached by a cheaper key -- the lazy-deletion case.
      }
      inTree[node] = 1;
      if (poppedFrom !== -1) {
        // poppedFrom entered the tree earlier, so its own path is final.
        paths[node] = paths[poppedFrom] + poppedLen;
        edges.push({ a: poppedFrom, b: node, len: poppedLen });
        total += poppedLen;
      }
      for (var e = start[node]; e < start[node + 1]; e++) {
        if (!inTree[target[e]]) {
          heapPush(alpha * paths[node] + weight[e], target[e], node, weight[e]);
        }
      }
    }
    return { edges: edges, total: total, paths: paths };
  }

  // ---- Shared entry point --------------------------------------------------

  function euclideanLength(xs, ys, a, b) {
    return Math.hypot(xs[a] - xs[b], ys[a] - ys[b]);
  }

  function rectilinearLength(xs, ys, a, b) {
    return Math.abs(xs[a] - xs[b]) + Math.abs(ys[a] - ys[b]);
  }

  // Exactly coincident points -- two machines stacked on the same spot, or
  // the same object added to the list twice -- are ambiguous for "nearest in
  // this direction" and degenerate for the triangulation, so they never reach
  // the geometry: one representative per distinct coordinate goes in, and
  // every other point is stitched back on afterwards with a zero-length edge.
  // The returned tree still spans every input index (n-1 edges), which is
  // what the caller draws, and the total is unaffected.
  function solve(xs, ys, candidatesFor, lengthOf, options) {
    var n = xs.length;
    var root = options && typeof options.root === "number"
      && options.root >= 0 && options.root < n ? options.root : -1;
    var alpha = options && typeof options.alpha === "number"
      ? Math.min(1, Math.max(0, options.alpha)) : 0;
    if (n < 2) {
      return emptyResult(n, root);
    }
    var seen = Object.create(null);
    var uniqueX = [];
    var uniqueY = [];
    var originalOf = [];              // unique index -> an index into xs/ys
    var uniqueOf = new Int32Array(n); // index into xs/ys -> unique index
    var zeroEdges = [];
    for (var i = 0; i < n; i++) {
      var key = xs[i] + "," + ys[i];
      if (seen[key] !== undefined) {
        zeroEdges.push({ a: seen[key], b: i, len: 0 });
        uniqueOf[i] = uniqueOf[seen[key]];
        continue;
      }
      seen[key] = i;
      uniqueOf[i] = originalOf.length;
      originalOf.push(i);
      uniqueX.push(xs[i]);
      uniqueY.push(ys[i]);
    }
    if (uniqueX.length < 2) {
      // Every point sits on one spot: zero-length edges hold them together
      // and no trip goes anywhere.
      var single = emptyResult(n, root);
      single.edges = zeroEdges;
      return single;
    }

    var candidates = candidatesFor(uniqueX, uniqueY);
    var tree;
    if (root === -1) {
      tree = kruskal(uniqueX.length, candidates);
    } else {
      // The candidate sets are built to contain the minimum SPANNING tree;
      // they have no reason to contain a direct destination-to-far-corner
      // edge, which is exactly what the trip-distance end of the knob wants.
      // Adding the destination's own edges (n-1 more candidates, so the set
      // stays O(n)) is what lets alpha = 1 come out as the exact star.
      var uniqueRoot = uniqueOf[root];
      for (var r = 0; r < uniqueX.length; r++) {
        if (r !== uniqueRoot) {
          candidates.push({ a: uniqueRoot, b: r, len: lengthOf(uniqueX, uniqueY, uniqueRoot, r) });
        }
      }
      tree = primDijkstra(uniqueX.length, candidates, uniqueRoot, alpha);
    }

    var edges = tree.edges.map(function(edge) {
      return { a: originalOf[edge.a], b: originalOf[edge.b], len: edge.len };
    });
    var result = { edges: edges.concat(zeroEdges), total: tree.total,
                   paths: null, pathTotal: 0, directTotal: 0 };
    if (root !== -1) {
      // Reported over the ORIGINAL points, so a duplicate reports the same
      // trip as the point it is stacked on (its own link is zero-length).
      var paths = new Float64Array(n);
      for (var p = 0; p < n; p++) {
        paths[p] = tree.paths[uniqueOf[p]];
        result.pathTotal += paths[p];
        result.directTotal += lengthOf(xs, ys, root, p);
      }
      result.paths = paths;
    }
    return result;
  }

  function emptyResult(n, root) {
    return { edges: [], total: 0, paths: root === -1 ? null : new Float64Array(n),
             pathTotal: 0, directTotal: 0 };
  }

  // Points that are all on one line have no triangulation and no octant
  // structure worth the name -- but their MST is simply the chain through
  // them in order along that line, which lexicographic order gives for any
  // line including a vertical one.
  function chainCandidates(xs, ys, lengthOf) {
    var order = [];
    for (var i = 0; i < xs.length; i++) {
      order.push(i);
    }
    order.sort(function(a, b) { return (xs[a] - xs[b]) || (ys[a] - ys[b]); });
    var candidates = [];
    for (var k = 1; k < order.length; k++) {
      candidates.push({ a: order[k - 1], b: order[k], len: lengthOf(xs, ys, order[k - 1], order[k]) });
    }
    return candidates;
  }

  // ---- Euclidean: Delaunay triangulation, then Kruskal ---------------------

  Emst.euclidean = function(xs, ys, options) {
    return solve(xs, ys, euclideanCandidates, euclideanLength, options);
  };

  function euclideanCandidates(xs, ys) {
    var n = xs.length;
    if (n === 2) {
      return [{ a: 0, b: 1, len: euclideanLength(xs, ys, 0, 1) }];
    }
    // The chain is always in the candidate set, not just when the
    // triangulation comes back empty. Points on (or within floating-point
    // noise of) a single line have no meaningful triangulation, and how
    // degenerate the mesh comes out is a matter of rounding rather than a
    // clean yes/no -- so rather than guess a "collinear enough" threshold,
    // the chain rides along as a guaranteed connected fallback. It is the
    // exact MST for a collinear set, and for anything else Kruskal simply
    // takes the shorter Delaunay edges instead: extra candidates can never
    // make the tree worse, only the running time marginally longer.
    var candidates = chainCandidates(xs, ys, euclideanLength);
    var mesh = delaunay(xs, ys);
    var triangles = mesh.triangles;
    var halfedges = mesh.halfedges;
    for (var e = 0; e < triangles.length; e++) {
      // One candidate per undirected edge: take the halfedge with the larger
      // index of each opposite pair, plus every hull halfedge (no opposite).
      var opposite = halfedges[e];
      if (opposite !== -1 && opposite > e) {
        continue;
      }
      var a = triangles[e];
      var b = triangles[e % 3 === 2 ? e - 2 : e + 1];
      candidates.push({ a: a, b: b, len: euclideanLength(xs, ys, a, b) });
    }
    // A point the sweep could not place (see delaunay's `skipped`) has no
    // triangulated neighbours at all, so on its own it would end up hanging
    // off the chain instead of off its real nearest neighbour. It is a point
    // sitting within floating-point noise of another one, and the nearest
    // point is exactly what such a point connects to in the MST -- so scan
    // for it. Measured over uniform, gridded, near-collinear and
    // micro-clustered sets up to 20,000 points this never fires at all;
    // MAX_SKIP_REPAIR is only there so that if some pathological input ever
    // does skip wholesale, this stays a quadratic scan over a handful of
    // points rather than over all of them (the chain still spans everything).
    mesh.skipped.slice(0, MAX_SKIP_REPAIR).forEach(function(index) {
      var best = -1;
      var bestLen = Infinity;
      for (var j = 0; j < n; j++) {
        if (j === index) {
          continue;
        }
        var len = euclideanLength(xs, ys, index, j);
        if (len < bestLen) {
          bestLen = len;
          best = j;
        }
      }
      if (best !== -1) {
        candidates.push({ a: index, b: best, len: bestLen });
      }
    });
    return candidates;
  }

  // ---- Delaunay triangulation (sweep-hull) ---------------------------------
  //
  // Sinclair's s-hull sweep: seed with the smallest triangle near the middle
  // of the cloud, sort every other point by distance from that triangle's
  // circumcentre, and add them in that order. Each new point sees a
  // contiguous run of convex-hull edges; the triangles it forms against them
  // are legalized on the spot (flip an edge whenever the opposite point falls
  // inside a circumcircle) so the mesh is Delaunay after every insertion.
  //
  // The bookkeeping is the flat halfedge formulation that Mapbox's Delaunator
  // popularized -- triangles[] and halfedges[] as parallel index arrays, plus
  // a hash over hull vertices by angle so the first visible hull edge is
  // found without walking the hull. This is an independent implementation of
  // those published algorithms (s-hull, Sinclair 2016), written for this
  // project; no third-party triangulation code is vendored here.
  //
  // Halfedge convention: halfedge e belongs to triangle (e / 3 | 0) and runs
  // from triangles[e] to triangles[next(e)]; halfedges[e] is the opposing
  // halfedge of the neighbouring triangle, or -1 on the hull.

  var MAX_FLIP_STACK = 512;    // See legalize: a bound, not an expected depth.
  var MAX_SKIP_REPAIR = 64;    // See euclideanCandidates: likewise.

  // Twice the signed area of (a, b, c): positive when a -> b -> c turns one
  // way, negative the other. Which way is "counter-clockwise" depends on the
  // Y axis direction, and the triangulation only needs the convention to be
  // consistent -- the seed triangle below is flipped to match if needed.
  function cross(ax, ay, bx, by, cx, cy) {
    return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  }

  // True when d falls strictly inside the circumcircle of (a, b, c), which is
  // the "this edge must be flipped" test. (a, b, c) must wind the same way as
  // the seed triangle, i.e. cross(a, b, c) > 0 -- with the opposite winding
  // this determinant's sign flips and every flip decision inverts.
  function inCircle(ax, ay, bx, by, cx, cy, dx, dy) {
    var adx = ax - dx, ady = ay - dy;
    var bdx = bx - dx, bdy = by - dy;
    var cdx = cx - dx, cdy = cy - dy;
    var ap = adx * adx + ady * ady;
    var bp = bdx * bdx + bdy * bdy;
    var cp = cdx * cdx + cdy * cdy;
    return adx * (bdy * cp - bp * cdy)
         - ady * (bdx * cp - bp * cdx)
         + ap * (bdx * cdy - bdy * cdx) > 0;
  }

  function circumradiusSquared(ax, ay, bx, by, cx, cy) {
    var center = circumcenter(ax, ay, bx, by, cx, cy);
    if (!center) {
      return Infinity;
    }
    var dx = center.x - ax;
    var dy = center.y - ay;
    return dx * dx + dy * dy;
  }

  function circumcenter(ax, ay, bx, by, cx, cy) {
    var dx = bx - ax, dy = by - ay;
    var ex = cx - ax, ey = cy - ay;
    var bl = dx * dx + dy * dy;
    var cl = ex * ex + ey * ey;
    var d = 0.5 / (dx * ey - dy * ex);
    if (!isFinite(d)) {
      return null; // Collinear: no circumcircle.
    }
    return { x: ax + (ey * bl - dy * cl) * d, y: ay + (dx * cl - ex * bl) * d };
  }

  // Monotonic in the true angle of (dx, dy) and far cheaper -- only used to
  // bucket hull vertices by direction from the sweep centre.
  function pseudoAngle(dx, dy) {
    var p = dx / (Math.abs(dx) + Math.abs(dy));
    return (dy > 0 ? 3 - p : 1 + p) / 4; // [0, 1)
  }

  function delaunay(xs, ys) {
    var n = xs.length;
    var triangles = [];
    var halfedges = [];
    var skipped = [];
    if (n < 3) {
      return { triangles: triangles, halfedges: halfedges, skipped: skipped };
    }

    // -- Seed triangle: the smallest circumcircle anchored near the centre.
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < n; i++) {
      if (xs[i] < minX) minX = xs[i];
      if (ys[i] < minY) minY = ys[i];
      if (xs[i] > maxX) maxX = xs[i];
      if (ys[i] > maxY) maxY = ys[i];
    }
    var midX = (minX + maxX) / 2;
    var midY = (minY + maxY) / 2;

    var i0 = -1, i1 = -1, i2 = -1;
    var best = Infinity;
    for (i = 0; i < n; i++) {
      var d = (xs[i] - midX) * (xs[i] - midX) + (ys[i] - midY) * (ys[i] - midY);
      if (d < best) {
        best = d;
        i0 = i;
      }
    }
    best = Infinity;
    for (i = 0; i < n; i++) {
      if (i === i0) {
        continue;
      }
      d = (xs[i] - xs[i0]) * (xs[i] - xs[i0]) + (ys[i] - ys[i0]) * (ys[i] - ys[i0]);
      if (d > 0 && d < best) {
        best = d;
        i1 = i;
      }
    }
    best = Infinity;
    for (i = 0; i < n; i++) {
      if (i === i0 || i === i1) {
        continue;
      }
      d = circumradiusSquared(xs[i0], ys[i0], xs[i1], ys[i1], xs[i], ys[i]);
      if (d < best) {
        best = d;
        i2 = i;
      }
    }
    if (i1 === -1 || i2 === -1 || best === Infinity) {
      // No three non-collinear points at all -- the caller falls back to a chain.
      return { triangles: triangles, halfedges: halfedges, skipped: skipped };
    }
    if (cross(xs[i0], ys[i0], xs[i1], ys[i1], xs[i2], ys[i2]) < 0) {
      var swap = i1; i1 = i2; i2 = swap; // Fix the seed's winding.
    }

    var center = circumcenter(xs[i0], ys[i0], xs[i1], ys[i1], xs[i2], ys[i2]);

    // -- Insertion order: outward from the seed circumcentre, so the hull
    // only ever grows and every point lands outside the current hull.
    var order = [];
    var dists = new Float64Array(n);
    for (i = 0; i < n; i++) {
      order.push(i);
      dists[i] = (xs[i] - center.x) * (xs[i] - center.x) + (ys[i] - center.y) * (ys[i] - center.y);
    }
    order.sort(function(a, b) { return dists[a] - dists[b]; });

    // -- Hull as a doubly linked ring of vertex indices, plus the halfedge
    // each hull edge belongs to, plus an angle hash for O(1)-ish lookup.
    var hullPrev = new Int32Array(n);
    var hullNext = new Int32Array(n);
    var hullTri = new Int32Array(n);
    var hullStart = i0;
    var hashSize = Math.ceil(Math.sqrt(n));
    var hullHash = new Int32Array(hashSize).fill(-1);

    function hashKey(x, y) {
      return Math.floor(pseudoAngle(x - center.x, y - center.y) * hashSize) % hashSize;
    }

    function link(a, b) {
      halfedges[a] = b;
      if (b !== -1) {
        halfedges[b] = a;
      }
    }

    function addTriangle(a, b, c, ha, hb, hc) {
      var t = triangles.length;
      triangles.push(a, b, c);
      link(t, ha);
      link(t + 1, hb);
      link(t + 2, hc);
      return t;
    }

    // Flip every edge that fails the empty-circumcircle test, following the
    // cascade outward. Returns the halfedge that ends up in the position the
    // caller needs for its hull bookkeeping (see the insertion loop).
    var flipStack = new Int32Array(MAX_FLIP_STACK);
    function legalize(a) {
      var depth = 0;
      var ar = 0;
      for (;;) {
        var b = halfedges[a];
        var a0 = a - a % 3;
        ar = a0 + (a + 2) % 3;
        if (b === -1) { // Hull edge: nothing on the other side to be illegal.
          if (depth === 0) {
            break;
          }
          a = flipStack[--depth];
          continue;
        }
        var b0 = b - b % 3;
        var al = a0 + (a + 1) % 3;
        var bl = b0 + (b + 2) % 3;
        var p0 = triangles[ar];
        var pr = triangles[a];
        var pl = triangles[al];
        var p1 = triangles[bl];
        var illegal = inCircle(
          xs[p0], ys[p0], xs[pr], ys[pr], xs[pl], ys[pl], xs[p1], ys[p1]);
        if (!illegal) {
          if (depth === 0) {
            break;
          }
          a = flipStack[--depth];
          continue;
        }
        triangles[a] = p1;
        triangles[b] = p0;
        var hbl = halfedges[bl];
        if (hbl === -1) {
          // The flipped-away edge was on the hull: move the hull's reference
          // to the halfedge that replaced it.
          var e = hullStart;
          do {
            if (hullTri[e] === bl) {
              hullTri[e] = a;
              break;
            }
            e = hullPrev[e];
          } while (e !== hullStart);
        }
        link(a, hbl);
        link(b, halfedges[ar]);
        link(ar, bl);
        // Both new outer edges may now be illegal in turn. One is followed
        // immediately, the other is stacked -- with a hard cap, so a
        // floating-point near-tie that keeps flipping the same quad back and
        // forth can never hang the browser.
        if (depth < MAX_FLIP_STACK) {
          flipStack[depth++] = b0 + (b + 1) % 3;
        }
      }
      return ar;
    }

    hullNext[i0] = hullPrev[i2] = i1;
    hullNext[i1] = hullPrev[i0] = i2;
    hullNext[i2] = hullPrev[i1] = i0;
    hullTri[i0] = 0;
    hullTri[i1] = 1;
    hullTri[i2] = 2;
    hullHash[hashKey(xs[i0], ys[i0])] = i0;
    hullHash[hashKey(xs[i1], ys[i1])] = i1;
    hullHash[hashKey(xs[i2], ys[i2])] = i2;
    addTriangle(i0, i1, i2, -1, -1, -1);

    for (var k = 0; k < order.length; k++) {
      var p = order[k];
      if (p === i0 || p === i1 || p === i2) {
        continue;
      }
      var x = xs[p], y = ys[p];

      // Start from the hull vertex hashed nearest this direction, then walk
      // forward to the first edge this point can actually see.
      var start = 0;
      var key = hashKey(x, y);
      for (var j = 0; j < hashSize; j++) {
        start = hullHash[(key + j) % hashSize];
        if (start !== -1 && start !== hullNext[start]) {
          break;
        }
      }
      start = hullPrev[start];
      var edge = start;
      var q = hullNext[edge];
      // An edge is visible when the new point lies on its outer side.
      while (cross(x, y, xs[edge], ys[edge], xs[q], ys[q]) >= 0) {
        edge = q;
        if (edge === start) {
          edge = -1;
          break;
        }
        q = hullNext[edge];
      }
      if (edge === -1) {
        skipped.push(p); // Numerically indistinguishable from an existing point.
        continue;
      }

      var t = addTriangle(edge, p, hullNext[edge], -1, -1, hullTri[edge]);
      hullTri[p] = legalize(t + 2);
      hullTri[edge] = t;

      // Walk forward over every further edge this point can see, filling the
      // wedge with triangles as it goes.
      var forward = hullNext[edge];
      for (;;) {
        q = hullNext[forward];
        if (cross(x, y, xs[forward], ys[forward], xs[q], ys[q]) >= 0) {
          break;
        }
        t = addTriangle(forward, p, q, hullTri[p], -1, hullTri[forward]);
        hullTri[p] = legalize(t + 2);
        hullNext[forward] = forward; // Mark as no longer on the hull.
        forward = q;
      }
      // ...and backward, but only when the search above stopped at the very
      // first edge tried (otherwise the edges behind it were already found
      // not to be visible).
      if (edge === start) {
        for (;;) {
          q = hullPrev[edge];
          if (cross(x, y, xs[q], ys[q], xs[edge], ys[edge]) >= 0) {
            break;
          }
          t = addTriangle(q, p, edge, -1, hullTri[edge], hullTri[q]);
          legalize(t + 2);
          hullTri[q] = t;
          hullNext[edge] = edge; // Off the hull.
          edge = q;
        }
      }

      hullStart = hullPrev[p] = edge;
      hullNext[edge] = p;
      hullPrev[forward] = p;
      hullNext[p] = forward;
      hullHash[hashKey(x, y)] = p;
      hullHash[hashKey(xs[edge], ys[edge])] = edge;
    }

    return { triangles: triangles, halfedges: halfedges, skipped: skipped };
  }

  // ---- Rectilinear: octant graph, then Kruskal -----------------------------

  Emst.rectilinear = function(xs, ys, options) {
    return solve(xs, ys, rectilinearCandidates, rectilinearLength, options);
  };

  function rectilinearCandidates(xs, ys) {
    var n = xs.length;
    var candidates = [];
    function emit(a, b) {
      candidates.push({ a: a, b: b, len: rectilinearLength(xs, ys, a, b) });
    }
    var negX = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      negX[i] = -xs[i];
    }
    // One sweep per octant of the upper half-plane; the lower four are the
    // same edges seen from their other endpoint, so they need no sweep.
    // Mirroring X and swapping the axes are both L1 isometries, so distances
    // are unchanged and each transformed R1 sweep is a different octant of
    // the original: (x, y) -> R1, (y, x) -> R2, (-x, y) -> R4, (y, -x) -> R3.
    sweepOctantR1(xs, ys, emit);
    sweepOctantR1(ys, xs, emit);
    sweepOctantR1(negX, ys, emit);
    sweepOctantR1(ys, negX, emit);
    return candidates;
  }

  // Fenwick tree over "minimum value, and which point achieved it", supporting
  // point insert and prefix-minimum query. Insert-only, which is all the
  // sweep needs.
  function MinFenwick(size) {
    this.values = new Float64Array(size + 1).fill(Infinity);
    this.owners = new Int32Array(size + 1).fill(-1);
  }

  MinFenwick.prototype.insert = function(pos, value, owner) {
    for (var i = pos; i < this.values.length; i += i & -i) {
      if (value < this.values[i]) {
        this.values[i] = value;
        this.owners[i] = owner;
      }
    }
  };

  MinFenwick.prototype.queryPrefix = function(pos) {
    var bestValue = Infinity;
    var bestOwner = -1;
    for (var i = pos; i > 0; i -= i & -i) {
      if (this.values[i] < bestValue) {
        bestValue = this.values[i];
        bestOwner = this.owners[i];
      }
    }
    return bestOwner;
  };

  // Calls emit(p, q) with q = the L1-nearest point to p inside p's octant
  // R1 = { q : qx - px >= qy - py >= 0 }, for every p that has one.
  //
  // Inside R1 the L1 distance is (qx + qy) - (px + py), so the nearest point
  // is simply the one with the smallest (x + y). The octant's two conditions
  // become "qy >= py" -- satisfied by sweeping top to bottom and only
  // considering points already swept -- and "qx - qy >= px - py", a suffix
  // range over the key u = x - y. So: sweep, ask the Fenwick tree for the
  // smallest x + y over that suffix, insert, move on. O(n log n).
  //
  // Ties in y are broken by descending x, which puts the right-hand point of
  // a horizontal pair into the sweep first so the left-hand one finds it (an
  // edge only has to be found from ONE of its endpoints).
  function sweepOctantR1(xs, ys, emit) {
    var n = xs.length;
    var order = [];
    var keys = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      order.push(i);
      keys[i] = xs[i] - ys[i];
    }
    order.sort(function(a, b) { return (ys[b] - ys[a]) || (xs[b] - xs[a]); });

    // Rank the key axis so the Fenwick tree can index it.
    var sortedKeys = Array.prototype.slice.call(keys).sort(function(a, b) { return a - b; });
    var uniqueKeys = [];
    for (i = 0; i < sortedKeys.length; i++) {
      if (i === 0 || sortedKeys[i] !== sortedKeys[i - 1]) {
        uniqueKeys.push(sortedKeys[i]);
      }
    }
    var levels = uniqueKeys.length;

    function rankOf(value) {
      var lo = 0, hi = levels - 1;
      while (lo < hi) {
        var mid = (lo + hi) >> 1;
        if (uniqueKeys[mid] < value) {
          lo = mid + 1;
        } else {
          hi = mid;
        }
      }
      return lo; // 0-based
    }

    var tree = new MinFenwick(levels);
    for (var k = 0; k < n; k++) {
      var p = order[k];
      // Fenwick prefixes run low-to-high, the query is a suffix over the key
      // axis -- so index it reversed.
      var position = levels - rankOf(keys[p]);
      var nearest = tree.queryPrefix(position);
      if (nearest !== -1) {
        emit(p, nearest);
      }
      tree.insert(position, xs[p] + ys[p], p);
    }
  }
})();
