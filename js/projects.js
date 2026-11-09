(function (global) {
  "use strict";

  function yearsSince(dateText) {
    const parsed = Date.parse("1 " + dateText);
    if (Number.isNaN(parsed)) return 1;
    const years = (Date.now() - parsed) / (365.25 * 24 * 60 * 60 * 1000);
    return Math.max(1, Math.floor(years));
  }

  function shuffle(items) {
    const list = (items || []).slice();
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const hold = list[i];
      list[i] = list[j];
      list[j] = hold;
    }
    return list;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setCount(id, value, suffix, prefix) {
    const el = document.getElementById(id);
    if (!el) return;
    el.dataset.count = String(value);
    el.dataset.suffix = suffix || "";
    el.dataset.prefix = prefix || "";
    el.textContent = (prefix || "") + "0" + (suffix || "");
  }

  function webpPath(src) {
    return /\.(png|jpe?g)$/i.test(src) ? src.replace(/\.(png|jpe?g)$/i, ".webp") : "";
  }

  function pictureHtml(src, attrs) {
    const webp = webpPath(src);
    const img = `<img src="${escapeHtml(src)}" ${attrs} />`;
    return webp ? `<picture><source srcset="${escapeHtml(webp)}" type="image/webp" />${img}</picture>` : img;
  }

  function heroImg(src, alt) {
    const webp = webpPath(src);
    const fallback = webp
      ? ` data-fallback="${escapeHtml(src)}" onerror="this.onerror=null;this.src=this.dataset.fallback"`
      : "";
    return `<img id="modalHero" src="${escapeHtml(webp || src)}" alt="${escapeHtml(alt)}" width="1280" height="720"${fallback} />`;
  }

  const MONTHS = {
    January: "Jan",
    February: "Feb",
    March: "Mar",
    April: "Apr",
    May: "May",
    June: "Jun",
    July: "Jul",
    August: "Aug",
    September: "Sep",
    October: "Oct",
    November: "Nov",
    December: "Dec"
  };

  function shortDate(value) {
    return String(value ?? "").replace(
      /January|February|March|April|May|June|July|August|September|October|November|December/g,
      (month) => MONTHS[month]
    );
  }

  function dateRange(start, end) {
    return shortDate(start) + " - " + shortDate(end);
  }

  function groupWork(jobs) {
    const groups = [];
    (jobs || []).forEach((job) => {
      const prev = groups[groups.length - 1];
      if (prev && prev.company === job.company) prev.roles.push(job);
      else {
        groups.push({
          company: job.company,
          location: job.location,
          logo: job.logo,
          roles: [job]
        });
      }
    });
    return groups;
  }

  function jobLogos(job) {
    const fill = job.logoFill ? " logo-frame-fill" : "";
    const main = `<span class="logo-frame logo-frame-circle${fill}"><img src="${escapeHtml(job.logo)}" alt="${escapeHtml(job.company)}" width="62" height="62" loading="lazy" decoding="async" /></span>`;
    if (!job.partnerLogo) return main;
    return `<div class="logo-pair">
      ${main}
      <span class="logo-frame logo-frame-pill"><img src="${escapeHtml(job.partnerLogo)}" alt="${escapeHtml(job.partnerName || "")}" width="120" height="48" loading="lazy" decoding="async" /></span>
    </div>`;
  }

  function jobType(job) {
    return [job.employmentType, job.workMode].filter(Boolean).join(" · ");
  }

  function jobSite(job) {
    if (!job.website) return "";
    const label = job.website.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `<p class="job-link"><a href="${escapeHtml(job.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a></p>`;
  }

  function jobWhen(job) {
    const place = job.displayPlace === false ? "" : job.location;
    const type = job.displayPlace === false ? job.employmentType : jobType(job);
    const line = [job.company, place, dateRange(job.startDate, job.endDate), type]
      .filter(Boolean)
      .join(" · ");
    const partner = job.partnerName ? `<p class="when">${escapeHtml(job.partnerName)}</p>` : "";
    const site = job.displayPlace === false ? "" : jobSite(job);
    return `<p class="when">${escapeHtml(line)}</p>${partner}${site}`;
  }

  function jobInsights(job) {
    const info = job.insights;
    if (!info) return "";
    const jss = Number(info.jss) || 0;
    const radius = 16;
    const circ = 2 * Math.PI * radius;
    const dash = (jss / 100) * circ;
    const badge = info.badge
      ? `<div class="insight-rated">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 2.4 14.9 8.3l6.5.9-4.7 4.6 1.1 6.5L12 17.2l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9Z"/>
          </svg>
          <div>
            <strong>${escapeHtml(info.badge)}</strong>
            <span>Recognized talent</span>
          </div>
        </div>`
      : "";
    const score = info.jss != null
      ? `<div class="insight-jss">
          <div class="jss-wrap">
            <svg class="jss-ring" viewBox="0 0 40 40" aria-hidden="true">
              <circle class="jss-track" cx="20" cy="20" r="${radius}"></circle>
              <circle class="jss-value" cx="20" cy="20" r="${radius}" stroke-dasharray="${dash} ${circ}"></circle>
            </svg>
            <strong>${jss}%</strong>
          </div>
          <div class="insight-jss-copy">
            <strong>Job Success</strong>
            <span>Client satisfaction score</span>
          </div>
        </div>`
      : "";
    if (!badge && !score) return "";
    return `<div class="insights" aria-label="Upwork insights">${badge}${score}</div>`;
  }

  function jobHeadline(job) {
    if (!job.headline) return "";
    return `<p class="job-headline">${escapeHtml(job.headline)}</p>`;
  }

  function jobSummary(job) {
    if (!job.summary || !job.summary.length) return "";
    return job.summary.map((text) => `<p class="job-summary">${escapeHtml(text)}</p>`).join("");
  }

  function roleSkills(job) {
    if (!job.skills || !job.skills.length) return "";
    return `<p class="role-skills">
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 2.5 21.5 12 12 21.5 2.5 12Z"/>
      </svg>
      <span>${job.skills.map(escapeHtml).join(", ")}</span>
    </p>`;
  }

  function roleCopy(job) {
    const when = [dateRange(job.startDate, job.endDate), jobType(job)].filter(Boolean).join(" · ");
    return `
      <h4>${escapeHtml(job.position)}</h4>
      <p class="when">${escapeHtml(when)}</p>
      <ul>${job.responsibilities.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      ${roleSkills(job)}`;
  }

  function expandButton() {
    return `<button type="button" class="expando-btn" aria-expanded="false" aria-label="Show details">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </button>`;
  }

  const IMG_FALLBACK = "this.onerror=null;this.style.background='#d5dde4';this.removeAttribute('src');";

  const PortfolioUI = {
    data: null,
    galleryImages: [],
    galleryIndex: 0,
    highlightTimer: null,
    projectClicksBound: false,
    cardVideoObserver: null,
    marqueeRaf: null,
    marqueeShift: 0,
    marqueeLoop: 0,
    marqueeSpeed: 70,
    marqueeVelocity: 70,
    marqueeDragging: false,
    marqueeDidDrag: false,
    marqueeDragBound: false,

    render(data) {
      this.data = data;
      const info = data.personalInfo;
      const years = yearsSince(info.careerStart || "April 2022");

      document.getElementById("heroAbout").textContent = info.about;
      document.getElementById("heroEmail").href = "mailto:" + info.email;
      document.getElementById("heroPhoto").src = info.profileImage;
      document.getElementById("heroPhoto").alt = info.fullName || info.name;
      setCount("statYears", years, "+ years");
      setCount("statProjects", 90, "", "+");
      setCount("statCountries", 7, "", "+");
      document.getElementById("statNow").textContent = info.currentCompany;
      document.getElementById("heroRoles").textContent = info.roles[0];

      document.getElementById("navGithub").href = info.social.github;
      document.getElementById("navLinkedin").href = info.social.linkedin;
      document.getElementById("contactGithub").href = info.social.github;
      document.getElementById("contactLinkedin").href = info.social.linkedin;
      document.getElementById("contactEmail").href = "mailto:" + info.email;
      document.getElementById("contactEmail").textContent = info.email;
      document.getElementById("contactMail").href = "mailto:" + info.email;
      document.getElementById("contactLocation").textContent = info.location;
      document.getElementById("contactRole").textContent =
        info.currentPosition + " at " + info.currentCompany;
      document.getElementById("cvLink").href = info.cvUrl;
      document.getElementById("resumeLink").href = info.resumeUrl;
      document.getElementById("footerCopy").textContent =
        "© " + (data.metadata && data.metadata.lastUpdated ? data.metadata.lastUpdated : "2026") +
        " " + info.name;

      this.renderProjects();
      this.renderWork();
      this.renderEducation();
      this.renderSkills();
      this.bindProjectActions();
      this.bindMarqueeDrag();
    },

    startRoleCycle() {
      const roles = this.data.personalInfo.roles;
      const el = document.getElementById("heroRoles");
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || roles.length < 2) {
        el.textContent = roles[0];
        return;
      }
      let i = 0;
      setInterval(() => {
        i = (i + 1) % roles.length;
        el.style.opacity = "0";
        setTimeout(() => {
          el.textContent = roles[i];
          el.style.opacity = "1";
        }, 220);
      }, 3200);
      el.style.transition = "opacity 0.2s ease";
    },

    projectChip(project) {
      const loc = project.location || {};
      const place = loc.country || loc.name || "";
      return [project.year, place].filter(Boolean).join(" · ");
    },

    projectCardHtml(project, clone) {
      const image = project.images && project.images[0] ? project.images[0] : "";
      const hidden = clone ? ' aria-hidden="true"' : "";
      const chip = this.projectChip(project);
      const label = chip ? project.title + ", " + chip : project.title;
      const leadVideo = project.videoUrl && (project.leadMedia === "video" || !image);
      const media = leadVideo
        ? `<video class="project-card-video" data-lazy-video src="${escapeHtml(encodeURI(project.videoUrl))}" muted loop playsinline preload="none" disablepictureinpicture width="640" height="360"></video>`
        : pictureHtml(
            image,
            `alt="${clone ? "" : escapeHtml(project.title)}" loading="lazy" decoding="async" width="640" height="360" onerror="${IMG_FALLBACK}"`
          );
      const chipHtml = chip ? `<span class="project-card-chip">${escapeHtml(chip)}</span>` : "";
      return `
        <article class="project-card" data-project-id="${escapeHtml(project.id)}" data-open-project="${escapeHtml(project.id)}" role="button" tabindex="${clone ? "-1" : "0"}" aria-label="${clone ? "" : escapeHtml(label)}"${hidden}>
          <div class="project-card-media">${media}${chipHtml}</div>
          <h3 class="project-card-title">${escapeHtml(project.title)}</h3>
        </article>`;
    },

    bindProjectActions() {
      const marquee = document.getElementById("projectsMarquee");
      if (!marquee || this.projectClicksBound) return;
      this.projectClicksBound = true;
      marquee.addEventListener("mousedown", (event) => {
        if (event.target.closest("[aria-hidden='true']")) event.preventDefault();
      });
      marquee.addEventListener("click", (event) => {
        const open = event.target.closest("[data-open-project]");
        if (!open || this.marqueeDidDrag) return;
        this.openModal(open.getAttribute("data-open-project"), open.closest(".project-card") || open);
      });
      marquee.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const open = event.target.closest("[data-open-project]");
        if (!open || open.getAttribute("aria-hidden") === "true") return;
        event.preventDefault();
        this.openModal(open.getAttribute("data-open-project"), open);
      });
    },

    renderProjects() {
      const track = document.getElementById("projectsGrid");
      const marquee = document.getElementById("projectsMarquee");
      if (!track) return;
      const list = shuffle(this.data.projects || []);

      if (!list.length) {
        track.innerHTML = "";
        if (marquee) marquee.classList.remove("is-paused");
        this.stopMarquee();
        return;
      }

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const originals = list.map((project) => this.projectCardHtml(project, false)).join("");
      const cloneGroup = list.map((project) => this.projectCardHtml(project, true)).join("");

      if (reduced) {
        track.innerHTML = `<div class="projects-set">${originals}</div>`;
        this.stopMarquee();
        this.bindCardVideos();
        return;
      }

      track.innerHTML = `<div class="projects-set">${originals}</div>`;
      const set = track.querySelector(".projects-set");
      let copies = 1;
      const limit = Math.max((marquee && marquee.clientWidth) || 0, 320);
      while (set && set.scrollWidth < limit && copies < 8) {
        set.insertAdjacentHTML("beforeend", cloneGroup);
        copies += 1;
      }

      const loop = set.cloneNode(true);
      loop.setAttribute("aria-hidden", "true");
      loop.querySelectorAll(".project-card").forEach((card) => {
        card.setAttribute("aria-hidden", "true");
      });
      loop.querySelectorAll("button, a").forEach((control) => {
        control.tabIndex = -1;
      });
      track.appendChild(loop);

      const duration = Math.max(18, Math.round((set.scrollWidth || limit) / 70));
      track.style.animationDuration = duration + "s";
      this.bindCardVideos();
      this.startMarquee();
    },

    marqueeAutoplayPaused() {
      const marquee = document.getElementById("projectsMarquee");
      if (!marquee) return true;
      if (this.marqueeDragging) return true;
      if (marquee.classList.contains("is-paused")) return true;
      if (marquee.classList.contains("is-modal-paused")) return true;
      if (marquee.querySelector(":focus-visible")) return true;
      return false;
    },

    wrapMarqueeShift() {
      const width = this.marqueeLoop;
      if (!width) return;
      while (this.marqueeShift >= 0) this.marqueeShift -= width;
      while (this.marqueeShift < -width) this.marqueeShift += width;
    },

    stopMarquee() {
      if (this.marqueeRaf) {
        cancelAnimationFrame(this.marqueeRaf);
        this.marqueeRaf = null;
      }
      const track = document.getElementById("projectsGrid");
      if (track) {
        track.classList.remove("is-js");
        track.style.transform = "";
      }
      const marquee = document.getElementById("projectsMarquee");
      if (marquee) marquee.scrollLeft = 0;
    },

    applyMarqueeFrame() {
      const marquee = document.getElementById("projectsMarquee");
      if (!marquee) return;
      const dpr = window.devicePixelRatio || 1;
      marquee.scrollLeft = Math.round(-this.marqueeShift * dpr) / dpr;
    },

    startMarquee() {
      this.stopMarquee();
      const track = document.getElementById("projectsGrid");
      const marquee = document.getElementById("projectsMarquee");
      const set = track && track.querySelector(".projects-set");
      if (!track || !marquee || !set) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      this.marqueeLoop = set.scrollWidth;
      this.marqueeSpeed = 70;
      this.marqueeVelocity = 70;
      this.marqueeShift = -this.marqueeLoop;
      track.classList.add("is-js");
      this.applyMarqueeFrame();
      let last = performance.now();
      const tick = (now) => {
        this.marqueeRaf = requestAnimationFrame(tick);
        const dt = Math.min(0.048, (now - last) / 1000);
        last = now;
        if (!this.marqueeLoop) {
          this.applyMarqueeFrame();
          return;
        }
        const hovering = window.matchMedia("(hover: hover) and (pointer: fine)").matches && marquee.matches(":hover");
        const target = this.marqueeAutoplayPaused() || hovering ? 0 : this.marqueeSpeed;
        const diff = target - this.marqueeVelocity;
        const step = Math.sign(diff) * this.marqueeSpeed * dt;
        this.marqueeVelocity = Math.abs(step) >= Math.abs(diff) ? target : this.marqueeVelocity + step;
        if (!this.marqueeDragging && this.marqueeVelocity) this.marqueeShift += this.marqueeVelocity * dt;
        this.wrapMarqueeShift();
        this.applyMarqueeFrame();
      };
      this.marqueeRaf = requestAnimationFrame(tick);
    },

    bindMarqueeDrag() {
      const marquee = document.getElementById("projectsMarquee");
      if (!marquee || this.marqueeDragBound) return;
      this.marqueeDragBound = true;
      let startX = 0;
      let startShift = 0;
      let holding = false;

      marquee.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        if (!this.marqueeLoop) return;
        holding = true;
        this.marqueeDragging = false;
        this.marqueeDidDrag = false;
        startX = event.clientX;
        startShift = this.marqueeShift;
      });

      marquee.addEventListener("pointermove", (event) => {
        if (!holding) return;
        const dx = event.clientX - startX;
        if (!this.marqueeDragging) {
          if (Math.abs(dx) < 8) return;
          this.marqueeDragging = true;
          this.marqueeDidDrag = true;
          marquee.classList.add("is-dragging");
          try {
            marquee.setPointerCapture(event.pointerId);
          } catch (err) {
            /* ignore */
          }
        }
        this.marqueeShift = startShift + dx;
        this.wrapMarqueeShift();
        this.applyMarqueeFrame();
      });

      const endDrag = () => {
        holding = false;
        if (!this.marqueeDragging) return;
        this.marqueeDragging = false;
        marquee.classList.remove("is-dragging");
        if (this.marqueeDidDrag) {
          window.setTimeout(() => {
            this.marqueeDidDrag = false;
          }, 0);
        }
      };
      marquee.addEventListener("pointerup", endDrag);
      marquee.addEventListener("pointercancel", endDrag);
      window.addEventListener("pointerup", endDrag);
      window.addEventListener("pointercancel", endDrag);

      marquee.addEventListener(
        "click",
        (event) => {
          if (!this.marqueeDidDrag) return;
          event.preventDefault();
          event.stopPropagation();
          this.marqueeDidDrag = false;
        },
        true
      );

      window.addEventListener("resize", () => {
        const track = document.getElementById("projectsGrid");
        const set = track && track.querySelector(".projects-set");
        if (!set) return;
        const next = set.scrollWidth;
        if (!next) return;
        const old = this.marqueeLoop || next;
        const progress = old ? -this.marqueeShift / old : 1;
        this.marqueeLoop = next;
        this.marqueeShift = -progress * next;
        this.wrapMarqueeShift();
      });
    },

    bindCardVideos() {
      if (this.cardVideoObserver) {
        this.cardVideoObserver.disconnect();
        this.cardVideoObserver = null;
      }
      const videos = document.querySelectorAll(".project-card-video");
      if (!videos.length) return;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      videos.forEach((video) => {
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.loop = true;
        if (reduced) video.pause();
      });
      if (reduced) return;
      const marquee = document.getElementById("projectsMarquee");
      this.cardVideoObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const video = entry.target;
            if (entry.isIntersecting) {
              const play = video.play();
              if (play && typeof play.catch === "function") play.catch(() => {});
            } else {
              video.pause();
            }
          });
        },
        { root: marquee || null, threshold: 0.2 }
      );
      videos.forEach((video) => this.cardVideoObserver.observe(video));
    },

    highlightProject(projectId, options) {
      const marquee = document.getElementById("projectsMarquee");
      document.querySelectorAll(".project-card").forEach((card) => {
        card.classList.toggle("is-highlighted", card.getAttribute("data-project-id") === projectId);
      });
      if (marquee) marquee.classList.toggle("is-paused", !!projectId);
      if (this.highlightTimer) window.clearTimeout(this.highlightTimer);
      if (projectId) {
        this.highlightTimer = window.setTimeout(() => {
          document.querySelectorAll(".project-card.is-highlighted").forEach((card) => {
            card.classList.remove("is-highlighted");
          });
          if (marquee) marquee.classList.remove("is-paused");
        }, 5000);
      }
    },

    openModal(projectId, origin) {
      const project = this.data.projects.find((item) => item.id === projectId);
      if (!project) return;
      const body = document.getElementById("modalBody");
      const images = project.images || [];
      const main = images[0] || "";
      const thumbs = images
        .map(
          (src, index) =>
            `<button type="button" class="${index === 0 ? "is-active" : ""}" data-thumb-index="${index}">
              ${pictureHtml(src, 'alt="" loading="lazy" decoding="async"')}
            </button>`
        )
        .join("");

      const links = [];
      if (project.demoUrl) links.push(`<a class="btn btn-primary" href="${escapeHtml(project.demoUrl)}" target="_blank" rel="noopener noreferrer">Live app</a>`);
      if (project.githubUrl) links.push(`<a class="btn btn-outline" href="${escapeHtml(project.githubUrl)}" target="_blank" rel="noopener noreferrer">GitHub</a>`);
      if (project.documentationUrl) links.push(`<a class="btn btn-outline" href="${escapeHtml(project.documentationUrl)}" target="_blank" rel="noopener noreferrer">API docs</a>`);
      if (project.presentationUrl) links.push(`<a class="btn btn-outline" href="${escapeHtml(project.presentationUrl)}" target="_blank" rel="noopener noreferrer">Presentation</a>`);
      if (project.showOnMap !== false) links.push(`<button type="button" class="btn btn-outline" data-map-project="${escapeHtml(project.id)}">Show on map</button>`);

      const leadVideo = project.leadMedia === "video" && !!project.videoUrl;
      const video = project.videoUrl
        ? `<video class="modal-video" src="${escapeHtml(encodeURI(project.videoUrl))}" controls playsinline ${leadVideo ? "autoplay muted" : ""}></video>`
        : "";
      const hero = leadVideo
        ? video
        : main
          ? heroImg(main, project.title)
          : video;
      const galleryNav =
        !!main && images.length > 1
          ? `<button type="button" class="gallery-nav gallery-prev" data-gallery-step="-1" aria-label="Previous image">‹</button>
             <button type="button" class="gallery-nav gallery-next" data-gallery-step="1" aria-label="Next image">›</button>
             <p class="gallery-count" id="galleryCount">1 / ${images.length}</p>`
          : "";
      const stills =
        leadVideo && main
          ? `<div class="modal-gallery modal-stills">
              ${heroImg(main, project.title)}
              ${galleryNav}
            </div>`
          : "";

      const features = (project.features || []).map((f) => `<li>${escapeHtml(f)}</li>`).join("");
      const techs = (project.technologies || []).map((t) => `<li>${escapeHtml(t)}</li>`).join("");
      const collab = project.collaborators
        ? `<p><strong>With:</strong> ${escapeHtml(project.collaborators.join(", "))}</p>`
        : "";

      const title = document.getElementById("modalTitle");
      const subtitle = document.getElementById("modalSubtitle");
      if (title) title.textContent = project.title;
      if (subtitle) subtitle.textContent = project.company + " · " + project.year + " · " + project.location.name;
      body.innerHTML = `
        <div class="modal-gallery">
          ${hero}
          ${leadVideo ? "" : galleryNav}
        </div>
        ${stills}
        ${images.length > 1 ? `<div class="thumbs">${thumbs}</div>` : ""}
        ${!leadVideo && main && video ? video : ""}
        <p>${escapeHtml(project.longDescription)}</p>
        ${collab}
        <h3>What it does</h3>
        <ul>${features}</ul>
        <h3>Technologies</h3>
        <ul class="tag-list">${techs}</ul>
        <div class="modal-links">${links.join("")}</div>
      `;
      body.scrollTop = 0;

      this.galleryImages = images;
      this.galleryIndex = 0;
      this.galleryTitle = project.title;

      body.querySelectorAll("[data-gallery-step]").forEach((btn) => {
        btn.addEventListener("click", () => this.showGallery(this.galleryIndex + Number(btn.getAttribute("data-gallery-step"))));
      });
      body.querySelectorAll("[data-thumb-index]").forEach((btn) => {
        btn.addEventListener("click", () => this.showGallery(Number(btn.getAttribute("data-thumb-index"))));
      });
      body.querySelectorAll("[data-map-project]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-map-project");
          this.closeModal();
          document.dispatchEvent(new CustomEvent("portfolio:goto", { detail: { id: "project-" + id } }));
          const map = document.getElementById("map");
          if (map) map.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });

      const modal = document.getElementById("projectModal");
      const panel = modal.querySelector(".modal-panel");
      const marquee = document.getElementById("projectsMarquee");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.modalEpoch = (this.modalEpoch || 0) + 1;
      if (this.modalCloseTimer) {
        window.clearTimeout(this.modalCloseTimer);
        this.modalCloseTimer = null;
      }
      if (this.modalClosePanel && this.modalCloseHandler) {
        this.modalClosePanel.removeEventListener("transitionend", this.modalCloseHandler);
        this.modalClosePanel = null;
        this.modalCloseHandler = null;
      }
      if (marquee) marquee.classList.add("is-modal-paused");
      const focused = document.activeElement;
      if (focused && focused.closest && focused.closest("[aria-hidden='true']")) focused.blur();
      this.lockPageScroll();
      modal.classList.remove("is-closing", "is-settled");
      modal.hidden = false;
      modal.classList.add("is-open");
      body.scrollTop = 0;
      if (panel && !reduced && origin) {
        panel.style.transform = "none";
        const panelRect = panel.getBoundingClientRect();
        const cardRect = origin.getBoundingClientRect();
        panel.style.transform = "";
        this.setModalOrigin(panel, panelRect, cardRect);
        const epoch = this.modalEpoch;
        window.requestAnimationFrame(() => {
          if (this.modalEpoch !== epoch || modal.classList.contains("is-closing")) return;
          modal.classList.add("is-settled");
        });
      } else {
        if (panel) {
          panel.style.removeProperty("--from-x");
          panel.style.removeProperty("--from-y");
          panel.style.removeProperty("--from-s");
        }
        modal.classList.add("is-settled");
      }
    },

    setModalOrigin(panel, panelRect, cardRect) {
      const usable = cardRect && cardRect.width > 20 && cardRect.height > 20 && panelRect.width > 20;
      if (!usable) {
        panel.style.setProperty("--from-x", "0px");
        panel.style.setProperty("--from-y", "20px");
        panel.style.setProperty("--from-s", "0.96");
        return;
      }
      const dx = cardRect.left + cardRect.width / 2 - (panelRect.left + panelRect.width / 2);
      const dy = cardRect.top + cardRect.height / 2 - (panelRect.top + panelRect.height / 2);
      const scale = Math.max(0.2, Math.min(0.72, cardRect.width / panelRect.width));
      panel.style.setProperty("--from-x", dx.toFixed(1) + "px");
      panel.style.setProperty("--from-y", dy.toFixed(1) + "px");
      panel.style.setProperty("--from-s", scale.toFixed(3));
    },

    lockPageScroll() {
      if (document.body.classList.contains("modal-open")) return;
      const before = document.documentElement.clientWidth;
      document.body.classList.add("modal-open");
      const gap = document.documentElement.clientWidth - before;
      if (gap > 0) {
        document.documentElement.style.setProperty("--modal-scrollbar-gap", gap + "px");
        document.body.style.paddingRight = gap + "px";
      }
    },

    unlockPageScroll() {
      document.body.classList.remove("modal-open");
      document.body.style.paddingRight = "";
      document.documentElement.style.removeProperty("--modal-scrollbar-gap");
    },

    showGallery(index) {
      if (!this.galleryImages.length) return;
      this.galleryIndex = (index + this.galleryImages.length) % this.galleryImages.length;
      const hero = document.getElementById("modalHero");
      const count = document.getElementById("galleryCount");
      if (hero) {
        const src = this.galleryImages[this.galleryIndex];
        const webp = webpPath(src);
        hero.src = webp || src;
        if (webp) {
          hero.dataset.fallback = src;
          hero.onerror = function () {
            this.onerror = null;
            this.src = this.dataset.fallback;
          };
        } else {
          hero.onerror = null;
          delete hero.dataset.fallback;
        }
        hero.alt = (this.galleryTitle || "Project") + " screenshot " + (this.galleryIndex + 1);
      }
      if (count) count.textContent = this.galleryIndex + 1 + " / " + this.galleryImages.length;
      document.querySelectorAll("#modalBody [data-thumb-index]").forEach((btn) => {
        btn.classList.toggle("is-active", Number(btn.getAttribute("data-thumb-index")) === this.galleryIndex);
      });
    },

    closeModal() {
      const modal = document.getElementById("projectModal");
      if (!modal || !modal.classList.contains("is-open") || modal.classList.contains("is-closing")) return;
      modal.querySelectorAll("video").forEach((video) => {
        video.pause();
      });
      const epoch = this.modalEpoch || 0;
      const panel = modal.querySelector(".modal-panel");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const onEnd = (event) => {
        if (event.target !== panel || event.propertyName !== "transform") return;
        finish();
      };
      const finish = () => {
        if (epoch !== this.modalEpoch) return;
        if (this.modalCloseTimer) {
          window.clearTimeout(this.modalCloseTimer);
          this.modalCloseTimer = null;
        }
        if (panel) panel.removeEventListener("transitionend", onEnd);
        this.modalClosePanel = null;
        this.modalCloseHandler = null;
        const closedEpoch = epoch + 1;
        this.modalEpoch = closedEpoch;
        modal.classList.remove("is-open", "is-settled", "is-closing");
        modal.hidden = true;
        this.unlockPageScroll();
        this.galleryImages = [];
        this.galleryIndex = 0;
        this.galleryTitle = "";
        window.requestAnimationFrame(() => {
          if (this.modalEpoch !== closedEpoch) return;
          const marquee = document.getElementById("projectsMarquee");
          if (marquee) marquee.classList.remove("is-modal-paused");
        });
      };
      if (reduced || !modal.classList.contains("is-settled")) {
        finish();
        return;
      }
      modal.classList.add("is-closing");
      this.modalClosePanel = panel;
      this.modalCloseHandler = onEnd;
      if (panel) panel.addEventListener("transitionend", onEnd);
      this.modalCloseTimer = window.setTimeout(finish, 800);
    },

    renderWork() {
      const root = document.getElementById("workTimeline");
      root.innerHTML = groupWork(this.data.workExperience)
        .map((group) => {
          if (group.roles.length === 1) {
            const job = group.roles[0];
            const extra = job.partnerLogo ? " has-partner" : "";
            return `
          <article class="timeline-item job-card reveal is-collapsed${extra}" data-expando>
            <header class="job-head">
              ${jobLogos(job)}
              <div class="job-copy">
                <h3>${escapeHtml(job.position)}</h3>
                ${jobHeadline(job)}
                ${jobWhen(job)}
              </div>
              ${expandButton()}
            </header>
            <div class="job-body">
              ${jobInsights(job)}
              ${jobSummary(job)}
              <ul>${job.responsibilities.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
              ${roleSkills(job)}
            </div>
          </article>`;
          }

          const newest = group.roles[0];
          const oldest = group.roles[group.roles.length - 1];
          const roles = group.roles
            .map((job) => `<li class="role-item">${roleCopy(job)}</li>`)
            .join("");

          return `
          <article class="company-card reveal is-collapsed" data-expando>
            <header class="company-head">
              ${jobLogos(newest)}
              <div class="job-copy">
                <h3>${escapeHtml(group.company)}</h3>
                <p class="when">${escapeHtml([group.location, dateRange(oldest.startDate, newest.endDate), jobType(newest)].filter(Boolean).join(" · "))}</p>
                ${jobSite(newest)}
              </div>
              ${expandButton()}
            </header>
            <ol class="role-path">${roles}</ol>
          </article>`;
        })
        .join("");
      this.bindExpandos();
    },

    bindExpandos() {
      const root = document.getElementById("workTimeline");
      if (!root) return;
      root.querySelectorAll("[data-expando]").forEach((card) => {
        const btn = card.querySelector(".expando-btn");
        const header = card.querySelector(".job-head, .company-head");
        if (!btn || !header) return;
        const setOpen = (open) => {
          card.classList.toggle("is-open", open);
          card.classList.toggle("is-collapsed", !open);
          btn.setAttribute("aria-expanded", String(open));
          btn.setAttribute("aria-label", open ? "Hide details" : "Show details");
        };
        btn.addEventListener("click", (event) => {
          event.stopPropagation();
          setOpen(!card.classList.contains("is-open"));
        });
        header.addEventListener("click", (event) => {
          if (event.target.closest("a")) return;
          setOpen(!card.classList.contains("is-open"));
        });
      });
    },

    renderEducation() {
      const root = document.getElementById("eduTimeline");
      root.innerHTML = this.data.education
        .map((edu) => {
          const honors = edu.honors ? `<p class="edu-honors">${escapeHtml(edu.honors.join(" · "))}</p>` : "";
          return `
          <article class="timeline-item reveal">
            <img src="${escapeHtml(edu.logo)}" alt="${escapeHtml(edu.institution)}" width="72" height="72" loading="lazy" decoding="async" />
            <div>
              <h3>${escapeHtml(edu.institution)}</h3>
              <p class="edu-degree">${escapeHtml(edu.degree).replace("1st", "1<sup>st</sup>")}</p>
              <p class="when">${escapeHtml(edu.field)} · ${escapeHtml(edu.graduationDate)}</p>
              ${honors}
            </div>
          </article>`;
        })
        .join("");
    },

    renderSkills() {
      const labels = {
        gis: "GIS and mapping",
        programming: "Programming",
        remoteSensing: "Remote sensing"
      };
      const root = document.getElementById("skillsGrid");
      if (!root) return;
      root.innerHTML = Object.keys(this.data.skills)
        .map((key) => {
          const tags = this.data.skills[key].map((s) => `<li>${escapeHtml(s.name)}</li>`).join("");
          return `<article class="skill-card reveal"><h3>${escapeHtml(labels[key] || key)}</h3><ul class="tag-list">${tags}</ul></article>`;
        })
        .join("");
    }
  };

  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", () => PortfolioUI.closeModal());
  });

  document.addEventListener("keydown", (event) => {
    const modal = document.getElementById("projectModal");
    const open = modal && modal.classList.contains("is-open");
    if (event.key === "Escape") {
      PortfolioUI.closeModal();
      return;
    }
    if (!open || PortfolioUI.galleryImages.length < 2) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      PortfolioUI.showGallery(PortfolioUI.galleryIndex + 1);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      PortfolioUI.showGallery(PortfolioUI.galleryIndex - 1);
    }
  });

  global.PortfolioUI = PortfolioUI;
})(window);
