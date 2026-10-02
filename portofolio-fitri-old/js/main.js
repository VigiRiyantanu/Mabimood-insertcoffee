/* ============================================================
   main.js — entry point: animasi, smooth scroll, tema,
   progress bar, back-to-top, dan form kontak.
   ============================================================ */

(function (global) {
  "use strict";

  var doc = global.document;
  var prefersReducedMotion = global.matchMedia
    ? global.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  /* ============================================================
     1. Reveal saat section masuk viewport
     ============================================================ */
  function initReveal() {
    var items = doc.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    // Terapkan delay sesuai data-reveal-delay
    Array.prototype.forEach.call(items, function (el) {
      var delay = parseInt(el.getAttribute("data-reveal-delay") || "0", 10);
      if (!isNaN(delay) && delay > 0) {
        el.style.setProperty("--reveal-delay", delay * 90 + "ms");
      }
    });

    if (prefersReducedMotion.matches || !("IntersectionObserver" in global)) {
      Array.prototype.forEach.call(items, function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    Array.prototype.forEach.call(items, function (el) {
      observer.observe(el);
    });
  }

  /* ============================================================
     2. Animasi bar skill saat terlihat
     ============================================================ */
  function initSkillBars() {
    var fills = doc.querySelectorAll(".skill__fill");
    if (!fills.length) return;

    function fillAll() {
      Array.prototype.forEach.call(fills, function (el) {
        el.style.width = (el.getAttribute("data-level") || 0) + "%";
      });
    }

    if (prefersReducedMotion.matches || !("IntersectionObserver" in global)) {
      fillAll();
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var el = entry.target;
            setTimeout(function () {
              el.style.width = (el.getAttribute("data-level") || 0) + "%";
            }, 120);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.3 }
    );

    Array.prototype.forEach.call(fills, function (el) {
      el.style.width = "0%";
      observer.observe(el);
    });
  }

  /* ============================================================
     3. Navbar sticky: efek saat scroll + progress bar
     ============================================================ */
  function initNavbarScroll() {
    var navbar = doc.getElementById("navbar");
    var progress = doc.getElementById("scroll-progress");
    var toTop = doc.getElementById("to-top");
    var ticking = false;

    function update() {
      ticking = false;

      var y = global.scrollY || global.pageYOffset || 0;

      if (navbar) {
        navbar.classList.toggle("is-stuck", y > 12);
      }

      if (progress) {
        var scrollable = doc.documentElement.scrollHeight - global.innerHeight;
        var ratio = scrollable > 0 ? y / scrollable : 0;
        progress.style.width = Math.min(100, Math.max(0, ratio * 100)) + "%";
      }

      if (toTop) {
        toTop.classList.toggle("is-visible", y > 500);
      }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      global.requestAnimationFrame(update);
    }

    update();
    global.addEventListener("scroll", onScroll, { passive: true });

    if (toTop) {
      toTop.addEventListener("click", function () {
        global.scrollTo({
          top: 0,
          behavior: prefersReducedMotion.matches ? "auto" : "smooth"
        });
      });
    }
  }

  /* ============================================================
     4. Smooth scroll untuk link anchor (dengan offset navbar)
     ============================================================ */
  function initSmoothScroll() {
    doc.addEventListener("click", function (event) {
      var link = event.target.closest('a[href^="#"]');
      if (!link) return;

      var hash = link.getAttribute("href");
      if (!hash || hash === "#" || hash.length < 2) return;

      var target = doc.getElementById(hash.slice(1));
      if (!target) return;

      event.preventDefault();

      var navH = parseInt(
        getComputedStyle(doc.documentElement).getPropertyValue("--nav-h"),
        10
      ) || 68;
      var top = target.getBoundingClientRect().top + global.scrollY - navH - 12;

      global.scrollTo({
        top: top > 0 ? top : 0,
        behavior: prefersReducedMotion.matches ? "auto" : "smooth"
      });

      // Fokus ke target demi aksesibilitas, tanpa smooth-scroll tambahan
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      target.focus({ preventScroll: true });

      // history pada protokol file:// bisa ditolak browser
      try {
        history.replaceState(null, "", hash);
      } catch (err) {
        /* abaikan */
      }
    });
  }

  /* ============================================================
     5. Tema terang / gelap
     ============================================================ */
  var THEME_KEY = "fnf-theme";

  function getStoredTheme() {
    try {
      return global.localStorage.getItem(THEME_KEY);
    } catch (err) {
      return null;
    }
  }

  function storeTheme(value) {
    try {
      global.localStorage.setItem(THEME_KEY, value);
    } catch (err) {
      /* storage diblokir — abaikan */
    }
  }

  function applyTheme(theme) {
    doc.documentElement.setAttribute("data-theme", theme);

    var glyph = doc.querySelector('#theme-toggle [data-icon]');
    if (glyph) {
      glyph.textContent = theme === "light" ? "☀" : "☾";
    }

    var btn = doc.getElementById("theme-toggle");
    if (btn) {
      btn.setAttribute(
        "aria-label",
        theme === "light" ? "Aktifkan tema gelap" : "Aktifkan tema terang"
      );
    }
  }

  function initTheme() {
    applyTheme(getStoredTheme() || "dark");

    var btn = doc.getElementById("theme-toggle");
    if (!btn) return;

    btn.addEventListener("click", function () {
      var next =
        doc.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(next);
      storeTheme(next);
    });
  }

  /* ============================================================
     6. Form kontak — validasi client-side + mailto
     ============================================================ */
  function initContactForm() {
    var form = doc.getElementById("contact-form");
    if (!form) return;

    var status = doc.getElementById("cf-status");
    var message = doc.getElementById("cf-message");
    var counter = doc.getElementById("cf-count");
    var MAX = 500;

    function setError(id, text) {
      var field = doc.getElementById(id);
      var box = form.querySelector('[data-error-for="' + id + '"]');
      if (field) {
        if (text) field.setAttribute("aria-invalid", "true");
        else field.removeAttribute("aria-invalid");
      }
      if (box) box.textContent = text || "";
    }

    function validateField(field) {
      var id = field.id;
      var value = field.value.trim();

      if (field.hasAttribute("required") && !value) {
        setError(id, "Wajib diisi.");
        return false;
      }

      if (field.type === "email" && value) {
        var valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
        if (!valid) {
          setError(id, "Format email belum benar.");
          return false;
        }
      }

      if (id === "cf-message" && value.length > MAX) {
        setError(id, "Maksimal " + MAX + " karakter.");
        return false;
      }

      setError(id, "");
      return true;
    }

    // Validasi saat blur
    Array.prototype.forEach.call(form.querySelectorAll("input, textarea"), function (field) {
      field.addEventListener("blur", function () {
        validateField(field);
      });
      field.addEventListener("input", function () {
        if (field.getAttribute("aria-invalid") === "true") validateField(field);
      });
    });

    // Penghitung karakter
    if (message && counter) {
      message.addEventListener("input", function () {
        counter.textContent = String(message.value.length);
      });
    }

    function setStatus(text, kind) {
      if (!status) return;
      status.textContent = text;
      status.classList.remove("is-success", "is-error", "is-info");
      if (kind) status.classList.add("is-" + kind);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var fields = Array.prototype.slice.call(
        form.querySelectorAll("input[required], textarea[required]")
      );
      var firstInvalid = null;

      fields.forEach(function (field) {
        if (!validateField(field) && !firstInvalid) firstInvalid = field;
      });

      if (firstInvalid) {
        setStatus("Mohon lengkapi kolom yang ditandai merah.", "error");
        firstInvalid.focus();
        return;
      }

      var email =
        (global.SITE && global.SITE.contactEmail) || "email@example.com";
      var subject = doc.getElementById("cf-subject").value.trim() ||
        "Pesan dari portofolio";
      var body =
        "Nama: " + doc.getElementById("cf-name").value.trim() +
        "\nEmail: " + doc.getElementById("cf-email").value.trim() +
        "\n\n" + message.value.trim();

      var mailto =
        "mailto:" + email +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(body);

      if (email === "email@example.com") {
        // Email masih placeholder — jangan kirim ke alamat dummy.
        setStatus(
          "Email tujuan masih placeholder. Set contactEmail di js/data.js terlebih dahulu.",
          "info"
        );
        return;
      }

      setStatus("Membuka aplikasi email Anda…", "info");
      global.location.href = mailto;

      form.reset();
      if (counter) counter.textContent = "0";
      setStatus("Jika email tidak terbuka, hubungi saya lewat tautan di samping.", "success");
    });
  }

  /* ============================================================
     7. Init
     ============================================================ */
  function init() {
    if (global.Render) global.Render.init();
    if (global.Nav) global.Nav.init();

    initTheme();
    initReveal();
    initSkillBars();
    initNavbarScroll();
    initSmoothScroll();
    initContactForm();
  }

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
