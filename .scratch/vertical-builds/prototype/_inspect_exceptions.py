"""Classify dump samples without re-parsing saves."""
import json
import os
from collections import Counter, defaultdict

p = os.path.join(os.path.dirname(__file__), "transform-samples.json")
d = json.load(open(p, encoding="utf-8"))
print("valid json", "ticket" in d, "cases", len(d["cases"]), "bytes", os.path.getsize(p))
print("constants", d.get("constants"))
print()

classes = defaultdict(lambda: {
    "cases": set(),
    "tilt": 0,
    "yaw": 0,
    "miss_h": 0,
    "miss_fp": 0,
    "scale_dropped": 0,
    "n": 0,
    "z": [],
    "category": None,
    "source": set(),
    "xy_err": 0,
    "z_err": 0,
    "yflip": 0,
    "swap": 0,
    "z_as_cm": 0,
})

for c in d["cases"]:
    print("CASE", c["id"], c["kind"], c["save"])
    print("  watch:", c["watch"])
    print("  checks:", c["checks"], "zSpan", c["zSpanM"], "poses", c["poseCount"], "paths", c["pathCount"])
    yaw_vals = []
    for pose in c["poses"]:
        cl = pose["class"]
        rec = classes[cl]
        rec["n"] += 1
        rec["cases"].add(c["id"])
        rec["category"] = pose["category"]
        rec["source"].add(pose["source"])
        rec["xy_err"] = max(rec["xy_err"], pose["roundTrip"]["xyErrorCm"])
        rec["z_err"] = max(rec["z_err"], pose["roundTrip"]["zErrorCm"])
        rec["yflip"] = max(rec["yflip"], pose["roundTrip"]["forgotYFlipErrorCm"])
        rec["swap"] = max(rec["swap"], pose["roundTrip"]["swappedXyErrorCm"])
        rec["z_as_cm"] = max(rec["z_as_cm"], pose["roundTrip"]["zAsCmErrorM"])
        rec["z"].append(pose["payload"]["zM"])
        if pose["payload"]["yawForcedZero"]:
            rec["tilt"] += 1
        else:
            rec["yaw"] += 1
            yaw_vals.append((cl, pose["payload"]["yaw"], pose.get("yawFromSave"), pose["payload"]["zM"]))
        if pose["payload"]["heightExtentM"] is None:
            rec["miss_h"] += 1
        if pose["payload"]["footprintPixels"] is None:
            rec["miss_fp"] += 1
        if pose.get("scaleDropped") or (
            pose.get("scale")
            and any(abs(v - 1) > 1e-4 for v in pose["scale"])
        ):
            rec["scale_dropped"] += 1
    if yaw_vals[:6]:
        print("  sample yaws:", yaw_vals[:6])
    for path in c["paths"]:
        dropped = sum(1 for v in path["vertices"] if v["arriveZDropped"] or v["leaveZDropped"])
        print(
            "  PATH",
            path["class"],
            "verts",
            path["vertexCount"],
            "shown",
            len(path["vertices"]),
            "zSpan",
            path["zSpanM"],
            "tanZdroppedOnShown",
            dropped,
        )
        for v in path["vertices"][:3]:
            print("    vert", v["payload"]["zM"], "arrive", v["arriveWorldCm"], "leave", v["leaveWorldCm"], "dropA", v["arriveZDropped"], "dropL", v["leaveZDropped"])
    print()

print("=== CLASSES ===")
for cl, rec in sorted(classes.items(), key=lambda kv: -kv[1]["n"]):
    z = rec["z"]
    print(
        f"{cl:42} n={rec['n']:2} cat={rec['category']:12} src={','.join(rec['source'])}"
        f" tilt={rec['tilt']} yaw={rec['yaw']} missH={rec['miss_h']} missFp={rec['miss_fp']}"
        f" scaleDrop={rec['scale_dropped']} z=[{min(z):.1f},{max(z):.1f}]"
        f" cases={sorted(rec['cases'])}"
    )

print("\n=== PATH CLASSES ===")
for c in d["cases"]:
    for path in c["paths"]:
        print(c["id"], path["class"], path["trust"], "zSpan", path["zSpanM"])
