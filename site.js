// Shared by every page: top bar and site search.
(function () {
  var header = document.querySelector("header");
  if (!header) return;

  var bar = document.createElement("div");
  bar.className = "topbar";
  bar.innerHTML = '<div class="wrap"><a href="tools.html#news">News &amp; Media</a><a href="tools.html#numbers">Useful numbers</a><a href="enquire.html">Enquire</a></div>';
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
    ["Useful numbers", "tools.html#numbers", "emergency police ambulance fire ato medicare immigration phone"],
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
