"""Opt-in renderer contracts; run with --suite renderer.

Synthetic geometry fixtures cover clipping, forms, camera limits and disposal.
"""

def run(page, check):
    # ---- Regional renderer kit (HEC-08/09), test-only detached host ----------
    # Frozen protocol/form fixtures drive the adapter. This is not product
    # entry, not a replacement save API, and not actual-save geometry acceptance.
    leafletBefore = page.evaluate("""() => ({
      ready: !!(window.SaveClient && SaveClient.isReady()),
      gl: !!(MapApp.layer && MapApp.layer._gl) && !MapApp.layer._gl.isContextLost()
    })""")
    kit = page.evaluate("""async () => {
      const fails = [];
      const fail = (name, detail) => { fails.push(name + (detail ? ': ' + detail : '')); };
      const liveZero = (live, label) => {
        const keys = ['canvases','controls','listeners','observers','raf','geometries','materials','renderers','decodedRefs'];
        const leftover = keys.filter((k) => (live && live[k]) > 0);
        if (leftover.length) fail(label, JSON.stringify(live));
      };
      try {
        const sceneMod = await import('/regional_scene.js');
        const formsMod = await import('/regional_forms.js');
        const { createRegionalScene, setRegionalSceneTestFailure, regionalSceneLiveResources } = sceneMod;
        const host = document.createElement('div');
        host.id = 'regionalSceneTestHost';
        host.style.cssText = 'position:fixed;left:8px;top:8px;width:480px;height:320px;z-index:20;pointer-events:auto;';
        document.body.appendChild(host);

        const pose = new Float32Array([-4, -4, -2, 0, 0, 0, 1, 1, 1, 1, 8, 8, 4, 0, 0, 2]);
        const poseSmelter = new Float32Array([4, 0, 0, 0, 0, 0, 1, 1, 1, 1, 5, 10, 4.5, 0, 0, 0]);
        const poseUnknown = new Float32Array([0, 4, 0, 0, 0, 0, 1, 0, 0, 0, 8, 8, 4, 0, 0, 0]);
        const posePath = new Float32Array([-8, -8, -10, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]);
        const poses = new Float32Array(16 * 4);
        poses.set(pose, 0);
        poses.set(poseSmelter, 16);
        poses.set(poseUnknown, 32);
        poses.set(posePath, 48);
        const model = {
          schemaVersion: 1, requestId: 'regional:kit', originM: [0, 0, 0],
          effectiveBoundsM: { min: [-16, -16, -8], max: [16, 16, 16] },
          emptyReason: null,
          types: [
            { typePath: '/Game/FactoryGame/Buildable/Building/Foundation.Build_Foundation_8x4_01_C', label: 'Foundation', category: 'Foundation', subcategory: 'Floors' },
            { typePath: '/Game/FactoryGame/Buildable/Factory/SmelterMk1.Build_SmelterMk1_C', label: 'Smelter', category: 'Production', subcategory: null },
            { typePath: '/Game/FactoryGame/Buildable/Factory/MinerMk1.Build_MinerMk1_C', label: 'Miner', category: 'Production', subcategory: null },
            { typePath: '/Game/FactoryGame/Buildable/Factory/ConveyorBeltMk1.Build_ConveyorBeltMk1_C', label: 'Belt', category: 'Logistics', subcategory: null }
          ],
          occupants: [
            { id: 'F1', typeIndex: 0, sourceKind: 'actor', recordKind: 'occupant', sizeKind: 'named-box', poseFlags: 15, pathState: 'not-path', uncertainty: [] },
            { id: 'S1', typeIndex: 1, sourceKind: 'actor', recordKind: 'occupant', sizeKind: 'clearance-reserve', poseFlags: 7, pathState: 'not-path', uncertainty: [] },
            { id: 'U1', typeIndex: 2, sourceKind: 'lightweight', recordKind: 'occupant', sizeKind: 'named-box', poseFlags: 13, pathState: 'not-path', uncertainty: ['scale-unknown'] },
            { id: 'P1', typeIndex: 3, sourceKind: 'actor', recordKind: 'path', sizeKind: 'unknown', poseFlags: 3, pathState: 'linear', uncertainty: [] }
          ],
          poses,
          fragments: new Uint32Array([3, 0, 2, 0]),
          vertices: new Float32Array([-8, -6, -5, 0, 0, 0, 0, 0, 0, 8, -6, -5, 0, 0, 0, 0, 0, 0]),
          vertexFlags: new Uint32Array([4, 4]),
          bytes: new Uint8Array(0),
          counts: { occupants: 4, fragments: 1, vertices: 2 }
        };

        const classified = model.occupants.map((row, i) => formsMod.classifyOccupant(row, model.types[row.typeIndex]));
        if (classified[0].visual !== 'named-form') fail('hec09-floor', classified[0].visual);
        if (!(classified[1].visual === 'reserve-cue' && classified[1].envelope && classified[1].cue)) fail('hec09-smelter');
        if (classified[2].visual !== 'uncertain-marker') fail('hec09-scale');
        if (classified[3].visual !== 'static-path') fail('hec09-path');
        if (formsMod.recipeIdForClass(model.types[2].typePath) !== null) fail('hec09-unlisted-recipe');

        const handle = await createRegionalScene({ host, model, visibility: { F1: true, S1: true, U1: true, P1: true } });
        handle.attach();
        handle.resize();
        handle.resetCamera();
        handle.setVisibility({ F1: true, S1: false, U1: true, P1: true });
        handle.setVisualZ({ min: -8, max: 16 });
        const inspected = handle.inspect();
        if (!inspected.outline || inspected.outline.max[2] - inspected.outline.min[2] < 20) {
          fail('hec08-outline-full-z', JSON.stringify(inspected.outline));
        }
        if (!inspected.legend || inspected.legend.indexOf('not collision') < 0) fail('hec09-legend');
        if (!inspected.summary || inspected.summary.indexOf('Admitted') < 0) fail('hec09-summary');
        const smelter = inspected.occupants.find((row) => row.id === 'S1');
        if (!smelter || !smelter.envelope || !smelter.cue) fail('hec09-envelope');
        const floor = inspected.occupants.find((row) => row.id === 'F1');
        if (!floor || floor.visual !== 'named-form') fail('hec09-floor-draw');
        const canvas = host.querySelector('canvas.regionalSceneCanvas');
        if (!canvas || canvas.getAttribute('aria-label') !== 'Regional 3D view' || canvas.tabIndex < 0) {
          fail('hec08-canvas-a11y');
        }
        canvas.focus();
        if (document.activeElement !== canvas) fail('hec08-focus');

        const drawing0 = inspected.drawing;
        const allocs0 = inspected.attrAllocs;
        handle.setVisibility({ F1: true, S1: false, U1: true, P1: true });
        handle.setVisualZ({ min: -3, max: 2 });
        const mixed = handle.inspect();
        const zSpan = mixed.outline && (mixed.outline.max[2] - mixed.outline.min[2]);
        if (!(zSpan > 4.5 && zSpan < 6.5)) {
          fail('hec08-outline-visual-z', JSON.stringify(mixed.outline));
        }
        handle.resetCamera();
        const sectionCamera = handle.inspect().camera;
        if (!sectionCamera || Math.abs(sectionCamera.target[2] - (-0.5)) > 1e-5) {
          fail('hec08-reset-visible-section', JSON.stringify(sectionCamera));
        }
        handle.frameFullRegion();
        const fullRegionCamera = handle.inspect().camera;
        if (!fullRegionCamera || Math.abs(fullRegionCamera.target[2] - 4) > 1e-5) {
          fail('hec08-frame-full-region', JSON.stringify(fullRegionCamera));
        }
        const fullRegionOutline = handle.inspect().outline;
        if (!fullRegionOutline || Math.abs(fullRegionOutline.min[2] - (-3)) > 1e-5
            || Math.abs(fullRegionOutline.max[2] - 2) > 1e-5) {
          fail('hec08-full-region-keeps-visual-z', JSON.stringify(fullRegionOutline));
        }
        handle.resetCamera();
        const sectionAgain = handle.inspect().camera;
        if (!sectionAgain || Math.abs(sectionAgain.target[2] - (-0.5)) > 1e-5) {
          fail('hec08-reset-section-after-full-frame', JSON.stringify(sectionAgain));
        }
        const pathMixed = mixed.occupants.find((row) => row.id === 'P1');
        if (!pathMixed || pathMixed.zVisible || pathMixed.drawn) fail('hec08-path-zclip', JSON.stringify(pathMixed));
        const floorMixed = mixed.occupants.find((row) => row.id === 'F1');
        if (!floorMixed || !floorMixed.drawn) fail('hec08-floor-zkeep');
        if (mixed.status && mixed.status.indexOf('No loaded occupants are visible') >= 0) fail('hec08-mixed-empty-msg');

        handle.setVisualZ({ min: 40, max: 50 });
        const emptyVis = handle.inspect();
        if (!emptyVis.status || emptyVis.status.indexOf('No loaded occupants are visible') < 0) {
          fail('hec08-empty-z-status', emptyVis.status);
        }
        if (emptyVis.occupants.some((row) => row.drawn)) fail('hec08-empty-z-drawn');
        const pathEmpty = emptyVis.occupants.find((row) => row.id === 'P1');
        if (!pathEmpty || pathEmpty.zVisible) fail('hec08-path-still-zvisible');

        handle.setVisualZ({ min: -8, max: 16 });
        handle.setVisibility({ F1: false, S1: true, U1: true, P1: true });
        const afterDraw = handle.inspect();
        const smelterDrawn = afterDraw.occupants.find((row) => row.id === 'S1');
        if (!smelterDrawn || !smelterDrawn.drawn || !smelterDrawn.cue || smelterDrawn.recipeId !== 'smelter-cue') {
          fail('hec09-smelter-drawn', JSON.stringify(smelterDrawn));
        }
        const chimneyBatch = (afterDraw.batches || []).find((row) => row.key && row.key.indexOf('smelter-cue|chimney') === 0);
        const bodyBatch = (afterDraw.batches || []).find((row) => row.key && row.key.indexOf('smelter-cue|body') === 0);
        if (!chimneyBatch || chimneyBatch.count !== 1 || !bodyBatch || bodyBatch.count !== 1) {
          fail('hec09-smelter-batches', JSON.stringify(afterDraw.batches));
        }
        const drawing1 = afterDraw.drawing;
        if (afterDraw.attrAllocs !== allocs0) {
          fail('hec08-attr-allocs', JSON.stringify({ allocs0, allocs1: afterDraw.attrAllocs }));
        }
        ['form', 'marker', 'path', 'contact'].forEach((key) => {
          if (!drawing0 || !drawing1 || !drawing0[key] || drawing0[key] !== drawing1[key]) {
            fail('hec08-attr-reuse-' + key, JSON.stringify({ a: drawing0, b: drawing1 }));
          }
        });

        const cam0 = handle.inspect().camera;
        canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
        const cam1 = handle.inspect().camera;
        if (!cam0 || !cam1) fail('hec08-orbit-inspect');
        else {
          if (Math.abs(cam1.position[2] - cam0.position[2]) > 1e-5) {
            fail('hec08-orbit-azimuth-z', JSON.stringify({ cam0, cam1 }));
          }
          if (cam1.up[0] !== 0 || cam1.up[1] !== 0 || Math.abs(cam1.up[2] - 1) > 1e-6) {
            fail('hec08-orbit-up', JSON.stringify(cam1.up));
          }
          const moved = Math.abs(cam1.position[0] - cam0.position[0]) > 1e-5
            || Math.abs(cam1.position[1] - cam0.position[1]) > 1e-5;
          if (!moved) fail('hec08-orbit-azimuth-xy', JSON.stringify({ cam0, cam1 }));
        }

        const distOf = (cam) => Math.hypot(
          cam.position[0] - cam.target[0],
          cam.position[1] - cam.target[1],
          cam.position[2] - cam.target[2],
        );
        const camHome = handle.inspect().camera;
        const distHome = distOf(camHome);
        if (!(camHome.minDistance > 0) || camHome.minDistance >= distHome) {
          fail('hec08-min-distance', JSON.stringify(camHome));
        }
        for (let i = 0; i < 40; i++) {
          canvas.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true, cancelable: true }));
        }
        const camClose = handle.inspect().camera;
        const distClose = distOf(camClose);
        if (distClose + 1e-3 < camClose.minDistance) {
          fail('hec08-dolly-clamp', JSON.stringify({ distClose, camClose }));
        }
        if (distClose < 1) {
          fail('hec08-dolly-inside', JSON.stringify({ distClose, distHome, camClose }));
        }

        handle.dispose();
        handle.dispose();
        liveZero(regionalSceneLiveResources(), 'hec08-after-dispose');
        if (host.querySelector('canvas')) fail('hec08-canvas-left');

        // World visual Z vs origin-relative poses (All pole stack / Mk5 belt).
        const oz = 70;
        const poseLow = new Float32Array([-4, -4, -4, 0, 0, 0, 1, 1, 1, 1, 8, 8, 1, 0, 0, 0]);
        const poseHigh = new Float32Array([4, 4, 4, 0, 0, 0, 1, 1, 1, 1, 8, 8, 4, 0, 0, 0]);
        const posePole = new Float32Array([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]);
        const poseSlope = new Float32Array([0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]);
        const shiftedPoses = new Float32Array(16 * 4);
        shiftedPoses.set(poseLow, 0);
        shiftedPoses.set(poseHigh, 16);
        shiftedPoses.set(posePole, 32);
        shiftedPoses.set(poseSlope, 48);
        const shifted = {
          schemaVersion: 1, requestId: 'regional:world-z', originM: [100, 200, oz],
          effectiveBoundsM: { min: [90, 190, 40], max: [110, 210, 100] },
          emptyReason: null,
          types: [
            { typePath: '/Game/FactoryGame/Buildable/Building/Foundation.Build_Foundation_8x4_01_C', label: 'Foundation', category: 'Foundation', subcategory: 'Floors' },
            { typePath: '/Game/FactoryGame/Buildable/Building/Foundation.Build_Foundation_8x2_01_C', label: 'Foundation', category: 'Foundation', subcategory: 'Floors' },
            { typePath: '/Game/FactoryGame/Buildable/Factory/ConveyorPoleStackable.Build_ConveyorPoleStackable_C', label: 'Pole', category: 'Logistics', subcategory: null },
            { typePath: '/Game/FactoryGame/Buildable/Factory/ConveyorBeltMk5.Build_ConveyorBeltMk5_C', label: 'Belt', category: 'Logistics', subcategory: null }
          ],
          occupants: [
            { id: 'LOW', typeIndex: 0, sourceKind: 'lightweight', recordKind: 'occupant', sizeKind: 'named-box', poseFlags: 15, pathState: 'not-path', uncertainty: [] },
            { id: 'HIGH', typeIndex: 1, sourceKind: 'lightweight', recordKind: 'occupant', sizeKind: 'named-box', poseFlags: 15, pathState: 'not-path', uncertainty: [] },
            { id: 'POLE', typeIndex: 2, sourceKind: 'actor', recordKind: 'occupant', sizeKind: 'unknown', poseFlags: 3, pathState: 'not-path', uncertainty: ['size-unknown'] },
            { id: 'BELT', typeIndex: 3, sourceKind: 'actor', recordKind: 'path', sizeKind: 'unknown', poseFlags: 3, pathState: 'linear', uncertainty: [] }
          ],
          poses: shiftedPoses,
          fragments: new Uint32Array([3, 0, 2, 0]),
          vertices: new Float32Array([0, -6, -14, 0, 0, 0, 0, 0, 0, 0, 6, 14, 0, 0, 0, 0, 0, 0]),
          vertexFlags: new Uint32Array([4, 4]),
          bytes: new Uint8Array(0),
          counts: { occupants: 4, fragments: 1, vertices: 2 }
        };
        const zHandle = await createRegionalScene({
          host, model: shifted,
          visibility: { LOW: true, HIGH: true, POLE: true, BELT: true }
        });
        zHandle.attach();
        zHandle.setVisualZ({ min: 40, max: 100 });
        const zShown = zHandle.inspect();
        const byId = (id) => zShown.occupants.find((row) => row.id === id);
        const low = byId('LOW');
        const high = byId('HIGH');
        const pole = byId('POLE');
        const belt = byId('BELT');
        if (!low || !low.drawn || !high || !high.drawn) fail('hec08-stack-floors-drawn', JSON.stringify({ low, high }));
        if (!pole || !pole.drawn) fail('hec08-stack-pole-drawn', JSON.stringify(pole));
        if (!belt || !belt.drawn || !belt.zVisible) fail('hec08-slope-path-drawn', JSON.stringify(belt));
        const zLow = low && low.matrix ? low.matrix[14] : null;
        const zHigh = high && high.matrix ? high.matrix[14] : null;
        if (!(Number.isFinite(zLow) && Number.isFinite(zHigh) && Math.abs(zHigh - zLow) > 7)) {
          fail('hec08-stack-floors-separable', JSON.stringify({ zLow, zHigh }));
        }
        const floorBatch = (zShown.batches || []).find((row) => row.key && row.key.indexOf('grid-floor') === 0);
        if (!floorBatch || floorBatch.count !== 2) fail('hec08-stack-floor-batch', JSON.stringify(zShown.batches));
        zHandle.setVisualZ({ min: 200, max: 210 });
        const zHidden = zHandle.inspect();
        if (zHidden.occupants.some((row) => row.drawn)) fail('hec08-world-z-hides', JSON.stringify(zHidden.occupants));
        zHandle.dispose();
        liveZero(regionalSceneLiveResources(), 'hec08-after-world-z');

        const aborted = new AbortController();
        aborted.abort();
        let abortCode = null;
        try {
          await createRegionalScene({ host, model, signal: aborted.signal });
        } catch (error) {
          abortCode = error && error.code;
        }
        if (abortCode !== 'CANCELLED') fail('hec08-abort', String(abortCode));
        liveZero(regionalSceneLiveResources(), 'hec08-after-abort');

        setRegionalSceneTestFailure('shader');
        let shaderCode = null;
        try {
          await createRegionalScene({ host, model });
        } catch (error) {
          shaderCode = error && error.code;
        }
        if (shaderCode !== 'RENDER_FAILED') fail('hec08-shader', String(shaderCode));
        liveZero(regionalSceneLiveResources(), 'hec08-after-shader');

        let lost = null;
        const liveHandle = await createRegionalScene({
          host, model,
          onFailure: (error) => { lost = error && error.code; }
        });
        liveHandle.attach();
        const glCanvas = host.querySelector('canvas.regionalSceneCanvas');
        const gl = glCanvas.getContext('webgl2') || glCanvas.getContext('webgl');
        const ext = gl && gl.getExtension('WEBGL_lose_context');
        if (!ext) fail('hec08-lose-ext');
        else ext.loseContext();
        await new Promise((resolve) => setTimeout(resolve, 50));
        if (lost !== 'RENDER_FAILED') fail('hec08-context-loss', String(lost));
        liveHandle.dispose();
        liveZero(regionalSceneLiveResources(), 'hec08-after-context');

        const emptyModel = {
          schemaVersion: 1, requestId: 'regional:empty', originM: [0, 0, 0],
          effectiveBoundsM: null, emptyReason: 'DISJOINT_Z', types: [], occupants: [],
          poses: new Float32Array(0), fragments: new Uint32Array(0),
          vertices: new Float32Array(0), vertexFlags: new Uint32Array(0),
          bytes: new Uint8Array(0), counts: { occupants: 0, fragments: 0, vertices: 0 }
        };
        const empty = await createRegionalScene({ host, model: emptyModel });
        empty.attach();
        const emptyInspect = empty.inspect();
        if (!emptyInspect.status || emptyInspect.status.indexOf('do not overlap') < 0) fail('hec08-empty');
        empty.dispose();
        liveZero(regionalSceneLiveResources(), 'hec08-after-empty');
        if (host.parentNode) host.parentNode.removeChild(host);
      } catch (error) {
        fail('hec08-exception', String(error && error.stack || error));
        try {
          const sceneMod = await import('/regional_scene.js');
          liveZero(sceneMod.regionalSceneLiveResources(), 'hec08-exception-live');
        } catch (ignored) {}
      }
      return { fails };
    }""")
    for item in kit.get("fails") or []:
        check("HEC kit " + item.split(":")[0], False, item)
    if not (kit.get("fails") or []):
        check("HEC-08 adapter lifetime/disposal", True)
        check("HEC-09 rendered form fixtures", True)
    leafletAfter = page.evaluate("""() => ({
      ready: !!(window.SaveClient && SaveClient.isReady()),
      gl: !!(MapApp.layer && MapApp.layer._gl) && !MapApp.layer._gl.isContextLost()
    })""")
    check("adapter did not dispose Leaflet/SaveClient",
          leafletBefore.get("ready") and leafletAfter.get("ready")
          and leafletBefore.get("gl") and leafletAfter.get("gl"),
          {"before": leafletBefore, "after": leafletAfter})
