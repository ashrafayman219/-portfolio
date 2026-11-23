(function () {
  "use strict";

  if (typeof Lenis === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var lenis = new Lenis({
    // Soft glide during scroll; end-snap below cuts the slow crawl that feels like vibration
    smoothWheel: true,
    lerp: 0.16,
    wheelMultiplier: 1,
    touchMultiplier: 1,
    syncTouch: false,
    prevent: function (node) {
      if (!node || !node.closest) return false;
      return Boolean(
        node.closest("#map-wrap") ||
          node.closest("#mapView") ||
          node.closest(".projects-marquee") ||
          node.closest(".modal-panel") ||
          node.closest(".all-panel") ||
          node.closest("[data-lenis-prevent]")
      );
    }
  });

  window.lenis = lenis;

  var snapping = false;
  var lastWheel = 0;

  window.addEventListener(
    "wheel",
    function () {
      lastWheel = performance.now();
      snapping = false;
    },
    { passive: true }
  );

  // When the soft trail is almost done, snap the last pixels so it doesn't crawl/vibrate
  lenis.on("scroll", function () {
    if (snapping) return;
    if (performance.now() - lastWheel < 90) return;

    var target = lenis.targetScroll;
    var current = lenis.animatedScroll;
    var dist = Math.abs(target - current);
    var speed = Math.abs(lenis.velocity);

    if (dist > 0.5 && dist < 14 && speed < 0.55) {
      snapping = true;
      lenis.scrollTo(target, { immediate: true });
      snapping = false;
    }
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  if (document.body.classList.contains("is-loading")) {
    lenis.stop();
    document.addEventListener(
      "journey:done",
      function () {
        lenis.start();
      },
      { once: true }
    );
  }

  document.addEventListener("click", function (event) {
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;
    var href = link.getAttribute("href");
    if (!href || href === "#" || href.length < 2) return;
    var el = document.getElementById(href.slice(1));
    if (!el) return;
    event.preventDefault();
    lenis.scrollTo(el, { offset: -24 });
    if (history.replaceState) history.replaceState(null, "", href);
  });

  window.scrollToSection = function (target, options) {
    var el = typeof target === "string" ? document.getElementById(String(target).replace(/^#/, "")) : target;
    if (!el) return;
    var opts = options || {};
    if (window.lenis) {
      window.lenis.scrollTo(el, {
        offset: typeof opts.offset === "number" ? opts.offset : -24,
        immediate: Boolean(opts.immediate)
      });
      return;
    }
    el.scrollIntoView({
      behavior: opts.immediate ? "auto" : "smooth",
      block: opts.block || "start"
    });
  };
})();
