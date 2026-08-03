"""Find DOM elements the JS builds with no styling behind them at all.

The frontend styles content through a small set of primitives in ui.css
(.btn, .field, .row, .list, .bar, .kicker, .chip...). A feature adds its own
class next to one of those as a JS/CSS hook -- `el("div", "row row-hover
networkRow")`. That is fine and expected.

What is NOT fine is an element whose classes are ALL unstyled, which is what a
rename that missed a call site looks like: the element still gets built, no rule
matches it any more, and it renders as raw unstyled text. That shipped once --
the selection inventory list rendered as "Concrete51,836" for a while, because
selection.js still asked for .itemLocationRow/.itemLocationLabel after those
rules were replaced by .row/.row-label.

    py tools/ui_classes.py

Exit code is non-zero if any element is completely unstyled. Static check --
no browser, no save, nothing to serve.
"""

import glob
import io
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATIC = os.path.join(REPO, "map", "static", "map")

# Classes nothing in our stylesheets defines on purpose: Leaflet's own, and
# state hooks that exist only for JS to query.
EXTERNAL_PREFIXES = ("leaflet-",)


def definedClasses():
    """Every class name our stylesheets (and Leaflet's) actually style."""
    defined = set()
    for name in ("map.css", "ui.css", os.path.join("vendor", "leaflet.css")):
        path = os.path.join(STATIC, name)
        if not os.path.isfile(path):
            continue
        text = io.open(path, encoding="utf-8", errors="replace").read()
        text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
        defined.update(re.findall(r"\.(-?[A-Za-z_][\w-]*)", text))
    return defined


# Each pattern captures a full class ATTRIBUTE (possibly several classes), so
# the check can ask "did any of these get styled" rather than judging names one
# at a time.
CLASS_PATTERNS = [
    r'\bel\(\s*"[a-zA-Z]+"\s*,\s*"([^"]+)"',        # el("div", "a b c")
    r'\.className\s*=\s*"([^"]+)"',                  # node.className = "a b"
    r'\bUI\.el\(\s*"[a-zA-Z]+"\s*,\s*"([^"]+)"',
]


def emittedClassLists():
    """[(file, line, classList)] for every element the JS builds with classes."""
    out = []
    for path in sorted(glob.glob(os.path.join(STATIC, "*.js"))):
        name = os.path.basename(path)
        if name in ("ui.js", "worker.js"):
            continue  # ui.js DEFINES the primitives; worker.js has no DOM.
        for lineNo, line in enumerate(io.open(path, encoding="utf-8"), 1):
            for pattern in CLASS_PATTERNS:
                for match in re.findall(pattern, line):
                    # Skip concatenations -- the literal is only half the name.
                    if match.rstrip().endswith(("-", "_")):
                        continue
                    classes = [c for c in match.split() if c]
                    if classes:
                        out.append((name, lineNo, classes))
    return out


def main():
    defined = definedClasses()
    problems = []
    for name, lineNo, classes in emittedClassLists():
        if any(c.startswith(EXTERNAL_PREFIXES) for c in classes):
            continue
        if not any(c in defined for c in classes):
            problems.append((name, lineNo, classes))

    if not problems:
        print("every element the JS builds has at least one styled class")
        return 0

    print("%d element(s) built with no styled class at all:\n" % len(problems))
    for name, lineNo, classes in problems:
        print("  %s:%d" % (name, lineNo))
        print("      class=\"%s\"" % " ".join(classes))
    print("\nEach of these renders unstyled. Either the class was renamed and "
          "this call site was missed,\nor it needs a ui.css primitive "
          "(.row / .btn / .field / .list / .kicker / ...) alongside it.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
