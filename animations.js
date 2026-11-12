// Subtle scroll-triggered animations + nav underline transitions
(function () {
  // ---- Nav underline sweep ----
  var nav = document.querySelector("header nav");
  if (!nav) return;
  var indicator = document.createElement("span");
  indicator.className = "nav-indicator";
  nav.style.position = "relative";
  nav.appendChild(indicator);

  function moveIndicator(a) {
    var rect = a.getBoundingClientRect();
    var navRect = nav.getBoundingClientRect();
    indicator.style.width = rect.width + "px";
    indicator.style.transform = "translateX(" + (rect.left - navRect.left) + "px)";
  }
  nav.addEventListener("mousemove", function (e) {
    var link = e.target.closest("a");
    if (link) moveIndicator(link);
  });
  nav.addEventListener("mouseleave", function () {
    indicator.style.transform = "translateX(0)";
    indicator.style.width = "0";
  });
  nav.querySelectorAll("a").forEach(function (a) {
    moveIndicator(a);
  });

  // ---- Scroll-reveal ----
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var reveals = [];
  function observe() {
    document.querySelectorAll(".reveal").forEach(function (el) {
      if (el.dataset.observed) return;
      el.dataset.observed = "1";
      reveals.push(el);
    });
  }
  observe();

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var delay = parseInt(el.dataset.delay || "0", 10);
      setTimeout(function () { el.classList.add("seen"); }, delay);
      io.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  reveals.forEach(function (el) { io.observe(el); });

  // Re-observe after dynamic content loads
  window._venchReobserve = function () { observe(); reveals.forEach(function (el) { io.observe(el); }); };
})();

// ---- Slider text animation ----
(function () {
  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  var slides = [].slice.call(document.querySelectorAll(".slide"));
  var animating = false;

  function animateSlide(slide, forward) {
    var h2 = slide.querySelector("h2");
    var p = slide.querySelector("p");
    var btn = slide.querySelector(".btn");
    var eyebrow = slide.querySelector(".eyebrow");
    if (!h2) return;

    [h2, p, btn, eyebrow].forEach(function (el) {
      if (!el) return;
      el.style.transition = "none";
      el.style.opacity = "0";
      el.style.transform = forward ? "translateY(28px)" : "translateY(-28px)";
    });

    requestAnimationFrame(function () {
      setTimeout(function () {
        [h2, p, btn, eyebrow].forEach(function (el, i) {
          if (!el) return;
          el.style.transition = "opacity .5s " + (i * 0.1) + "s ease, transform .5s " + (i * 0.1) + "s cubic-bezier(.22,.61,.36,1)";
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
        });
      }, 120);
    });
  }

  // Animate first slide immediately
  if (slides[0]) animateSlide(slides[0], true);

  // Hook into existing slider
  var origGo = null;
  var wrap = document.querySelector(".slider");
  if (!wrap) return;

  var observer = new MutationObserver(function () {
    var current = Array.from(slides).find(function (s) { return s.classList.contains("on"); });
    if (!current || animating) return;
    var idx = slides.indexOf(current);
    animating = true;
    animateSlide(current, true);
    setTimeout(function () { animating = false; }, 700);
  });

  slides.forEach(function (s) {
    var ro = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.attributeName === "class" && s.classList.contains("on") && !animating) {
          animating = true;
          animateSlide(s, true);
          setTimeout(function () { animating = false; }, 700);
        }
      });
    });
    ro.observe(s, { attributes: true });
  });
})();
