(function (global) {
  "use strict";

  const PREFS_KEY = "portfolio.map.prefs";
  const THEME_KEY = "portfolio.map.theme";

  const MapUI = {
    state: {
      theme: "glass",
      legendOn: false,
      dockOpen: false,
      dockPanel: "layers",
      labelMode: "off"
    },

    dockTitles: {
      layers: "Layers",
      locations: "Locations"
    },

    FLYOUTS: [
      { menu: "search-menu", btn: "btn-search" },
      { menu: "labels-menu", btn: "btn-labels" },
      { menu: "basemap-menu", btn: "btn-basemap" }
    ],

    loadPrefs() {
      const prefs = {
        theme: "glass",
        legendOn: false,
        legendExplicit: false,
        dockOpen: false,
        dockPanel: "layers",
        labelMode: "off"
      };
      try {
        const raw = localStorage.getItem(PREFS_KEY);
        if (raw) Object.assign(prefs, JSON.parse(raw));
        if (!prefs.legendExplicit) prefs.legendOn = false;
      } catch (err) {
        /* ignore */
      }
      try {
        const theme = localStorage.getItem(THEME_KEY);
        if (theme === "glass" || theme === "light") prefs.theme = theme;
      } catch (err) {
        /* ignore */
      }
      this.state = prefs;
      return prefs;
    },

    savePrefs(patch) {
      Object.assign(this.state, patch || {});
      try {
        localStorage.setItem(THEME_KEY, this.state.theme);
        localStorage.setItem(
          PREFS_KEY,
          JSON.stringify({
            legendOn: this.state.legendOn,
            legendExplicit: !!this.state.legendExplicit,
            dockOpen: this.state.dockOpen,
            dockPanel: this.state.dockPanel,
            labelMode: this.state.labelMode || "off"
          })
        );
      } catch (err) {
        /* ignore */
      }
    },

    wrap() {
      return document.getElementById("map-wrap");
    },

    applyTheme(theme, persist) {
      const next = theme === "glass" ? "glass" : "light";
      const wrap = this.wrap();
      if (wrap) wrap.setAttribute("data-map-theme", next);
      const btn = document.getElementById("btn-theme");
      if (btn) {
        btn.classList.toggle("active", next === "glass");
        btn.setAttribute("aria-pressed", next === "glass" ? "true" : "false");
      }
      this.state.theme = next;
      if (persist !== false) this.savePrefs({ theme: next });
      this.syncLiquidGlass();
    },

    glassTargets() {
      return [
        document.getElementById("dock"),
        document.getElementById("map-toolbar"),
        document.getElementById("status-bar"),
        document.getElementById("map-legend"),
        document.getElementById("detail-panel")
      ]
        .concat([].slice.call(document.querySelectorAll("#map-wrap .flyout")))
        .concat([].slice.call(document.querySelectorAll("#project-pills .bookmark-pill")))
        .filter(Boolean);
    },

    wrapLiquidGlass(el) {
      if (!el || el.classList.contains("liquidGlass-content")) return;
      if (el.querySelector(":scope > .liquidGlass-effect") && el.querySelector(":scope > .liquidGlass-content")) return;
      if (el.classList.contains("liquidGlass-wrapper")) this.unwrapLiquidGlass(el);
      const content = document.createElement("div");
      content.className = "liquidGlass-content";
      while (el.firstChild) content.appendChild(el.firstChild);
      ["liquidGlass-effect", "liquidGlass-tint", "liquidGlass-shine"].forEach((name) => {
        const layer = document.createElement("div");
        layer.className = name;
        layer.setAttribute("aria-hidden", "true");
        el.appendChild(layer);
      });
      el.appendChild(content);
      el.classList.add("liquidGlass-wrapper");
    },

    unwrapLiquidGlass(el) {
      if (!el) return;
      const content = el.querySelector(":scope > .liquidGlass-content");
      if (content) {
        while (content.firstChild) el.appendChild(content.firstChild);
      }
      el.querySelectorAll(
        ":scope > .liquidGlass-effect, :scope > .liquidGlass-tint, :scope > .liquidGlass-shine, :scope > .liquidGlass-content"
      ).forEach((node) => node.remove());
      el.classList.remove("liquidGlass-wrapper");
    },

    syncLiquidGlass() {
      const wrap = this.wrap();
      const on = wrap && wrap.getAttribute("data-map-theme") === "glass";
      if (on) {
        this.glassTargets().forEach((el) => this.wrapLiquidGlass(el));
        return;
      }
      document.querySelectorAll("#map-wrap .liquidGlass-wrapper").forEach((el) => this.unwrapLiquidGlass(el));
    },

    labelsToolShouldStayActive() {
      return this.state.labelMode === "name";
    },

    syncLabelsToolButton() {
      const btn = document.getElementById("btn-labels");
      if (!btn) return;
      const menu = document.getElementById("labels-menu");
      const flyoutOpen = !!(menu && menu.classList.contains("open"));
      const modeOn = this.labelsToolShouldStayActive();
      btn.classList.toggle("active", flyoutOpen || modeOn);
      btn.setAttribute("aria-pressed", modeOn ? "true" : "false");
    },

    closeNamedFlyout(menuId) {
      const spec = this.FLYOUTS.find((item) => item.menu === menuId);
      const menu = document.getElementById(menuId);
      const btn = spec ? document.getElementById(spec.btn) : null;
      if (menu) menu.classList.remove("open");
      if (btn) {
        if (menuId === "labels-menu" && this.labelsToolShouldStayActive()) btn.classList.add("active");
        else btn.classList.remove("active");
        btn.setAttribute("aria-expanded", "false");
      }
    },

    closeFlyouts() {
      this.FLYOUTS.forEach((item) => this.closeNamedFlyout(item.menu));
      this.syncLabelsToolButton();
    },

    positionFlyout(el, anchor) {
      const wrapEl = this.wrap();
      if (!el || !anchor || !wrapEl) return;
      const wrap = wrapEl.getBoundingClientRect();
      const r = anchor.getBoundingClientRect();
      const width = el.offsetWidth || 240;
      let left = r.left - wrap.left + r.width / 2 - width / 2;
      left = Math.max(12, Math.min(left, wrap.width - width - 12));
      el.style.left = left + "px";
      el.style.right = "auto";
      el.style.top = "auto";
      el.style.bottom = wrap.bottom - r.top + 10 + "px";
    },

    setFlyoutOpen(menuId, open) {
      const spec = this.FLYOUTS.find((item) => item.menu === menuId);
      const menu = document.getElementById(menuId);
      const btn = spec ? document.getElementById(spec.btn) : null;
      if (!menu || !btn) return;
      const willOpen = open !== false && !menu.classList.contains("open");
      this.closeFlyouts();
      if (!willOpen) return;
      menu.classList.add("open");
      btn.classList.add("active");
      btn.setAttribute("aria-expanded", "true");
      this.positionFlyout(menu, btn);
      if (menuId === "search-menu") {
        const input = document.getElementById("search-input");
        if (input) setTimeout(() => input.focus(), 40);
      }
      this.syncLabelsToolButton();
    },

    setDock(panel, open) {
      const dock = document.getElementById("dock");
      const title = document.getElementById("dock-title");
      const nextPanel = panel || this.state.dockPanel || "layers";
      const isOpen = open !== false;

      document.querySelectorAll("#map-wrap .panel").forEach((item) => item.classList.remove("active"));
      const panelEl = document.getElementById("panel-" + nextPanel);
      if (panelEl) panelEl.classList.add("active");
      if (title) title.textContent = this.dockTitles[nextPanel] || "Layers";
      if (dock) dock.classList.toggle("open", isOpen);

      document.querySelectorAll("#map-toolbar [data-dock]").forEach((btn) => {
        btn.classList.toggle("active", isOpen && btn.dataset.dock === nextPanel);
      });

      this.savePrefs({ dockPanel: nextPanel, dockOpen: isOpen });
      if (isOpen) this.closeFlyouts();
    },

    toggleDock(panel) {
      const dock = document.getElementById("dock");
      const open = dock && dock.classList.contains("open");
      const current = this.state.dockPanel;
      if (open && current === panel) this.setDock(panel, false);
      else this.setDock(panel, true);
    },

    setLegend(on) {
      const legend = document.getElementById("map-legend");
      const btn = document.getElementById("btn-legend");
      if (legend) legend.classList.toggle("open", !!on);
      if (btn) {
        btn.classList.toggle("active", !!on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      }
      this.savePrefs({ legendOn: !!on });
    },

    closeDetail() {
      const panel = document.getElementById("detail-panel");
      if (panel) panel.classList.remove("open");
    },

    openDetail(type, title, bodyHtml) {
      const typeEl = document.getElementById("detail-type");
      const titleEl = document.getElementById("detail-title");
      const bodyEl = document.getElementById("detail-body");
      const panel = document.getElementById("detail-panel");
      if (typeEl) typeEl.textContent = type;
      if (titleEl) titleEl.textContent = title;
      if (bodyEl) bodyEl.innerHTML = bodyHtml;
      if (panel) panel.classList.add("open");
      if (this.state.theme === "glass") this.syncLiquidGlass();
    },

    bind() {
      document.querySelectorAll("#map-toolbar [data-dock]").forEach((btn) => {
        btn.addEventListener("click", () => this.toggleDock(btn.dataset.dock));
      });

      const closeDock = document.getElementById("btn-close-dock");
      if (closeDock) closeDock.addEventListener("click", () => this.setDock(this.state.dockPanel, false));

      const legendBtn = document.getElementById("btn-legend");
      if (legendBtn) {
        legendBtn.addEventListener("click", () => {
          const legend = document.getElementById("map-legend");
          this.state.legendExplicit = true;
          this.setLegend(!(legend && legend.classList.contains("open")));
        });
      }

      const themeBtn = document.getElementById("btn-theme");
      if (themeBtn) {
        themeBtn.addEventListener("click", () => {
          const next = this.state.theme === "glass" ? "light" : "glass";
          this.applyTheme(next, true);
        });
      }

      this.FLYOUTS.forEach((item) => {
        const btn = document.getElementById(item.btn);
        if (!btn) return;
        btn.addEventListener("click", () => {
          const menu = document.getElementById(item.menu);
          this.setFlyoutOpen(item.menu, !(menu && menu.classList.contains("open")));
        });
      });

      const closeDetail = document.getElementById("btn-close-detail");
      if (closeDetail) closeDetail.addEventListener("click", () => this.closeDetail());

      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        const detail = document.getElementById("detail-panel");
        if (detail && detail.classList.contains("open")) {
          this.closeDetail();
          return;
        }
        this.closeFlyouts();
        const dock = document.getElementById("dock");
        if (dock && dock.classList.contains("open")) this.setDock(this.state.dockPanel, false);
      });

      window.addEventListener("resize", () => {
        this.FLYOUTS.forEach((item) => {
          const menu = document.getElementById(item.menu);
          const btn = document.getElementById(item.btn);
          if (menu && menu.classList.contains("open") && btn) this.positionFlyout(menu, btn);
        });
      });
    },

    init() {
      this.loadPrefs();
      this.applyTheme(this.state.theme || "glass", false);
      this.bind();
      this.setDock(this.state.dockPanel || "layers", false);
      this.setLegend(!!this.state.legendOn);
      this.syncLabelsToolButton();
    }
  };

  document.addEventListener("DOMContentLoaded", () => MapUI.init());
  global.MapUI = MapUI;
})(window);
