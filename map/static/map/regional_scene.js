// Detached regional scene adapter. Camera, batches, lifetime.
// Integration map SceneHandle. Not product entry and not a save API.

import * as THREE from "./vendor/three.module.min.js";
import { OrbitControls } from "./vendor/OrbitControls.js";
import {
  classifyOccupant,
  recipeParts,
  occupantAabb,
  LEGEND_TEXT,
  visualLegendEntries,
  NEUTRAL_RESERVE_COLOR,
  UNCERTAIN_MARKER_COLOR,
} from "./regional_forms.js";

const LIVE = {
  canvases: 0,
  controls: 0,
  listeners: 0,
  observers: 0,
  raf: 0,
  geometries: 0,
  materials: 0,
  renderers: 0,
  decodedRefs: 0,
  attrAllocs: 0,
};

let injectedFailure = null;

export function setRegionalSceneTestFailure(step) {
  injectedFailure = step || null;
}

export function regionalSceneLiveResources() {
  return {
    canvases: LIVE.canvases,
    controls: LIVE.controls,
    listeners: LIVE.listeners,
    observers: LIVE.observers,
    raf: LIVE.raf,
    geometries: LIVE.geometries,
    materials: LIVE.materials,
    renderers: LIVE.renderers,
    decodedRefs: LIVE.decodedRefs,
    attrAllocs: LIVE.attrAllocs,
  };
}

function regionalError(code, message, details) {
  const error = new Error(message);
  error.name = "RegionalError";
  error.code = code;
  error.requestId = null;
  error.sessionLost = false;
  error.details = details || {};
  return error;
}

function mapBuildError(error) {
  if (error && error.name === "RegionalError" && error.code) {
    return error;
  }
  return regionalError("RENDER_FAILED", String(error && error.message || error || "Scene construction failed"));
}

function throwIfAborted(signal) {
  if (signal && signal.aborted) {
    throw regionalError("CANCELLED", "Regional scene construction was cancelled");
  }
}

function throwIfInjected(step) {
  if (injectedFailure === step) {
    injectedFailure = null;
    throw regionalError("RENDER_FAILED", "Injected " + step + " failure");
  }
}

class Ledger {
  constructor() {
    this.items = [];
    this.disposed = false;
  }

  add(kind, resource, disposeFn) {
    LIVE[kind] = (LIVE[kind] || 0) + 1;
    const item = { kind, resource, disposeFn, live: true };
    this.items.push(item);
    return resource;
  }

  _drop(item) {
    if (!item.live) {
      return;
    }
    item.live = false;
    try {
      item.disposeFn(item.resource);
    } catch (error) {
      /* disposal is best-effort and idempotent */
    }
    LIVE[item.kind] = Math.max(0, (LIVE[item.kind] || 0) - 1);
  }

  dispose() {
    for (let i = this.items.length - 1; i >= 0; i--) {
      this._drop(this.items[i]);
    }
    this.disposed = true;
  }
}

function listen(ledger, target, type, handler, options) {
  target.addEventListener(type, handler, options);
  ledger.add("listeners", { target, type, handler, options }, (item) => {
    item.target.removeEventListener(item.type, item.handler, item.options);
  });
}

function geometryFromPositions(kind, positions) {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (kind === "solid") {
    geom.computeVertexNormals();
  }
  return geom;
}

function poseMatrix(pose, target) {
  const tPos = new THREE.Matrix4().makeTranslation(pose[0], pose[1], pose[2]);
  const quat = new THREE.Quaternion(pose[3], pose[4], pose[5], pose[6]);
  if (quat.lengthSq() > 0) {
    quat.normalize();
  } else {
    quat.identity();
  }
  const r = new THREE.Matrix4().makeRotationFromQuaternion(quat);
  const sS = new THREE.Matrix4().makeScale(pose[7], pose[8], pose[9]);
  const tOff = new THREE.Matrix4().makeTranslation(pose[13], pose[14], pose[15]);
  const sE = new THREE.Matrix4().makeScale(pose[10], pose[11], pose[12]);
  return target.copy(tPos).multiply(r).multiply(sS).multiply(tOff).multiply(sE);
}

function handedness(pose) {
  return pose[7] * pose[8] * pose[9] < 0 ? "mirror" : "right";
}

