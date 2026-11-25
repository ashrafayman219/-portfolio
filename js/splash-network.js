(function () {
  "use strict";

  var splash = document.getElementById("home");
  var canvas = document.getElementById("splashNetwork");
  if (!splash || !canvas || !canvas.getContext) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduced.matches) return;

  var ctx = canvas.getContext("2d");
  var mouse = { x: -9999, y: -9999 };
  var particles = [];
  var width = 0;
  var height = 0;
  var running = false;
  var visible = false;
  var raf = 0;

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function rebuild() {
    var count = Math.max(40, Math.round((width * height) / 10000));
    particles = [];
    for (var i = 0; i < count; i += 1) {
      particles.push({
        x: rand(0, width),
        y: rand(0, height),
        vx: rand(-0.32, 0.32),
        vy: rand(-0.32, 0.32)
      });
    }
  }

  function resize() {
    var rect = splash.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rebuild();
  }

  function step() {
    if (!running || !visible) {
      raf = 0;
      return;
    }

    ctx.clearRect(0, 0, width, height);

    var i;
    var j;
    var p;
    var q;
    var dx;
    var dy;
    var d;
    var link = 130;
    var cursor = 170;
    var light = document.documentElement.getAttribute("data-theme") === "light";
    var dot = light ? "rgba(45, 110, 130, 0.55)" : "rgba(220, 235, 255, 0.95)";
    var cursorRgb = light ? "45, 110, 130" : "144, 205, 244";
    var linkRgb = light ? "55, 120, 140" : "144, 190, 240";
    var cursorAlpha = light ? 0.45 : 0.85;
    var linkAlpha = light ? 0.34 : 0.5;

    for (i = 0; i < particles.length; i += 1) {
      p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;

      dx = mouse.x - p.x;
      dy = mouse.y - p.y;
      d = Math.hypot(dx, dy);
      if (d < cursor && d > 1) {
        p.x += (dx / d) * 0.5;
        p.y += (dy / d) * 0.5;
        ctx.strokeStyle = "rgba(" + cursorRgb + "," + (cursorAlpha * (1 - d / cursor)).toFixed(3) + ")";
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
      }

      ctx.fillStyle = dot;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (i = 0; i < particles.length; i += 1) {
      for (j = i + 1; j < particles.length; j += 1) {
        p = particles[i];
        q = particles[j];
        dx = p.x - q.x;
        dy = p.y - q.y;
        d = Math.hypot(dx, dy);
        if (d < link) {
          ctx.strokeStyle = "rgba(" + linkRgb + "," + (linkAlpha * (1 - d / link)).toFixed(3) + ")";
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }

    raf = window.requestAnimationFrame(step);
  }

  function start() {
    if (running || reduced.matches) return;
    running = true;
    if (!raf) raf = window.requestAnimationFrame(step);
  }

  function stop() {
    running = false;
    if (raf) {
      window.cancelAnimationFrame(raf);
      raf = 0;
    }
    ctx.clearRect(0, 0, width, height);
  }

  function setPointer(clientX, clientY) {
    var rect = splash.getBoundingClientRect();
    mouse.x = clientX - rect.left;
    mouse.y = clientY - rect.top;
  }

  splash.addEventListener("pointermove", function (e) {
    setPointer(e.clientX, e.clientY);
  });
  splash.addEventListener("pointerleave", function () {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        visible = entries[0] && entries[0].isIntersecting && entries[0].intersectionRatio > 0.08;
        if (visible && !document.hidden) start();
        else stop();
      },
      { threshold: [0, 0.08, 0.2] }
    );
    io.observe(splash);
  } else {
    visible = true;
    start();
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) stop();
    else if (visible) start();
  });

  reduced.addEventListener("change", function () {
    if (reduced.matches) {
      stop();
      canvas.style.display = "none";
    } else {
      canvas.style.display = "";
      resize();
      if (visible) start();
    }
  });

  window.addEventListener("resize", resize);
  if ("ResizeObserver" in window) {
    new ResizeObserver(resize).observe(splash);
  }

  resize();
  if (visible) start();
})();
