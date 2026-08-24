
(() => {
  "use strict";

  const data = {
    ...(window.SITE_DATA || {}),
    profile: window.SITE_PROFILE || { email: "", links: {} }
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const normalize = (value = "") =>
    String(value).toLocaleLowerCase("en").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

  const externalLink = (link, className = "text-link") =>
    `<a class="${className}" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`;

  const tags = (items = [], extraClass = "") =>
    `<div class="tag-row">${items.map(item => `<span class="tag ${extraClass}">${escapeHtml(item)}</span>`).join("")}</div>`;

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("theme", theme); } catch {}
    const toggle = $("#themeToggle");
    if (toggle) {
      toggle.textContent = theme === "dark" ? "☀" : "◐";
      toggle.setAttribute("aria-label", theme === "dark" ? "Use light theme" : "Use dark theme");
      toggle.setAttribute("title", theme === "dark" ? "Use light theme" : "Use dark theme");
    }
  }

  function initTheme() {
    let stored = null;
    try { stored = localStorage.getItem("theme"); } catch {}
    const preferred = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(stored || preferred);
    $("#themeToggle")?.addEventListener("click", () => {
      setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    });
  }

  function initNavigation() {
    const page = document.body.dataset.page;
    $$("[data-nav]").forEach(link => {
      if (link.dataset.nav === page) link.setAttribute("aria-current", "page");
    });
    const menuButton = $("#menuToggle");
    const links = $("#navLinks");
    menuButton?.addEventListener("click", () => {
      const open = links?.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(Boolean(open)));
      menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
      menuButton.textContent = open ? "×" : "☰";
    });
    $$("#navLinks a").forEach(link => link.addEventListener("click", () => {
      links?.classList.remove("open");
      if (menuButton) {
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open navigation");
        menuButton.textContent = "☰";
      }
    }));
    document.addEventListener("keydown", event => {
      if (event.key !== "Escape" || !links?.classList.contains("open")) return;
      links.classList.remove("open");
      menuButton?.setAttribute("aria-expanded", "false");
      menuButton?.setAttribute("aria-label", "Open navigation");
      if (menuButton) menuButton.textContent = "☰";
      menuButton?.focus();
    });
  }

  function initGlobal() {
    const year = new Date().getFullYear();
    $$("[data-current-year]").forEach(node => { node.textContent = year; });

    const back = $("#backToTop");
    const updateBack = () => back?.classList.toggle("visible", window.scrollY > 700);
    window.addEventListener("scroll", updateBack, { passive: true });
    updateBack();
    back?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    $("#copyEmail")?.addEventListener("click", async (event) => {
      event.preventDefault();
      if (!data.profile.email) return;
      try {
        await navigator.clipboard.writeText(data.profile.email);
        const target = event.currentTarget;
        const original = target.textContent;
        target.textContent = "Email copied";
        setTimeout(() => { target.textContent = original; }, 1600);
      } catch {
        window.location.href = `mailto:${data.profile.email}`;
      }
    });
  }

  function publicationMarkup(pub, compact = false) {
    const pubTags = compact ? pub.topics.slice(0, 2) : pub.topics;
    return `
      <article class="${compact ? "card" : "publication-item"}">
        <div class="publication-card">
          <div class="pub-year">${escapeHtml(pub.year)}</div>
          <div class="pub-content">
            <p class="eyebrow">${escapeHtml(pub.type)} · ${escapeHtml(pub.venue)}</p>
            <h3>${escapeHtml(pub.title)}</h3>
            <p class="pub-meta">${escapeHtml(pub.authors)}</p>
            ${compact ? "" : `<p class="pub-summary">${escapeHtml(pub.summary)}</p>`}
            ${tags(pubTags)}
            <div class="link-row">
              ${pub.links.map(link => externalLink(link)).join("")}
              ${pub.identifier ? `<span class="publication-identifier">${escapeHtml(pub.identifier)}</span>` : ""}
            </div>
          </div>
        </div>
      </article>`;
  }

  function renderHome() {
    $$('[data-research-grid]').forEach(grid => {
      grid.innerHTML = data.researchInterests.map(item => `
        <article class="card interest-card">
          <div class="card-body">
            <div class="interest-icon" aria-hidden="true">${escapeHtml(item.icon)}</div>
            <h3 class="card-title">${escapeHtml(item.title)}</h3>
            <p class="card-copy">${escapeHtml(item.description)}</p>
          </div>
        </article>`).join("");
    });

    const featured = data.publications
      .filter(pub => pub.featured)
      .sort((a, b) => b.year - a.year)
      .slice(0, 4);
    const featuredPublications = $("#featuredPublications");
    if (featuredPublications) featuredPublications.innerHTML = featured.map(pub => publicationMarkup(pub, true)).join("");

    const projects = data.projects.slice(0, 3);
    const featuredProjects = $("#featuredProjects");
    if (featuredProjects) featuredProjects.innerHTML = projects.map(project => projectMarkup(project)).join("");

    const counts = {
      publicationCount: data.publications.length,
      supervisionCount: data.supervision.length,
      publicProjectCount: data.projects.length,
      openDatasetCount: data.projects.filter(item => /dataset|data/i.test(item.tags.join(" "))).length
    };
    Object.entries(counts).forEach(([id, value]) => {
      const node = $(`#${id}`);
      if (node) node.textContent = value;
    });
  }

  function initPublications() {
    const list = $("#publicationList");
    if (!list) return;

    const search = $("#publicationSearch");
    const typeSelect = $("#publicationType");
    const yearSelect = $("#publicationYear");
    const topicSelect = $("#publicationTopic");
    const count = $("#publicationResults");

    const types = [...new Set(data.publications.map(pub => pub.type))].sort();
    const years = [...new Set(data.publications.map(pub => pub.year))].sort((a, b) => b - a);
    const topics = [...new Set(data.publications.flatMap(pub => pub.topics))].sort();

    typeSelect.innerHTML += types.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");
    yearSelect.innerHTML += years.map(value => `<option value="${value}">${value}</option>`).join("");
    topicSelect.innerHTML += topics.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("");

    function render() {
      const query = normalize(search.value);
      const type = typeSelect.value;
      const year = yearSelect.value;
      const topic = topicSelect.value;
      const filtered = data.publications
        .filter(pub => !query || normalize([pub.title, pub.authors, pub.venue, pub.summary, ...pub.topics].join(" ")).includes(query))
        .filter(pub => !type || pub.type === type)
        .filter(pub => !year || String(pub.year) === year)
        .filter(pub => !topic || pub.topics.includes(topic))
        .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));

      count.textContent = `${filtered.length} publication${filtered.length === 1 ? "" : "s"}`;
      list.innerHTML = filtered.length
        ? filtered.map(pub => publicationMarkup(pub)).join("")
        : `<div class="empty-state">No publications match the selected filters.</div>`;
    }

    [search, typeSelect, yearSelect, topicSelect].forEach(control =>
      control.addEventListener(control === search ? "input" : "change", render)
    );
    render();
  }

  function projectMarkup(project) {
    return `
      <article class="card project-card">
        <div class="card-body">
          <span class="status">${escapeHtml(project.status)}</span>
          <p class="eyebrow" style="margin-top:18px">${escapeHtml(project.eyebrow)}</p>
          <h3 class="card-title">${escapeHtml(project.title)}</h3>
          <p class="card-copy">${escapeHtml(project.description)}</p>
          ${tags(project.tags)}
          <div class="link-row">${project.links.map(link => externalLink(link)).join("")}</div>
        </div>
      </article>`;
  }

  function renderProjects() {
    const grid = $("#projectGrid");
    if (!grid) return;
    grid.innerHTML = data.projects.map(projectMarkup).join("");
  }

  function hostingGroups(hosting) {
    const groups = [];
    if (/^ITU(?:;|$)/i.test(hosting)) groups.push("ITU");
    if (/ITU-GN/i.test(hosting)) groups.push("ITU–GN");
    return groups.length ? groups : ["ITU"];
  }

  function datasetGroups(value) {
    const groups = [];
    if (/\bAFFEC\b/i.test(value)) groups.push("AFFEC");
    if (/\bGroupAffect-4\b/i.test(value)) groups.push("GroupAffect-4");
    if (/ongoing larger-scale capture/i.test(value)) groups.push("ongoing larger-scale capture");
    return groups;
  }

  function themeLabel(theme) {
    return ({
      "Individual affect & cognition": "Affect & Personality",
      "Multimodal learning": "Multimodal Learning",
      "Group interaction": "Group Interaction",
      "Multi-camera capture": "Multi-Camera & Sensing",
      "Multimodal language models": "Multimodal Language Models"
    })[theme] || theme;
  }

  function thesisMarkup(item) {
    const degreeTags = item.degrees.map(degree => `<span class="tag tag-teal">${escapeHtml(degree)}</span>`).join("");
    const refs = item.references.map(id => {
      const ref = data.references.find(entry => entry.id === id);
      return ref
        ? `<a class="ref-chip" href="#ref-${id}" title="${escapeHtml(ref.citation)}">[${id}]</a>`
        : "";
    }).join("");
    return `
      <details class="thesis-card" id="${escapeHtml(item.id)}">
        <summary>
          <span class="thesis-number">${item.number}</span>
          <span class="thesis-title">
            <h3>${escapeHtml(item.title)}</h3>
            <span class="tag-row">
              ${degreeTags}
              <span class="tag">${escapeHtml(themeLabel(item.theme))}</span>
              <span class="tag tag-violet">${escapeHtml(hostingGroups(item.hosting).join(" / "))}</span>
            </span>
          </span>
          <span class="expand-icon" aria-hidden="true">+</span>
        </summary>
        <div class="thesis-detail">
          <p class="eyebrow">Scientific motivation & realistic scope</p>
          <p>${escapeHtml(item.description)}</p>
          <div class="meta-grid">
            <div class="meta-box"><small>Suitable for</small><span>${escapeHtml(item.suitable)}</span></div>
            <div class="meta-box"><small>Hosting</small><span>${escapeHtml(item.hosting)}</span></div>
            <div class="meta-box"><small>Starting data</small><span>${escapeHtml(item.data)}</span></div>
          </div>
          <p class="eyebrow">Feasibility</p>
          <p>${escapeHtml(item.availability)}. Final scope depends on degree level, student background, data access, and project duration.</p>
          <p class="eyebrow">Starting references</p>
          <div class="ref-links">${refs}</div>
        </div>
      </details>`;
  }

  function referenceMarkup(ref) {
    return `
      <article class="reference-item" id="ref-${ref.id}">
        <div class="reference-number">[${ref.id}]</div>
        <div>
          <small>${escapeHtml(ref.kind)}</small>
          <p>${escapeHtml(ref.citation)}</p>
          ${ref.url ? `<a href="${escapeHtml(ref.url)}" target="_blank" rel="noopener noreferrer">Open source ↗</a>` : `<small class="reference-note">Identifier supplied; canonical link pending activation.</small>`}
        </div>
      </article>`;
  }

  function initSupervision() {
    const list = $("#supervisionList");
    if (!list) return;

    const search = $("#supervisionSearch");
    const degree = $("#supervisionDegree");
    const theme = $("#supervisionTheme");
    const hosting = $("#supervisionHosting");
    const dataset = $("#supervisionDataset");
    const count = $("#supervisionResults");

    const themes = [...new Set(data.supervision.map(item => item.theme))].sort();
    theme.innerHTML += themes.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(themeLabel(value))}</option>`).join("");

    function render() {
      const query = normalize(search.value);
      const degreeValue = degree.value;
      const themeValue = theme.value;
      const hostingValue = hosting.value;
      const datasetValue = dataset.value;
      const filtered = data.supervision
        .filter(item => !query || normalize([item.title, item.theme, item.description, item.data, item.hosting, item.suitable, item.availability].join(" ")).includes(query))
        .filter(item => !degreeValue || item.degrees.includes(degreeValue))
        .filter(item => !themeValue || item.theme === themeValue)
        .filter(item => !hostingValue || hostingGroups(item.hosting).includes(hostingValue))
        .filter(item => !datasetValue || datasetGroups(item.data).includes(datasetValue));

      count.textContent = `${filtered.length} idea${filtered.length === 1 ? "" : "s"}`;
      list.innerHTML = filtered.length
        ? filtered.map(thesisMarkup).join("")
        : `<div class="empty-state">No thesis ideas match the selected filters.</div>`;
    }

    [search, degree, theme, hosting, dataset].forEach(control =>
      control.addEventListener(control === search ? "input" : "change", render)
    );
    render();

    $("#referenceList").innerHTML = data.references.map(referenceMarkup).join("");

    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash) {
      const target = document.getElementById(hash);
      if (target?.tagName === "DETAILS") target.open = true;
    }
  }

  function initProfileLinks() {
    $$("[data-profile-link]").forEach(link => {
      const key = link.dataset.profileLink;
      const url = data.profile.links?.[key];
      if (url) {
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      } else {
        link.hidden = true;
        link.removeAttribute("href");
      }
    });
    $$("[data-profile-email]").forEach(link => {
      if (!data.profile.email) {
        link.hidden = true;
        link.removeAttribute("href");
        return;
      }
      const subject = link.dataset.emailSubject;
      link.href = `mailto:${data.profile.email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
    });
    $$("[data-profile-email-address]").forEach(node => {
      if (data.profile.email) node.textContent = data.profile.email;
      else node.hidden = true;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    initNavigation();
    initGlobal();
    initProfileLinks();
    renderHome();
    initPublications();
    renderProjects();
    initSupervision();
  });
})();
