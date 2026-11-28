"""Small daily UI guard, with opt-in regional diagnostics.

    py tools/ui_behaviour.py --serve
    py tools/ui_behaviour.py --serve --suite 3d
    py tools/ui_behaviour.py --serve --suite hooks renderer
    py tools/ui_behaviour.py --serve --suite stress

Runs against dist/: build first. Requires Playwright and system Chrome.
Regional suites use the solo_autosave_1.sav fixture's known coordinates.
See docs/ui-behaviour-tests.md for scope and maintenance rules.
"""

import argparse
import glob
import importlib
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUITES = {
    "shell": "ui_behaviour_shell",
    "3d": "ui_regional_smoke",
    "hooks": "ui_regional_hooks",
    "renderer": "ui_regional_renderer",
    "stress": "ui_regional_stress",
}


def pick_save(explicit, suites):
    if explicit:
        return os.path.abspath(explicit)
    uploads = os.path.join(REPO, "map", "uploads")
    solo = os.path.join(uploads, "solo_autosave_1.sav")
    if os.path.isfile(solo):
        return solo
    if any(suite != "shell" for suite in suites):
        sys.exit("Regional suites require map/uploads/solo_autosave_1.sav. "
                 "Run tools/fetch_test_saves.py or pass --save with the same fixture layout.")
    found = sorted(glob.glob(os.path.join(uploads, "*.sav")))
    if found:
        return found[0]
    sys.exit("No save in map/uploads/ -- pass --save or run tools/fetch_test_saves.py.")


def load_save(page, base_url, save):
    page.goto(base_url + "/index.html")
    page.set_input_files("#uploadFileInput", save)
    page.wait_for_function(
        "window.SaveClient && SaveClient.isReady() && window.MapApp && "
        "MapApp.layer && MapApp.layer.buckets && MapApp.layer.buckets.length > 0",
        timeout=300000,
    )


def wait_server(base_url, server):
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        if server.poll() is not None:
            raise RuntimeError("serve_site.py exited before becoming ready")
        try:
            with urllib.request.urlopen(base_url + "/index.html", timeout=1):
                return
        except (urllib.error.URLError, TimeoutError):
            time.sleep(0.1)
    raise RuntimeError("Timed out waiting for " + base_url)


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--save", help="save file (regional suites assume the solo fixture layout)")
    parser.add_argument("--port", type=int, default=8791)
    parser.add_argument("--serve", action="store_true", help="start tools/serve_site.py")
    parser.add_argument("--headed", action="store_true")
    parser.add_argument("--suite", nargs="+", choices=[*SUITES, "all"],
                        help="default: shell 3d; stress includes 20 visits and injected failures")
    args = parser.parse_args()
    selected = args.suite or ["shell", "3d"]
    selected = list(SUITES) if "all" in selected else list(dict.fromkeys(selected))
    save = pick_save(args.save, selected)
    base_url = "http://localhost:%d" % args.port
    fails = []

    def check(name, ok, detail=""):
        print(("  PASS  " if ok else "  FAIL  ") + name
              + (("  -- " + str(detail)) if detail else ""), flush=True)
        if not ok:
            fails.append(name)

    server = None
    try:
        if args.serve:
            server = subprocess.Popen(
                [sys.executable, os.path.join(REPO, "tools", "serve_site.py"), str(args.port)],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            wait_server(base_url, server)
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="chrome", headless=not args.headed)
            try:
                for name in selected:
                    print("\n=== %s ===" % name, flush=True)
                    started = time.monotonic()
                    # Each group gets a fresh context/save: hooks, reset and
                    # failed scenarios must not contaminate subsequent groups.
                    page = browser.new_page(viewport={"width": 1600, "height": 900})
                    errors = []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    page.on("console", lambda msg: errors.append(msg.text)
                            if msg.type == "error" and "404" not in msg.text
                            and "Failed to load resource" not in msg.text else None)
                    def group_check(label, ok, detail=""):
                        check(name + ": " + label, ok, detail)

                    try:
                        module = importlib.import_module(SUITES[name])
                        if name == "shell":
                            module.run(page, save, base_url, group_check)
                        else:
                            if name == "3d":
                                module.observe_draws(page)
                            load_save(page, base_url, save)
                            module.run(page, group_check)
                    except Exception as error:
                        group_check("scenario completed", False, str(error))
                    finally:
                        group_check("no JS errors", not errors, errors[:5])
                        page.close()
                        print("  %.1fs elapsed" % (time.monotonic() - started), flush=True)
            finally:
                browser.close()
    finally:
        if server:
            server.terminate()
            server.wait(timeout=10)
    print("\n%d check(s) failed" % len(fails))
    for name in fails:
        print("  " + name)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