function regionFrame(model) {
  const target = [0, 0, 0];
  if (!model.effectiveBoundsM) {
    return {
      target,
      frameMin: [-0.5, -0.5, -0.5],
      frameMax: [0.5, 0.5, 0.5],
      rawMin: [0, 0, 0],
      rawMax: [0, 0, 0],
      empty: true,
    };
  }
  const origin = model.originM;
  const rawMin = [
    model.effectiveBoundsM.min[0] - origin[0],
    model.effectiveBoundsM.min[1] - origin[1],
    model.effectiveBoundsM.min[2] - origin[2],
  ];
  const rawMax = [
    model.effectiveBoundsM.max[0] - origin[0],
    model.effectiveBoundsM.max[1] - origin[1],
    model.effectiveBoundsM.max[2] - origin[2],
  ];
  const mid = [
    (rawMin[0] + rawMax[0]) / 2,
    (rawMin[1] + rawMax[1]) / 2,
    (rawMin[2] + rawMax[2]) / 2,
  ];
  const frameMin = rawMin.slice();
  const frameMax = rawMax.slice();
  for (let i = 0; i < 3; i++) {
    if (frameMax[i] - frameMin[i] < 1) {
      frameMin[i] = mid[i] - 0.5;
      frameMax[i] = mid[i] + 0.5;
    }
  }
  return { target: mid, frameMin, frameMax, rawMin, rawMax, empty: false };
}

function fitCamera(camera, controls, frame, aspect) {
  const vFov = THREE.MathUtils.degToRad(45);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * Math.max(aspect, 1e-6));
  const dir = new THREE.Vector3(1, -1, 1).normalize();
  const target = new THREE.Vector3(frame.target[0], frame.target[1], frame.target[2]);
  const up = new THREE.Vector3(0, 0, 1);
  const right = new THREE.Vector3().crossVectors(dir, up);
  if (right.lengthSq() < 1e-12) {
    right.set(0, 1, 0);
  }
  right.normalize();
  const camUp = new THREE.Vector3().crossVectors(right, dir).normalize();
  const corners = [];
  for (const x of [frame.frameMin[0], frame.frameMax[0]]) {
    for (const y of [frame.frameMin[1], frame.frameMax[1]]) {
      for (const z of [frame.frameMin[2], frame.frameMax[2]]) {
        corners.push(new THREE.Vector3(x, y, z));
      }
    }
  }
  let dist = 1;
  corners.forEach((corner) => {
    const v = corner.clone().sub(target);
    const depth = v.dot(dir);
    const x = v.dot(right);
    const y = v.dot(camUp);
    dist = Math.max(
      dist,
      Math.abs(x) / Math.tan(hFov / 2) + depth,
      Math.abs(y) / Math.tan(vFov / 2) + depth,
    );
  });
  dist *= 1.15;
  const position = target.clone().add(dir.clone().multiplyScalar(dist));
  camera.up.copy(up);
  camera.position.copy(position);
  camera.lookAt(target);
  camera.fov = 45;
  camera.aspect = aspect;
  let near = dist;
  let far = dist;
  corners.forEach((corner) => {
    const camSpace = corner.clone().sub(position);
    const look = target.clone().sub(position).normalize();
    const z = camSpace.dot(look);
    near = Math.min(near, z);
    far = Math.max(far, z);
  });
  camera.near = Math.max(0.05, near * 0.5);
  camera.far = Math.max(camera.near * 20, far * 2);
  camera.updateProjectionMatrix();
  controls.target.copy(target);
  controls.update();
  return { target: target.clone(), position: position.clone(), dist };
}

function aabbIntersectsZ(aabb, zRange) {
  if (!zRange) {
    return true;
  }
  return aabb.max[2] >= zRange.min && aabb.min[2] <= zRange.max;
}

function originInZ(pose, zRange) {
  if (!zRange) {
    return true;
  }
  return pose[2] >= zRange.min && pose[2] <= zRange.max;
}

function allocDynamicAttr(capacityFloats, itemSize) {
  const attr = new THREE.Float32BufferAttribute(
    new Float32Array(Math.max(capacityFloats, itemSize)),
    itemSize,
  );
  attr.setUsage(THREE.DynamicDrawUsage);
  LIVE.attrAllocs++;
  attr._regionalStamp = "a" + LIVE.attrAllocs;
  return attr;
}

