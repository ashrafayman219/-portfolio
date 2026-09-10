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
        indicator.style.transform = "translateX(" + (box.left - tabsBox.left) + "px)";
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

      if (links) {
        links.querySelectorAll("a").forEach((link) => {
          link.addEventListener("mouseenter", () => {
            hoverLink = link;
            syncIndicator();
          });
        });
      }
      if (tabs) {
        tabs.addEventListener("mouseleave", () => {
          hoverLink = null;
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
      document.querySelectorAll(".section-header, .hero-grid > div").forEach((el) => el.classList.add("reveal"));
      PortfolioApp.observeReveals();
      await window.GISMap.init(data);
    } catch (error) {
      console.error(error);
      document.getElementById("heroAbout").textContent =
        "The portfolio data file could not be loaded. Open this site through a local server so data/projects.json can be fetched.";
    }
  });
})();
