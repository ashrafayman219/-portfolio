(function () {
  "use strict";

  /* FAQ chat - answers only from the local knowledge list below. */

  var KB = [
    {
      k: ["hello", "hi", "hey", "salam", "salaam", "مرحبا", "اهلا", "أهلا", "good morning", "good evening"],
      a: "Hello! I can tell you about Ashraf’s background, skills, projects, and how to reach him. What would you like to know?"
    },
    {
      k: ["thanks", "thank you", "thx", "شكرا", "شكراً", "appreciate"],
      a: "You’re welcome. Ask anytime about education, career, skills, projects, or contact."
    },
    {
      k: ["bye", "goodbye", "see you", "later"],
      a: "Goodbye - feel free to open this chat again anytime."
    },
    {
      k: [
        "who are you",
        "what are you",
        "are you a bot",
        "are you ai",
        "are you chatgpt",
        "your name",
        "who am i chatting",
        "assistant"
      ],
      a:
        "I’m <b>Ashraf’s portfolio assistant</b>. I answer from this site about his background, skills, projects, and how to contact him.<br><br>" +
        "Ask <b>who is Ashraf</b> or tap <b>About</b> for his full intro."
    },
    {
      k: [
        "who is",
        "who ashraf",
        "who ayman",
        "who is ashraf",
        "who is ayman",
        "about him",
        "about ashraf",
        "about ayman",
        "introduce",
        "bio",
        "profile",
        "summary",
        "tell me about",
        "overview",
        "background"
      ],
      a:
        "<b>Ashraf Ayman Abdel Majeed</b> is a <b>GIS Engineer</b> based in <b>Mansoura, Egypt</b>.<br><br>" +
        "He builds GIS web maps, spatial analysis, GeoAI, remote sensing, and LiDAR solutions - currently as <b>Senior GIS Developer</b> at Gulf Terminal and a <b>Top Rated</b> freelance GIS Engineer on Upwork.<br><br>" +
        "<b>Path</b> <span class=\"ask-path-yrs\">5+ years</span>" +
        "<ol class=\"ask-path\">" +
        "<li><span>BSc Geomatics</span><small>1<sup>st</sup> Honor</small></li>" +
        "<li><span>ITI &amp; NTI</span><small>Training</small></li>" +
        "<li><span>Edge Pro</span><small>GIS Developer</small></li>" +
        "<li><span>AIC</span><small>GIS Team Lead</small></li>" +
        "<li><span>Gulf Terminal + Upwork</span><small>Senior · Top Rated</small></li>" +
        "</ol>" +
        "<i>“A good map tells an excellent story.”</i><br><br>" +
        "Ask about <b>education</b>, <b>career</b>, <b>skills</b>, <b>projects</b>, or <b>contact</b> for more detail."
    },
    {
      k: ["what do you do", "what does he do", "what is his job", "his role", "his job", "his title", "his profession", "work as", "solutions engineer", "gis engineer", "gis developer", "gis analyst"],
      a: "Ashraf works as a <b>Senior GIS Developer</b> at Gulf Terminal, and as a freelance <b>GIS Engineer</b> on Upwork (Top Rated). His focus is GIS web apps, spatial analysis, GeoAI, and remote sensing."
    },
    {
      k: ["good man", "nice person", "kind", "honest", "trustworthy", "reliable", "personality", "character", "good person", "friendly"],
      a: "I can’t judge personal character, but professionally Ashraf is known for clear delivery, technical depth, and client work with a <b>Top Rated</b> Upwork profile. Email him if you’d like to work together."
    },
    {
      k: ["married", "age", "birthday", "religion", "family", "salary", "wife", "kids", "children", "personal life"],
      a: "I only answer professional questions from this portfolio. For anything personal, please email Ashraf directly."
    },
    {
      k: ["where", "location", "based", "live", "city", "mansoura", "egypt", "dakahlia", "from"],
      a: "Ashraf is based in <b>Mansoura, Dakahlia, Egypt</b>."
    },
    {
      k: ["education", "study", "studied", "university", "degree", "graduat", "college", "bachelor", "bsc", "geomatics", "honor", "honour", "mansoura university"],
      a: "<b>Education · ~4 yrs</b><br>Mansoura University - <b>BSc in Geomatics (1<sup>st</sup> Honor)</b>, field: Surveying, Remote Sensing &amp; GIS (graduated June 2021)."
    },
    {
      k: ["training", "course", "certificate", "bootcamp", "intensive", "program"],
      a: "<b>Training · ~2 yrs</b><ul><li><b>ITI</b> - GIS and Web Development (5-month intensive, Apr 2022)</li><li><b>NTI</b> - Digital Egypt Youth, Front-End Web Development (Feb 2023)</li><li><b>Edge Pro</b> - professional GIS training / early career path</li></ul>"
    },
    {
      k: ["iti", "information technology institute"],
      a: "<b>ITI (Information Technology Institute)</b> - 5-month intensive program in GIS and Web Development (graduated April 2022, Cairo)."
    },
    {
      k: ["nti", "telecommunication", "digital egypt", "front-end", "frontend"],
      a: "<b>NTI (National Telecommunication Institute)</b> - Digital Egypt Youth Program, Front-End Web Development (graduated February 2023)."
    },
    {
      k: ["edge pro", "edgepro", "edge"],
      a: "Ashraf worked at <b>Edge Pro for Information Systems</b> (Cairo) as GIS Specialist then GIS Developer (2022-2023). He built client GIS demos, used ArcGIS / Python / SQL, and contributed to a GIS &amp; remote-sensing project presented at <b>COP27</b>."
    },
    {
      k: ["career", "experience", "work history", "employment", "companies", "employers", "cv experience"],
      a: "<b>Career highlights</b><ul><li><b>Gulf Terminal</b> - GIS Developer → Senior GIS Developer (current)</li><li><b>Upwork</b> - GIS Engineer, Top Rated freelance</li><li><b>AIC</b> - GIS Team Lead (2024)</li><li><b>Edge Pro</b> - GIS Specialist / Developer</li></ul>Open the <b>Experience</b> section for the full timeline."
    },
    {
      k: ["gulf", "terminal", "current job", "now", "present", "senior"],
      a: "Ashraf is currently <b>Senior GIS Developer at Gulf Terminal</b> (Mansoura). He leads GIS software design with the Esri suite, owns an ArcGIS Maps SDK library for 2D/3D web apps, and works with SQL Server and PostgreSQL."
    },
    {
      k: ["upwork", "freelance", "freelancer", "top rated", "jss", "hire me", "available", "contract"],
      a: "Ashraf freelances on <b>Upwork as GIS Engineer</b> (Top Rated, JSS 100). Typical work: ArcGIS Pro, GeoAI, remote sensing, LiDAR, spatial analysis, and interactive GIS web apps. Use the <b>Email</b> button to discuss a project."
    },
    {
      k: ["aic", "applied innovation", "team lead", "team leader", "mcit", "ministry", "google earth pro", "crop", "land use", "annotation"],
      a: "At <b>Applied Innovation Center (AIC)</b> Ashraf was <b>GIS Team Lead</b> (2024, part-time/remote with MCIT). He led a large Google Earth Pro annotation project for land-use and crop classification supporting agriculture and urban mapping decisions."
    },
    {
      k: ["cop27", "cop 27", "sharm"],
      a: "While at Edge Pro, Ashraf contributed to a GIS and remote-sensing project presented at <b>COP27 in Sharm El-Sheikh, 2022</b>."
    },
    {
      k: ["skill", "skills", "tool", "tools", "software", "stack", "technology", "technologies", "tech"],
      a: "<b>Core skills</b><ul><li><b>GIS:</b> ArcGIS API for JS, ArcGIS Pro, Enterprise/Online, QGIS, Leaflet, OpenLayers, Mapbox, GeoServer, PostGIS</li><li><b>Code:</b> JavaScript, Python, SQL, HTML/CSS, Git</li><li><b>RS:</b> ERDAS Imagine, ENVI, LiDAR, Hexagon</li></ul>"
    },
    {
      k: ["arcgis", "esri", "maps sdk", "arcgis pro", "arcgis online", "arcgis server", "portal"],
      a: "Ashraf’s daily stack is strongly <b>Esri / ArcGIS</b>: Maps SDK for JavaScript (2D/3D), ArcGIS Pro, ArcGIS Enterprise (Server, Portal, Online), and related REST workflows."
    },
    {
      k: ["python", "arcpy", "javascript", "js", "sql", "leaflet", "mapbox", "qgis", "postgis", "postgresql"],
      a: "Yes - he works with <b>JavaScript</b>, <b>Python / ArcPy</b>, <b>SQL</b>, <b>Leaflet</b>, <b>Mapbox</b>, <b>QGIS</b>, <b>PostGIS / PostgreSQL</b>, and SQL Server alongside the Esri stack."
    },
    {
      k: ["geoai", "ai", "machine learning", "deep learning", "remote sensing", "lidar", "rs"],
      a: "Ashraf works on <b>GeoAI</b>, <b>remote sensing</b>, and <b>LiDAR</b> - from classification and imagery workflows to analysis that feeds maps and decision tools. See the GeoAI and Projects sections on this site."
    },
    {
      k: ["project", "projects", "portfolio", "work sample", "case study", "examples", "built"],
      a: "Browse the <b>Projects</b> section and the interactive <b>Map</b> for case studies (drive-time analysis, indoor mapping, ArcGIS Server sync, map books, Google Earth Studio tours, and more)."
    },
    {
      k: ["map", "web map", "webmap", "interactive map", "tour"],
      a: "Open the <b>Map</b> section to explore every project by place, or use the floating portfolio mini-map. Filters, country pills, and Tour help you browse."
    },
    {
      k: ["indoor", "mall", "plaza", "3d"],
      a: "One highlight is an <b>indoor 3D plaza/mall map</b> built at Gulf Terminal - floors, shops, directions, and a 360 viewer in the browser."
    },
    {
      k: ["contact", "email", "mail", "reach", "message", "talk", "get in touch", "phone", "whatsapp"],
      a: "Best contact: <a href=\"mailto:ashrafayman219@gmail.com\">ashrafayman219@gmail.com</a> - or use the <b>Email</b> button in the header."
    },
    {
      k: ["linkedin", "github", "social", "network"],
      a: "Find Ashraf on <a href=\"https://www.linkedin.com/in/ashraf-ayman\" target=\"_blank\" rel=\"noopener\">LinkedIn</a> and <a href=\"https://github.com/ashrafayman219\" target=\"_blank\" rel=\"noopener\">GitHub</a>."
    },
    {
      k: ["cv", "resume", "curriculum", "download", "pdf"],
      a: "You can download his <b>CV</b> and <b>resume</b> from the Contact / documents area on this site (PDF)."
    },
    {
      k: ["years", "how long", "experience years", "5 years", "five years"],
      a: "Ashraf has <b>5+ years</b> in GIS - education, training, and professional work across Gulf Terminal, AIC, Edge Pro, and Upwork."
    },
    {
      k: ["goal", "future", "looking for", "open to", "opportunity"],
      a: "His goal is to keep growing as a GIS developer in a team that values technical depth and continuous learning."
    },
    {
      k: ["language", "languages", "arabic", "english", "speak"],
      a: "Ashraf works professionally in English and Arabic. This assistant can answer in English; for a deeper conversation, email him directly."
    },
    {
      k: ["price", "rate", "cost", "budget", "quote", "pay"],
      a: "Rates depend on scope and timeline. Email <a href=\"mailto:ashrafayman219@gmail.com\">ashrafayman219@gmail.com</a> with a short brief for a quote."
    },
    {
      k: ["help", "what can", "options", "menu", "topics"],
      a: "I can help with: <b>about</b>, <b>education</b>, <b>training</b>, <b>career</b>, <b>skills</b>, <b>projects/map</b>, <b>GeoAI</b>, <b>contact</b>, <b>CV</b>, and <b>freelance/hire</b>."
    }
  ];

  var FALLBACK =
    "I don’t have that exact answer yet. Try asking about <b>education</b>, <b>training</b>, <b>career</b>, <b>skills</b>, <b>projects</b>, or <b>contact</b>, or email Ashraf at <a href=\"mailto:ashrafayman219@gmail.com\">ashrafayman219@gmail.com</a>.";

  var CHIPS = ["About", "Education", "Career", "Skills", "Projects", "Contact"];

  /* Weak tokens: matching only these should never pick an answer. */
  var WEAK = {
    ashraf: 1,
    ayman: 1,
    he: 1,
    his: 1,
    him: 1,
    she: 1,
    her: 1,
    they: 1,
    them: 1,
    is: 1,
    are: 1,
    was: 1,
    were: 1,
    a: 1,
    an: 1,
    the: 1,
    to: 1,
    of: 1,
    in: 1,
    on: 1,
    for: 1,
    and: 1,
    or: 1,
    do: 1,
    does: 1,
    did: 1,
    can: 1,
    you: 1,
    me: 1,
    my: 1,
    what: 1,
    who: 1,
    where: 1,
    when: 1,
    how: 1,
    about: 1
  };

  var TRUE_ROLES = [
    "gis",
    "engineer",
    "developer",
    "analyst",
    "specialist",
    "instructor",
    "freelancer",
    "consultant",
    "team lead",
    "team leader",
    "programmer",
    "cartographer",
    "geomatics"
  ];

  function escapeHtml(s) {
    return String(s).replace(/[<>&]/g, function (c) {
      return { "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c];
    });
  }

  function norm(s) {
    return String(s)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hasWord(text, word) {
    if (word.indexOf(" ") !== -1) return text.indexOf(word) !== -1;
    return new RegExp("(?:^|\\s)" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:\\s|$)", "i").test(text);
  }

  function roleQuestion(t) {
    var m = t.match(
      /(?:^|\s)(?:is|are|was|were)\s+(?:he|she|ashraf|ayman|they)\s+(?:a|an|the)?\s*(.+)$/
    );
    if (!m) {
      m = t.match(/(?:^|\s)(?:is|are)\s+ashraf(?:\s+ayman)?\s+(?:a|an|the)?\s*(.+)$/);
    }
    if (!m) return null;
    var claim = norm(m[1])
      .replace(/\?+$/, "")
      .replace(/^(?:a|an|the|is|are)\s+/, "")
      .trim();
    if (!claim || claim.length < 3) return null;
    /* Soft / personal judgments are handled by KB, not role denial */
    if (
      /\b(good|bad|nice|kind|honest|smart|best|worst|perfect|great|awesome|evil)\b/.test(
        claim
      )
    ) {
      return null;
    }
    for (var i = 0; i < TRUE_ROLES.length; i++) {
      if (claim.indexOf(TRUE_ROLES[i]) !== -1) {
        return "Yes. Ashraf works as a <b>GIS Engineer / Senior GIS Developer</b> (Gulf Terminal + Upwork).";
      }
    }
    return (
      "No. Ashraf is not a " +
      escapeHtml(claim) +
      ". He is a <b>GIS Engineer</b> focused on web maps, spatial analysis, and GeoAI."
    );
  }

  function kbAnswer(t) {
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < KB.length; i++) {
      var entry = KB[i];
      var score = 0;
      var strongHits = 0;
      for (var j = 0; j < entry.k.length; j++) {
        var w = entry.k[j];
        var hit =
          w.indexOf(" ") !== -1 ? t.indexOf(w) !== -1 : hasWord(t, w);
        if (!hit) continue;
        var weak = !!WEAK[w];
        var points = w.indexOf(" ") !== -1 ? w.length * 3 : Math.max(3, w.length);
        if (weak) points = 1;
        else strongHits += 1;
        score += points;
      }
      if (strongHits === 0) score = 0;
      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }
    if (!best || bestScore < 3) return null;
    return best.a;
  }

  function kbByKeyword(key) {
    for (var i = 0; i < KB.length; i++) {
      if (KB[i].k.indexOf(key) !== -1) return KB[i].a;
    }
    return null;
  }

  function aboutAnswer() {
    return kbByKeyword("about ashraf");
  }

  function isGreetingIntent(t) {
    return /^(?:hi+|hii+|hello+|hey+|yo|salam|salaam|مرحبا|اهلا|أهلا)(?:\s+(?:there|ashraf|ayman|again))?$/.test(
      t
    ) || /^(?:good\s+(?:morning|evening|afternoon|day))$/.test(t);
  }

  function isAssistantIntent(t) {
    if (
      /^(?:who\s+are\s+you|what\s+are\s+you|who\s+r\s+u|what\s+r\s+u)(?:\s|$)/.test(
        t
      )
    ) {
      return true;
    }
    if (
      /^(?:are\s+you\s+(?:a\s+)?(?:bot|ai|robot|chatgpt|assistant)|your\s+name)\b/.test(
        t
      )
    ) {
      return true;
    }
    return false;
  }

  /* Catches chip, short asks, typos (whoe), and "who ashraf" forms before weak-token scoring. */
  function isAboutIntent(t) {
    if (
      t === "about" ||
      t === "bio" ||
      t === "profile" ||
      t === "summary" ||
      t === "overview" ||
      t === "background" ||
      t === "ashraf" ||
      t === "ayman" ||
      t === "ashraf ayman" ||
      t === "ashraf ayman abdel majeed"
    ) {
      return true;
    }
    if (
      /^(?:whoe?|who)\s+(?:is\s+|are\s+)?(?:ashraf|ayman|he|him)(?:\s|$)/.test(t)
    ) {
      return true;
    }
    if (
      /^(?:tell\s+me\s+about|about|info\s+(?:on|about)|summary\s+(?:of|for|about)|introduce)\s+(?:ashraf|ayman|him|himself|yourself)\b/.test(
        t
      )
    ) {
      return true;
    }
    if (/\bwhoe?\s+is\s+(?:ashraf|ayman)\b/.test(t)) return true;
    return false;
  }

  function localAnswer(q) {
    var t = norm(q);
    if (!t) return null;
    if (isGreetingIntent(t)) return kbByKeyword("hello");
    if (isAssistantIntent(t)) return kbByKeyword("who are you");
    if (isAboutIntent(t)) return aboutAnswer();
    return kbAnswer(t) || roleQuestion(t);
  }

  function answer(q) {
    return localAnswer(q) || FALLBACK;
  }

  function mount() {
    var fab = document.createElement("button");
    fab.type = "button";
    fab.className = "ask-fab";
    fab.id = "askFab";
    fab.setAttribute("aria-label", "Open ask chat");
    fab.setAttribute("aria-expanded", "false");
    fab.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/></svg>';

    var panel = document.createElement("section");
    panel.className = "ask-chat";
    panel.id = "askChat";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Ask Ashraf");
    panel.innerHTML =
      '<div class="ask-head">' +
      '<div class="ask-av" aria-hidden="true">A</div>' +
      "<div><b>Ashraf Ayman</b><small>Ask me anything</small></div>" +
      '<button class="ask-close" type="button" id="askClose" aria-label="Close chat">✕</button>' +
      "</div>" +
      '<div class="ask-msgs" id="askMsgs" aria-live="polite"></div>' +
      '<div class="ask-chips" id="askChips"></div>' +
      '<form class="ask-form" id="askForm">' +
      '<input id="askInput" type="text" placeholder="Type your question" autocomplete="off" aria-label="Your question" />' +
      '<button type="submit" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M21 3L3 10.5l7 2.5 2.5 7zM10 13l11-10"/></svg></button>' +
      "</form>" +
      '<div class="ask-note" id="askNote">Answers come from the information on this site.</div>';

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    var msgs = document.getElementById("askMsgs");
    var input = document.getElementById("askInput");
    var chips = document.getElementById("askChips");
    var busy = false;

    function addMsg(cls, html) {
      var el = document.createElement("div");
      el.className = "ask-msg " + cls;
      el.innerHTML = html;
      msgs.appendChild(el);
      msgs.scrollTop = msgs.scrollHeight;
      return el;
    }

    function setOpen(open) {
      panel.classList.toggle("is-open", open);
      fab.setAttribute("aria-expanded", open ? "true" : "false");
      fab.setAttribute("aria-label", open ? "Close ask chat" : "Open ask chat");
      if (open) input.focus({ preventScroll: true });
    }

    async function ask(raw) {
      var q = String(raw || "").trim();
      if (!q || busy) return;
      busy = true;
      addMsg("is-user", escapeHtml(q));
      var typing = addMsg(
        "is-bot",
        '<span class="ask-dots"><i></i><i></i><i></i></span>'
      );
      var html = answer(q);
      await new Promise(function (r) {
        setTimeout(r, 320);
      });
      typing.innerHTML = html;
      msgs.scrollTop = msgs.scrollHeight;
      busy = false;
    }

    chips.innerHTML = CHIPS.map(function (c) {
      return '<button type="button">' + c + "</button>";
    }).join("");

    chips.addEventListener("click", function (e) {
      if (e.target.tagName === "BUTTON") ask(e.target.textContent);
    });

    document.getElementById("askForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var v = input.value;
      input.value = "";
      ask(v);
    });

    fab.addEventListener("click", function () {
      setOpen(!panel.classList.contains("is-open"));
    });
    document.getElementById("askClose").addEventListener("click", function () {
      setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains("is-open")) setOpen(false);
    });

    addMsg(
      "is-bot",
      "Hi, I’m Ashraf’s site assistant. Ask about education, career, skills, projects, or how to contact him."
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
