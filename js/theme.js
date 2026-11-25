(function () {
  "use strict";

  var KEY = "portfolio-theme";
  var root = document.documentElement;
  var btn = document.getElementById("themeToggle");

  function current() {
    var theme = root.getAttribute("data-theme");
    return theme === "light" ? "light" : "dark";
  }

  function apply(theme) {
    var next = theme === "light" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem(KEY, next);
    } catch (e) {}
    if (btn) {
      var light = next === "light";
      btn.setAttribute("aria-pressed", light ? "true" : "false");
      btn.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
    }
    document.dispatchEvent(new CustomEvent("theme:change", { detail: { theme: next } }));
  }

  apply(current());

  if (btn) {
    btn.addEventListener("click", function () {
      apply(current() === "light" ? "dark" : "light");
    });
  }
})();
