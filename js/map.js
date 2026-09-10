(function (global) {
  "use strict";

  const PIN_COLORS = {
    "od-travel-time-matrix": "#1B2A4A",
    "ameriwater-territory-map": "#1565A8",
    "gt-agroptics": "#15803D",
    "cop27-sharm": "#0E7490",
    "pinastra-kuwait-map": "#6D28D9",
    "geoai-valdosta-parking": "#C026D3",
    "geoai-bloomington-vehicles": "#0D9488",
    "uk-neighbourhood-centres": "#C2410C",
    "nyc-virtual-tour": "#2563EB",
    "aic-land-annotation": "#1D4ED8",
    "geowarehouse-solutions": "#2F4A6D"
  };

  const COUNTRY_COLORS = {
    "United States": "#1565A8",
    "United Kingdom": "#012169",
    Egypt: "#C45C26",
    Kuwait: "#6D28D9"
  };

  const COUNTRY_ORDER = ["United States", "United Kingdom", "Egypt", "Kuwait"];

  const SPACE_CAMERA = {
    position: { longitude: -62, latitude: 28, z: 15000000 },
    heading: 0,
    tilt: 8
  };

  const HOME_CAMERA = SPACE_CAMERA;

  function offsetOverlaps(features) {
    const groups = new Map();
    features.forEach((feature) => {
      const key = feature.latitude.toFixed(3) + "," + feature.longitude.toFixed(3);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(feature);
    });
    groups.forEach((items) => {
      if (items.length < 2) return;
      items.forEach((item, index) => {
        const angle = (Math.PI * 2 * index) / items.length;
        const radius = 0.8;
        item.latitude += radius * Math.cos(angle);
        item.longitude += (radius * Math.sin(angle)) / Math.cos((item.latitude * Math.PI) / 180);
      });
    });
    return features;
  }

  function collectFeatures(data) {
    return offsetOverlaps(
      (data.projects || []).map((project, index) => ({
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
        color: PIN_COLORS[project.id] || "#1A7A8C",
        phase: index * 0.9
      }))
    );
  }

  function loadModule(name) {
    return new Promise((resolve, reject) => {
      if (typeof require !== "function") {
        reject(new Error("ArcGIS API did not load"));
        return;
      }
      require([name], resolve, reject);
    });
  }

  function categoryLabel(category) {
    return category === "academic" ? "Academic" : "Professional";
  }

  const GISMap = {
    view: null,
    map: null,
    graphics: null,
    labelsLayer: null,
    features: [],
    modules: null,
    currentBasemap: "satellite",
    layerVisible: { professional: true, academic: true },
    selectedId: null,
    selectedCountry: null,
    pinEls: null,
    pinSyncRaf: null,

    async init(data) {
      this.features = collectFeatures(data);
      this.renderList(this.features);
      this.renderSearchHits(this.features);
      this.renderPills();
      this.bindSearch();
      this.updateStatusCounts();

      try {
        await this.createMap();
        this.addMarkers();
        this.addGoalPins();
        this.bindPinSync();
        this.bindChrome();
        this.setLabelMode((global.MapUI && global.MapUI.state.labelMode) || "off");
        this.playIntro();
      } catch (error) {
        console.error(error);
        this.showError("The map could not load. Check your connection and try again.");
      }
    },

    keepPageFocus() {
      const root = this.view && this.view.container;
      if (!root) return;
      const blurIfMapHoldsFocus = () => {
        if (root.contains(document.activeElement)) document.activeElement.blur();
      };
      blurIfMapHoldsFocus();
      requestAnimationFrame(blurIfMapHoldsFocus);
      setTimeout(blurIfMapHoldsFocus, 50);
      setTimeout(blurIfMapHoldsFocus, 250);
      const surface = root.querySelector(".esri-view-surface");
      if (surface) surface.setAttribute("tabindex", "-1");
    },

    showError(message) {
      const host = document.getElementById("map-wrap") || document.getElementById("mapView");
      const box = document.createElement("div");
      box.className = "map-error";
      box.textContent = message;
      host.appendChild(box);
    },

    visibleFeatures() {
      return this.features.filter((feature) => this.layerVisible[feature.category] !== false);
    },

    pinSymbol() {
      const { PointSymbol3D, IconSymbol3DLayer } = this.modules;
      return new PointSymbol3D({
        symbolLayers: [
          new IconSymbol3DLayer({
            resource: { primitive: "circle" },
            material: { color: [0, 0, 0, 0] },
            size: 10
          })
        ]
      });
    },

    facingCamera(longitude, latitude) {
      if (!this.view || !this.view.camera || !this.view.camera.position) return true;
      const cam = this.view.camera.position;
      const lat1 = (latitude * Math.PI) / 180;
      const lon1 = (longitude * Math.PI) / 180;
      const lat2 = (cam.latitude * Math.PI) / 180;
      const lon2 = (cam.longitude * Math.PI) / 180;
      return Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2) > 0.12;
    },

    addGoalPins() {
      const root = document.getElementById("map-pins");
      if (!root) return;
      root.innerHTML = "";
      this.pinEls = new Map();
      this.features.forEach((feature) => {
        const delay = ((feature.phase || 0) * 0.08).toFixed(2) + "s";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "goal-pin";
        btn.setAttribute("data-id", feature.id);
        btn.setAttribute("aria-label", feature.mapLabel);
        btn.title = feature.mapLabel;
        btn.style.setProperty("--pin-color", feature.color);

        const mark = document.createElement("span");
        mark.className = "goal-mark";
        mark.setAttribute("aria-hidden", "true");
        mark.style.animationDelay = delay;

        const shadow = document.createElement("span");
        shadow.className = "goal-shadow";
        shadow.setAttribute("aria-hidden", "true");
        shadow.style.animationDelay = delay;

        btn.appendChild(mark);
        btn.appendChild(shadow);
        btn.addEventListener("click", (event) => {
          event.stopPropagation();
          this.onSelect(feature.id);
        });
        root.appendChild(btn);
        this.pinEls.set(feature.id, btn);
      });
      this.syncGoalPinState();
      this.syncPinPositions();
    },

    bindPinSync() {
      if (!this.view) return;
      const { reactiveUtils } = this.modules;
      if (reactiveUtils) {
        reactiveUtils.watch(() => this.view.camera, () => this.schedulePinSync());
        reactiveUtils.watch(() => this.view.stationary, () => this.syncPinPositions());
      }
      this.view.on("resize", () => this.syncPinPositions());
    },

    schedulePinSync() {
      if (this.pinSyncRaf) return;
      this.pinSyncRaf = requestAnimationFrame(() => {
        this.pinSyncRaf = null;
        this.syncPinPositions();
      });
    },

    syncPinPositions() {
      if (!this.view || !this.pinEls || !this.modules) return;
      const { Point } = this.modules;
      const pad = 48;
      this.features.forEach((feature) => {
        const el = this.pinEls.get(feature.id);
        if (!el) return;
        const layerOn = this.layerVisible[feature.category] !== false;
        if (!layerOn) {
          el.style.display = "none";
          return;
        }
        const point = new Point({ longitude: feature.longitude, latitude: feature.latitude });
        const screen = this.view.toScreen(point);
        const facing = this.facingCamera(feature.longitude, feature.latitude);
        const onScreen =
          screen &&
          screen.x >= -pad &&
          screen.y >= -pad &&
          screen.x <= this.view.width + pad &&
          screen.y <= this.view.height + pad;
        if (!screen || !facing || !onScreen) {
          el.style.display = "none";
          return;
        }
        el.style.display = "";
        el.style.left = screen.x + "px";
        el.style.top = screen.y + "px";
      });
    },

    syncGoalPinState() {
      if (!this.pinEls) return;
      this.pinEls.forEach((el, id) => {
        const feature = this.features.find((item) => item.id === id);
        const selected = this.selectedId === id;
        const focus = !this.selectedId && !!this.selectedCountry && feature && feature.country === this.selectedCountry;
        el.classList.toggle("is-selected", selected);
        el.classList.toggle("is-focus", !!focus);
      });
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
              ${feature.mapLabel}
              <small>${categoryLabel(feature.category)} · ${feature.period}</small>
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
            `<button type="button" class="bookmark-pill" data-country="${item.country}" aria-pressed="false">
              <span class="pill-dot" style="background:${item.color}"></span>
              ${item.country}
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
              <span>${feature.mapLabel}</span>
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
      if (this.graphics) {
        this.graphics.graphics.forEach((graphic) => {
          if (graphic.attributes && graphic.attributes.category === category) graphic.visible = !!on;
        });
      }
      document.querySelectorAll("#project-pills .bookmark-pill").forEach((btn) => {
        const country = btn.getAttribute("data-country");
        btn.hidden = !this.visibleFeatures().some((feature) => feature.country === country);
      });
      this.syncGoalPinState();
      this.syncPinPositions();
      this.rebuildLabels();
      this.renderList();
      this.updateStatusCounts();
    },

    async createMap() {
      const [
        esriConfig,
        Map,
        SceneView,
        GraphicsLayer,
        Graphic,
        Point,
        PointSymbol3D,
        IconSymbol3DLayer,
        TextSymbol3DLayer,
        Extent,
        reactiveUtils
      ] = await Promise.all([
        loadModule("esri/config"),
        loadModule("esri/Map"),
        loadModule("esri/views/SceneView"),
        loadModule("esri/layers/GraphicsLayer"),
        loadModule("esri/Graphic"),
        loadModule("esri/geometry/Point"),
        loadModule("esri/symbols/PointSymbol3D"),
        loadModule("esri/symbols/IconSymbol3DLayer"),
        loadModule("esri/symbols/TextSymbol3DLayer"),
        loadModule("esri/geometry/Extent"),
        loadModule("esri/core/reactiveUtils")
      ]);

      const key = (global.PORTFOLIO_CONFIG && global.PORTFOLIO_CONFIG.arcgisApiKey) || "";
      if (key) esriConfig.apiKey = key;

      this.modules = { Map, SceneView, GraphicsLayer, Graphic, Point, PointSymbol3D, IconSymbol3DLayer, TextSymbol3DLayer, Extent, reactiveUtils };

      this.graphics = new GraphicsLayer({ title: "Projects", elevationInfo: { mode: "relative-to-ground" } });
      this.labelsLayer = new GraphicsLayer({ title: "Labels", elevationInfo: { mode: "relative-to-ground" } });
      this.map = new Map({
        basemap: "satellite",
        ground: "world-elevation",
        layers: [this.graphics, this.labelsLayer]
      });

      this.view = new SceneView({
        container: "mapView",
        map: this.map,
        camera: SPACE_CAMERA,
        ui: { components: ["attribution"] },
        popupEnabled: false
      });

      await this.view.when();
      this.keepPageFocus();
      this.bindMapScrollLock();

      this.view.on("click", async (event) => {
        const hit = await this.view.hitTest(event, { include: this.graphics });
        const graphic = hit.results.map((r) => r.graphic).find((g) => g && g.attributes && g.attributes.id);
        if (graphic) this.onSelect(graphic.attributes.id);
        else if (global.MapUI) {
          global.MapUI.closeDetail();
          this.selectedId = null;
          this.selectedCountry = null;
          this.syncPills(null);
          this.syncGoalPinState();
        }
      });

      this.view.on("pointer-move", (event) => {
        const point = this.view.toMap({ x: event.x, y: event.y });
        const el = document.getElementById("stat-coords");
        if (!el || !point) return;
        el.textContent = point.longitude.toFixed(2) + ", " + point.latitude.toFixed(2);
      });

      if (reactiveUtils) {
        reactiveUtils.watch(
          () => this.view.zoom,
          (zoom) => {
            const el = document.getElementById("stat-zoom");
            if (el && typeof zoom === "number") el.textContent = zoom.toFixed(1);
          }
        );
      }
    },

    bindMapScrollLock() {
      const wrap = document.getElementById("map-wrap");
      if (!wrap) return;
      const chrome = "#dock, #detail-panel, .flyout, #map-legend, #map-toolbar, #status-bar, #project-pills";
      wrap.addEventListener(
        "wheel",
        (event) => {
          if (event.target.closest(chrome)) return;
          event.preventDefault();
          if (event.target.closest("#map-pins")) this.zoomByWheel(event);
        },
        { passive: false, capture: true }
      );
    },

    zoomByWheel(event) {
      if (!this.view) return;
      const zoom = this.view.zoom;
      if (typeof zoom === "number" && isFinite(zoom)) {
        const next = zoom - event.deltaY * 0.008;
        this.view.goTo({ zoom: next }, { duration: 0 }).catch(() => {});
        return;
      }
      const cam = this.view.camera && this.view.camera.clone();
      if (!cam) return;
      const factor = event.deltaY > 0 ? 1.08 : 0.92;
      cam.position.z = Math.max(800, Math.min(4e7, cam.position.z * factor));
      this.view.goTo(cam, { duration: 0 }).catch(() => {});
    },

    setBasemap(name) {
      if (!this.map) return;
      this.currentBasemap = name;
      document.querySelectorAll("#basemap-menu [data-basemap]").forEach((item) => {
        item.classList.toggle("active", item.getAttribute("data-basemap") === name);
      });
      const ids = { gray: "gray-vector", streets: "streets-vector", satellite: "satellite" };
      this.map.basemap = ids[name] || "satellite";
    },

    addMarkers() {
      const { Graphic, Point } = this.modules;
      this.features.forEach((feature) => {
        const graphic = new Graphic({
          geometry: new Point({ longitude: feature.longitude, latitude: feature.latitude }),
          symbol: this.pinSymbol(),
          attributes: feature,
          visible: this.layerVisible[feature.category] !== false
        });
        this.graphics.add(graphic);
      });
    },

    rebuildLabels() {
      if (!this.labelsLayer || !this.modules) return;
      this.labelsLayer.removeAll();
      const mode = (global.MapUI && global.MapUI.state.labelMode) || "off";
      if (mode !== "name") return;
      const { Graphic, Point, PointSymbol3D, TextSymbol3DLayer } = this.modules;
      this.visibleFeatures().forEach((feature) => {
        this.labelsLayer.add(
          new Graphic({
            geometry: new Point({ longitude: feature.longitude, latitude: feature.latitude }),
            symbol: new PointSymbol3D({
              symbolLayers: [
                new TextSymbol3DLayer({
                  text: feature.mapLabel,
                  material: { color: "#ffffff" },
                  halo: { color: [20, 32, 56, 0.9], size: 1.2 },
                  font: { size: 11, family: "Noto Sans", weight: "bold" },
                  size: 12
                })
              ],
              verticalOffset: { screenLength: 44, maxWorldLength: 140000, minWorldLength: 8000 }
            })
          })
        );
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
      if (!this.view) return;
      const zoom = this.view.zoom;
      if (typeof zoom === "number" && isFinite(zoom)) {
        this.view.goTo({ zoom: zoom + delta }, { duration: 400 }).catch(() => {});
        return;
      }
      const cam = this.view.camera.clone();
      cam.position.z = Math.max(400000, cam.position.z * (delta > 0 ? 0.6 : 1.6));
      this.view.goTo(cam, { duration: 400 }).catch(() => {});
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
          requestAnimationFrame(() => this.syncPinPositions());
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
          if (global.PortfolioUI) {
            global.PortfolioUI.highlightProject(projectId, { scroll: true });
          }
          const projects = document.getElementById("projects");
          if (projects) projects.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    },

    extentForFeatures(features) {
      const items = features || [];
      if (!items.length || !this.modules || !this.modules.Extent) return null;
      const lons = items.map((item) => item.longitude);
      const lats = items.map((item) => item.latitude);
      const xmin = Math.min.apply(null, lons);
      const xmax = Math.max.apply(null, lons);
      const ymin = Math.min.apply(null, lats);
      const ymax = Math.max.apply(null, lats);
      const padLon = Math.min(8, Math.max(0.45, (xmax - xmin) * 0.12));
      const padLat = Math.min(6, Math.max(0.45, (ymax - ymin) * 0.12));
      return new this.modules.Extent({
        xmin: xmin - padLon,
        ymin: ymin - padLat,
        xmax: xmax + padLon,
        ymax: ymax + padLat,
        spatialReference: { wkid: 4326 }
      });
    },

    countryExtent(country) {
      return this.extentForFeatures(this.visibleFeatures().filter((feature) => feature.country === country));
    },

    flyToExtent(extent, duration) {
      if (!extent || !this.view) return;
      this.view.goTo({ target: extent, tilt: 12, heading: 0 }, { duration: duration }).catch(() => {});
    },

    goToProjects(options) {
      const extent = this.extentForFeatures(this.visibleFeatures());
      if (!extent) return;
      this.selectedId = null;
      this.selectedCountry = null;
      this.syncPills(null);
      this.syncGoalPinState();
      if (global.MapUI) global.MapUI.closeDetail();
      const duration = options && typeof options.duration === "number" ? options.duration : 1100;
      this.view.goTo({ target: extent, zoom: 2.9, tilt: 12, heading: 0 }, { duration: duration }).catch(() => {});
    },

    playIntro() {
      if (!this.view) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        this.goToProjects({ duration: 0 });
        return;
      }
      this.view.goTo(SPACE_CAMERA, { duration: 0 }).catch(() => {});
      window.setTimeout(() => {
        this.goToProjects({ duration: 2800 });
      }, 700);
    },

    goHome() {
      if (!this.view) return;
      this.selectedId = null;
      this.selectedCountry = null;
      this.syncPills(null);
      this.syncGoalPinState();
      this.view.goTo(HOME_CAMERA, { duration: 1000 }).catch(() => {});
      if (global.MapUI) global.MapUI.closeDetail();
    },

    goToCountry(country, options) {
      const extent = this.countryExtent(country);
      if (!extent || !this.view) return;
      this.selectedId = null;
      this.selectedCountry = country;
      this.syncPills(country);
      this.syncGoalPinState();
      if (global.MapUI) global.MapUI.closeDetail();
      const duration = options && typeof options.duration === "number" ? options.duration : 1100;
      this.flyToExtent(extent, duration);
    },

    onSelect(id) {
      const feature = this.features.find((item) => item.id === id);
      if (!feature) return;
      this.selectedId = id;
      this.selectedCountry = feature.country;
      this.syncPills(feature.country);
      this.syncGoalPinState();

      document.querySelectorAll("#locationList button").forEach((btn) => {
        btn.classList.toggle("is-active", btn.getAttribute("data-loc") === id);
      });

      if (this.view) {
        this.view
          .goTo(
            {
              target: [feature.longitude, feature.latitude],
              zoom: 7,
              tilt: 48,
              heading: 20
            },
            { duration: 1100 }
          )
          .catch(() => {});
      }

      const body =
        `<div class="map-stat-grid">
          <div class="map-stat"><div class="k">Type</div><div class="v">${categoryLabel(feature.category)}</div></div>
          <div class="map-stat"><div class="k">When</div><div class="v">${feature.period}</div></div>
        </div>
        <p>${feature.subtitle}</p>
        <button type="button" class="detail-action" data-open-mapped-project="${feature.projectId}">Open project</button>`;

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
