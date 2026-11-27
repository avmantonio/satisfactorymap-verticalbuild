# Regional scene wire contract — version 1

Status: fixed producer/consumer contract for ticket 60; not implemented.
Composition: [global contract](viewer-integration-spec.md) · [wiring](viewer-integration-map.md) · [acceptance](viewer-exit-criteria.md).

Normative words MUST/MUST NOT apply to both shells. v1 is a separate transport: do not slim ids, round floats to two decimals, add fields to the 2D payload or call its projected spline collectors as a geometry source.

## 1. Public and binding interfaces

| Layer | Exact interface | Outcome |
| --- | --- | --- |
| Frontend | `SaveClient.queryRegionalScene(request, {stamp, signal})` | Promise of owned Uint8Array containing one success frame; rejects normalized RegionalError |
| Frontend session | `getSessionStamp()`, `isReady()`, `acquireRegionalVisit(stamp)`, `onSessionInvalidated(listener)` | copied stamp, readiness, `{release(), isLive()}` lease, unsubscribe function |
| Frontend load/edit methods | Existing `loadSave`, `loadSavePath`, `applyEdits` return payload Promise with immutable `.sessionStamp` | stamp is captured at dispatch, not completion; installer skips stale payloads before changing buckets |
| Frontend payload installation | `SaveClient.markPayloadInstalled(stamp)` | marks ready only if the current mutation's stamp still matches; stale installers cannot mark a newer state ready |
| Worker RPC | `{id, op:"queryRegionalScene", request}` | existing `{id,ok:true,result:Uint8Array}` with `result.buffer` transferred, or structured error |
| WASM method | `SaveSession.regional_scene(request_json: &str) -> Result<Vec<u8>, JsError>` | success bytes copied out of WASM-owned memory before transfer |
| Native command | `regional_scene({requestJson: string})` | raw `tauri::ipc::Response`, not JSON array, string or base64 |
| Native session | `AppSession.regional_scene(&self, request_json: &str) -> Result<Vec<u8>, RegionalError>` | same core call under current session guard |
| Core | `regional_scene(store: &SaveStore, request: &RegionalRequest) -> Result<Vec<u8>, RegionalError>` | validate → bounded count → encode; no save mutation |
| Shared JS decoder | `decodeRegionalScene(bytes, expectedRequestId)` | checked frame with typed views; throws normalized `INVALID_FRAME`/`UNSUPPORTED_SCHEMA` |

The two Rust shells may have different language-specific error wrappers, but share core RegionalRequest/RegionalError and serialization. Logical session stamps and AbortSignal belong to SaveClient, not the binary frame or persisted save. SaveClient checks the stamp and abort signal before dispatch and after receipt. The controller repeats visit checks after decoding/building.

## 2. Request JSON

Exactly these fields are required; no unknown fields in v1:

```json
{
  "schemaVersion": 1,
  "requestId": "regional:1",
  "xyM": {"minX": 0, "maxX": 16, "minY": 0, "maxY": 16},
  "cutZM": {"min": 0, "max": 20},
  "altitudeCapM": {"min": -10, "max": 100}
}
```

`requestId` is an ASCII correlation string, 1–96 characters, unique per request in this client; it is echoed verbatim. IDs/revisions must not be recycled across a pending request. schemaVersion is integer 1. All region numbers must be finite JSON numbers. XY requires min < max on both axes. Cut requires min ≤ max. altitudeCapM is either the same finite `{min,max}` shape with min ≤ max, or explicit `null` meaning no extra altitude restriction. Infinity, NaN and omitted cap are invalid. No category, Selection, hiddenIndices or caller-selectable limit is accepted. The core constant is 8,000.

Effective bounds are `[minX,minY,max(cut.min,cap.min)]` to `[maxX,maxY,min(cut.max,cap.max)]`, ignoring the cap term for null. If effective minZ > maxZ, return a success frame with zero occupants and `emptyReason:"DISJOINT_Z"`. Equal effective Z is a closed slab. Face/edge/corner contacts use f64 closed comparisons, without epsilon inflation. Degenerate/inverted XY or inverted input Z → INVALID_REGION.

