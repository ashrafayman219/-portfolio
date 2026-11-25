(function () {
  "use strict";

  const PortfolioApp = {
    observer: null,

    initNav() {
      const links = document.getElementById("navLinks");
      const tabs = document.querySelector(".nav-tabs");
      const indicator = document.getElementById("navIndicator");
      const fab = document.getElementById("mobileNav");
      const plus = document.getElementById("mobileNavToggle");
      let hoverLink = null;

      const phoneQuery = window.matchMedia("(max-width: 767px)");
      let activeId = null;
      let pinnedId = "";
      let pinnedUntil = 0;

      const moveIndicator = (link) => {
        if (!tabs || !indicator || !link) return;
        if (phoneQuery.matches) {
          const tabsBox = tabs.getBoundingClientRect();
          const box = link.getBoundingClientRect();
          indicator.style.left = "0";
          indicator.style.top = "0";
          indicator.style.width = box.width + "px";
          indicator.style.height = box.height + "px";
          indicator.style.transform = "translate(" + (box.left - tabsBox.left - tabs.clientLeft) + "px," + (box.top - tabsBox.top - tabs.clientTop) + "px)";
        } else {
          const tabsBox = tabs.getBoundingClientRect();
          const box = link.getBoundingClientRect();
          indicator.style.left = "";
          indicator.style.top = "";
          indicator.style.height = "";
          indicator.style.width = box.width + "px";
          /* top:50% in CSS — keep Y at -50% so the pill stays vertically centered */
          indicator.style.transform =
            "translate(" + (box.left - tabsBox.left - tabs.clientLeft) + "px, -50%)";
        }
        indicator.classList.add("is-ready");
      };

      const activeLink = () => (links ? links.querySelector("a.is-active") : null);

      const syncIndicator = () => {
        const link = hoverLink || activeLink();
        if (!link) {
          if (indicator) {
            indicator.classList.remove("is-ready");
            indicator.style.width = "0px";
          }
          return;
        }
        moveIndicator(link);
      };

      const closeFab = () => {
        if (!fab || !plus) return;
        fab.classList.remove("is-open");
        plus.setAttribute("aria-expanded", "false");
        plus.setAttribute("aria-label", "Open menu");
      };

      if (plus && fab) {
        plus.addEventListener("click", (event) => {
          event.stopPropagation();
          const open = !fab.classList.contains("is-open");
          fab.classList.toggle("is-open", open);
          plus.setAttribute("aria-expanded", String(open));
          plus.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        });
        fab.querySelectorAll("a").forEach((link) => {
          link.addEventListener("click", closeFab);
        });
        document.addEventListener("click", (event) => {
          if (!fab.contains(event.target)) closeFab();
        });
      }

      const clearPreview = () => {
        if (links) links.querySelectorAll("a.is-preview").forEach((item) => item.classList.remove("is-preview"));
        if (tabs) tabs.classList.remove("is-hovering");
      };

      if (links) {
        links.querySelectorAll("a").forEach((link) => {
          link.addEventListener("click", () => {
            const id = link.getAttribute("data-section");
            if (!id) return;
            pinnedId = id;
            pinnedUntil = performance.now() + 900;
            setActive(id);
          });
          link.addEventListener("mouseenter", () => {
            if (phoneQuery.matches) return;
            hoverLink = link;
            links.querySelectorAll("a.is-preview").forEach((item) => item.classList.remove("is-preview"));
            link.classList.add("is-preview");
            if (tabs) tabs.classList.add("is-hovering");
            syncIndicator();
          });
        });
      }
      if (tabs) {
        tabs.addEventListener("mouseleave", () => {
          hoverLink = null;
          clearPreview();
          syncIndicator();
        });
      }

      const sections = [...document.querySelectorAll("main section[id]")];
      const header = document.querySelector(".site-header");
      const shell = document.querySelector(".header-shell");
      let shellRaf = 0;
      // Soft Niyam width morph — padding snaps (pad tween caused end vibration).
      // Ease crawl is discarded: we only use the first 60% of Niyam's curve.
      const SHELL_DUR = 900;
      const PAD = {
        open: { y: 16, x: 48 },
        closed: { y: 8, x: 24 }
      };

      const niyamEase = (() => {
        const p1x = 0.16;
        const p1y = 1;
        const p2x = 0.3;
        const p2y = 1;
        const sampleX = (t) =>
          3 * (1 - t) * (1 - t) * t * p1x + 3 * (1 - t) * t * t * p2x + t * t * t;
        const sampleY = (t) =>
          3 * (1 - t) * (1 - t) * t * p1y + 3 * (1 - t) * t * t * p2y + t * t * t;
        return (x) => {
          let t = x;
          for (let i = 0; i < 6; i += 1) {
            const xEst = sampleX(t) - x;
            const d =
              3 * (1 - t) * (1 - t) * p1x +
              6 * (1 - t) * t * (p2x - p1x) +
              3 * t * t * (1 - p2x);
            if (Math.abs(xEst) < 1e-5 || Math.abs(d) < 1e-5) break;
            t = Math.min(1, Math.max(0, t - xEst / d));
          }
          return sampleY(t);
        };
      })();

      const shellTargetWidth = (scrolled) => {
        const cap = scrolled ? 960 : 1400;
        return Math.round(Math.min(cap, window.innerWidth - 32));
      };

      const applyShellWidth = (width) => {
        if (!shell || phoneQuery.matches) return;
        shell.style.width = Math.round(width) + "px";
        shell.style.maxWidth = "none";
      };

      const applyShellPad = (pad) => {
        if (!shell || phoneQuery.matches) return;
        shell.style.padding = pad.y + "px " + pad.x + "px";
      };

      const animateShell = (scrolled) => {
        if (!shell || phoneQuery.matches) {
          syncIndicator();
          return;
        }
        if (shellRaf) cancelAnimationFrame(shellRaf);
        const fromW = Math.round(shell.getBoundingClientRect().width);
        const toW = shellTargetWidth(scrolled);
        const toPad = scrolled ? PAD.closed : PAD.open;

        // Snap padding once — do not tween it (that was the end vibration)
        applyShellPad(toPad);
        shell.classList.add("is-morphing");

        if (fromW === toW) {
          shell.classList.remove("is-morphing");
          applyShellWidth(toW);
          syncIndicator();
          return;
        }

        const start = performance.now();
        let lastW = fromW;
        const finish = () => {
          shellRaf = 0;
          applyShellWidth(toW);
          shell.classList.remove("is-morphing");
          syncIndicator();
        };
        const tick = (now) => {
          const t = Math.min(1, (now - start) / SHELL_DUR);
          // Soft Niyam body only — map full duration onto first 60% of the curve
          // so the decelerating crawl never runs.
          const e = Math.min(1, Math.max(0, niyamEase(Math.min(1, t / 0.6))));
          const w = Math.round(fromW + (toW - fromW) * e);
          if (w !== lastW) {
            applyShellWidth(w);
            lastW = w;
          }
          if (w === toW || t >= 1 || e >= 0.999) {
            finish();
            return;
          }
          shellRaf = requestAnimationFrame(tick);
        };
        shellRaf = requestAnimationFrame(tick);
      };

      const setActive = (id) => {
        if (id === activeId) return;
        activeId = id;
        document.querySelectorAll("[data-section]").forEach((el) => {
          const on = Boolean(id) && el.getAttribute("data-section") === id;
          el.classList.toggle("is-active", on);
          if (el.closest("#navLinks")) {
            if (on) el.setAttribute("aria-current", "true");
            else el.removeAttribute("aria-current");
          }
        });
        // Hide the sliding pill on the splash (no section selected)
        if (!id && indicator) {
          indicator.classList.remove("is-ready");
          indicator.style.width = "0px";
        } else {
          syncIndicator();
        }
      };
      const updateSpy = () => {
        const sample = sections[0];
        const scrollMargin = sample ? parseFloat(getComputedStyle(sample).scrollMarginTop) || 0 : 0;
        // Fixed offset — never use live header height (morphing it caused scroll jitter)
        const line = Math.max(88, scrollMargin) + 16;
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const atEnd = scrollable > 0 && window.scrollY >= scrollable - 48;
        let current = sections[0] ? sections[0].id : "home";
        if (performance.now() < pinnedUntil && pinnedId) {
          current = pinnedId;
        } else if (atEnd && sections.length) {
          current = sections[sections.length - 1].id;
        } else {
          sections.forEach((section) => {
            if (section.getBoundingClientRect().top <= line) current = section.id;
          });
        }
        // Splash (#home) has no nav highlight; Home lights up at #profile
        const navSection = current === "home" ? "" : current;
        const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
        if (tabs) tabs.style.setProperty("--p", String(progress));
        if (header) {
          const wasScrolled = header.classList.contains("is-scrolled");
          // Hysteresis matches Niyam threshold (~60) without edge flicker
          const nowScrolled = wasScrolled ? window.scrollY > 40 : window.scrollY > 60;
          if (wasScrolled !== nowScrolled) {
            header.classList.toggle("is-scrolled", nowScrolled);
            animateShell(nowScrolled);
          }
        }
        // Mobile dock: stay dark until the profile stats come into view
        if (tabs && phoneQuery.matches) {
          const stats = document.querySelector(".hero-stats");
          if (stats) {
            const line = window.innerHeight * 0.72;
            tabs.classList.toggle("is-light", stats.getBoundingClientRect().top < line);
          }
        } else if (tabs) {
          tabs.classList.remove("is-light");
        }
        setActive(navSection);
      };
      const followIndicator = () => {
        const started = performance.now();
        const step = (now) => {
          syncIndicator();
          if (now - started < 460) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
      window.addEventListener("scroll", updateSpy, { passive: true });
      window.addEventListener("scrollend", () => {
        pinnedUntil = 0;
        updateSpy();
      });
      window.addEventListener("load", syncIndicator);
      window.addEventListener("resize", () => {
        if (tabs && !phoneQuery.matches) {
          tabs.style.left = "";
          tabs.style.right = "";
          tabs.style.top = "";
          tabs.style.bottom = "";
          tabs.style.transform = "";
        }
        if (shell) {
          if (phoneQuery.matches) {
            shell.style.width = "";
            shell.style.maxWidth = "";
            shell.style.padding = "";
            shell.classList.remove("is-morphing");
          } else if (header) {
            const scrolled = header.classList.contains("is-scrolled");
            applyShellPad(scrolled ? PAD.closed : PAD.open);
            applyShellWidth(shellTargetWidth(scrolled));
          }
        }
        syncIndicator();
      });
      if (shell && !phoneQuery.matches) {
        applyShellPad(PAD.open);
        applyShellWidth(shellTargetWidth(false));
      }
      updateSpy();
      followIndicator();
    },

    initCounters() {
      const els = document.querySelectorAll("[data-count]");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const finish = (el) => {
        el.textContent = (el.dataset.prefix || "") + el.dataset.count + el.dataset.suffix;
      };
      if (reduced || !("IntersectionObserver" in window)) {
        els.forEach(finish);
        return;
      }
      const run = (el) => {
        const to = Number(el.dataset.count) || 0;
        const start = performance.now();
        const dur = 1200;
        const tick = (now) => {
          const t = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = (el.dataset.prefix || "") + Math.round(to * eased) + el.dataset.suffix;
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      };
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            run(entry.target);
            io.unobserve(entry.target);
          });
        },
        { threshold: 0.6 }
      );
      els.forEach((el) => io.observe(el));
    },

    observeReveals() {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
        return;
      }
      if (!this.observer) {
        this.observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                if (entry.target.id === "map-wrap" && window.GISMap && window.GISMap.map) {
                  window.GISMap.map.invalidateSize();
                }
                this.observer.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
        );
      }
      document.querySelectorAll(".reveal:not(.is-visible)").forEach((el) => this.observer.observe(el));
    },

    async loadData() {
      const response = await fetch("data/projects.json");
      if (!response.ok) throw new Error("Could not load portfolio data");
      return response.json();
    }
  };

  window.PortfolioApp = PortfolioApp;

  document.addEventListener("DOMContentLoaded", async () => {
    PortfolioApp.initNav();
    try {
      const data = await PortfolioApp.loadData();
      window.PortfolioUI.render(data);
      const groups = [
        ".section-header",
        "#map-wrap",
        ".contact-grid > *"
      ];
      document.querySelectorAll(groups.join(",")).forEach((el) => el.classList.add("reveal"));
      ["#workTimeline .timeline-item", "#eduTimeline .timeline-item"].forEach((sel) => {
        document.querySelectorAll(sel).forEach((el, index) => {
          el.classList.add("reveal");
          el.style.setProperty("--reveal-delay", Math.min(index, 6) * 70 + "ms");
        });
      });
      const startSite = () => {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.setTimeout(() => PortfolioApp.initCounters(), reduced ? 0 : 600);
        PortfolioApp.observeReveals();
      };
      if (window.__journeyDone || !document.body.classList.contains("is-loading")) startSite();
      else document.addEventListener("journey:done", startSite, { once: true });
      await window.GISMap.init(data);
    } catch (error) {
      console.error(error);
      document.getElementById("heroAbout").textContent =
        "The portfolio data file could not be loaded. Open this site through a local server so data/projects.json can be fetched.";
    }
  });
})();
