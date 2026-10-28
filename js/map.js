(function (global) {
  "use strict";

  const COUNTRY_COLORS = {
    "United States": "#1565A8",
    "United Kingdom": "#012169",
    Egypt: "#C45C26",
    Kuwait: "#6D28D9"
  };

  const COUNTRY_ORDER = ["United States", "United Kingdom", "Egypt", "Kuwait"];

  const TILES = {
    gray: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
    ],
    streets: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"],
    satellite: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"]
  };

  const CIRCLE_COLORS = ["#3eb4c6", "#c6a15a", "#1c2838"];

  function collectFeatures(data) {
    return (data.projects || []).map((project, index) => ({
      id: "project-" + project.id,
      projectId: project.id,
      name: project.title,
      mapLabel: project.mapLabel || project.title,
      subtitle: project.company,
      category: project.category || "professional",
      period: String(project.year),
      country: (project.location && project.location.country) || "Unknown",
      latitude: project.location.latitude,
      longitude: project.location.longitude,
      color: CIRCLE_COLORS[index % CIRCLE_COLORS.length]
    }));
  }

  function categoryLabel(category) {
    return category === "academic" ? "Academic" : "Professional";
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  const GISMap = {
    map: null,
    group: null,
    features: [],
    byId: null,
    tileLayers: [],
    currentBasemap: "gray",
    layerVisible: { professional: true, academic: true },
    selectedId: null,
    selectedCountry: null,

    async init(data) {
      this.features = collectFeatures(data);
      this.renderList(this.features);
      this.renderSearchHits(this.features);
      this.renderPills();
      this.bindSearch();
      this.updateStatusCounts();

      try {
        this.createMap();
        this.bindChrome();
        this.setLabelMode((global.MapUI && global.MapUI.state.labelMode) || "off");
        this.playIntro();
      } catch (error) {
        console.error(error);
        this.showError("The map could not load. Check your connection and try again.");
      }
    },

    showError(message) {
      const view = document.getElementById("mapView");
      if (!view || view.querySelector(".map-error")) return;
      const el = document.createElement("div");
      el.className = "map-error";
      el.textContent = message;
      view.appendChild(el);
    },

    visibleFeatures() {
      return this.features.filter((feature) => this.layerVisible[feature.category] !== false);
    },

    pinIcon(feature) {
      return L.divIcon({
        className: "goal-pin-icon",
        html:
          '<div class="pin-wave" style="--pin-color:' +
          feature.color +
          '"><span class="pulse"></span><span class="pulse delay"></span><span class="dot"></span></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
    },

    createMap() {
      if (typeof L === "undefined" || typeof L.markerClusterGroup !== "function") {
        throw new Error("Leaflet did not load");
      }

      const mapApi = this;
      this.map = L.map("mapView", {
        zoomControl: false,
        scrollWheelZoom: true,
        minZoom: 2,
        maxZoom: 13,
        worldCopyJump: true
      }).setView([28, -62], 2);

      this.map.createPane("place-labels");
      const labelPane = this.map.getPane("place-labels");
      labelPane.style.zIndex = 350;
      labelPane.style.pointerEvents = "none";

      this.group = L.markerClusterGroup({
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 54,
        spiderLegPolylineOptions: { weight: 1.5, color: "#8b95a1", opacity: 0.9 },
        spiderfyDistanceMultiplier: 1,
        spiderfyShapePositions: function (count, center) {
          const reach = count === 2 ? 58 : Math.min(84, 42 + count * 7);
          const start = count === 2 ? 0 : -Math.PI / 2;
          const step = (Math.PI * 2) / count;
          const points = [];
          for (let i = 0; i < count; i++) {
            const angle = start + i * step;
            points.push(L.point(center.x + Math.cos(angle) * reach, center.y + Math.sin(angle) * reach));
          }
          return points;
        },
        iconCreateFunction: function (cluster) {
          const count = cluster.getChildCount();
          const selected = cluster.getAllChildMarkers().some((marker) => marker.feature && marker.feature.id === mapApi.selectedId);
          return L.divIcon({
            className: "map-cluster-icon" + (selected ? " is-selected" : ""),
            html: '<div class="cluster-bubble"><span class="cluster-count">' + count + "</span></div>",
            iconSize: [46, 46],
            iconAnchor: [23, 23]
          });
        }
      });

      this.byId = new Map();
      this.features.forEach((feature) => {
        const marker = L.marker([feature.latitude, feature.longitude], {
          icon: this.pinIcon(feature),
          title: feature.mapLabel
        });
        marker.feature = feature;
        marker.on("click", (event) => {
          L.DomEvent.stopPropagation(event);
          this.onSelect(feature.id);
        });
        this.byId.set(feature.id, marker);
      });

      this.refreshMarkers();
      this.map.addLayer(this.group);
      this.setBasemap(this.currentBasemap);

      this.map.on("click", () => {
        this.selectedId = null;
        this.selectedCountry = null;
        this.syncPills(null);
        this.syncMarkerState();
        document.querySelectorAll("#locationList button").forEach((btn) => btn.classList.remove("is-active"));
        if (global.MapUI) global.MapUI.closeDetail();
      });

      this.map.on("mousemove", (event) => {
        const el = document.getElementById("stat-coords");
        if (!el) return;
        el.textContent = event.latlng.lng.toFixed(2) + ", " + event.latlng.lat.toFixed(2);
      });

      this.map.on("zoom", () => {
        const el = document.getElementById("stat-zoom");
        if (el) el.textContent = this.map.getZoom().toFixed(1);
      });

      window.addEventListener("resize", () => this.map.invalidateSize());
    },

    refreshMarkers() {
      if (!this.group) return;
      this.group.clearLayers();
      this.visibleFeatures().forEach((feature) => {
        const marker = this.byId.get(feature.id);
        if (marker) this.group.addLayer(marker);
      });
    },

    syncMarkerState() {
      if (!this.byId) return;
      this.byId.forEach((marker, id) => {
        const icon = marker.getElement();
        if (icon) icon.classList.toggle("is-selected", id === this.selectedId);
      });
      if (this.group) this.group.refreshClusters();
    },

    renderList(features) {
      const list = document.getElementById("locationList");
      if (!list) return;
      const rows = features || this.visibleFeatures();
      list.innerHTML = rows
        .map(
          (feature) => `
          <li>
            <button type="button" data-loc="${feature.id}">
              ${escapeHtml(feature.mapLabel)}
              <small>${categoryLabel(feature.category)} · ${escapeHtml(feature.period)}</small>
            </button>
          </li>`
        )
        .join("");
      list.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => this.goTo(button.getAttribute("data-loc")));
      });
    },

    renderPills() {
      const root = document.getElementById("project-pills");
      if (!root) return;
      const countries = [];
      this.features.forEach((feature) => {
        if (!countries.some((item) => item.country === feature.country)) {
          countries.push({
            country: feature.country,
            color: COUNTRY_COLORS[feature.country] || feature.color
          });
        }
      });
      countries.sort((a, b) => {
        const ia = COUNTRY_ORDER.indexOf(a.country);
        const ib = COUNTRY_ORDER.indexOf(b.country);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
      root.innerHTML = countries
        .map(
          (item) =>
            `<button type="button" class="bookmark-pill" data-country="${escapeHtml(item.country)}" aria-pressed="false">
              <span class="pill-dot" style="background:${item.color}"></span>
              ${escapeHtml(item.country)}
            </button>`
        )
        .join("");
      root.querySelectorAll("[data-country]").forEach((btn) => {
        btn.addEventListener("click", () => this.goToCountry(btn.getAttribute("data-country")));
      });
      if (global.MapUI && global.MapUI.state.theme === "glass") global.MapUI.syncLiquidGlass();
    },

    syncPills(country) {
      document.querySelectorAll("#project-pills .bookmark-pill").forEach((btn) => {
        const on = btn.getAttribute("data-country") === country;
        btn.classList.toggle("active", on);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
    },

    bindSearch() {
      const dockInput = document.getElementById("locationSearch");
      const flyInput = document.getElementById("search-input");
      const onQuery = (value) => {
        const q = String(value || "").trim().toLowerCase();
        const pool = this.visibleFeatures();
        const next = pool.filter((feature) => {
          return (
            feature.name.toLowerCase().includes(q) ||
            feature.mapLabel.toLowerCase().includes(q) ||
            feature.subtitle.toLowerCase().includes(q) ||
            feature.category.toLowerCase().includes(q) ||
            feature.country.toLowerCase().includes(q) ||
            String(feature.period).toLowerCase().includes(q)
          );
        });
        this.renderList(q ? next : pool);
        this.renderSearchHits(q ? next : pool);
        if (q && next.length === 1) this.goTo(next[0].id);
      };
      if (dockInput) dockInput.addEventListener("input", () => onQuery(dockInput.value));
      if (flyInput) {
        flyInput.addEventListener("input", () => {
          onQuery(flyInput.value);
          if (dockInput) dockInput.value = flyInput.value;
        });
      }
    },

    renderSearchHits(features) {
      const root = document.getElementById("search-results");
      if (!root) return;
      root.innerHTML = (features || [])
        .map(
          (feature) =>
            `<button type="button" class="search-hit" data-loc="${feature.id}">
              <span>${escapeHtml(feature.mapLabel)}</span>
              <span class="hit-kind">${categoryLabel(feature.category)}</span>
            </button>`
        )
        .join("");
      root.querySelectorAll("[data-loc]").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.goTo(btn.getAttribute("data-loc"));
          if (global.MapUI) global.MapUI.closeFlyouts();
        });
      });
    },

    updateStatusCounts() {
      const el = document.getElementById("stat-project");
      if (el) el.textContent = String(this.visibleFeatures().length);
    },

    setLayerVisible(category, on) {
      this.layerVisible[category] = !!on;
      document.querySelectorAll("#project-pills .bookmark-pill").forEach((btn) => {
        const country = btn.getAttribute("data-country");
        btn.hidden = !this.visibleFeatures().some((feature) => feature.country === country);
      });
      this.refreshMarkers();
      this.syncMarkerState();
      this.rebuildLabels();
      this.renderList();
      this.updateStatusCounts();
    },

    setBasemap(name) {
      if (!this.map) return;
      const urls = TILES[name] || TILES.gray;
      this.currentBasemap = TILES[name] ? name : "gray";
      this.tileLayers.forEach((layer) => this.map.removeLayer(layer));
      this.tileLayers = urls.map((url, index) => {
        const layer = L.tileLayer(url, {
          maxZoom: 13,
          attribution: index === 0 ? "Tiles &copy; Esri" : "",
          pane: index === 1 ? "place-labels" : "tilePane"
        });
        layer.addTo(this.map);
        return layer;
      });
      const wrap = document.getElementById("map-wrap");
      if (wrap) wrap.setAttribute("data-basemap", this.currentBasemap);
      document.querySelectorAll("#basemap-menu [data-basemap]").forEach((item) => {
        item.classList.toggle("active", item.getAttribute("data-basemap") === this.currentBasemap);
      });
    },

    rebuildLabels() {
      if (!this.byId) return;
      const mode = (global.MapUI && global.MapUI.state.labelMode) || "off";
      this.byId.forEach((marker) => {
        if (marker.getTooltip()) marker.unbindTooltip();
        if (mode !== "name" || !marker.feature) return;
        marker.bindTooltip(escapeHtml(marker.feature.mapLabel), {
          permanent: true,
          direction: "top",
          offset: [0, -14],
          className: "pin-label",
          opacity: 1
        });
      });
    },

    setLabelMode(mode) {
      if (global.MapUI) {
        global.MapUI.savePrefs({ labelMode: mode === "name" ? "name" : "off" });
        global.MapUI.syncLabelsToolButton();
      }
      document.querySelectorAll("#labels-menu [data-labels]").forEach((item) => {
        item.classList.toggle("active", item.getAttribute("data-labels") === (mode === "name" ? "name" : "off"));
      });
      this.rebuildLabels();
    },

    changeZoom(delta) {
      if (!this.map) return;
      if (delta > 0) this.map.zoomIn();
      else this.map.zoomOut();
    },

    bindChrome() {
      const home = document.getElementById("btn-home");
      if (home) home.addEventListener("click", () => this.goHome());

      const zoomIn = document.getElementById("btn-zoom-in");
      if (zoomIn) zoomIn.addEventListener("click", () => this.changeZoom(1));

      const zoomOut = document.getElementById("btn-zoom-out");
      if (zoomOut) zoomOut.addEventListener("click", () => this.changeZoom(-1));

      const full = document.getElementById("btn-fullscreen");
      const wrap = document.getElementById("map-wrap");
      if (full && wrap) {
        full.addEventListener("click", () => {
          if (document.fullscreenElement === wrap || document.webkitFullscreenElement === wrap) {
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            return;
          }
          const request = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
          if (!request) return;
          const result = request.call(wrap);
          if (result && typeof result.catch === "function") result.catch(() => {});
        });
        const onFull = () => {
          const on = document.fullscreenElement === wrap || document.webkitFullscreenElement === wrap;
          document.body.classList.toggle("map-fullscreen", on);
          full.classList.toggle("active", on);
          if (this.map) this.map.invalidateSize();
        };
        document.addEventListener("fullscreenchange", onFull);
        document.addEventListener("webkitfullscreenchange", onFull);
      }

      document.querySelectorAll("#basemap-menu [data-basemap]").forEach((item) => {
        item.addEventListener("click", () => {
          this.setBasemap(item.getAttribute("data-basemap"));
          if (global.MapUI) global.MapUI.closeFlyouts();
        });
      });

      document.querySelectorAll("#labels-menu [data-labels]").forEach((item) => {
        item.addEventListener("click", () => {
          this.setLabelMode(item.getAttribute("data-labels"));
          if (global.MapUI) global.MapUI.closeFlyouts();
        });
      });

      document.querySelectorAll("#panel-layers [data-layer]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const type = btn.getAttribute("data-layer");
          const next = !btn.classList.contains("active");
          btn.classList.toggle("active", next);
          this.setLayerVisible(type, next);
        });
      });

      const detailBody = document.getElementById("detail-body");
      if (detailBody) {
        detailBody.addEventListener("click", (event) => {
          const action = event.target.closest("[data-open-mapped-project]");
          if (!action) return;
          const projectId = action.getAttribute("data-open-mapped-project");
          if (global.PortfolioUI) global.PortfolioUI.highlightProject(projectId, { scroll: true });
          const projects = document.getElementById("projects");
          if (projects) projects.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    },

    fitFeatures(features, options) {
      if (!this.map || !features || !features.length) return;
      const bounds = L.latLngBounds(features.map((feature) => [feature.latitude, feature.longitude]));
      const duration = options && typeof options.duration === "number" ? options.duration : 1000;
      this.map.fitBounds(bounds, {
        padding: [64, 64],
        maxZoom: options && options.maxZoom ? options.maxZoom : 3,
        animate: duration > 0,
        duration: duration / 1000
      });
    },

    clearSelection() {
      this.selectedId = null;
      this.selectedCountry = null;
      this.syncPills(null);
      this.syncMarkerState();
      document.querySelectorAll("#locationList button").forEach((btn) => btn.classList.remove("is-active"));
      if (this.group && typeof this.group.unspiderfy === "function") this.group.unspiderfy();
      if (global.MapUI) global.MapUI.closeDetail();
    },

    playIntro() {
      if (!this.map) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.fitFeatures(this.visibleFeatures(), { duration: reduced ? 0 : 900, maxZoom: 3 });
    },

    goHome() {
      if (!this.map) return;
      this.clearSelection();
      this.fitFeatures(this.visibleFeatures(), { duration: 700, maxZoom: 3 });
    },

    goToCountry(country) {
      const features = this.visibleFeatures().filter((feature) => feature.country === country);
      if (!features.length || !this.map) return;
      this.selectedId = null;
      this.selectedCountry = country;
      this.syncPills(country);
      this.syncMarkerState();
      if (this.group && typeof this.group.unspiderfy === "function") this.group.unspiderfy();
      if (global.MapUI) global.MapUI.closeDetail();
      this.fitFeatures(features, { duration: 800, maxZoom: 6 });
    },

    onSelect(id) {
      const feature = this.features.find((item) => item.id === id);
      const marker = this.byId && this.byId.get(id);
      if (!feature || !marker || !this.map) return;
      this.selectedId = id;
      this.selectedCountry = feature.country;
      this.syncPills(feature.country);
      this.syncMarkerState();

      document.querySelectorAll("#locationList button").forEach((btn) => {
        btn.classList.toggle("is-active", btn.getAttribute("data-loc") === id);
      });

      const reveal = () => {
        if (this.map.getZoom() < 7) this.map.flyTo(marker.getLatLng(), 7, { duration: 0.7 });
        this.syncMarkerState();
      };
      if (this.group.hasLayer(marker)) this.group.zoomToShowLayer(marker, reveal);
      else reveal();

      const body =
        `<div class="map-stat-grid">
          <div class="map-stat"><div class="k">Type</div><div class="v">${categoryLabel(feature.category)}</div></div>
          <div class="map-stat"><div class="k">When</div><div class="v">${escapeHtml(feature.period)}</div></div>
        </div>
        <p>${escapeHtml(feature.subtitle)}</p>
        <button type="button" class="detail-action" data-open-mapped-project="${escapeHtml(feature.projectId)}">Open project</button>`;

      if (global.MapUI) global.MapUI.openDetail(categoryLabel(feature.category), feature.name, body);
    },

    goTo(id) {
      this.onSelect(id);
    }
  };

  document.addEventListener("portfolio:goto", (event) => {
    GISMap.goTo(event.detail.id);
  });

  global.GISMap = GISMap;
})(window);