### Map pixel conversion before dispatch

Use full committed map-pixel values, not payload-rounded positions:

```text
worldXcm = ((mapX / 5 + 204.8) * 20 - 18282.5) * 22.887
worldYcm = (((8192 - mapY) / 5 + 204.8) * 20 - 20480.0) * 22.887
worldM = worldCm / 100
```

Convert corners then take min/max. The same expression order/calibration as the editor/core must be regression-tested. Wire/world XYZ has save Z up and no map-Y inversion. Tangents use the vector transform, never the point offset. A Three scene uses Z-up with identity world axes; no second swap or reflection is permitted.

## 3. Success frame: byte order, header and alignment

One contiguous byte array. All multibyte numbers are **little-endian**, IEEE754 for floats. Header is exactly 128 bytes. `u32` sizes/offsets are byte counts, not element counts. No compression, CBOR, pointers into WASM memory, renderer instances or embedded save bytes.

| Byte offset | Type / length | Meaning |
| --- | --- | --- |
| 0 | 8 raw bytes | ASCII `SMREG3D` followed by `00` (`53 4d 52 45 47 33 44 00`) |
| 8 | u32 | schemaVersion = 1 |
| 12 | u32 | headerBytes = 128 |
| 16 | u32 | totalBytes, exactly returned byte length |
| 20 | u32 | metadataBytes, UTF-8 byte count, excluding alignment padding |
| 24 | u32 | occupant count N, 0…8,000 |
| 28 | u32 | fragment count F |
| 32 | u32 | vertex count V |
| 36 | u32 | reserved = 0 |
| 40,48,56 | 3 × f64 | regional originM in save world XYZ |
| 64,72,80 | 3 × f64 | effective minM, or all +0 for DISJOINT_Z |
| 88,96,104 | 3 × f64 | effective maxM, or all +0 for DISJOINT_Z |
| 112 | u32 | poseOffset |
| 116 | u32 | fragmentOffset |
| 120 | u32 | vertexOffset |
| 124 | u32 | vertexFlagsOffset |

Define `align8(n) = (n + 7) rounded down to a multiple of 8`, with checked arithmetic. Sections are canonical and tightly laid out apart from zero padding:

```text
metadata begins at 128, length metadataBytes
poseOffset        = align8(128 + metadataBytes)
fragmentOffset    = align8(poseOffset + N * 64)
vertexOffset      = align8(fragmentOffset + F * 16)
vertexFlagsOffset = align8(vertexOffset + V * 36)
totalBytes        = align8(vertexFlagsOffset + V * 4)
```

Padding bytes MUST be zero. Offsets may coincide when the preceding section is empty. Unknown flags/reserved bits, extra trailing bytes and noncanonical offsets are INVALID_FRAME in v1. Reject overflow/length mismatches before allocating/constructing typed views. Byte counts must fit u32 and `totalBytes <= 67,108,864` (64 MiB), a common v1 encoded-frame safety bound for both raw transports. The core checks cumulative sizing after successful occupant admission and before final frame allocation; exceeding it yields RESOURCE_EXHAUSTED, not an occupant refusal or truncated/decimated path. The decoder rejects oversized frames as INVALID_FRAME before metadata/typed-view work. Allocation failure below the bound is still an error, never partial output. There is no claim that the occupant cap bounds vertex/byte cost or guarantees a 64 MiB frame will fit alongside every save.

Origin is always `[(minX+maxX)/2, (minY+maxY)/2, (cut.min+cut.max)/2]` using an overflow-safe midpoint in f64. It does not depend on category visibility, occupant extents or altitude cap. Use checked finite arithmetic. Header bounds match metadata exactly as binary f64 values decoded from its JSON numbers. DISJOINT_Z has null metadata bounds and six +0 header slots; it is not confused with a genuine zero-sized Z slab.

## 4. Metadata JSON (parallel identity/honesty table)

UTF-8 strict JSON object, no duplicate keys or non-finite values. Fields below are required, including explicit nulls. Key ordering/whitespace is not semantically significant. Producers emit compact JSON; consumers MUST NOT derive typed offsets from character counts. v1 rejects unknown structural keys/enums. Display strings and source strings are untrusted text, never HTML.

