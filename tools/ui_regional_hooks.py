"""Opt-in session/visibility contracts; run with --suite hooks.

Uses injected transport failures and synthetic bucket mutations, not UI journeys.
"""

def run(page, check):
    # ---- Regional viewer phase 2 hooks (HEC-05/06/07) ------------------------
    # Hook-level only: no product renderer, no enabled enter/exit. Integrated
    # visit remains Phase 4. These are not a completed-viewer verdict.
    hec = page.evaluate("""async () => {
      const fails = [];
      const fail = (name, detail) => { fails.push(name + (detail ? ': ' + detail : '')); };
      let cancel = null, stale = null, cancelAfter = null, staleAfter = null, healthy = null;
      try {
        if (!window.HeightRegion || !window.HeightView || !window.SaveClient || !window.Altitude || !window.Filters) {
          fail('phase2-globals', 'HeightRegion/HeightView/SaveClient/Altitude/Filters missing');
          return { fails, cancel, stale, cancelAfter, staleAfter, healthy };
        }
        const stamp = SaveClient.getSessionStamp();
        if (!SaveClient.isReady() || !stamp) fail('session-ready', JSON.stringify(stamp));

        const rect = { minX: 720, maxX: 740, minY: 5349, maxY: 5369 };
        // Solo constructors at this XY sit near 57–69 m; the band must overlap
        // them so reopen can prove cubeKeys/_inBand were rebuilt.
        const band = { min: 40, max: 80 };
        const centreBefore = [MapApp.map.getCenter().lat, MapApp.map.getCenter().lng, MapApp.map.getZoom()];
        const bucketsBefore = MapApp.layer.buckets.length;
        const selectedBefore = SelectionTool.selectedCount ? SelectionTool.selectedCount() : 0;

        HeightRegion.commitRectangle(rect, band, stamp.saveEpoch);
        const committed = HeightRegion.getCommitted();
        if (!committed) fail('hec05-commit', 'getCommitted null');
        if (committed && (committed.rectMapPx.minX !== rect.minX || committed.cutZM.min !== band.min)) {
          fail('hec05-copy', JSON.stringify(committed));
        }
        const revision = committed && committed.revision;
        HeightView.dismiss();
        if (HeightView.isOpen()) fail('hec05-dismiss-open', 'HeightView still open');
        const afterDismiss = HeightRegion.getCommitted();
        if (!afterDismiss || afterDismiss.revision !== revision) fail('hec05-dismiss-cleared');
        HeightView.reopenCommitted();
        if (!HeightView.isOpen()) fail('hec05-reopen-closed');
        const inBox = SelectionTool.collectInBox(rect.minX, rect.maxX, rect.minY, rect.maxY) || [];
        if (inBox.length && !inBox.some((record) => HeightView.allowToggle(record))) {
          fail('hec05-reopen-toggle');
        }
        const afterReopen = HeightRegion.getCommitted();
        if (!afterReopen || afterReopen.rectMapPx.maxX !== rect.maxX || afterReopen.cutZM.max !== band.max) {
          fail('hec05-reopen-coords');
        }
        if (afterReopen && afterReopen.revision !== revision) fail('hec05-reopen-revision');
        const centreAfter = [MapApp.map.getCenter().lat, MapApp.map.getCenter().lng, MapApp.map.getZoom()];
        if (centreBefore[0] !== centreAfter[0] || centreBefore[1] !== centreAfter[1] || centreBefore[2] !== centreAfter[2]) {
          fail('hec05-map-centre');
        }
        if (MapApp.layer.buckets.length !== bucketsBefore) fail('hec05-buckets');
        if (SelectionTool.selectedCount && SelectionTool.selectedCount() !== selectedBefore) fail('hec05-selection');
        HeightView.dismiss();
        if (HeightView.isOpen()) fail('hec05-second-dismiss');
        HeightView.suspendForViewer();
        if (HeightView.isOpen()) fail('hec05-suspend-open');
        if (!HeightRegion.getCommitted()) fail('hec05-suspend-cleared');

        const staleStamp = { saveEpoch: stamp.saveEpoch - 1, stateVersion: 0 };
        if (SaveClient.markPayloadInstalled(staleStamp)) fail('hec06-stale-install');
        if (!SaveClient.isReady()) fail('hec06-ready-after-stale-install');

        const tinyRegion = {
          schemaVersion: 1, requestId: 'regional:ui-cancel',
          xyM: { minX: 0, maxX: 16, minY: 0, maxY: 16 },
          cutZM: { min: 0, max: 1 }, altitudeCapM: null
        };
        const tooLarge = new Error('REGIONAL_ERROR:' + JSON.stringify({
          name: 'RegionalError', code: 'REGION_TOO_LARGE',
          message: 'Region exceeds 8000 occupants',
          requestId: 'regional:ui-inflight', sessionLost: false,
          details: { limit: 8000, count: 8001, countKind: 'minimum' }
        }));
        const deferRegionalFailure = () => {
          let rejectFn;
          let markDispatched;
          const dispatched = new Promise((resolve) => { markDispatched = resolve; });
          const pending = new Promise((_, reject) => { rejectFn = reject; });
          SaveClient.installRegionalQueryTransport(() => {
            markDispatched();
            return pending;
          });
          return { dispatched, fail: (error) => rejectFn(error) };
        };

        const controller = new AbortController();
        controller.abort();
        cancel = await SaveClient.queryRegionalScene(tinyRegion, {
          stamp: SaveClient.getSessionStamp(), signal: controller.signal
        }).then(() => 'resolved').catch((error) => error && error.code);

        if (typeof SaveClient.installRegionalQueryTransport !== 'function') {
          fail('hec06-inflight-seam');
        } else {
          const afterCancel = deferRegionalFailure();
          const inflightAbort = new AbortController();
          const cancelPending = SaveClient.queryRegionalScene(
            Object.assign({}, tinyRegion, { requestId: 'regional:ui-cancel-after' }),
            { stamp: SaveClient.getSessionStamp(), signal: inflightAbort.signal }
          );
          await afterCancel.dispatched;
          inflightAbort.abort();
          afterCancel.fail(tooLarge);
          cancelAfter = await cancelPending.then(() => 'resolved').catch((error) => error && error.code);
        }

        const lease = SaveClient.acquireRegionalVisit(SaveClient.getSessionStamp());
        lease.release();
        lease.release();
        if (lease.isLive()) fail('hec06-lease-idempotent');

        stale = await SaveClient.queryRegionalScene(
          Object.assign({}, tinyRegion, { requestId: 'regional:ui-stale' }),
          { stamp: staleStamp }
        ).then(() => 'resolved').catch((error) => error && error.code);

        if (typeof SaveClient.installRegionalQueryTransport === 'function') {
          const afterStale = deferRegionalFailure();
          const stalePending = SaveClient.queryRegionalScene(
            Object.assign({}, tinyRegion, { requestId: 'regional:ui-stale-after' }),
            { stamp: SaveClient.getSessionStamp() }
          );
          await afterStale.dispatched;
          const bump = SaveClient.applyEdits([{ op: 'notARealEditOp' }], false);
          afterStale.fail(tooLarge);
          staleAfter = await stalePending.then(() => 'resolved').catch((error) => error && error.code);
          await bump.then(() => {}, (error) => {
            SaveClient.acknowledgeHealthyRefusal(bump.sessionStamp);
          });
        }

        const editOp = SaveClient.applyEdits([{ op: 'notARealEditOp' }], false);
        healthy = await editOp.then(() => ({ refused: false, ack: false, ready: SaveClient.isReady(), code: 'resolved' }), (error) => {
          const refused = error && !error.sessionLost;
          const ack = SaveClient.acknowledgeHealthyRefusal(editOp.sessionStamp);
          return { refused: !!refused, ack: !!ack, ready: SaveClient.isReady(), code: error && error.message };
        });

        const metreHidden = !!(document.getElementById('altitudeMinMetreLabel') && document.getElementById('altitudeMinMetreLabel').hidden);
        if (!metreHidden) fail('hec07-metre-hidden-by-default');
        const prevAlt = { min: MapApp.altitudeRange.min, max: MapApp.altitudeRange.max };
        const cutBefore = HeightRegion.getCommitted() && HeightRegion.getCommitted().cutZM;
        const endVisit = Altitude.beginRegionalWindow({ min: 10, max: 30 });
        const metreShown = document.getElementById('altitudeMinMetreLabel') && !document.getElementById('altitudeMinMetreLabel').hidden;
        if (!metreShown) fail('hec07-metre-visible-in-visit');
        if (typeof Altitude.getRange === 'function') Altitude.getRange();
        const visitRange = MapApp.altitudeRange;
        if (visitRange.min !== 10 || visitRange.max !== 30) fail('hec07-visit-bounds', JSON.stringify(visitRange));
        const cutDuring = HeightRegion.getCommitted() && HeightRegion.getCommitted().cutZM;
        if (cutBefore && cutDuring && (cutBefore.min !== cutDuring.min || cutBefore.max !== cutDuring.max)) {
          fail('hec07-cut-mutated');
        }
        endVisit();
        if (MapApp.altitudeRange.min !== prevAlt.min || MapApp.altitudeRange.max !== prevAlt.max) {
          fail('hec07-restore-cap');
        }
        const emptyEnd = Altitude.beginRegionalWindow({ min: 5, max: 1 });
        const disabled = document.getElementById('altitudeMinSlider').disabled;
        if (!disabled) fail('hec07-disjoint-disabled');
        emptyEnd();

        let unmapped = null;
        try {
          Filters.registerRegionalTypes([]);
          Filters.resolveRegionalVisibility([{ id: 'nobody', typePath: '/No/Such.Type_C' }]);
        } catch (error) {
          unmapped = error && error.code;
        }
        if (unmapped !== 'VISIBILITY_UNMAPPED') fail('hec07-unmapped', String(unmapped));
        const sample = (MapApp.layer.buckets || []).find((bucket) => bucket.ids && bucket.ids[0] && bucket.key && bucket.key.indexOf('building:') === 0);
        const uncheckAll = document.getElementById('uncheckAllButton');
        const checkAll = document.getElementById('checkAllButton');
        if (sample) {
          const typePath = sample.key.slice('building:'.length);
          const occupant = { id: sample.ids[0], typePath: typePath };
          const release = Filters.registerRegionalTypes([{ typePath: typePath, category: 'Unknown' }]);
          const mask = Filters.resolveRegionalVisibility([occupant]);
          if (!mask[occupant.id] || !mask[occupant.id].visible) fail('hec07-mask');
          if (uncheckAll) uncheckAll.click();
          const hidden = Filters.resolveRegionalVisibility([occupant]);
          if (!hidden[occupant.id] || hidden[occupant.id].visible) fail('hec07-after-uncheck');
          if (checkAll) checkAll.click();
          const shown = Filters.resolveRegionalVisibility([occupant]);
          if (!shown[occupant.id] || !shown[occupant.id].visible) fail('hec07-after-check');

          const buckets = MapApp.layer.buckets || [];
          const sampleIndex = buckets.indexOf(sample);
          const duplicateBucket = buckets.find((bucket, index) =>
            index > sampleIndex && bucket !== sample && bucket.ids
              && !Array.from(bucket.ids).includes(occupant.id));
          if (!duplicateBucket) {
            fail('hec07-multibucket-fixture');
          } else {
            const originalSampleVisible = sample.visible;
            const originalSampleHidden = sample.hiddenIndices;
            const originalDuplicateVisible = duplicateBucket.visible;
            const originalDuplicateIds = duplicateBucket.ids;
            const duplicateIds = Array.from(originalDuplicateIds);
            duplicateIds.push(occupant.id);
            let duplicateReads = 0;
            duplicateBucket.ids = new Proxy(duplicateIds, {
              get(target, key, receiver) {
                if (key === 'length' || /^\\d+$/.test(String(key))) duplicateReads++;
                return Reflect.get(target, key, receiver);
              }
            });
            sample.visible = true;
            sample.hiddenIndices = new Set([0]);
            duplicateBucket.visible = true;
            const multiOccupants = [occupant];
            try {
              const multiBucketMask = Filters.resolveRegionalVisibility(multiOccupants);
              const readsAfterFirstIndex = duplicateReads;
              if (!multiBucketMask[occupant.id] || !multiBucketMask[occupant.id].visible) {
                fail('hec07-multibucket-visible', JSON.stringify(multiBucketMask[occupant.id]));
              }
              const cachedMask = Filters.resolveRegionalVisibility(multiOccupants);
              if (!cachedMask[occupant.id] || !cachedMask[occupant.id].visible) {
                fail('hec07-multibucket-cached-visible', JSON.stringify(cachedMask[occupant.id]));
              }
              if (duplicateReads !== readsAfterFirstIndex) {
                fail('hec07-index-once-per-visit', duplicateReads + ' vs ' + readsAfterFirstIndex);
              }
            } finally {
              sample.visible = originalSampleVisible;
              sample.hiddenIndices = originalSampleHidden;
              duplicateBucket.visible = originalDuplicateVisible;
              duplicateBucket.ids = originalDuplicateIds;
            }
          }
          release();
        } else {
          fail('hec07-sample-bucket');
        }
        const ghostType = '/Game/FactoryGame/Buildable/Factory/NoSuchClass.NoSuchClass_C';
        const ghost = { id: 'Persistent_Level:PersistentLevel.NoSuchClass_C_1', typePath: ghostType };
        const releaseGhost = Filters.registerRegionalTypes([{ typePath: ghostType, category: 'Unknown' }]);
        const ghostOn = Filters.resolveRegionalVisibility([ghost]);
        if (!ghostOn[ghost.id] || !ghostOn[ghost.id].visible) fail('hec07-temp-default');
        if (uncheckAll) uncheckAll.click();
        const ghostOff = Filters.resolveRegionalVisibility([ghost]);
        if (!ghostOff[ghost.id] || ghostOff[ghost.id].visible) fail('hec07-temp-uncheck-all');
        if (checkAll) checkAll.click();
        const ghostRestored = Filters.resolveRegionalVisibility([ghost]);
        if (!ghostRestored[ghost.id] || !ghostRestored[ghost.id].visible) fail('hec07-temp-check-all');
        releaseGhost();
      } catch (error) {
        fail('phase2-exception', String(error && error.stack || error));
      }
      return { fails, cancel, stale, cancelAfter, staleAfter, healthy };
    }""")
    for item in hec.get("fails") or []:
        check("HEC hook " + item.split(":")[0], False, item)
    if not (hec.get("fails") or []):
        check("HEC-05 region/chrome/selection retained", True)
    check("HEC-06 cancelled query", hec.get("cancel") == "CANCELLED", hec.get("cancel"))
    check("HEC-06 cancelled in-flight failure", hec.get("cancelAfter") == "CANCELLED", hec.get("cancelAfter"))
    check("HEC-06 stale query", hec.get("stale") == "STALE_SESSION", hec.get("stale"))
    check("HEC-06 stale in-flight failure", hec.get("staleAfter") == "STALE_SESSION", hec.get("staleAfter"))
    healthy = hec.get("healthy") or {}
    check("HEC-06 healthy refusal re-ready",
          isinstance(healthy, dict) and healthy.get("refused") and healthy.get("ack") and healthy.get("ready"),
          healthy)
    check("HEC-07 visibility/Z hooks", not any(str(item).startswith("hec07") for item in (hec.get("fails") or [])))
