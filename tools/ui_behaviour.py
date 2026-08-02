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
