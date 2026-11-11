(function () {
  "use strict";

  var STOPS = [
    { id: "home", label: "Home", x: 62, y: 236, icon: '<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>' },
    { id: "map", label: "Map", x: 92, y: 140, icon: '<path d="M12 21s-6-5.6-6-10a6 6 0 0 1 12 0c0 4.4-6 10-6 10z"/><circle cx="12" cy="11" r="2"/>' },
    { id: "projects", label: "Projects", x: 178, y: 168, icon: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>' },
    { id: "experience", label: "Experience", x: 214, y: 80, icon: '<rect x="3.5" y="8" width="17" height="12" rx="2"/><path d="M9 8V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3.5 13h17"/>' },
    { id: "contact", label: "Contact", x: 244, y: 214, icon: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>' }
  ];

  var NS = "http://www.w3.org/2000/svg";
  var gm = document.getElementById("gm");
  var stage = document.getElementById("gm-stage");
  var road = document.getElementById("gm-road");
  var trail = document.getElementById("gm-trail");
  var nodesG = document.getElementById("gm-nodes");
  var hero = document.getElementById("gm-hero");
  if (!gm || !stage || !road || !trail || !nodesG || !hero) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var total = road.getTotalLength();

  STOPS.forEach(function (stop) {
    var best = 0;
    var bestDist = Infinity;
    for (var length = 0; length <= total; length += 2) {
      var point = road.getPointAtLength(length);
      var dist = (point.x - stop.x) * (point.x - stop.x) + (point.y - stop.y) * (point.y - stop.y);
      if (dist < bestDist) {
        bestDist = dist;
        best = length;
      }
    }
    stop.len = best;
    var snapped = road.getPointAtLength(best);
    stop.x = snapped.x;
    stop.y = snapped.y;
  });
  trail.style.strokeDasharray = total;

  STOPS.forEach(function (stop, index) {
    var node = document.createElementNS(NS, "g");
    node.setAttribute("class", "node");
    node.setAttribute("tabindex", "-1");
    node.setAttribute("role", "button");
    node.setAttribute("aria-label", "Go to " + stop.label);
    node.innerHTML =
      '<circle class="pulse" cx="' + stop.x + '" cy="' + stop.y + '" r="15"/>' +
      '<circle class="ring" cx="' + stop.x + '" cy="' + stop.y + '" r="15"/>' +
      '<g class="ico" transform="translate(' + (stop.x - 9) + " " + (stop.y - 9) + ') scale(.75)">' + stop.icon + "</g>" +
      '<text class="lbl" x="' + stop.x + '" y="' + (stop.y + 30) + '">' + stop.label + "</text>";
    node.addEventListener("click", function (event) {
      if (!isOpen()) return;
      event.stopPropagation();
      travel(index, true);
    });
    node.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        travel(index, true);
      }
    });
    nodesG.appendChild(node);
    stop.el = node;
  });

  var current = 0;
  var currentLen = STOPS[0].len;
  var frame = 0;
  var silent = false;
  var silentTimer = 0;

  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  var GEO = { lat: 31.5409, lon: 30.8785, span: 1 };

  function updateCoords(point) {
    var coords = document.getElementById("gm-coords");
    if (!coords) return;
    var lat = GEO.lat - (point.y / 300) * GEO.span;
    var lon = GEO.lon + (point.x / 300) * GEO.span;
    coords.textContent = lat.toFixed(4) + "°N  " + lon.toFixed(4) + "°E";
  }

  function place(length) {
    currentLen = length;
    var point = road.getPointAtLength(length);
    hero.setAttribute("transform", "translate(" + (point.x + 26) + " " + (point.y + 8) + ") scale(.5)");
    trail.style.strokeDashoffset = String(total - length);
    updateCoords(point);
  }

  function setActive(index) {
    current = index;
    STOPS.forEach(function (stop, key) {
      stop.el.classList.toggle("active", key === index);
      stop.el.classList.toggle("visited", key < index);
    });
    var where = document.getElementById("gm-where");
    if (where) where.textContent = "You are in " + STOPS[index].label;
    gm.dataset.stop = STOPS[index].id;
  }

  function holdSilent() {
    silent = true;
    window.clearTimeout(silentTimer);
    var release = function () {
      silent = false;
      window.removeEventListener("scrollend", release);
    };
    window.addEventListener("scrollend", release);
    silentTimer = window.setTimeout(release, 1600);
  }

  function travel(index, navigate) {
    window.cancelAnimationFrame(frame);
    var from = currentLen;
    var to = STOPS[index].len;
    var duration = reduce ? 0 : Math.min(1800, 350 + Math.abs(to - from) * 5);
    var started = performance.now();
    hero.classList.add("walking");
    setActive(index);
    startRun();
    if (navigate) {
      holdSilent();
      var section = document.getElementById(STOPS[index].id);
      if (section) section.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", "#" + STOPS[index].id);
    }
    (function step(now) {
      var t = duration ? Math.min(1, (now - started) / duration) : 1;
      place(from + (to - from) * ease(t));
      if (t < 1) frame = window.requestAnimationFrame(step);
      else {
        hero.classList.remove("walking");
        stopRun();
        if (navigate && autoClose) window.setTimeout(function () { setOpen(false); }, 900);
      }
    })(started);
  }

  var autoClose = false;
  function isOpen() { return gm.dataset.open === "true"; }

  function setOpen(open, moveFocus) {
    gm.dataset.open = open ? "true" : "false";
    autoClose = open;
    stage.setAttribute("aria-label", open ? "Map" : "Enlarge map");
    stage.setAttribute("tabindex", open ? "-1" : "0");
    if (open) stage.removeAttribute("role");
    else stage.setAttribute("role", "button");
    STOPS.forEach(function (stop) {
      stop.el.setAttribute("tabindex", open ? "0" : "-1");
    });
    if (moveFocus === false) return;
    var close = document.getElementById("gm-close");
    if (open && close) close.focus({ preventScroll: true });
    else stage.focus({ preventScroll: true });
  }

  stage.addEventListener("click", function () {
    if (!isOpen()) setOpen(true);
  });
  stage.addEventListener("keydown", function (event) {
    if ((event.key === "Enter" || event.key === " ") && !isOpen()) {
      event.preventDefault();
      setOpen(true);
    }
  });
  document.getElementById("gm-close").addEventListener("click", function () { setOpen(false); });

  window.addEventListener("keydown", function (event) {
    if (!isOpen()) return;
    if (document.querySelector(".modal:not([hidden])")) return;
    if (event.key === "Escape") setOpen(false);
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      travel(Math.min(current + 1, STOPS.length - 1), true);
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      travel(Math.max(current - 1, 0), true);
    }
  });

  document.addEventListener("pointerdown", function (event) {
    if (isOpen() && !gm.contains(event.target)) setOpen(false, false);
  });

  var seen = new Map();
  if ("IntersectionObserver" in window) {
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        seen.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
      });
      if (silent) return;
      var best = -1;
      var bestRatio = 0;
      STOPS.forEach(function (stop, index) {
        var ratio = seen.get(stop.id) || 0;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          best = index;
        }
      });
      if (best > -1 && best !== current) travel(best, false);
    }, { rootMargin: "-28% 0px -38% 0px", threshold: [0, 0.15, 0.4, 0.7] });
    STOPS.forEach(function (stop) {
      var section = document.getElementById(stop.id);
      if (section) watcher.observe(section);
    });
  }

  var limbs = {
    lgL: document.getElementById("gm-leg-l"),
    lgR: document.getElementById("gm-leg-r"),
    arL: document.getElementById("gm-arm-l"),
    arR: document.getElementById("gm-arm-r"),
    boy: document.getElementById("gm-boy")
  };
  var shadowEl = hero.querySelector(".shadow");
  var runFrame = 0;
  var phase = 0;
  var lastTime = 0;
  var amplitude = 0;
  var running = false;

  function pose(p, amount) {
    var leg = function (el, hx, q) {
      if (!el) return;
      var swing = Math.sin(q) * amount;
      var lift = Math.max(swing, 0);
      var scale = 1 + 0.1 * swing;
      el.setAttribute("transform", "translate(" + hx + " " + (-26 - 10 * lift) + ") rotate(" + (-Math.sign(hx) * swing * 7) + ") scale(" + scale + " " + ((1 - 0.16 * lift) * scale) + ") translate(" + (-hx) + " 26)");
    };
    var arm = function (el, hx, q) {
      if (!el) return;
      var swing = Math.sin(q) * amount;
      var lift = Math.max(swing, 0);
      var scale = 1 + 0.12 * swing;
      el.setAttribute("transform", "translate(" + hx + " -56) rotate(" + (-Math.sign(hx) * swing * 12) + ") scale(" + scale + " " + ((1 - 0.3 * lift) * scale) + ") translate(" + (-hx) + " 56)");
    };
    leg(limbs.lgL, -7.3, p);
    leg(limbs.lgR, 7.3, p + Math.PI);
    arm(limbs.arL, -17, p + Math.PI);
    arm(limbs.arR, 17, p);
    var hop = Math.abs(Math.cos(p)) * amount;
    if (limbs.boy) limbs.boy.setAttribute("transform", "translate(0 " + (-4 * hop) + ") rotate(" + (Math.sin(p) * 2.5 * amount) + ")");
    if (shadowEl) shadowEl.setAttribute("rx", String(19 - 3 * hop));
  }

  function runLoop(now) {
    var dt = Math.min(50, now - lastTime) / 1000;
    lastTime = now;
    amplitude += ((running ? 1 : 0) - amplitude) * Math.min(1, dt * 9);
    phase += dt * (reduce ? 0 : 13);
    if (!running && amplitude < 0.03) {
      Object.keys(limbs).forEach(function (key) {
        if (limbs[key]) limbs[key].removeAttribute("transform");
      });
      if (shadowEl) shadowEl.setAttribute("rx", "19");
      hero.classList.remove("run");
      runFrame = 0;
      return;
    }
    pose(phase, amplitude);
    runFrame = window.requestAnimationFrame(runLoop);
  }

  function startRun() {
    running = true;
    hero.classList.add("run");
    if (!runFrame) {
      lastTime = performance.now();
      runFrame = window.requestAnimationFrame(runLoop);
    }
  }

  function stopRun() { running = false; }

  var grid = document.getElementById("gm-grid");
  if (grid) {
    var gridHtml = "";
    for (var step = 1; step < 5; step++) {
      var at = step * 60;
      var lon = (GEO.lon + (at / 300) * GEO.span).toFixed(2);
      var lat = (GEO.lat - (at / 300) * GEO.span).toFixed(2);
      gridHtml += '<path d="M' + at + ' 0V300M0 ' + at + 'H300"/>' +
        '<text x="' + (at + 2) + '" y="9">' + lon + "°E</text>" +
        '<text x="3" y="' + (at - 2) + '">' + lat + "°N</text>";
    }
    grid.innerHTML = gridHtml;
  }
  var scale = document.getElementById("gm-scale-label");
  if (scale) scale.textContent = Math.round(0.2 * GEO.span * 111) + " km";

  var start = Math.max(0, STOPS.findIndex(function (stop) { return "#" + stop.id === location.hash; }));
  place(STOPS[start].len);
  setActive(start);
})();
