(function (global) {
  "use strict";

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
    return webp ? `<picture><source srcset="${escapeHtml(encodeURI(webp))}" type="image/webp" />${img}</picture>` : img;
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
    const main = `<span class="logo-slot"><span class="logo-frame logo-frame-circle${fill}"><img src="${escapeHtml(job.logo)}" alt="${escapeHtml(job.company)}" width="62" height="62" loading="lazy" decoding="async" /></span>${expandButton()}</span>`;
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
    const badge = info.badge
      ? `<div class="insight-rated">
          <span class="insight-hex" aria-hidden="true">
            <svg class="insight-hex-shape" viewBox="0 0 38 42">
              <polygon points="19,3 34,11.7 34,30.3 19,39 4,30.3 4,11.7" fill="currentColor" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>
            </svg>
            <svg class="insight-hex-star" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
              <path d="M10.84 4.83 Q12.00 3.20 13.16 4.83 L14.48 6.66 Q15.17 7.63 16.32 7.99 L18.46 8.68 Q20.37 9.28 19.18 10.89 L17.85 12.70 Q17.14 13.67 17.14 14.87 L17.16 17.12 Q17.17 19.12 15.27 18.49 L13.14 17.78 Q12.00 17.40 10.86 17.78 L8.73 18.49 Q6.83 19.12 6.84 17.12 L6.86 14.87 Q6.86 13.67 6.15 12.70 L4.82 10.89 Q3.63 9.28 5.54 8.68 L7.68 7.99 Q8.83 7.63 9.52 6.66 Z"/>
            </svg>
          </span>
          <div>
            <strong>${escapeHtml(info.badge)}</strong>
            <span>Recognized talent</span>
          </div>
        </div>`
      : "";
    const jss = Number(info.jss) || 0;
    const score = info.jss != null
      ? `<div class="insight-jss">
          <span class="insight-score" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">
              <path d="M4.5 15.5 L3.5 7.5 L8.5 11 L12 5 L15.5 11 L20.5 7.5 L19.5 15.5 Z"/>
              <path d="M5.5 20 H18.5"/>
            </svg>
          </span>
          <strong class="insight-pct">${jss}%</strong>
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
    return `<button type="button" class="expando-btn" aria-expanded="false" aria-label="Show details"><span class="expando-mark" aria-hidden="true"></span></button>`;
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
    marqueeSpeed: 72,
    marqueeVelocity: 70,
    marqueeHolding: false,
    marqueeNudged: false,
    marqueeNudging: false,
    marqueeDidDrag: false,
    marqueeDragBound: false,
    marqueeFling: 0,
    marqueePlaying: true,
    allFilter: "all",

    bindSiteFeedback(email) {
      const form = document.getElementById("siteFeedback");
      if (!form) return;
      if (email) form.dataset.email = email;
      if (form.dataset.bound === "true") return;
      form.dataset.bound = "true";
      const opened = Date.now();
      const field = form.querySelector("[name='note']");
      const emailField = form.querySelector("[name='email']");
      const wrap = document.getElementById("siteNoteField");
      const emailWrap = document.getElementById("siteEmailField");
      const status = document.getElementById("siteNoteStatus");
      const emailStatus = document.getElementById("siteEmailStatus");
      let touched = false;
      const emailOk = (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const paint = () => {
        const note = field ? field.value.trim() : "";
        const mail = emailField ? emailField.value.trim() : "";
        if (wrap) wrap.classList.remove("is-bad", "is-good");
        if (emailWrap) emailWrap.classList.remove("is-bad", "is-good");
        let validMail = true;
        if (!touched) {
          if (status) status.textContent = "At least a short sentence.";
          if (field) field.removeAttribute("aria-invalid");
          if (emailField) emailField.removeAttribute("aria-invalid");
          return note.length >= 8;
        }
        if (mail && !emailOk(mail)) {
          validMail = false;
          if (emailWrap) emailWrap.classList.add("is-bad");
          if (emailStatus) emailStatus.textContent = "Check the email, or leave it blank.";
          if (emailField) emailField.setAttribute("aria-invalid", "true");
        } else if (mail) {
          if (emailWrap) emailWrap.classList.add("is-good");
          if (emailStatus) emailStatus.textContent = "A reply can go to this email.";
          if (emailField) emailField.setAttribute("aria-invalid", "false");
        } else if (emailStatus) {
          emailStatus.textContent = "Add an email if you want a reply.";
          if (emailField) emailField.removeAttribute("aria-invalid");
        }
        if (!note) {
          if (wrap) wrap.classList.add("is-bad");
          if (status) status.textContent = "Write a short note.";
          if (field) field.setAttribute("aria-invalid", "true");
          return false;
        }
        if (note.length < 8) {
          if (wrap) wrap.classList.add("is-bad");
          if (status) status.textContent = "A little more, please.";
          if (field) field.setAttribute("aria-invalid", "true");
          return false;
        }
        if (wrap) wrap.classList.add("is-good");
        if (status) status.textContent = "Ready to send.";
        if (field) field.setAttribute("aria-invalid", "false");
        return validMail;
      };
      if (field) {
        field.addEventListener("input", () => {
          touched = true;
          paint();
        });
      }
      if (emailField) {
        emailField.addEventListener("input", () => {
          touched = true;
          paint();
        });
      }
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        touched = true;
        if (!paint()) {
          const mail = emailField ? emailField.value.trim() : "";
          if (mail && !emailOk(mail) && emailField) emailField.focus();
          else if (field) field.focus();
          return;
        }
        const data = new FormData(form);
        if (String(data.get("_honey") || "").trim()) {
          form.classList.add("is-sent");
          const sent = document.getElementById("siteSent");
          if (sent) sent.hidden = false;
          return;
        }
        const endpoint = (form.dataset.endpoint || "").trim();
        const note = String(data.get("note") || "").trim();
        const name = String(data.get("name") || "").trim();
        const visitor = String(data.get("email") || "").trim();
        const kind = String(data.get("kind") || "Message");
        const button = form.querySelector("[type='submit']");
        if (!endpoint) {
          if (wrap) wrap.classList.add("is-bad");
          if (status) status.textContent = "This form is not connected yet.";
          return;
        }
        if (button) {
          button.disabled = true;
          button.textContent = "Sending…";
        }
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              name: name || "Site visitor",
              email: visitor,
              message: note,
              type: kind,
              opened: opened,
              _honey: ""
            })
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || result.ok === false) {
            const error = new Error(result.error || "send");
            error.code = result.error || "";
            throw error;
          }
          const sent = document.getElementById("siteSent");
          if (sent) sent.hidden = false;
          form.classList.add("is-sent");
        } catch (err) {
          const code = err && err.code;
          if (code === "limit") {
            if (status) status.textContent = "Too many notes were sent. Please try again later.";
          } else if (code === "email" && emailWrap) {
            emailWrap.classList.add("is-bad");
            if (emailStatus) emailStatus.textContent = "Check the email, or leave it blank.";
          } else if (status) {
            status.textContent = "Could not send it. Please try again.";
          }
          if (wrap && code !== "email") wrap.classList.add("is-bad");
        } finally {
          if (button) {
            button.disabled = false;
            button.textContent = "Send";
          }
        }
      });
    },

    render(data) {
      this.data = data;
      const info = data.personalInfo;

      document.getElementById("heroAbout").textContent = info.about;
      document.getElementById("heroEmail").href = "mailto:" + info.email;
      document.getElementById("navEmail").href = "mailto:" + info.email;
      document.getElementById("heroPhoto").src = info.profileImage;
      setCount("statYears", 5, "+");
      setCount("statProjects", 120, "+");
      setCount("statCountries", 7, "+");
      document.getElementById("statNow").textContent = info.currentCompany;
      document.getElementById("heroRoles").textContent = "GIS Solutions Engineer";

      document.getElementById("navGithub").href = info.social.github;
      document.getElementById("navLinkedin").href = info.social.linkedin;
      document.getElementById("contactGithub").href = info.social.github;
      document.getElementById("contactLinkedin").href = info.social.linkedin;
      document.getElementById("contactEmail").href = "mailto:" + info.email;
      document.getElementById("contactEmail").textContent = info.email;
      document.getElementById("contactMail").href = "mailto:" + info.email;
      this.bindSiteFeedback(info.email);
      document.getElementById("contactLocation").textContent = info.location;
      document.getElementById("contactRole").textContent =
        info.currentPosition + " at " + info.currentCompany;
      document.getElementById("cvLink").href = info.cvUrl;
      document.getElementById("resumeLink").href = info.resumeUrl;
      document.getElementById("footerCopy").textContent =
        "© " + new Date().getFullYear() + " " + info.name;

      this.renderProjects();
      this.renderWork();
      this.renderEducation();
      this.renderSkills();
      this.bindProjectActions();
      this.bindFlowControls();
      this.bindMarqueeDrag();
    },

    projectCardHtml(project, clone) {
          const image = project.images && project.images[0] ? project.images[0] : "";
      const hidden = clone ? ' aria-hidden="true"' : "";
      const leadVideo = project.videoUrl && (project.leadMedia === "video" || !image);
      const media = leadVideo
        ? `<video class="project-card-video" data-lazy-video src="${escapeHtml(encodeURI(project.videoUrl))}" muted loop playsinline preload="none" disablepictureinpicture width="640" height="360"></video>`
        : pictureHtml(
            image,
            `alt="${clone ? "" : escapeHtml(project.title)}" loading="lazy" decoding="async" width="640" height="360" onerror="${IMG_FALLBACK}"`
          );
          return `
        <article class="project-card" data-project-id="${escapeHtml(project.id)}" data-open-project="${escapeHtml(project.id)}" role="button" tabindex="${clone ? "-1" : "0"}" aria-label="${clone ? "" : escapeHtml(project.title)}"${hidden}>
          <div class="project-card-media">${media}</div>
          <h3 class="project-card-title">${escapeHtml(project.title)}</h3>
            </article>`;
    },

    dismissPanHint() {
      const hint = document.getElementById("projectsHint");
      if (hint) hint.classList.add("is-gone");
    },

    syncPlayButton() {
      const button = document.getElementById("projectsPlay");
      const label = document.getElementById("projectsPlayLabel");
      const icon = button && button.querySelector(".projects-ctl-icon");
      if (!button || !label || !icon) return;
      const playing = this.marqueePlaying;
      button.setAttribute("aria-pressed", playing ? "false" : "true");
      label.textContent = playing ? "Pause" : "Play";
      icon.innerHTML = playing
        ? '<path d="M7 5h3.2v14H7zM13.8 5H17v14h-3.2z"/>'
        : '<path d="M8 5v14l11-7z"/>';
    },

    renderAllProjects() {
      const grid = document.getElementById("projectsAllGrid");
      const count = document.getElementById("projectsAllCount");
      const chips = document.getElementById("projectsAllChips");
      if (!grid || !this.data) return;
      const projects = this.data.projects || [];
      const filter = this.allFilter || "all";
      const list = projects.filter((project) => filter === "all" || (project.category || "professional") === filter);
      if (chips && !chips.childElementCount) {
        [
          ["all", "All"],
          ["professional", "Professional"],
          ["academic", "Academic"]
        ].forEach(([id, name]) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "all-chip" + (id === filter ? " is-on" : "");
          button.textContent = name;
          button.addEventListener("click", () => {
            this.allFilter = id;
            chips.querySelectorAll(".all-chip").forEach((chip) => {
              chip.classList.toggle("is-on", chip === button);
            });
            this.renderAllProjects();
          });
          chips.appendChild(button);
        });
      }
      grid.innerHTML = list.map((project) => this.projectCardHtml(project, false)).join("");
      grid.querySelectorAll(".project-card").forEach((card, index) => {
        card.style.setProperty("--i", String(index));
      });
      if (count) count.textContent = list.length + (list.length === 1 ? " project" : " projects");
      this.bindCardVideos();
    },

    openAllProjects() {
      const modal = document.getElementById("projectsAllModal");
      const marquee = document.getElementById("projectsMarquee");
      if (!modal) return;
      if (this.allCloseTimer) {
        window.clearTimeout(this.allCloseTimer);
        this.allCloseTimer = null;
      }
      if (this.allClosePanel && this.allCloseHandler) {
        this.allClosePanel.removeEventListener("transitionend", this.allCloseHandler);
        this.allClosePanel = null;
        this.allCloseHandler = null;
      }
      this.allFilter = "all";
      const chips = document.getElementById("projectsAllChips");
      if (chips) chips.innerHTML = "";
      this.renderAllProjects();
      if (marquee) marquee.classList.add("is-modal-paused");
      this.lockPageScroll();
      modal.classList.remove("is-closing", "is-settled");
      modal.hidden = false;
      modal.classList.add("is-open");
      const grid = document.getElementById("projectsAllGrid");
      if (grid) grid.scrollTop = 0;
      window.requestAnimationFrame(() => this.bindCardVideos());
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        modal.classList.add("is-settled");
        return;
      }
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (modal.hidden || modal.classList.contains("is-closing")) return;
          modal.classList.add("is-settled");
        });
      });
    },

    closeAllProjects(options) {
      const modal = document.getElementById("projectsAllModal");
      const marquee = document.getElementById("projectsMarquee");
      if (!modal || modal.hidden || modal.classList.contains("is-closing")) return;
      const keepLock = options && options.keepLock;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const panel = modal.querySelector(".modal-panel");
      const finish = () => {
        if (modal.hidden) return;
        if (this.allCloseTimer) {
          window.clearTimeout(this.allCloseTimer);
          this.allCloseTimer = null;
        }
        if (panel && this.allCloseHandler) panel.removeEventListener("transitionend", this.allCloseHandler);
        this.allClosePanel = null;
        this.allCloseHandler = null;
        modal.querySelectorAll("video").forEach((video) => video.pause());
        modal.classList.remove("is-open", "is-settled", "is-closing");
        modal.hidden = true;
        if (!keepLock) {
          this.unlockPageScroll();
          if (marquee) marquee.classList.remove("is-modal-paused");
        }
      };
      if (keepLock || reduced || !modal.classList.contains("is-settled")) {
        finish();
        return;
      }
      const onEnd = (event) => {
        if (event.target !== panel || event.propertyName !== "transform") return;
        finish();
      };
      this.allClosePanel = panel;
      this.allCloseHandler = onEnd;
      modal.classList.add("is-closing");
      if (panel) panel.addEventListener("transitionend", onEnd);
      this.allCloseTimer = window.setTimeout(finish, 420);
    },

    bindFlowControls() {
      if (this.flowBound) return;
      this.flowBound = true;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.marqueePlaying = !reduced;
      const play = document.getElementById("projectsPlay");
      if (play) {
        if (reduced) play.hidden = true;
        else {
          play.addEventListener("click", () => {
            this.marqueePlaying = !this.marqueePlaying;
            if (!this.marqueePlaying) {
              this.marqueeVelocity = 0;
              this.marqueeFling = 0;
            }
            this.syncPlayButton();
          });
        }
      }
      this.syncPlayButton();
      const all = document.getElementById("projectsAll");
      if (all) all.addEventListener("click", () => this.openAllProjects());
      const modal = document.getElementById("projectsAllModal");
      if (modal) {
        modal.addEventListener("click", (event) => {
          if (event.target.closest("[data-close-all]")) {
            this.closeAllProjects();
            return;
          }
          const card = event.target.closest("[data-open-project]");
          if (!card || !modal.contains(card)) return;
          const id = card.getAttribute("data-open-project");
          this.closeAllProjects({ keepLock: true });
          this.openModal(id, card);
        });
      }
      document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;
        const allModal = document.getElementById("projectsAllModal");
        if (allModal && !allModal.hidden) this.closeAllProjects();
      });
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
      if (!this.marqueePlaying) return true;
      if (this.marqueeHolding || this.marqueeDragging) return true;
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
      this.marqueeSpeed = 72;
      this.marqueeVelocity = this.marqueePlaying ? 72 : 0;
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
        if (!this.marqueePlaying || hovering) {
          this.marqueeVelocity = 0;
          if (hovering) this.marqueeFling = 0;
        } else {
          const target = this.marqueeAutoplayPaused() ? 0 : this.marqueeSpeed;
          this.marqueeVelocity += (target - this.marqueeVelocity) * (1 - Math.exp(-dt * 2.2));
        }
        if (!this.marqueeDragging && !this.marqueeNudging) {
          if (this.marqueeFling) {
            this.marqueeShift += this.marqueeFling * dt;
            this.marqueeFling *= Math.exp(-dt * 3);
            if (Math.abs(this.marqueeFling) < 80) this.marqueeFling = 0;
          }
          if (this.marqueeVelocity) this.marqueeShift += this.marqueeVelocity * dt;
        }
        this.wrapMarqueeShift();
        this.applyMarqueeFrame();
      };
      this.marqueeRaf = requestAnimationFrame(tick);
      this.nudgeMarqueeOnce();
    },

    nudgeMarqueeOnce() {
      if (this.marqueeNudged) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (!window.matchMedia("(max-width: 767px)").matches) return;
      const marquee = document.getElementById("projectsMarquee");
      if (!marquee || !("IntersectionObserver" in window)) return;
      const watcher = new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting || this.marqueeNudged) return;
        this.marqueeNudged = true;
        watcher.disconnect();
        const start = this.marqueeShift;
        const distance = 46;
        const duration = 720;
        const began = performance.now();
        this.marqueeNudging = true;
        const step = (now) => {
          const t = Math.min(1, (now - began) / duration);
          this.marqueeShift = start - distance * Math.sin(t * Math.PI);
          this.wrapMarqueeShift();
          this.applyMarqueeFrame();
          if (t < 1) {
            requestAnimationFrame(step);
            return;
          }
          this.marqueeNudging = false;
        };
        requestAnimationFrame(step);
      }, { threshold: 0.45 });
      watcher.observe(marquee);
    },

    bindMarqueeDrag() {
      const marquee = document.getElementById("projectsMarquee");
      if (!marquee || this.marqueeDragBound) return;
      this.marqueeDragBound = true;
      let startX = 0;
      let startShift = 0;
      let holding = false;
      let lastX = 0;
      let lastTime = 0;
      let pointerSpeed = 0;

      const dragGain = (dx) => {
        const span = Math.max(window.innerWidth, 320);
        const travel = Math.min(1.35, Math.abs(dx) / span);
        const coarse = window.matchMedia("(pointer: coarse)").matches;
        const base = coarse ? 3.1 : 1.55;
        const boost = coarse ? 7.5 : 2.8;
        return base + travel * travel * boost;
      };

      marquee.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        if (!this.marqueeLoop) return;
        holding = true;
        this.marqueeHolding = true;
        this.marqueeDragging = false;
        this.marqueeDidDrag = false;
        this.marqueeFling = 0;
        startX = event.clientX;
        startShift = this.marqueeShift;
        lastX = event.clientX;
        lastTime = event.timeStamp;
        pointerSpeed = 0;
      });

      marquee.addEventListener("pointermove", (event) => {
        if (!holding) return;
        const dx = event.clientX - startX;
        const stepTime = event.timeStamp - lastTime;
        if (stepTime > 0 && stepTime < 80) pointerSpeed = ((event.clientX - lastX) / stepTime) * 1000;
        lastX = event.clientX;
        lastTime = event.timeStamp;
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
        const gain = dragGain(dx);
        if (Math.abs(dx) > 12) this.dismissPanHint();
        this.marqueeShift = startShift + dx * gain;
        this.wrapMarqueeShift();
        this.applyMarqueeFrame();
      });

      const endDrag = () => {
        if (holding && this.marqueeDragging) {
          const dx = lastX - startX;
          const gain = dragGain(dx);
          const fling = Math.max(-4000, Math.min(4000, pointerSpeed * gain));
          if (Math.abs(fling) > 500) this.marqueeFling = fling;
        }
        holding = false;
        this.marqueeHolding = false;
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
      if (this.allVideoObserver) {
        this.allVideoObserver.disconnect();
        this.allVideoObserver = null;
      }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const prepare = (video) => {
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.loop = true;
        if (reduced) video.pause();
      };
      const watch = (videos, root) => {
        if (!videos.length || reduced) return null;
        const observer = new IntersectionObserver(
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
          { root: root || null, threshold: 0.35 }
        );
        videos.forEach((video) => observer.observe(video));
        return observer;
      };
      const marquee = document.getElementById("projectsMarquee");
      const grid = document.getElementById("projectsAllGrid");
      const marqueeVideos = marquee ? Array.from(marquee.querySelectorAll(".project-card-video")) : [];
      const gridVideos = grid ? Array.from(grid.querySelectorAll(".project-card-video")) : [];
      marqueeVideos.forEach(prepare);
      gridVideos.forEach(prepare);
      this.cardVideoObserver = watch(marqueeVideos, marquee);
      this.allVideoObserver = watch(gridVideos, grid);
    },

    focusProjectCard(projectId) {
      const marquee = document.getElementById("projectsMarquee");
      const track = document.getElementById("projectsGrid");
      if (!marquee || !track || !projectId) return;
      let card = null;
      track.querySelectorAll(".project-card").forEach((item) => {
        if (card || item.getAttribute("aria-hidden") === "true") return;
        if (item.getAttribute("data-project-id") === projectId) card = item;
      });
      if (!card) return;
      const marqueeRect = marquee.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const delta = cardRect.left - marqueeRect.left - Math.max(16, (marquee.clientWidth - cardRect.width) / 2);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced || !track.classList.contains("is-js") || !this.marqueeLoop) {
        marquee.scrollTo({ left: Math.max(0, marquee.scrollLeft + delta), behavior: reduced ? "auto" : "smooth" });
        return;
      }
      this.marqueeShift -= delta;
      this.marqueeVelocity = 0;
      this.wrapMarqueeShift();
      this.applyMarqueeFrame();
    },

    highlightProject(projectId, options) {
      const marquee = document.getElementById("projectsMarquee");
      document.querySelectorAll(".project-card").forEach((card) => {
        card.classList.toggle("is-highlighted", card.getAttribute("data-project-id") === projectId);
      });
      if (marquee) marquee.classList.toggle("is-paused", !!projectId);
      if (options && options.scroll) this.focusProjectCard(projectId);
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

    slideImage(src, alt) {
      const webp = webpPath(src);
      const fallback = webp
        ? ` data-fallback="${escapeHtml(src)}" onerror="this.onerror=null;this.src=this.dataset.fallback"`
        : "";
      return `<img src="${escapeHtml(webp || src)}" alt="${escapeHtml(alt)}" draggable="false"${fallback}>`;
    },

    bindProjectSheet() {
      if (this.sheetBound) return;
      this.sheetBound = true;
      const stage = document.getElementById("sheetStage");
      const track = document.getElementById("sheetTrack");
      const body = document.getElementById("modalBody");
      const prog = document.getElementById("sheetProg");
      const zoom = document.getElementById("sheetZoom");
      const lb = document.getElementById("sheetLb");
      const lbImg = document.getElementById("sheetLbImg");
      const lbClose = document.getElementById("sheetLbClose");
      const grab = document.getElementById("projectGrab");
      const panel = document.querySelector("#projectModal .modal-panel");
      const prev = document.getElementById("projectPrev");
      const next = document.getElementById("projectNext");
      if (prev) prev.addEventListener("click", () => this.stepProject(-1));
      if (next) next.addEventListener("click", () => this.stepProject(1));
      document.querySelectorAll("#projectModal [data-gallery-step]").forEach((btn) => {
        btn.addEventListener("click", () => this.showGallery(this.galleryIndex + Number(btn.getAttribute("data-gallery-step"))));
      });
      if (zoom) {
        zoom.addEventListener("click", () => {
          const item = (this.galleryItems || [])[this.galleryIndex];
          const src = item && item.type === "image" ? item.src : "";
          if (!src || !lb || !lbImg) return;
          const webp = webpPath(src);
          lbImg.src = webp || src;
          lbImg.alt = (this.galleryTitle || "Project") + " image " + (this.galleryIndex + 1);
          if (webp) {
            lbImg.dataset.fallback = src;
            lbImg.onerror = function () {
              this.onerror = null;
              this.src = this.dataset.fallback;
            };
          }
          lb.hidden = false;
        });
      }
      const hideLb = () => {
        if (!lb) return;
        lb.hidden = true;
        if (lbImg) lbImg.removeAttribute("src");
      };
      if (lbClose) lbClose.addEventListener("click", hideLb);
      if (lb) lb.addEventListener("click", (event) => { if (event.target === lb) hideLb(); });
      this.hideSheetLightbox = hideLb;
      if (body && prog) {
        body.addEventListener("scroll", () => {
          const span = body.scrollHeight - body.clientHeight;
          prog.style.transform = "scaleX(" + (span > 0 ? body.scrollTop / span : 0) + ")";
        }, { passive: true });
      }
      if (stage && track) {
        let startX = null;
        let delta = 0;
        stage.addEventListener("pointerdown", (event) => {
          if (event.target.closest("button")) return;
          startX = event.clientX;
          delta = 0;
          track.classList.add("is-drag");
        });
        stage.addEventListener("pointermove", (event) => {
          if (startX == null) return;
          delta = event.clientX - startX;
          track.style.transform = "translateX(calc(" + (-this.galleryIndex * 100) + "% + " + delta + "px))";
        });
        const endSwipe = () => {
          if (startX == null) return;
          startX = null;
          track.classList.remove("is-drag");
          if (Math.abs(delta) > 50) this.showGallery(this.galleryIndex + (delta < 0 ? 1 : -1));
          else this.showGallery(this.galleryIndex);
        };
        stage.addEventListener("pointerup", endSwipe);
        stage.addEventListener("pointercancel", endSwipe);
      }
      if (grab && panel) {
        let startY = null;
        grab.addEventListener("pointerdown", (event) => {
          if (!window.matchMedia("(max-width: 820px)").matches) return;
          startY = event.clientY;
          panel.style.transition = "none";
        });
        grab.addEventListener("pointermove", (event) => {
          if (startY == null) return;
          panel.style.transform = "translateY(" + Math.max(0, event.clientY - startY) + "px)";
        });
        const endGrab = (event) => {
          if (startY == null) return;
          const distance = event.clientY - startY;
          startY = null;
          panel.style.transition = "";
          if (distance > 110) {
            panel.style.transform = "";
            this.closeModal();
          } else {
            panel.style.transform = "";
          }
        };
        grab.addEventListener("pointerup", endGrab);
        grab.addEventListener("pointercancel", endGrab);
      }
    },

    stepProject(direction) {
      const list = (this.data && this.data.projects) || [];
      const index = list.findIndex((item) => item.id === this.modalProjectId);
      if (index < 0 || !list.length) return;
      const next = list[(index + direction + list.length) % list.length];
      this.openModal(next.id);
    },

    openModal(projectId, origin) {
      const list = this.data.projects || [];
      const project = list.find((item) => item.id === projectId);
      if (!project) return;
      this.bindProjectSheet();
      if (this.hideSheetLightbox) this.hideSheetLightbox();
      const body = document.getElementById("modalBody");
      const track = document.getElementById("sheetTrack");
      const thumbs = document.getElementById("sheetThumbs");
      const images = project.images || [];
      const title = document.getElementById("modalTitle");
      const kicker = document.getElementById("modalKicker");
      const meta = document.getElementById("modalMeta");
      const pos = document.getElementById("projectPos");
      const index = list.findIndex((item) => item.id === project.id);
      const category = project.category ? project.category.charAt(0).toUpperCase() + project.category.slice(1) : "";
      if (title) title.textContent = project.title;
      if (kicker) kicker.textContent = category;
      if (meta) {
        const bits = [project.company, project.year, project.location && project.location.name, project.subtitle].filter(Boolean);
        meta.innerHTML = bits.map((bit) => `<li>${escapeHtml(bit)}</li>`).join("");
      }
      if (pos) pos.textContent = "Project " + (index + 1) + " of " + list.length;

      const check = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>';
      const features = (project.features || []).map((item) => `<li>${check}<span>${escapeHtml(item)}</span></li>`).join("");
      const tools = (project.technologies || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("");
      const links = [];
      if (project.demoUrl) links.push(`<a class="btn btn-primary" href="${escapeHtml(project.demoUrl)}" target="_blank" rel="noopener noreferrer">Live app</a>`);
      if (project.githubUrl) links.push(`<a class="btn btn-outline" href="${escapeHtml(project.githubUrl)}" target="_blank" rel="noopener noreferrer">GitHub</a>`);
      if (project.documentationUrl) links.push(`<a class="btn btn-outline" href="${escapeHtml(project.documentationUrl)}" target="_blank" rel="noopener noreferrer">API docs</a>`);
      if (project.presentationUrl) links.push(`<a class="btn btn-outline" href="${escapeHtml(project.presentationUrl)}" target="_blank" rel="noopener noreferrer">Presentation</a>`);
      const collab = project.collaborators
        ? `<p class="sheet-with"><strong>With:</strong> ${escapeHtml(project.collaborators.join(", "))}</p>`
        : "";
      const outcome = project.description
        ? `<div class="sheet-out"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg><span>${escapeHtml(project.description)}</span></div>`
        : "";

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const items = [];
      if (project.videoUrl) items.push({ type: "video", src: project.videoUrl });
      images.forEach((src) => items.push({ type: "image", src }));
      const playMark = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 7.5v9l8-4.5z"/></svg>';
      if (track) {
        track.innerHTML = items.map((item, itemIndex) => {
          const on = itemIndex === 0 ? " is-on" : "";
          if (item.type === "video") {
            const autoplay = project.leadMedia === "video" && !reducedMotion ? " autoplay muted" : "";
            return `<div class="sheet-slide is-video${on}"><video src="${escapeHtml(encodeURI(item.src))}" controls playsinline preload="metadata"${autoplay}></video></div>`;
          }
          return `<div class="sheet-slide${on}">${this.slideImage(item.src, project.title)}</div>`;
        }).join("");
        track.style.transform = "translateX(0)";
      }
      if (thumbs) {
        thumbs.innerHTML = items.map((item, itemIndex) => {
          const on = itemIndex === 0 ? " is-on" : "";
          if (item.type === "video") {
            return `<button type="button" class="sheet-thumb is-video${on}" data-thumb-index="${itemIndex}" aria-label="Play video">${playMark}</button>`;
          }
          return `<button type="button" class="sheet-thumb${on}" data-thumb-index="${itemIndex}" aria-label="Show image ${itemIndex + 1}">${pictureHtml(item.src, 'alt=""')}</button>`;
        }).join("");
        thumbs.hidden = items.length < 2;
        thumbs.querySelectorAll("[data-thumb-index]").forEach((btn) => {
          btn.addEventListener("click", () => this.showGallery(Number(btn.getAttribute("data-thumb-index"))));
        });
      }
      const media = document.querySelector("#projectModal .sheet-media");
      if (media) media.classList.toggle("is-single", items.length < 2);
      const count = document.getElementById("galleryCount");
      if (count) {
        count.hidden = items.length < 2;
        count.textContent = items.length ? "1 / " + items.length : "";
      }

      body.innerHTML = `
        ${outcome}
        ${tools ? `<h3>Technologies</h3><div class="sheet-chips">${tools}</div>` : ""}
        ${project.longDescription ? `<h3>Overview</h3><p class="sheet-copy">${escapeHtml(project.longDescription)}</p>` : ""}
        ${collab}
        ${features ? `<h3>What it does</h3><ul class="sheet-checks">${features}</ul>` : ""}
        ${links.length ? `<div class="modal-links">${links.join("")}</div>` : ""}
      `;
      body.scrollTop = 0;
      const prog = document.getElementById("sheetProg");
      if (prog) prog.style.transform = "scaleX(0)";

      this.modalProjectId = project.id;
      this.galleryItems = items;
      this.galleryImages = images;
      this.galleryIndex = 0;
      this.galleryTitle = project.title;
      this.showGallery(0);

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
      if (panel) panel.style.transform = "";
      if (panel && !reduced && origin) {
        const panelRect = panel.getBoundingClientRect();
        const cardRect = origin.getBoundingClientRect();
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
      const items = this.galleryItems || [];
      if (!items.length) return;
      this.galleryIndex = (index + items.length) % items.length;
      const track = document.getElementById("sheetTrack");
      const count = document.getElementById("galleryCount");
      const zoom = document.getElementById("sheetZoom");
      const current = items[this.galleryIndex];
      if (track && !track.classList.contains("is-drag")) {
        track.style.transform = "translateX(" + (-this.galleryIndex * 100) + "%)";
      }
      if (track) {
        track.querySelectorAll(".sheet-slide").forEach((slide, slideIndex) => {
          slide.classList.toggle("is-on", slideIndex === this.galleryIndex);
          const clip = slide.querySelector("video");
          if (clip && slideIndex !== this.galleryIndex) clip.pause();
        });
      }
      if (count) count.textContent = this.galleryIndex + 1 + " / " + items.length;
      if (zoom) zoom.hidden = !current || current.type !== "image";
      document.querySelectorAll("#sheetThumbs [data-thumb-index]").forEach((btn) => {
        const on = Number(btn.getAttribute("data-thumb-index")) === this.galleryIndex;
        btn.classList.toggle("is-on", on);
        btn.setAttribute("aria-current", on ? "true" : "false");
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
        if (this.hideSheetLightbox) this.hideSheetLightbox();
        this.unlockPageScroll();
        this.galleryImages = [];
        this.galleryItems = [];
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
            </header>
            <div class="job-slide">
            <div class="job-body">
              ${jobInsights(job)}
              ${jobSummary(job)}
              <ul>${job.responsibilities.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
              ${roleSkills(job)}
            </div>
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
            </header>
            <div class="job-slide">
            <ol class="role-path">${roles}</ol>
            </div>
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
      const light = document.getElementById("sheetLb");
      if (light && !light.hidden) {
        light.hidden = true;
        const image = document.getElementById("sheetLbImg");
        if (image) image.removeAttribute("src");
        return;
      }
      PortfolioUI.closeModal();
      return;
    }
    if (!open || !(PortfolioUI.galleryItems || []).length || PortfolioUI.galleryItems.length < 2) return;
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
