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

  const ROUTE_ARC = "#1a8a9a";
  const ROUTE_GLOW = "#19c2d8";

  function routeEase(t) {
    const x = Math.max(0, Math.min(1, t));
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function curveAt(curve, t) {
    const u = 1 - t;
    return {
      x: u * u * curve.a.x + 2 * u * t * curve.c.x + t * t * curve.b.x,
      y: u * u * curve.a.y + 2 * u * t * curve.c.y + t * t * curve.b.y
    };
  }

  function curveStop(curve, radius) {
    const span = Math.hypot(curve.b.x - curve.a.x, curve.b.y - curve.a.y);
    if (span <= radius + 8) return 0;
    let lo = 0;
    let hi = 1;
    for (let step = 0; step < 10; step++) {
      const mid = (lo + hi) / 2;
      const point = curveAt(curve, mid);
      const dist = Math.hypot(point.x - curve.b.x, point.y - curve.b.y);
      if (dist > radius) lo = mid;
      else hi = mid;
    }
    return hi;
  }

  function curveSlice(curve, t0, t1) {
    const start = curveAt(curve, t0);
    const dt = t1 - t0;
    const ax = curve.c.x - curve.a.x;
    const ay = curve.c.y - curve.a.y;
    const bx = curve.b.x - curve.c.x;
    const by = curve.b.y - curve.c.y;
    const dx = 2 * (1 - t0) * ax + 2 * t0 * bx;
    const dy = 2 * (1 - t0) * ay + 2 * t0 * by;
    return {
      a: start,
      b: curveAt(curve, t1),
      c: { x: start.x + dx * dt / 2, y: start.y + dy * dt / 2 }
    };
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
    mapLive: false,

    awaitingTurn() {
      if (this.mapLive) return false;
      return window.matchMedia("(pointer: coarse)").matches && window.innerWidth <= 900 && window.innerHeight > window.innerWidth;
    },

    syncMapHold() {
      const wrap = document.getElementById("map-wrap");
      if (wrap) wrap.classList.toggle("map-hold", this.awaitingTurn());
    },

    releaseMapMotion() {
      this.mapLive = true;
      this.syncMapHold();
      this.syncRouteMotion();
    },

    routesOn: false,
    coverageData: null,
    coverageLayer: null,
    routesLayer: null,
    routePlaces: [],
    routePixels: [],
    routeCanvas: null,
    routeCtx: null,
    routeClock: 0,
    routeMode: "comet",
    flowStyle: "comet",
    tourPhase: "",
    tourDrawT: 0,
    tourDrawDur: 0,
    tourHomeTimer: 0,
    routeStamp: 0,
    routeFrame: 0,
    routeVisible: false,
    routeReduced: false,
    routeCoarse: false,
    projectCountPlayed: false,

    async init(data) {
      this.features = collectFeatures(data);
      this.renderList(this.features);
      this.renderSearchHits(this.features);
      this.renderPills();
      this.bindSearch();
      this.projectCountPlayed = false;
      this.routeReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.routeCoarse = window.matchMedia("(pointer: coarse), (max-width: 767px)").matches;
      this.updateStatusCounts();
      this.renderLegend();
      this.armProjectCount();
      this.syncMapHold();

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
      this.armTurn();
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

    armTurn() {
      const mapApi = this;
      const wrap = document.getElementById("map-wrap");
      const prompt = document.getElementById("turnPrompt");
      const land = document.getElementById("turnLand");
      const go = document.getElementById("turnGo");
      const back = document.getElementById("turnBack");
      if (!wrap || !prompt || !land || !go || !back || mapApi.turnReady) return;
      mapApi.turnReady = true;
      mapApi.syncMapHold();
      const slot = wrap.parentNode;
      const mapSec = document.getElementById("map");
      const isPortraitTouch = () => window.matchMedia("(pointer: coarse)").matches && window.innerHeight > window.innerWidth && window.innerWidth <= 900;
      const phoneLike = () => window.matchMedia("(pointer: coarse)").matches && Math.min(window.innerWidth, window.innerHeight) <= 900;
      const realLand = () => phoneLike() && window.innerWidth > window.innerHeight;
      let forced = false;
      let promptOn = false;
      let dismissed = false;
      let inMap = false;
      let wasReal = false;
      let tiltOn = false;
      let sideT = 0;
      let sideSign = 0;
      let hold = null;
      let openedSide = false;
      let sideFitTimer = 0;

      const lock = () => {
        document.body.classList.toggle("turn-lock", forced);
      };
      const refit = (recenter) => {
        if (!mapApi.map) return;
        const run = () => {
          if (!mapApi.map) return;
          mapApi.map.invalidateSize({ pan: !recenter });
          if (recenter) {
            const pad = forced ? { topLeft: [36, 36], bottomRight: [36, 56] } : null;
            mapApi.fitCountries(0, pad);
          }
          mapApi.projectRoutePaths();
        };
        run();
        window.requestAnimationFrame(run);
      };
      const pauseMap = () => {
        mapApi.mapLive = false;
        if (mapApi.touring) mapApi.stopTour();
        mapApi.syncMapHold();
        mapApi.syncRouteMotion();
      };
      const showPrompt = () => {
        if (promptOn || dismissed || forced || realLand() || !isPortraitTouch()) return;
        promptOn = true;
        prompt.classList.add("is-on");
        pauseMap();
        lock();
      };
      const hidePrompt = () => {
        if (!promptOn) return;
        promptOn = false;
        prompt.classList.remove("is-on");
        lock();
      };
      const offerPrompt = () => {
        dismissed = false;
        if (!isPortraitTouch() || forced || realLand()) return;
        showPrompt();
      };
      const fit = (recenter) => {
        if (!forced) return;
        land.style.width = window.innerHeight + "px";
        land.style.height = window.innerWidth + "px";
        refit(!!recenter);
      };
      const enterForced = (angle) => {
        if (realLand()) return;
        if (forced && land.dataset.a === String(angle)) return;
        hidePrompt();
        forced = true;
        land.dataset.a = String(angle);
        land.hidden = false;
        land.style.transform = angle > 0 ? "translateX(100vw) rotate(90deg)" : "translateY(100vh) rotate(-90deg)";
        if (!hold && slot) {
          hold = document.createElement("div");
          hold.setAttribute("aria-hidden", "true");
          hold.style.height = wrap.offsetHeight + "px";
          slot.insertBefore(hold, wrap);
        }
        if (wrap.parentNode !== land) land.appendChild(wrap);
        land.appendChild(back);
        wrap.classList.add("is-side");
        lock();
        mapApi.releaseMapMotion();
        fit(true);
        fitOpenedSide();
      };
      const exitForced = () => {
        if (!forced) return;
        forced = false;
        land.hidden = true;
        land.style.transform = "";
        if (hold && hold.parentNode) {
          hold.parentNode.insertBefore(wrap, hold);
          hold.remove();
          hold = null;
        } else if (slot && wrap.parentNode !== slot) slot.appendChild(wrap);
        lock();
        refit(true);
      };
      const fullMap = () => {
        const node = document.fullscreenElement || document.webkitFullscreenElement || null;
        return !!(node && (node === wrap || node.contains(wrap)));
      };
      const syncSide = () => {
        const wide = realLand();
        const full = fullMap();
        const side = forced || full || (wide && inMap);
        wrap.classList.toggle("is-side", side);
        document.body.classList.toggle("map-phone-land", !forced && (full || (wide && inMap)));
        if (forced) {
          if (back.parentNode !== land) land.appendChild(back);
        } else if (side) {
          if (back.parentNode !== wrap) wrap.appendChild(back);
        } else if (back.parentNode !== land) {
          land.appendChild(back);
        }
        return { wide: wide, full: full };
      };
      const fitOpenedSide = () => {
        window.clearTimeout(sideFitTimer);
        sideFitTimer = window.setTimeout(() => {
          if (!mapApi.map) return;
          if (!forced && !fullMap() && !wrap.classList.contains("is-side")) return;
          mapApi.map.invalidateSize({ pan: false });
          window.requestAnimationFrame(() => {
            if (!mapApi.map) return;
            mapApi.fitCountries(0, {
              topLeft: [20, 56],
              bottomRight: [20, 84]
            }, true);
          });
        }, 180);
      };
      const applyReal = () => {
        const wide = realLand();
        const full = fullMap();
        if (forced && wide && !full) exitForced();
        const view = syncSide();
        const sideNow = forced || view.full || (view.wide && inMap);
        if (sideNow && !openedSide) fitOpenedSide();
        openedSide = sideNow;
        if (view.wide || view.full) {
          hidePrompt();
          mapApi.releaseMapMotion();
          if (inMap && !wasReal && mapSec && !view.full) window.setTimeout(() => mapSec.scrollIntoView({ block: "center" }), 60);
        } else if (wasReal) {
          offerPrompt();
        }
        wasReal = view.wide || view.full;
      };

      if (window.L && L.Map && L.Draggable && typeof DOMMatrix === "function") {
        const origToContainer = L.Map.prototype.mouseEventToContainerPoint;
        L.Map.prototype.mouseEventToContainerPoint = function (event) {
          if (!forced || !this._container || !wrap.contains(this._container)) return origToContainer.call(this, event);
          const raw = getComputedStyle(land).transform;
          if (!raw || raw === "none") return origToContainer.call(this, event);
          const point = new DOMMatrix(raw).inverse().transformPoint(new DOMPoint(event.clientX, event.clientY));
          let x = 0;
          let y = 0;
          let node = this._container;
          while (node && node !== land) {
            x += node.offsetLeft;
            y += node.offsetTop;
            node = node.offsetParent;
          }
          return L.point(point.x - x - this._container.clientLeft, point.y - y - this._container.clientTop);
        };
        const drag = L.Draggable.prototype;
        const origMove = drag._onMove;
        drag._onMove = function (event) {
          if (!forced || !this._element || !wrap.contains(this._element)) return origMove.call(this, event);
          if (!this._enabled) return;
          if (event.touches && event.touches.length > 1) {
            this._moved = true;
            return;
          }
          const first = event.touches && event.touches.length === 1 ? event.touches[0] : event;
          const screen = L.point(first.clientX, first.clientY).subtract(this._startPoint);
          if (!screen.x && !screen.y) return;
          if (Math.abs(screen.x) + Math.abs(screen.y) < this.options.clickTolerance) return;
          const offset = Number(land.dataset.a) > 0 ? L.point(screen.y, -screen.x) : L.point(-screen.y, screen.x);
          L.DomEvent.preventDefault(event);
          if (!this._moved) {
            this.fire("dragstart");
            this._moved = true;
            L.DomUtil.addClass(document.body, "leaflet-dragging");
            this._lastTarget = event.target || event.srcElement;
            if (this._lastTarget) L.DomUtil.addClass(this._lastTarget, "leaflet-drag-target");
          }
          this._newPos = this._startPos.add(offset);
          this._moving = true;
          this._lastEvent = event;
          this._updatePosition();
        };
      }

      const onTilt = (event) => {
        const gamma = event.gamma;
        const beta = event.beta;
        if (gamma == null || beta == null || window.innerHeight <= window.innerWidth) {
          sideT = 0;
          return;
        }
        const side = Math.abs(gamma) > 60 && Math.abs(beta) < 50;
        if (side) {
          const sign = gamma < 0 ? 90 : -90;
          if (!sideT || sign !== sideSign) {
            sideT = performance.now();
            sideSign = sign;
          }
          if (performance.now() - sideT > 450 && (inMap || forced) && (!forced || Number(land.dataset.a) !== sign)) enterForced(sign);
        } else {
          sideT = 0;
          if (forced && Math.abs(gamma) < 30 && beta > 35) {
            exitForced();
            offerPrompt();
          }
        }
      };
      const enableTilt = async () => {
        if (tiltOn || !("DeviceOrientationEvent" in window)) return;
        try {
          if (typeof DeviceOrientationEvent.requestPermission === "function") {
            const answer = await DeviceOrientationEvent.requestPermission();
            if (answer !== "granted") return;
          }
        } catch (error) {
          return;
        }
        window.addEventListener("deviceorientation", onTilt);
        tiltOn = true;
      };

      const useLandscape = async () => {
        mapApi.releaseMapMotion();
        hidePrompt();
        dismissed = true;
        await enableTilt();
        const canLock = document.fullscreenEnabled && screen.orientation && screen.orientation.lock;
        if (canLock) {
          try {
            await wrap.requestFullscreen();
            await screen.orientation.lock("landscape");
            applyReal();
            return;
          } catch (error) {
            try {
              if (document.fullscreenElement) await document.exitFullscreen();
            } catch (exitError) {}
          }
        }
        if (window.innerHeight > window.innerWidth) enterForced(90);
      };

      go.addEventListener("click", useLandscape);
        back.addEventListener("click", () => {
        const fullNode = document.fullscreenElement || document.webkitFullscreenElement;
        if (fullNode && document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else if (fullNode && document.webkitExitFullscreen) document.webkitExitFullscreen();
        try {
          if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
        } catch (error) {}
        exitForced();
        syncSide();
        offerPrompt();
      });
      document.addEventListener("fullscreenchange", () => {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          try {
            if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
          } catch (error) {}
        }
        applyReal();
        fitOpenedSide();
      });
      document.addEventListener("webkitfullscreenchange", () => {
        applyReal();
        fitOpenedSide();
      });
      window.addEventListener("resize", () => {
        fit();
        applyReal();
      });
      window.addEventListener("orientationchange", () => {
        window.setTimeout(applyReal, 60);
      });
      if ("IntersectionObserver" in window) {
        const watcher = new IntersectionObserver((entries) => {
          const entry = entries[0];
          inMap = !!(entry && entry.isIntersecting && entry.intersectionRatio >= 0.5);
          applyReal();
        }, { threshold: [0, 0.5, 0.8] });
        watcher.observe(wrap);
      }
      const showAtStart = () => {
        if (!isPortraitTouch() || dismissed || forced || realLand()) return;
        showPrompt();
      };
      if (window.__journeyDone || !document.body.classList.contains("is-loading")) showAtStart();
      else document.addEventListener("journey:done", showAtStart, { once: true });
      if (typeof DeviceOrientationEvent === "undefined" || typeof DeviceOrientationEvent.requestPermission !== "function") enableTilt();
      applyReal();
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
          const at = cluster.getLatLng();
          const home = nearHome(at.lat, at.lng);
          const selected = cluster.getAllChildMarkers().some((marker) => marker.feature && marker.feature.id === mapApi.selectedId);
          return L.divIcon({
            className: "map-cluster-icon" + (selected ? " is-selected" : "") + (home ? " is-home" : ""),
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
      this.group.on("spiderfied unspiderfied animationend", () => this.syncRoutePlaces());
      this.map.on("zoomend", () => this.syncRoutePlaces());
      this.map.on("resize", () => this.applyOpeningView(false));
      this.map.on("dragstart wheel", () => {
        this.mapDragged = true;
      });
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

      this.ensureRouteCanvas();
      this.map.on("move zoom resize", () => this.projectRoutePaths());
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          if (this.routeFrame) cancelAnimationFrame(this.routeFrame);
          this.routeFrame = 0;
          return;
        }
        this.syncRouteMotion();
      });

      window.addEventListener("resize", () => {
        const box = document.getElementById("map-wrap");
        this.map.invalidateSize({ pan: !(box && box.classList.contains("is-side")) });
      });

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
                this.routeVisible = entry.isIntersecting;
                if (!entry.isIntersecting) this.stopTour();
                else this.syncRouteMotion();
              });
            },
            { threshold: 0.2 }
          );
          watcher.observe(wrap);
        }
      } else {
        this.routeVisible = true;
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
      if (!el || !this.projectCountPlayed) return;
      el.textContent = String(this.visibleFeatures().length);
    },

    renderLegend() {
      const root = document.getElementById("legendContent");
      if (!root) return;
      const types = [
        ["#3eb4c6", "Professional"],
        ["#c6a15a", "Education"],
        ["#1c2838", "Academic"]
      ];
      root.innerHTML = types
        .map(([color, name]) => `<div class="legend-item"><span class="legend-swatch" style="background:${color}"></span><span class="legend-text">${escapeHtml(name)}</span></div>`)
        .join("");
    },

    armProjectCount() {
      const el = document.getElementById("stat-project");
      const wrap = document.getElementById("map-wrap");
      if (!el) return;
      const run = () => {
        if (this.projectCountPlayed) return;
        this.projectCountPlayed = true;
        const to = this.visibleFeatures().length;
        if (this.routeReduced) {
          el.textContent = String(to);
          return;
        }
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - start) / 900);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = String(Math.round(to * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      };
      if (!wrap || !("IntersectionObserver" in window)) {
        run();
        return;
      }
      const watcher = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) return;
        watcher.disconnect();
        run();
      }, { threshold: 0.35 });
      watcher.observe(wrap);
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
      this.renderLegend();
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

    setFlowStyle(style) {
      const names = { comet: "Comet", pulse: "Pulse", tour: "Tour" };
      if (!names[style] || style === this.flowStyle) return;
      if (this.touring) this.stopTour();
      this.flowStyle = style;
      if (style === "tour") this.routeClock = 0;
      const btn = document.getElementById("flowStyle");
      if (btn) {
        btn.textContent = "Style: " + names[style];
        btn.setAttribute("aria-label", "Flow line style, " + names[style]);
      }
      if (!this.routesOn) this.setRoutes(true);
      else {
        this.syncRouteMotion();
        this.paintRouteFrame();
      }
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
        this.routePlaces = this.collectRoutePlaces(features);
        this.syncHomeHub(features);
      } else {
        this.routePlaces = [];
        this.removeHomeHub();
      }
      this.projectRoutePaths();
      this.syncRouteMotion();
    },

    syncRoutePlaces() {
      if (!this.map || !this.routesLayer) return;
      const drawing = this.routeMode === "draw" && this.touring;
      if (!this.routesOn && !drawing) {
        this.routePlaces = [];
        this.removeHomeHub();
        this.clearRouteHighlight();
        this.projectRoutePaths();
        this.syncRouteMotion();
        return;
      }
      this.routePlaces = this.collectRoutePlaces(this.visibleFeatures());
      this.syncHomeHub(this.visibleFeatures());
      this.clearRouteHighlight();
      this.projectRoutePaths();
      this.syncRouteMotion();
    },

    syncHomeHub() {
      if (!this.routesOn) {
        this.removeHomeHub();
        return;
      }
      if (!this.homeHub) {
        this.homeHub = L.marker(HOME, {
          interactive: false,
          keyboard: false,
          zIndexOffset: -1000,
          icon: this.homeHubIcon()
        });
        this.homeHub.bindTooltip("Mansoura", {
          permanent: true,
          direction: "top",
          offset: [0, -6],
          className: "pin-label",
          opacity: 1
        });
        this.homeHub.addTo(this.map);
        return;
      }
      this.homeHub.setZIndexOffset(-1000);
      this.homeHub.setIcon(this.homeHubIcon());
      if (!this.map.hasLayer(this.homeHub)) this.homeHub.addTo(this.map);
    },

    homeHubIcon() {
      return L.divIcon({
        className: "home-hub",
        html: '<div class="home-dot"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });
    },

    removeHomeHub() {
      if (this.homeHub && this.map) this.map.removeLayer(this.homeHub);
    },

    collectRoutePlaces(features) {
      const seen = new Set();
      const places = [];
      features.forEach((feature) => {
        if (nearHome(feature.latitude, feature.longitude)) return;
        const marker = this.byId && this.byId.get(feature.id);
        let target = marker;
        if (marker && this.group && typeof this.group.getVisibleParent === "function") {
          target = this.group.getVisibleParent(marker) || marker;
        }
        if (!target || seen.has(target)) return;
        seen.add(target);
        const at = target.getLatLng ? target.getLatLng() : L.latLng(feature.latitude, feature.longitude);
        if (nearHome(at.lat, at.lng)) return;
        const cluster = typeof target.getChildCount === "function";
        const members = cluster && typeof target.getAllChildMarkers === "function"
          ? target.getAllChildMarkers()
          : (marker ? [marker] : []);
        const usa = members.some((item) => item.feature && item.feature.country === "United States");
        places.push({
          from: HOME,
          to: [at.lat, at.lng],
          cluster: cluster,
          usa: usa,
          target: target
        });
      });
      places.sort((a, b) => {
        const aFirst = a.usa ? 0 : 1;
        const bFirst = b.usa ? 0 : 1;
        if (aFirst !== bFirst) return aFirst - bFirst;
        return a.to[0] - b.to[0] || a.to[1] - b.to[1];
      });
      return places;
    },

    clearRouteHighlight() {
      (this.routeHot || []).forEach((el) => el.classList.remove("is-comet"));
      this.routeHot = [];
    },

    syncRouteHighlight(hot) {
      const next = [];
      hot.forEach((el) => {
        el.classList.add("is-comet");
        next.push(el);
      });
      (this.routeHot || []).forEach((el) => {
        if (!hot.has(el)) el.classList.remove("is-comet");
      });
      this.routeHot = next;
    },

    ensureRouteCanvas() {
      if (!this.map || this.routeCanvas) return;
      const pane = this.map.createPane("routeCanvas");
      pane.style.zIndex = "450";
      pane.style.pointerEvents = "none";
      const canvas = document.createElement("canvas");
      canvas.className = "route-canvas";
      canvas.setAttribute("aria-hidden", "true");
      pane.appendChild(canvas);
      this.routeCanvas = canvas;
      this.routeCtx = canvas.getContext("2d");
    },

    placeRouteCanvas() {
      const canvas = this.routeCanvas;
      const size = this.map.getSize();
      const pos = this.map._getMapPanePos();
      canvas.style.width = size.x + "px";
      canvas.style.height = size.y + "px";
      canvas.style.transform = "translate(" + (-pos.x) + "px," + (-pos.y) + "px)";
      return size;
    },

    projectRoutePaths() {
      if (!this.map || !this.routeCanvas) return;
      const canvas = this.routeCanvas;
      const size = this.placeRouteCanvas();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = size.x;
      const height = size.y;
      if (width < 2 || height < 2) return;
      const nextW = Math.round(width * dpr);
      const nextH = Math.round(height * dpr);
      if (canvas.width !== nextW || canvas.height !== nextH) {
        canvas.width = nextW;
        canvas.height = nextH;
      }
      this.routePixels = this.routePlaces.map((place) => {
        const a = this.map.latLngToContainerPoint(place.from);
        const b = this.map.latLngToContainerPoint(place.to);
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const length = Math.hypot(dx, dy) || 1;
        let nx = dy / length;
        let ny = -dx / length;
        if (ny > 0) {
          nx = -nx;
          ny = -ny;
        }
        const curve = {
          a: { x: a.x, y: a.y },
          b: { x: b.x, y: b.y },
          c: {
            x: (a.x + b.x) / 2 + nx * length * 0.3,
            y: (a.y + b.y) / 2 + ny * length * 0.3
          },
          hub: { x: b.x, y: b.y },
          gap: place.cluster ? 26 : 14
        };
        curve.end = curveStop(curve, curve.gap);
        return curve.end > 0 ? curve : null;
      });
      if (this.routeReduced) this.paintRouteFrame();
    },

    syncRouteMotion() {
      const drawing = this.routeMode === "draw" && this.touring;
      const hold = this.awaitingTurn() && !drawing;
      const run = this.routeVisible && !this.routeReduced && !hold && this.routePlaces.length && (this.routesOn || drawing);
      if (!run) {
        if (this.routeFrame) {
          cancelAnimationFrame(this.routeFrame);
          this.routeFrame = 0;
        }
        this.paintRouteFrame();
        return;
      }
      if (this.routeFrame) return;
      this.routeStamp = 0;
      const loop = (now) => {
        this.routeFrame = requestAnimationFrame(loop);
        if (!this.routeStamp) this.routeStamp = now;
        const dt = Math.min(0.05, (now - this.routeStamp) / 1000);
        this.routeStamp = now;
        if (this.routeMode === "draw") {
          this.tourDrawT += dt;
          this.paintRouteFrame();
          if (this.tourDrawT >= this.tourDrawDur) this.stopTour();
          return;
        }
        this.routeClock += dt;
        this.paintRouteFrame();
      };
      this.routeFrame = requestAnimationFrame(loop);
    },

    paintRouteFrame() {
      const ctx = this.routeCtx;
      const canvas = this.routeCanvas;
      if (!ctx || !canvas) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (this.touring && this.tourPhase === "home") {
        this.clearRouteHighlight();
        return;
      }
      const drawing = this.routeMode === "draw" && this.touring;
      if ((!this.routesOn && !drawing) || !this.routePixels.length) {
        this.clearRouteHighlight();
        return;
      }
      const scale = canvas.width / Math.max(1, canvas.clientWidth);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      const hot = new Set();
      if (drawing && !this.routeReduced) {
        this.paintTourDraw(ctx, hot);
        this.syncRouteHighlight(hot);
        return;
      }
      if (this.flowStyle === "pulse") {
        this.paintPulseFrame(ctx);
        this.syncRouteHighlight(hot);
        return;
      }
      if (this.flowStyle === "tour") {
        this.paintFlowTour(ctx, hot);
        this.syncRouteHighlight(hot);
        return;
      }
      this.routePixels.forEach((curve, index) => {
        if (!curve) return;
        const shown = curve.end < 0.999 ? curveSlice(curve, 0, curve.end) : curve;
        this.strokeCurve(ctx, shown, 1.3, 0.28, ROUTE_ARC, "round");
        if (this.routeReduced || this.awaitingTurn()) return;
        const cycle = 3.4;
        const u = ((this.routeClock + index * 0.41) % cycle) / cycle;
        const travel = 0.55;
        if (u < travel) {
          const headAt = routeEase(u / travel) * curve.end;
          const slices = this.routeCoarse ? 12 : 26;
          const tail = 0.3 * curve.end;
          for (let slice = slices - 1; slice >= 0; slice--) {
            const from = Math.max(0, headAt - tail * (slice + 1) / slices);
            const to = Math.max(0, headAt - tail * slice / slices);
            if (to <= from) continue;
            const along = 1 - slice / slices;
            const fade = Math.pow(along, 1.4);
            this.strokeCurve(ctx, curveSlice(curve, from, to), 4.2 * along + 0.6, 0.95 * fade, ROUTE_GLOW, "butt");
          }
          this.drawRouteHead(ctx, curveAt(curve, headAt), 1);
        } else {
          this.drawRouteRing(ctx, curve.hub, (u - travel) * cycle / 1.1, 0.9, curve.gap);
          this.markRouteHot(hot, index);
        }
      });
      this.syncRouteHighlight(hot);
    },

    markRouteHot(hot, index) {
      const place = this.routePlaces[index];
      const el = place && place.target && place.target._icon;
      if (el) hot.add(el);
    },

    paintPulseFrame(ctx) {
      const moving = !this.routeReduced && !this.awaitingTurn();
      this.routePixels.forEach((curve, index) => {
        if (!curve) return;
        const shown = curve.end < 0.999 ? curveSlice(curve, 0, curve.end) : curve;
        ctx.setLineDash([3, 7]);
        ctx.lineDashOffset = moving ? -this.routeClock * 14 : 0;
        this.strokeCurve(ctx, shown, 1.2, 0.45, ROUTE_ARC, "round");
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
        if (!moving) return;
        for (let packet = 0; packet < 3; packet++) {
          const along = (this.routeClock * 0.22 + index * 0.11 + packet / 3) % 1;
          const fade = Math.sin(along * Math.PI);
          if (fade <= 0.02) continue;
          this.drawRouteHead(ctx, curveAt(curve, along * curve.end), fade, 3.6);
        }
      });
    },

    paintFlowTour(ctx, hot) {
      if (this.routeReduced || this.awaitingTurn()) {
        this.routePixels.forEach((curve) => {
          if (!curve) return;
          const shown = curve.end < 0.999 ? curveSlice(curve, 0, curve.end) : curve;
          this.strokeCurve(ctx, shown, 1.3, 0.28, ROUTE_ARC, "round");
        });
        return;
      }
      const count = this.routePixels.length;
      const stagger = 0.7;
      const fadeStart = Math.max(0, count - 1) * stagger + 2;
      const cycle = fadeStart + 1.6;
      const time = cycle > 0 ? this.routeClock % cycle : 0;
      const fade = time > fadeStart ? Math.max(0, 1 - (time - fadeStart) / 1.6) : 1;
      this.routePixels.forEach((curve, index) => {
        if (!curve) return;
        const start = index * stagger;
        const drawn = Math.min(1, Math.max(0, (time - start) / 1.5));
        if (drawn <= 0) return;
        const headAt = routeEase(drawn) * curve.end;
        const partial = headAt >= curve.end - 0.001 ? curveSlice(curve, 0, curve.end) : curveSlice(curve, 0, headAt);
        this.strokeCurve(ctx, partial, 2.2, 0.9 * fade, ROUTE_ARC, "round");
        if (drawn < 1) this.drawRouteHead(ctx, curveAt(curve, headAt), fade);
        else {
          this.drawRouteRing(ctx, curve.hub, (time - start - 1.5) / 1.1, fade, curve.gap);
          this.drawRouteRing(ctx, curve.hub, (time - start - 1.9) / 1.1, 0.7 * fade, curve.gap);
          this.markRouteHot(hot, index);
        }
      });
    },

    paintTourDraw(ctx, hot) {
      const count = this.routePixels.length;
      const stagger = 0.7;
      const fadeStart = Math.max(0, count - 1) * stagger + 2;
      const fade = this.tourDrawT > fadeStart ? Math.max(0, 1 - (this.tourDrawT - fadeStart) / 1.6) : 1;
      this.routePixels.forEach((curve, index) => {
        if (!curve) return;
        const start = index * stagger;
        const drawn = Math.min(1, Math.max(0, (this.tourDrawT - start) / 1.5));
        if (drawn <= 0) return;
        const headAt = routeEase(drawn) * curve.end;
        const partial = headAt >= curve.end - 0.001 ? curveSlice(curve, 0, curve.end) : curveSlice(curve, 0, headAt);
        this.strokeCurve(ctx, partial, 2.2, 0.9 * fade, ROUTE_ARC, "round");
        if (drawn < 1) this.drawRouteHead(ctx, curveAt(curve, headAt), fade);
        else {
          this.drawRouteRing(ctx, curve.hub, (this.tourDrawT - start - 1.5) / 1.1, fade, curve.gap);
          this.drawRouteRing(ctx, curve.hub, (this.tourDrawT - start - 1.9) / 1.1, 0.7 * fade, curve.gap);
          this.markRouteHot(hot, index);
        }
      });
      this.syncTourCounts();
    },

    syncTourCounts() {
      const status = document.getElementById("stat-project");
      const total = this.visibleFeatures().length;
      if (status && this.tourDrawDur > 0) {
        const p = Math.min(1, this.tourDrawT / this.tourDrawDur);
        status.textContent = String(Math.round(total * p));
        if (p >= 1) this.projectCountPlayed = true;
      }
    },

    restoreTourCounts() {
      this.projectCountPlayed = true;
      const status = document.getElementById("stat-project");
      if (status) status.textContent = String(this.visibleFeatures().length);
    },

    strokeCurve(ctx, curve, width, alpha, color, cap) {
      ctx.beginPath();
      ctx.moveTo(curve.a.x, curve.a.y);
      ctx.quadraticCurveTo(curve.c.x, curve.c.y, curve.b.x, curve.b.y);
      ctx.lineCap = cap || "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.globalAlpha = 1;
    },

    drawRouteHead(ctx, point, alpha, radius) {
      const glow = radius == null ? 5.4 : radius;
      ctx.save();
      ctx.globalAlpha = alpha == null ? 1 : alpha;
      if (!this.routeCoarse) {
        ctx.shadowColor = ROUTE_GLOW;
        ctx.shadowBlur = 14;
      }
      ctx.fillStyle = ROUTE_GLOW;
      ctx.beginPath();
      ctx.arc(point.x, point.y, glow, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(point.x, point.y, glow * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },

    drawRouteRing(ctx, point, age, alpha, gap) {
      if (age < 0 || age > 1) return;
      ctx.globalAlpha = (alpha == null ? 1 : alpha) * (1 - age);
      ctx.lineWidth = 2;
      ctx.strokeStyle = ROUTE_GLOW;
      ctx.beginPath();
      ctx.arc(point.x, point.y, (gap || 4) + age * 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
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

      const flow = document.getElementById("flowStyle");
      if (flow) {
        const order = ["comet", "pulse", "tour"];
        flow.addEventListener("click", () => {
          const next = order[(order.indexOf(this.flowStyle) + 1) % order.length];
          this.setFlowStyle(next);
        });
      }

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

    fitCountries(duration, padding, tight) {
      if (!this.map) return;
      const countries = new Set(this.visibleFeatures().map((feature) => feature.country));
      const bounds = L.latLngBounds([]);
      const outside = (lng, lat, country) => country === "United States" && (lat > 49 || lng < -128 || lng > 170);
      const push = (lng, lat, country) => {
        if (outside(lng, lat, country)) return;
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
      if (!tight && this.coverageData && this.coverageData.features) {
        this.coverageData.features.forEach((feat) => {
          const country = feat.properties && feat.properties.country;
          if (!countries.has(country)) return;
          walk(feat.geometry && feat.geometry.coordinates, country);
        });
      }
      if (tight || !bounds.isValid()) {
        this.visibleFeatures().forEach((feature) => {
          if (outside(feature.longitude, feature.latitude, feature.country)) return;
          bounds.extend([feature.latitude, feature.longitude]);
        });
      }
      if (!bounds.isValid()) return;
      this.map.invalidateSize({ pan: false });
      const ms = typeof duration === "number" ? duration : 0;
      const snap = this.map.options.zoomSnap;
      this.map.options.zoomSnap = 0;
      this.map.fitBounds(bounds, {
        paddingTopLeft: padding && padding.topLeft ? padding.topLeft : [28, 64],
        paddingBottomRight: padding && padding.bottomRight ? padding.bottomRight : [28, 118],
        animate: ms > 0,
        duration: ms / 1000,
        maxZoom: tight ? 5 : 6
      });
      if (tight) {
        const view = this.map.getBounds();
        const northCap = Math.min(56, bounds.getNorth() + 4);
        const westCap = -130;
        let lat = this.map.getCenter().lat;
        let lng = this.map.getCenter().lng;
        const halfLat = (view.getNorth() - view.getSouth()) / 2;
        const halfLng = (view.getEast() - view.getWest()) / 2;
        if (view.getNorth() > northCap) lat -= view.getNorth() - northCap;
        if (view.getWest() < westCap) lng += westCap - view.getWest();
        if (lat - halfLat > bounds.getSouth()) lat -= (lat - halfLat) - bounds.getSouth();
        if (lng + halfLng < bounds.getEast()) lng += bounds.getEast() - (lng + halfLng);
        this.map.setView([lat, lng], this.map.getZoom(), { animate: false });
      }
      const restoreSnap = () => {
        if (this.map) this.map.options.zoomSnap = snap == null ? 1 : snap;
      };
      this.map.once("moveend", restoreSnap);
      window.setTimeout(restoreSnap, ms + 80);
    },

    playIntro() {
      if (!this.map || this.mapDragged) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.fitCountries(reduced || this.awaitingTurn() ? 0 : 800);
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
      this.renderLegend();
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
        .sort((a, b) => {
          const aFirst = a.country === "United States" ? 0 : 1;
          const bFirst = b.country === "United States" ? 0 : 1;
          if (aFirst !== bFirst) return aFirst - bFirst;
          return Number(b.period) - Number(a.period);
        });
    },

    startTour() {
      const list = this.tourOrder();
      if (!list.length || !this.map || this.touring) return;
      this.touring = true;
      this.tourPhase = "home";
      this.syncTourButton();
      this.clearSelection();
      if (!this.routePlaces.length) this.routePlaces = this.collectRoutePlaces(this.visibleFeatures());
      this.projectRoutePaths();
      this.paintRouteFrame();
      const ms = this.routeReduced ? 0 : 700;
      this.fitCountries(ms);
      const go = () => this.beginRouteDraw();
      this._tourHomeDone = go;
      this.map.once("moveend", go);
      this.tourHomeTimer = window.setTimeout(go, ms + 180);
    },

    beginRouteDraw() {
      if (this._tourHomeDone && this.map) this.map.off("moveend", this._tourHomeDone);
      this._tourHomeDone = null;
      if (this.tourHomeTimer) window.clearTimeout(this.tourHomeTimer);
      this.tourHomeTimer = 0;
      if (!this.touring || this.tourPhase !== "home") return;
      this.projectRoutePaths();
      if (this.routeReduced || !this.routePixels.length) {
        this.stopTour();
        return;
      }
      const count = this.routePixels.length;
      this.tourPhase = "draw";
      this.routeMode = "draw";
      this.tourDrawT = 0;
      const status = document.getElementById("stat-project");
      if (status) status.textContent = "0";
      this.tourDrawDur = Math.max(0, count - 1) * 0.7 + 2 + 1.6;
      this.syncRouteMotion();
    },

    stopTour() {
      if (!this.touring) return;
      this.touring = false;
      this.tourPhase = "";
      this.routeMode = "comet";
      if (this.tourTimer) window.clearTimeout(this.tourTimer);
      this.tourTimer = null;
      if (this.tourHomeTimer) window.clearTimeout(this.tourHomeTimer);
      this.tourHomeTimer = 0;
      if (this._tourHomeDone && this.map) this.map.off("moveend", this._tourHomeDone);
      this._tourHomeDone = null;
      this.restoreTourCounts();
      this.syncTourButton();
      this.syncRouteMotion();
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
