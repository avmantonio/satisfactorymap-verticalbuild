"""Validate the tracker integration package and hand-authored wire reference vectors.

Stdlib only. Run from any directory. This is documentation/reference validation,
NOT the production extractor/decoder, spatial tests or a viewer runtime pass.
--print-vector-expectations prints candidate pins for author review; never edits files.
"""

import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import struct
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def align8(n):
    return (n + 7) // 8 * 8


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def unique_object(pairs):
    out = {}
    for key, value in pairs:
        require(key not in out, "Duplicate JSON key: " + key)
        out[key] = value
    return out


def build_reference(vector):
    """Pack declared rows only; does not extract or infer any scene geometry."""
    meta = vector["metadata"]
    n, f, v = len(vector["poses"]), len(vector["fragments"]), len(vector["vertices"])
    require(n == len(meta["occupants"]) == meta["admissionCount"] <= 8000, "Bad occupant count")
    require(len(vector["vertexFlags"]) == v, "Bad vertex flag count")
    require(vector["request"]["requestId"] == meta["requestId"], "Request correlation mismatch")
    require(len({o["id"] for o in meta["occupants"]}) == n, "Duplicate occupant id")
    request = vector["request"]
    xy, cut, cap = request["xyM"], request["cutZM"], request["altitudeCapM"]
    require(xy["minX"] < xy["maxX"] and xy["minY"] < xy["maxY"] and cut["min"] <= cut["max"], "Invalid fixture request")
    require(vector["originM"] == [(xy["minX"] + xy["maxX"]) / 2, (xy["minY"] + xy["maxY"]) / 2, (cut["min"] + cut["max"]) / 2], "Wrong fixture origin")
    zmin = max(cut["min"], cap["min"]) if cap else cut["min"]
    zmax = min(cut["max"], cap["max"]) if cap else cut["max"]
    effective = None if zmin > zmax else {"min": [xy["minX"], xy["minY"], zmin], "max": [xy["maxX"], xy["maxY"], zmax]}
    require(meta["effectiveBoundsM"] == effective, "Wrong effective bounds")
    require(meta["emptyReason"] == ("DISJOINT_Z" if effective is None else "NO_OCCUPANTS" if n == 0 else None), "Wrong empty reason")
    if effective is None or n == 0:
        require(n == f == v == 0 and not meta["types"], "Empty fixture contains records")
    for occupant, pose in zip(meta["occupants"], vector["poses"]):
        require(len(pose) == 16 and all(math.isfinite(x) for x in pose), "Bad pose stride/float")
        flags = occupant["poseFlags"]
        require(0 <= flags <= 15 and (not flags & 8 or flags & 4), "Bad pose flags")
        require(0 <= occupant["typeIndex"] < len(meta["types"]), "Bad type index")
        for bit, start, end in ((1, 3, 7), (2, 7, 10), (4, 10, 13), (8, 13, 16)):
            if not flags & bit:
                require(all(x == 0 for x in pose[start:end]), "Absent pose field is not zero")
        require((occupant["sizeKind"] == "unknown") == (not bool(flags & 4)), "SizeKind/extent disagreement")
        if not flags & 2:
            require("scale-unknown" in occupant["uncertainty"], "Missing scale uncertainty")
        if not flags & 1:
            require("orientation-unknown" in occupant["uncertainty"], "Missing orientation uncertainty")
        if flags & 4:
            require(all(x > 0 for x in pose[10:13]), "Invalid complete extent")
    cursor, last_occupant = 0, -1
    linear_owners = set()
    for fragment in vector["fragments"]:
        require(len(fragment) == 4, "Bad fragment stride")
        owner, first, count, flags = fragment
        require(0 <= owner < n and owner >= last_occupant and first == cursor and count >= 1 and flags == 0, "Bad fragment partition/order")
        occupant = meta["occupants"][owner]
        require(occupant["recordKind"] == "path" and occupant["pathState"] == "linear", "Wrong fragment owner")
        linear_owners.add(owner)
        cursor, last_occupant = cursor + count, owner
    require(cursor == v, "Unreferenced vertices")
    require(linear_owners == {i for i, o in enumerate(meta["occupants"]) if o["pathState"] == "linear"}, "Linear path missing fragment")
    for vertex, flags in zip(vector["vertices"], vector["vertexFlags"]):
        require(len(vertex) == 9 and all(math.isfinite(x) for x in vertex) and 0 <= flags <= 7, "Bad vertex")
        require(not flags & 4 or not flags & 3, "Generated point has invented tangents")
        for bit, start, end in ((1, 3, 6), (2, 6, 9)):
            if not flags & bit:
                require(all(x == 0 for x in vertex[start:end]), "Absent tangent is not zero")
    metadata = compact(meta)
    po = align8(128 + len(metadata))
    fo = align8(po + n * 64)
    vo = align8(fo + f * 16)
    vf = align8(vo + v * 36)
    total = align8(vf + v * 4)
    require(total <= 67108864, "Fixture exceeds v1 frame safety bound")
    frame = bytearray(total)
    frame[:8] = b"SMREG3D\0"
    struct.pack_into("<8I", frame, 8, 1, 128, total, len(metadata), n, f, v, 0)
    struct.pack_into("<3d", frame, 40, *vector["originM"])
    bounds = meta["effectiveBoundsM"]
    struct.pack_into("<6d", frame, 64, *((bounds["min"] + bounds["max"]) if bounds else [0] * 6))
    struct.pack_into("<4I", frame, 112, po, fo, vo, vf)
    frame[128:128 + len(metadata)] = metadata
    for offset, rows, fmt in ((po, vector["poses"], "<16f"), (fo, vector["fragments"], "<4I"), (vo, vector["vertices"], "<9f")):
        stride = struct.calcsize(fmt)
        for index, row in enumerate(rows):
            struct.pack_into(fmt, frame, offset + index * stride, *row)
    for index, flags in enumerate(vector["vertexFlags"]):
        struct.pack_into("<I", frame, vf + index * 4, flags)
    return {
        "metadataBytes": len(metadata), "offsets": [po, fo, vo, vf], "totalBytes": total,
        "headerHex": frame[:128].hex(),
        "numericSha256": hashlib.sha256(frame[po:]).hexdigest(),
        "frameSha256": hashlib.sha256(frame).hexdigest(),
    }


