// Persistent Height View delimitation for the loaded save. Chrome open/closed
// is HeightView; this owner keeps the committed rectangle and Cut band across
// dismiss/suspend. Not a query and not a renderer.
var HeightRegion = (function() {
  "use strict";

  var committed = null;
  var revision = 0;

  function copyRect(rect) {
    return {
      minX: rect.minX,
      maxX: rect.maxX,
      minY: rect.minY,
      maxY: rect.maxY,
    };
  }

  function copyBand(band) {
    return { min: band.min, max: band.max };
  }

  function copyCommitted() {
    if (!committed) {
      return null;
    }
    return {
      saveEpoch: committed.saveEpoch,
      revision: committed.revision,
      rectMapPx: copyRect(committed.rectMapPx),
      cutZM: copyBand(committed.cutZM),
    };
  }

  function finiteRect(rect) {
    return rect
      && isFinite(rect.minX) && isFinite(rect.maxX)
      && isFinite(rect.minY) && isFinite(rect.maxY)
      && rect.maxX > rect.minX
      && rect.maxY > rect.minY;
  }

  function finiteBand(band) {
    return band && isFinite(band.min) && isFinite(band.max) && band.max >= band.min;
  }

  function bump() {
    revision += 1;
    if (committed) {
      committed.revision = revision;
    }
  }

  return {
    getCommitted: function() {
      return copyCommitted();
    },
    commitRectangle: function(rectMapPx, initialCutZM, saveEpoch) {
      if (!finiteRect(rectMapPx) || !finiteBand(initialCutZM) || !isFinite(saveEpoch)) {
        return;
      }
      bump();
      committed = {
        saveEpoch: saveEpoch,
        revision: revision,
        rectMapPx: copyRect(rectMapPx),
        cutZM: copyBand(initialCutZM),
      };
    },
    commitBand: function(cutZM) {
      if (!committed || !finiteBand(cutZM)) {
        return;
      }
      bump();
      committed.cutZM = copyBand(cutZM);
    },
    commitEdge: function(rectMapPx) {
      if (!committed || !finiteRect(rectMapPx)) {
        return;
      }
      bump();
      committed.rectMapPx = copyRect(rectMapPx);
    },
    clear: function(reason) {
      if (!committed) {
        return;
      }
      bump();
      committed = null;
      void reason;
    },
  };
})();
