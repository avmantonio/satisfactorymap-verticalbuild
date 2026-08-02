// UI -- the shared component layer every feature builds from.
//
// It exists because the app grew six list-row shapes, five progress bars,
// four modal implementations and three private copies of el(). Each was
// reasonable on its own and collectively they meant "make the panels match"
// was a manual, never-finished job.
//
// Two rules keep it honest:
//   - Nothing here knows about maps, saves or buckets. It is chrome only;
//     features supply content.
//   - Anything visual it emits is styled by ui.css from map.css's tokens.
//
// Loaded before every feature script (see index.html).

var UI = {};

(function() {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  // ---- Elements -------------------------------------------------------------

  // The one el(). filters.js, finditem.js and tooltip.js each carried their
  // own identical copy before this.
  UI.el = function(tag, className, text) {
    var e = document.createElement(tag);
    if (className) {
      e.className = className;
    }
    if (text !== undefined && text !== null) {
      e.textContent = text;
    }
    return e;
  };

  // Inline SVG from a path list -- `d` may be one path string or several.
  // Stroke-based so `currentColor` carries the theme through.
  UI.svg = function(paths, size, opts) {
    opts = opts || {};
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", opts.viewBox || "0 0 24 24");
    svg.setAttribute("width", size || 16);
    svg.setAttribute("height", size || 16);
    svg.setAttribute("aria-hidden", "true");
    (Array.isArray(paths) ? paths : [paths]).forEach(function(d) {
      var path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", d);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", opts.width || 2);
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      svg.appendChild(path);
    });
    return svg;
  };

  UI.ICONS = {
    chevronDown: "M6 9 12 15 18 9",
    close: "M6 6 18 18M18 6 6 18",
    crosshair: "M12 3v3m0 12v3M3 12h3m12 0h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
    eye: "M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
    eyeOff: "M4 4 20 20 M9.5 5.4A9.7 9.7 0 0 1 12 5c6.4 0 10 6 10 6a17 17 0 0 1-3.3 3.7M6.7 7.3A17 17 0 0 0 2 11s3.6 6 10 6a9.9 9.9 0 0 0 3.3-.55",
    plus: "M12 5v14M5 12h14",
    reset: "M3 12a9 9 0 1 1 2.6 6.4 M3 7v5h5",
    trash: "M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13",
  };

  // ---- Buttons --------------------------------------------------------------

  // UI.button("primary", "Paste", {icon, title, onClick, id, block})
  // `kind` is one of "", "primary", "danger", "ghost" -- the .btn-* modifier.
  UI.button = function(kind, label, opts) {
    opts = opts || {};
    var cls = "btn";
    if (kind) {
      cls += " btn-" + kind;
    }
    if (opts.size) {
      cls += " btn-" + opts.size;
    }
    if (opts.block) {
      cls += " btn-block";
    }
    if (!label) {
      cls += " btn-icon";
    }
    if (opts.className) {
      cls += " " + opts.className;
    }
    var button = UI.el("button", cls);
    button.type = opts.type || "button";
    if (opts.id) {
      button.id = opts.id;
    }
    if (opts.icon) {
      button.appendChild(UI.svg(opts.icon, opts.iconSize || 15));
    }
    if (label) {
      button.appendChild(UI.el("span", null, label));
    }
    // An icon-only button has no text for a screen reader to read; title alone
    // is an unreliable accessible name, so state it outright.
    if (opts.title) {
      button.title = opts.title;
      if (!label) {
        button.setAttribute("aria-label", opts.title);
      }
    }
    if (opts.onClick) {
      button.addEventListener("click", opts.onClick);
    }
    return button;
  };

  UI.closeButton = function(onClick, label) {
    return UI.button("ghost", null, {
      icon: UI.ICONS.close,
      iconSize: 16,
      title: label || "Close",
      className: "dlg-close",
      onClick: onClick,
    });
  };

  UI.chevron = function(size, className) {
    var wrap = UI.el("span", "chev" + (className ? " " + className : ""));
    wrap.appendChild(UI.svg(UI.ICONS.chevronDown, size || 14));
    return wrap;
  };

  // ---- Toggle switch --------------------------------------------------------

  // A real <input type=checkbox> inside a <label>, so clicking anywhere on the
  // switch toggles it exactly like a native checkbox and every existing
  // .checked / "change" code path keeps working untouched.
  UI.toggle = function(size) {
    var wrapper = UI.el("label", "toggleSwitch" + (size ? " toggleSwitch-" + size : ""));
    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    wrapper.appendChild(checkbox);
    wrapper.appendChild(UI.el("span", "toggleSlider"));
    return { wrapper: wrapper, checkbox: checkbox };
  };

  // ---- Small compositions ---------------------------------------------------

  UI.statTile = function(value, label) {
    var tile = UI.el("div", "statTile");
    tile.appendChild(UI.el("span", "statValue", value));
    tile.appendChild(UI.el("span", "statLabel", label));
    return tile;
  };

  // Returns {wrap, fill} -- callers keep `fill` and set its width.
  UI.bar = function(modifier) {
    var wrap = UI.el("div", "bar" + (modifier ? " bar-" + modifier : ""));
    var fill = UI.el("div", "bar-fill");
    wrap.appendChild(fill);
    return { wrap: wrap, fill: fill };
  };

  UI.kicker = function(text) {
    return UI.el("div", "kicker", text);
  };

  // ---- Dialogs --------------------------------------------------------------
  //
  // Wraps a native <dialog> from the markup. showModal() hands the browser the
  // focus trap, focus restore, Escape, background inertness and top-layer
  // stacking -- all of which used to be hand-rolled per modal, and the last of
  // which is why the app needed a hand-maintained z-index ladder at all.
  //
  //   var dlg = UI.dialog("itemModal");
  //   dlg.onClose(function() { ...module cleanup... });
  //   dlg.open();
  //
  // onClose runs however the dialog was dismissed (X, Escape, backdrop click,
  // dlg.close()), so a module has exactly one teardown path instead of three.
  var openDialogs = [];

  UI.dialog = function(id) {
    var el = typeof id === "string" ? document.getElementById(id) : id;
    if (!el) {
      return null;
    }
    var closeHandlers = [];

    // A click whose target is the <dialog> itself landed on the backdrop:
    // .dlg fills the viewport with no padding and all content lives in
    // .dlg-inner, so nothing else can be the target.
    el.addEventListener("click", function(e) {
      if (e.target === el) {
        el.close();
      }
    });

    el.querySelectorAll(".dlg-close").forEach(function(button) {
      button.addEventListener("click", function() { el.close(); });
    });

    el.addEventListener("close", function() {
      var index = openDialogs.indexOf(api);
      if (index >= 0) {
        openDialogs.splice(index, 1);
      }
      closeHandlers.forEach(function(fn) { fn(); });
    });

    var api = {
      el: el,
      open: function() {
        if (el.open) {
          return;
        }
        el.showModal();
        // showModal() focuses the first focusable descendant, which in every
        // one of these dialogs is a header button (the close X, the show/hide
        // eye) -- so the dialog opens with a focus ring drawn around "close",
        // reading as though that is the thing to do. Move focus to the dialog
        // body instead unless the markup nominated something with autofocus;
        // the focus trap and Escape are unaffected, and Tab still lands on the
        // first control.
        if (!el.querySelector("[autofocus]")) {
          var inner = el.querySelector(".dlg-inner");
          if (inner) {
            inner.tabIndex = -1;
            inner.focus();
          }
        }
        openDialogs.push(api);
      },
      close: function() {
        if (el.open) {
          el.close();
        }
      },
      isOpen: function() { return el.open; },
      onClose: function(fn) { closeHandlers.push(fn); return api; },
      // Convenience for the id-per-part markup the feature modules bind to.
      part: function(partId) { return document.getElementById(partId); },
    };
    return api;
  };

  UI.anyDialogOpen = function() {
    return openDialogs.length > 0;
  };

  // ---- Escape ---------------------------------------------------------------
  //
  // Dialogs handle their own Escape natively. What is left is the non-dialog
  // transient state: an open dropdown, a placement ghost, the network tool, a
  // live map highlight. Those used to be six independent document-level
  // handlers coordinated by e.defaultPrevented, which made the priority order
  // an accident of <script> order in index.html.
  //
  // Now each registers a layer with an explicit priority and one press pops
  // exactly one layer, highest priority first.
  //
  //   UI.onEscape(UI.LAYER.tool, function() { return closeIfOpen(); });
  //
  // The callback returns true if it consumed the press.
  UI.LAYER = {
    menu: 100,      // a dropdown or context menu -- always the innermost thing
    placement: 80,  // an in-progress editor placement / map-picking mode
    tool: 60,       // a docked tool panel (network finder, paste)
    view: 40,       // a live map state: highlight filter, locate marker
  };

  var escapeLayers = [];

  UI.onEscape = function(priority, handler) {
    escapeLayers.push({ priority: priority, handler: handler });
    escapeLayers.sort(function(a, b) { return b.priority - a.priority; });
  };

  document.addEventListener("keydown", function(e) {
    if (e.key !== "Escape" || e.defaultPrevented) {
      return;
    }
    // A dialog is up: the browser's own Escape handling owns this press.
    if (openDialogs.length) {
      return;
    }
    for (var i = 0; i < escapeLayers.length; i++) {
      if (escapeLayers[i].handler() === true) {
        e.preventDefault();
        return;
      }
    }
  });

  // ---- Popovers -------------------------------------------------------------
  //
  // Anything that must paint above a modal dialog has to be in the top layer
  // too -- a z-index, however large, cannot beat showModal(). The hover
  // tooltip is the case that matters: hovering a row inside the item dialog's
  // location list shows the object's tooltip, and top-layer ordering is by
  // promotion time, so a popover shown while a dialog is open lands above it.
  UI.showAbove = function(el) {
    if (!el || !el.showPopover) {
      return;
    }
    try {
      if (!el.matches(":popover-open")) {
        el.showPopover();
      }
    } catch (err) { /* Not connected / already shown -- nothing to do. */ }
  };

  UI.hideAbove = function(el) {
    if (!el || !el.hidePopover) {
      return;
    }
    try {
      if (el.matches(":popover-open")) {
        el.hidePopover();
      }
    } catch (err) { /* see showAbove */ }
  };

  // ---- Formatting -----------------------------------------------------------

  UI.count = function(n) {
    return n.toLocaleString();
  };

  UI.plural = function(n, singular, plural) {
    return UI.count(n) + " " + (n === 1 ? singular : (plural || singular + "s"));
  };
})();