```json
{
  "requestId": "regional:1",
  "admissionCount": 1,
  "effectiveBoundsM": {"min": [0, 0, 0], "max": [16, 16, 20]},
  "emptyReason": null,
  "types": [
    {"typePath": "/Example/Build_Foundation.Build_Foundation_C",
     "label": "Foundation", "category": "Foundation", "subcategory": "Floors"}
  ],
  "occupants": [
    {"id": "Persistent_Level:PersistentLevel.Foundation_1", "typeIndex": 0,
     "sourceKind": "actor", "recordKind": "occupant", "sizeKind": "named-box",
     "poseFlags": 15, "pathState": "not-path", "uncertainty": []}
  ]
}
```

The example type path is illustrative; real full paths come from the current save, not a guessed prefix. `types` rows are unique by full typePath and ordered by first admitted use. `label` is a readable string (fall back to short class text); `category` is the existing shared category display key, including `Unknown` fallback; `subcategory` is string or null. Reuse the current category resolver including curated overrides. No separate 3D taxonomy or serialized bucket indices. A grouped line's representative type must not replace the actual actor typePath.

`occupants.length == N == admissionCount`. Rows are unique by full id. Enumerate ordinary actors in store order, then lightweight groups/instances in store order; when an actor is also a path, emit only that actor's single preferred path row. Do not sort by current visible category. Each row corresponds **exactly** to pose row i. Repeated calls on the same store/request have the same ordering. Equivalent shells must decode the same ordering; don't require an unrelated save reload to preserve lightweight identity.

| Field | Allowed values / meaning |
| --- | --- |
| id | Full normal instanceName, or `LightweightBuildable:<typePath>:<idx>` using existing current-state indexing; never prefix-stripped |
| typeIndex | integer 0 ≤ value < types.length |
| sourceKind | `actor` or `lightweight` |
| recordKind | `occupant` or `path`; lift is always occupant |
| sizeKind | `named-box`, `clearance-reserve`, `unknown`; classification independent of decorative form |
| poseFlags | integer bitmask, bits 0–3 only, defined below |
| pathState | `not-path` for occupants; `linear` for usable clipped paths; `unavailable` for path origin fallbacks |
| uncertainty | unique strings from `size-unknown`, `scale-unknown`, `orientation-unknown`, `path-unavailable`, `class-reserve-length`; deterministic order as listed here |

`emptyReason` is `DISJOINT_Z` for null bounds, `NO_OCCUPANTS` for a nonempty effective volume with N=0, otherwise null. `types` is empty when N=0; no unused type rows. An empty frame has F=V=0. Every uncertainty required by validity/path state must be present; producers may not hide it by recipe selection. `size-unknown` is required for sizeKind unknown **except** usable linear paths: their source samples supply geometry without a box. `path-unavailable` is required for pathState unavailable. An unavailable path with known reference dimensions still renders as an uncertain location, not a replacement box.

## 5. Pose buffer

Float32 little-endian, **16 floats / 64 bytes per occupant**, indexed by the metadata row:

| Float index | Values | Meaning |
| --- | --- | --- |
| 0…2 | x,y,z | actor origin positionM minus header originM |
| 3…6 | x,y,z,w | raw save quaternion, no flattened yaw; zero slots if invalid |
| 7…9 | x,y,z | signed source scale; zero slots if unreadable, not unit scale |
| 10…12 | w,d,h | full actor-local extentM, not half extents; zero if unknown |
| 13…15 | x,y,z | unscaled actor-local volumeOffsetM from origin to centre; zero if omitted |

poseFlags: bit0 (`1`) quaternion known, bit1 (`2`) scale known, bit2 (`4`) complete extent known, bit3 (`8`) nonzero local offset present. Every cleared field bit requires its entire slot group be +0. Offset omitted with bit3 clear means coincident centre **only if** bit2 is set; without an extent it makes no claim. Bit3 requires bit2. Complete extents are finite and strictly positive; unknown sizeKind requires bit2/bit3 clear; other sizeKinds require bit2. Scale values may be zero or negative if readable. Quaternion is known only if finite and norm > 0; transport retains source values after f32 rounding, computation normalizes a copy. A malformed/missing quaternion triggers orientation-unknown and origin-only rendering/admission, not yaw reconstruction.

