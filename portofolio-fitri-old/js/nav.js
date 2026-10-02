/* ============================================================
   nav.js — navbar links, footer links, dan scroll spy.
   Dipisah dari main.js agar mudah dirawat.
   ============================================================ */

(function (global) {
  "use strict";

  /* ---------- 1. Render link navbar & footer ---------- */
  function renderLinks() {
    const navList = document.getElementById("nav-list");
    const footerList = document.getElementById("footer-list");

    if (navList && Array.isArray(global.NAV_LINKS)) {
      navList.innerHTML = global.NAV_LINKS.map(function (link) {
        return (
          '<li><a class="navbar__link" href="' +
          escapeAttr(link.href) +
          '" data-nav-link="' +
          escapeAttr(String(link.href).replace("#", "")) +
          '">' +
          escapeHtml(link.label) +
          "</a></li>"
        );
      }).join("");
    }

    if (footerList && Array.isArray(global.FOOTER_LINKS)) {
      footerList.innerHTML = global.FOOTER_LINKS.map(function (link) {
        const isExternal = /^https?:/i.test(link.href || "");
        const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
        return (
          "<li><a href=\"" + escapeAttr(link.href) + "\"" + target + ">" +
          escapeHtml(link.label) + "</a></li>"
        );
      }).join("");
    }
  }

  /* ---------- 2. Scroll spy: tandai link section aktif ---------- */
  function initScrollSpy() {
    const links = Array.prototype.slice.call(
      document.querySelectorAll("[data-nav-link]")
    );
    if (!links.length) return;

    const sections = links
      .map(function (link) {
        return document.getElementById(link.dataset.navLink);
      })
      .filter(Boolean);

    if (!sections.length) return;

    let ticking = false;

    function update() {
      ticking = false;

      // Posisi acuan: 35% dari tinggi viewport
      const line = window.scrollY + window.innerHeight * 0.35;
      let activeId = sections[0].id;

      sections.forEach(function (section) {
        if (section.offsetTop <= line) activeId = section.id;
      });

      // Jika sudah sangat bawah, tandai section terakhir
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 4) {
        activeId = sections[sections.length - 1].id;
      }

      links.forEach(function (link) {
        link.classList.toggle("is-active", link.dataset.navLink === activeId);
      });
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      global.requestAnimationFrame(update);
    }

    update();
    global.addEventListener("scroll", onScroll, { passive: true });
    global.addEventListener("resize", onScroll, { passive: true });
  }

  /* ---------- 3. Menu mobile (hamburger) ---------- */
  function initMobileMenu() {
    const toggle = document.getElementById("nav-toggle");
    const menu = document.getElementById("nav-menu");
    if (!toggle || !menu) return;

    function setOpen(isOpen) {
      menu.classList.toggle("is-open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Tutup menu navigasi" : "Buka menu navigasi");
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    // Tutup menu ketika link di dalam menu diklik
    menu.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    // Tutup menu saat klik di luar navbar
    document.addEventListener("click", function (event) {
      if (toggle.getAttribute("aria-expanded") !== "true") return;
      if (event.target.closest(".navbar")) return;
      setOpen(false);
    });

    // Tutup menu saat tekan Escape
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });

    // Tutup menu otomatis jika kembali ke desktop
    global.addEventListener("resize", function () {
      if (window.innerWidth > 767) setOpen(false);
    });
  }

  /* ---------- 4. Utilitas ---------- */
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/"/g, "&quot;");
  }

  global.Nav = {
    init: function () {
      renderLinks();
      initMobileMenu();
      initScrollSpy();
    }
  };
})(window);
