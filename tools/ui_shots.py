"""Capture (and optionally diff) screenshots of every major UI state.

This is the guard rail for frontend refactors: the map's chrome has no unit
tests, so "did that CSS change break the building modal at 1024px" is only
answerable by looking. Run it once before a change to record baselines, once
after to compare.

    py tools/ui_shots.py --serve --out ui_shots/before
    ...make changes, rebuild dist...
    py tools/ui_shots.py --serve --out ui_shots/after --baseline ui_shots/before

Exit code is non-zero if any state differs from its baseline by more than
--tolerance percent of pixels, so it can also be wired into CI.

Requires `pip install playwright` (uses system Chrome, no browser download)
and, for --baseline, `pip install pillow`.

The states are captured against dist/, so run tools/build_site.py (or copy the
changed files into dist/) first. --serve starts tools/serve_site.py itself and
shuts it down at the end.
"""

import argparse
import glob
import os
import subprocess
import sys
import time

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_PORT = 8791

# The state list. Each entry is (name, callable(page)); the callable leaves the
# page in the state to be shot. They run in order and share one page, so a
# state may rely on the previous one having been dismissed.
DESKTOP = {"width": 1600, "height": 900}


def pickSave(explicit):
    """The save every state is captured against.

    All_*.sav holds one of every buildable, which is what makes the sidebar
    render every category -- a small factory save would leave half the UI
    unexercised.
    """
    if explicit:
        return explicit
    candidates = sorted(glob.glob(os.path.join(REPO, "map", "uploads", "All_*.sav")))
    if not candidates:
        sys.exit("No map/uploads/All_*.sav found -- pass --save explicitly "
                 "(see tools/fetch_test_saves.py).")
    return candidates[-1]


def waitForParse(page):
    page.wait_for_function(
        "window.MapApp && MapApp.layer && MapApp.layer.buckets "
        "&& MapApp.layer.buckets.length > 0",
        timeout=300000)
    page.wait_for_timeout(2500)  # Tiles + the first canvas draw settle after the buckets land.


def clickSuggestion(page, query, contains=None):
    """Type into the search bar and click the first (or first matching) row."""
    page.click("#mainSearchInput")
    page.fill("#mainSearchInput", query)
    page.wait_for_timeout(700)
    rows = page.query_selector_all(".searchSuggestionRow")
    for row in rows:
        if contains is None or contains.lower() in row.inner_text().lower():
            row.click()
            return True
    return False


def dismiss(page):
    """Back to a bare loaded map: close whatever is open, clear the search."""
    for _ in range(3):
        page.keyboard.press("Escape")
        page.wait_for_timeout(150)
    page.fill("#mainSearchInput", "")
    page.wait_for_timeout(300)


# The editor/busy states below are forced open rather than driven, so they also
# have to be forced shut -- a page.reload() would drop the parsed save (it only
# ever lives in the tab's memory) and cost another full parse.
FORCED_PANELS = ["selectionPanel", "editorToolbar", "editorHint", "pastePanel"]


def hideForced(page):
    page.evaluate("""(ids) => {
      if (window.Panels) window.Panels.closeTool();
      ids.forEach(id => {
        const e = document.getElementById(id);
        if (e) e.style.display = 'none';
      });
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
    }""", FORCED_PANELS)
    page.wait_for_timeout(300)


def capture(page, save, outDir, only=None):
    shots = []

    def shot(name):
        if only and name not in only:
            return
        path = os.path.join(outDir, name + ".png")
        page.screenshot(path=path)
        shots.append(name)
        print("  " + name)

    page.set_viewport_size(DESKTOP)
    page.goto("http://localhost:%d/index.html" % PORT)
    page.wait_for_timeout(1500)
    shot("01-empty")

    page.set_input_files("#uploadFileInput", save)
    waitForParse(page)
    shot("02-loaded")

    # Sidebar with a category open (the master/detail state).
    for row in page.query_selector_all(".categoryNavRow"):
        if "Production" in row.inner_text():
            row.click()
            break
    page.wait_for_timeout(800)
    shot("03-category-open")

    # Search suggestions dropdown.
    page.click("#mainSearchInput")
    page.fill("#mainSearchInput", "iron")
    page.wait_for_timeout(700)
    shot("04-search-suggestions")
    dismiss(page)

    # Item modal (grouped location list).
    if clickSuggestion(page, "iron ingot", "iron ingot"):
        page.wait_for_timeout(1800)
        shot("05-item-modal")
    dismiss(page)

    # Building modal (stat tiles + recipe bars).
    if clickSuggestion(page, "constructor", "constructor"):
        page.wait_for_timeout(1800)
        shot("06-building-modal")
    dismiss(page)

    # Depot contents (same dialog, different filler).
    page.click("#depotIconButton")
    page.wait_for_timeout(1500)
    shot("07-depot-modal")
    dismiss(page)

    # Progression: the dropdown, then one of its views.
    page.click("#statusMenuButton")
    page.wait_for_timeout(300)
    shot("08-status-menu")
    page.click("#hubIconButton")
    page.wait_for_timeout(1500)
    shot("09-progression-modal")
    dismiss(page)

    # Network finder (search-bar-only tool panel).
    if clickSuggestion(page, "optimal network", "network"):
        page.wait_for_timeout(900)
        shot("10-network-panel")
    page.evaluate("window.NetworkTool && NetworkTool.close && NetworkTool.close()")
    dismiss(page)

    # Editor surfaces. Driving a real rectangle selection needs objects under a
    # known screen rect, which is brittle across zoom changes -- these panels
    # are pure chrome, so they are shown directly with representative content.
    page.evaluate("""() => {
      const set = (id, text) => { const e = document.getElementById(id); if (e && text) e.textContent = text; };
      const show = (id, how) => { const e = document.getElementById(id); if (e) e.style.display = how; };
      show('selectionPanel', 'flex');
      set('selectionCount', '1,284 objects selected');
      show('editorToolbar', 'flex');
      set('editorEditCount', '3 pending edits');
      show('editorHint', 'block');
      // Tool panels live in the right dock -- go through the same API the
      // editor does, or the dock stays collapsed and nothing shows.
      window.Panels.openTool(document.getElementById('pastePanel'));
      set('pastePanelTitle', 'Paste 1,284 objects');
    }""")
    page.wait_for_timeout(500)
    shot("11-editor-paste")
    page.evaluate("""() => {
      window.Panels.closeTool();
      const hint = document.getElementById('editorHint');
      if (hint) hint.style.display = 'none';
      const dlg = document.getElementById('offsetDialog');
      if (dlg && !dlg.open) {
        dlg.showModal();
        // Match what openOffsetDialog does, or the shot shows a focus ring on
        // the close button that never appears in real use.
        document.getElementById('offsetDx').focus();
      }
    }""")
    page.wait_for_timeout(400)
    shot("12-offset-dialog")
    hideForced(page)

    # Busy overlay (shown during save edits).
    page.evaluate("""() => {
      const dlg = document.getElementById('busyDialog');
      if (!dlg) return;
      if (!dlg.open) dlg.showModal();
      document.getElementById('busyLabel').textContent = 'Pasting 1,284 objects…';
      document.getElementById('busyPhase').textContent = 'Rewriting level data';
      document.getElementById('busyFill').style.width = '62%';
    }""")
    page.wait_for_timeout(400)
    shot("13-busy-overlay")
    hideForced(page)

    # Narrow viewports: the states most likely to break when the layout changes.
    for name, size in (("14-narrow-1280", {"width": 1280, "height": 800}),
                       ("15-narrow-1024", {"width": 1024, "height": 700}),
                       ("16-small-800", {"width": 800, "height": 600})):
        page.set_viewport_size(size)
        page.wait_for_timeout(900)
        shot(name)
    page.set_viewport_size(DESKTOP)
    page.wait_for_timeout(600)

    # Sidebar hidden (the map with no chrome but the top bar).
    page.click("#menuButton")
    page.wait_for_timeout(700)
    shot("17-sidebar-hidden")
    page.click("#menuButton")
    page.wait_for_timeout(500)

    return shots


