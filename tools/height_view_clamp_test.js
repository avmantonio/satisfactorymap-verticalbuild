#!/usr/bin/env node
// Locks Height-view peel clamp against the altitude rail. Changing floors
// must keep the band inside the new filter — never the inverted midpoint.
"use strict";

var fs = require("fs");
var path = require("path");

var SRC = path.join(__dirname, "..", "map", "static", "map", "height_view.js");
var src = fs.readFileSync(SRC, "utf8");
var start = src.indexOf("function clampIntervalToRail(");
if (start < 0) {
  fail("clampIntervalToRail not found in " + SRC);
}
var brace = src.indexOf("{", start);
var depth = 0;
var i = brace;
for (; i < src.length; i++) {
  if (src[i] === "{") depth++;
  else if (src[i] === "}") {
    depth--;
    if (depth === 0) {
      i++;
      break;
    }
  }
}
var fn = new Function(src.slice(start, i) + "\nreturn clampIntervalToRail;");
var clampIntervalToRail = fn();

var failed = 0;

function fail(msg) {
  console.error("FAIL " + msg);
  failed++;
}

function close(a, b) {
  return Math.abs(a - b) < 1e-9;
}

function assertBand(name, band, cap, expected) {
  var got = clampIntervalToRail(band, cap);
  if (!close(got.min, expected.min) || !close(got.max, expected.max)) {
    fail(
      name +
        ": got [" + got.min + ", " + got.max + "]" +
        " expected [" + expected.min + ", " + expected.max + "]"
    );
    return;
  }
  console.log("ok   " + name);
}

function assertInside(name, band, cap) {
  var got = clampIntervalToRail(band, cap);
  if (got.min < cap.min - 1e-9 || got.max > cap.max + 1e-9 || got.min > got.max) {
    fail(
      name +
        ": result [" + got.min + ", " + got.max + "]" +
        " is outside [" + cap.min + ", " + cap.max + "]"
    );
    return;
  }
  console.log("ok   " + name + " stays in filter [" + got.min + ", " + got.max + "]");
}

// Reviewer: disjoint higher floor used to invert to the midpoint (60, 60).
var higher = clampIntervalToRail({ min: 0, max: 20 }, { min: 100, max: 120 });
if (close(higher.min, 60) && close(higher.max, 60)) {
  fail("higher floor must not land on inverted midpoint [60, 60]");
}
assertBand(
  "higher floor [0, 20] vs filter [100, 120]",
  { min: 0, max: 20 },
  { min: 100, max: 120 },
  { min: 100, max: 120 }
);
assertInside(
  "higher floor",
  { min: 0, max: 20 },
  { min: 100, max: 120 }
);

assertBand(
  "lower floor [100, 120] vs filter [0, 20]",
  { min: 100, max: 120 },
  { min: 0, max: 20 },
  { min: 0, max: 20 }
);
assertInside(
  "lower floor",
  { min: 100, max: 120 },
  { min: 0, max: 20 }
);

assertBand(
  "higher floor, peel wider than filter",
  { min: 0, max: 50 },
  { min: 100, max: 110 },
  { min: 100, max: 110 }
);
assertBand(
  "lower floor, peel wider than filter",
  { min: 100, max: 150 },
  { min: 0, max: 20 },
  { min: 0, max: 20 }
);

assertBand(
  "overlap from below",
  { min: 0, max: 20 },
  { min: 10, max: 30 },
  { min: 10, max: 20 }
);
assertBand(
  "overlap from above",
  { min: 10, max: 30 },
  { min: 0, max: 20 },
  { min: 10, max: 20 }
);
assertBand(
  "peel inside filter",
  { min: 5, max: 15 },
  { min: 0, max: 20 },
  { min: 5, max: 15 }
);
assertBand(
  "filter inside peel",
  { min: 0, max: 40 },
  { min: 10, max: 20 },
  { min: 10, max: 20 }
);
assertBand(
  "unbounded filter leaves peel",
  { min: 0, max: 20 },
  { min: -Infinity, max: Infinity },
  { min: 0, max: 20 }
);
assertBand(
  "zero-span peel jumps to higher floor",
  { min: 60, max: 60 },
  { min: 100, max: 120 },
  { min: 100, max: 100 }
);
assertBand(
  "zero-span peel jumps to lower floor",
  { min: 60, max: 60 },
  { min: 0, max: 20 },
  { min: 20, max: 20 }
);

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all tests passed");
