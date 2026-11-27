import json
import os

p = os.path.join(os.path.dirname(__file__), "transform-samples.json")
d = json.load(open(p, encoding="utf-8"))
print("bytes", os.path.getsize(p))
print("cases", len(d["cases"]))
for c in d["cases"]:
    ch = c["checks"]
    print(
        f"{c['id']:24} poses={c['poseCount']:2} paths={c['pathCount']}"
        f" z={c['zSpanM']} xyCm={ch['maxXyRoundTripCm']} zCm={ch['maxZRoundTripCm']}"
        f" axisOk={ch['axisUnitOk']} tilt={ch['tiltedPayloadYawZero']}"
        f" missH={ch['missingHeightExtent']} missFp={ch['missingFootprint']}"
        f" tanZ={ch['pathTangentsWithZDropped']} yawMis={ch['yawMismatch']}"
        f" scale={ch['nonUnitOrDroppedScale']}"
    )
    if c["poses"]:
        p0 = c["poses"][0]
        print("   first", p0["class"], "trust", p0["trust"], "cat", p0["category"], "src", p0["source"])
        print("   rt", p0["roundTrip"], "payload", p0["payload"])
    if c["paths"]:
        pth = c["paths"][0]
        print(
            "   path",
            pth["class"],
            "verts",
            pth["vertexCount"],
            "zspan",
            pth["zSpanM"],
            "trust",
            pth["trust"],
        )
        v0 = pth["vertices"][0]
        print("   vert0", {"arriveZDropped": v0["arriveZDropped"], "leaveZDropped": v0["leaveZDropped"], "payload": v0["payload"], "arriveWorldCm": v0["arriveWorldCm"]})
