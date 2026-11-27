"""Behavioural checks for the app shell -- the things a screenshot cannot see.

tools/ui_shots.py catches "does it still LOOK right". This catches "does it
still WORK right": that dialogs are real modals, that the hover tooltip can
still paint above one, that Escape peels exactly one layer, that opening a
category does not resize the map, that only one tool can occupy the right dock.

    py tools/ui_behaviour.py --serve

Requires `pip install playwright` (uses system Chrome, no browser download)
and a save in map/uploads/. Exit code is non-zero if any check fails.

Runs against dist/, so build (or copy the changed files into dist/) first.
"""

import argparse
import glob
import os
import subprocess
import sys
import time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_PORT = 8791

fails = []


def check(name, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + name + (("  -- " + str(detail)) if detail else ""))
    if not ok:
        fails.append(name)


def pickSave(explicit):
    """Prefer a real factory save: several checks need populated inventories
    (the item dialog's location list) and a full category tree."""
    if explicit:
        return explicit
    uploads = os.path.join(REPO, "map", "uploads")
    for pattern in ("solo_*.sav", "*.sav"):
        found = sorted(glob.glob(os.path.join(uploads, pattern)))
        if found:
            return found[0]
    sys.exit("No save in map/uploads/ -- pass --save (see tools/fetch_test_saves.py).")