function writeDynamicBuffers(geom, positions, colors) {
  const needPos = Math.max(positions.length, 3);
  const needCol = colors ? Math.max(colors.length, 3) : 0;
  const pos = geom.getAttribute("position");
  const col = colors ? geom.getAttribute("color") : null;
  const fits = pos && pos.array.length >= needPos && (!colors || (col && col.array.length >= needCol));
  if (!fits) {
    geom.dispose();
    geom.setAttribute("position", allocDynamicAttr(needPos, 3));
    if (colors) {
      geom.setAttribute("color", allocDynamicAttr(needCol, 3));
    }
  }
  const posAttr = geom.getAttribute("position");
  posAttr.array.set(positions);
  if (positions.length < posAttr.array.length) {
    posAttr.array.fill(0, positions.length);
  }
  posAttr.needsUpdate = true;
  if (colors) {
    const colAttr = geom.getAttribute("color");
    colAttr.array.set(colors);
    if (colors.length < colAttr.array.length) {
      colAttr.array.fill(0, colors.length);
    }
    colAttr.needsUpdate = true;
  }
  geom.setDrawRange(0, Math.floor(positions.length / 3));
  if (positions.length >= 3) {
    geom.computeBoundingSphere();
  }
}

function clipSegmentZ(a, b, zRange) {
  if (!zRange) {
    return [a, b];
  }
  const z0 = a[2];
  const z1 = b[2];
  const min = zRange.min;
  const max = zRange.max;
  const in0 = z0 >= min && z0 <= max;
  const in1 = z1 >= min && z1 <= max;
  if (in0 && in1) {
    return [a, b];
  }
  if (z0 === z1) {
    return in0 ? [a, b] : null;
  }
  const points = [];
  const tHits = [];
  const consider = (bound) => {
    const t = (bound - z0) / (z1 - z0);
    if (t >= 0 && t <= 1) {
      tHits.push(t);
    }
  };
  consider(min);
  consider(max);
  if (in0) {
    points.push({ t: 0, p: a });
  }
  tHits.sort((x, y) => x - y);
  tHits.forEach((t) => {
    const p = [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ];
    if (p[2] >= min && p[2] <= max) {
      points.push({ t, p });
    }
  });
  if (in1) {
    points.push({ t: 1, p: b });
  }
  if (points.length < 2) {
    return null;
  }
  return [points[0].p, points[points.length - 1].p];
}

function markerTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 64, 64);
  ctx.strokeStyle = UNCERTAIN_MARKER_COLOR;
  ctx.fillStyle = "rgba(20, 22, 26, 0.85)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(32, 6);
  ctx.lineTo(58, 32);
  ctx.lineTo(32, 58);
  ctx.lineTo(6, 32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(20, 20);
  ctx.lineTo(44, 44);
  ctx.moveTo(44, 20);
  ctx.lineTo(20, 44);
  ctx.stroke();
  ctx.fillStyle = UNCERTAIN_MARKER_COLOR;
  ctx.font = "bold 18px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("?", 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function statusFor(model, records, mask, zRange) {
  const admitted = model.occupants.length;
  let visible = 0;
  let reserves = 0;
  const uncertain = { size: 0, scale: 0, orientation: 0, path: 0 };
  records.forEach((record) => {
    if (record.classification.sizeKind === "clearance-reserve") {
      reserves++;
    }
    const u = record.occupant.uncertainty || [];
    if (u.indexOf("size-unknown") >= 0) uncertain.size++;
    if (u.indexOf("scale-unknown") >= 0) uncertain.scale++;
    if (u.indexOf("orientation-unknown") >= 0) uncertain.orientation++;
    if (u.indexOf("path-unavailable") >= 0) uncertain.path++;
    if (record.drawn) {
      visible++;
    }
  });
  void mask;
  void zRange;
  let status = "";
  if (admitted === 0) {
    status = "No eligible occupants intersect this region.";
    if (model.emptyReason === "DISJOINT_Z") {
      status += " The Cut band and altitude cap do not overlap.";
    }
  } else if (visible === 0) {
    status = "No loaded occupants are visible. Check categories, hidden objects or the visual Z range.";
  }
  const summary = [
    "Admitted " + admitted,
    "visible " + visible,
    "reserves " + reserves,
    "size-uncertain " + uncertain.size,
    "scale-uncertain " + uncertain.scale,
    "orientation-uncertain " + uncertain.orientation,
    "path-uncertain " + uncertain.path,
    "(uncertainty counts overlap and are not additive)",
  ].join(" · ");
  return { status, summary, admitted, visible, reserves, uncertain };
}

