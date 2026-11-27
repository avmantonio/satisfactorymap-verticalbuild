"""Native AppSession vs WASM SaveClient parity probe (ticket 60 phase 2 / HEC-04).

Loads the same local save and request into built WASM via SaveClient and the
native `regional_scene_dump` example, then compares decoded semantics (ids,
order, flags, fragments, origin) and normalized RegionalError objects.

    py tools/check_regional_parity.py --serve --save map/uploads/solo_autosave_1.sav \\
        --cases tools/fixtures/regional-viewer-regions.json

Temporary dumps stay in a temp directory and are not committed. This is not a
completed viewer and not a runtime acceptance of ticket 60. Actual native
command/CSP remains S-03.
"""

from __future__ import annotations

import argparse
import json
import os
import struct
import subprocess
import sys
import tempfile
import time

def log(msg):
    print(msg, flush=True)

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_PORT = 8791
MAGIC = b"SMREG3D\0"
ERROR_PREFIX = "REGIONAL_ERROR:"


def map_px_to_world_m(map_x, map_y):
    world_x_cm = ((map_x / 5.0 + 204.8) * 20.0 - 18282.5) * 22.887
    world_y_cm = (((8192.0 - map_y) / 5.0 + 204.8) * 20.0 - 20480.0) * 22.887
    return world_x_cm / 100.0, world_y_cm / 100.0


def rect_map_to_xy_m(rect):
    corners = [
        map_px_to_world_m(rect["minX"], rect["minY"]),
        map_px_to_world_m(rect["maxX"], rect["minY"]),
        map_px_to_world_m(rect["minX"], rect["maxY"]),
        map_px_to_world_m(rect["maxX"], rect["maxY"]),
    ]
    xs = [c[0] for c in corners]
    ys = [c[1] for c in corners]
    return {
        "minX": min(xs),
        "maxX": max(xs),
        "minY": min(ys),
        "maxY": max(ys),
    }


def case_request(case, index):
    request = {
        "schemaVersion": int(case.get("schemaVersion", 1)),
        "requestId": "regional:%s" % case["id"],
        "cutZM": case["cutZM"],
        "altitudeCapM": case.get("altitudeCapM"),
    }
    if "xyM" in case:
        request["xyM"] = case["xyM"]
    elif "rectMapPx" in case:
        request["xyM"] = rect_map_to_xy_m(case["rectMapPx"])
    else:
        raise SystemExit("case %s is missing xyM/rectMapPx" % case["id"])
    void = index  # requestId uniqueness already uses case id
    del void
    return request


def f64_le(buf, offset):
    return struct.unpack_from("<d", buf, offset)[0]


def u32_le(buf, offset):
    return struct.unpack_from("<I", buf, offset)[0]


def decode_error_bytes(raw):
    text = raw.decode("utf-8")
    if not text.startswith(ERROR_PREFIX):
        raise ValueError("error payload is not REGIONAL_ERROR-prefixed")
    body = json.loads(text[len(ERROR_PREFIX):])
    if not isinstance(body, dict) or body.get("name") != "RegionalError":
        raise ValueError("prefixed error JSON is not a RegionalError")
    return {
        "kind": "error",
        "code": body.get("code"),
        "requestId": body.get("requestId"),
        "sessionLost": bool(body.get("sessionLost")),
        "details": body.get("details") or {},
        "message": body.get("message"),
    }


