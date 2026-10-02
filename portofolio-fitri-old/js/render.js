/* ============================================================
   render.js — merender konten dari data.js ke dalam HTML.
   Semua card/bullet dibuat lewat template string, sehingga
   menambah data baru cukup mengedit array di data.js.
   ============================================================ */

(function (global) {
  "use strict";

  /* ---------- 0. Utilitas ---------- */
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isSafeUrl(url) {
    if (!url) return false;
    var clean = String(url).trim();
    // Tolak javascript: dan protokol berbahaya lain
    if (/^(javascript|vbscript|file):/i.test(clean)) return false;
    return /^(https?:|mailto:|\/|#|\.)/i.test(clean);
  }

  function clampLevel(level) {
    var n = Number(level);
    if (!isFinite(n)) return 0;
    return Math.min(100, Math.max(0, Math.round(n)));
  }

  function listHtml(items) {
    if (!Array.isArray(items) || !items.length) return "";
    return (
      '<ul class="tl-item__list">' +
      items
        .map(function (item) {
          return "<li>" + escapeHtml(item) + "</li>";
        })
        .join("") +
      "</ul>"
    );
  }

  /* ---------- 1. Hero ---------- */
  function renderHero() {
    var nameEl = document.querySelector(".hero__name");
    if (nameEl && global.SITE && global.SITE.name) {
      nameEl.textContent = global.SITE.name;
    }

    var eyebrowEl = document.querySelector(".hero__eyebrow");
    if (eyebrowEl && global.SITE && global.SITE.availability) {
      eyebrowEl.innerHTML =
        '<span class="hero__dot" aria-hidden="true"></span>' +
        escapeHtml(global.SITE.availability);
    }

    var photo = document.querySelector(".about__photo img");
    if (photo) {
      photo.alt = "Foto profil " + ((global.SITE && global.SITE.name) || "portofolio");
    }
  }

  /* ---------- 2. About ---------- */
  function renderAbout() {
    var list = document.getElementById("about-learning");
    var data = global.ABOUT_LEARNING;
    if (!list || !Array.isArray(data) || !data.length) return;

    list.innerHTML = data
      .map(function (item) {
        return "<li>" + escapeHtml(item) + "</li>";
      })
      .join("");
  }

  /* ---------- 3. Skills ---------- */
  function renderSkills() {
    var grid = document.getElementById("skills-grid");
    var groups = global.SKILL_GROUPS;
    if (!grid || !Array.isArray(groups) || !groups.length) return;

    grid.innerHTML = groups
      .map(function (group) {
        var skills = Array.isArray(group.skills) ? group.skills : [];

        var skillHtml = skills
          .map(function (skill) {
            var level = clampLevel(skill.level);
            return (
              '<div class="skill">' +
              '<div class="skill__head">' +
              '<span class="skill__name">' + escapeHtml(skill.name) + "</span>" +
              '<span class="skill__level">' + level + "%</span>" +
              "</div>" +
              '<div class="skill__bar" role="img" aria-label="' +
              escapeHtml(skill.name) + ": " + level + ' persen">' +
              '<span class="skill__fill" data-level="' + level + '"></span>' +
              "</div>" +
              (skill.note
                ? '<p class="skill__note">' + escapeHtml(skill.note) + "</p>"
                : "") +
              "</div>"
            );
          })
          .join("");

        return (
          '<article class="skills__group" data-reveal>' +
          '<header class="skills__group-head">' +
          (group.icon
            ? '<span class="skills__group-icon" aria-hidden="true">' +
              escapeHtml(group.icon) +
              "</span>"
            : "") +
          '<h3 class="skills__group-title">' + escapeHtml(group.title) + "</h3>" +
          "</header>" +
          '<div class="skills__list">' + skillHtml + "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  /* ---------- 4. Projects ---------- */
  function renderProjects() {
    var grid = document.getElementById("projects-grid");
    var empty = document.getElementById("projects-empty");
    var projects = global.PROJECTS;
    if (!grid) return;

    if (!Array.isArray(projects) || !projects.length) {
      grid.innerHTML = "";
      if (empty) empty.classList.remove("is-hidden");
      return;
    }

    // Tampilkan project featured lebih dulu
    var ordered = projects.slice().sort(function (a, b) {
      return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    });

    grid.innerHTML = ordered
      .map(function (project, index) {
        var tech = Array.isArray(project.tech) ? project.tech : [];
        var image = project.image || "assets/img/project-placeholder.svg";
        var alt = project.alt || "Preview " + (project.title || "project");
        var hasDemo = isSafeUrl(project.demo);
        var hasRepo = isSafeUrl(project.repo);
        var links = [];

        if (hasDemo) {
          links.push(
            '<a class="project__link" href="' +
              escapeHtml(project.demo) +
              '" target="_blank" rel="noopener noreferrer" aria-label="Buka demo ' +
              escapeHtml(project.title) +
              '" title="Demo">▶</a>'
          );
        }
        if (hasRepo) {
          links.push(
            '<a class="project__link" href="' +
              escapeHtml(project.repo) +
              '" target="_blank" rel="noopener noreferrer" aria-label="Lihat kode ' +
              escapeHtml(project.title) +
              '" title="Kode">⌨</a>'
          );
        }

        var actions = [];
        if (hasDemo) {
          actions.push(
            '<a class="btn btn--primary btn--sm" href="' +
              escapeHtml(project.demo) +
              '" target="_blank" rel="noopener noreferrer">Demo</a>'
          );
        }
        if (hasRepo) {
          actions.push(
            '<a class="btn btn--outline btn--sm" href="' +
              escapeHtml(project.repo) +
              '" target="_blank" rel="noopener noreferrer">GitHub</a>'
          );
        }
        if (!actions.length) {
          actions.push(
            '<span class="badge badge--dot">Segera hadir</span>'
          );
        }

        return (
          '<article class="card card--hover project" data-reveal data-reveal-delay="' +
          (index % 3) +
          '">' +
          '<div class="project__media">' +
          (project.status
            ? '<span class="badge badge--accent project__badge">' +
              escapeHtml(project.status) +
              "</span>"
            : "") +
          (links.length ? '<div class="project__links">' + links.join("") + "</div>" : "") +
          '<img class="project__img" src="' +
          escapeHtml(image) +
          '" alt="' +
          escapeHtml(alt) +
          '" loading="lazy" decoding="async" width="640" height="400" />' +
          "</div>" +
          '<div class="project__body">' +
          '<div class="project__head">' +
          '<h3 class="project__title">' + escapeHtml(project.title) + "</h3>" +
          (project.year
            ? '<span class="project__year">' + escapeHtml(project.year) + "</span>"
            : "") +
          "</div>" +
          '<p class="project__desc">' + escapeHtml(project.desc) + "</p>" +
          '<div class="project__footer">' +
          '<div class="tag-list">' +
          tech
            .map(function (item) {
              return '<span class="badge">' + escapeHtml(item) + "</span>";
            })
            .join("") +
          "</div>" +
          '<div class="project__actions">' + actions.join("") + "</div>" +
          "</div>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");

    if (empty) empty.classList.add("is-hidden");

    // statistik jumlah proyek di hero ikut ter-update otomatis
    var stat = document.getElementById("stat-projects");
    if (stat) stat.textContent = projects.length + "+";
  }

  /* ---------- 5. Experience / Education ---------- */
  function renderExperience() {
    var root = document.getElementById("exp-root");
    var groups = global.EXPERIENCE_GROUPS;
    if (!root) return;

    if (!Array.isArray(groups) || !groups.length) {
      root.innerHTML = "";
      return;
    }

    root.innerHTML =
      '<div class="exp__grid">' +
      groups
        .map(function (group) {
          var items = Array.isArray(group.items) ? group.items : [];
          if (!items.length) return "";

          var timeline = items
            .map(function (item) {
              var badges = [];
              if (item.status === "current") {
                badges.push('<span class="badge badge--accent badge--dot">Sedang berjalan</span>');
              }

              return (
                '<li class="tl-item' +
                (item.muted ? " tl-item--muted" : "") +
                '" data-reveal>' +
                '<div class="tl-item__meta">' +
                (item.period
                  ? '<span class="tl-item__period">' + escapeHtml(item.period) + "</span>"
                  : "") +
                (item.org
                  ? '<span class="tl-item__org">' + escapeHtml(item.org) + "</span>"
                  : "") +
                badges.join("") +
                "</div>" +
                '<h3 class="tl-item__title">' + escapeHtml(item.title) + "</h3>" +
                (item.desc ? '<p class="tl-item__desc">' + escapeHtml(item.desc) + "</p>" : "") +
                listHtml(item.points) +
                "</li>"
              );
            })
            .join("");

          return (
            '<section class="exp__col" aria-labelledby="exp-' +
            escapeHtml(group.key) +
            '">' +
            '<h3 class="exp__col-title" id="exp-' +
            escapeHtml(group.key) +
            '">' +
            escapeHtml(group.title) +
            "</h3>" +
            '<ul class="timeline">' + timeline + "</ul>" +
            "</section>"
          );
        })
        .join("") +
      "</div>";
  }

  /* ---------- 6. Contact ---------- */
  function renderContact() {
    var list = document.getElementById("contact-list");
    var contacts = global.CONTACTS;
    if (!list) return;

    if (!Array.isArray(contacts) || !contacts.length) {
      list.innerHTML = "";
      return;
    }

    list.innerHTML = contacts
      .map(function (item) {
        var external = /^https?:/i.test(item.href || "");
        var target = external ? ' target="_blank" rel="noopener noreferrer"' : "";
        var href = isSafeUrl(item.href) ? item.href : "#contact";

        return (
          '<li><a class="contact__item" href="' +
          escapeHtml(href) +
          '"' +
          target +
          ">" +
          (item.icon
            ? '<span class="contact__icon" aria-hidden="true">' + escapeHtml(item.icon) + "</span>"
            : "") +
          '<span class="contact__body">' +
          '<span class="contact__label">' + escapeHtml(item.label) + "</span>" +
          '<span class="contact__value">' + escapeHtml(item.value) + "</span>" +
          "</span>" +
          "</a></li>"
        );
      })
      .join("");
  }

  /* ---------- 7. Footer ---------- */
  function renderFooter() {
    var copy = document.querySelector(".footer__copy");
    if (!copy) return;

    var year =
      global.SITE && global.SITE.copyrightYear
        ? global.SITE.copyrightYear
        : new Date().getFullYear();
    var name = (global.SITE && global.SITE.name) || "Nurul Fitriani";

    copy.textContent =
      "© " + year + " " + name + ". All rights reserved.";
  }

  /* ---------- 8. Public API ---------- */
  global.Render = {
    init: function () {
      renderHero();
      renderAbout();
      renderSkills();
      renderProjects();
      renderExperience();
      renderContact();
      renderFooter();
    },
    escapeHtml: escapeHtml
  };
})(window);
