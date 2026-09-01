// Height view: 2.5D Cuts on the current map tab after a committed XY
// rectangle. Occupants are today's Selection (collectInBox ∩ altitude rail
// ∩ Cut band). Chrome is a docked side panel (A–A′ top half, B–B′ bottom
// half) with a session switch to flaps. L-frame overlay was dropped after
// the walking skeleton: edge gutters stay too thin to read Z. Cut marks
// are projected AABB in SVG — no second canvas, no 3D.
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
  var DEFAULT_HEIGHT_M = 4;
  var PAD_RATIO = 0.2;
  var PAD_MIN_M = 4;
  var PAD_MAX_M = 50;
  var FADE_OPACITY = 0.28;

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
  var subtractIds = new Set();
  var isolationRect = null;
  var mapEventsBound = false;
  var markRecords = new Map();
  var excludedOverlap = [];
  var resizeObserver = null;

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
        return { min: 0, max: DEFAULT_HEIGHT_M };
      }
      return { min: z0, max: z1 };
    }
    var z = recordZ(r);
    if (typeof z !== "number" || !isFinite(z)) {
      return { min: 0, max: DEFAULT_HEIGHT_M };
    }
    return { min: z, max: z + DEFAULT_HEIGHT_M };
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

  function paddedDomain(zMin, zMax) {
    var span = zMax - zMin;
    var pad = Math.min(PAD_MAX_M, Math.max(PAD_MIN_M, span * PAD_RATIO));
    return { min: zMin - pad, max: zMax + pad };
  }

  function computeDomain(occupants) {
    var zMin = Infinity;
    var zMax = -Infinity;
    occupants.forEach(function(r) {
      var ext = zExtent(r);
      if (!isFinite(ext.min) || !isFinite(ext.max)) {
        return;
      }
      if (ext.min < zMin) zMin = ext.min;
      if (ext.max > zMax) zMax = ext.max;
    });
    if (zMin > zMax) {
      // Empty volume: a readable local scale, never the altitude rail.
      return paddedDomain(0, DEFAULT_HEIGHT_M);
    }
    return paddedDomain(zMin, zMax);
  }

  function occupantSpan(occupants) {
    var zMin = Infinity;
    var zMax = -Infinity;
    occupants.forEach(function(r) {
      var ext = zExtent(r);
      if (!isFinite(ext.min) || !isFinite(ext.max)) {
        return;
      }
      if (ext.min < zMin) zMin = ext.min;
      if (ext.max > zMax) zMax = ext.max;
    });
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
    xyOccupants = collectXyOccupants();
    cubeOccupants = xyOccupants.filter(recordInBand);
    var inCube = new Set();
    cubeOccupants.forEach(function(r) {
      inCube.add(actorId(r));
    });
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
    return cubeOccupants.some(function(o) {
      return SelectionTool.recordKey(o) === SelectionTool.recordKey(r);
    });
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

    resizeObserver = new ResizeObserver(function() {
      if (isolation) {
        drawCuts();
      }
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

    strip.appendChild(svg);
    strip.appendChild(bandEl);
    strip.appendChild(startBtn);
    strip.appendChild(endBtn);

    bindBand(strip, bandEl, handleMin, handleMax, startName === "A");
    svg.addEventListener("click", onCutClick);

    return { strip: strip, svg: svg, band: bandEl, startBtn: startBtn, endBtn: endBtn };
  }

  function flipStrip(which) {
    if (which === "A") {
      flipA = !flipA;
    } else {
      flipB = !flipB;
    }
    drawCuts();
  }

  function setLayout(next) {
    layout = next;
    syncLayoutClass();
    applyHostDisplay();
    layoutSideBtn.classList.toggle("active", layout === "side");
    layoutFlapsBtn.classList.toggle("active", layout === "flaps");
    positionChrome();
    requestAnimationFrame(function() {
      drawCuts();
    });
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
      return;
    }
    var box = boxScreenRect();
    if (!box) {
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
    MapApp.map.on("move zoom resize", onMapViewChanged);
    mapEventsBound = true;
  }

  function unbindMapEvents() {
    if (!mapEventsBound || !MapApp.map) {
      return;
    }
    MapApp.map.off("move zoom resize", onMapViewChanged);
    mapEventsBound = false;
  }

  function onMapViewChanged() {
    positionChrome();
    if (layout === "flaps") {
      drawCuts();
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

  function drawOneCut(svg, isA) {
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }
    if (!isolation) {
      return;
    }
    var geom = stripGeom(svg, isA);
    svg.appendChild(svgEl("rect", {
      x: 0, y: 0, width: geom.w, height: geom.h, class: "heightCutBg",
    }));

    var ticks = 4;
    for (var i = 0; i <= ticks; i++) {
      var z = domain.min + (i / ticks) * (domain.max - domain.min);
      var p = zToPx(geom, z);
      if (geom.zIsVertical) {
        svg.appendChild(svgEl("line", {
          x1: geom.along0, y1: p, x2: geom.along1, y2: p, class: "heightCutGrid",
        }));
      } else {
        svg.appendChild(svgEl("line", {
          x1: p, y1: geom.along0, x2: p, y2: geom.along1, class: "heightCutGrid",
        }));
      }
    }

    var axis = geom.axis;
    var faded = [];
    var inBand = [];
    xyOccupants.forEach(function(r) {
      if (recordInBand(r)) {
        inBand.push(r);
      } else {
        faded.push(r);
      }
    });
    var excluded = excludedOverlap;
    var drawList = faded.concat(excluded.map(function(r) {
      r._excluded = true;
      return r;
    })).concat(inBand);

    drawList.sort(function(a, b) {
      var da = depthT(a, axis);
      var db = depthT(b, axis);
      if (geom.flipped) {
        return da - db;
      }
      return db - da;
    });

    drawList.forEach(function(r) {
      drawMark(svg, geom, r, !!r._excluded, recordInBand(r));
    });
  }

  function drawMark(svg, geom, r, excluded, included) {
    var cap = altitudeCap();
    var ext = zExtent(r);
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
    // Table height is not on the payload yet; 19's missing-height mark is
    // a 4 m dashed AABB. Excluded overlap is yellow dashed for the same reason.
    var dashed = true;

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
      svg.appendChild(path);
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
    svg.appendChild(rect);
    markRecords.set(key, r);
  }

  function collectExcludedOverlap() {
    if (!isolation || !MapApp.layer) {
      return [];
    }
    var cap = altitudeCap();
    var inSet = new Set();
    xyOccupants.forEach(function(r) {
      inSet.add(SelectionTool.recordKey(r));
    });
    var out = [];
    MapApp.layer.buckets.forEach(function(bucket) {
      if (!bucket.visible || bucket.excludeFromSelection) {
        return;
      }
      if (bucket.renderType === "line") {
        if (!bucket.lines) {
          return;
        }
        var stride = bucket.pointStride;
        for (var li = 0; li < bucket.lines.length; li++) {
          var key = bucket.key + "#" + li;
          if (inSet.has(key)) {
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
            var pad = bucket.maxFootprintRadius || 0;
            if (lx >= isolation.minX - pad && lx <= isolation.maxX + pad
                && ly >= isolation.minY - pad && ly <= isolation.maxY + pad) {
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
      for (var i = 0; i < pts.length; i += pStride) {
        var idx = i / pStride;
        var key = bucket.key + "#" + idx;
        if (inSet.has(key)) {
          continue;
        }
        var x = pts[i];
        var y = pts[i + 1];
        var z = pts[i + pStride - 1];
        if (!inAltitude(z, cap)) {
          continue;
        }
        if (inRect(x, y, isolation)) {
          continue;
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

  function drawCuts() {
    if (!isolation || !svgA) {
      return;
    }
    markRecords = new Map();
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
  }

  function onCutClick(e) {
    var node = e.target;
    if (!node || !node.getAttribute) {
      return;
    }
    var key = node.getAttribute("data-key");
    if (!key) {
      return;
    }
    var r = markRecords.get(key);
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
      if (ev.target === handleMin || ev.target === handleMax) {
        return;
      }
      startDrag("body", ev);
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
      applyPeel();
      drawCuts();
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
    subtractIds = new Set();
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
    excludedOverlap = collectExcludedOverlap();
    domain = computeDomain(xyOccupants);
    var span = occupantSpan(xyOccupants);
    band = { min: span.min, max: span.max };
    clampBandToCap();
    openChrome();
    applyPeel();
    positionChrome();
    drawCuts();
  };

  HeightView.dismiss = function() {
    closeChrome();
  };

  HeightView.onAltitudeChanged = function() {
    if (!isolation) {
      return;
    }
    var prevBand = { min: band.min, max: band.max };
    xyOccupants = collectXyOccupants();
    excludedOverlap = collectExcludedOverlap();
    domain = computeDomain(xyOccupants);
    band.min = prevBand.min;
    band.max = prevBand.max;
    clampBandToCap();
    applyPeel();
    drawCuts();
  };

  HeightView.onFiltersChanged = function() {
    HeightView.onAltitudeChanged();
  };

  window.addEventListener("resize", function() {
    if (isolation) {
      positionChrome();
      drawCuts();
    }
  });
})();