All encoded floats must be finite. Invalid/unrepresentable required positions → SOURCE_DATA_INVALID at producer; decoder rejects invalid floats. Every omitted scale/orientation requires corresponding uncertainty. Known reference dimensions may be retained with unknown scale/orientation, but they **must not** produce a world-space reserve or form. Flags are authoritative: a zero slot is not a default value for an absent field.

World reconstruction for supported volumes is `originM + relativePosition + R(scale * (offset + localPoint))`. Extents and offset remain in the actor's local unscaled metre frame. Renderer clipping/visibility uses the same f64-derived interpretation where possible, accepting f32 transport precision but not redoing admission. Membership already happened before f32 conversion.

## 6. Path fragments, vertices and tangent validity

Fragment rows are **4 × u32 / 16 bytes**:

| Index | Meaning |
| --- | --- |
| 0 | occupantIndex, metadata row whose recordKind is path and pathState is linear |
| 1 | firstVertex, zero-based in the vertex array |
| 2 | vertexCount ≥ 1; one means point-only contact |
| 3 | flags = 0 reserved for v1 |

Rows are ordered by occupantIndex then source traversal order. Vertices are densely partitioned by fragments: first fragment starts at 0, each next starts at previous first+count, and the final end equals V. No shared vertices between fragments, no unreferenced vertices, no path fragment for a non-path/unavailable record. Every linear path owns at least one fragment; other records own none. Multiple fragments still count as one occupant. Do not join fragment ends visually.

Vertex rows are **9 × Float32 / 36 bytes**: `[relativeX,relativeY,relativeZ, arriveX,arriveY,arriveZ, leaveX,leaveY,leaveZ]`. Positions are world metres minus header origin; tangents are world metre **vectors**, not positions or normalized directions. Rotate and scale local source tangents with the actor transform; divide source centimetres by 100. Never add translation to a tangent.

One parallel u32 flag per vertex: bit0 arrive tangent present, bit1 leave tangent present, bit2 generated clipping point. Other bits zero. Missing tangents have three +0 slots with the bit clear. Original samples retain independently available tangents; generated boundary intersections have both tangent bits clear and six +0 slots, never interpolated/fabricated tangents. Source samples exactly on a boundary are not generated points. Cables have neither tangent bit. When identical adjacent clipped points coalesce, prefer an identical original sample's flags/tangents; otherwise retain the generated point. For a point contact within a segment set generated bit and omit tangents. v1 uses all traces linearly regardless of tangent availability.

Unknown-scale/orientation paths and paths without usable finite source samples yield `pathState:"unavailable"`, no fragments, an origin-only admission and uncertainty; no chain reconstruction. Any eligible origin that is not finite is SOURCE_DATA_INVALID. Finite but incomplete path geometry is not permission to connect unrelated samples across missing spans: use the whole-actor origin fallback and label path-unavailable.

## 7. Error format and shell normalization

Normalized RegionalError fields are exactly:

```json
{
  "name": "RegionalError",
  "code": "REGION_TOO_LARGE",
  "message": "Region exceeds 8000 occupants",
  "requestId": "regional:1",
  "sessionLost": false,
  "details": {"limit": 8000, "count": 8001, "countKind": "minimum"}
}
```

`requestId` is null only when the request could not be parsed. `details` is an object, never a guessed string. For non-budget errors it is `{}` unless a field below is specified. Do not return a success frame or partial frame for an error.

