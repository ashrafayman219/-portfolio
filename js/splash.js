(function () {
  "use strict";

  var LINE = "Turning Data into";
  var HIGHLIGHT = "decisions.";
  var START_DELAY = 500;
  var CHAR_MS = 70;
  var LINE_PAUSE = 500;
  var CARET_FADE_MS = 1000;

  var lineEl = document.getElementById("splashLine");
  var highlightEl = document.getElementById("splashHighlight");
  var caretA = document.getElementById("splashCaretA");
  var caretB = document.getElementById("splashCaretB");
  var subEl = document.getElementById("splashSub");
  var ctaEl = document.getElementById("splashCta");
  var scrollEl = document.querySelector(".splash-scroll");
  var started = false;
  var timers = [];

  function later(fn, ms) {
    var id = window.setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  function showCaret(el, on) {
    if (!el) return;
    if (on) el.removeAttribute("hidden");
    else el.setAttribute("hidden", "");
  }

  function revealRest() {
    if (subEl) subEl.classList.add("is-in");
    if (ctaEl) ctaEl.classList.add("is-in");
    if (scrollEl) scrollEl.classList.add("is-in");
    later(function () {
      showCaret(caretB, false);
    }, CARET_FADE_MS);
  }

  function typeHighlight(index) {
    if (!highlightEl) return;
    if (index <= HIGHLIGHT.length) {
      highlightEl.textContent = HIGHLIGHT.slice(0, index);
      showCaret(caretA, false);
      showCaret(caretB, true);
      if (index < HIGHLIGHT.length) {
        later(function () {
          typeHighlight(index + 1);
        }, CHAR_MS);
      } else {
        revealRest();
      }
    }
  }

  function typeLine(index) {
    if (!lineEl) return;
    if (index <= LINE.length) {
      lineEl.textContent = LINE.slice(0, index);
      showCaret(caretA, true);
      showCaret(caretB, false);
      if (index < LINE.length) {
        later(function () {
          typeLine(index + 1);
        }, CHAR_MS);
      } else {
        later(function () {
          typeHighlight(1);
        }, LINE_PAUSE);
      }
    }
  }

  function runInstant() {
    if (lineEl) lineEl.textContent = LINE;
    if (highlightEl) highlightEl.textContent = HIGHLIGHT;
    showCaret(caretA, false);
    showCaret(caretB, false);
    revealRest();
  }

  function startSplashTypewriter() {
    if (started) return;
    started = true;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      runInstant();
      return;
    }
    later(function () {
      typeLine(1);
    }, START_DELAY);
  }

  if (window.__journeyDone || !document.body.classList.contains("is-loading")) {
    startSplashTypewriter();
  } else {
    document.addEventListener("journey:done", startSplashTypewriter, { once: true });
  }
})();
