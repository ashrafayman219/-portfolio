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

      const moveIndicator = (link) => {
        if (!tabs || !indicator || !link) return;
        if (window.matchMedia("(max-width: 767px)").matches) return;
        const tabsBox = tabs.getBoundingClientRect();
        const box = link.getBoundingClientRect();
        indicator.style.width = box.width + "px";
        indicator.style.transform = "translateX(" + (box.left - tabsBox.left - tabs.clientLeft) + "px)";
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
        document.querySelectorAll("[data-section]").forEach((el) => {
          el.classList.toggle("is-active", el.getAttribute("data-section") === id);
        });
        syncIndicator();
      };
      const updateSpy = () => {
        const header = document.querySelector(".site-header");
        const offset = (header ? header.offsetHeight : 0) + 12;
        let current = sections[0] ? sections[0].id : "home";
        sections.forEach((section) => {
          if (section.getBoundingClientRect().top - offset <= 0) current = section.id;
        });
        setActive(current);
      };
      window.addEventListener("scroll", updateSpy, { passive: true });
      window.addEventListener("resize", syncIndicator);
      updateSpy();
    },

    initBackToTop() {
      const button = document.getElementById("backToTop");
      window.addEventListener("scroll", () => {
        button.classList.toggle("is-visible", window.scrollY > 480);
      });
      button.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    },

    initCounters() {
      const els = document.querySelectorAll("[data-count]");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const finish = (el) => {
        el.textContent = el.dataset.count + el.dataset.suffix;
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
          el.textContent = Math.round(to * eased) + el.dataset.suffix;
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
      window.PortfolioUI.startRoleCycle();
      PortfolioApp.initCounters();
      const groups = [
        ".section-header",
        ".hero-grid > div",
        "#map-wrap",
        "#projectFilters",
        "#projectsMarquee",
        ".contact-grid > *"
      ];
      document.querySelectorAll(groups.join(",")).forEach((el) => el.classList.add("reveal"));
      ["#workTimeline .timeline-item", "#eduTimeline .timeline-item", "#skillsGrid .skill-card", ".hero-stats .stat"].forEach((sel) => {
        document.querySelectorAll(sel).forEach((el, index) => {
          el.classList.add("reveal");
          el.style.setProperty("--reveal-delay", Math.min(index, 6) * 70 + "ms");
        });
      });
      PortfolioApp.observeReveals();
      await window.GISMap.init(data);
    } catch (error) {
      console.error(error);
      document.getElementById("heroAbout").textContent =
        "The portfolio data file could not be loaded. Open this site through a local server so data/projects.json can be fetched.";
    }
  });
})();
