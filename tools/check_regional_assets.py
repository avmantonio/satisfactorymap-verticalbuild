"""HEC-10: same-origin r170 module/addon graph, license, stamps, script/CSS order.

    py tools/check_regional_assets.py

Runs against source plus dist/ after `py tools/build_site.py`. Not a browser
COEP/CSP trial (S-03) and not a completed viewer.
"""

from __future__ import annotations

import hashlib
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC = os.path.join(REPO, "map", "static", "map")
DIST = os.path.join(REPO, "dist")
VENDOR = os.path.join(STATIC, "vendor")

fails = []


def check(name, ok, detail=""):
    print(("  PASS  " if ok else "  FAIL  ") + name + (("  -- " + str(detail)) if detail else ""))
    if not ok:
        fails.append(name)


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def sha256(path):
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def classic_scripts(html):
    return re.findall(r'<script src="([^"]+)"></script>', html)


def css_hrefs(html):
    return re.findall(r'<link rel="stylesheet" href="([^"]+)">', html)


def imports_of(text):
    return re.findall(
        r"""(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]""",
        text,
    )


INCUMBENT = [
    "vendor/leaflet.js",
    "analytics.js",
    "ui.js",
    "map.js",
    "webgl_layer.js",
    "filters.js",
    "panels.js",
    "altitude.js",
    "tooltip.js",
    "bottleneck.js",
    "finditem.js",
    "progression.js",
    "selection.js",
    "height_view.js",
    "contextmenu.js",
    "save_client.js",
    "editor.js",
    "emst.js",
    "network.js",
    "data.js",
    "height_region.js",
]


def strip_query(url):
    return url.split("?", 1)[0]


def main():
    core = os.path.join(VENDOR, "three.module.min.js")
    addon = os.path.join(VENDOR, "OrbitControls.js")
    license_path = os.path.join(VENDOR, "THREE-LICENSE.txt")
    check("three core present", os.path.isfile(core), core)
    check("OrbitControls present", os.path.isfile(addon), addon)
    check("THREE license present", os.path.isfile(license_path), license_path)

    core_text = read(core) if os.path.isfile(core) else ""
    addon_text = read(addon) if os.path.isfile(addon) else ""
    license_text = read(license_path) if os.path.isfile(license_path) else ""
    check("r170 revision", 't="170"' in core_text or '"170"' in core_text[:2000])
    check("MIT license text", "The MIT License" in license_text and "2010-2024 three.js authors" in license_text)
    check("upstream r170 recorded", "r170" in license_text and "three.module.min.js" in license_text)
    check(
        "core hash recorded",
        "08fd7545d13d2c7fb65ab691530a802dafefd638596501854f267d0fb13c39e7" in license_text,
    )
    check("addon relative core", "./three.module.min.js" in addon_text)
    check("addon has no bare three", "from 'three'" not in addon_text and 'from "three"' not in addon_text)

    html = read(os.path.join(STATIC, "index.html"))
    css = [strip_query(href) for href in css_hrefs(html)]
    check("ui.css before map.css", css.index("ui.css") < css.index("map.css") if "ui.css" in css and "map.css" in css else False, css)
    scripts = [strip_query(src) for src in classic_scripts(html)]
    check("incumbent classic-script subsequence", scripts == INCUMBENT, scripts)
    check("no classic regional adapter", "regional_scene.js" not in scripts and "regional_codec.js" not in scripts)
    check("no import map", "importmap" not in html.lower())

    source_modules = [
        os.path.join(STATIC, "regional_scene.js"),
        os.path.join(STATIC, "regional_codec.js"),
        os.path.join(STATIC, "regional_forms.js"),
        addon,
    ]
    for path in source_modules:
        if not os.path.isfile(path):
            check("source module " + os.path.basename(path), False)
            continue
        text = read(path)
        urls = imports_of(text)
        cdn = [u for u in urls if u.startswith("http://") or u.startswith("https://") or u.startswith("//")]
        bare = [u for u in urls if not u.startswith(".") and not u.startswith("/") and ":" not in u]
        check(os.path.basename(path) + " same-origin imports", not cdn and not bare, urls)

    if not os.path.isdir(DIST) or not os.path.isfile(os.path.join(DIST, "index.html")):
        check("dist built", False, "run tools/build_site.py first")
        print("\n%d check(s) failed" % len(fails))
        sys.exit(1 if fails else 0)

    dist_html = read(os.path.join(DIST, "index.html"))
    dist_scripts = [strip_query(src) for src in classic_scripts(dist_html)]
    check("dist incumbent script subsequence", dist_scripts == INCUMBENT, dist_scripts)
    dist_css = [strip_query(href) for href in css_hrefs(dist_html)]
    check(
        "dist css order",
        dist_css.index("ui.css") < dist_css.index("map.css") if "ui.css" in dist_css and "map.css" in dist_css else False,
        dist_css,
    )

    dist_scene = os.path.join(DIST, "regional_scene.js")
    dist_addon = os.path.join(DIST, "vendor", "OrbitControls.js")
    dist_core = os.path.join(DIST, "vendor", "three.module.min.js")
    check("dist adapter present", os.path.isfile(dist_scene))
    check("dist three present", os.path.isfile(dist_core))
    check("dist OrbitControls present", os.path.isfile(dist_addon))

    scene_imports = imports_of(read(dist_scene)) if os.path.isfile(dist_scene) else []
    addon_imports = imports_of(read(dist_addon)) if os.path.isfile(dist_addon) else []
    check("dist adapter stamps imports", any("?v=" in u for u in scene_imports), scene_imports)
    check("dist addon stamps core", any("three.module.min.js?v=" in u for u in addon_imports), addon_imports)

    def resolve(base_file, url):
        path = url.split("?", 1)[0]
        return os.path.normpath(os.path.join(os.path.dirname(base_file), path))

    resolved = []
    missing = []
    for url in scene_imports + addon_imports:
        origin = dist_scene if url in scene_imports else dist_addon
        path = resolve(origin, url)
        resolved.append((url, path))
        if not os.path.isfile(path):
            missing.append(path)
    check("dist module URLs resolve", not missing, missing)

    three_urls = []
    for url, path in resolved:
        if os.path.basename(path) == "three.module.min.js":
            three_urls.append(os.path.normpath(path) + "?" + (url.split("?", 1)[1] if "?" in url else ""))
    check("single resolved Three core URL", len(set(three_urls)) == 1, three_urls)

    stamps = set()
    for url in scene_imports + addon_imports:
        if "?v=" in url:
            stamps.add(url.split("?v=", 1)[1])
    html_stamp = re.search(r"ui\.css\?v=([0-9a-f]+)", dist_html)
    check("shared cache stamp", html_stamp is not None and stamps == {html_stamp.group(1)}, (stamps, html_stamp.group(1) if html_stamp else None))

    # Nested invalidation: hash of original (unstamped) graph files is part of
    # the combined stamp. Changing decoder/forms/adapter/addon bytes changes it.
    src_hash = hashlib.sha256()
    for rel in ("regional_codec.js", "regional_forms.js", "regional_scene.js", os.path.join("vendor", "OrbitControls.js")):
        src_hash.update(read(os.path.join(STATIC, rel)).encode("utf-8"))
    check("source graph hashed into stamp inputs", src_hash.hexdigest() != "")

    print("\n%d check(s) failed" % len(fails))
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
