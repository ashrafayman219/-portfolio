(function () {
  "use strict";

  var scene = document.querySelector(".geoai-scene");
  if (!scene) return;

  var NS = "http://www.w3.org/2000/svg";
  var ACCENT = "#1a7a8c";
  var GOLD = "#8a7344";

  function el(tag, attrs, parent) {
    var node = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    if (parent) parent.appendChild(node);
    return node;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function iso(ty, u, v) {
    return [398 + u * 226 - v * 226, ty + u * 112 + v * 112];
  }

  function pts(ty, arr) {
    return arr.map(function (p) {
      var q = iso(ty, p[0], p[1]);
      return q[0].toFixed(1) + "," + q[1].toFixed(1);
    }).join(" ");
  }

  var bot = byId("geo-bot");
  var N = 6;
  el("polygon", { points: "172,593 398,481 624,593 398,705", fill: "#e7f1f3" }, bot);
  for (var i = 0; i < N; i++) {
    for (var j = 0; j < N; j++) {
      var a = [i / N, j / N];
      var b = [(i + 1) / N, j / N];
      var c = [(i + 1) / N, (j + 1) / N];
      var d = [i / N, (j + 1) / N];
      var tile = el("polygon", { points: pts(481, [a, b, c, d]), "class": "tile" }, bot);
      tile.style.animationDelay = (-(i + j) * 0.32 - ((i * 7 + j * 3) % 5) * 0.15).toFixed(2) + "s";
    }
  }
  el("polygon", { points: "172,593 398,481 624,593 398,705", fill: "none", stroke: ACCENT, "stroke-opacity": "0.55" }, bot);

  var roads = [
    [[0, 0.35], [0.25, 0.4], [0.4, 0.6], [0.7, 0.62], [1, 0.7]],
    [[0.3, 0], [0.35, 0.35], [0.6, 0.5], [0.75, 1]],
    [[0.1, 0.9], [0.5, 0.8], [0.7, 0.55], [1, 0.45]]
  ];
  var roadGroup = byId("geo-roads");
  roads.forEach(function (road, index) {
    var points = pts(421, road);
    el("polyline", { points: points, "class": "road" }, roadGroup);
    var flow = el("polyline", { points: points, "class": "flow" }, roadGroup);
    flow.style.animationDelay = (-index * 1.2) + "s";
  });

  var spots = [[296, 477], [364, 431], [499, 453], [431, 499]];
  var pointGroup = byId("geo-pts");
  var dots = [];
  spots.forEach(function (point) {
    el("ellipse", { cx: point[0], cy: point[1] + 3, rx: 12, ry: 5, fill: GOLD, "fill-opacity": "0.22" }, pointGroup);
    var halo = el("circle", { cx: point[0], cy: point[1], r: 6, fill: GOLD, "fill-opacity": "0.28" }, pointGroup);
    var core = el("circle", { cx: point[0], cy: point[1], r: 4.5, fill: "#c6a15a" }, pointGroup);
    dots.push([halo, core]);
  });

  var layers = [
    [82, 142, 202, 262].map(function (y) { return [225, y]; }),
    [52, 112, 172, 232, 292].map(function (y) { return [405, y]; }),
    [112, 172, 232].map(function (y) { return [586, y]; })
  ];
  var edgeGroup = byId("geo-edges");
  var pulseGroup = byId("geo-pulses");
  var nodeGroup = byId("geo-nodes");
  var linkGroup = byId("geo-links");
  var edges = [[], []];
  for (var layer = 0; layer < 2; layer++) {
    layers[layer].forEach(function (from) {
      layers[layer + 1].forEach(function (to) {
        var line = el("line", {
          x1: from[0], y1: from[1], x2: to[0], y2: to[1],
          stroke: ACCENT, "stroke-width": "1.45", "stroke-opacity": "0.62"
        }, edgeGroup);
        var dot = el("circle", { r: 3.6, fill: "#156575", opacity: 0 }, pulseGroup);
        edges[layer].push({ from: from, to: to, line: line, dot: dot, off: Math.random() * 0.25 });
      });
    });
  }
  var nodes = layers.map(function (col) {
    return col.map(function (point) {
      var halo = el("circle", { cx: point[0], cy: point[1], r: 17, fill: ACCENT, "fill-opacity": "0.12" }, nodeGroup);
      var core = el("circle", { cx: point[0], cy: point[1], r: 9.5, fill: ACCENT }, nodeGroup);
      return { halo: halo, core: core };
    });
  });

  var links = [];
  layers[0].forEach(function (point, index) {
    var spot = spots[index];
    var midX = (point[0] + spot[0]) / 2 + (index - 1.5) * 8;
    var midY = (point[1] + spot[1]) / 2;
    links.push(el("path", {
      d: "M" + point[0] + " " + (point[1] + 8) + "Q" + midX + " " + midY + " " + spot[0] + " " + spot[1],
      "class": "link",
      "stroke-opacity": "0.28"
    }, linkGroup));
  });

  var cycle = 5;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ring = byId("geo-ring");
  var region = byId("geo-region");

  function glow(time, peak, width) {
    var x = (time - peak) / width;
    return Math.exp(-x * x);
  }

  function ease(value) {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value * value * (3 - 2 * value);
  }

  function frame(time) {
    for (var pass = 0; pass < 2; pass++) {
      var start = 0.3 + pass * 1.2;
      edges[pass].forEach(function (edge) {
        var progress = (time - start - edge.off) / 1;
        if (progress > 0 && progress < 1) {
          var moved = ease(progress);
          edge.dot.setAttribute("cx", edge.from[0] + (edge.to[0] - edge.from[0]) * moved);
          edge.dot.setAttribute("cy", edge.from[1] + (edge.to[1] - edge.from[1]) * moved);
          edge.dot.setAttribute("opacity", Math.sin(progress * Math.PI));
          edge.line.setAttribute("stroke-opacity", 0.62 + 0.32 * Math.sin(progress * Math.PI));
        } else {
          edge.dot.setAttribute("opacity", 0);
          edge.line.setAttribute("stroke-opacity", 0.62);
        }
      });
    }
    var peaks = [0.3, 1.8, 3.0];
    nodes.forEach(function (col, index) {
      col.forEach(function (node, item) {
        var amount = glow(time, peaks[index] + item * 0.04, 0.35);
        node.halo.setAttribute("r", 17 + 7 * amount);
        node.halo.setAttribute("fill-opacity", 0.12 + 0.28 * amount);
        node.core.setAttribute("r", 9.5 + 1.5 * amount);
      });
    });
    var landed = glow(time, 3.4, 0.5);
    links.forEach(function (link) {
      link.setAttribute("stroke-opacity", 0.28 + 0.5 * landed);
    });
    dots.forEach(function (dot, index) {
      var amount = glow(time, 3.3 + index * 0.18, 0.3);
      dot[0].setAttribute("r", 6 + 9 * amount);
      dot[0].setAttribute("fill-opacity", 0.28 + 0.22 * amount);
      dot[1].setAttribute("r", 4.5 + 1.2 * amount);
    });
    region.setAttribute("fill-opacity", 0.16 + 0.28 * glow(time, 3.9, 0.5));
    var ping = (time - 3.2) / 1.4;
    if (ping > 0 && ping < 1) {
      ring.setAttribute("r", 6 + 44 * ease(ping));
      ring.setAttribute("opacity", 0.75 * (1 - ping));
    } else {
      ring.setAttribute("opacity", 0);
    }
  }

  if (reduced) {
    frame(3.4);
    return;
  }

  var started = 0;
  var running = false;
  var raf = 0;

  function loop(now) {
    if (!started) started = now;
    frame(((now - started) / 1000) % cycle);
    raf = requestAnimationFrame(loop);
  }

  function play() {
    if (running) return;
    running = true;
    started = 0;
    raf = requestAnimationFrame(loop);
  }

  function pause() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  if (!("IntersectionObserver" in window)) {
    play();
    return;
  }

  var watch = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) play();
      else pause();
    });
  }, { threshold: 0.15 });
  watch.observe(scene);
})();