export async function createRegionalScene(options) {
  const opts = options || {};
  const host = opts.host;
  const model = opts.model;
  const signal = opts.signal;
  const onFailure = opts.onFailure;
  const ledger = new Ledger();
  try {
    throwIfAborted(signal);
    throwIfInjected("import");
    if (!model || !model.occupants || !model.poses) {
      throw regionalError("RENDER_FAILED", "Missing decoded regional model");
    }
    ledger.add("decodedRefs", model, () => {});
    await Promise.resolve();
    throwIfAborted(signal);
    throwIfInjected("context");

    const root = document.createElement("div");
    root.className = "regionalSceneRoot";
    const canvas = document.createElement("canvas");
    canvas.className = "regionalSceneCanvas";
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", "Regional 3D view");
    canvas.setAttribute("role", "application");
    canvas.setAttribute(
      "aria-describedby",
      "regional-scene-legend regional-scene-help regional-scene-summary",
    );
    ledger.add("canvases", canvas, (node) => {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });
    const hud = document.createElement("div");
    hud.className = "regionalSceneHud";
    const legend = document.createElement("p");
    legend.className = "kicker";
    legend.id = "regional-scene-legend";
    legend.textContent = LEGEND_TEXT;
    const visualList = document.createElement("ul");
    visualList.className = "regionalSceneLegendList";
    visualLegendEntries().forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = entry.label + " — " + entry.structure;
      visualList.appendChild(item);
    });
    const summary = document.createElement("p");
    summary.className = "regionalSceneSummary";
    summary.id = "regional-scene-summary";
    const status = document.createElement("p");
    status.className = "regionalSceneStatus";
    status.setAttribute("aria-live", "polite");
    const help = document.createElement("p");
    help.className = "regionalSceneHelp";
    help.id = "regional-scene-help";
    help.textContent = "Keyboard: arrows orbit, Shift+arrows pan, +/− dolly, Home reset. Keys apply only while the canvas is focused.";
    hud.appendChild(legend);
    hud.appendChild(visualList);
    hud.appendChild(summary);
    hud.appendChild(status);
    hud.appendChild(help);
    root.appendChild(canvas);
    root.appendChild(hud);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    ledger.add("renderers", renderer, (gpu) => {
      if (typeof gpu.forceContextLoss === "function") {
        gpu.forceContextLoss();
      }
      gpu.dispose();
    });
    throwIfInjected("shader");
    if (!renderer.getContext()) {
      throw regionalError("RENDER_FAILED", "WebGL context was not created");
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x131519);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.up.set(0, 0, 1);
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(1, -1, 1);
    scene.add(ambient);
    scene.add(key);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = false;
    controls.autoRotate = false;
    controls.enablePan = true;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.PAN,
      RIGHT: THREE.MOUSE.PAN,
    };
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    ledger.add("controls", controls, (item) => item.dispose());
    throwIfInjected("controls");

    const frame = regionFrame(model);
    const records = model.occupants.map((occupant, index) => {
      const pose = model.poses.subarray(index * 16, index * 16 + 16);
      const typeRow = model.types[occupant.typeIndex];
      const classification = classifyOccupant(occupant, typeRow);
      const volume = classification.visual === "uncertain-marker" || classification.visual === "static-path"
        ? null
        : occupantAabb(pose);
      return {
        occupant,
        pose,
        classification,
        aabb: volume,
        maskVisible: true,
        zVisible: true,
        drawn: true,
        batchKeys: [],
        matrix: new THREE.Matrix4(),
      };
    });
    records.forEach((record) => {
      if (record.classification.visual !== "static-path" && record.classification.visual !== "uncertain-marker") {
        poseMatrix(record.pose, record.matrix);
      }
    });

    const solidBatches = new Map();
    const lineParts = [];
    function obtainSolid(key, positions, color) {
      if (solidBatches.has(key)) {
        return solidBatches.get(key);
      }
      const geom = geometryFromPositions("solid", positions);
      ledger.add("geometries", geom, (item) => item.dispose());
      const material = new THREE.MeshLambertMaterial({
        color,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
      });
      ledger.add("materials", material, (item) => item.dispose());
      const mesh = new THREE.InstancedMesh(geom, material, Math.max(1, records.length));
      mesh.frustumCulled = false;
      mesh.count = 0;
      scene.add(mesh);
      const batch = { key, kind: "solid", mesh, indices: [] };
      solidBatches.set(key, batch);
      return batch;
    }

    records.forEach((record, index) => {
      const visual = record.classification.visual;
      if (visual === "static-path" || visual === "uncertain-marker") {
        return;
      }
      const parts = recipeParts(record.classification.recipeId);
      const hand = handedness(record.pose);
      parts.forEach((item) => {
        const isEnvelope = item.name === "envelope" || item.kind === "wire";
        const color = isEnvelope && record.classification.envelope
          ? NEUTRAL_RESERVE_COLOR
          : record.classification.color;
        const key = [record.classification.recipeId, item.name, hand, color, item.kind].join("|");
        record.batchKeys.push(key);
        if (item.kind === "solid") {
          obtainSolid(key, item.positions, color).indices.push(index);
        } else {
          lineParts.push({ index, positions: item.positions, color, key });
        }
      });
    });

    const formCap = Math.max(3, lineParts.reduce((n, part) => n + part.positions.length, 0));
    const markerCap = Math.max(3, records.length * 3);
    const pathCap = Math.max(3, model.counts.vertices * 6);
    const contactCap = Math.max(3, model.counts.vertices * 3);

    function bindDynamicGeometry(capacity, withColor) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", allocDynamicAttr(capacity, 3));
      if (withColor) {
        geom.setAttribute("color", allocDynamicAttr(capacity, 3));
      }
      geom.setDrawRange(0, 0);
      ledger.add("geometries", geom, (item) => item.dispose());
      return geom;
    }

    const formLineMat = new THREE.LineBasicMaterial({ vertexColors: true });
    ledger.add("materials", formLineMat, (item) => item.dispose());
    const formLineGeom = bindDynamicGeometry(formCap, true);
    const formLines = new THREE.LineSegments(formLineGeom, formLineMat);
    formLines.frustumCulled = false;
    scene.add(formLines);

    const markerTex = markerTexture();
    ledger.add("materials", markerTex, (item) => item.dispose());
    const markerMat = new THREE.PointsMaterial({
      map: markerTex,
      size: 18,
      sizeAttenuation: false,
      transparent: true,
      depthTest: false,
      color: 0xffffff,
    });
    ledger.add("materials", markerMat, (item) => item.dispose());
    const markerGeom = bindDynamicGeometry(markerCap, false);
    const markers = new THREE.Points(markerGeom, markerMat);
    markers.frustumCulled = false;
    scene.add(markers);

    const contactMat = new THREE.PointsMaterial({
      color: UNCERTAIN_MARKER_COLOR,
      size: 10,
      sizeAttenuation: false,
      depthTest: false,
    });
    ledger.add("materials", contactMat, (item) => item.dispose());
    const contactGeom = bindDynamicGeometry(contactCap, false);
    const contacts = new THREE.Points(contactGeom, contactMat);
    contacts.frustumCulled = false;
    scene.add(contacts);

    const pathMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 1,
    });
    ledger.add("materials", pathMat, (item) => item.dispose());
    const pathGeom = bindDynamicGeometry(pathCap, true);
    const pathLines = new THREE.LineSegments(pathGeom, pathMat);
    pathLines.frustumCulled = false;
    scene.add(pathLines);

    const outlinePositions = [];
    const omin = frame.rawMin;
    const omax = frame.rawMax;
    const oc = [
      [omin[0], omin[1], omin[2]], [omax[0], omin[1], omin[2]],
      [omax[0], omax[1], omin[2]], [omin[0], omax[1], omin[2]],
      [omin[0], omin[1], omax[2]], [omax[0], omin[1], omax[2]],
      [omax[0], omax[1], omax[2]], [omin[0], omax[1], omax[2]],
    ];
    [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
      .forEach(([a, b]) => {
        outlinePositions.push(oc[a][0], oc[a][1], oc[a][2], oc[b][0], oc[b][1], oc[b][2]);
      });
    const outlineGeom = new THREE.BufferGeometry();
    outlineGeom.setAttribute("position", new THREE.Float32BufferAttribute(outlinePositions, 3));
    ledger.add("geometries", outlineGeom, (item) => item.dispose());
    const outlineMat = new THREE.LineBasicMaterial({ color: 0x5ba3e0, transparent: true, opacity: 0.45 });
    ledger.add("materials", outlineMat, (item) => item.dispose());
    scene.add(new THREE.LineSegments(outlineGeom, outlineMat));

    let visibilityMask = opts.visibility || {};
    let visualZ = null;
    let raf = 0;
    let attached = false;
    let observer = null;
    let home = null;
    let contextLost = false;
    const scratch = new THREE.Vector3();
    const lineColor = new THREE.Color();

    function stopRaf() {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
        LIVE.raf = Math.max(0, LIVE.raf - 1);
      }
    }
    ledger.add("raf", { stop: stopRaf }, (item) => item.stop());

    function invalidate() {
      if (ledger.disposed || contextLost || raf) {
        return;
      }
      LIVE.raf++;
      raf = requestAnimationFrame(() => {
        LIVE.raf = Math.max(0, LIVE.raf - 1);
        raf = 0;
        if (ledger.disposed || contextLost) {
          return;
        }
        try {
          renderer.render(scene, camera);
        } catch (error) {
          contextLost = true;
          if (typeof onFailure === "function") {
            onFailure(mapBuildError(error));
          }
        }
      });
    }

    function hostSize() {
      const width = (host && host.clientWidth) || 64;
      const height = (host && host.clientHeight) || 64;
      return { width: Math.max(32, width), height: Math.max(32, height) };
    }

    function applyCameraFit() {
      const size = hostSize();
      const aspect = size.width / size.height;
      home = fitCamera(camera, controls, frame, aspect);
      renderer.setSize(size.width, size.height, false);
    }

    function rebuildDrawing() {
      records.forEach((record) => {
        const maskVisible = visibilityMask[record.occupant.id] !== false;
        let zVisible = true;
        if (record.classification.visual === "uncertain-marker") {
          zVisible = originInZ(record.pose, visualZ);
        } else if (record.classification.visual === "static-path") {
          zVisible = visualZ == null;
        } else if (record.aabb) {
          zVisible = aabbIntersectsZ(record.aabb, visualZ);
        }
        record.maskVisible = maskVisible;
        record.zVisible = zVisible;
        record.drawn = maskVisible && zVisible;
      });

      solidBatches.forEach((batch) => {
        let count = 0;
        batch.indices.forEach((index) => {
          const record = records[index];
          if (record.drawn) {
            batch.mesh.setMatrixAt(count, record.matrix);
            count++;
          }
        });
        batch.mesh.count = count;
        batch.mesh.instanceMatrix.needsUpdate = true;
        batch.mesh.visible = count > 0;
      });

      const formPos = [];
      const formCol = [];
      lineParts.forEach((part) => {
        const record = records[part.index];
        if (!record.drawn) {
          return;
        }
        lineColor.set(part.color);
        const pos = part.positions;
        for (let i = 0; i + 5 < pos.length; i += 6) {
          scratch.set(pos[i], pos[i + 1], pos[i + 2]).applyMatrix4(record.matrix);
          formPos.push(scratch.x, scratch.y, scratch.z);
          scratch.set(pos[i + 3], pos[i + 4], pos[i + 5]).applyMatrix4(record.matrix);
          formPos.push(scratch.x, scratch.y, scratch.z);
          formCol.push(
            lineColor.r, lineColor.g, lineColor.b,
            lineColor.r, lineColor.g, lineColor.b,
          );
        }
      });
      writeDynamicBuffers(formLineGeom, formPos, formCol);
      formLines.visible = formPos.length > 0;

      const markerPos = [];
      records.forEach((record) => {
        if (record.classification.visual === "uncertain-marker" && record.drawn) {
          markerPos.push(record.pose[0], record.pose[1], record.pose[2]);
        }
      });
      writeDynamicBuffers(markerGeom, markerPos, null);
      markers.visible = markerPos.length > 0;

      const linePos = [];
      const lineCol = [];
      const contactPos = [];
      const pathInZ = new Set();
      const color = new THREE.Color();
      for (let f = 0; f < model.counts.fragments; f++) {
        const owner = model.fragments[f * 4];
        const first = model.fragments[f * 4 + 1];
        const count = model.fragments[f * 4 + 2];
        const record = records[owner];
        if (!record || record.classification.visual !== "static-path") {
          continue;
        }
        color.set(record.classification.color);
        const verts = [];
        for (let i = 0; i < count; i++) {
          const base = (first + i) * 9;
          verts.push([model.vertices[base], model.vertices[base + 1], model.vertices[base + 2]]);
        }
        if (count === 1) {
          const p = verts[0];
          if (!visualZ || (p[2] >= visualZ.min && p[2] <= visualZ.max)) {
            pathInZ.add(record.occupant.id);
            if (record.maskVisible) {
              contactPos.push(p[0], p[1], p[2]);
            }
          }
        } else {
          for (let i = 0; i < verts.length - 1; i++) {
            const clipped = clipSegmentZ(verts[i], verts[i + 1], visualZ);
            if (!clipped) {
              continue;
            }
            pathInZ.add(record.occupant.id);
            if (!record.maskVisible) {
              continue;
            }
            linePos.push(
              clipped[0][0], clipped[0][1], clipped[0][2],
              clipped[1][0], clipped[1][1], clipped[1][2],
            );
            lineCol.push(color.r, color.g, color.b, color.r, color.g, color.b);
          }
        }
      }
      records.forEach((record) => {
        if (record.classification.visual !== "static-path") {
          return;
        }
        if (visualZ) {
          record.zVisible = pathInZ.has(record.occupant.id);
        }
        record.drawn = record.maskVisible && record.zVisible;
      });
      writeDynamicBuffers(pathGeom, linePos, lineCol);
      pathLines.visible = linePos.length > 0;
      writeDynamicBuffers(contactGeom, contactPos, null);
      contacts.visible = contactPos.length > 0;

      const readout = statusFor(model, records, visibilityMask, visualZ);
      summary.textContent = readout.summary;
      status.textContent = readout.status;
    }

    applyCameraFit();
    rebuildDrawing();

    listen(ledger, controls, "change", invalidate);
    listen(ledger, canvas, "webglcontextlost", (event) => {
      event.preventDefault();
      contextLost = true;
      stopRaf();
      if (typeof onFailure === "function") {
        onFailure(regionalError("RENDER_FAILED", "WebGL context lost"));
      }
    });
    listen(ledger, canvas, "keydown", (event) => {
      if (ledger.disposed) {
        return;
      }
      const step = 0.08;
      let handled = true;
      if (event.key === "Home") {
        handle.resetCamera();
      } else if (event.key === "+" || event.key === "=") {
        dollyBy(0.92);
      } else if (event.key === "-" || event.key === "_") {
        dollyBy(1.08);
      } else if (event.key === "ArrowLeft") {
        event.shiftKey ? panBy(-1, 0) : rotateBy(step, 0);
      } else if (event.key === "ArrowRight") {
        event.shiftKey ? panBy(1, 0) : rotateBy(-step, 0);
      } else if (event.key === "ArrowUp") {
        event.shiftKey ? panBy(0, 1) : rotateBy(0, step);
      } else if (event.key === "ArrowDown") {
        event.shiftKey ? panBy(0, -1) : rotateBy(0, -step);
      } else {
        handled = false;
      }
      if (handled) {
        event.preventDefault();
        invalidate();
      }
    });

    const yUp = new THREE.Vector3(0, 1, 0);
    function rotateBy(az, pol) {
      const quat = new THREE.Quaternion().setFromUnitVectors(camera.up, yUp);
      const quatInverse = quat.clone().invert();
      const offset = camera.position.clone().sub(controls.target);
      offset.applyQuaternion(quat);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta += az;
      spherical.phi = THREE.MathUtils.clamp(spherical.phi - pol, 0.05, Math.PI - 0.05);
      spherical.makeSafe();
      offset.setFromSpherical(spherical);
      offset.applyQuaternion(quatInverse);
      camera.position.copy(controls.target).add(offset);
      camera.lookAt(controls.target);
      controls.update();
    }

    function panBy(dx, dy) {
      const distance = camera.position.distanceTo(controls.target);
      const panScale = Math.max(0.2, distance * 0.04);
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1);
      const delta = right.multiplyScalar(dx * panScale).add(up.multiplyScalar(dy * panScale));
      camera.position.add(delta);
      controls.target.add(delta);
      controls.update();
    }

    function dollyBy(factor) {
      const offset = camera.position.clone().sub(controls.target);
      offset.multiplyScalar(factor);
      camera.position.copy(controls.target).add(offset);
      controls.update();
    }

    const handle = {
      attach() {
        if (ledger.disposed) {
          return;
        }
        if (host && root.parentNode !== host) {
          host.appendChild(root);
        }
        attached = true;
        if (!observer && typeof ResizeObserver === "function" && host) {
          observer = new ResizeObserver(() => handle.resize());
          observer.observe(host);
          ledger.add("observers", observer, (item) => item.disconnect());
        }
        handle.resize();
        canvas.focus();
        invalidate();
      },
      setVisibility(mask) {
        if (ledger.disposed) {
          return;
        }
        visibilityMask = mask || {};
        rebuildDrawing();
        invalidate();
      },
      setVisualZ(range) {
        if (ledger.disposed) {
          return;
        }
        visualZ = range && Number.isFinite(range.min) && Number.isFinite(range.max)
          ? { min: range.min, max: range.max }
          : null;
        rebuildDrawing();
        invalidate();
      },
      resetCamera() {
        if (ledger.disposed) {
          return;
        }
        applyCameraFit();
        invalidate();
      },
      resize() {
        if (ledger.disposed) {
          return;
        }
        const size = hostSize();
        camera.aspect = size.width / size.height;
        camera.updateProjectionMatrix();
        renderer.setSize(size.width, size.height, false);
        invalidate();
      },
      dispose() {
        stopRaf();
        if (root.parentNode) {
          root.parentNode.removeChild(root);
        }
        scene.traverse((obj) => {
          if (obj.geometry && obj.geometry.dispose && !obj.geometry._regionalDropped) {
            /* geometries tracked in the ledger */
          }
        });
        renderer.renderLists && renderer.renderLists.dispose && renderer.renderLists.dispose();
        ledger.dispose();
        attached = false;
      },
      inspect() {
        const attrId = (geom) => {
          const attr = geom && geom.getAttribute("position");
          return attr && attr._regionalStamp ? attr._regionalStamp : null;
        };
        return {
          attached,
          live: regionalSceneLiveResources(),
          legend: legend.textContent,
          summary: summary.textContent,
          status: status.textContent,
          attrAllocs: LIVE.attrAllocs,
          drawing: {
            form: attrId(formLineGeom),
            marker: attrId(markerGeom),
            path: attrId(pathGeom),
            contact: attrId(contactGeom),
          },
          camera: {
            up: [camera.up.x, camera.up.y, camera.up.z],
            position: [camera.position.x, camera.position.y, camera.position.z],
            target: [controls.target.x, controls.target.y, controls.target.z],
          },
          occupants: records.map((record) => ({
            id: record.occupant.id,
            visual: record.classification.visual,
            recipeId: record.classification.recipeId,
            label: record.classification.label,
            envelope: record.classification.envelope,
            cue: record.classification.cue,
            sizeKind: record.classification.sizeKind,
            drawn: record.drawn,
            zVisible: record.zVisible,
            matrix: Array.from(record.matrix.elements),
          })),
          batches: Array.from(solidBatches.values()).map((batch) => ({
            key: batch.key,
            kind: batch.kind,
            count: batch.mesh.count,
          })),
        };
      },
    };

    throwIfAborted(signal);
    return handle;
  } catch (error) {
    ledger.dispose();
    throw mapBuildError(error);
  }
}
