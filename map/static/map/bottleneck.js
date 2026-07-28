// Map markers for a conveyor line's or pipe network's speed bottleneck.
// When a hovered belt/lift/pipe/pump's /api/instance detail reports a
// mixed-mark line or network (see the rust core's flow_bottleneck), the
// tooltip's warning section (tooltip.js's bottleneckSection) offers a "Show on
// map" button that lands here: the whole run is retraced in amber with its
// limiting segments in red, a warning pin drops on each of those, and the view
// jumps to frame the line. Nothing else is hidden -- unlike finditem.js's
// highlight -- since the surrounding factory is exactly the context needed to
// recognize which belt that is.
//
// Three things conspired to make the old lone-warning-pin version hard to
// read, and each is handled below:
//   - the limiting belt is very often on a different floor from the segment
//     being inspected, so the altitude filter simply hid it. The filter is
//     widened to cover the line (and put back on clear).
//   - a pin on a segment's ORIGIN sits on the joint it shares with its
//     neighbour, so "which of these two belts?" was a coin flip. Pins land at
//     the middle of the segment's own spline instead.
//   - a marker with no line under it says "something around here is slow"
//     without ever showing what the line even is. The full run is traced, as
//     a canvas overlay (MapApp.setLineOverlays) rather than a real line
//     bucket -- see _drawLineOverlays for why a bucket is the wrong tool.
//
// Only one bottleneck's markers exist at a time; showing another line's
// replaces them. A save reload drops the pin bucket wholesale along with every
// other one (Filters.build clears and rebuilds all buckets, and calls clear()
// here so the widened altitude window is handed back), which is why
// isShowing() asks the live bucket list instead of keeping a flag that a
// reload would silently invalidate.

var Bottleneck = {};

