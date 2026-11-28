"""Opt-in extended integration and lifecycle checks; run with --suite stress.

Includes edit/undo, injected races, context loss, reset and 20 repeated visits.
Heap samples are diagnostic observations, NOT proof of leak-free memory.
"""

def run(page, check):
    # ---- Regional product visit (HEC-05/06/07/08 + C-015/C-016) -------------
    # Real current-save query. Not a diagnostic fixture path, not S-01/S-04
    # hardware/shell trials, and not a shipped-viewer verdict.
    page.set_default_timeout(300000)
    product = page.evaluate("""async () => {
      const fails = [];
      const fail = (name, detail) => { fails.push(name + (detail ? ': ' + detail : '')); };
      const liveZero = (label) => {
        const live = RegionalViewer.evidence().adapter;
        const leftover = Object.keys(live).filter((k) => (live[k] || 0) > 0);
        if (leftover.length) fail(label, JSON.stringify(live));
        if (document.querySelector('#regionalViewerHost canvas, canvas.regionalSceneCanvas')) {
          fail(label + '-canvas');
        }
      };
      const waitUntil = (pred, label, ms) => new Promise((resolve, reject) => {
        const start = Date.now();
        const tick = () => {
          Promise.resolve().then(pred).then((ok) => {
            if (ok) resolve(true);
            else if (Date.now() - start > (ms || 30000)) reject(new Error(label || 'timeout'));
            else setTimeout(tick, 20);
          }, reject);
        };
        tick();
      });
      const waitIdle = () => waitUntil(() => RegionalViewer.state() === 'idle' && SaveClient.isReady(), 'idle', 120000);
      const waitActive = () => waitUntil(() => RegionalViewer.state() === 'active', 'active', 120000);
      const sceneQuery = (() => {
        const script = document.querySelector('script[src*="regional_viewer.js"]');
        return script && script.src ? new URL(script.src).search : '';
      })();
      const importScene = () => import('/regional_scene.js' + sceneQuery);
      const rect = { minX: 699, maxX: 761, minY: 5328, maxY: 5390 };
      const band = { min: -80, max: 120 };
      const emptyRect = { minX: 180, maxX: 220, minY: 180, maxY: 220 };
      const emptyBand = { min: 0, max: 1 };
      let heapSamples = [];
      let wasmSamples = [];
      let releaseImport = null;
      try {
        if (!window.RegionalViewer) {
          fail('c013-missing-controller');
          return { fails };
        }
        const stamp = SaveClient.getSessionStamp();
        const width0 = document.getElementById('map').getBoundingClientRect().width;
        const centre0 = [MapApp.map.getCenter().lat, MapApp.map.getCenter().lng, MapApp.map.getZoom()];
        const buckets0 = MapApp.layer.buckets.length;
        const ops0 = EditorTool.opCount();
        HeightRegion.commitRectangle(rect, band, stamp.saveEpoch);
        HeightView.dismiss();
        if (HeightView.isOpen()) fail('c015-dismiss-open');
        const keys0 = SelectionTool.identitySnapshot();

        await RegionalViewer.enter();
        await waitActive();
        if (HeightView.isOpen()) fail('c015-hv-open-during-visit');
        const first = RegionalViewer.inspect();
        if (!first || !first.occupants || !first.occupants.length) fail('c015-empty-constructors');
        if (!first.outline) {
          fail('c015-outline-missing');
        } else {
          const span = first.outline.max[2] - first.outline.min[2];
          if (!(span > 8 && span < 120)) fail('c015-outline-z-margins', String(span));
        }
        const admitted0 = first.occupants.length;
        const ids0 = first.occupants.map((row) => row.id).sort();
        if (EditorTool.opCount() !== ops0) fail('c015-visit-mutated-undo');
        const widthActive = document.getElementById('map').getBoundingClientRect().width;
        if (Math.abs(widthActive - width0) > 1) fail('c015-width-active', widthActive + ' vs ' + width0);

        RegionalViewer.exit('back');
        await waitIdle();
        liveZero('c015-after-first-exit');
        if (HeightView.isOpen()) fail('c015-hv-open-after-success');
        if (JSON.stringify(SelectionTool.identitySnapshot()) !== JSON.stringify(keys0)) fail('c015-selection-changed');
        const centre1 = [MapApp.map.getCenter().lat, MapApp.map.getCenter().lng, MapApp.map.getZoom()];
        if (centre1[0] !== centre0[0] || centre1[1] !== centre0[1] || centre1[2] !== centre0[2]) fail('c015-centre');
        if (MapApp.layer.buckets.length !== buckets0) fail('c015-buckets');
        const width1 = document.getElementById('map').getBoundingClientRect().width;
        if (Math.abs(width1 - width0) > 1) fail('c015-width-exit', width1 + ' vs ' + width0);
        const committed = HeightRegion.getCommitted();
        if (!committed || committed.rectMapPx.minX !== rect.minX || committed.cutZM.min !== band.min) {
          fail('c015-region-lost');
        }

        HeightView.reopenCommitted();
        if (!HeightView.isOpen()) fail('c015-reopen');
        const keysReopen = SelectionTool.identitySnapshot();
        HeightView.dismiss();
        if (JSON.stringify(SelectionTool.identitySnapshot()) !== JSON.stringify(keysReopen)) fail('c015-reopen-peel');

        await RegionalViewer.enter();
        await waitActive();
        RegionalViewer.exit('back');
        await waitIdle();
        liveZero('c015-after-reenter');
        if (HeightView.isOpen()) fail('c015-reenter-hv');

        HeightView.reopenCommitted();
        const placeBox = SelectionTool.collectInBox(rect.minX, rect.maxX, rect.minY, rect.maxY) || [];
        const placeRow = placeBox.find((row) => row.bucket && row.bucket.key && row.bucket.key.indexOf('building:') === 0);
        if (placeRow) {
          SelectionTool.setRecords([placeRow]);
          const keysPlace = SelectionTool.identitySnapshot();
          const placeTargets = SelectionTool.currentEditTargets && SelectionTool.currentEditTargets();
          if (placeTargets && (placeTargets.actorNames.length + placeTargets.lightweight.length) > 0) {
            EditorTool.startMove(placeTargets);
            const enterBtn = document.getElementById('regionalEnterBtn');
            if (!enterBtn || !enterBtn.disabled) fail('c015-place-start-enabled');
            await RegionalViewer.enter();
            if (RegionalViewer.state() !== 'idle') fail('c015-place-entered');
            if (!enterBtn.disabled) fail('c015-place-refused-enabled');
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            if (EditorTool.isPlacing()) fail('c015-place-still');
            if (enterBtn.disabled) fail('c015-place-cancel-stuck', enterBtn.title);
          } else {
            fail('c015-place-no-targets');
          }
          await RegionalViewer.enter();
          await waitActive();
          if (JSON.stringify(SelectionTool.identitySnapshot()) !== JSON.stringify(keysPlace)) {
            fail('c015-visit-mutated-selection');
          }
          RegionalViewer.exit('back');
          await waitIdle();
          if (JSON.stringify(SelectionTool.identitySnapshot()) !== JSON.stringify(keysPlace)) {
            fail('c015-exit-mutated-selection');
          }
        } else {
          fail('c015-no-place-row');
        }

        HeightView.reopenCommitted();
        const inBox = SelectionTool.collectInBox(rect.minX, rect.maxX, rect.minY, rect.maxY) || [];
        const editable = inBox.find((row) => row.bucket && row.bucket.key && row.bucket.key.indexOf('building:') === 0);
        if (editable) {
          SelectionTool.setRecords(inBox.filter((row) => row !== editable));
          const subtractedId = editable.id;
          await RegionalViewer.enter();
          await waitActive();
          const afterSub = RegionalViewer.inspect();
          if (!afterSub.occupants.some((row) => row.id === subtractedId)) fail('c015-selection-not-membership');
          RegionalViewer.exit('back');
          await waitIdle();
        } else {
          fail('c015-no-editable');
        }

        HeightView.reopenCommitted();
        if (editable) {
          SelectionTool.setRecords([editable]);
          const targets = SelectionTool.currentEditTargets && SelectionTool.currentEditTargets();
          HeightView.dismiss();
          if (targets && (targets.actorNames.length + targets.lightweight.length) > 0) {
            const opsBefore = EditorTool.opCount();
            EditorTool.deleteTargets(targets);
            await waitUntil(() => EditorTool.opCount() > opsBefore && SaveClient.isReady(), 'delete-ready', 120000);
            await RegionalViewer.enter();
            await waitActive();
            const afterDel = RegionalViewer.inspect();
            if (afterDel.occupants.length >= admitted0) fail('c015-edit-not-observed', afterDel.occupants.length + ' vs ' + admitted0);
            RegionalViewer.exit('back');
            await waitIdle();
            EditorTool.undo();
            await waitUntil(() => EditorTool.opCount() === opsBefore && SaveClient.isReady(), 'undo-ready', 120000);
            await RegionalViewer.enter();
            await waitActive();
            const afterUndo = RegionalViewer.inspect();
            if (afterUndo.occupants.length !== admitted0) fail('c015-undo-records', afterUndo.occupants.length + ' vs ' + admitted0);
            RegionalViewer.exit('back');
            await waitIdle();
          }
        }

        const foundation = (Filters.getBuildingSearchEntries() || []).find((entry) =>
          (entry.category === 'Foundation') || ((entry.label || '').toLowerCase().indexOf('foundation') >= 0)
            || ((entry.typePaths || [])[0] || '').indexOf('Foundation') >= 0);
        let foundationWas = null;
        if (foundation && foundation.checkbox) {
          foundationWas = foundation.checkbox.checked;
          if (foundation.checkbox.checked) foundation.checkbox.click();
        }
        const sampleBucket = (MapApp.layer.buckets || []).find((bucket) => bucket.ids && bucket.ids[0] && bucket.key && bucket.key.indexOf('building:') === 0);
        if (sampleBucket) {
          MapApp.hideObject(sampleBucket, 0);
        }
        await RegionalViewer.enter();
        await waitActive();
        const hiddenInspect = RegionalViewer.inspect();
        if (sampleBucket && hiddenInspect.occupants.some((row) => row.id === sampleBucket.ids[0] && row.drawn)) {
          fail('c015-hidden-index-drawn');
        }
        const visitOccupants = RegionalViewer.visitOccupants();
        const resolved = Filters.resolveRegionalVisibility(visitOccupants);
        const hiddenFromFilters = visitOccupants.filter((occupant) => {
          const row = resolved[occupant.id];
          return row && row.visible === false;
        });
        if (!hiddenFromFilters.length) fail('c015-resolved-no-hidden');
        hiddenFromFilters.forEach((occupant) => {
          const row = resolved[occupant.id];
          if (row === false) fail('c015-resolved-already-boolean', occupant.id);
          if (!row || typeof row.visible !== 'boolean' || !row.typePath) {
            fail('c015-resolved-shape', JSON.stringify(row));
          }
        });
        const adapterMask = RegionalViewer.adapterVisibilityMask(resolved, visitOccupants);
        hiddenFromFilters.forEach((occupant) => {
          if (adapterMask[occupant.id] !== false) fail('c015-adapter-mask-not-false', occupant.id);
          const drawn = hiddenInspect.occupants.find((row) => row.id === occupant.id);
          if (drawn && drawn.drawn) fail('c015-resolved-hidden-drawn', occupant.id);
        });
        const cutBeforeZ = HeightRegion.getCommitted().cutZM;
        const admittedDuring = hiddenInspect.occupants.length;
        const loaded = Altitude.getRange();
        if (loaded && isFinite(loaded.min) && isFinite(loaded.max)) {
          const mid = (loaded.min + loaded.max) / 2;
          MapApp.setAltitudeRange(mid, loaded.max);
          const zInspect = RegionalViewer.inspect();
          if (zInspect.occupants.length !== admittedDuring) fail('c015-visualz-count');
          const cutDuringZ = HeightRegion.getCommitted().cutZM;
          if (cutDuringZ.min !== cutBeforeZ.min || cutDuringZ.max !== cutBeforeZ.max) fail('c015-visualz-cut');
        }
        RegionalViewer.exit('back');
        await waitIdle();
        if (foundation && foundation.checkbox) {
          if (foundation.checkbox.checked !== false && foundationWas === true) fail('c015-category-persist');
          if (foundationWas && !foundation.checkbox.checked) foundation.checkbox.click();
        }
        if (MapApp.resetHiddenObjects) MapApp.resetHiddenObjects();

        HeightRegion.commitRectangle(emptyRect, emptyBand, SaveClient.getSessionStamp().saveEpoch);
        await RegionalViewer.enter();
        await waitActive();
        const emptyInspect = RegionalViewer.inspect();
        if (!emptyInspect.status || emptyInspect.status.indexOf('No eligible occupants intersect this region') < 0) {
          fail('c015-empty-msg', emptyInspect.status);
        }
        RegionalViewer.exit('back');
        await waitIdle();

        HeightRegion.commitRectangle(rect, band, SaveClient.getSessionStamp().saveEpoch);
        const prevAlt = { min: MapApp.altitudeRange.min, max: MapApp.altitudeRange.max };
        MapApp.setAltitudeRange(5000, 5100);
        await RegionalViewer.enter();
        await waitActive();
        const disjoint = RegionalViewer.inspect();
        if (!disjoint.status || disjoint.status.indexOf('do not overlap') < 0) fail('c015-disjoint-msg', disjoint.status);
        if (emptyInspect.status === disjoint.status) fail('c015-empty-disjoint-same');
        RegionalViewer.exit('back');
        await waitIdle();
        MapApp.setAltitudeRange(prevAlt.min, prevAlt.max);

        const uncheckAll = document.getElementById('uncheckAllButton');
        const checkAll = document.getElementById('checkAllButton');
        if (uncheckAll) uncheckAll.click();
        HeightRegion.commitRectangle(rect, band, SaveClient.getSessionStamp().saveEpoch);
        await RegionalViewer.enter();
        await waitActive();
        const hiddenAll = RegionalViewer.inspect();
        if (!hiddenAll.status || hiddenAll.status.indexOf('No loaded occupants are visible') < 0) {
          fail('c015-all-hidden-msg', hiddenAll.status);
        }
        const fullButton = document.getElementById('regionalFullRegionBtn');
        const resetButton = document.getElementById('regionalResetBtn');
        const beforeCameraActions = RegionalViewer.inspect();
        let cameraActions = null;
        if (fullButton && resetButton && beforeCameraActions && beforeCameraActions.regionFrame) {
          fullButton.click();
          const fullCamera = RegionalViewer.inspect();
          resetButton.click();
          const resetCamera = RegionalViewer.inspect();
          cameraActions = {
            frame: beforeCameraActions.regionFrame,
            before: beforeCameraActions,
            full: fullCamera,
            reset: resetCamera
          };
        }
        if (!cameraActions) {
          fail('c015-camera-toolbar');
        } else {
          const expectedFull = cameraActions.frame.min.map((value, axis) =>
            (value + cameraActions.frame.max[axis]) / 2);
          const expectedSection = cameraActions.reset.outline.min.map((value, axis) =>
            (value + cameraActions.reset.outline.max[axis]) / 2);
          const initialTarget = cameraActions.before.camera.target;
          const fullTarget = cameraActions.full.camera.target;
          const resetTarget = cameraActions.reset.camera.target;
          if (initialTarget.some((value, axis) => Math.abs(value - expectedFull[axis]) > 1e-4)) {
            fail('c015-initial-full-region-frame', JSON.stringify({ expectedFull, initialTarget }));
          }
          if (fullTarget.some((value, axis) => Math.abs(value - expectedFull[axis]) > 1e-4)) {
            fail('c015-full-region-toolbar-action', JSON.stringify({ expectedFull, fullTarget }));
          }
          if (resetTarget.some((value, axis) => Math.abs(value - expectedSection[axis]) > 1e-4)) {
            fail('c015-reset-section-toolbar-action', JSON.stringify({ expectedSection, resetTarget }));
          }
          if (JSON.stringify(cameraActions.full.outline) !== JSON.stringify(cameraActions.reset.outline)) {
            fail('c015-full-frame-preserves-z', JSON.stringify({ full: cameraActions.full.outline, reset: cameraActions.reset.outline }));
          }
        }
        RegionalViewer.exit('back');
        await waitIdle();
        if (checkAll) checkAll.click();

        HeightView.reopenCommitted();
        const hvOpen = HeightView.isOpen();
        const tooLarge = new Error('REGIONAL_ERROR:' + JSON.stringify({
          name: 'RegionalError', code: 'REGION_TOO_LARGE',
          message: 'Region exceeds 8000 occupants',
          requestId: 'regional:refuse', sessionLost: false,
          details: { limit: 8000, count: 8001, countKind: 'minimum' }
        }));
        SaveClient.installRegionalQueryTransport(() => Promise.reject(tooLarge));
        await RegionalViewer.enter();
        await waitIdle();
        if (HeightView.isOpen() !== hvOpen) fail('c015-refusal-hv');
        const dlg = document.getElementById('regionalViewerDialog');
        const body = document.getElementById('regionalViewerDialogBody');
        if (!dlg || !dlg.open) fail('c015-refusal-dialog');
        if (!body || body.textContent.indexOf('8,001') < 0 || body.textContent.indexOf('Reduce') < 0) {
          fail('c015-refusal-copy', body && body.textContent);
        }
        if (dlg.open) dlg.close();
        liveZero('c015-after-refusal');

        let lateResolve;
        SaveClient.installRegionalQueryTransport(() => new Promise((resolve) => { lateResolve = resolve; }));
        const cancelled = RegionalViewer.enter();
        await waitUntil(() => RegionalViewer.state() === 'querying', 'querying');
        RegionalViewer.exit('cancel');
        lateResolve(new Uint8Array([0, 1, 2, 3]));
        await cancelled;
        await waitIdle();
        if (RegionalViewer.state() === 'active') fail('c015-late-success');
        liveZero('c015-after-late-success');

        let lateReject;
        SaveClient.installRegionalQueryTransport(() => new Promise((_, reject) => { lateReject = reject; }));
        const cancelledErr = RegionalViewer.enter();
        await waitUntil(() => RegionalViewer.state() === 'querying', 'querying-err');
        RegionalViewer.exit('cancel');
        lateReject(tooLarge);
        await cancelledErr;
        await waitIdle();
        liveZero('c015-after-late-error');

        const sceneModHeld = await importScene();
        let releaseHeldBuild = null;
        sceneModHeld.setRegionalSceneTestGate(() => new Promise((resolve) => {
          releaseHeldBuild = { go: resolve };
        }));
        const heldBuild = RegionalViewer.enter();
        await waitUntil(() => RegionalViewer.state() === 'building' && !!releaseHeldBuild, 'build-gate', 60000);
        RegionalViewer.exit('cancel');
        await waitIdle();
        sceneModHeld.setRegionalSceneTestGate(null);
        const secondEnter = RegionalViewer.enter();
        await waitUntil(() => {
          const next = RegionalViewer.state();
          return next === 'querying' || next === 'building' || next === 'active';
        }, 'second-enter-unblocked', 20000);
        await waitActive();
        RegionalViewer.exit('back');
        await waitIdle();
        if (releaseHeldBuild && releaseHeldBuild.go) releaseHeldBuild.go();
        await heldBuild;
        await secondEnter;
        liveZero('c015-after-import-exit');

        const sceneMod = await importScene();
        sceneMod.setRegionalSceneTestFailure('shader');
        HeightView.reopenCommitted();
        const openBeforeFail = HeightView.isOpen();
        await RegionalViewer.enter();
        await waitIdle();
        if (HeightView.isOpen() !== openBeforeFail) fail('c015-partial-hv');
        liveZero('c015-after-partial');
        if (document.getElementById('regionalViewerDialog') && document.getElementById('regionalViewerDialog').open) {
          document.getElementById('regionalViewerDialog').close();
        }

        HeightView.dismiss();
        await RegionalViewer.enter();
        await waitActive();
        const glCanvas = document.querySelector('#regionalViewerHost canvas.regionalSceneCanvas');
        const gl = glCanvas && (glCanvas.getContext('webgl2') || glCanvas.getContext('webgl'));
        const ext = gl && gl.getExtension('WEBGL_lose_context');
        if (!ext) fail('c015-lose-ext');
        else {
          ext.loseContext();
          await waitUntil(() => RegionalViewer.state() === 'idle', 'context-idle');
        }
        liveZero('c015-after-context');
        if (document.getElementById('regionalViewerDialog') && document.getElementById('regionalViewerDialog').open) {
          document.getElementById('regionalViewerDialog').close();
        }
      } catch (error) {
        fail('c015-exception', String(error && error.stack || error));
        try {
          RegionalViewer.testHooks.wrapImport = null;
          const sceneMod = await importScene();
          sceneMod.setRegionalSceneTestGate(null);
          if (releaseImport && releaseImport.go) {
            await releaseImport.go();
          }
        } catch (ignored) {}
        try { RegionalViewer.exit('test'); } catch (ignored) {}
      }

      try {
        HeightRegion.commitRectangle(rect, band, SaveClient.getSessionStamp().saveEpoch);
        const warmup = 3;
        const cycles = 20;
        for (let i = 0; i < warmup; i++) {
          await RegionalViewer.enter();
          await waitActive();
          RegionalViewer.exit('back');
          await waitIdle();
          liveZero('c016-warmup-' + i);
        }
        for (let i = 0; i < cycles; i++) {
          heapSamples.push(RegionalViewer.evidence().heap);
          await RegionalViewer.sampleWasm();
          wasmSamples.push(RegionalViewer.evidence().wasm);
          await RegionalViewer.enter();
          await waitActive();
          RegionalViewer.exit('back');
          await waitIdle();
          liveZero('c016-cycle-' + i);
        }
        let releaseCancel;
        SaveClient.installRegionalQueryTransport(() => new Promise((resolve) => { releaseCancel = resolve; }));
        const mixCancel = RegionalViewer.enter();
        await waitUntil(() => RegionalViewer.state() === 'querying', 'c016-cancel');
        RegionalViewer.exit('cancel');
        releaseCancel(new Uint8Array(8));
        await mixCancel;
        await waitIdle();
        liveZero('c016-mix-cancel');

        const sceneMod = await importScene();
        sceneMod.setRegionalSceneTestFailure('shader');
        await RegionalViewer.enter();
        await waitIdle();
        liveZero('c016-mix-partial');
        if (document.getElementById('regionalViewerDialog') && document.getElementById('regionalViewerDialog').open) {
          document.getElementById('regionalViewerDialog').close();
        }

        await RegionalViewer.enter();
        await waitActive();
        const mixCanvas = document.querySelector('#regionalViewerHost canvas.regionalSceneCanvas');
        const mixGl = mixCanvas && (mixCanvas.getContext('webgl2') || mixCanvas.getContext('webgl'));
        const mixExt = mixGl && mixGl.getExtension('WEBGL_lose_context');
        if (mixExt) {
          mixExt.loseContext();
          await waitUntil(() => RegionalViewer.state() === 'idle', 'c016-context');
        } else {
          RegionalViewer.exit('back');
          await waitIdle();
        }
        liveZero('c016-mix-context');
        if (document.getElementById('regionalViewerDialog') && document.getElementById('regionalViewerDialog').open) {
          document.getElementById('regionalViewerDialog').close();
        }

        const resetCentre = [MapApp.map.getCenter().lat, MapApp.map.getCenter().lng, MapApp.map.getZoom()];
        await RegionalViewer.enter();
        await waitActive();
        SaveClient.reset();
        await waitUntil(() => RegionalViewer.state() === 'idle', 'reset-idle');
        liveZero('c015-after-reset');
        MapApp.map.setView([1, 1], 1, { animate: false });
        await new Promise((resolve) => setTimeout(resolve, 80));
        const afterReset = [MapApp.map.getCenter().lat, MapApp.map.getCenter().lng, MapApp.map.getZoom()];
        if (Math.abs(afterReset[0] - resetCentre[0]) < 1e-12 && afterReset[2] === resetCentre[2]) {
          fail('c015-stale-restore-after-reset');
        }
      } catch (error) {
        fail('c016-exception', String(error && error.stack || error));
        try { RegionalViewer.exit('test'); } catch (ignored) {}
      }

      return {
        fails,
        heap: heapSamples,
        wasm: wasmSamples,
        evidence: RegionalViewer.evidence(),
      };
    }""")
    for item in product.get("fails") or []:
        check("HEC product " + item.split(":")[0], False, item)
    if not (product.get("fails") or []):
        check("HEC-05 product enter/exit retain 2D", True)
        check("HEC-06 product cancel/late/reset", True)
        check("HEC-07 product filters/Z", True)
        check("HEC-08 product resource release", True)
        check("C-016 20 visits + injected failures", True)
    check("C-016 heap recorded or marked unavailable",
          bool((product.get("heap") or [{}])[-1:] and (
              "unavailable" in str((product.get("heap") or [{}])[-1])
              or "jsHeapUsed" in str((product.get("heap") or [{}])[-1])
          )),
          "n=" + str(len(product.get("heap") or [])))
    check("C-016 heap trend samples",
          len(product.get("heap") or []) > 3,
          len(product.get("heap") or []))