def run(page, save):
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text)
            if m.type == "error" and "404" not in m.text
            and "Failed to load resource" not in m.text else None)

    page.goto("http://localhost:%d/index.html" % PORT)
    page.wait_for_timeout(1500)

    # ---- Empty state ---------------------------------------------------------
    check("no JS errors on load", not errors, errors[:3])
    check("empty state shown", page.is_visible("#dockEmptyState"))
    check("nav header hidden while empty", not page.is_visible("#categoryNavHeader"))
    # The old layout reserved the altitude rail's width unconditionally, which
    # showed as a dead black strip beside the map before any save was loaded.
    check("tool dock takes no width when empty", page.evaluate(
        "Math.round(document.getElementById('toolDock').getBoundingClientRect().width)") == 0)

    print("loading %s ..." % os.path.basename(save))
    page.set_input_files("#uploadFileInput", save)
    page.wait_for_function(
        "window.MapApp && MapApp.layer && MapApp.layer.buckets && MapApp.layer.buckets.length > 0",
        timeout=300000)
    page.wait_for_timeout(3000)

    check("empty state hidden after load", not page.is_visible("#dockEmptyState"))
    check("nav header shown after load", page.is_visible("#categoryNavHeader"))
    check("altitude rail docked", page.is_visible("#altitudePanel"))

    # ---- Push navigation -----------------------------------------------------
    # The whole point of push-navigation over a second column: browsing
    # categories must not take space away from the map.
    widthBefore = page.evaluate("document.getElementById('map').getBoundingClientRect().width")
    for row in page.query_selector_all(".categoryNavRow"):
        if "Production" in row.inner_text():
            row.click()
            break
    page.wait_for_timeout(600)
    widthAfter = page.evaluate("document.getElementById('map').getBoundingClientRect().width")
    check("opening a category does not resize the map", widthBefore == widthAfter,
          "%s -> %s" % (widthBefore, widthAfter))
    check("detail pane is titled", page.inner_text("#detailTitle").strip() != "")
    check("off-screen pane is inert",
          page.evaluate("document.getElementById('dockPaneNav').inert") is True)

    page.keyboard.press("Escape")
    page.wait_for_timeout(500)
    check("Escape returns to the category list",
          not page.evaluate("document.body.classList.contains('category-open')"))

    # ---- Dialogs -------------------------------------------------------------
    page.click("#mainSearchInput")
    page.fill("#mainSearchInput", "iron ore")
    page.wait_for_timeout(900)
    for row in page.query_selector_all(".searchSuggestionRow"):
        if "iron ore" in row.inner_text().lower():
            row.click()
            break
    page.wait_for_timeout(2500)
    check("item dialog is a native modal dialog",
          page.evaluate("document.getElementById('itemModal').open") is True)
    check("page is inert behind the dialog",
          page.evaluate("document.body.matches(':has(dialog[open])')"))

    # The riskiest change in the refactor: showModal() puts the dialog in the
    # top layer, where no z-index can reach it, so the hover tooltip had to
    # become a top-layer popover to keep working over a dialog's location list.
    # Group HEADERS carry no tooltip (they stand for many machines), so expand
    # one and hover an individual location.
    header = page.query_selector("#itemModalList .itemLocationGroupHeader")
    if header:
        header.click()
        page.wait_for_timeout(600)
    rows = page.query_selector_all("#itemModalList .itemLocationChildRow")
    if rows:
        rows[0].hover()
        page.wait_for_timeout(600)
        page.mouse.move(0, 0)          # Force a fresh mouseenter.
        rows[0].hover()
        page.wait_for_timeout(900)
        shown = page.evaluate("""() => {
          const t = document.getElementById('tt-tooltip');
          if (!t) return {exists: false};
          const r = t.getBoundingClientRect();
          return {exists: true, open: t.matches(':popover-open'), h: Math.round(r.height)};
        }""")
        check("tooltip paints above an open dialog",
              bool(shown.get("open")) and shown.get("h", 0) > 20, shown)
    else:
        print("  (no expandable locations in this save -- tooltip check skipped)")

    page.keyboard.press("Escape")
    page.wait_for_timeout(500)
    check("Escape closes the dialog",
          page.evaluate("document.getElementById('itemModal').open") is False)

    # ---- Escape layering -----------------------------------------------------
    page.click("#statusMenuButton")
    page.wait_for_timeout(300)
    check("status menu opens", page.is_visible("#statusMenu"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)
    check("Escape closes the status menu", not page.is_visible("#statusMenu"))

    # ---- Tool dock -----------------------------------------------------------
    page.evaluate("window.NetworkTool.open()")
    page.wait_for_timeout(700)
    check("network tool opens inside the dock",
          page.evaluate("document.getElementById('networkPanel').parentElement.id") == "toolPanels")
    mapWidth = page.evaluate("document.getElementById('map').getBoundingClientRect().width")
    check("opening a tool does not resize the map", mapWidth == widthAfter,
          "%s == %s" % (mapWidth, widthAfter))

    # The floating versions of these two shared an anchor and could land on the
    # same pixels; the dock holds exactly one.
    page.evaluate("window.Panels.openTool(document.getElementById('pastePanel'))")
    page.wait_for_timeout(400)
    check("opening a second tool hides the first",
          page.evaluate("getComputedStyle(document.getElementById('networkPanel')).display") == "none")
    page.evaluate("window.Panels.closeTool()")
    page.wait_for_timeout(400)
    check("closing the tool collapses the dock",
          page.evaluate("document.getElementById('toolPanels').getBoundingClientRect().width") == 0)

    # ---- The map's box never changes -----------------------------------------
    #
    # This is the whole reason the docks overlay the map instead of taking grid
    # columns. If the map's box is constant, Leaflet is never asked to re-fit
    # it, so it can never re-centre and slide the world sideways -- the ~141px
    # lurch that two rounds of compensation code failed to fix (see
    # docs/dock-map-anchoring.md). Assert the cause, not the symptom: box
    # unchanged AND a pinned world point unmoved, sampled every frame.
    page.evaluate("window.__probeLatLng = MapApp.map.getCenter()")
    SWEEP = """(frames) => {
      const out = []; let n = 0;
      const mapEl = document.getElementById('map');
      window.__sweep = new Promise(resolve => {
        function tick() {
          const r = mapEl.getBoundingClientRect();
          const p = MapApp.map.latLngToContainerPoint(window.__probeLatLng);
          out.push({ box: [Math.round(r.left), Math.round(r.top),
                           Math.round(r.width), Math.round(r.height)],
                     probeX: Math.round(r.left + p.x),
                     probeY: Math.round(r.top + p.y) });
          if (++n < frames) requestAnimationFrame(tick); else resolve(out);
        }
        requestAnimationFrame(tick);
      });
      return null;   // Do not hand the promise back, or the call awaits it.
    }"""
    FRAMES = 40

    def holdsStill(label, action):
        page.evaluate(SWEEP, FRAMES)
        page.wait_for_timeout(60)
        action()
        page.wait_for_timeout(FRAMES * 20 + 400)
        rows = page.evaluate("window.__sweep")
        ref = rows[0]
        boxChanged = [r for r in rows if r["box"] != ref["box"]]
        moved = [r for r in rows
                 if abs(r["probeX"] - ref["probeX"]) > 1 or abs(r["probeY"] - ref["probeY"]) > 1]
        detail = ""
        if boxChanged:
            detail = "map box changed %s -> %s" % (ref["box"], boxChanged[0]["box"])
        elif moved:
            worst = max(moved, key=lambda r: abs(r["probeX"] - ref["probeX"]))
            detail = "%d/%d frames moved, worst %+dpx" % (
                len(moved), len(rows), worst["probeX"] - ref["probeX"])
        check("map never moves: " + label, not boxChanged and not moved, detail)

    holdsStill("hiding the layers dock",
               lambda: page.evaluate("document.getElementById('menuButton').click()"))
    holdsStill("showing the layers dock",
               lambda: page.evaluate("document.getElementById('menuButton').click()"))
    holdsStill("opening a tool dock", lambda: page.evaluate("NetworkTool.open()"))
    holdsStill("closing a tool dock", lambda: page.evaluate("NetworkTool.close()"))
    holdsStill("opening a category",
               lambda: page.evaluate("document.querySelectorAll('.categoryNavRow')[4].click()"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(400)

    # Dragging the dock's edge is the densest version of the same thing: many
    # width changes in a row, none of which may reach the map.
    handle = page.query_selector("#dockResizeHandle")
    if handle:
        box = handle.bounding_box()
        page.evaluate(SWEEP, FRAMES)
        page.wait_for_timeout(60)
        page.mouse.move(box["x"] + 3, box["y"] + 200)
        page.mouse.down()
        for step in range(10):
            page.mouse.move(box["x"] + 3 + step * 12, box["y"] + 200)
            page.wait_for_timeout(30)
        page.mouse.up()
        page.wait_for_timeout(FRAMES * 20 + 400)
        rows = page.evaluate("window.__sweep")
        ref = rows[0]
        bad = [r for r in rows if r["box"] != ref["box"]
               or abs(r["probeX"] - ref["probeX"]) > 1]
        check("map never moves: dragging the dock's width", not bad,
              "%d/%d frames" % (len(bad), len(rows)))

    # ---- Everything centred agrees on one centre ------------------------------
    #
    # The app bar centres its search field on the window; the floating hints,
    # the selection bar and the dialogs must line up with it. They have drifted
    # apart twice: once when the map's overlay layer insetted by each dock
    # separately (109px out), and once from a leftover JS hack that measured the
    # search box and wrote an inline `left` in VIEWPORT coordinates onto an
    # element whose containing block was the overlay layer (a quarter of the
    # window out). Both were invisible to every other check.
    page.evaluate("""() => {
      const show = (i, how) => { const e = document.getElementById(i); if (e) e.style.display = how; };
      show('activeFilterBanner', 'flex'); show('selectionPanel', 'flex');
      show('editorToolbar', 'flex'); show('editorHint', 'block'); show('networkHint', 'block');
    }""")
    page.wait_for_timeout(400)
    CENTRES = """() => {
      const c = el => { if (!el) return null; const r = el.getBoundingClientRect();
                        return r.width ? Math.round(r.left + r.width / 2) : null; };
      const id = s => document.getElementById(s);
      return { window: Math.round(window.innerWidth / 2),
               searchPill: c(id('searchBox')),
               filterBanner: c(id('activeFilterBanner')),
               selectionBar: c(id('selectionPanel')),
               editorToolbar: c(id('editorToolbar')),
               editorHint: c(id('editorHint')),
               networkHint: c(id('networkHint')) };
    }"""

    def centred(label):
        c = page.evaluate(CENTRES)
        mid = c.pop("window")
        off = ["%s %+d" % (k, v - mid) for k, v in c.items()
               if v is not None and abs(v - mid) > 1]
        check("centred on the window: " + label, not off, ", ".join(off))

    centred("dock open")
    page.evaluate("NetworkTool.open()")
    page.wait_for_timeout(700)
    centred("tool dock open")
    page.evaluate("NetworkTool.close()")
    page.evaluate("document.getElementById('menuButton').click()")
    page.wait_for_timeout(700)
    centred("dock hidden")
    page.evaluate("document.getElementById('menuButton').click()")
    page.wait_for_timeout(500)
    # The altitude rail's 4px track has its own centring inside the 64px rail.
    track = page.evaluate("""() => {
      const rail = document.getElementById('altitudePanel').getBoundingClientRect();
      const bg = document.querySelector('.altitudeTrackBg').getBoundingClientRect();
      return [Math.round(bg.width), Math.round((bg.left + bg.width/2) - (rail.left + rail.width/2))];
    }""")
    check("altitude track is 4px and centred in the rail",
          track[0] == 4 and abs(track[1]) <= 1, track)

    # These were forced visible; leave them hidden or they sit over the map and
    # swallow the clicks the checks below need.
    page.evaluate("""() => {
      ['activeFilterBanner','selectionPanel','editorToolbar','editorHint','networkHint']
        .forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; });
    }""")
    page.wait_for_timeout(300)

    # ---- Search --------------------------------------------------------------
    page.click("#mainSearchInput")
    page.fill("#mainSearchInput", "constructor")
    page.wait_for_timeout(800)
    check("combobox announces its listbox",
          page.get_attribute("#mainSearchInput", "aria-expanded") == "true")
    rows = page.query_selector_all(".searchSuggestionRow")
    if rows:
        rows[0].click()
        page.wait_for_timeout(1500)
        check("search field clears once a result is committed",
              page.input_value("#mainSearchInput") == "")
        page.keyboard.press("Escape")
        page.wait_for_timeout(400)

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
        if (sample) {
          const typePath = sample.key.slice('building:'.length);
          const release = Filters.registerRegionalTypes([{ typePath: typePath, category: 'Unknown' }]);
          const mask = Filters.resolveRegionalVisibility([{ id: sample.ids[0], typePath: typePath }]);
          if (!mask[sample.ids[0]]) fail('hec07-mask');
          release();
        } else {
          fail('hec07-sample-bucket');
        }
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

        handle.dispose();
        handle.dispose();
        liveZero(regionalSceneLiveResources(), 'hec08-after-dispose');
        if (host.querySelector('canvas')) fail('hec08-canvas-left');

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

    check("no JS errors overall", not errors, errors[:5])


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--save", help="the .sav to load")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--serve", action="store_true",
                        help="start tools/serve_site.py for the run")
    parser.add_argument("--headed", action="store_true")
    args = parser.parse_args()

    global PORT
    PORT = args.port
    save = pickSave(args.save)

    server = None
    if args.serve:
        server = subprocess.Popen([sys.executable, os.path.join(REPO, "tools", "serve_site.py"),
                                   str(PORT)],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(2)

    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="chrome", headless=not args.headed)
            page = browser.new_page(viewport={"width": 1600, "height": 900})
            run(page, save)
            browser.close()
    finally:
        if server:
            server.terminate()

    print("\n%d check(s) failed" % len(fails))
    for name in fails:
        print("  " + name)
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