def decode_frame(raw):
    if raw.startswith(ERROR_PREFIX.encode("ascii")):
        return decode_error_bytes(raw)
    if len(raw) < 128 or raw[:8] != MAGIC:
        raise ValueError("frame is missing SMREG3D magic")
    schema = u32_le(raw, 8)
    header_bytes = u32_le(raw, 12)
    total = u32_le(raw, 16)
    meta_bytes = u32_le(raw, 20)
    n = u32_le(raw, 24)
    f_count = u32_le(raw, 28)
    v_count = u32_le(raw, 32)
    origin = [f64_le(raw, 40), f64_le(raw, 48), f64_le(raw, 56)]
    min_m = [f64_le(raw, 64), f64_le(raw, 72), f64_le(raw, 80)]
    max_m = [f64_le(raw, 88), f64_le(raw, 96), f64_le(raw, 104)]
    pose_off = u32_le(raw, 112)
    frag_off = u32_le(raw, 116)
    vert_off = u32_le(raw, 120)
    flags_off = u32_le(raw, 124)
    if schema != 1 or header_bytes != 128 or total != len(raw):
        raise ValueError("frame header length/schema mismatch")
    meta = json.loads(raw[128:128 + meta_bytes].decode("utf-8"))
    fragments = []
    for i in range(f_count):
        off = frag_off + i * 16
        fragments.append({
            "occupantIndex": u32_le(raw, off),
            "firstVertex": u32_le(raw, off + 4),
            "vertexCount": u32_le(raw, off + 8),
            "flags": u32_le(raw, off + 12),
        })
    vertex_flags = [u32_le(raw, flags_off + i * 4) for i in range(v_count)]
    occupants = meta.get("occupants") or []
    types = meta.get("types") or []
    return {
        "kind": "frame",
        "requestId": meta.get("requestId"),
        "admissionCount": meta.get("admissionCount"),
        "emptyReason": meta.get("emptyReason"),
        "n": n,
        "f": f_count,
        "v": v_count,
        "originM": origin,
        "minM": min_m,
        "maxM": max_m,
        "ids": [row.get("id") for row in occupants],
        "typePaths": [row.get("typePath") for row in types],
        "poseFlags": [row.get("poseFlags") for row in occupants],
        "pathState": [row.get("pathState") for row in occupants],
        "sizeKind": [row.get("sizeKind") for row in occupants],
        "recordKind": [row.get("recordKind") for row in occupants],
        "fragments": fragments,
        "vertexFlags": vertex_flags,
        "rawLen": len(raw),
        "poseOffset": pose_off,
        "fragmentOffset": frag_off,
    }


def semantic_equal(a, b):
    keys = [
        "kind", "code", "requestId", "sessionLost", "details",
        "admissionCount", "emptyReason", "n", "f", "v", "originM", "minM", "maxM",
        "ids", "typePaths", "poseFlags", "pathState", "sizeKind", "recordKind",
        "fragments", "vertexFlags",
    ]
    diffs = []
    for key in keys:
        if a.get(key) != b.get(key):
            diffs.append("%s wasm=%r native=%r" % (key, a.get(key), b.get(key)))
    return diffs


def meets_require(decoded, require):
    if decoded.get("kind") != "frame":
        return False, "expected a success frame"
    ids = " ".join(decoded.get("ids") or [])
    types = " ".join(decoded.get("typePaths") or [])
    blob = (ids + " " + types).lower()
    if "constructor" in require:
        if "constructor" not in blob:
            return False, "no constructor type/id in nonempty region"
    if "path" in require:
        if "path" not in (decoded.get("recordKind") or []) or decoded.get("f", 0) < 1:
            return False, "no path fragments in rail region"
    if "unknown-size" in require:
        if "unknown" not in (decoded.get("sizeKind") or []):
            return False, "no sizeKind=unknown in passthrough region"
    if decoded.get("n", 0) < 1:
        return False, "nonempty case decoded zero occupants"
    return True, ""


def native_dump(dump_bin, save, request, out_path):
    proc = subprocess.run(
        [dump_bin, "--save", save, "--request", json.dumps(request), "--out", out_path],
        cwd=REPO,
        capture_output=True,
        text=True,
    )
    if proc.returncode not in (0, 2):
        raise SystemExit(
            "native dump failed (%s): %s%s" % (proc.returncode, proc.stdout, proc.stderr)
        )
    with open(out_path, "rb") as fh:
        return fh.read()


