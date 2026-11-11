// Shared by every page: top bar and site search.
(function () {
  var header = document.querySelector("header");
  if (!header) return;

  var bar = document.createElement("div");
  bar.className = "topbar";
  bar.innerHTML = '<div class="wrap"><a href="tools.html#news">News &amp; Media</a><a href="enquire.html">Enquire</a></div>';
  header.parentNode.insertBefore(bar, header);

  var nav = header.querySelector("nav");
  var btn = document.createElement("button");
  btn.className = "search-btn"; btn.type = "button"; btn.setAttribute("aria-label", "Search the site"); btn.textContent = "\u{1F50D}";
  nav.appendChild(btn);

  var PAGES = [
    ["Fibre infrastructure planning & design", "fibre.html", "fibre fiber route inter-city coastal rail highway regional metro diversity new build"],
    ["Structured tie cable design", "cabling.html", "tie cable exchange data centre odf labelling mpo"],
    ["DWDM network planning & design", "dwdm.html", "dwdm optical nokia pss osn 1800 cisco ribbon osnr roadm"],
    ["Site survey & as-built package", "survey.html", "survey as-built otdr splice drawings"],
    ["Fibre loss calculator", "tools.html#fibre-loss", "loss budget attenuation splice connector"],
    ["DWDM link budget calculator", "tools.html#dwdm-budget", "osnr span amplifier link budget"],
    ["Take-home pay calculator", "tools.html#take-home", "tax salary pay australia medicare"],
    ["Public holidays in Australia", "tools.html#holidays", "holiday date state"],
    ["Visa fees and processing times", "tools.html#visa", "visa immigration fee 189 190 491 482 186 processing"],
    ["Skilled occupation checker", "tools.html#occupation", "anzsco occupation skilled visa 189 190 491"],
    ["Telecom news and innovation", "tools.html#news", "news 5g 4g fibre dwdm innovation"],
    ["Enquire", "enquire.html", "contact enquiry quote hourly daily project"],
    ["Our story", "index.html#about", "about engineers entrepreneurs"]
  ];
  var panel = document.createElement("div");
  panel.className = "search-panel";
  panel.innerHTML = '<div class="search-box"><input type="search" placeholder="Search services, tools and pages" aria-label="Search"><div class="res"></div></div>';
  document.body.appendChild(panel);
  var input = panel.querySelector("input"), res = panel.querySelector(".res");

  function render() {
    var q = input.value.trim().toLowerCase();
    var hits = PAGES.filter(function (p) { return !q || (p[0] + " " + p[2]).toLowerCase().indexOf(q) >= 0; }).slice(0, 8);
    res.innerHTML = hits.map(function (p, i) { return '<a href="' + p[1] + '"' + (i === 0 ? ' class="hl"' : "") + ">" + p[0] + "<small>" + p[1] + "</small></a>"; }).join("") || "<p class='fine'>No matches</p>";
  }
  function open() { panel.classList.add("open"); input.value = ""; render(); input.focus(); }
  function close() { panel.classList.remove("open"); }
  btn.addEventListener("click", open);
  panel.addEventListener("click", function (e) { if (e.target === panel) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  input.addEventListener("input", render);
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") { var a = res.querySelector("a"); if (a) location.href = a.getAttribute("href"); } });
})();

// ---- Visit recorder: counts page views for the analytics dashboard ----
// Stored in localStorage, so numbers are per-browser. For real cross-device
// analytics, set a GA4 measurement ID below and the same visits are sent to Google.
(function () {
  var KEY = "vench.visits";
  var GA_ID = ""; // e.g. "G-XXXXXXXXXX" — leave blank to disable Google Analytics
  var ADMIN = /admin\.html/;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  // Public helpers used by admin.html
  window.Vench = window.Vench || {};
  window.Vench.Visit = {
    record: function (page) {
      if (ADMIN.test(location.pathname)) return;
      var v = load();
      var day = todayKey();
      v.days = v.days || {};
      v.pages = v.pages || {};
      v.days[day] = (v.days[day] || 0) + 1;
      v.pages[page] = (v.pages[page] || 0) + 1;
      v.last = { day: day, page: page, ref: document.referrer || "(direct)", at: new Date().toISOString() };
      save(v);
      if (GA_ID) {
        try { if (window.gtag) gtag("event", "page_view", { page_path: page, measurement_id: GA_ID }); } catch (e) {}
      }
    },
    stats: function () { return load(); }
  };

  // Record the current page view once, after the DOM is ready.
  if (!ADMIN.test(location.pathname)) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { window.Vench.Visit.record(location.pathname.replace(/.*\//, "") || "index.html"); });
    } else {
      window.Vench.Visit.record(location.pathname.replace(/.*\//, "") || "index.html");
    }
  }
})();

// ---- Site settings engine: applies admin-edited settings to every page ----
// Reads settings.json (or the saved copy in localStorage), then rewrites the
// logo, site name, footer and contact details in place. The admin page saves
// back into localStorage so changes take effect immediately without a deploy.
(function () {
  var KEY = "vench.settings";
  var DEFAULTS = {
    site: { name: "Vench", tagline: "Sydney, Australia", logo: "logo.jpg", abn: "99 999 999 999", footerPhotos: "Photos: Unsplash" },
    contact: { name: "Vench", email: "hello@vench.cc", phone: "+61 2 9000 0000", enquirySubject: "Vench enquiry" },
    pages: {},
    profile: { name: "Admin", email: "hello@vench.cc", phone: "+61 2 9000 0000" }
  };

  function merge(a, b) {
    var out = {};
    for (var k in a) out[k] = a[k];
    for (var k in b) {
      if (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k] && typeof a[k] === "object") out[k] = merge(a[k], b[k]);
      else out[k] = b[k];
    }
    return out;
  }

  function load() {
    // Try localStorage first (user overrides)
    try {
      var saved = JSON.parse(localStorage.getItem(KEY));
      if (saved) return merge(DEFAULTS, saved);
    } catch (e) {}
    // Fall back to settings.json file on disk
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "settings.json?t=" + Date.now(), false); // synchronous
      xhr.send();
      if (xhr.status === 200 && xhr.responseText) {
        var remote = JSON.parse(xhr.responseText);
        if (remote && typeof remote === "object") {
          // Save to localStorage so future loads use local copy
          try { localStorage.setItem(KEY, JSON.stringify(remote)); } catch(e) {}
          return merge(DEFAULTS, remote);
        }
      }
    } catch (e) {}
    return merge(DEFAULTS, {});
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  window.Vench = window.Vench || {};
  window.Vench.Settings = {
    load: load,
    save: save,
    defaults: DEFAULTS,
    apply: function (s) {
      s = s || load();
      var brand = document.querySelector(".brand img");
      if (brand && s.site && s.site.logo) brand.setAttribute("src", s.site.logo);
      var titleEl = document.querySelector("title");
      if (titleEl && s.site && s.site.name) titleEl.textContent = titleEl.textContent.replace(/^.*\|/, s.site.name + " |");
      var footer = document.querySelector("footer");
      if (footer && s.site && s.site.abn) {
        var abnEl = footer.querySelector("#abn-display");
        if (!abnEl) {
          abnEl = document.createElement("span");
          abnEl.id = "abn-display";
          footer.querySelector(".wrap").appendChild(abnEl);
        }
        abnEl.textContent = " | ABN: " + s.site.abn;
      }
      if (footer && s.site && s.site.footerPhotos) {
        var photoEl = footer.querySelector("#photos-display");
        if (photoEl) {
          photoEl.textContent = s.site.footerPhotos;
        } else {
          var spans = footer.querySelectorAll("footer span:last-child");
          if (spans.length) spans[spans.length - 1].textContent = s.site.footerPhotos;
        }
      }
      // Apply contact details to every page — email, phone, address
      if (s.contact) {
        window.Vench.Contact = s.contact;
        // Update the About section address
        var addrEl = document.getElementById("addr");
        if (addrEl) addrEl.textContent = s.contact.address || "";
        // Update any contact-info blocks (enquire page)
        document.querySelectorAll(".contact-info-block").forEach(function(el) {
          var lines = [];
          if (s.contact.email) lines.push('<strong>Email:</strong> <a href="mailto:' + s.contact.email + '">' + s.contact.email + '</a>');
          if (s.contact.phone) lines.push('<strong>Phone:</strong> ' + s.contact.phone);
          if (s.contact.address) lines.push('<strong>Address:</strong> ' + s.contact.address);
          el.innerHTML = lines.join("<br>") || "—";
        });
        // Update any standalone contact spans on the page
        document.querySelectorAll(".site-email").forEach(function(el) {
          el.textContent = s.contact.email || "";
          if (s.contact.email) el.setAttribute("href", "mailto:" + s.contact.email);
        });
        document.querySelectorAll(".site-phone").forEach(function(el) {
          el.textContent = s.contact.phone || "";
          if (s.contact.phone) el.setAttribute("href", "tel:" + s.contact.phone.replace(/\D/g, ""));
        });
        // Update any hero/contact sections that display email/phone
        document.querySelectorAll("[data-contact-email]").forEach(function(el) {
          el.textContent = s.contact.email || "";
        });
        document.querySelectorAll("[data-contact-phone]").forEach(function(el) {
          el.textContent = s.contact.phone || "";
        });
      }
      // Apply page and tool visibility to nav, topbar, tool cards and tools page
      if (s.pages) {
        var onTools = /tools\.html/.test(location.pathname);
        Object.keys(s.pages).forEach(function (key) {
          var isPub = s.pages[key].published !== false;
          var frag = key.split("#")[1];
          if (frag) {
            // Individual tool: hide its section + TOC entry on tools.html, and its links elsewhere
            if (onTools) {
              var sec = document.getElementById(frag);
              if (sec) sec.style.display = isPub ? "" : "none";
              var toc = document.querySelector('.toc a[href="#' + frag + '"]');
              if (toc) toc.style.display = isPub ? "" : "none";
            }
            var links = document.querySelectorAll('a[href="' + key + '"]');
            for (var i = 0; i < links.length; i++) links[i].style.display = isPub ? "" : "none";
          } else if (key !== "admin.html") {
            // Whole page: hide nav and topbar links that point to it
            var navLinks = document.querySelectorAll('nav a[href="' + key + '"], .topbar a[href="' + key + '"]');
            for (var j = 0; j < navLinks.length; j++) navLinks[j].style.display = isPub ? "" : "none";
          }
        });
      }
      // Contact details are surfaced by the enquiry page and admin page.
      window.Vench.Contact = s.contact;
      window.Vench.Profile = s.profile;
      // Update any page-level contact display
      if (typeof window._venchUpdateContact === "function") {
        window._venchUpdateContact(s.contact);
      }
    }
  };

  if (!/admin\.html/.test(location.pathname)) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { window.Vench.Settings.apply(); });
    } else {
      window.Vench.Settings.apply();
    }
  }

  // Listen for storage changes from other tabs/pages (e.g., admin saves settings)
  window.addEventListener("storage", function (e) {
    if (e.key === KEY && !/admin\.html/.test(location.pathname)) {
      window.Vench.Settings.apply();
    }
  });
})();
