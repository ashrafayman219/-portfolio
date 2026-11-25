(function () {
  "use strict";

  var INTRO_MS = 4800;
  var loader = document.getElementById("journeyLoader");
  if (!loader) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var leaving = false;
  var raf = 0;
  var pctEl = document.getElementById("introPct");
  var stEl = document.getElementById("introSt");
  var skipBtn = document.getElementById("introSkip");
  var mapSvg = document.getElementById("introMap");
  var STATUS = [
    "Welcome. Glad you're here",
    "Ashraf Ayman · GIS Engineer",
    "Maps, analysis & GeoAI",
    "Projects & experience",
    "Almost ready. Thanks",
    "Portfolio ready"
  ];

  function measureScrollbarWidth() {
    var probe = document.createElement("div");
    probe.style.cssText =
      "position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll;visibility:hidden";
    document.documentElement.appendChild(probe);
    var width = probe.offsetWidth - probe.clientWidth;
    document.documentElement.removeChild(probe);
    return width;
  }

  document.documentElement.style.setProperty(
    "--sbw",
    measureScrollbarWidth() + "px"
  );

  function closeJourneyLoader() {
    if (!loader || loader.getAttribute("data-closed") === "1") return;
    loader.setAttribute("data-closed", "1");
    leaving = true;
    cancelAnimationFrame(raf);
    loader.style.setProperty("--p", "1");
    if (pctEl) pctEl.textContent = "100";
    if (stEl) stEl.textContent = STATUS[STATUS.length - 1];

    window.scrollTo(0, 0);
    loader.classList.add("is-out");
    document.body.classList.add("is-entering");
    document.body.classList.remove("is-loading");
    window.__journeyDone = true;
    document.dispatchEvent(new CustomEvent("journey:done"));

    var unlockMs = reduced ? 0 : 1100;
    var removeMs = reduced ? 0 : 800;

    window.setTimeout(function () {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, removeMs);

    window.setTimeout(function () {
      document.body.classList.remove("is-entering");
      window.scrollTo(0, 0);
    }, unlockMs);
  }

  function ring(cx, cy, r, seed) {
    var d = "";
    for (var i = 0; i <= 72; i++) {
      var a = (i / 72) * Math.PI * 2;
      var q =
        r *
        (1 +
          0.16 * Math.sin(3 * a + seed) +
          0.09 * Math.sin(5 * a + 2 * seed) +
          0.05 * Math.sin(7 * a + 3 * seed));
      d +=
        (i ? "L" : "M") +
        (cx + q * Math.cos(a) * 1.25).toFixed(1) +
        " " +
        (cy + q * Math.sin(a) * 0.8).toFixed(1);
    }
    return d + "Z";
  }

  function rnd(seed) {
    var s = seed;
    return function () {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  }

  function buildMapLayers() {
    if (!mapSvg) return;
    var r = rnd(5);
    var html = "";
    var mobile = window.matchMedia("(max-width: 700px)").matches;
    var hubs = [
      [180, 220, 1],
      [640, 150, 2],
      [520, 400, 3]
    ];
    var ringCount = 9;
    /* Mobile: grid of spaced hubs to fill the frame without ring overlap */
    if (mobile) {
      mapSvg.setAttribute("preserveAspectRatio", "xMidYMin slice");
      hubs = [
        [100, 40, 1],
        [400, 35, 2],
        [700, 40, 3],
        [220, 200, 4],
        [580, 200, 5],
        [100, 360, 6],
        [400, 380, 7],
        [700, 360, 8]
      ];
      ringCount = 6;
    }
    for (var h = 0; h < hubs.length; h++) {
      var hx = hubs[h][0];
      var hy = hubs[h][1];
      var hz = hubs[h][2];
      for (var k = ringCount; k >= 1; k--) {
        var delay = (0.35 + h * 0.4 + (ringCount - k) * 0.08).toFixed(2);
        var sw = k % 4 === 0 ? 1.35 : 0.7;
        html +=
          '<path pathLength="1" d="' +
          ring(hx, hy, 12 + (k - 1) * 14, hz) +
          '" style="stroke-width:' +
          sw +
          ";--t:" +
          delay +
          's"/>';
      }
    }
    mapSvg.querySelector(".L1").innerHTML = html;

    html = "";
    for (var i = 0; i < 7; i++) {
      var x = r() * 800;
      var y = r() * 500;
      var a = r() * 6.28;
      var p = "M" + x.toFixed(0) + " " + y.toFixed(0);
      for (var j = 0; j < 7; j++) {
        a += (r() - 0.5) * 1.1;
        x += Math.cos(a) * 70;
        y += Math.sin(a) * 60;
        p += "L" + x.toFixed(0) + " " + y.toFixed(0);
      }
      html +=
        '<path pathLength="1" d="' +
        p +
        '" style="animation-delay:' +
        (2 + i * 0.12).toFixed(2) +
        's"/>';
    }
    mapSvg.querySelector(".L2").innerHTML = html;

    html = "";
    /* Guaranteed samples in the open mid-gap (empty band above the intro card on mobile) */
    var samples = mobile
      ? [[465, 102]]
      : [[430, 210]];
    for (var s = 0; s < samples.length; s++) {
      html +=
        '<circle cx="' +
        samples[s][0] +
        '" cy="' +
        samples[s][1] +
        '" r="7" style="animation-delay:' +
        (2.8 + s * 0.08).toFixed(2) +
        's"/>';
    }
    for (var n = 0; n < 13; n++) {
      html +=
        '<circle cx="' +
        (r() * 780 + 10).toFixed(0) +
        '" cy="' +
        (r() * 480 + 10).toFixed(0) +
        '" r="6" style="animation-delay:' +
        (3.05 + n * 0.06).toFixed(2) +
        's"/>';
    }
    mapSvg.querySelector(".L3").innerHTML = html;
  }

  buildMapLayers();

  function exit(event) {
    if (event) event.stopPropagation();
    closeJourneyLoader();
  }

  loader.addEventListener("click", function () {
    closeJourneyLoader();
  });

  if (skipBtn) {
    skipBtn.addEventListener("click", exit);
    skipBtn.focus({ preventScroll: true });
  }

  document.addEventListener("keydown", function onKey(event) {
    if (event.key !== "Escape") return;
    document.removeEventListener("keydown", onKey);
    closeJourneyLoader();
  });

  var t0 = performance.now();
  var minMs = reduced ? 900 : INTRO_MS;
  var loaded = document.readyState === "complete";
  window.addEventListener(
    "load",
    function () {
      loaded = true;
    },
    { once: true }
  );

  (function tick(now) {
    if (leaving) return;
    var p = Math.min(100, ((now - t0) / minMs) * 100);
    var shown = loaded ? p : Math.min(p, 92);
    loader.style.setProperty("--p", String(shown / 100));
    if (pctEl) pctEl.textContent = String(Math.floor(shown));
    if (stEl) {
      stEl.textContent =
        STATUS[Math.min(STATUS.length - 1, Math.floor((shown / 100) * STATUS.length))];
    }
    if (shown >= 100) {
      window.setTimeout(closeJourneyLoader, 300);
    } else {
      raf = requestAnimationFrame(tick);
    }
  })(t0);
})();
