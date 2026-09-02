// Height view: 2.5D Cuts on the current map tab after a committed XY
// rectangle. Occupants are today's Selection (collectInBox ∩ altitude rail
// ∩ Cut band). Chrome is a docked side panel (A–A′ top half, B–B′ bottom
// half) with a session switch to flaps. L-frame overlay was dropped after
// the walking skeleton: edge gutters stay too thin to read Z. Cut marks
// are projected AABB with 19 bin-dedupe, rasterized on the map's WebGL
// context (typed-array stream, XY∩rail only, FBO → SVG <image>). SVG
// marks remain the fallback when WebGL is unavailable. No second canvas
// in the strip, no world-scale second buffer.
// After commit, the cube is one-axis editable: a map-edge handle or the
// matching Cut vertical (A/A′ = X, B/B′ = Y). Opposite side stays; the
// Z band is not reset. Building AABB Z comes from bucket.heightExtentM
// (clearance / dimensions.Height); missing table height is the 4 m
// dashed placeholder (19).
// Spec: .scratch/vertical-builds/specs/2-5d-first-cut.md

var HeightView = {};

(function() {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  // Must stay in lockstep with editor.js / mapdata/geometry.rs.
  var MAP_SIZE = 8192;
  var SCALE = 22.887;
  var DESCALE = 20;
  var CROP_LO = 4096 / DESCALE;
  var TO_HIGHRES = MAP_SIZE / (36864 / DESCALE - CROP_LO);
  var PIXELS_PER_WORLD_UNIT = (1 / SCALE / DESCALE) * TO_HIGHRES;
  var METERS_PER_MAP_PX = (1 / PIXELS_PER_WORLD_UNIT) / 100;

  var FLAP_A_MIN_DEPTH_PX = 160;
  var FLAP_A_MAX_DEPTH_PX = 280;
  // B–B′ is the vertical flap: its width is the elevation's along axis.
  // Keep it a flap (not the side panel), but wide enough to read.
  var FLAP_B_MIN_DEPTH_PX = 240;
  var FLAP_B_MAX_DEPTH_PX = 320;
  var FLAP_MIN_LENGTH_PX = 160;
  var EDGE_HIT_PX = 16;
  var MIN_EDGE_SPAN_PX = 16;
  var DEFAULT_HEIGHT_M = 4;
  var PAD_RATIO = 0.2;
  var PAD_MIN_M = 4;
  var PAD_MAX_M = 50;
  var FADE_OPACITY = 0.28;
  // Ticket 19: one mark per (type + along bin + Z bin), separately for
  // in-Build vs out-crossing (and faded). 2 m is finer than a foundation
  // slab and still collapses depth-stacked twins on a strip.
  var ALONG_BIN_M = 2;
  var Z_BIN_M = 2;

  var host = document.getElementById("heightView");
  var cutA = null;
  var cutB = null;
  var svgA = null;
  var svgB = null;
  var bandA = null;
  var bandB = null;
  var switcher = null;
  var layoutSideBtn = null;
  var layoutFlapsBtn = null;

  var isolation = null;
  var layout = "side";
  var flipA = false;
  var flipB = false;
  var domain = { min: 0, max: 20 };
  var band = { min: 0, max: 20 };
  var xyOccupants = [];
  var cubeOccupants = [];
  var cubeKeys = new Set();
  var subtractIds = new Set();
  var isolationRect = null;
  var mapEdgeEls = null;
  var edgeDrag = null;
  var mapEventsBound = false;
  var markRecords = new Map();
  var excludedOverlap = [];
  var resizeObserver = null;
  var xyCacheValid = false;
  var gridScratch = [];
  var cutsDrawQueued = false;
  var lastCutSizeA = 0;
  var lastCutSizeB = 0;
  var cutHitsA = [];
  var cutHitsB = [];
  var bandJustDragged = false;

  HeightView.isOpen = function() {
    return isolation !== null;
  };

  function actorId(r) {
    return r.id || SelectionTool.recordKey(r);
  }

  function recordZ(r) {
    return SelectionTool.recordZ(r);
  }

  function altitudeCap() {
    var range = MapApp.altitudeRange || { min: -Infinity, max: Infinity };
    return { min: range.min, max: range.max };
  }

  function inAltitude(z, cap) {
    return z >= cap.min && z <= cap.max;
  }

  function inRect(x, y, box) {
    return x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY;
  }

  function zExtent(r) {
    var stride = r.bucket.pointStride;
    var cap = altitudeCap();
    if (r.bucket.lines) {
      var line = r.bucket.lines[r.index];
      var z0 = Infinity;
      var z1 = -Infinity;
      if (line) {
        for (var vi = 0; vi < line.length; vi += stride) {
          var lx = line[vi];
          var ly = line[vi + 1];
          var z = line[vi + stride - 1];
          if (!isFinite(z)) {
            continue;
          }
          // Domain is the XY-occupant box, not the rest of a belt that
          // merely clips the rectangle (19: min/max of XY-occupant boxes).
          if (isolation && !inRect(lx, ly, isolation)) {
            continue;
          }
          if (!inAltitude(z, cap)) {
            continue;
          }
          if (z < z0) z0 = z;
          if (z > z1) z1 = z;
        }
      }
      if (z0 > z1) {
        return { min: 0, max: DEFAULT_HEIGHT_M, missing: false };
      }
      return { min: z0, max: z1, missing: false };
    }
    var z = recordZ(r);
    var extent = r.bucket.heightExtentM;
    if (typeof z === "number" && isFinite(z)
        && extent && extent.length >= 2
        && isFinite(extent[0]) && isFinite(extent[1])) {
      return { min: z + extent[0], max: z + extent[1], missing: false };
    }
    if (typeof z !== "number" || !isFinite(z)) {
      return { min: 0, max: DEFAULT_HEIGHT_M, missing: true };
    }
    return { min: z, max: z + DEFAULT_HEIGHT_M, missing: true };
  }

  function recordInBand(r) {
    var cap = altitudeCap();
    if (r.bucket.lines) {
      var line = r.bucket.lines[r.index];
      if (!line || !isolation) {
        return false;
      }
      var stride = r.bucket.pointStride;
      for (var vi = 0; vi < line.length; vi += stride) {
        var lx = line[vi];
        var ly = line[vi + 1];
        var lz = line[vi + stride - 1];
        if (inRect(lx, ly, isolation) && inAltitude(lz, cap)
            && lz >= band.min && lz <= band.max) {
          return true;
        }
      }
      return false;
    }
    var z = recordZ(r);
    return typeof z === "number" && z >= band.min && z <= band.max;
  }

  function occupantZ(r) {
    if (typeof r._zMin === "number" && typeof r._zMax === "number") {
      return { min: r._zMin, max: r._zMax };
    }
    return zExtent(r);
  }

  function cacheExtents(list) {
    for (var i = 0; i < list.length; i++) {
      var ext = zExtent(list[i]);
      list[i]._zMin = ext.min;
      list[i]._zMax = ext.max;
      list[i]._missingHeight = !!ext.missing;
    }
  }

  function refreshInBandFlags(list) {
    for (var i = 0; i < list.length; i++) {
      list[i]._inBand = recordInBand(list[i]);
    }
  }

  function paddedDomain(zMin, zMax) {
    var span = zMax - zMin;
    var pad = Math.min(PAD_MAX_M, Math.max(PAD_MIN_M, span * PAD_RATIO));
    return { min: zMin - pad, max: zMax + pad };
  }

  function computeDomain(occupants) {
    var zMin = Infinity;
    var zMax = -Infinity;
    for (var i = 0; i < occupants.length; i++) {
      var ext = occupantZ(occupants[i]);
      if (!isFinite(ext.min) || !isFinite(ext.max)) {
        continue;
      }
      if (ext.min < zMin) zMin = ext.min;
      if (ext.max > zMax) zMax = ext.max;
    }
    if (zMin > zMax) {
      // Empty volume: a readable local scale, never the altitude rail.
      return paddedDomain(0, DEFAULT_HEIGHT_M);
    }
    return paddedDomain(zMin, zMax);
  }

  function occupantSpan(occupants) {
    var zMin = Infinity;
    var zMax = -Infinity;
    for (var i = 0; i < occupants.length; i++) {
      var ext = occupantZ(occupants[i]);
      if (!isFinite(ext.min) || !isFinite(ext.max)) {
        continue;
      }
      if (ext.min < zMin) zMin = ext.min;
      if (ext.max > zMax) zMax = ext.max;
    }
    if (zMin > zMax) {
      return { min: domain.min, max: domain.max };
    }
    return { min: zMin, max: zMax };
  }

  function clampBandToCap() {
    var cap = altitudeCap();
    if (isFinite(cap.min) && band.min < cap.min) {
      band.min = cap.min;
    }
    if (isFinite(cap.max) && band.max > cap.max) {
      band.max = cap.max;
    }
    if (band.min > band.max) {
      var mid = (band.min + band.max) / 2;
      band.min = mid;
      band.max = mid;
    }
    if (band.min < domain.min) {
      band.min = domain.min;
    }
    if (band.max > domain.max) {
      band.max = domain.max;
    }
    if (band.min > band.max) {
      band.min = domain.min;
      band.max = domain.max;
    }
  }

  function collectXyOccupants() {
    if (!isolation) {
      return [];
    }
    return SelectionTool.collectInBox(
      isolation.minX, isolation.maxX, isolation.minY, isolation.maxY);
  }

  function applyPeel() {
    if (!xyCacheValid) {
      xyOccupants = collectXyOccupants();
      cacheExtents(xyOccupants);
      xyCacheValid = true;
    }
    refreshInBandFlags(xyOccupants);
    cubeOccupants = [];
    cubeKeys.clear();
    var inCube = new Set();
    for (var i = 0; i < xyOccupants.length; i++) {
      var r = xyOccupants[i];
      if (!r._inBand) {
        continue;
      }
      cubeOccupants.push(r);
      cubeKeys.add(SelectionTool.recordKey(r));
      inCube.add(actorId(r));
    }
    subtractIds.forEach(function(id) {
      if (!inCube.has(id)) {
        subtractIds.delete(id);
      }
    });
    var next = [];
    cubeOccupants.forEach(function(r) {
      if (!subtractIds.has(actorId(r))) {
        next.push(r);
      }
    });
    SelectionTool.setRecords(next);
  }

  HeightView.allowToggle = function(r) {
    if (!isolation) {
      return true;
    }
    return cubeKeys.has(SelectionTool.recordKey(r));
  };

  HeightView.onDeselect = function(r) {
    subtractIds.add(actorId(r));
  };

  HeightView.onReselect = function(r) {
    subtractIds.delete(actorId(r));
  };

  function ensureChrome() {
    if (cutA) {
      return;
    }
    host.setAttribute("aria-label", "Height view");

    switcher = UI.el("div", "segmented heightViewSwitch");
    switcher.setAttribute("role", "group");
    switcher.setAttribute("aria-label", "Height view layout");
    layoutSideBtn = UI.button("", "Side panel", {
      title: "Cuts stacked in a side panel (A–A′ top, B–B′ bottom)",
      onClick: function() { setLayout("side"); },
    });
    layoutFlapsBtn = UI.button("", "Flaps", {
      title: "Cuts as flaps on the isolation box",
      onClick: function() { setLayout("flaps"); },
    });
    switcher.appendChild(layoutSideBtn);
    switcher.appendChild(layoutFlapsBtn);
    host.appendChild(switcher);

    cutA = buildStrip("A", "A′", "Reverse A–A′ (swap ends and depth)");
    cutB = buildStrip("B", "B′", "Reverse B–B′ (swap ends and depth)");
    cutA.strip.id = "heightCutA";
    cutB.strip.id = "heightCutB";
    host.appendChild(cutA.strip);
    host.appendChild(cutB.strip);
    svgA = cutA.svg;
    svgB = cutB.svg;
    bandA = cutA.band;
    bandB = cutB.band;
    ensureMapEdgeHandles();

    resizeObserver = new ResizeObserver(function() {
      if (!isolation) {
        return;
      }
      var sizeA = (svgA.clientWidth || 0) * 65536 + (svgA.clientHeight || 0);
      var sizeB = (svgB.clientWidth || 0) * 65536 + (svgB.clientHeight || 0);
      if (sizeA === lastCutSizeA && sizeB === lastCutSizeB) {
        return;
      }
      requestDrawCuts();
    });
    resizeObserver.observe(cutA.strip);
    resizeObserver.observe(cutB.strip);
  }

  function buildStrip(startName, endName, flipTitle) {
    var strip = UI.el("div", "heightCut");
    var startBtn = UI.button("ghost", startName, {
      title: flipTitle,
      className: "heightCutLabel",
    });
    var endBtn = UI.button("ghost", endName, {
      title: flipTitle,
      className: "heightCutLabel",
    });
    startBtn.setAttribute("aria-label", flipTitle);
    endBtn.setAttribute("aria-label", flipTitle);
    startBtn.addEventListener("click", function() { flipStrip(startName); });
    endBtn.addEventListener("click", function() { flipStrip(startName); });

    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "heightCutSvg");
    svg.setAttribute("aria-hidden", "true");

    var bandEl = UI.el("div", "heightCutBand");
    var handleMax = UI.el("div", "heightCutHandle heightCutHandleMax");
    var handleMin = UI.el("div", "heightCutHandle heightCutHandleMin");
    bandEl.appendChild(handleMax);
    bandEl.appendChild(handleMin);

    var alongStart = UI.el("div", "heightCutAlong");
    var alongEnd = UI.el("div", "heightCutAlong");
    alongStart.setAttribute("aria-label", "Resize isolation start");
    alongEnd.setAttribute("aria-label", "Resize isolation end");

    strip.appendChild(svg);
    strip.appendChild(bandEl);
    strip.appendChild(alongStart);
    strip.appendChild(alongEnd);
    strip.appendChild(startBtn);
    strip.appendChild(endBtn);

    bindBand(strip, bandEl, handleMin, handleMax, startName === "A");
    bindAlongHandle(alongStart, startName === "A", "start");
    bindAlongHandle(alongEnd, startName === "A", "end");
    bindCutHover(svg, strip, startName === "A");
    strip.addEventListener("click", function(e) {
      if (e.target.closest(".heightCutHandle")
          || e.target.closest(".heightCutAlong")
          || e.target.closest(".heightCutLabel")
          || e.target.closest(".heightViewSwitch")) {
        return;
      }
      if (bandJustDragged) {
        return;
      }
      onCutClick(svg, e.clientX, e.clientY);
    });

    return {
      strip: strip,
      svg: svg,
      band: bandEl,
      startBtn: startBtn,
      endBtn: endBtn,
      alongStart: alongStart,
      alongEnd: alongEnd,
    };
  }

  function flipStrip(which) {
    if (which === "A") {
      flipA = !flipA;
    } else {
      flipB = !flipB;
    }
    requestDrawCuts();
  }

  function setLayout(next) {
    layout = next;
    syncLayoutClass();
    applyHostDisplay();
    layoutSideBtn.classList.toggle("active", layout === "side");
    layoutFlapsBtn.classList.toggle("active", layout === "flaps");
    positionChrome();
    requestDrawCuts();
  }

  function applyHostDisplay() {
    if (!isolation) {
      host.style.display = "none";
      return;
    }
    host.style.display = layout === "side" ? "grid" : "block";
  }

  function syncLayoutClass() {
    host.classList.toggle("is-side", layout === "side");
    host.classList.toggle("is-flaps", layout === "flaps");
    document.body.classList.toggle("height-view-open", !!isolation);
    document.body.classList.toggle("height-view-side", !!isolation && layout === "side");
    document.body.classList.toggle("height-view-flaps", !!isolation && layout === "flaps");
  }

  function cssInset(name) {
    var raw = getComputedStyle(document.body).getPropertyValue(name).trim();
    var px = parseFloat(raw);
    return isFinite(px) ? px : 0;
  }

  function boxScreenRect() {
    if (!isolation || !MapApp.map) {
      return null;
    }
    var map = MapApp.map;
    var p1 = map.latLngToContainerPoint(L.latLng(isolation.minY, isolation.minX));
    var p2 = map.latLngToContainerPoint(L.latLng(isolation.maxY, isolation.maxX));
    var leftInset = cssInset("--dock-left-inset");
    var minX = Math.min(p1.x, p2.x) - leftInset;
    var maxX = Math.max(p1.x, p2.x) - leftInset;
    var minY = Math.min(p1.y, p2.y);
    var maxY = Math.max(p1.y, p2.y);
    return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
  }

  function positionChrome() {
    if (!cutA) {
      return;
    }
    cutA.strip.style.cssText = "";
    cutB.strip.style.cssText = "";
    if (layout !== "flaps" || !isolation) {
      positionEdgeHandles();
      return;
    }
    var box = boxScreenRect();
    if (!box) {
      positionEdgeHandles();
      return;
    }
    var aLen = Math.max(FLAP_MIN_LENGTH_PX, box.width);
    var bLen = Math.max(FLAP_MIN_LENGTH_PX, box.height);
    var hostW = host.clientWidth || 1;
    var hostH = host.clientHeight || 1;
    var below = hostH - (box.top + box.height);
    var right = hostW - (box.left + box.width);
    var aDepth = flapDepth(below, hostH, FLAP_A_MIN_DEPTH_PX, FLAP_A_MAX_DEPTH_PX);
    var bDepth = flapDepth(right, hostW, FLAP_B_MIN_DEPTH_PX, FLAP_B_MAX_DEPTH_PX);
    cutA.strip.style.left = box.left + "px";
    cutA.strip.style.top = (box.top + box.height) + "px";
    cutA.strip.style.width = aLen + "px";
    cutA.strip.style.height = aDepth + "px";
    cutB.strip.style.left = (box.left + box.width) + "px";
    cutB.strip.style.top = box.top + "px";
    cutB.strip.style.width = bDepth + "px";
    cutB.strip.style.height = bLen + "px";
    positionEdgeHandles();
  }

  function flapDepth(availablePx, hostPx, minPx, maxPx) {
    var cap = Math.min(maxPx, Math.round(hostPx * 0.45));
    var grown = availablePx - 12;
    if (!isFinite(grown) || grown < minPx) {
      return minPx;
    }
    return Math.max(minPx, Math.min(cap, grown));
  }

  function bindMapEvents() {
    if (mapEventsBound || !MapApp.map) {
      return;
    }
    MapApp.map.on("move", onMapMove);
    MapApp.map.on("zoomend moveend resize", onMapViewChanged);
    mapEventsBound = true;
  }

  function unbindMapEvents() {
    if (!mapEventsBound || !MapApp.map) {
      return;
    }
    MapApp.map.off("move", onMapMove);
    MapApp.map.off("zoomend moveend resize", onMapViewChanged);
    mapEventsBound = false;
  }

  function onMapMove() {
    positionChrome();
  }

  function onMapViewChanged() {
    positionChrome();
    if (layout === "flaps") {
      requestDrawCuts();
    }
  }

  function showIsolationRect() {
    hideIsolationRect();
    if (!isolation || !MapApp.map) {
      return;
    }
    isolationRect = L.rectangle(
      [[isolation.minY, isolation.minX], [isolation.maxY, isolation.maxX]],
      {
        color: "#5ba3e0",
        weight: 1.5,
        fillColor: "#5ba3e0",
        fillOpacity: 0.08,
        interactive: false,
        pane: "overlayPane",
      }
    );
    isolationRect.addTo(MapApp.map);
  }

  function hideIsolationRect() {
    if (isolationRect) {
      isolationRect.remove();
      isolationRect = null;
    }
  }

  function syncIsolationRect() {
    if (!isolation || !MapApp.map) {
      return;
    }
    if (!isolationRect) {
      showIsolationRect();
      return;
    }
    isolationRect.setBounds([
      [isolation.minY, isolation.minX],
      [isolation.maxY, isolation.maxX],
    ]);
  }

  function placingNow() {
    return !!(window.EditorTool && EditorTool.isPlacing && EditorTool.isPlacing());
  }

  function minEdgeSpanMap(axis) {
    if (!MapApp.map) {
      return 8;
    }
    var a = MapApp.map.containerPointToLatLng(L.point(0, 0));
    var b = MapApp.map.containerPointToLatLng(L.point(MIN_EDGE_SPAN_PX, MIN_EDGE_SPAN_PX));
    return axis === "x" ? Math.abs(b.lng - a.lng) : Math.abs(b.lat - a.lat);
  }

  function setIsolationEdge(edge, value) {
    if (!isolation || typeof value !== "number" || !isFinite(value)) {
      return;
    }
    var spanX = minEdgeSpanMap("x");
    var spanY = minEdgeSpanMap("y");
    if (edge === "minX") {
      isolation.minX = Math.min(value, isolation.maxX - spanX);
    } else if (edge === "maxX") {
      isolation.maxX = Math.max(value, isolation.minX + spanX);
    } else if (edge === "minY") {
      isolation.minY = Math.min(value, isolation.maxY - spanY);
    } else if (edge === "maxY") {
      isolation.maxY = Math.max(value, isolation.minY + spanY);
    }
  }

  function alongEdgeName(isA, visualEnd) {
    var flipped = isA ? flipA : flipB;
    if (isA) {
      if (visualEnd === "start") {
        return flipped ? "maxX" : "minX";
      }
      return flipped ? "minX" : "maxX";
    }
    if (visualEnd === "start") {
      return flipped ? "maxY" : "minY";
    }
    return flipped ? "minY" : "maxY";
  }

  function alongHandleLabel(isA, visualEnd) {
    var start = isA ? "A" : "B";
    var end = isA ? "A′" : "B′";
    var flipped = isA ? flipA : flipB;
    var name = visualEnd === "start"
      ? (flipped ? end : start)
      : (flipped ? start : end);
    return "Resize isolation " + name;
  }

  function mapEdgeLabel(edge) {
    if (edge === "minX") return "Resize isolation west edge";
    if (edge === "maxX") return "Resize isolation east edge";
    if (edge === "minY") return "Resize isolation north edge";
    return "Resize isolation south edge";
  }

  function ensureMapEdgeHandles() {
    if (mapEdgeEls) {
      return;
    }
    var wrap = UI.el("div", "heightMapEdges");
    mapEdgeEls = {
      wrap: wrap,
      minX: UI.el("div", "heightMapEdge heightMapEdgeX"),
      maxX: UI.el("div", "heightMapEdge heightMapEdgeX"),
      minY: UI.el("div", "heightMapEdge heightMapEdgeY"),
      maxY: UI.el("div", "heightMapEdge heightMapEdgeY"),
    };
    ["minX", "maxX", "minY", "maxY"].forEach(function(edge) {
      var el = mapEdgeEls[edge];
      el.setAttribute("aria-label", mapEdgeLabel(edge));
      el.title = mapEdgeLabel(edge);
      wrap.appendChild(el);
      bindMapEdgeHandle(el, edge);
    });
    host.appendChild(wrap);
    wrap.style.display = "none";
  }

  function positionEdgeHandles() {
    if (!mapEdgeEls) {
      return;
    }
    var showMap = !!(isolation && !placingNow());
    mapEdgeEls.wrap.style.display = showMap ? "block" : "none";
    if (cutA && cutA.alongStart) {
      var showAlong = !!isolation;
      cutA.alongStart.style.display = showAlong ? "block" : "none";
      cutA.alongEnd.style.display = showAlong ? "block" : "none";
      cutB.alongStart.style.display = showAlong ? "block" : "none";
      cutB.alongEnd.style.display = showAlong ? "block" : "none";
    }
    if (!isolation) {
      return;
    }
    if (showMap) {
      var box = boxScreenRect();
      if (!box || box.width < 4 || box.height < 4) {
        mapEdgeEls.wrap.style.display = "none";
      } else {
        var hit = EDGE_HIT_PX;
        var insetX = box.height >= hit * 3 ? hit : 0;
        var insetY = box.width >= hit * 3 ? hit : 0;
        placeMapEdge(mapEdgeEls.minX, box.left, box.top + insetX, hit, Math.max(4, box.height - insetX * 2));
        placeMapEdge(mapEdgeEls.maxX, box.left + box.width - hit, box.top + insetX, hit, Math.max(4, box.height - insetX * 2));
        placeMapEdge(mapEdgeEls.minY, box.left + insetY, box.top, Math.max(4, box.width - insetY * 2), hit);
        placeMapEdge(mapEdgeEls.maxY, box.left + insetY, box.top + box.height - hit, Math.max(4, box.width - insetY * 2), hit);
      }
    }
    positionAlongHandles();
  }

  function placeMapEdge(el, left, top, width, height) {
    el.style.left = left + "px";
    el.style.top = top + "px";
    el.style.width = width + "px";
    el.style.height = height + "px";
  }

  function positionAlongHandles() {
    if (!cutA || !cutA.alongStart || !isolation || !svgA) {
      return;
    }
    placeAlongPair(cutA, true);
    placeAlongPair(cutB, false);
  }

  function placeAlongPair(cut, isA) {
    var svg = isA ? svgA : svgB;
    var geom = stripGeom(svg, isA);
    var thickness = 16;
    var z0 = Math.min(geom.zHighPx, geom.zLowPx);
    var z1 = Math.max(geom.zHighPx, geom.zLowPx);
    cut.alongStart.setAttribute("aria-label", alongHandleLabel(isA, "start"));
    cut.alongEnd.setAttribute("aria-label", alongHandleLabel(isA, "end"));
    cut.alongStart.title = alongHandleLabel(isA, "start");
    cut.alongEnd.title = alongHandleLabel(isA, "end");
    if (geom.zIsVertical) {
      cut.alongStart.style.left = (geom.along0 - thickness / 2) + "px";
      cut.alongEnd.style.left = (geom.along1 - thickness / 2) + "px";
      cut.alongStart.style.top = z0 + "px";
      cut.alongEnd.style.top = z0 + "px";
      cut.alongStart.style.width = thickness + "px";
      cut.alongEnd.style.width = thickness + "px";
      cut.alongStart.style.height = Math.max(8, z1 - z0) + "px";
      cut.alongEnd.style.height = Math.max(8, z1 - z0) + "px";
    } else {
      cut.alongStart.style.top = (geom.along0 - thickness / 2) + "px";
      cut.alongEnd.style.top = (geom.along1 - thickness / 2) + "px";
      cut.alongStart.style.left = z0 + "px";
      cut.alongEnd.style.left = z0 + "px";
      cut.alongStart.style.height = thickness + "px";
      cut.alongEnd.style.height = thickness + "px";
      cut.alongStart.style.width = Math.max(8, z1 - z0) + "px";
      cut.alongEnd.style.width = Math.max(8, z1 - z0) + "px";
    }
  }

  function pxToAlongFrozen(drag, clientX, clientY) {
    var p = drag.zIsVertical ? (clientX - drag.svgLeft) : (clientY - drag.svgTop);
    var span = drag.along1 - drag.along0;
    if (span === 0) {
      return drag.alongMin;
    }
    var t = (p - drag.along0) / span;
    return drag.alongMin + t * (drag.alongMax - drag.alongMin);
  }

  function clientToIsolationValue(edge, ev) {
    if (!MapApp.map) {
      return null;
    }
    var latlng = MapApp.map.mouseEventToLatLng(ev);
    if (!latlng) {
      return null;
    }
    return (edge === "minX" || edge === "maxX") ? latlng.lng : latlng.lat;
  }

  function bindMapEdgeHandle(el, edge) {
    el.addEventListener("pointerdown", function(ev) {
      startEdgeDrag({ edge: edge, fromCut: false }, ev, el);
    });
    bindEdgePointer(el);
  }

  function bindAlongHandle(el, isA, visualEnd) {
    el.addEventListener("pointerdown", function(ev) {
      if (!isolation) {
        return;
      }
      var svg = isA ? svgA : svgB;
      var geom = stripGeom(svg, isA);
      var rect = svg.getBoundingClientRect();
      startEdgeDrag({
        edge: alongEdgeName(isA, visualEnd),
        fromCut: true,
        svg: svg,
        isA: isA,
        zIsVertical: geom.zIsVertical,
        along0: geom.along0,
        along1: geom.along1,
        alongMin: geom.alongMin,
        alongMax: geom.alongMax,
        svgLeft: rect.left,
        svgTop: rect.top,
      }, ev, el);
    });
    bindEdgePointer(el);
  }

  function bindEdgePointer(el) {
    el.addEventListener("pointermove", onEdgePointerMove);
    el.addEventListener("pointerup", onEdgePointerUp);
    el.addEventListener("pointercancel", onEdgePointerUp);
  }

  function startEdgeDrag(spec, ev, el) {
    if (!isolation || ev.button !== 0 || placingNow()) {
      return;
    }
    ev.preventDefault();
    ev.stopPropagation();
    el.setPointerCapture(ev.pointerId);
    edgeDrag = {
      edge: spec.edge,
      pointerId: ev.pointerId,
      fromCut: !!spec.fromCut,
      svg: spec.svg || null,
      isA: spec.isA,
      zIsVertical: spec.zIsVertical,
      along0: spec.along0,
      along1: spec.along1,
      alongMin: spec.alongMin,
      alongMax: spec.alongMax,
      svgLeft: spec.svgLeft,
      svgTop: spec.svgTop,
    };
    document.body.classList.add("height-view-edge-drag");
  }

  function onEdgePointerMove(ev) {
    if (!edgeDrag || ev.pointerId !== edgeDrag.pointerId || !isolation) {
      return;
    }
    var value;
    if (edgeDrag.fromCut) {
      value = pxToAlongFrozen(edgeDrag, ev.clientX, ev.clientY);
    } else {
      value = clientToIsolationValue(edgeDrag.edge, ev);
    }
    if (value == null || !isFinite(value)) {
      return;
    }
    setIsolationEdge(edgeDrag.edge, value);
    syncIsolationRect();
    positionChrome();
  }

  function onEdgePointerUp(ev) {
    if (!edgeDrag || ev.pointerId !== edgeDrag.pointerId) {
      return;
    }
    edgeDrag = null;
    document.body.classList.remove("height-view-edge-drag");
    if (!isolation) {
      return;
    }
    applyXyResize();
  }

  function applyXyResize() {
    var prevBand = { min: band.min, max: band.max };
    xyCacheValid = false;
    xyOccupants = collectXyOccupants();
    cacheExtents(xyOccupants);
    xyCacheValid = true;
    excludedOverlap = collectExcludedOverlap();
    cacheExtents(excludedOverlap);
    domain = computeDomain(xyOccupants);
    band.min = prevBand.min;
    band.max = prevBand.max;
    clampBandToCap();
    applyPeel();
    syncIsolationRect();
    positionChrome();
    requestDrawCuts();
  }

  function svgEl(name, attrs) {
    var el = document.createElementNS(SVG_NS, name);
    Object.keys(attrs).forEach(function(key) {
      el.setAttribute(key, attrs[key]);
    });
    return el;
  }

  function projectedWidthM(r, axis) {
    var half = r.bucket.footprintPixels;
    if (!half) {
      return DEFAULT_HEIGHT_M;
    }
    var yaw = 0;
    if (r.bucket.pointStride === 4 && r.bucket.points) {
      yaw = r.bucket.points[r.index * 4 + 2] || 0;
    }
    var w = half[0] * 2 * METERS_PER_MAP_PX;
    var d = half[1] * 2 * METERS_PER_MAP_PX;
    if (axis === "x") {
      return Math.abs(w * Math.cos(yaw)) + Math.abs(d * Math.sin(yaw));
    }
    return Math.abs(w * Math.sin(yaw)) + Math.abs(d * Math.cos(yaw));
  }

  function alongCenter(r, axis) {
    if (r.bucket.lines) {
      var line = r.bucket.lines[r.index];
      if (!line) {
        return 0;
      }
      var stride = r.bucket.pointStride;
      var sum = 0;
      var n = 0;
      for (var vi = 0; vi < line.length; vi += stride) {
        sum += axis === "x" ? line[vi] : line[vi + 1];
        n++;
      }
      return n ? sum / n : 0;
    }
    return axis === "x" ? r.x : r.y;
  }

  function depthT(r, axis) {
    var perp = axis === "x" ? r.y : r.x;
    var min = axis === "x" ? isolation.minY : isolation.minX;
    var max = axis === "x" ? isolation.maxY : isolation.maxX;
    var span = Math.max(1e-6, max - min);
    var t = (perp - min) / span;
    return Math.max(0, Math.min(1, t));
  }

  function stripGeom(svg, isA) {
    var w = svg.clientWidth || 1;
    var h = svg.clientHeight || 1;
    var pad = { start: 28, end: 18, z0: 10, z1: 10 };
    // Side panel and flaps both draw Z as the vertical axis. L-frame B
    // used a fold-out (Z horizontal); that layout is gone.
    var zIsVertical = true;
    var alongMin = isA ? isolation.minX : isolation.minY;
    var alongMax = isA ? isolation.maxX : isolation.maxY;
    var flipped = isA ? flipA : flipB;
    if (flipped) {
      var tmp = alongMin;
      alongMin = alongMax;
      alongMax = tmp;
    }
    var alongSpan = alongMax - alongMin;
    if (alongSpan === 0) {
      alongSpan = 1;
    }
    var zSpan = domain.max - domain.min;
    if (zSpan === 0) {
      zSpan = 1;
    }
    var along0 = pad.start;
    var along1 = (zIsVertical ? w : h) - pad.end;
    var zLowPx;
    var zHighPx;
    if (zIsVertical) {
      zHighPx = pad.z0;
      zLowPx = h - pad.z1;
    } else {
      zLowPx = pad.z0;
      zHighPx = w - pad.z1;
    }
    return {
      w: w,
      h: h,
      pad: pad,
      zIsVertical: zIsVertical,
      alongMin: alongMin,
      alongMax: alongMax,
      along0: along0,
      along1: along1,
      zLowPx: zLowPx,
      zHighPx: zHighPx,
      flipped: flipped,
      axis: isA ? "x" : "y",
    };
  }

  function alongToPx(geom, along) {
    var t = (along - geom.alongMin) / (geom.alongMax - geom.alongMin);
    return geom.along0 + t * (geom.along1 - geom.along0);
  }

  function zToPx(geom, z) {
    var t = (z - domain.min) / (domain.max - domain.min);
    return geom.zLowPx + t * (geom.zHighPx - geom.zLowPx);
  }

  function frontDepth(r, geom) {
    var t = depthT(r, geom.axis);
    return geom.flipped ? 1 - t : t;
  }

  function markBinKey(r, geom, excluded, included) {
    var alongM = alongCenter(r, geom.axis) * METERS_PER_MAP_PX;
    var ext = occupantZ(r);
    var zMid = (ext.min + ext.max) / 2;
    var alongBin = Math.round(alongM / ALONG_BIN_M);
    var zBin = Math.round(zMid / Z_BIN_M);
    var channel = excluded ? "x" : (included ? "i" : "f");
    return r.bucket.key + "|" + alongBin + "|" + zBin + "|" + channel;
  }

  function dedupeDrawList(drawList, geom) {
    var bins = new Map();
    for (var i = 0; i < drawList.length; i++) {
      var item = drawList[i];
      var key = markBinKey(item.r, geom, item.excluded, item.included);
      var prev = bins.get(key);
      if (!prev || frontDepth(item.r, geom) < frontDepth(prev.r, geom)) {
        bins.set(key, item);
      }
    }
    var unique = [];
    bins.forEach(function(item) {
      unique.push(item);
    });
    unique.sort(function(a, b) {
      return frontDepth(b.r, geom) - frontDepth(a.r, geom);
    });
    return unique;
  }

  function hexRgb(hex) {
    if (typeof hex === "string" && hex.charAt(0) === "#" && hex.length >= 7) {
      return [
        parseInt(hex.slice(1, 3), 16) / 255,
        parseInt(hex.slice(3, 5), 16) / 255,
        parseInt(hex.slice(5, 7), 16) / 255,
      ];
    }
    return [0.357, 0.639, 0.878];
  }

  function markLook(r, excluded, included, geom) {
    var depth = frontDepth(r, geom);
    var solidity = 0.35 + 0.65 * (1 - depth);
    var faded = !included && !excluded;
    var rgb = hexRgb(excluded ? "#e8b84a" : (r.bucket.color || "#5ba3e0"));
    var alpha = excluded ? 0.35 : (faded ? FADE_OPACITY * 0.45 : 0.45 * solidity);
    var missing = !r.bucket.lines && !!r._missingHeight;
    return { rgb: rgb, alpha: alpha, dash: (excluded || missing) ? 1 : 0 };
  }

  function growCutStream(stream, needFloats) {
    if (stream.data.length >= stream.n + needFloats) {
      return;
    }
    var next = new Float32Array(Math.max(stream.data.length * 2, stream.n + needFloats));
    next.set(stream.data);
    stream.data = next;
  }

  function pushCutCorner(stream, x, y, rgb, alpha, dash) {
    growCutStream(stream, 7);
    var d = stream.data;
    var i = stream.n;
    d[i] = x; d[i + 1] = y;
    d[i + 2] = rgb[0]; d[i + 3] = rgb[1]; d[i + 4] = rgb[2]; d[i + 5] = alpha;
    d[i + 6] = dash;
    stream.n = i + 7;
  }

  function pushCutQuad(stream, x0, y0, x1, y1, x2, y2, x3, y3, rgb, alpha, dash) {
    pushCutCorner(stream, x0, y0, rgb, alpha, dash);
    pushCutCorner(stream, x1, y1, rgb, alpha, dash);
    pushCutCorner(stream, x2, y2, rgb, alpha, dash);
    pushCutCorner(stream, x3, y3, rgb, alpha, dash);
    stream.quads++;
  }

  function pushAxisQuad(stream, x, y, rw, rh, rgb, alpha, dash) {
    pushCutQuad(stream, x, y, x + rw, y, x, y + rh, x + rw, y + rh, rgb, alpha, dash);
  }

  function appendRectMark(stream, hits, geom, r, excluded, included) {
    var cap = altitudeCap();
    var ext = occupantZ(r);
    if (ext.max < cap.min || ext.min > cap.max) {
      return;
    }
    var look = markLook(r, excluded, included, geom);
    var along = alongCenter(r, geom.axis);
    var widthM = projectedWidthM(r, geom.axis);
    var alongSpanM = Math.abs((geom.alongMax - geom.alongMin) * METERS_PER_MAP_PX) || 1;
    var alongPxSpan = Math.abs(geom.along1 - geom.along0);
    var widthPx = (widthM / alongSpanM) * alongPxSpan;
    var z0 = zToPx(geom, ext.min);
    var z1 = zToPx(geom, ext.max);
    var a0 = alongToPx(geom, along) - widthPx / 2;
    var x, y, rw, rh;
    if (geom.zIsVertical) {
      x = a0;
      y = Math.min(z0, z1);
      rw = Math.max(2, widthPx);
      rh = Math.max(2, Math.abs(z1 - z0));
    } else {
      x = Math.min(z0, z1);
      y = a0;
      rw = Math.max(2, Math.abs(z1 - z0));
      rh = Math.max(2, widthPx);
    }
    pushAxisQuad(stream, x, y, rw, rh, look.rgb, look.alpha, look.dash);
    var key = SelectionTool.recordKey(r);
    markRecords.set(key, r);
    hits.push({ key: key, r: r, x: x, y: y, w: rw, h: rh });
  }

  function appendLineMark(stream, hits, geom, r, excluded, included) {
    var cap = altitudeCap();
    var line = r.bucket.lines[r.index];
    if (!line) {
      return;
    }
    var look = markLook(r, excluded, included, geom);
    var stride = r.bucket.pointStride;
    var hw = excluded ? 0.7 : 1;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    var run = [];
    function pushPt(px, py) {
      run.push(px, py);
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
    function flushRun() {
      for (var i = 0; i + 3 < run.length; i += 2) {
        var x0 = run[i], y0 = run[i + 1], x1 = run[i + 2], y1 = run[i + 3];
        var dx = x1 - x0, dy = y1 - y0;
        var len = Math.hypot(dx, dy);
        if (len < 0.5) {
          continue;
        }
        var nx = -dy / len * hw, ny = dx / len * hw;
        pushCutQuad(
          stream,
          x0 + nx, y0 + ny,
          x1 + nx, y1 + ny,
          x0 - nx, y0 - ny,
          x1 - nx, y1 - ny,
          look.rgb, Math.min(1, look.alpha + 0.25), look.dash
        );
      }
      run = [];
    }
    for (var vi = 0; vi < line.length; vi += stride) {
      var lx = line[vi];
      var ly = line[vi + 1];
      var lz = line[vi + stride - 1];
      if (!inRect(lx, ly, isolation) || !inAltitude(lz, cap)) {
        flushRun();
        continue;
      }
      var along = geom.axis === "x" ? lx : ly;
      var ax = alongToPx(geom, along);
      var zp = zToPx(geom, lz);
      var px = geom.zIsVertical ? ax : zp;
      var py = geom.zIsVertical ? zp : ax;
      pushPt(px, py);
    }
    flushRun();
    if (!isFinite(minX)) {
      return;
    }
    var key = SelectionTool.recordKey(r);
    markRecords.set(key, r);
    hits.push({
      key: key, r: r,
      x: minX - 2, y: minY - 2,
      w: Math.max(4, maxX - minX + 4),
      h: Math.max(4, maxY - minY + 4),
    });
  }

  function buildCutStream(geom, unique) {
    var stream = { data: new Float32Array(256 * 28), n: 0, quads: 0 };
    var hits = [];
    for (var ui = 0; ui < unique.length; ui++) {
      var item = unique[ui];
      if (item.r.bucket.lines) {
        appendLineMark(stream, hits, geom, item.r, item.excluded, item.included);
      } else {
        appendRectMark(stream, hits, geom, item.r, item.excluded, item.included);
      }
    }
    return {
      vertices: stream.n ? stream.data.subarray(0, stream.n) : null,
      hits: hits,
    };
  }

  function glCutAvailable() {
    var layer = MapApp.layer;
    return !!(layer && layer._isWebGL && typeof layer.renderHeightCut === "function");
  }

  function uniqueDrawList(geom) {
    var faded = [];
    var inBand = [];
    for (var oi = 0; oi < xyOccupants.length; oi++) {
      var occ = xyOccupants[oi];
      occ._excluded = false;
      if (occ._inBand) {
        inBand.push(occ);
      } else {
        faded.push(occ);
      }
    }
    var drawList = [];
    for (var fi = 0; fi < faded.length; fi++) {
      drawList.push({ r: faded[fi], excluded: false, included: false });
    }
    for (var ei = 0; ei < excludedOverlap.length; ei++) {
      excludedOverlap[ei]._excluded = true;
      drawList.push({ r: excludedOverlap[ei], excluded: true, included: false });
    }
    for (var bi = 0; bi < inBand.length; bi++) {
      drawList.push({ r: inBand[bi], excluded: false, included: true });
    }
    return dedupeDrawList(drawList, geom);
  }

  function drawOneCut(svg, isA) {
    svg.textContent = "";
    if (!isolation) {
      return;
    }
    var geom = stripGeom(svg, isA);
    var frag = document.createDocumentFragment();
    frag.appendChild(svgEl("rect", {
      x: 0, y: 0, width: geom.w, height: geom.h, class: "heightCutBg",
    }));

    var ticks = 4;
    for (var i = 0; i <= ticks; i++) {
      var z = domain.min + (i / ticks) * (domain.max - domain.min);
      var p = zToPx(geom, z);
      if (geom.zIsVertical) {
        frag.appendChild(svgEl("line", {
          x1: geom.along0, y1: p, x2: geom.along1, y2: p, class: "heightCutGrid",
        }));
      } else {
        frag.appendChild(svgEl("line", {
          x1: p, y1: geom.along0, x2: p, y2: geom.along1, class: "heightCutGrid",
        }));
      }
    }

    var unique = uniqueDrawList(geom);
    var hits = [];
    var usedGl = false;
    if (glCutAvailable() && unique.length) {
      var packed = buildCutStream(geom, unique);
      hits = packed.hits;
      if (packed.vertices) {
        var url = MapApp.layer.renderHeightCut(geom.w, geom.h, packed.vertices);
        if (url) {
          var raster = svgEl("image", {
            x: 0,
            y: 0,
            width: geom.w,
            height: geom.h,
            class: "heightCutRaster",
            preserveAspectRatio: "none",
          });
          raster.setAttribute("href", url);
          raster.setAttributeNS("http://www.w3.org/1999/xlink", "href", url);
          frag.appendChild(raster);
          usedGl = true;
        }
      }
    }
    if (!usedGl) {
      hits = [];
      for (var ui = 0; ui < unique.length; ui++) {
        var item = unique[ui];
        drawMark(frag, geom, item.r, item.excluded, item.included);
      }
    }
    if (isA) {
      cutHitsA = hits;
    } else {
      cutHitsB = hits;
    }
    svg.appendChild(frag);
  }

  function drawMark(parent, geom, r, excluded, included) {
    var cap = altitudeCap();
    var ext = occupantZ(r);
    if (ext.max < cap.min || ext.min > cap.max) {
      return;
    }
    var axis = geom.axis;
    var key = SelectionTool.recordKey(r);
    var depth = depthT(r, axis);
    if (geom.flipped) {
      depth = 1 - depth;
    }
    var solidity = 0.35 + 0.65 * (1 - depth);
    var faded = !included && !excluded;
    var opacity = excluded ? 0.9 : (faded ? FADE_OPACITY : solidity);
    var color = excluded ? "#e8b84a" : (r.bucket.color || "#5ba3e0");
    var missing = !r.bucket.lines && !!r._missingHeight;
    var dashed = excluded || missing;

    if (r.bucket.lines) {
      var line = r.bucket.lines[r.index];
      if (!line) {
        return;
      }
      var stride = r.bucket.pointStride;
      var parts = [];
      for (var vi = 0; vi < line.length; vi += stride) {
        var lx = line[vi];
        var ly = line[vi + 1];
        var lz = line[vi + stride - 1];
        if (!inRect(lx, ly, isolation) || !inAltitude(lz, cap)) {
          if (parts.length) {
            parts.push("M");
          }
          continue;
        }
        var along = axis === "x" ? lx : ly;
        var ax = alongToPx(geom, along);
        var zp = zToPx(geom, lz);
        if (geom.zIsVertical) {
          parts.push((parts.length && parts[parts.length - 1] !== "M" ? "L" : "M") + ax + "," + zp);
        } else {
          parts.push((parts.length && parts[parts.length - 1] !== "M" ? "L" : "M") + zp + "," + ax);
        }
      }
      var d = parts.filter(function(p) { return p !== "M"; }).join(" ");
      if (!d) {
        return;
      }
      var path = svgEl("path", {
        d: d,
        fill: "none",
        stroke: color,
        "stroke-width": excluded ? 1.4 : 2,
        "stroke-dasharray": excluded ? "4 3" : "none",
        opacity: String(opacity),
        class: "heightCutMark",
        "data-key": key,
      });
      parent.appendChild(path);
      markRecords.set(key, r);
      return;
    }

    var along = alongCenter(r, axis);
    var widthM = projectedWidthM(r, axis);
    var alongSpanM = Math.abs((geom.alongMax - geom.alongMin) * METERS_PER_MAP_PX) || 1;
    var alongPxSpan = Math.abs(geom.along1 - geom.along0);
    var widthPx = (widthM / alongSpanM) * alongPxSpan;
    var z0 = zToPx(geom, ext.min);
    var z1 = zToPx(geom, ext.max);
    var a0 = alongToPx(geom, along) - widthPx / 2;
    var x, y, rw, rh;
    if (geom.zIsVertical) {
      x = a0;
      y = Math.min(z0, z1);
      rw = Math.max(2, widthPx);
      rh = Math.max(2, Math.abs(z1 - z0));
    } else {
      x = Math.min(z0, z1);
      y = a0;
      rw = Math.max(2, Math.abs(z1 - z0));
      rh = Math.max(2, widthPx);
    }
    var rect = svgEl("rect", {
      x: x,
      y: y,
      width: rw,
      height: rh,
      fill: color,
      "fill-opacity": excluded ? "0.08" : (faded ? "0.12" : "0.45"),
      stroke: color,
      "stroke-width": "1.2",
      "stroke-dasharray": dashed ? "4 3" : "none",
      opacity: String(opacity),
      class: "heightCutMark",
      "data-key": key,
    });
    parent.appendChild(rect);
    markRecords.set(key, r);
  }

  function collectExcludedOverlap() {
    if (!isolation || !MapApp.layer) {
      return [];
    }
    var cap = altitudeCap();
    var inSet = new Set();
    for (var oi = 0; oi < xyOccupants.length; oi++) {
      inSet.add(SelectionTool.recordKey(xyOccupants[oi]));
    }
    var out = [];
    var collectGrid = MapApp.collectGridIndices;
    MapApp.layer.buckets.forEach(function(bucket) {
      if (!bucket.visible || bucket.excludeFromSelection) {
        return;
      }
      if (bucket.renderType === "line") {
        if (!bucket.lines) {
          return;
        }
        var stride = bucket.pointStride;
        var lineBounds = bucket._lineBounds;
        var pad = bucket.maxFootprintRadius || 0;
        var qMinX = isolation.minX - pad;
        var qMaxX = isolation.maxX + pad;
        var qMinY = isolation.minY - pad;
        var qMaxY = isolation.maxY + pad;
        for (var li = 0; li < bucket.lines.length; li++) {
          var key = bucket.key + "#" + li;
          if (inSet.has(key)) {
            continue;
          }
          var lb = lineBounds && lineBounds[li];
          if (lb && (lb.maxX < qMinX || lb.minX > qMaxX || lb.maxY < qMinY || lb.minY > qMaxY)) {
            continue;
          }
          var line = bucket.lines[li];
          var crosses = false;
          for (var vi = 0; vi < line.length; vi += stride) {
            var lx = line[vi];
            var ly = line[vi + 1];
            var lz = line[vi + stride - 1];
            if (!inAltitude(lz, cap)) {
              continue;
            }
            if (lx >= qMinX && lx <= qMaxX && ly >= qMinY && ly <= qMaxY) {
              crosses = true;
              break;
            }
          }
          if (crosses) {
            out.push({
              bucket: bucket,
              index: li,
              id: bucket.ids ? bucket.ids[li] : null,
              x: line[0],
              y: line[1],
            });
          }
        }
        return;
      }
      if (!bucket.points) {
        return;
      }
      var pStride = bucket.pointStride;
      var half = bucket.footprintPixels;
      var hx = half ? half[0] : 0;
      var hy = half ? half[1] : 0;
      var pts = bucket.points;
      function considerPoint(idx, x, y, z) {
        var pKey = bucket.key + "#" + idx;
        if (inSet.has(pKey)) {
          return;
        }
        if (!inAltitude(z, cap)) {
          return;
        }
        if (inRect(x, y, isolation)) {
          return;
        }
        var overlaps = x + hx >= isolation.minX && x - hx <= isolation.maxX
          && y + hy >= isolation.minY && y - hy <= isolation.maxY;
        if (overlaps) {
          out.push({
            bucket: bucket,
            index: idx,
            id: bucket.ids ? bucket.ids[idx] : null,
            x: x,
            y: y,
          });
        }
      }
      if (bucket._grid && collectGrid) {
        var indices = collectGrid(
          bucket._grid,
          isolation.minX - hx, isolation.maxX + hx,
          isolation.minY - hy, isolation.maxY + hy,
          gridScratch
        );
        for (var k = 0; k < indices.length; k++) {
          var idx = indices[k];
          var off = idx * pStride;
          considerPoint(idx, pts[off], pts[off + 1], pts[off + pStride - 1]);
        }
        return;
      }
      for (var i = 0; i < pts.length; i += pStride) {
        considerPoint(i / pStride, pts[i], pts[i + 1], pts[i + pStride - 1]);
      }
    });
    return out;
  }

  function positionBandEl(bandEl, isA) {
    var svg = isA ? svgA : svgB;
    var geom = stripGeom(svg, isA);
    var z0 = zToPx(geom, band.min);
    var z1 = zToPx(geom, band.max);
    var lo = Math.min(z0, z1);
    var hi = Math.max(z0, z1);
    if (geom.zIsVertical) {
      bandEl.style.left = geom.along0 + "px";
      bandEl.style.width = Math.max(8, geom.along1 - geom.along0) + "px";
      bandEl.style.top = lo + "px";
      bandEl.style.height = Math.max(6, hi - lo) + "px";
      bandEl.style.right = "auto";
      bandEl.style.bottom = "auto";
      bandEl.classList.toggle("is-vertical-z", true);
    } else {
      bandEl.style.top = geom.along0 + "px";
      bandEl.style.height = Math.max(8, geom.along1 - geom.along0) + "px";
      bandEl.style.left = lo + "px";
      bandEl.style.width = Math.max(6, hi - lo) + "px";
      bandEl.style.right = "auto";
      bandEl.style.bottom = "auto";
      bandEl.classList.toggle("is-vertical-z", false);
    }
  }

  function requestDrawCuts() {
    if (cutsDrawQueued) {
      return;
    }
    cutsDrawQueued = true;
    requestAnimationFrame(function() {
      cutsDrawQueued = false;
      drawCuts();
    });
  }

  function drawCuts() {
    if (!isolation || !svgA) {
      return;
    }
    markRecords = new Map();
    cutHitsA = [];
    cutHitsB = [];
    if (cutA.startBtn) {
      cutA.startBtn.querySelector("span").textContent = flipA ? "A′" : "A";
      cutA.endBtn.querySelector("span").textContent = flipA ? "A" : "A′";
      cutB.startBtn.querySelector("span").textContent = flipB ? "B′" : "B";
      cutB.endBtn.querySelector("span").textContent = flipB ? "B" : "B′";
    }
    drawOneCut(svgA, true);
    drawOneCut(svgB, false);
    positionBandEl(bandA, true);
    positionBandEl(bandB, false);
    positionAlongHandles();
    lastCutSizeA = (svgA.clientWidth || 0) * 65536 + (svgA.clientHeight || 0);
    lastCutSizeB = (svgB.clientWidth || 0) * 65536 + (svgB.clientHeight || 0);
  }

  function hitCutRecord(svg, clientX, clientY) {
    var hits = svg === svgA ? cutHitsA : cutHitsB;
    if (hits && hits.length) {
      var rect = svg.getBoundingClientRect();
      var x = clientX - rect.left;
      var y = clientY - rect.top;
      for (var i = hits.length - 1; i >= 0; i--) {
        var hit = hits[i];
        if (x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h) {
          return hit.r || null;
        }
      }
      return null;
    }
    var node = document.elementFromPoint(clientX, clientY);
    while (node && node !== svg) {
      if (node.getAttribute) {
        var key = node.getAttribute("data-key");
        if (key) {
          return markRecords.get(key) || null;
        }
      }
      node = node.parentNode;
    }
    return null;
  }

  function formatStripYawDeg(r, isA) {
    if (!r || r.bucket.lines || r.bucket.pointStride !== 4 || !r.bucket.points) {
      return null;
    }
    var yaw = r.bucket.points[r.index * 4 + 2] || 0;
    var geom = stripGeom(isA ? svgA : svgB, isA);
    var rel = geom.axis === "x" ? yaw : yaw - Math.PI / 2;
    if (geom.flipped) {
      rel += Math.PI;
    }
    var deg = rel * 180 / Math.PI;
    deg = ((deg + 180) % 360 + 360) % 360 - 180;
    var rounded = Math.round(deg);
    if (rounded === -180) {
      rounded = 180;
    }
    return (rounded > 0 ? "+" : "") + rounded + "\u00b0";
  }

  function bindCutHover(svg, strip, isA) {
    var yawEl = UI.el("div", "heightCutYaw");
    yawEl.setAttribute("hidden", "");
    yawEl.setAttribute("aria-hidden", "true");
    strip.appendChild(yawEl);

    function hideYaw() {
      yawEl.setAttribute("hidden", "");
      yawEl.textContent = "";
    }

    function onMove(e) {
      if (!isolation || edgeDrag) {
        hideYaw();
        return;
      }
      if (e.target.closest(".heightCutHandle")
          || e.target.closest(".heightCutAlong")
          || e.target.closest(".heightCutLabel")) {
        hideYaw();
        return;
      }
      var r = hitCutRecord(svg, e.clientX, e.clientY);
      var text = formatStripYawDeg(r, isA);
      if (!text) {
        hideYaw();
        return;
      }
      yawEl.textContent = text;
      yawEl.removeAttribute("hidden");
      var rect = strip.getBoundingClientRect();
      var x = e.clientX - rect.left + 12;
      var y = e.clientY - rect.top + 12;
      var maxX = Math.max(8, rect.width - 56);
      var maxY = Math.max(8, rect.height - 28);
      yawEl.style.left = Math.max(8, Math.min(maxX, x)) + "px";
      yawEl.style.top = Math.max(8, Math.min(maxY, y)) + "px";
    }

    strip.addEventListener("pointermove", onMove);
    strip.addEventListener("pointerleave", function(e) {
      if (!strip.contains(e.relatedTarget)) {
        hideYaw();
      }
    });
  }

  function onCutClick(svg, clientX, clientY) {
    var r = hitCutRecord(svg, clientX, clientY);
    if (!r || !SelectionTool.toggleRecord) {
      return;
    }
    SelectionTool.toggleRecord(r);
  }

  function pxToZ(svg, isA, clientX, clientY) {
    var geom = stripGeom(svg, isA);
    var rect = svg.getBoundingClientRect();
    var p = geom.zIsVertical ? (clientY - rect.top) : (clientX - rect.left);
    var t = (p - geom.zLowPx) / (geom.zHighPx - geom.zLowPx);
    return domain.min + t * (domain.max - domain.min);
  }

  function bindBand(strip, bandEl, handleMin, handleMax, isA) {
    var drag = null;

    function startDrag(kind, ev) {
      if (!isolation) {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      bandEl.setPointerCapture(ev.pointerId);
      drag = {
        kind: kind,
        pointerId: ev.pointerId,
        startZ: pxToZ(isA ? svgA : svgB, isA, ev.clientX, ev.clientY),
        bandMin: band.min,
        bandMax: band.max,
      };
    }

    handleMin.addEventListener("pointerdown", function(ev) { startDrag("min", ev); });
    handleMax.addEventListener("pointerdown", function(ev) { startDrag("max", ev); });
    bandEl.addEventListener("pointerdown", function(ev) {
      if (ev.target.closest(".heightCutHandleMax")) {
        startDrag("max", ev);
        return;
      }
      if (ev.target.closest(".heightCutHandleMin")) {
        startDrag("min", ev);
        return;
      }
      // The 8px bars are easy to miss; treat the band's max/min edge as
      // a resize, not a translate. Upper (visual top / high Z) must not
      // drag the floor along as a block.
      var kind = "body";
      var rect = bandEl.getBoundingClientRect();
      var edge = 16;
      if (bandEl.classList.contains("is-vertical-z")) {
        if (ev.clientY <= rect.top + edge) {
          kind = "max";
        } else if (ev.clientY >= rect.bottom - edge) {
          kind = "min";
        }
      } else if (ev.clientX >= rect.right - edge) {
        kind = "max";
      } else if (ev.clientX <= rect.left + edge) {
        kind = "min";
      }
      startDrag(kind, ev);
    });

    bandEl.addEventListener("pointermove", function(ev) {
      if (!drag || ev.pointerId !== drag.pointerId) {
        return;
      }
      var z = pxToZ(isA ? svgA : svgB, isA, ev.clientX, ev.clientY);
      var dz = z - drag.startZ;
      if (drag.kind === "body") {
        var span = drag.bandMax - drag.bandMin;
        var nextMin = drag.bandMin + dz;
        var nextMax = drag.bandMax + dz;
        if (nextMin < domain.min) {
          nextMin = domain.min;
          nextMax = nextMin + span;
        }
        if (nextMax > domain.max) {
          nextMax = domain.max;
          nextMin = nextMax - span;
        }
        band.min = nextMin;
        band.max = nextMax;
      } else if (drag.kind === "min") {
        band.min = Math.min(drag.bandMax, Math.max(domain.min, drag.bandMin + dz));
      } else {
        band.max = Math.max(drag.bandMin, Math.min(domain.max, drag.bandMax + dz));
      }
      clampBandToCap();
      // Band chrome follows the pointer; occupancy, SVG marks, and
      // Selection wait for pointerup — live peel is unusable on large builds.
      if (bandA) {
        positionBandEl(bandA, true);
      }
      if (bandB) {
        positionBandEl(bandB, false);
      }
    });

    function endDrag(ev) {
      if (!drag || ev.pointerId !== drag.pointerId) {
        return;
      }
      drag = null;
      bandJustDragged = true;
      setTimeout(function() { bandJustDragged = false; }, 0);
      applyPeel();
      requestDrawCuts();
    }
    bandEl.addEventListener("pointerup", endDrag);
    bandEl.addEventListener("pointercancel", endDrag);
  }

  function openChrome() {
    ensureChrome();
    host.removeAttribute("hidden");
    setLayout(layout);
    bindMapEvents();
    showIsolationRect();
  }

  function closeChrome() {
    host.style.display = "none";
    host.setAttribute("hidden", "");
    hideIsolationRect();
    unbindMapEvents();
    isolation = null;
    xyOccupants = [];
    cubeOccupants = [];
    cubeKeys.clear();
    subtractIds = new Set();
    excludedOverlap = [];
    xyCacheValid = false;
    lastCutSizeA = 0;
    lastCutSizeB = 0;
    cutHitsA = [];
    cutHitsB = [];
    edgeDrag = null;
    document.body.classList.remove("height-view-edge-drag");
    if (mapEdgeEls) {
      mapEdgeEls.wrap.style.display = "none";
    }
    syncLayoutClass();
  }

  HeightView.commitRectangle = function(bounds) {
    isolation = {
      minX: bounds.minX,
      maxX: bounds.maxX,
      minY: bounds.minY,
      maxY: bounds.maxY,
    };
    flipA = false;
    flipB = false;
    subtractIds = new Set();
    xyOccupants = collectXyOccupants();
    cacheExtents(xyOccupants);
    xyCacheValid = true;
    excludedOverlap = collectExcludedOverlap();
    cacheExtents(excludedOverlap);
    domain = computeDomain(xyOccupants);
    var span = occupantSpan(xyOccupants);
    band = { min: span.min, max: span.max };
    clampBandToCap();
    openChrome();
    applyPeel();
    positionChrome();
    positionEdgeHandles();
    requestDrawCuts();
  };

  HeightView.dismiss = function() {
    closeChrome();
  };

  HeightView.onAltitudeChanged = function() {
    if (!isolation) {
      return;
    }
    var prevBand = { min: band.min, max: band.max };
    xyCacheValid = false;
    xyOccupants = collectXyOccupants();
    cacheExtents(xyOccupants);
    xyCacheValid = true;
    excludedOverlap = collectExcludedOverlap();
    cacheExtents(excludedOverlap);
    domain = computeDomain(xyOccupants);
    band.min = prevBand.min;
    band.max = prevBand.max;
    clampBandToCap();
    applyPeel();
    requestDrawCuts();
  };

  HeightView.onFiltersChanged = function() {
    HeightView.onAltitudeChanged();
  };

  HeightView.onPlacementChanged = function() {
    if (isolation) {
      positionEdgeHandles();
    }
  };

  window.addEventListener("resize", function() {
    if (isolation) {
      positionChrome();
      requestDrawCuts();
    }
  });
})();
