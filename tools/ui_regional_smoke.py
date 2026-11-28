"""Daily regional 3D contracts, not an exhaustive option matrix.

Known region from solo_autosave_1.sav. Only fixture setup and observation use
app APIs; entry, exit, filters, altitude and camera use the real controls.
"""


def observe_draws(page):
    """Observe the GPU boundary, not the renderer's self-reported drawn flag."""
    page.add_init_script("""(() => {
      window.__uiRegionalDraws = new WeakMap();
      for (const Type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
        if (!Type) continue;
        for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
          const original = Type.prototype[name];
          if (!original) continue;
          Type.prototype[name] = function(...args) {
            const result = original.apply(this, args);
            if (this.canvas && this.canvas.matches('.regionalSceneCanvas')) {
              const counts = window.__uiRegionalDraws;
              counts.set(this.canvas, (counts.get(this.canvas) || 0) + 1);
            }
            return result;
          };
        }
      }
    })()""")


def run(page, check):
    page.set_default_timeout(30000)
    page.evaluate("""() => {
      HeightRegion.commitRectangle(
        { minX: 699, maxX: 761, minY: 5328, maxY: 5390 },
        { min: -80, max: 120 }, SaveClient.getSessionStamp().saveEpoch);
      HeightView.dismiss();
      const rows = SelectionTool.collectInBox(699, 761, 5328, 5390);
      if (!rows.length) throw new Error('solo fixture region has no selectable objects');
      SelectionTool.setRecords([rows[0]]);
    }""")

    def snapshot():
        return page.evaluate("""() => ({
          region: HeightRegion.getCommitted(),
          selection: SelectionTool.identitySnapshot(),
          edits: EditorTool.opCount(), stamp: SaveClient.getSessionStamp(),
          centre: [MapApp.map.getCenter().lat, MapApp.map.getCenter().lng, MapApp.map.getZoom()],
          altitude: { min: MapApp.altitudeRange.min, max: MapApp.altitudeRange.max }
        })""")

    def idle():
        page.wait_for_function("RegionalViewer.state() === 'idle' && SaveClient.isReady()", timeout=120000)
        page.locator("#regionalViewer").wait_for(state="hidden")
        resources = page.evaluate("RegionalViewer.evidence().adapter")
        check("exit releases regional resources", not any(resources.values()), resources)
        check("exit removes regional canvas", page.locator("canvas.regionalSceneCanvas").count() == 0)
        check("2D map is usable again", page.locator("#map").is_visible())

    def enter():
        page.locator("#regionalEnterBtn").click()
        page.wait_for_function("RegionalViewer.state() === 'active'", timeout=120000)
        page.locator("#regionalViewerHost canvas").wait_for(state="visible")
        page.wait_for_function("""() => {
          const canvas = document.querySelector('#regionalViewerHost canvas');
          return canvas && window.__uiRegionalDraws.get(canvas) > 0;
        }""", timeout=10000)
        view = page.evaluate("RegionalViewer.inspect()")
        check("3D submits visible geometry to WebGL",
              any(row["drawn"] for row in view["occupants"]))
        return view

    # 1. A real visit: draw, orbit, filter, change section, return unchanged.
    before = snapshot()
    first = enter()
    ids = sorted(row["id"] for row in first["occupants"])
    canvas = page.locator("#regionalViewerHost canvas")
    canvas.focus()
    canvas.press("ArrowLeft")
    camera = page.evaluate("RegionalViewer.inspect().camera")
    check("keyboard orbit changes the camera", camera["position"] != first["camera"]["position"])

    page.locator("#uncheckAllButton").click()
    page.wait_for_function("RegionalViewer.inspect().occupants.every(row => !row.drawn)")
    check("shared filters hide 3D objects without removing membership",
          sorted(page.evaluate("RegionalViewer.inspect().occupants.map(row => row.id)")) == ids)
    page.locator("#checkAllButton").click()
    page.wait_for_function("RegionalViewer.inspect().occupants.some(row => row.drawn)")

    section_before = page.evaluate("RegionalViewer.inspect().outline")
    bounds = page.evaluate("Altitude.getRange()")
    page.locator("#altitudeMinMetre").fill(str((bounds["min"] + bounds["max"]) / 2))
    page.locator("#altitudeMinMetre").press("Tab")
    section = page.evaluate("RegionalViewer.inspect()")
    check("altitude changes the visible section, not the committed region",
          section["outline"] != section_before
          and sorted(row["id"] for row in section["occupants"]) == ids
          and page.evaluate("HeightRegion.getCommitted()") == before["region"])
    page.locator("#regionalResetBtn").click()
    reset = page.evaluate("RegionalViewer.inspect().camera")
    midpoint = [(lo + hi) / 2 for lo, hi in zip(section["outline"]["min"], section["outline"]["max"])]
    check("reset camera frames the current section",
          all(abs(actual - expected) < 0.001 for actual, expected in zip(reset["target"], midpoint)))
    page.locator("#regionalBackBtn").click()
    idle()
    check("visiting 3D preserves region, selection, save, undo and 2D view", snapshot() == before)

    # 2. Cancel a dispatched query; a late response must not resurrect it.
    page.evaluate("""() => {
      window.__uiLateRegional = null;
      SaveClient.installRegionalQueryTransport(() => new Promise(resolve => {
        window.__uiLateRegional = resolve;
      }));
    }""")
    page.locator("#regionalEnterBtn").click()
    page.wait_for_function("typeof window.__uiLateRegional === 'function'")
    page.locator("#regionalViewerCancelBtn").click()
    page.evaluate("window.__uiLateRegional(new Uint8Array([0, 1, 2, 3]))")
    page.wait_for_function("!SaveClient.isRegionalQueryPending()")
    idle()
    check("cancelled late response leaves the save and 2D state intact", snapshot() == before)
    second = enter()
    check("a fresh visit works after cancellation", sorted(row["id"] for row in second["occupants"]) == ids)
    page.keyboard.press("Escape")
    idle()
    check("Escape returns without changing 2D state", snapshot() == before)

    # 3. A renderer failure is recoverable, not a stuck save or leaked canvas.
    page.evaluate("""async () => {
      const script = document.querySelector('script[src*="regional_viewer.js"]');
      const query = new URL(script.src).search;
      const scene = await import('/regional_scene.js' + query);
      scene.setRegionalSceneTestFailure('shader');
    }""")
    page.locator("#regionalEnterBtn").click()
    page.locator("#regionalViewerDialog").wait_for(state="visible", timeout=120000)
    idle()
    check("renderer failure preserves the save and 2D state", snapshot() == before)
    page.locator("#regionalViewerDialogRetry").click()
    page.wait_for_function("RegionalViewer.state() === 'active'", timeout=120000)
    page.wait_for_function("""() => {
      const canvas = document.querySelector('#regionalViewerHost canvas');
      return canvas && window.__uiRegionalDraws.get(canvas) > 0;
    }""", timeout=10000)
    page.locator("#regionalBackBtn").click()
    idle()
    check("retry recovers a usable viewer and returns safely", snapshot() == before)
