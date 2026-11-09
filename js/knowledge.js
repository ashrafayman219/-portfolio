(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var INK = "#1a7a8c";
  var BRANCHES = [
    { name: "Geodatabases", tt: 0.10, up: 1, off: 105, rot: -6 },
    { name: "Web GIS maps", tt: 0.30, up: 1, off: 130, rot: 4 },
    { name: "Remote sensing", tt: 0.54, up: 1, off: 115, rot: -3 },
    { name: "LiDAR processing", tt: 0.80, up: 1, off: 95, rot: 5 },
    { name: "GeoAI", tt: 0.27, up: 0, off: 95, rot: 5 },
    { name: "Python and SQL", tt: 0.47, up: 0, off: 100, rot: -8 },
    { name: "Spatial analysis", tt: 0.66, up: 0, off: 92, rot: 4 },
    { name: "ArcGIS Enterprise", tt: 0.86, up: 0, off: 95, rot: -4 }
  ];

  function el(name, attrs, parent, text) {
    var node = document.createElementNS(NS, name);
    Object.keys(attrs).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    if (text) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }

  function wrap(value, max) {
    var lines = [];
    var line = "";
    String(value).trim().split(/\s+/).forEach(function (word) {
      if (line && (line + " " + word).length > max) {
        lines.push(line);
        line = word;
      } else {
        line = line ? line + " " + word : word;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function setLines(node, x, y, lines, lineHeight, fontSize) {
    node.textContent = "";
    lines.forEach(function (line, index) {
      el("tspan", {
        x: x,
        y: y + (index - (lines.length - 1) / 2) * lineHeight + fontSize * 0.35
      }, node, line);
    });
  }

  function delay(node, start, duration) {
    node.style.setProperty("--d", start + "s");
    if (duration) node.style.setProperty("--t", duration + "s");
    return node;
  }

  function defs(svg, markup) {
    var node = el("defs", {}, svg);
    node.innerHTML = markup;
  }

  function traveler(svg, pathId, begin, dur) {
    var dot = el("circle", {
      r: 9,
      fill: "#fff",
      stroke: INK,
      "stroke-width": 3,
      opacity: 0,
      class: "kt-fx"
    }, svg);
    var fade = el("animate", {
      attributeName: "opacity",
      values: "0;1",
      dur: "0.3s",
      begin: "indefinite",
      fill: "freeze"
    }, dot);
    fade.setAttribute("data-delay", begin);
    var motion = el("animateMotion", {
      dur: dur,
      begin: "indefinite",
      repeatCount: "indefinite"
    }, dot);
    motion.setAttribute("data-delay", begin);
    el("mpath", { href: pathId }, motion);
  }

  function desktop(svg) {
    var X1 = 70, Y1 = 410, X2 = 1215, Y2 = 160;
    var ang = Math.atan2(Y2 - Y1, X2 - X1);
    var deg = ang * 180 / Math.PI;
    var ux = Math.cos(ang), uy = Math.sin(ang);
    var nx = uy, ny = -ux;
    function point(t) {
      return [X1 + (X2 - X1) * t, Y1 + (Y2 - Y1) * t];
    }

    defs(svg, '<linearGradient id="kt-bx" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#e5f4f6"/></linearGradient><filter id="kt-ds" x="-30%" y="-30%" width="170%" height="170%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#1a7a8c" flood-opacity=".28"/></filter>');
    el("line", {
      x1: X1, y1: Y1, x2: X2, y2: Y2,
      stroke: INK, "stroke-width": 84, opacity: 0.08, "stroke-linecap": "round"
    }, svg);

    BRANCHES.forEach(function (branch) {
      var p = point(branch.tt);
      var side = branch.up ? 1 : -1;
      var reach = branch.off * 0.8;
      var cx = p[0] + nx * reach * side;
      var cy = p[1] + ny * reach * side;
      var start = 0.2 + 1.8 * branch.tt;
      delay(el("path", {
        d: "M" + p[0].toFixed(1) + " " + p[1].toFixed(1) + "L" + cx.toFixed(1) + " " + cy.toFixed(1),
        stroke: INK, "stroke-width": 3, fill: "none", pathLength: 1, class: "draw"
      }, svg), start, 0.4);
      var placed = el("g", {
        transform: "translate(" + cx.toFixed(1) + " " + cy.toFixed(1) + ") rotate(" + (deg + branch.rot).toFixed(1) + ")"
      }, svg);
      var pop = delay(el("g", { class: "pop" }, placed), start + 0.25);
      var hit = el("g", { class: "hov" }, pop);
      el("rect", {
        class: "bx", x: -92, y: -34, width: 184, height: 68, rx: 8,
        fill: "url(#kt-bx)", stroke: INK, "stroke-width": 3, filter: "url(#kt-ds)"
      }, hit);
      var label = el("text", {
        class: "bt", "text-anchor": "middle", "font-size": 20, fill: INK
      }, hit);
      setLines(label, 0, 0, wrap(branch.name, 14), 24, 20);
    });

    delay(el("path", {
      d: "M" + X1 + " " + Y1 + "L" + (X2 - 30 * ux).toFixed(1) + " " + (Y2 - 30 * uy).toFixed(1),
      fill: "none", stroke: INK, "stroke-width": 12, pathLength: 1, class: "draw"
    }, svg), 0.2, 1.8);

    var tipX = X2 - 44 * ux;
    var tipY = Y2 - 44 * uy;
    delay(el("polygon", {
      class: "pop",
      points: X2 + "," + Y2 + " " + (tipX + nx * 24) + "," + (tipY + ny * 24) + " " + (tipX - nx * 24) + "," + (tipY - ny * 24),
      fill: INK
    }, svg), 1.9);

    BRANCHES.forEach(function (branch) {
      var p = point(branch.tt);
      delay(el("circle", {
        class: "pop", cx: p[0], cy: p[1], r: 8, fill: INK
      }, svg), 0.2 + 1.8 * branch.tt + 0.1);
    });

    el("path", { id: "kt-path", d: "M" + X1 + " " + Y1 + "L" + X2 + " " + Y2, fill: "none", stroke: "none" }, svg);
    traveler(svg, "#kt-path", "2.4s", "5s");
  }

  function mobile(svg) {
    var trunkX = 28;
    var top = 28;
    var step = 78;
    var boxX = 52;
    var boxW = 292;
    var boxH = 72;

    defs(svg, '<linearGradient id="kt-bx-m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#e5f4f6"/></linearGradient><filter id="kt-ds-m" x="-20%" y="-30%" width="150%" height="170%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#1a7a8c" flood-opacity=".22"/></filter>');

    var order = BRANCHES.slice().sort(function (a, b) { return a.tt - b.tt; });
    var bottom = top + (order.length - 1) * step;
    el("line", {
      x1: trunkX, y1: top - 10, x2: trunkX, y2: bottom + 46,
      stroke: INK, "stroke-width": 28, opacity: 0.08, "stroke-linecap": "round"
    }, svg);

    order.forEach(function (branch, index) {
      var y = top + index * step;
      var start = 0.15 + index * 0.16;
      delay(el("path", {
        d: "M" + trunkX + " " + y + "L" + boxX + " " + y,
        stroke: INK, "stroke-width": 3, fill: "none", pathLength: 1, class: "draw"
      }, svg), start, 0.35);
      var pop = delay(el("g", { class: "pop" }, svg), start + 0.12);
      var hit = el("g", { class: "hov" }, pop);
      el("rect", {
        class: "bx", x: boxX, y: y - boxH / 2, width: boxW, height: boxH, rx: 8,
        fill: "url(#kt-bx-m)", stroke: INK, "stroke-width": 3, filter: "url(#kt-ds-m)"
      }, hit);
      var label = el("text", {
        class: "bt", "text-anchor": "middle", "font-size": 20, fill: INK
      }, hit);
      setLines(label, boxX + boxW / 2, y, wrap(branch.name, 18), 24, 20);
      delay(el("circle", { class: "pop", cx: trunkX, cy: y, r: 7, fill: INK }, svg), start);
    });

    delay(el("path", {
      d: "M" + trunkX + " " + (top - 8) + "L" + trunkX + " " + (bottom + 24),
      fill: "none", stroke: INK, "stroke-width": 8, pathLength: 1, class: "draw"
    }, svg), 0.1, 1.4);
    delay(el("polygon", {
      class: "pop",
      points: trunkX + "," + (bottom + 42) + " " + (trunkX - 14) + "," + (bottom + 20) + " " + (trunkX + 14) + "," + (bottom + 20),
      fill: INK
    }, svg), 1.45);

    el("path", {
      id: "kt-path-m",
      d: "M" + trunkX + " " + (top - 4) + "L" + trunkX + " " + (bottom + 36),
      fill: "none",
      stroke: "none"
    }, svg);
    traveler(svg, "#kt-path-m", "1.8s", "4.5s");
  }

  function replayMotion(svg) {
    svg.querySelectorAll(".kt-fx").forEach(function (dot) {
      dot.setAttribute("opacity", "0");
      dot.querySelectorAll("animate, animateMotion").forEach(function (node) {
        var seconds = parseFloat(node.getAttribute("data-delay")) || 0;
        if (typeof node.endElement === "function") node.endElement();
        if (typeof node.beginElementAt === "function") node.beginElementAt(seconds);
      });
    });
  }

  function arm(svg) {
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      svg.classList.add("play");
      return { disconnect: function () {} };
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          if (svg.classList.contains("play")) return;
          svg.classList.add("play");
          replayMotion(svg);
          return;
        }
        svg.classList.remove("play");
      });
    }, { threshold: 0 });
    observer.observe(svg);
    return observer;
  }

  var trees = document.querySelectorAll(".knowledge-tree");
  if (!trees.length) return;
  desktop(trees[0]);
  mobile(trees[1]);
  var watchers = [arm(trees[0]), arm(trees[1])];
  var phone = window.matchMedia("(max-width: 767px)");
  if (phone.addEventListener) {
    phone.addEventListener("change", function () {
      trees.forEach(function (svg, index) {
        if (svg.classList.contains("play")) return;
        watchers[index].disconnect();
        watchers[index] = arm(svg);
      });
    });
  }
})();