def heading_ids(text):
    ids = set(re.findall(r'<a\s+id=["\']([^"\']+)', text))
    counts = {}
    for heading in re.findall(r"^#{1,6}\s+(.+)$", text, re.M):
        plain = re.sub(r"\[([^]]+)\]\([^)]*\)", r"\1", heading).strip().lower()
        base = re.sub(r"[^\w\- ]", "", plain).replace(" ", "-")
        repeat = counts.get(base, 0)
        counts[base] = repeat + 1
        ids.add(base + ("-" + str(repeat) if repeat else ""))
    return ids


def check_documents():
    required = [
        "specs/viewer-integration-spec.md", "specs/viewer-regional-wire-v1.md",
        "specs/viewer-integration-map.md", "specs/viewer-initial-coverage.md",
        "specs/viewer-exit-criteria.md",
        "plans/regional-viewer/PLAN_PHASE_1_core-extract.md",
        "plans/regional-viewer/PLAN_PHASE_2_state-transports.md",
        "plans/regional-viewer/PLAN_PHASE_3_renderer-kit.md",
        "plans/regional-viewer/PLAN_PHASE_4_product-integration.md",
        "plans/regional-viewer/PLAN_PHASE_FINAL_smoke.md",
    ]
    for relative in required:
        require((ROOT / relative).is_file(), "Missing artifact: " + relative)
    links, anchors = 0, 0
    # Validate the viewer/integration package and its entry points, not unrelated
    # historical research internals (which already contain stale local links).
    sources = set((ROOT / "specs").glob("viewer-*.md"))
    sources.update((ROOT / "plans/regional-viewer").glob("*.md"))
    sources.update((ROOT / "validation").glob("*.md"))
    sources.update(ROOT / name for name in ("map.md", "CONTINUE.md"))
    sources.update((ROOT / "issues").glob("60-*.md"))
    sources.update((ROOT / "issues").glob("79-*.md"))
    for source in sorted(sources):
        text = source.read_text(encoding="utf-8")
        # Do not treat example/template links inside fenced code as live links.
        text = re.sub(r"^```.*?^```[^\n]*", "", text, flags=re.M | re.S)
        for target in re.findall(r"(?<!!)\[[^]\n]+\]\(([^)\s]+)\)", text):
            split = urlsplit(target)
            if split.scheme or split.netloc:
                continue
            path = (source.parent / unquote(split.path)).resolve() if split.path else source
            require(path.exists(), f"Broken link: {source.relative_to(ROOT)} -> {target}")
            links += 1
            if split.fragment and path.suffix == ".md":
                require(unquote(split.fragment) in heading_ids(path.read_text(encoding="utf-8")), f"Broken anchor: {source.relative_to(ROOT)} -> {target}")
                anchors += 1
    for ticket in (54, 55, 56, 58, 59, 60, 61, 79):
        matches = list((ROOT / "issues").glob(f"{ticket:02d}-*.md"))
        require(len(matches) == 1, f"Missing/duplicate ticket {ticket}")
        header = matches[0].read_text(encoding="utf-8").split("## ", 1)[0]
        require(re.search(r"^Status: open$", header, re.M), f"Ticket {ticket} falsely completed")
        require(not re.search(r"^(?:Supporting )?Spec:", header, re.M), f"Open ticket {ticket} gained completion spec metadata")
    criteria = (ROOT / "specs/viewer-exit-criteria.md").read_text(encoding="utf-8")
    for number in range(1, 11):
        require(re.search(rf"\| HEC-{number:02d} \|.*\| OPEN", criteria), f"HEC-{number:02d} missing or falsely closed")
    return links, anchors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--print-vector-expectations", action="store_true")
    args = parser.parse_args()
    document = json.loads((ROOT / "validation/regional-scene-v1-vectors.json").read_text(encoding="utf-8"), object_pairs_hook=unique_object)
    require(document["schemaVersion"] == 1, "Wrong vector schema")
    names = [v["name"] for v in document["vectors"]]
    require(len(names) == len(set(names)) == 6, "Expected six distinct canonical vectors")
    if args.print_vector_expectations:
        print(json.dumps({v["name"]: build_reference(v) for v in document["vectors"]}, indent=2))
        return
    for vector in document["vectors"]:
        require(build_reference(vector) == vector["expected"], "Reference pin mismatch: " + vector["name"])
    links, anchors = check_documents()
    print(f"PASS: {len(names)} canonical wire reference vectors; {links} local Markdown links; {anchors} Markdown anchor references")
    print("PASS: required integration/phase artifacts; implementation/trial/delivery/research tickets and HEC remain OPEN")
    print("Documentation/reference consistency only; no production extractor, decoder, build or viewer runtime result is credited.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, struct.error) as error:
        print("FAIL: " + str(error), file=sys.stderr)
        sys.exit(1)