(function() {
  "use strict";

  var PIN_BUCKET_KEY = "belt-bottleneck-highlight";

  var WARNING_COLOR = "#ffb020";
  // The limiting segments' own color: red reads as "this is the problem" at a
  // glance, against the amber of the line it is holding back.
  var LIMITING_COLOR = "#ff2d55";
  // Thick enough to stand out of a dense bundle of same-colored neighbours --
  // these are drawn on top of the real belt/pipe buckets, not instead of them.
  var LINE_WIDTH = 5;
  var LIMITING_LINE_WIDTH = 7;

  // Inline SVG warning-triangle silhouette -- same reasoning as finditem.js's
  // magnifying glass: a one-off marker doesn't warrant a real image asset.
  var WARNING_ICON_URL = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32">' +
    '<path d="M16 4 L29 27 L3 27 Z" fill="none" stroke="' + LIMITING_COLOR + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<line x1="16" y1="12" x2="16" y2="20" stroke="' + LIMITING_COLOR + '" stroke-width="3.5" stroke-linecap="round"/>' +
    '<circle cx="16" cy="24" r="1.8" fill="' + LIMITING_COLOR + '"/>' +
    '</svg>'
  );

  // Identity of the bottleneck currently marked, so a pinned tooltip's
  // toggle button can tell "my markers are up" from "some other line's
  // markers are up" (a stable per-line stand-in: the first limiting
  // segment's instanceName).
  var shownKey = null;
  // The altitude window that was in effect before showing widened it, if it
  // did (see Altitude.ensureRangeCovers) -- restored on clear.
  var restoreAltitudeRange = null;

  function bottleneckKey(bottleneck) {
    return bottleneck.limitingSegments && bottleneck.limitingSegments.length > 0
      ? bottleneck.limitingSegments[0].instanceName : null;
  }

  function bucketExists() {
    return !!(window.MapApp && MapApp.layer && MapApp.layer.buckets.some(function(b) {
      return b.key === PIN_BUCKET_KEY;
    }));
  }

  Bottleneck.isShowing = function(bottleneck) {
    return bucketExists() && shownKey !== null && shownKey === bottleneckKey(bottleneck);
  };

  Bottleneck.clear = function() {
    shownKey = null;
    var had = bucketExists();
    if (window.MapApp) {
      MapApp.setLineOverlays(null);
      if (MapApp.layer) {
        MapApp.layer.removeBucketByKey(PIN_BUCKET_KEY);
      }
    }
    if (restoreAltitudeRange && window.Altitude) {
      Altitude.restoreRange(restoreAltitudeRange);
    }
    restoreAltitudeRange = null;
    if (had && window.MapApp && MapApp.layer) {
      MapApp.layer.requestRedraw();
    }
  };

  // The geometry of the line's own members, pulled out of the buckets that
  // already have them plotted. Belts and pipes are line buckets keyed by
  // instanceName (see filters.js's beltPipeRow); a conveyor LIFT is not a
  // spline at all -- it's a vertical structure the parser emits as an
  // ordinary building box (see the rust core's conveyor_belt_only_type_paths)
  // -- so it comes back as a box to outline instead, which matters because a
  // Mk.1 lift in a Mk.5 run is a textbook bottleneck.
  //
  // One walk over the buckets testing membership beats building a name ->
  // geometry map over every belt in the save to look up a few dozen of them.
  function collectSegmentGeometry(allSegments) {
    var limitingNames = {};
    var wanted = Object.create(null);
    allSegments.forEach(function(seg) {
      wanted[seg.instanceName] = true;
      if (seg.isLimiting) {
        limitingNames[seg.instanceName] = true;
      }
    });
    var found = Object.create(null); // instanceName -> {polyline} | {box}
    MapApp.layer.buckets.forEach(function(bucket) {
      var isLine = bucket.renderType === "line" && bucket.lines;
      var isBox = bucket.renderType === "rect" && bucket.points;
      if ((!isLine && !isBox) || !bucket.ids) {
        return;
      }
      for (var i = 0; i < bucket.ids.length; i++) {
        if (wanted[bucket.ids[i]] && !found[bucket.ids[i]]) {
          found[bucket.ids[i]] = isLine
            ? { polyline: { points: bucket.lines[i], stride: bucket.pointStride } }
            : { box: { bucket: bucket, index: i } };
        }
      }
    });
    var result = {
      line: { polylines: [], boxes: [] },
      limiting: { polylines: [], boxes: [] },
      byInstance: found,
    };
    Object.keys(found).forEach(function(name) {
      var into = limitingNames[name] ? result.limiting : result.line;
      if (found[name].polyline) {
        into.polylines.push(found[name].polyline);
      } else {
        into.boxes.push(found[name].box);
      }
    });
    return result;
  }

  // The [x, y, z] halfway along a polyline BY LENGTH -- where a warning pin
  // should sit so it unambiguously belongs to this segment and not to either
  // neighbour it shares an endpoint with. Measured on the straight chords
  // between spline vertices: on the scale a pin is read at, the difference
  // from true arc length along the curve is invisible.
  function polylineMidpoint(polyline) {
    var pts = polyline.points;
    var stride = polyline.stride;
    var altIdx = stride - 1;
    var vertexCount = Math.floor(pts.length / stride);
    if (vertexCount === 0) {
      return null;
    }
    if (vertexCount === 1) {
      return [pts[0], pts[1], pts[altIdx]];
    }
    var total = 0;
    var i;
    for (i = 0; i + stride < pts.length; i += stride) {
      total += Math.hypot(pts[i + stride] - pts[i], pts[i + stride + 1] - pts[i + 1]);
    }
    var target = total / 2;
    var travelled = 0;
    for (i = 0; i + stride < pts.length; i += stride) {
      var segmentLength = Math.hypot(pts[i + stride] - pts[i], pts[i + stride + 1] - pts[i + 1]);
      if (travelled + segmentLength >= target && segmentLength > 0) {
        var t = (target - travelled) / segmentLength;
        return [
          pts[i] + (pts[i + stride] - pts[i]) * t,
          pts[i + 1] + (pts[i + stride + 1] - pts[i + 1]) * t,
          pts[i + altIdx] + (pts[i + stride + altIdx] - pts[i + altIdx]) * t,
        ];
      }
      travelled += segmentLength;
    }
    // Zero-length polyline (every vertex coincident) -- any vertex will do.
    return [pts[0], pts[1], pts[altIdx]];
  }

  // bottleneck is detail.lineBottleneck from /api/instance -- see the rust
  // core's flow_bottleneck for the fields.
  Bottleneck.show = function(bottleneck) {
    Bottleneck.clear(); // At most one line's markers at a time.
    var segments = bottleneck.limitingSegments || [];
    if (segments.length === 0) {
      return;
    }

    // allSegments covers the whole run; older payloads without it still get
    // the limiting segments marked, just with no line drawn behind them.
    var geometry = collectSegmentGeometry(bottleneck.allSegments ||
      segments.map(function(seg) { return { instanceName: seg.instanceName, isLimiting: true }; }));

    var points = [];
    var ids = [];
    var byInstance = {};
    segments.forEach(function(seg) {
      var own = geometry.byInstance[seg.instanceName];
      // seg.position is the segment's ORIGIN -- for a belt, the joint it
      // shares with its neighbour, where a pin is genuinely ambiguous. Its
      // spline's midpoint is what actually points at it. A lift (a box, not a
      // spline) has no such problem: its origin IS the thing.
      var pinAt = (own && own.polyline && polylineMidpoint(own.polyline)) || seg.position;
      points.push(pinAt[0], pinAt[1], pinAt[2]);
      ids.push(seg.instanceName);
      byInstance[seg.instanceName] = seg;
    });

    // Whole run first, limiting segments painted over it.
    MapApp.setLineOverlays([
      { polylines: geometry.line.polylines, boxes: geometry.line.boxes, color: WARNING_COLOR, width: LINE_WIDTH },
      { polylines: geometry.limiting.polylines, boxes: geometry.limiting.boxes, color: LIMITING_COLOR, width: LIMITING_LINE_WIDTH },
    ].filter(function(overlay) { return overlay.polylines.length > 0 || overlay.boxes.length > 0; }));

    MapApp.layer.addBucket({
      key: PIN_BUCKET_KEY,
      label: "Line Bottleneck",
      color: LIMITING_COLOR,
      visible: true,
      renderType: "icon",
      pointStride: 3,
      points: new Float32Array(points),
      ids: ids,
      // Hovering/clicking a warning pin shows the limiting segment's own
      // full /api/instance tooltip (whose warning section will read "this
      // segment slows the whole line/network"), with the capped rate as the
      // highlighted callout -- same static+server mix as finditem.js's
      // highlight bucket.
      tooltipKind: "static",
      tooltipInfo: function(index) {
        var seg = byInstance[ids[index]];
        return { title: seg.label, rows: [], position: seg.worldPosition };
      },
      tooltipServerId: function(index) {
        return ids[index];
      },
      tooltipExtraRows: function() {
        var scopeWord = bottleneck.scope === "network" ? "network" : "line";
        return [["Limits " + scopeWord + " to", bottleneck.limitPerMinute + " " + (bottleneck.unit || "items/min")]];
      },
      iconUrl: WARNING_ICON_URL,
      iconOpacity: 1,
    });
    shownKey = bottleneckKey(bottleneck);

    // Every vertex of the run, as [x, y, z] -- feeds both the altitude widen
    // and the view fit below. Leaflet CRS.Simple wants (lat=y, lng=x), the
    // same axis mapping as map.js's hitTest calls.
    var vertices = [];
    [geometry.line, geometry.limiting].forEach(function(group) {
      group.polylines.forEach(function(polyline) {
        for (var i = 0; i + polyline.stride - 1 < polyline.points.length; i += polyline.stride) {
          vertices.push([polyline.points[i], polyline.points[i + 1], polyline.points[i + polyline.stride - 1]]);
        }
      });
      group.boxes.forEach(function(box) {
        var p = box.index * 4;
        vertices.push([box.bucket.points[p], box.bucket.points[p + 1], box.bucket.points[p + 3]]);
      });
    });
    for (var pi = 0; pi < points.length; pi += 3) {
      vertices.push([points[pi], points[pi + 1], points[pi + 2]]);
    }

    // A line climbing between floors (and a limiting lift especially) is
    // routinely outside whatever altitude window the user was inspecting in,
    // which used to leave the markers -- and the belts they point at --
    // simply not drawn. Widen to cover the whole run; clear() puts it back.
    var altMin = Infinity, altMax = -Infinity;
    vertices.forEach(function(v) {
      if (v[2] < altMin) altMin = v[2];
      if (v[2] > altMax) altMax = v[2];
    });
    if (window.Altitude && altMin <= altMax) {
      restoreAltitudeRange = Altitude.ensureRangeCovers(altMin, altMax);
    }

    // Jump the view to frame the whole line, not just its slow segments --
    // the run's own shape is what makes the bottleneck legible ("it's the
    // lift halfway up"). maxZoom keeps a short line's fit from diving to full
    // zoom where the surrounding factory would be cropped away.
    MapApp.map.fitBounds(L.latLngBounds(vertices.map(function(v) { return [v[1], v[0]]; })),
      { padding: [80, 80], maxZoom: 4 });
    MapApp.layer.requestRedraw();
  };
})();
