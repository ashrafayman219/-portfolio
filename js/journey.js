(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  function closeJourneyLoader() {
    var loader = document.getElementById("journeyLoader");
    if (!loader || loader.getAttribute("data-closed") === "1") return;
    loader.setAttribute("data-closed", "1");
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    loader.classList.add("is-done");
    document.body.classList.add("is-entering");
    document.body.classList.remove("is-loading");
    window.__journeyDone = true;
    document.dispatchEvent(new CustomEvent("journey:done"));
    window.setTimeout(function () {
      document.body.classList.remove("is-entering");
    }, reduced ? 0 : 1500);
    window.setTimeout(function () {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, reduced ? 0 : 900);
  }

  function armJourneyLoader(delay) {
    var loader = document.getElementById("journeyLoader");
    if (!loader) return;
    var timer = window.setTimeout(closeJourneyLoader, delay);
    loader.addEventListener("click", function () {
      window.clearTimeout(timer);
      closeJourneyLoader();
    });
    var skip = document.querySelector(".skip-link");
    if (skip) {
      skip.addEventListener("click", function () {
        window.clearTimeout(timer);
        closeJourneyLoader();
      });
    }
    document.addEventListener("keydown", function onKey(event) {
      if (event.key !== "Escape") return;
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(timer);
      closeJourneyLoader();
    });
  }

  var road = document.getElementById("j-road");
  var roadg = document.getElementById("j-roadg");
  if (!road || !roadg) {
    closeJourneyLoader();
    return;
  }

  function el(name, attrs, parent, text) {
    var node = document.createElementNS(NS, name);
    Object.keys(attrs).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    if (text) node.textContent = text;
    parent.appendChild(node);
    return node;
  }

  var length = road.getTotalLength();
  var reveal = document.getElementById("j-rv");
  reveal.setAttribute("d", road.getAttribute("d"));
  reveal.setAttribute("stroke-dasharray", String(length));
  reveal.setAttribute("stroke-dashoffset", String(length));

  function roadEase(x) {
    var p1x = 0.45;
    var p1y = 0.05;
    var p2x = 0.3;
    var p2y = 1;
    function sample(t, a1, a2) {
      return ((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t * t + 3 * a1 * t;
    }
    function slope(t, a1, a2) {
      return 3 * (1 - 3 * a2 + 3 * a1) * t * t + 2 * (3 * a2 - 6 * a1) * t + 3 * a1;
    }
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var t = x;
    for (var i = 0; i < 6; i++) {
      var s = slope(t, p1x, p2x);
      if (Math.abs(s) < 0.0001) break;
      t = Math.max(0, Math.min(1, t - (sample(t, p1x, p2x) - x) / s));
    }
    return sample(t, p1y, p2y);
  }

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var drawStart = null;
    var draw = function (now) {
      if (drawStart === null) drawStart = now;
      var elapsed = now - drawStart - 100;
      var progress = elapsed <= 0 ? 0 : roadEase(Math.min(1, elapsed / 3300));
      reveal.setAttribute("stroke-dashoffset", String(length * (1 - progress)));
      if (progress < 1) window.requestAnimationFrame(draw);
    };
    window.requestAnimationFrame(draw);
  } else {
    reveal.setAttribute("stroke-dashoffset", "0");
  }

  var width = 118;

  function edges(scale) {
    var left = [];
    var right = [];
    for (var i = 0; i <= 260; i++) {
      var distance = (i / 260) * length;
      var point = road.getPointAtLength(distance);
      var ahead = road.getPointAtLength(Math.min(distance + 1, length));
      var behind = road.getPointAtLength(Math.max(distance - 1, 0));
      var dx = ahead.x - behind.x;
      var dy = ahead.y - behind.y;
      var mag = Math.hypot(dx, dy) || 1;
      dx /= mag;
      dy /= mag;
      var half = (width * scale) / 2;
      left.push([point.x - dy * half, point.y + dx * half]);
      right.push([point.x + dy * half, point.y - dx * half]);
    }
    return [left, right];
  }

  function formatPoints(points, offset) {
    var ox = offset ? offset[0] : 0;
    var oy = offset ? offset[1] : 0;
    return points
      .map(function (point) {
        return (point[0] + ox).toFixed(1) + "," + (point[1] + oy).toFixed(1);
      })
      .join(" ");
  }

  var outer = edges(1);
  var mid = edges(0.9);
  var inner = edges(0.84);
  var left = outer[0];
  var right = outer[1];

  function ribbon(offset, fill, extra) {
    var attrs = {
      points: formatPoints(left.concat(right.slice().reverse()), offset),
      fill: fill,
      "stroke-linejoin": "round"
    };
    if (extra) {
      Object.keys(extra).forEach(function (key) {
        attrs[key] = extra[key];
      });
    }
    el("polygon", attrs, roadg);
  }

  ribbon([30, 44], "#1b2430", { opacity: "0.18", filter: "url(#j-blur)" });
  ribbon([4, 18], "#3f4854");
  ribbon([0, 9], "#5c6774");
  ribbon([0, 0], "#4b5563");

  var innerPoints = formatPoints(inner[0].concat(inner[1].slice().reverse()));
  el("polygon", { points: innerPoints, fill: "url(#j-rg)" }, roadg);
  el("polygon", { points: innerPoints, fill: "#000", filter: "url(#j-grain)" }, roadg);
  el("polyline", { points: formatPoints(left), fill: "none", stroke: "#9aa3ad", "stroke-width": "2.5", "stroke-linecap": "round" }, roadg);
  el("polyline", { points: formatPoints(right), fill: "none", stroke: "#374151", "stroke-width": "2.5", "stroke-linecap": "round" }, roadg);
  [mid[0], mid[1]].forEach(function (edge) {
    el("polyline", { points: formatPoints(edge), fill: "none", stroke: "#6b7280", "stroke-width": "1.5", "stroke-linecap": "round" }, roadg);
  });

  var arrows = document.getElementById("j-arrows");
  for (var distance = 150; distance < length - 60; distance += 110) {
    var point = road.getPointAtLength(distance);
    var next = road.getPointAtLength(distance + 2);
    var angle = (Math.atan2(next.y - point.y, next.x - point.x) * 180) / Math.PI;
    var arrow = el(
      "path",
      {
        d: "M-12 -13 L14 0 L-12 13 L-5 0Z",
        fill: "#fff",
        transform: "translate(" + point.x + " " + point.y + ") rotate(" + angle + ")",
        class: "arr"
      },
      arrows
    );
    arrow.style.setProperty("--d", (0.1 + (3.3 * distance) / length).toFixed(2) + "s");
  }

  function nearest(x, y) {
    var best = 0;
    var bestDist = Infinity;
    for (var step = 0; step <= length; step += 3) {
      var sample = road.getPointAtLength(step);
      var dist = (sample.x - x) * (sample.x - x) + (sample.y - y) * (sample.y - y);
      if (dist < bestDist) {
        bestDist = dist;
        best = step;
      }
    }
    return road.getPointAtLength(best);
  }

  function fit(node, base, max) {
    node.setAttribute("font-size", base);
    var measured = node.getComputedTextLength();
    if (measured > max) node.setAttribute("font-size", ((base * max) / measured).toFixed(1));
  }

  var pins = document.getElementById("j-pins");
  var labels = document.getElementById("j-cols");
  var stops = [
    { tip: [278, 625], lx: 140, ly: 510, inner: "#4d4d4d", ring: "#8c8c8c", hot: "#d2d2d2", delay: 1.4, top: "4 yrs", sub: "", word: "Mansoura University", detail: "BSc in Geomatics (1st Honor)", name: "Mansoura University, BSc in Geomatics (1st Honor), 4 years" },
    { tip: [857, 448], lx: 980, ly: 498, anchor: "start", inner: "#c4501a", ring: "#f0a37e", hot: "#ff9157", delay: 1.9, top: "2 yrs", sub: "", lineSize: 32, lines: ["Information Technology Institute (ITI)", "National Telecommunication Institute (NTI)", "Edge Pro for Information Systems"], name: "2 years: Information Technology Institute, National Telecommunication Institute, and Edge Pro" },
    { tip: [555, 275], lx: 248, ly: 228, anchor: "start", rail: "left", inner: "#2f7a2a", ring: "#9fd29a", hot: "#76d567", delay: 2.4, top: "4 yrs", sub: "", lineSize: 32, lines: ["Gulf Terminal", "AIC", "Upwork"], name: "4 years: Gulf Terminal, AIC, and Upwork" },
    { tip: [970, 146], lx: 1168, ly: 162, inner: "#1f5d1c", ring: "#8fc88a", hot: "#5cc24e", delay: 3, top: "Now", sub: "Senior", word: "Gulf Terminal", name: "Gulf Terminal, Senior GIS Developer", hidden: true }
  ];

  var phone = window.matchMedia("(max-width: 767px)").matches;
  if (phone) {
    var scene = document.getElementById("j-scene");
    if (scene) {
      scene.setAttribute("viewBox", "-24 28 1180 930");
      var defs = scene.querySelector("defs");
      var clip = el("clipPath", { id: "j-phone-clip" }, defs);
      el("rect", { x: "-400", y: "-200", width: "2400", height: "910" }, clip);
      roadg.setAttribute("clip-path", "url(#j-phone-clip)");
      var arrows = document.getElementById("j-arrows");
      if (arrows) arrows.setAttribute("clip-path", "url(#j-phone-clip)");
    }
    stops[0].lx = 72;
    stops[0].ly = 488;
    stops[0].anchor = "start";
    stops[0].rail = "left";
    stops[1].lx = 510;
    stops[1].ly = 830;
    stops[1].anchor = "start";
    stops[1].lineSize = 30;
    stops[1].rail = "left";
    stops[2].lx = 270;
    stops[2].ly = 128;
    stops[2].anchor = "start";
    stops[2].lineSize = 28;
    stops[2].rail = "left";
  }

  stops.forEach(function (stop) {
    var center = nearest(stop.tip[0], stop.tip[1]);
    var x = center.x;
    var y = center.y;
    var group = el("g", { class: "pin", tabindex: "0", role: "button", "aria-label": stop.name }, pins);
    group.style.setProperty("--d", stop.delay + "s");
    el("circle", { cx: x + 8, cy: y + 16, r: 56, fill: "#000", opacity: "0.4", filter: "url(#j-soft)" }, group);
    var arrive = el("circle", { class: "rip-once", cx: x, cy: y, r: 57, stroke: stop.hot }, group);
    arrive.style.setProperty("--d", stop.delay + "s");
    var ripple = el("circle", { class: "rip", cx: x, cy: y, r: 57, stroke: stop.hot }, group);
    ripple.style.setProperty("--d", stop.delay + "s");
    el("circle", { class: "ring", cx: x, cy: y, r: 57, fill: stop.ring }, group);
    el("circle", { cx: x, cy: y, r: 52, fill: "#fff" }, group);
    el("circle", { cx: x, cy: y, r: 48, fill: stop.inner }, group);
    el("ellipse", { cx: x - 16, cy: y - 30, rx: 22, ry: 8, fill: "#fff", opacity: "0.16", transform: "rotate(-25 " + (x - 16) + " " + (y - 30) + ")" }, group);
    var top = el("text", { x: x, y: stop.sub ? y + 2 : y + 11, "text-anchor": "middle", fill: "#fff" }, group, stop.top);
    var sub = stop.sub ? el("text", { x: x, y: y + 24, "text-anchor": "middle", fill: "#fff" }, group, stop.sub) : null;
    var labGroup = el("g", { class: "lab-group" + ((stop.anchor || "middle") === "middle" ? " is-middle" : "") }, labels);
    labGroup.style.setProperty("--d", stop.delay + "s");
    var word = el("text", { x: stop.lx, y: stop.ly, class: "lab", "text-anchor": stop.anchor || "middle" }, labGroup);
    var line = null;
    var detail = null;
    var extraLines = [];
    if (stop.lines) {
      stop.lines.forEach(function (text, index) {
        var node = el("tspan", { x: stop.lx, dy: index === 0 ? "0" : "1.2em" }, word, text);
        if (index === 0) line = node;
        else extraLines.push(node);
      });
    } else {
      line = el("tspan", { x: stop.lx, dy: "0" }, word, stop.word);
      if (stop.detail) {
        detail = el("tspan", { x: stop.lx, dy: "1.35em" }, word);
        var ordinal = stop.detail.split("1st");
        if (ordinal.length === 2) {
          detail.appendChild(document.createTextNode(ordinal[0] + "1"));
          el("tspan", { "baseline-shift": "super", "font-size": "0.65em" }, detail, "st");
          detail.appendChild(document.createTextNode(ordinal[1]));
        } else {
          detail.textContent = stop.detail;
        }
      }
    }
    var plate = el("rect", { class: "lab-plate", rx: "16", "pointer-events": "none" }, labGroup);
    var rail = el("rect", { class: "lab-rail", rx: "3", "pointer-events": "none" }, labGroup);
    plate.style.setProperty("--mark", stop.inner);
    rail.style.setProperty("--mark", stop.inner);
    labGroup.insertBefore(plate, word);
    labGroup.insertBefore(rail, word);
    function placeFrame() {
      var box = word.getBBox();
      if (!box.width) return;
      var padX = 18;
      var padY = 12;
      var x0 = box.x - padX;
      var y0 = box.y - padY;
      var w = box.width + padX * 2;
      var h = box.height + padY * 2;
      plate.setAttribute("x", x0);
      plate.setAttribute("y", y0);
      plate.setAttribute("width", w);
      plate.setAttribute("height", h);
      var railW = 5;
      var gap = 10;
      var onLeft = stop.rail === "left" || (stop.rail !== "right" && x <= box.x + box.width / 2);
      rail.setAttribute("x", onLeft ? x0 - gap - railW : x0 + w + gap);
      rail.setAttribute("y", y0);
      rail.setAttribute("width", railW);
      rail.setAttribute("height", h);
    }
    function showFrame() {
      labGroup.classList.add("is-hot");
    }
    function hideFrame() {
      labGroup.classList.remove("is-hot");
    }
    group.addEventListener("pointerenter", showFrame);
    group.addEventListener("pointerleave", hideFrame);
    group.addEventListener("focus", showFrame);
    group.addEventListener("blur", hideFrame);
    if (stop.hidden) {
      group.setAttribute("visibility", "hidden");
      group.setAttribute("aria-hidden", "true");
      group.removeAttribute("tabindex");
      labGroup.setAttribute("visibility", "hidden");
    }
    stop.fit = function () {
      fit(top, 32, 92);
      if (sub) fit(sub, 22, 92);
      if (stop.lines) {
        var labelSize = stop.lineSize || 26;
        var labelMax = phone ? 760 : 820;
        fit(line, labelSize, labelMax);
        extraLines.forEach(function (node) { fit(node, labelSize, labelMax); });
      } else {
        fit(line, 32, stop.detail ? (phone ? 400 : 360) : 220);
        if (detail) fit(detail, phone ? 26 : 24, phone ? 420 : 420);
      }
      placeFrame();
    };
    stop.fit();
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      stops.forEach(function (stop) {
        stop.fit();
      });
    });
  }

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  armJourneyLoader(reducedMotion ? 1200 : 5300);
})();