def build_dump_example():
    log("building regional_scene_dump ...")
    proc = subprocess.run(
        ["cargo", "build", "-p", "sav_tauri", "--release", "--example", "regional_scene_dump"],
        cwd=os.path.join(REPO, "rust_parser"),
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        sys.stderr.write(proc.stdout)
        sys.stderr.write(proc.stderr)
        raise SystemExit("cargo build --example regional_scene_dump failed")
    path = os.path.join(REPO, "rust_parser", "target", "release", "examples", "regional_scene_dump")
    if not os.path.isfile(path):
        raise SystemExit("dump binary missing at %s" % path)
    return path


def wasm_query(page, request):
    return page.evaluate(
        """async (request) => {
          const stamp = SaveClient.getSessionStamp();
          try {
            const bytes = await SaveClient.queryRegionalScene(request, { stamp });
            const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
            let binary = "";
            const chunk = 0x8000;
            for (let i = 0; i < u8.length; i += chunk) {
              binary += String.fromCharCode.apply(null, u8.subarray(i, i + chunk));
            }
            return { ok: true, b64: btoa(binary) };
          } catch (error) {
            return {
              ok: false,
              error: {
                name: error && error.name,
                code: error && error.code,
                message: error && error.message,
                requestId: error && error.requestId,
                sessionLost: !!(error && error.sessionLost),
                details: (error && error.details) || {},
              },
            };
          }
        }""",
        request,
    )


def wasm_to_decoded(result):
    if result.get("ok"):
        import base64
        raw = base64.b64decode(result["b64"])
        decoded = decode_frame(raw)
        decoded["raw"] = raw
        return decoded
    err = result.get("error") or {}
    return {
        "kind": "error",
        "code": err.get("code"),
        "requestId": err.get("requestId"),
        "sessionLost": bool(err.get("sessionLost")),
        "details": err.get("details") or {},
        "message": err.get("message"),
        "raw": None,
    }


def native_to_decoded(raw):
    decoded = decode_frame(raw)
    decoded["raw"] = raw
    return decoded


def run(page, save, cases_path, dump_bin, dump_dir):
    fails = []

    def check(name, ok, detail=""):
        log(("  PASS  " if ok else "  FAIL  ") + name + (("  -- " + str(detail)) if detail else ""))
        if not ok:
            fails.append(name)

    with open(cases_path, encoding="utf-8") as fh:
        spec = json.load(fh)
    cases = spec.get("cases") or []
    if not cases:
        raise SystemExit("no cases in %s" % cases_path)

    errors = []
    page.on("pageerror", lambda e: errors.append("pageerror " + str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    log("opening map ...")
    page.goto("http://localhost:%d/index.html" % PORT, wait_until="domcontentloaded")
    page.wait_for_timeout(1000)
    if errors:
        log("page errors before upload: %s" % errors[:8])
    log("uploading %s ..." % os.path.basename(save))
    page.set_input_files("#uploadFileInput", save)
    try:
        # Ready is marked only after applyPayload finishes Filters.build, so
        # buckets.length > 0 can become true tens of seconds earlier.
        page.wait_for_function(
            "window.SaveClient && SaveClient.isReady && SaveClient.isReady() && window.MapApp && MapApp.layer && MapApp.layer.buckets && MapApp.layer.buckets.length > 0",
            timeout=600000,
        )
    except Exception as exc:
        log("ready wait failed: %s" % exc)
        log("status: %s" % page.evaluate("document.getElementById('loadStatus') && document.getElementById('loadStatus').textContent"))
        log("ready: %s" % page.evaluate("window.SaveClient && SaveClient.isReady && SaveClient.isReady()"))
        log("buckets: %s" % page.evaluate("window.MapApp && MapApp.layer && MapApp.layer.buckets && MapApp.layer.buckets.length"))
        log("errors: %s" % errors[:12])
        raise
    log("save ready; js errors=%s" % (errors[:6] or "none"))

    nonempty = 0
    empty = 0
    errors = 0
    byte_matches = 0

    for index, case in enumerate(cases):
        case_id = case["id"]
        request = case_request(case, index)
        log("case %s ..." % case_id)
        wasm_raw = wasm_query(page, request)
        wasm_decoded = wasm_to_decoded(wasm_raw)
        native_path = os.path.join(dump_dir, case_id + ".bin")
        native_bytes = native_dump(dump_bin, save, request, native_path)
        native_decoded = native_to_decoded(native_bytes)

        diffs = semantic_equal(wasm_decoded, native_decoded)
        check("HEC-04 parity %s" % case_id, not diffs, "; ".join(diffs[:6]))
        if wasm_decoded.get("kind") == "frame" and native_decoded.get("kind") == "frame":
            if wasm_decoded.get("raw") == native_decoded.get("raw"):
                byte_matches += 1
            if wasm_decoded.get("n", 0) > 0:
                nonempty += 1
            else:
                empty += 1
            if case.get("expect") == "nonempty":
                ok, detail = meets_require(wasm_decoded, case.get("require") or [])
                check("HEC-04 coverage %s" % case_id, ok, detail)
            if case.get("expect") == "empty":
                reason = case.get("emptyReason")
                check(
                    "HEC-04 empty %s" % case_id,
                    wasm_decoded.get("emptyReason") == reason and wasm_decoded.get("n") == 0,
                    "emptyReason=%s n=%s" % (wasm_decoded.get("emptyReason"), wasm_decoded.get("n")),
                )
        elif wasm_decoded.get("kind") == "error":
            errors += 1
            if case.get("expect") == "error":
                check(
                    "HEC-04 error %s" % case_id,
                    wasm_decoded.get("code") == case.get("errorCode"),
                    "code=%s" % wasm_decoded.get("code"),
                )
        else:
            check("HEC-04 %s produced a comparable result" % case_id, False,
                  "wasm=%s native=%s" % (wasm_decoded.get("kind"), native_decoded.get("kind")))

    check("HEC-04 nonempty actual records exist", nonempty > 0, "nonempty=%d" % nonempty)
    check("HEC-04 empty/disjoint cases exist", empty > 0, "empty=%d" % empty)
    check("HEC-04 normalized errors exist", errors > 0, "errors=%d" % errors)
    check("HEC-04 all-empty equality cannot pass", nonempty > 0 and (empty > 0 or errors > 0))
    log("  info  identical native/wasm frames: %d" % byte_matches)
    return fails


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--save", default=os.path.join(REPO, "map", "uploads", "solo_autosave_1.sav"))
    parser.add_argument("--cases", default=os.path.join(REPO, "tools", "fixtures", "regional-viewer-regions.json"))
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--serve", action="store_true")
    args = parser.parse_args()

    global PORT
    PORT = args.port
    save = os.path.abspath(args.save)
    if not os.path.isfile(save):
        sys.exit("missing save %s -- run py tools/fetch_test_saves.py" % save)
    if not os.path.isfile(args.cases):
        sys.exit("missing cases %s" % args.cases)

    dump_bin = build_dump_example()
    server = None
    if args.serve:
        server = subprocess.Popen(
            [sys.executable, os.path.join(REPO, "tools", "serve_site.py"), str(PORT)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        time.sleep(2)

    fails = []
    dump_dir = tempfile.mkdtemp(prefix="regional-parity-")
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(channel="chrome", headless=True)
            page = browser.new_page(viewport={"width": 1600, "height": 900})
            fails = run(page, save, args.cases, dump_bin, dump_dir)
            browser.close()
    finally:
        if server:
            server.terminate()

    log("dumps at %s (not git)" % dump_dir)
    log("\n%d check(s) failed" % len(fails))
    for name in fails:
        print("  " + name)
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
