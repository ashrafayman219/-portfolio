(function (global) {
  "use strict";

  const COUNTRY_COLORS = {
    "United States": "#1565A8",
    "United Kingdom": "#012169",
    Egypt: "#C45C26",
    Kuwait: "#6D28D9",
    Malaysia: "#0F766E",
    Nigeria: "#008751"
  };

  const COUNTRY_ORDER = ["United States", "United Kingdom", "Egypt", "Kuwait", "Malaysia", "Nigeria"];

  const COUNTRY_ABBR = {
    "United States": "US",
    "United Kingdom": "UK",
    Egypt: "EG",
    Kuwait: "KW",
    Malaysia: "MY",
    Nigeria: "NG"
  };

  const TILES = {
    gray: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
    ],
    streets: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"],
    satellite: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"]
  };

  const CIRCLE_COLORS = ["#3eb4c6", "#c6a15a", "#1c2838"];
  const TOUR_STEP_MS = 2200;
  const HOME = [31.0409, 31.3785];

  function nearHome(latitude, longitude) {
    const toRad = (degrees) => (degrees * Math.PI) / 180;
    const dLat = toRad(latitude - HOME[0]);
    const dLng = toRad(longitude - HOME[1]);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(HOME[0])) * Math.cos(toRad(latitude)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a))) < 2;
  }

  function routeArc(from, to) {
    const toRad = (degrees) => (degrees * Math.PI) / 180;
    const toDeg = (radians) => (radians * 180) / Math.PI;
    const lat1 = toRad(from[0]);
    const lon1 = toRad(from[1]);
    const lat2 = toRad(to[0]);
    const lon2 = toRad(to[1]);
    const distance = 2 * Math.asin(Math.min(1, Math.sqrt(
      Math.sin((lat2 - lat1) / 2) * Math.sin((lat2 - lat1) / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) * Math.sin((lon2 - lon1) / 2)
    )));
    if (distance < 1e-6) return [from, to];
    const steps = 72;
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const a = Math.sin((1 - f) * distance) / Math.sin(distance);
      const b = Math.sin(f * distance) / Math.sin(distance);
      const x = a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
      const y = a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
      const z = a * Math.sin(lat1) + b * Math.sin(lat2);
      const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
      let lon = Math.atan2(y, x);
      if (points.length) {
        const prev = points[points.length - 1][1];
        let deg = toDeg(lon);
        while (deg - prev > 180) deg -= 360;
        while (prev - deg > 180) deg += 360;
        lon = toRad(deg);
      }
      points.push([toDeg(lat), toDeg(lon)]);
    }
    let destLng = to[1];
    while (destLng - from[1] > 180) destLng -= 360;
    while (from[1] - destLng > 180) destLng += 360;
    const bend = 0.62;
    const dLat = to[0] - from[0];
    const dLng = destLng - from[1];
    return points.map((point, index) => {
      const f = index / steps;
      return [
        from[0] + dLat * f + (point[0] - (from[0] + dLat * f)) * bend,
        from[1] + dLng * f + (point[1] - (from[1] + dLng * f)) * bend
      ];
    });
  }

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
    filterIds: null,
    tourTimer: null,
    touring: false,
    coverageOn: false,
    routesOn: false,
    coverageData: null,
    coverageLayer: null,
    routesLayer: null,

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
        this.coverageOn = !!(global.MapUI && global.MapUI.state.coverageOn);
        this.routesOn = !!(global.MapUI && global.MapUI.state.routesOn);
        this.syncOverlayButtons();
        this.refreshOverlays();
        fetch("data/coverage.geojson")
          .then((response) => (response.ok ? response.json() : null))
          .then((geo) => {
            this.coverageData = geo;
            this.refreshOverlays();
            this.playIntro();
          })
          .catch(() => {
            this.coverageData = null;
            this.playIntro();
          });
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
      return this.features.filter(
        (feature) => this.layerVisible[feature.category] !== false && (!this.filterIds || this.filterIds.has(feature.projectId))
      );
    },

    pinIcon(feature) {
      return L.divIcon({
        className: "goal-pin-icon",
        html:
          '<div class="pin-wave" style="--pin-color:' +
          feature.color +
          '"><span class="pulse"></span><span class="pulse delay"></span><span class="dot"></span></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
    },

    armPageScroll() {
      const map = this.map;
      if (!map) return;
      const touch = window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(max-width: 767px)").matches;
      if (!touch) return;
      const wrap = document.getElementById("map-wrap");
      const wide = window.matchMedia("(orientation: landscape)");
      const full = () => wrap && (document.fullscreenElement === wrap || document.webkitFullscreenElement === wrap);
      const setDrag = () => {
        if (!map.dragging) return;
        if (full() || wide.matches) map.dragging.enable();
        else map.dragging.disable();
      };
      setDrag();
      if (wide.addEventListener) wide.addEventListener("change", setDrag);
      document.addEventListener("fullscreenchange", setDrag);
      document.addEventListener("webkitfullscreenchange", setDrag);
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
        worldCopyJump: false,
        maxBounds: [[-85, -180], [85, 180]],
        maxBoundsViscosity: 1
      });
      this.applyOpeningView(true);

      this.map.createPane("place-labels");
      const labelPane = this.map.getPane("place-labels");
      labelPane.style.zIndex = 350;
      labelPane.style.pointerEvents = "none";

      this.map.createPane("coverage");
      const coveragePane = this.map.getPane("coverage");
      coveragePane.style.zIndex = 250;
      coveragePane.style.pointerEvents = "none";

      this.map.createPane("routes");
      const routesPane = this.map.getPane("routes");
      routesPane.style.zIndex = 450;
      routesPane.style.pointerEvents = "none";

      this.coverageLayer = L.layerGroup().addTo(this.map);
      this.routesLayer = L.layerGroup().addTo(this.map);

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
            iconSize: [40, 40],
            iconAnchor: [20, 20]
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
      this.group.on("spiderfied unspiderfied", () => this.refreshOverlays());
      this.map.on("resize", () => this.applyOpeningView(false));
      this.map.on("dragstart wheel", () => {
        this.mapDragged = true;
      });
      this.armPageScroll();
      this.setBasemap(this.currentBasemap);

      this.map.on("click", () => {
        const panel = document.getElementById("detail-panel");
        const open = this.selectedId || (panel && panel.classList.contains("open"));
        if (!open) return;
        this.goHome();
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

      const container = this.map.getContainer();
      ["pointerdown", "wheel", "touchstart"].forEach((type) => {
        container.addEventListener(type, () => this.stopTour(), { passive: true });
      });

      if ("IntersectionObserver" in window) {
        const wrap = document.getElementById("map-wrap");
        if (wrap) {
          const watcher = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (!entry.isIntersecting) this.stopTour();
              });
            },
            { threshold: 0.2 }
          );
          watcher.observe(wrap);
        }
      }
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
            `<button type="button" class="bookmark-pill" data-country="${escapeHtml(item.country)}" aria-label="${escapeHtml(item.country)}" aria-pressed="false">
              <span class="pill-dot" style="background:${item.color}"></span>
              ${escapeHtml(COUNTRY_ABBR[item.country] || item.country)}
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
      this.refreshOverlays();
    },

    setBasemap(name) {
      if (!this.map) return;
      const urls = TILES[name] || TILES.gray;
      this.currentBasemap = TILES[name] ? name : "gray";
      this.tileLayers.forEach((layer) => this.map.removeLayer(layer));
      this.tileLayers = urls.map((url, index) => {
        const layer = L.tileLayer(url, {
          maxZoom: 13,
          noWrap: true,
          bounds: [[-85, -180], [85, 180]],
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
          offset: [0, -18],
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

    syncOverlayButtons() {
      const coverage = document.getElementById("btn-coverage");
      const routes = document.getElementById("btn-routes");
      if (coverage) {
        coverage.classList.toggle("active", this.coverageOn);
        coverage.setAttribute("aria-pressed", String(this.coverageOn));
      }
      if (routes) {
        routes.classList.toggle("active", this.routesOn);
        routes.setAttribute("aria-pressed", String(this.routesOn));
      }
    },

    setCoverage(on) {
      this.coverageOn = !!on;
      if (global.MapUI) global.MapUI.savePrefs({ coverageOn: this.coverageOn });
      this.syncOverlayButtons();
      this.refreshOverlays();
    },

    setRoutes(on) {
      this.routesOn = !!on;
      if (global.MapUI) global.MapUI.savePrefs({ routesOn: this.routesOn });
      this.syncOverlayButtons();
      this.refreshOverlays();
    },

    refreshOverlays() {
      if (!this.map || !this.coverageLayer || !this.routesLayer) return;
      this.coverageLayer.clearLayers();
      this.routesLayer.clearLayers();
      const features = this.visibleFeatures();

      if (this.coverageOn) {
        const countries = new Set(features.map((feature) => feature.country));
        if (this.coverageData) {
          L.geoJSON(this.coverageData, {
            pane: "coverage",
            interactive: false,
            filter: (feat) => countries.has(feat.properties.country),
            style: (feat) => ({
              stroke: false,
              fillColor: COUNTRY_COLORS[feat.properties.country] || "#1a7a8c",
              fillOpacity: 0.22,
              interactive: false
            })
          }).addTo(this.coverageLayer);
        }
      }

      if (this.routesOn) {
        features.forEach((feature) => {
          const marker = this.byId && this.byId.get(feature.id);
          const at = marker ? marker.getLatLng() : L.latLng(feature.latitude, feature.longitude);
          if (nearHome(at.lat, at.lng)) return;
          L.polyline(routeArc(HOME, [at.lat, at.lng]), {
            pane: "routes",
            className: "route-line",
            smoothFactor: 0,
            color: "#1a7a8c",
            weight: 1.5,
            opacity: 0.85,
            dashArray: "7 9",
            interactive: false
          }).addTo(this.routesLayer);
        });
        const home = L.circleMarker(HOME, {
          pane: "routes",
          radius: 5,
          color: "#fff",
          weight: 2,
          fillColor: "#1a7a8c",
          fillOpacity: 1,
          interactive: false
        });
        home.bindTooltip("Mansoura", {
          permanent: true,
          direction: "top",
          offset: [0, -8],
          className: "pin-label",
          opacity: 1
        });
        home.addTo(this.routesLayer);
      }
    },

    changeZoom(delta) {
      if (!this.map) return;
      if (delta > 0) this.map.zoomIn();
      else this.map.zoomOut();
    },

    bindChrome() {
      const home = document.getElementById("btn-home");
      if (home) home.addEventListener("click", () => this.goHome());

      const coverage = document.getElementById("btn-coverage");
      if (coverage) coverage.addEventListener("click", () => this.setCoverage(!this.coverageOn));

      const routes = document.getElementById("btn-routes");
      if (routes) routes.addEventListener("click", () => this.setRoutes(!this.routesOn));

      const tour = document.getElementById("btn-tour");
      if (tour) {
        tour.addEventListener("click", () => {
          if (this.touring) this.stopTour();
          else this.startTour();
        });
      }

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

    fitCountries(duration) {
      if (!this.map) return;
      const countries = new Set(this.visibleFeatures().map((feature) => feature.country));
      const bounds = L.latLngBounds([]);
      const push = (lng, lat, country) => {
        if (country === "United States" && (lat > 50 || lng < -130 || lng > 170)) return;
        bounds.extend([lat, lng]);
      };
      const walk = (coords, country) => {
        if (!coords) return;
        if (typeof coords[0] === "number") {
          push(coords[0], coords[1], country);
          return;
        }
        coords.forEach((part) => walk(part, country));
      };
      if (this.coverageData && this.coverageData.features) {
        this.coverageData.features.forEach((feat) => {
          const country = feat.properties && feat.properties.country;
          if (!countries.has(country)) return;
          walk(feat.geometry && feat.geometry.coordinates, country);
        });
      }
      if (!bounds.isValid()) {
        this.visibleFeatures().forEach((feature) => bounds.extend([feature.latitude, feature.longitude]));
      }
      if (!bounds.isValid()) return;
      this.map.invalidateSize();
      const ms = typeof duration === "number" ? duration : 0;
      const snap = this.map.options.zoomSnap;
      this.map.options.zoomSnap = 0;
      this.map.fitBounds(bounds, {
        paddingTopLeft: [28, 64],
        paddingBottomRight: [28, 118],
        animate: ms > 0,
        duration: ms / 1000,
        maxZoom: 6
      });
      const restoreSnap = () => {
        if (this.map) this.map.options.zoomSnap = snap == null ? 1 : snap;
      };
      this.map.once("moveend", restoreSnap);
      window.setTimeout(restoreSnap, ms + 80);
    },

    playIntro() {
      if (!this.map || this.mapDragged) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.fitCountries(reduced ? 0 : 800);
    },

    applyOpeningView(resetCenter) {
      if (!this.map) return;
      this.map.setMinZoom(2);
      if (!resetCenter) return;
      this.map.setView([22, 0], 4);
    },

    goHome() {
      if (!this.map) return;
      this.stopTour();
      this.clearSelection();
      this.fitFeatures(this.visibleFeatures(), { duration: 700, maxZoom: 3 });
    },

    goToCountry(country) {
      const features = this.visibleFeatures().filter((feature) => feature.country === country);
      if (!features.length || !this.map) return;
      this.stopTour();
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

      const arrive = () => {
        if (this._tourArrive === arrive) this._tourArrive = null;
        if (this.touring && this.selectedId === id) this.openTourCluster(marker);
        this.syncMarkerState();
      };
      const reveal = () => {
        const shouldMove = this.touring || this.map.getZoom() < 7;
        if (!shouldMove) {
          arrive();
          return;
        }
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) {
          this.map.setView(marker.getLatLng(), 7);
          arrive();
          return;
        }
        if (this._tourArrive) this.map.off("moveend", this._tourArrive);
        this._tourArrive = arrive;
        this.map.once("moveend", arrive);
        const duration = this.touring ? 1.15 : 0.7;
        this.map.flyTo(marker.getLatLng(), 7, { duration: duration });
        if (this.touring) {
          window.setTimeout(() => {
            if (this.touring && this.selectedId === id && !marker._icon) arrive();
          }, duration * 1000 + 120);
        }
      };
      if (this.touring || !this.group.hasLayer(marker)) reveal();
      else this.group.zoomToShowLayer(marker, reveal);

      const facts = [feature.period, feature.subtitle].filter(Boolean).join(" · ");
      const body =
        `<div class="detail-row">
          <p class="detail-meta">${escapeHtml(facts)}</p>
          <button type="button" class="detail-go is-cue" data-open-mapped-project="${escapeHtml(feature.projectId)}" aria-label="Show this project">
            <span>Project</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>`;

      if (global.MapUI) global.MapUI.openDetail(categoryLabel(feature.category), feature.name, body);
    },

    goTo(id) {
      this.stopTour();
      this.onSelect(id);
    },

    applyFilter(ids) {
      this.filterIds = ids;
      this.stopTour();
      this.clearSelection();
      document.querySelectorAll("#project-pills .bookmark-pill").forEach((btn) => {
        const country = btn.getAttribute("data-country");
        btn.hidden = !this.visibleFeatures().some((feature) => feature.country === country);
      });
      this.refreshMarkers();
      this.syncMarkerState();
      this.rebuildLabels();
      this.renderList();
      this.renderSearchHits(this.visibleFeatures());
      this.updateStatusCounts();
      this.refreshOverlays();
      this.fitFeatures(this.visibleFeatures(), { duration: 700, maxZoom: 5 });
    },

    openTourCluster(marker) {
      if (!this.group || !marker || marker._icon) return;
      const open = () => {
        if (!this.touring || marker._icon) return;
        if (this.group._inZoomAnimation) {
          this.group.once("animationend", open);
          return;
        }
        let cluster = marker.__parent;
        while (cluster && !cluster._icon && cluster.__parent) cluster = cluster.__parent;
        if (cluster && cluster._icon && typeof cluster.spiderfy === "function") {
          cluster.spiderfy();
          this.syncMarkerState();
        }
      };
      open();
    },

    tourOrder() {
      return this.visibleFeatures()
        .slice()
        .sort((a, b) => Number(b.period) - Number(a.period));
    },

    startTour() {
      const list = this.tourOrder();
      if (!list.length || !this.map) return;
      this.touring = true;
      this.syncTourButton();
      let index = 0;
      const step = () => {
        if (!this.touring) return;
        if (this.group && typeof this.group.unspiderfy === "function") this.group.unspiderfy();
        this.onSelect(list[index].id);
        index = (index + 1) % list.length;
        this.tourTimer = window.setTimeout(step, TOUR_STEP_MS);
      };
      step();
    },

    stopTour() {
      if (!this.touring) return;
      this.touring = false;
      if (this.tourTimer) window.clearTimeout(this.tourTimer);
      this.tourTimer = null;
      this.syncTourButton();
    },

    syncTourButton() {
      const btn = document.getElementById("btn-tour");
      const label = document.getElementById("tourLabel");
      if (btn) {
        btn.classList.toggle("active", this.touring);
        btn.setAttribute("aria-pressed", String(this.touring));
      }
      if (label) label.textContent = this.touring ? "Stop" : "Tour";
    }
  };

  document.addEventListener("portfolio:goto", (event) => {
    GISMap.goTo(event.detail.id);
  });

  document.addEventListener("portfolio:filter", (event) => {
    const ids = event.detail && event.detail.ids;
    GISMap.applyFilter(ids ? new Set(ids) : null);
  });

  global.GISMap = GISMap;
})(window);
