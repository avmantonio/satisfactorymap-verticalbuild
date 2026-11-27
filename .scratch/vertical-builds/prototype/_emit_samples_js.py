"""Wrap transform-samples.json so the HTML can load it via file://."""
import json
from pathlib import Path

here = Path(__file__).parent
data = json.loads((here / "transform-samples.json").read_text(encoding="utf-8"))
js = here / "transform-samples.data.js"
js.write_text(
    "window.TRANSFORM_SAMPLES = "
    + json.dumps(data, ensure_ascii=False)
    + ";\n",
    encoding="utf-8",
)
print("wrote", js.name, js.stat().st_size)