| Code | Meaning / details | UI behavior |
| --- | --- | --- |
| UNSUPPORTED_SCHEMA | request/frame version not 1; `{receivedVersion: integer}` | require compatible rebuild; keep 2D |
| INVALID_REGION | malformed request or invalid intervals; `{field: string}` | correct delimitation, no allocation |
| NO_SESSION | no ready/loaded save | keep load/2D workflow |
| STALE_SESSION | captured stamp no longer current | silently retire old visit; no old restore |
| CANCELLED | signal/visit retired | silent cleanup |
| REGION_TOO_LARGE | `{limit:8000,count:8001,countKind:"minimum"}` in v1 | UI.dialog with at least count and shrink instruction |
| SOURCE_DATA_INVALID | required eligible origin/encoding invalid; `{id: string or null}` | explain unsupported/corrupt source, no partial scene |
| RESOURCE_EXHAUSTED | checked size overflow, frame >64 MiB or reserve/allocation failure; frame-bound detail `{maxFrameBytes:67108864}` (otherwise `{}`) | keep 2D; suggest smaller region; not automatic LOD |
| INVALID_FRAME | bad header, metadata, flags, offsets or relationships | reject whole scene, compatible-build/retry message |
| VISIBILITY_UNMAPPED | no shared filter authority could be registered; `{typePath:string}` | reject build, do not force-show |
| SESSION_LOST | worker trap/crash or unhealthy native store | sessionLost true; existing load/replay recovery |
| RENDER_FAILED | module/GPU/controls/partial construction failure | dispose partial adapter, keep/return 2D |

Core domain errors cross shell wrappers as `REGIONAL_ERROR:` followed by compact JSON of the normalized object (sessionLost is false for healthy core failures). The worker parses this prefix only on the regional op and fills its existing `{error: ...}` envelope; native invoke rejects with the same prefixed string. SaveClient's regional branch parses/validates this exact prefix and fields; it preserves the established SESSION_LOST handling for all other operations. Unexpected runtime exceptions are mapped to RENDER_FAILED at the adapter, or SESSION_LOST only if the serving session is actually lost; an unexpected healthy core exception is SOURCE_DATA_INVALID with `{id:null}`. Never expose arbitrary messages as a fake known code.

Count short-circuits at 8,001 in v1, so refusal is always a **minimum**. A later exact-count option requires an explicit protocol change; do not silently change the label. A region at 8,000 still can fail for resources, but not for occupant admission. Loss invalidates session stamps even if a pending Promise has already resolved.

## 8. Decoder procedure and transport parity

1. Check current stamp/abort before decode. Read fixed header with DataView; check magic/version/length/count/offset arithmetic, no regional-sized speculative allocation.
2. Decode metadata with fatal UTF-8, reject duplicate keys and validate all shapes, enums, bounds, unique ids/type paths, masks and required uncertainties. JSON.parse alone does not detect duplicate keys: validate with a duplicate-key-aware parse or a lexical duplicate-key pass before ordinary parsing.
3. Validate every numeric section, canonical zero/padding, fragment partition and vertex/occupant relationships. Check expected requestId. Reject before any renderer allocation if any invariant fails.
4. Expose readonly-by-contract typed array views into the owned frame. On a little-endian host these may be direct views; a big-endian host must read LE values into normalized arrays or reject explicitly, never reinterpret silently. Use DataView for the f64 header.
5. Supply the same decoded model to the shared adapter. WASM MUST NOT transfer its linear-memory buffer; native MUST return raw bytes, not a JSON number array. No chunk stash is introduced for regional results; a size/allocation failure is RESOURCE_EXHAUSTED and retains 2D.
6. Tests compare semantic decoded records with f32 rounding, exact masks/ids/fragments and f64 region/origin. Metadata key order is not a parity criterion. The core encoder golden frames are byte-exact.

## 9. Executable reference vectors

[Canonical vectors](../validation/regional-scene-v1-vectors.json) include named-box, unreadable-scale, multi-fragment path and disjoint empty frames, plus a non-ASCII identity/label to pin **UTF-8 byte lengths**. The [documentation validator](../validation/check_viewer_integration.py) builds each frame using the section formulas and checks pinned offsets, header/numeric hex and total sizes. It does not implement a production extractor/decoder or prove spatial fidelity. Producer/consumer implementations must consume these vectors and add malformed, count-boundary, mutation and shell tests specified in [exit criteria](viewer-exit-criteria.md).