def compare(outDir, baselineDir, tolerance):
    try:
        from PIL import Image, ImageChops
    except ImportError:
        sys.exit("--baseline needs Pillow: pip install pillow")

    failures = []
    diffDir = os.path.join(outDir, "diff")
    for path in sorted(glob.glob(os.path.join(outDir, "*.png"))):
        name = os.path.basename(path)
        basePath = os.path.join(baselineDir, name)
        if not os.path.exists(basePath):
            print("  NEW      %s (no baseline)" % name)
            continue
        after = Image.open(path).convert("RGB")
        before = Image.open(basePath).convert("RGB")
        if after.size != before.size:
            failures.append((name, "size %s -> %s" % (before.size, after.size)))
            print("  RESIZED  %s %s -> %s" % (name, before.size, after.size))
            continue
        diff = ImageChops.difference(after, before)
        changed = sum(1 for px in diff.getdata() if px != (0, 0, 0))
        pct = 100.0 * changed / (after.size[0] * after.size[1])
        if pct > tolerance:
            failures.append((name, "%.2f%% of pixels" % pct))
            os.makedirs(diffDir, exist_ok=True)
            # Amplify so a subtle shift is actually visible in the diff image.
            ImageChops.multiply(diff, diff).save(os.path.join(diffDir, name))
            print("  CHANGED  %-24s %.2f%% of pixels" % (name, pct))
        else:
            print("  same     %-24s %.2f%%" % (name, pct))
    return failures


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--out", default=os.path.join(REPO, "ui_shots", "current"),
                        help="directory to write PNGs into")
    parser.add_argument("--baseline", help="directory to compare against")
    parser.add_argument("--save", help="the .sav to load (default: newest map/uploads/All_*.sav)")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--serve", action="store_true",
                        help="start tools/serve_site.py for the run")
    parser.add_argument("--headed", action="store_true")
    parser.add_argument("--only", nargs="*", help="capture only these state names")
    parser.add_argument("--tolerance", type=float, default=0.05,
                        help="percent of differing pixels tolerated (default 0.05)")
    args = parser.parse_args()

    global PORT
    PORT = args.port
    save = pickSave(args.save)
    outDir = os.path.abspath(args.out)
    os.makedirs(outDir, exist_ok=True)

    server = None
    if args.serve:
        server = subprocess.Popen([sys.executable, os.path.join(REPO, "tools", "serve_site.py"),
                                   str(PORT)],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(2)

    try:
        from playwright.sync_api import sync_playwright
        print("save:   %s" % os.path.basename(save))
        print("out:    %s" % outDir)
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="chrome", headless=not args.headed)
            page = browser.new_page(viewport=DESKTOP)
            shots = capture(page, save, outDir, set(args.only) if args.only else None)
            browser.close()
        print("%d states captured" % len(shots))
    finally:
        if server:
            server.terminate()

    if args.baseline:
        print("\ncompared against %s" % os.path.abspath(args.baseline))
        failures = compare(outDir, os.path.abspath(args.baseline), args.tolerance)
        if failures:
            print("\n%d state(s) changed beyond %.2f%%:" % (len(failures), args.tolerance))
            for name, why in failures:
                print("  %s -- %s" % (name, why))
            print("diff images in %s" % os.path.join(outDir, "diff"))
            sys.exit(1)
        print("\nno state changed beyond %.2f%%" % args.tolerance)


if __name__ == "__main__":
    main()
