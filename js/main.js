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
      let activeId = "";

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
          indicator.style.transform = "translateX(" + (box.left - tabsBox.left - tabs.clientLeft) + "px)";
        }
        indicator.classList.add("is-ready");
      };

      const activeLink = () => links.querySelector("a.is-active") || links.querySelector("a");

      const syncIndicator = () => {
        moveIndicator(hoverLink || activeLink());
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
      const setActive = (id) => {
        const changed = id !== activeId;
        activeId = id;
        document.querySelectorAll("[data-section]").forEach((el) => {
          const on = el.getAttribute("data-section") === id;
          el.classList.toggle("is-active", on);
          if (el.closest("#navLinks")) {
            if (on) el.setAttribute("aria-current", "true");
            else el.removeAttribute("aria-current");
          }
        });
        if (changed && phoneQuery.matches && links) {
          const current = links.querySelector('[data-section="' + id + '"]');
          if (current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            current.classList.remove("is-pop");
            void current.offsetWidth;
            current.classList.add("is-pop");
          }
        }
        syncIndicator();
      };
      const updateSpy = () => {
        const header = document.querySelector(".site-header");
        const offset = (header ? header.offsetHeight : 0) + 12;
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const atEnd = scrollable > 0 && window.scrollY >= scrollable - 24;
        let current = sections[0] ? sections[0].id : "home";
        if (atEnd && sections.length) {
          current = sections[sections.length - 1].id;
        } else {
          sections.forEach((section) => {
            if (section.getBoundingClientRect().top - offset <= 0) current = section.id;
          });
        }
        const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
        if (tabs) tabs.style.setProperty("--p", String(progress));
        setActive(current);
      };
      const followIndicator = () => {
        const started = performance.now();
        const step = (now) => {
          syncIndicator();
          if (now - started < 460) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
      const expandBtn = document.getElementById("navExpand");
      const holdEdge = () => {
        if (!tabs || !phoneQuery.matches || !tabs.style.left || tabs.style.left === "auto") return;
        const box = tabs.getBoundingClientRect();
        if (window.innerWidth - box.right > box.left) return;
        tabs.style.left = "auto";
        tabs.style.right = Math.max(8, window.innerWidth - box.right) + "px";
        tabs.style.top = box.top + "px";
        tabs.style.transform = "none";
      };
      if (expandBtn && tabs) {
        expandBtn.addEventListener("click", () => {
          const open = !tabs.classList.contains("is-expanded");
          holdEdge();
          tabs.classList.toggle("is-expanded", open);
          expandBtn.setAttribute("aria-expanded", String(open));
          expandBtn.setAttribute("aria-label", open ? "Hide section names" : "Show section names");
          followIndicator();
        });
      }
      let drag = null;
      let blockClick = false;
      const clampNav = () => {
        if (!tabs || !tabs.style.left || tabs.style.left === "auto") return;
        const left = Math.min(window.innerWidth - tabs.offsetWidth - 8, Math.max(8, parseFloat(tabs.style.left)));
        const top = Math.min(window.innerHeight - tabs.offsetHeight - 8, Math.max(8, parseFloat(tabs.style.top) || 0));
        tabs.style.left = left + "px";
        tabs.style.top = top + "px";
      };
      const placeDrag = () => {
        if (!drag) return;
        const left = Math.min(window.innerWidth - drag.w - 8, Math.max(8, drag.left + drag.dx));
        const top = Math.min(window.innerHeight - drag.h - 8, Math.max(8, drag.top + drag.dy));
        drag.nextLeft = left;
        drag.nextTop = top;
        tabs.style.transform = "translate3d(" + (left - drag.left) + "px," + (top - drag.top) + "px,0)";
      };
      if (tabs) {
        tabs.addEventListener("pointerdown", (event) => {
          if (!phoneQuery.matches || event.button !== 0) return;
          blockClick = false;
          const box = tabs.getBoundingClientRect();
          drag = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            left: box.left,
            top: box.top,
            w: box.width,
            h: box.height,
            dx: 0,
            dy: 0,
            moved: false,
            frame: 0
          };
          tabs.setPointerCapture(event.pointerId);
        });
        tabs.addEventListener("pointermove", (event) => {
          if (!drag || event.pointerId !== drag.id) return;
          drag.dx = event.clientX - drag.x;
          drag.dy = event.clientY - drag.y;
          if (!drag.moved && Math.hypot(drag.dx, drag.dy) < 8) return;
          if (!drag.moved) {
            drag.moved = true;
            tabs.classList.add("is-dragging");
            tabs.style.right = "auto";
            tabs.style.left = drag.left + "px";
            tabs.style.top = drag.top + "px";
            tabs.style.transform = "none";
          }
          if (drag.frame) return;
          drag.frame = requestAnimationFrame(() => {
            if (!drag) return;
            drag.frame = 0;
            placeDrag();
          });
        });
        const endDrag = (event) => {
          if (!drag || event.pointerId !== drag.id) return;
          if (drag.frame) cancelAnimationFrame(drag.frame);
          if (drag.moved) {
            placeDrag();
            tabs.style.left = drag.nextLeft + "px";
            tabs.style.top = drag.nextTop + "px";
            tabs.style.transform = "none";
            blockClick = true;
          }
          tabs.classList.remove("is-dragging");
          drag = null;
        };
        tabs.addEventListener("pointerup", endDrag);
        tabs.addEventListener("pointercancel", endDrag);
        tabs.addEventListener("click", (event) => {
          if (!blockClick) return;
          blockClick = false;
          event.preventDefault();
          event.stopPropagation();
        }, true);
      }
      window.addEventListener("scroll", updateSpy, { passive: true });
      window.addEventListener("resize", () => {
        clampNav();
        syncIndicator();
      });
      updateSpy();
      followIndicator();
    },

    initBackToTop() {
      const button = document.getElementById("backToTop");
      const hero = document.getElementById("home");
      const phone = window.matchMedia("(max-width: 767px)");
      const show = (on) => button.classList.toggle("is-visible", on);
      if (hero && "IntersectionObserver" in window) {
        const watcher = new IntersectionObserver((entries) => {
          if (!phone.matches) return;
          show(!entries[0].isIntersecting);
        });
        watcher.observe(hero);
      }
      window.addEventListener("scroll", () => {
        if (phone.matches) return;
        show(window.scrollY > 480);
      }, { passive: true });
      if (phone.addEventListener) {
        phone.addEventListener("change", () => {
          if (!phone.matches) show(window.scrollY > 480);
        });
      }
      button.addEventListener("click", () => {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      });
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
    PortfolioApp.initBackToTop();

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
        window.PortfolioUI.startRoleCycle();
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
