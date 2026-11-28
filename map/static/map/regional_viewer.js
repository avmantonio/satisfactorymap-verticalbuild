// RegionalViewer: one visit FSM over the current applied save.
// Classic script. Lazily imports the stamped ES-module adapter on entry.
// Not a save editor. Test fixtures are never a production data path.
var RegionalViewer = (function() {
  "use strict";

  var STATE_IDLE = "idle";
  var STATE_QUERYING = "querying";
  var STATE_BUILDING = "building";
  var STATE_ACTIVE = "active";

  var visitId = 0;
  var state = STATE_IDLE;
  var abortController = null;
  var lease = null;
  var snapshot = null;
  var attached = false;
  var handle = null;
  var sceneModule = null;
  var codecModule = null;
  var host = null;
  var releaseTypes = null;
  var endAltitude = null;
  var unsubInvalidated = null;
  var unsubVisibility = null;
  var occupants = null;
  var visitModel = null;
  var queryDrain = Promise.resolve();
  var lastWasmSample = { unavailable: "not sampled" };
  var railFrozen = false;

  var testHooks = {
    wrapImport: null,
    beforeBuild: null,
  };

  var enterBtn = document.getElementById("regionalEnterBtn");
  var reopenBtn = document.getElementById("regionalReopenBtn");
  var clearBtn = document.getElementById("regionalClearBtn");
  var reasonEl = document.getElementById("regionalEnterReason");
  var regionBar = document.getElementById("regionalRegionBar");
  var progressEl = document.getElementById("regionalViewerProgress");
  var progressLabel = document.getElementById("regionalViewerProgressLabel");
  var cancelBtn = document.getElementById("regionalViewerCancelBtn");
  var overlay = document.getElementById("regionalViewer");
  var overlayHost = document.getElementById("regionalViewerHost");
  var backBtn = document.getElementById("regionalBackBtn");
  var resetBtn = document.getElementById("regionalResetBtn");
  var fullRegionBtn = document.getElementById("regionalFullRegionBtn");
  var liveStatus = document.getElementById("regionalViewerLiveStatus");
  var dialogEl = document.getElementById("regionalViewerDialog");
  var dialogTitle = document.getElementById("regionalViewerDialogTitle");
  var dialogBody = document.getElementById("regionalViewerDialogBody");
  var dialogRetry = document.getElementById("regionalViewerDialogRetry");
  var dialog = dialogEl && UI.dialog ? UI.dialog(dialogEl) : null;

  function visitGatesEdits() {
    return state === STATE_QUERYING || state === STATE_BUILDING || state === STATE_ACTIVE;
  }

  function stampsEqual(a, b) {
    return !!(a && b && a.saveEpoch === b.saveEpoch && a.stateVersion === b.stateVersion);
  }

  function copyStamp(stamp) {
    return { saveEpoch: stamp.saveEpoch, stateVersion: stamp.stateVersion };
  }

  function copyRegion(region) {
    return {
      saveEpoch: region.saveEpoch,
      revision: region.revision,
      rectMapPx: {
        minX: region.rectMapPx.minX,
        maxX: region.rectMapPx.maxX,
        minY: region.rectMapPx.minY,
        maxY: region.rectMapPx.maxY,
      },
      cutZM: { min: region.cutZM.min, max: region.cutZM.max },
    };
  }

  function finiteCap(range) {
    if (!range) {
      return null;
    }
    if (!isFinite(range.min) || !isFinite(range.max) || range.max < range.min) {
      return null;
    }
    return { min: range.min, max: range.max };
  }

  function mapRectToWorldM(rect) {
    var mapPxToWorldXY = EditorTool.mapPxToWorldXY;
    var corners = [
      mapPxToWorldXY(rect.minX, rect.minY),
      mapPxToWorldXY(rect.maxX, rect.minY),
      mapPxToWorldXY(rect.minX, rect.maxY),
      mapPxToWorldXY(rect.maxX, rect.maxY),
    ];
    var xs = corners.map(function(c) { return c[0] / 100; });
    var ys = corners.map(function(c) { return c[1] / 100; });
    return {
      minX: Math.min.apply(null, xs),
      maxX: Math.max.apply(null, xs),
      minY: Math.min.apply(null, ys),
      maxY: Math.max.apply(null, ys),
    };
  }

  function assetQuery() {
    try {
      var script = document.querySelector('script[src*="regional_viewer.js"]');
      return script && script.src ? new URL(script.src).search : "";
    } catch (error) {
      return "";
    }
  }

  function moduleUrl(file) {
    return "./" + file + assetQuery();
  }

  function announce(text) {
    if (liveStatus) {
      liveStatus.textContent = text || "";
    }
    if (progressLabel && (state === STATE_QUERYING || state === STATE_BUILDING)) {
      progressLabel.textContent = text || "Preparing 3D view…";
    }
  }

  function setProgressVisible(on) {
    if (!progressEl) {
      return;
    }
    progressEl.hidden = !on;
    progressEl.style.display = on ? "flex" : "none";
  }

  function setOverlayVisible(on) {
    if (!overlay) {
      return;
    }
    overlay.hidden = !on;
    overlay.style.display = on ? "flex" : "none";
    document.body.classList.toggle("regional-viewer-active", !!on);
  }

  function freezeRail(on) {
    railFrozen = !!on;
    if (window.Altitude && Altitude.setRailFrozen) {
      Altitude.setRailFrozen(!!on, "3D view is preparing");
    }
  }

  function hideLeaflet(on) {
    var mapEl = document.getElementById("map");
    if (!mapEl) {
      return;
    }
    if (on) {
      mapEl.setAttribute("aria-hidden", "true");
      mapEl.style.visibility = "hidden";
    } else {
      mapEl.removeAttribute("aria-hidden");
      mapEl.style.visibility = "";
    }
  }

  function placementPending() {
    if (window.EditorTool && EditorTool.isPlacing && EditorTool.isPlacing()) {
      return true;
    }
    if (window.HeightView && HeightView.isCommitting && HeightView.isCommitting()) {
      return true;
    }
    if (window.SelectionTool && SelectionTool.isSelecting && SelectionTool.isSelecting()) {
      return true;
    }
    return false;
  }

  function entryBlockReason() {
    if (state === STATE_ACTIVE) {
      return "3D view is already open";
    }
    if (state === STATE_QUERYING || state === STATE_BUILDING) {
      return "Building 3D view…";
    }
    if (!window.SaveClient || !SaveClient.isReady()) {
      return "Save is busy";
    }
    if (!window.HeightRegion || !HeightRegion.getCommitted()) {
      return "No committed region";
    }
    var region = HeightRegion.getCommitted();
    var stamp = SaveClient.getSessionStamp();
    if (!stamp || region.saveEpoch !== stamp.saveEpoch) {
      return "No committed region";
    }
    if (placementPending()) {
      return "Finish placing or dragging before entering 3D";
    }
    return null;
  }

  function syncChrome() {
    var reason = entryBlockReason();
    var committed = window.HeightRegion && HeightRegion.getCommitted();
    var showBar = !!(committed && state !== STATE_ACTIVE);
    if (regionBar) {
      regionBar.hidden = !showBar;
      regionBar.style.display = showBar ? "flex" : "none";
    }
    if (enterBtn) {
      enterBtn.disabled = !!reason;
      enterBtn.title = reason || "Open a read-only 3D view of the committed region";
    }
    if (reasonEl) {
      reasonEl.textContent = reason && showBar ? reason : "";
    }
    if (reopenBtn) {
      reopenBtn.disabled = !committed || state !== STATE_IDLE;
    }
    if (clearBtn) {
      clearBtn.disabled = !committed || state !== STATE_IDLE;
    }
    if (resetBtn) {
      resetBtn.disabled = state !== STATE_ACTIVE;
    }
  }

  function captureSnapshot() {
    var stampA = SaveClient.getSessionStamp();
    if (!SaveClient.isReady() || !stampA) {
      throw makeError("NO_SESSION", "No save is ready for a regional visit");
    }
    var region = HeightRegion.getCommitted();
    if (!region) {
      throw makeError("INVALID_REGION", "No committed region");
    }
    if (region.saveEpoch !== stampA.saveEpoch) {
      throw makeError("STALE_SESSION", "Committed region belongs to another save");
    }
    var xyM = mapRectToWorldM(region.rectMapPx);
    if (!(isFinite(xyM.minX) && isFinite(xyM.maxX) && isFinite(xyM.minY) && isFinite(xyM.maxY)
        && xyM.maxX > xyM.minX && xyM.maxY > xyM.minY)) {
      throw makeError("INVALID_REGION", "Region XY is not a positive rectangle");
    }
    var map = MapApp.map;
    var mapEl = document.getElementById("map");
    var cap = finiteCap(MapApp.altitudeRange);
    var focus = document.activeElement;
    var selectionKeys = SelectionTool.identitySnapshot ? SelectionTool.identitySnapshot() : [];
    var stampB = SaveClient.getSessionStamp();
    if (!stampsEqual(stampA, stampB) || !SaveClient.isReady()) {
      throw makeError("STALE_SESSION", "Session changed while capturing the visit");
    }
    return {
      stamp: Object.freeze(copyStamp(stampA)),
      region: copyRegion(region),
      xyM: xyM,
      altitudeCapM: cap,
      centre: { lat: map.getCenter().lat, lng: map.getCenter().lng },
      zoom: map.getZoom(),
      mapWidth: mapEl ? mapEl.getBoundingClientRect().width : 0,
      focus: focus,
      selectionKeys: selectionKeys.slice(),
      heightViewWasOpen: !!(window.HeightView && HeightView.isOpen()),
    };
  }

  function makeError(code, message, details) {
    var error = new Error(message);
    error.name = "RegionalError";
    error.code = code;
    error.requestId = null;
    error.sessionLost = code === "SESSION_LOST";
    error.details = details || {};
    return error;
  }

  function abandonIfStale(id) {
    if (stillCurrent(id)) {
      return false;
    }
    if (id === visitId) {
      failCurrent(id, makeError("CANCELLED", "Visit is no longer current"), true);
    }
    return true;
  }

  function stillCurrent(id) {
    if (id !== visitId) {
      return false;
    }
    if (state !== STATE_QUERYING && state !== STATE_BUILDING && state !== STATE_ACTIVE) {
      return false;
    }
    if (abortController && abortController.signal.aborted) {
      return false;
    }
    if (!snapshot || !SaveClient.isReady() || !SaveClient.stampIsCurrent(snapshot.stamp)) {
      return false;
    }
    var region = HeightRegion.getCommitted();
    if (!region || region.revision !== snapshot.region.revision
        || region.saveEpoch !== snapshot.region.saveEpoch) {
      return false;
    }
    if (lease && !lease.isLive()) {
      return false;
    }
    return true;
  }

  // PR 9 Filters.resolveRegionalVisibility returns mask[id] = { visible, typePath }.
  // PR 10 regional_scene.js draws unless visibilityMask[id] !== false, so that
  // object would paint. Convert to a boolean adapter mask before the renderer.
  function adapterVisibilityMask(resolved, occupantList) {
    var mask = {};
    (occupantList || []).forEach(function(occupant) {
      var row = resolved && resolved[occupant.id];
      mask[occupant.id] = !!(row && row.visible === true);
    });
    return mask;
  }

  function booleanMask(model) {
    return adapterVisibilityMask(
      Filters.resolveRegionalVisibility(model.occupants),
      model.occupants
    );
  }

  function loadedZFromModel(model) {
    var bounds = model && model.effectiveBoundsM;
    if (!bounds || !bounds.min || !bounds.max) {
      return null;
    }
    var min = bounds.min[2];
    var max = bounds.max[2];
    if (!isFinite(min) || !isFinite(max) || max < min) {
      return null;
    }
    return { min: min, max: max };
  }

  function applyLatestVisibility() {
    if (!handle || !occupants) {
      return;
    }
    handle.setVisibility(booleanMask({ occupants: occupants }));
  }

  function worldToSceneZ(range) {
    var originZ = visitModel && visitModel.originM ? visitModel.originM[2] : 0;
    if (!range || !isFinite(range.min) || !isFinite(range.max) || !isFinite(originZ)) {
      return null;
    }
    return { min: range.min - originZ, max: range.max - originZ };
  }

  function cutMarginWorldZ(model) {
    var loaded = loadedZFromModel(model);
    var padded = sceneModule && sceneModule.occupantPaddedZ && sceneModule.occupantPaddedZ(model);
    if (!loaded || !padded || !model.originM || !isFinite(model.originM[2])) {
      return null;
    }
    var world = { min: padded.min + model.originM[2], max: padded.max + model.originM[2] };
    var min = Math.max(loaded.min, world.min);
    var max = Math.min(loaded.max, world.max);
    if (!(max >= min)) {
      return null;
    }
    return { min: min, max: max };
  }

  function applyVisualZ() {
    if (!handle || state !== STATE_ACTIVE) {
      return;
    }
    var range = window.Altitude && Altitude.getRange ? Altitude.getRange() : MapApp.altitudeRange;
    handle.setVisualZ(worldToSceneZ(range));
  }

  function restoreSameSave() {
    if (!snapshot) {
      hideLeaflet(false);
      return;
    }
    var stamp = SaveClient.getSessionStamp();
    var same = SaveClient.isReady() && stamp && stamp.saveEpoch === snapshot.stamp.saveEpoch;
    hideLeaflet(false);
    if (!same || !MapApp.map) {
      return;
    }
    MapApp.map.setView(L.latLng(snapshot.centre.lat, snapshot.centre.lng), snapshot.zoom, { animate: false });
    MapApp.map.invalidateSize();
  }

  function restoreFocus(target) {
    if (target && document.contains(target) && typeof target.focus === "function"
        && !target.disabled && target.offsetParent !== null) {
      try { target.focus(); } catch (error) { /* not focusable */ }
      return;
    }
    if (enterBtn && !enterBtn.disabled && !enterBtn.hidden) {
      enterBtn.focus();
      return;
    }
    var fallback = document.getElementById("uploadFileInput") || document.getElementById("mainSearchInput");
    if (fallback) {
      fallback.focus();
    }
  }

  function disposeHandle() {
    if (handle && typeof handle.dispose === "function") {
      try { handle.dispose(); } catch (error) { /* dispose is idempotent */ }
    }
    handle = null;
    if (host && host.parentNode) {
      host.parentNode.removeChild(host);
    }
    host = null;
    occupants = null;
    visitModel = null;
  }

  function releaseVisitResources() {
    if (unsubVisibility) {
      unsubVisibility();
      unsubVisibility = null;
    }
    if (releaseTypes) {
      try { releaseTypes(); } catch (error) { /* release is idempotent */ }
      releaseTypes = null;
    }
    if (endAltitude) {
      try { endAltitude(); } catch (error) { /* end is idempotent */ }
      endAltitude = null;
    }
    freezeRail(false);
    if (window.SelectionTool && SelectionTool.suspendInput) {
      SelectionTool.suspendInput(false);
    }
    disposeHandle();
    setOverlayVisible(false);
    setProgressVisible(false);
    if (lease) {
      try { lease.release(); } catch (error) { /* lease is idempotent */ }
      lease = null;
    }
  }

  function retireVisit() {
    visitId += 1;
    if (abortController) {
      try { abortController.abort(); } catch (error) { /* already aborted */ }
    }
  }

  function restoreOpenHeightView(hadAttached, snap) {
    if (hadAttached || !snap || !snap.heightViewWasOpen) {
      return;
    }
    if (!window.HeightView || !HeightView.reopenCommitted) {
      return;
    }
    if (HeightView.isOpen && HeightView.isOpen()) {
      return;
    }
    HeightView.reopenCommitted();
  }

  function cleanupToIdle(opts) {
    opts = opts || {};
    var hadAttached = attached;
    var snap = snapshot;
    releaseVisitResources();
    if (opts.restore !== false) {
      restoreSameSave();
    } else {
      hideLeaflet(false);
    }
    if (opts.restore !== false) {
      restoreOpenHeightView(hadAttached, snap);
    }
    attached = false;
    state = STATE_IDLE;
    abortController = null;
    if (!opts.keepSnapshot) {
      snapshot = null;
    }
    announce(opts.status || "");
    syncChrome();
    if (opts.restoreFocus !== false) {
      restoreFocus(snap && snap.focus);
    }
    return hadAttached;
  }

  function formatOccupantCount(count) {
    return Math.round(Number(count)).toLocaleString("en-US");
  }

  function refusalMessage(error) {
    var details = (error && error.details) || {};
    var count = details.count;
    var kind = details.countKind;
    var amount = "at least 8,001";
    if (kind === "exact" && isFinite(count)) {
      amount = formatOccupantCount(count);
    } else if (kind === "minimum" && isFinite(count)) {
      amount = "at least " + formatOccupantCount(count);
    }
    return "3D is limited to 8,000 occupants. This region contains " + amount
      + ". Reduce the XY rectangle or Cut Z band.";
  }

  function failureMessage(error) {
    if (!error) {
      return "The 3D view could not be opened. Return to 2D and retry.";
    }
    if (error.code === "REGION_TOO_LARGE") {
      return refusalMessage(error);
    }
    if (error.code === "CANCELLED") {
      return "3D view cancelled.";
    }
    if (error.code === "VISIBILITY_UNMAPPED") {
      return "A loaded occupant could not be mapped to the shared filters. Return to 2D and retry.";
    }
    if (error.code === "RENDER_FAILED") {
      return "The 3D view lost its graphics context. Return to 2D and retry.";
    }
    if (error.code === "SESSION_LOST" || error.sessionLost) {
      return "The save session was lost. Reload the save to continue.";
    }
    return error.message || "The 3D view could not be opened. Return to 2D and retry.";
  }

  function showFailure(error, canRetry) {
    if (!dialog) {
      return;
    }
    if (dialogTitle) {
      dialogTitle.textContent = error && error.code === "REGION_TOO_LARGE"
        ? "Region too large for 3D"
        : "3D view could not open";
    }
    if (dialogBody) {
      dialogBody.textContent = failureMessage(error);
    }
    if (dialogRetry) {
      dialogRetry.hidden = !canRetry;
      dialogRetry.style.display = canRetry ? "" : "none";
    }
    dialog.open();
  }

  function failCurrent(id, error, restore) {
    if (id !== visitId) {
      return;
    }
    var wasAttached = attached;
    retireVisit();
    cleanupToIdle({
      restore: restore !== false,
      restoreFocus: true,
      status: failureMessage(error),
    });
    if (error && error.code === "CANCELLED") {
      return;
    }
    showFailure(error, !wasAttached && error && error.code !== "SESSION_LOST");
  }

  function buildRequest(id, snap) {
    return {
      schemaVersion: 1,
      requestId: "regional:" + id,
      xyM: snap.xyM,
      cutZM: { min: snap.region.cutZM.min, max: snap.region.cutZM.max },
      altitudeCapM: snap.altitudeCapM,
    };
  }

  function importModule(file) {
    var url = moduleUrl(file);
    if (typeof testHooks.wrapImport === "function") {
      return testHooks.wrapImport(url);
    }
    return import(url);
  }

  function onSessionInvalidated() {
    if (state === STATE_IDLE) {
      syncChrome();
      return;
    }
    var id = visitId;
    var snap = snapshot;
    retireVisit();
    var epoch = SaveClient.getSessionStamp() && SaveClient.getSessionStamp().saveEpoch;
    var sameEpoch = !!(snap && epoch === snap.stamp.saveEpoch);
    cleanupToIdle({
      restore: sameEpoch,
      restoreFocus: false,
      status: "Save changed; 3D view closed.",
    });
    void id;
  }

  function onVisibilityChanged() {
    if (state === STATE_ACTIVE) {
      try { applyLatestVisibility(); } catch (error) { failCurrent(visitId, error, true); }
    }
  }

  function onAltitudeChanged() {
    if (state === STATE_ACTIVE) {
      applyVisualZ();
    }
  }

  async function runEnter(id, snap, signal) {
    var request = buildRequest(id, snap);
    announce("Querying the current save…");
    var query = SaveClient.queryRegionalScene(request, { stamp: snap.stamp, signal: signal });
    // Serialize only the save query. Cancelled import/build must not block
    // the next enter; overlapping queries still wait until this one settles.
    queryDrain = query.then(function() {}, function() {});
    var bytes = await query;
    if (abandonIfStale(id)) {
      void bytes;
      return;
    }
    state = STATE_BUILDING;
    announce("Building 3D view…");
    syncChrome();
    codecModule = await importModule("regional_codec.js");
    if (abandonIfStale(id)) {
      return;
    }
    var model = codecModule.decodeRegionalScene(bytes, request.requestId);
    bytes = null;
    if (abandonIfStale(id)) {
      return;
    }
    sceneModule = await importModule("regional_scene.js");
    if (abandonIfStale(id)) {
      return;
    }
    if (typeof testHooks.beforeBuild === "function") {
      await testHooks.beforeBuild();
    }
    if (abandonIfStale(id)) {
      return;
    }
    releaseTypes = Filters.registerRegionalTypes(model.types || []);
    var mask;
    try {
      mask = booleanMask(model);
    } catch (error) {
      if (releaseTypes) {
        releaseTypes();
        releaseTypes = null;
      }
      throw error;
    }
    if (abandonIfStale(id)) {
      if (releaseTypes) {
        releaseTypes();
        releaseTypes = null;
      }
      return;
    }
    host = document.createElement("div");
    host.className = "regionalViewerHost";
    visitModel = model;
    var initialVisualZ = sceneModule.occupantPaddedZ ? sceneModule.occupantPaddedZ(model) : null;
    handle = await sceneModule.createRegionalScene({
      host: host,
      model: model,
      visibility: mask,
      visualZ: initialVisualZ,
      signal: signal,
      onFailure: function(error) {
        failCurrent(id, error, true);
      },
    });
    if (abandonIfStale(id)) {
      disposeHandle();
      if (releaseTypes) {
        releaseTypes();
        releaseTypes = null;
      }
      return;
    }
    mask = booleanMask(model);
    occupants = model.occupants;
    freezeRail(false);
    if (window.HeightView && HeightView.suspendForViewer) {
      HeightView.suspendForViewer();
    }
    endAltitude = Altitude.beginRegionalWindow(loadedZFromModel(model), cutMarginWorldZ(model));
    handle.setVisibility(mask);
    if (abandonIfStale(id)) {
      if (endAltitude) {
        endAltitude();
        endAltitude = null;
      }
      disposeHandle();
      if (releaseTypes) {
        releaseTypes();
        releaseTypes = null;
      }
      freezeRail(false);
      return;
    }
    try {
      hideLeaflet(true);
      if (overlayHost) {
        overlayHost.appendChild(host);
      }
      setOverlayVisible(true);
      setProgressVisible(false);
      handle.attach();
      attached = true;
      state = STATE_ACTIVE;
      applyVisualZ();
      if (handle.frameFullRegion) {
        handle.frameFullRegion();
      } else if (handle.resetCamera) {
        handle.resetCamera();
      }
    } catch (error) {
      attached = false;
      setOverlayVisible(false);
      hideLeaflet(false);
      throw error;
    }
    announce("");
    syncChrome();
    unsubVisibility = Filters.onVisibilityChanged(onVisibilityChanged);
  }

  function enter() {
    if (visitGatesEdits()) {
      return Promise.resolve();
    }
    var reason = entryBlockReason();
    if (reason) {
      announce(reason);
      syncChrome();
      return Promise.resolve();
    }
    var snap;
    try {
      snap = captureSnapshot();
    } catch (error) {
      announce(error.message || reason);
      syncChrome();
      return Promise.reject(error);
    }
    visitId += 1;
    var id = visitId;
    abortController = new AbortController();
    snapshot = snap;
    attached = false;
    state = STATE_QUERYING;
    if (window.SelectionTool && SelectionTool.suspendInput) {
      SelectionTool.suspendInput(true);
    }
    freezeRail(true);
    setProgressVisible(true);
    announce("Querying the current save…");
    syncChrome();
    try {
      lease = SaveClient.acquireRegionalVisit(snap.stamp);
    } catch (error) {
      failCurrent(id, error, false);
      return Promise.reject(error);
    }
    var signal = abortController.signal;
    var work = queryDrain.then(function() {
      if (abandonIfStale(id)) {
        return;
      }
      return runEnter(id, snap, signal);
    }).catch(function(error) {
      if (id !== visitId) {
        return;
      }
      failCurrent(id, error, true);
    });
    return work;
  }

  function exit(reason) {
    if (state === STATE_IDLE) {
      return;
    }
    var id = visitId;
    var wasAttached = attached;
    retireVisit();
    cleanupToIdle({
      restore: true,
      restoreFocus: true,
      status: reason === "cancel" ? "3D view cancelled." : "",
    });
    void id;
    void wasAttached;
  }

  function clearRegion() {
    if (state !== STATE_IDLE) {
      return;
    }
    if (window.HeightView && HeightView.isOpen()) {
      HeightView.dismiss();
    }
    if (window.HeightRegion) {
      HeightRegion.clear("user");
    }
    syncChrome();
  }

  function reopenCommitted() {
    if (state !== STATE_IDLE) {
      return;
    }
    if (window.HeightView && HeightView.reopenCommitted) {
      HeightView.reopenCommitted();
    }
    syncChrome();
  }

  function adapterLive() {
    if (sceneModule && typeof sceneModule.regionalSceneLiveResources === "function") {
      return sceneModule.regionalSceneLiveResources();
    }
    return {
      canvases: 0, controls: 0, listeners: 0, observers: 0, raf: 0,
      geometries: 0, materials: 0, renderers: 0, decodedRefs: 0, attrAllocs: 0,
    };
  }

  function evidence() {
    var live = adapterLive();
    var heap = (typeof performance !== "undefined" && performance.memory)
      ? {
          jsHeapUsed: performance.memory.usedJSHeapSize,
          jsHeapTotal: performance.memory.totalJSHeapSize,
        }
      : { unavailable: "performance.memory is not exposed in this browser" };
    return {
      activity: state,
      visitId: visitId,
      active: state === STATE_ACTIVE,
      busy: visitGatesEdits(),
      attached: attached,
      adapter: {
        canvases: live.canvases || 0,
        controls: live.controls || 0,
        listeners: live.listeners || 0,
        observers: live.observers || 0,
        raf: live.raf || 0,
        geometries: live.geometries || 0,
        materials: live.materials || 0,
        renderers: live.renderers || 0,
        decodedRefs: live.decodedRefs || 0,
      },
      heap: heap,
      wasm: lastWasmSample,
      native: { unavailable: "browser shell; native stats belong to the Tauri trial" },
    };
  }

  function sampleWasm() {
    if (!window.SaveClient || !SaveClient.memStats) {
      lastWasmSample = { unavailable: "SaveClient.memStats is not available" };
      return Promise.resolve(lastWasmSample);
    }
    return SaveClient.memStats().then(function(stats) {
      lastWasmSample = stats && typeof stats === "object"
        ? { memBytes: stats.memBytes, liveBytes: stats.liveBytes }
        : { unavailable: "memStats returned no data" };
      return lastWasmSample;
    }, function() {
      lastWasmSample = { unavailable: "memStats failed in this shell" };
      return lastWasmSample;
    });
  }

  if (enterBtn) {
    enterBtn.addEventListener("click", function() { enter(); });
  }
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function() { exit("cancel"); });
  }
  if (backBtn) {
    backBtn.addEventListener("click", function() { exit("back"); });
  }
  if (resetBtn) {
    resetBtn.addEventListener("click", function() {
      if (handle && handle.resetCamera) {
        handle.resetCamera();
      }
    });
  }
  if (fullRegionBtn) {
    fullRegionBtn.addEventListener("click", function() {
      if (handle && handle.frameFullRegion) {
        handle.frameFullRegion();
      }
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener("click", clearRegion);
  }
  if (reopenBtn) {
    reopenBtn.addEventListener("click", reopenCommitted);
  }
  if (dialogRetry) {
    dialogRetry.addEventListener("click", function() {
      if (dialog) {
        dialog.close();
      }
      enter();
    });
  }
  if (UI && UI.onEscape) {
    UI.onEscape(UI.LAYER.view, function() {
      if (state === STATE_QUERYING || state === STATE_BUILDING) {
        exit("cancel");
        return true;
      }
      if (state === STATE_ACTIVE) {
        exit("escape");
        return true;
      }
      return false;
    });
  }
  if (window.SaveClient && SaveClient.onSessionInvalidated) {
    unsubInvalidated = SaveClient.onSessionInvalidated(onSessionInvalidated);
  }
  if (MapApp && MapApp.setAltitudeRange) {
    var originalSetAltitude = MapApp.setAltitudeRange;
    MapApp.setAltitudeRange = function(min, max) {
      originalSetAltitude.call(MapApp, min, max);
      onAltitudeChanged();
    };
  }

  if (window.HeightRegion) {
    ["commitRectangle", "commitBand", "commitEdge", "clear"].forEach(function(name) {
      var orig = HeightRegion[name];
      HeightRegion[name] = function() {
        var result = orig.apply(HeightRegion, arguments);
        syncChrome();
        return result;
      };
    });
  }

  setOverlayVisible(false);
  setProgressVisible(false);
  syncChrome();

  return {
    enter: enter,
    exit: exit,
    isBusyOrActive: visitGatesEdits,
    syncChrome: syncChrome,
    onAltitudeChanged: onAltitudeChanged,
    evidence: evidence,
    sampleWasm: sampleWasm,
    state: function() { return state; },
    visitId: function() { return visitId; },
    testHooks: testHooks,
    inspect: function() {
      return handle && typeof handle.inspect === "function" ? handle.inspect() : null;
    },
    adapterVisibilityMask: adapterVisibilityMask,
    visitOccupants: function() {
      return occupants ? occupants.slice() : [];
    },
    snapshotSelection: function() {
      return snapshot && snapshot.selectionKeys ? snapshot.selectionKeys.slice() : null;
    },
  };
})();

window.RegionalViewer = RegionalViewer;
