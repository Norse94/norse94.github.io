/* FD EMBED LINK build 2026-07-05.21 */
(() => {
  "use strict";

  const CONFIG = {
    appTitle: "FD EMBED LINK",
    version: "2026-07-05.21",
    edgeEndpoint: "https://mycvmmlezpxdoamecrhb.functions.supabase.co/embed-link",
    allowedForumHosts: ["difesa.forumfree.it", "difesaitalia.forumfree.it"],
    maxImages: 5,
    requestTimeoutMs: 12000,
    pendingStorageKey: "fd_embed_link_pending_v1",
    submitStorageKey: "fd_embed_link_submit_v1",
    pasteInterceptionStorageKey: "fd_embed_link_paste_interception_v1"
  };

  const APP_TITLE = CONFIG.appTitle;
  const EDITOR_BUTTON_TITLE = "Embed Link";
  const IMAGE_URL_RE = /\.(?:jpe?g|png|gif|webp|avif|svg)(?:[?#].*)?$/i;
  const ID_PREFIX = "fd-embed-link-";

  const state = {
    initialized: false,
    buttonsRegistered: false,
    classicButtonRegistered: false,
    visualButtonRegistered: false,
    pasteRegistered: false,
    textareaApiPasteRegistered: false,
    pasteTargetCount: 0,
    pasteDisabled: false,
    pasteInterceptionEnabled: true,
    pasteText: "",
    preview: null,
    commonsModal: null,
    localModal: null,
    localModalOpenedAt: 0,
    lastOpenAttempt: null,
    lastModalError: "",
    lastPreviewExistingCount: 0,
    lastPreviewExistingUrls: [],
    integrationAttempts: 0,
    integrationTimer: 0,
    integrationInterval: 0,
    integrationObserver: null,
    pasteTargets: new WeakSet()
  };

  function commons() {
    return window.Commons || null;
  }

  function isConfigured() {
    return /^https:\/\/[a-z0-9-]+\.functions\.supabase\.co\/embed-link$/i.test(CONFIG.edgeEndpoint);
  }

  function toast(type, title, content) {
    const C = commons();
    if (C && C.toast && typeof C.toast.show === "function") {
      C.toast.show({
        class: ["cs-toast-" + (type || "info")],
        title: title || APP_TITLE,
        content: content || "",
        ttl: 5000
      });
      return;
    }

    if (content) {
      console.log("[FDEmbedLink] " + title + ": " + content);
    }
  }

  function closeModal() {
    if (state.commonsModal) {
      const modal = state.commonsModal;
      state.commonsModal = null;
      if (typeof modal.hide === "function") {
        modal.hide();
        return;
      }
      if (typeof modal.close === "function") {
        modal.close();
        return;
      }
      if (typeof modal.toggle === "function") {
        modal.toggle();
        return;
      }
    }

    if (state.localModal && state.localModal.parentNode) {
      state.localModal.parentNode.removeChild(state.localModal);
      state.localModal = null;
      return;
    }

    const C = commons();
    if (C && C.modal && typeof C.modal.close === "function") {
      C.modal.close();
    }
  }

  function showModal(title, content, footer, className) {
    try {
      const C = commons();
      const modalClasses = getModalClasses(className, "cs-modal-w60");
      if (!C || !C.modal) {
        return showLocalModal(title, content, footer, className);
      }

      if (typeof C.modal.create === "function") {
        closeModal();
        const created = C.modal.create({
          className: modalClasses,
          title,
          content,
          footer,
          events: {
            "hide-end": () => {
              state.commonsModal = null;
            }
          }
        });
        state.commonsModal = created;
        if (created && typeof created.show === "function") {
          created.show();
          return "create.show";
        }
        if (created && typeof created.toggle === "function") {
          created.toggle();
          return "create.toggle";
        }
        return "create";
      }

      if (typeof C.modal.set === "function") {
        return C.modal.set({
          class: modalClasses,
          title,
          content,
          footer
        }, true);
      }

      return showLocalModal(title, content, footer, className);
    } catch (error) {
      state.lastModalError = error instanceof Error ? error.message : String(error);
      console.error("[FDEmbedLink] apertura modal fallita", error);
      return 0;
    }
  }

  function getModalClasses(className, fallbackClassName) {
    const widthClasses = String(className || fallbackClassName || "").split(/\s+/).filter(Boolean);
    const hasTextAlignment = widthClasses.some((item) => /^cs-modal-text-(?:left|center|right)$/.test(item));
    const baseClasses = hasTextAlignment ? ["fd-embed-modal"] : ["fd-embed-modal", "cs-modal-text-left"];
    return baseClasses.concat(widthClasses);
  }

  function showLocalModal(title, content, footer, className) {
    closeModal();

    const overlay = document.createElement("div");
    overlay.className = "fd-embed-local-modal";
    overlay.setAttribute("data-fd-embed-local-modal", "");

    overlay.innerHTML = [
      "<div class=\"fd-embed-local-modal__backdrop\" data-fd-embed-action=\"url-cancel\"></div>",
      `<section class="fd-embed-local-modal__dialog ${escapeAttr(className || "")}" role="dialog" aria-modal="true" aria-label="${escapeAttr(title)}">`,
      "  <header class=\"fd-embed-local-modal__header\">",
      `    <strong>${escapeHtml(title)}</strong>`,
      "    <button class=\"fd-embed-local-modal__close\" type=\"button\" data-fd-embed-action=\"url-cancel\" aria-label=\"Chiudi\">x</button>",
      "  </header>",
      `  <div class="fd-embed-local-modal__body">${content || ""}</div>`,
      `  <footer class="fd-embed-local-modal__footer">${footer || ""}</footer>`,
      "</section>"
    ].join("\n");

    document.body.appendChild(overlay);
    applyLocalModalStyles(overlay);
    state.localModal = overlay;
    state.localModalOpenedAt = Date.now();
    return -1;
  }

  function applyLocalModalStyles(overlay) {
    const backdrop = overlay.querySelector(".fd-embed-local-modal__backdrop");
    const dialog = overlay.querySelector(".fd-embed-local-modal__dialog");
    const header = overlay.querySelector(".fd-embed-local-modal__header");
    const body = overlay.querySelector(".fd-embed-local-modal__body");
    const footer = overlay.querySelector(".fd-embed-local-modal__footer");
    const close = overlay.querySelector(".fd-embed-local-modal__close");

    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483647",
      "display:grid",
      "place-items:center",
      "box-sizing:border-box",
      "padding:16px"
    ].join(";");

    if (backdrop) {
      backdrop.style.cssText = [
        "position:absolute",
        "inset:0",
        "background:rgba(21,24,25,.58)"
      ].join(";");
    }

    if (dialog) {
      dialog.style.cssText = [
        "position:relative",
        "z-index:1",
        "width:min(680px,100%)",
        "max-height:min(760px,calc(100vh - 32px))",
        "display:grid",
        "grid-template-rows:auto minmax(0,1fr) auto",
        "overflow:hidden",
        "box-sizing:border-box",
        "border-radius:8px",
        "background:#fff",
        "color:#151819",
        "box-shadow:0 18px 48px rgba(21,24,25,.32)"
      ].join(";");
    }

    if (header) {
      header.style.cssText = [
        "display:flex",
        "align-items:center",
        "justify-content:space-between",
        "gap:12px",
        "padding:12px 14px",
        "border-bottom:1px solid #d7ded8"
      ].join(";");
    }

    if (body) {
      body.style.cssText = [
        "min-height:0",
        "overflow:auto",
        "padding:14px",
        "box-sizing:border-box"
      ].join(";");
    }

    if (footer) {
      footer.style.cssText = [
        "padding:12px 14px",
        "border-top:1px solid #d7ded8"
      ].join(";");
    }

    if (close) {
      close.style.cssText = [
        "width:30px",
        "height:30px",
        "border:1px solid #bfc8c4",
        "border-radius:6px",
        "background:#fff",
        "color:#151819",
        "font:inherit",
        "font-weight:700",
        "cursor:pointer"
      ].join(";");
    }
  }

  function markOpenStep(step, extra) {
    if (!state.lastOpenAttempt) {
      state.lastOpenAttempt = {
        startedAt: new Date().toISOString(),
        steps: []
      };
    }

    state.lastOpenAttempt.steps.push({
      step,
      at: new Date().toISOString(),
      ...(extra || {})
    });
  }

  function openUrlPromptFallback(initialUrl, reason) {
    markOpenStep("prompt-fallback", { reason });
    const value = window.prompt(APP_TITLE + "\nInserisci URL articolo", initialUrl || "");
    if (!value) {
      markOpenStep("prompt-cancelled");
      return;
    }
    markOpenStep("prompt-confirmed", { value });
    openPreviewForUrl(value);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function decodeTextEntities(value) {
    let text = String(value == null ? "" : value);

    for (let index = 0; index < 3; index += 1) {
      const decoded = text
        .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, "\"")
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/&rsquo;/g, "'")
        .replace(/&lsquo;/g, "'")
        .replace(/&rdquo;/g, "\"")
        .replace(/&ldquo;/g, "\"")
        .replace(/&ndash;/g, "-")
        .replace(/&mdash;/g, "-");

      if (decoded === text) {
        return decoded;
      }
      text = decoded;
    }

    return text;
  }

  function normalizeSpace(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function loadPasteInterceptionPreference() {
    try {
      return localStorage.getItem(CONFIG.pasteInterceptionStorageKey) !== "off";
    } catch (_error) {
      return true;
    }
  }

  function savePasteInterceptionPreference(enabled) {
    state.pasteInterceptionEnabled = Boolean(enabled);
    try {
      localStorage.setItem(CONFIG.pasteInterceptionStorageKey, enabled ? "on" : "off");
    } catch (_error) {
      // Preference persistence is best-effort only.
    }
    updatePasteInterceptionSwitch();
  }

  function updatePasteInterceptionSwitch() {
    const input = document.querySelector("[data-fd-embed-paste-toggle]");
    const stateLabel = document.querySelector("[data-fd-embed-paste-state]");
    if (input) {
      input.checked = state.pasteInterceptionEnabled;
    }
    if (stateLabel) {
      stateLabel.textContent = state.pasteInterceptionEnabled ? "On" : "Off";
    }
  }

  function truncate(value, maxLength) {
    const text = normalizeSpace(value);
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, Math.max(0, maxLength - 1)).trimEnd() + "...";
  }

  function parseUrl(value) {
    const raw = normalizeSpace(value);
    if (!raw || /\s/.test(raw)) {
      return null;
    }

    try {
      const url = new URL(raw);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return null;
      }
      return url;
    } catch (_error) {
      return null;
    }
  }

  function isDirectImageUrl(value) {
    const url = parseUrl(value);
    return Boolean(url && IMAGE_URL_RE.test(url.pathname + url.search));
  }

  function getDomain(value) {
    try {
      return new URL(value).hostname.replace(/^www\./i, "");
    } catch (_error) {
      return "";
    }
  }

  function getUser() {
    const C = commons();
    const user = C && C.user ? C.user : {};
    return {
      id: Number(user.id || 0),
      nickname: user.nickname || null,
      isGuest: Boolean(user.isGuest || !user.id)
    };
  }

  function isAllowedForumLocation() {
    const host = location.hostname.toLowerCase();
    const allowedHosts = CONFIG.allowedForumHosts.map((item) => item.toLowerCase());
    const C = commons();
    const forum = C && C.forum ? C.forum : {};

    if (location.protocol === "file:") {
      return true;
    }

    if (allowedHosts.some((allowedHost) => host === allowedHost || host === "www." + allowedHost)) {
      return true;
    }

    return allowedHosts.includes(String(forum.subdomain || "").toLowerCase() + "." + String(forum.domain || "").toLowerCase());
  }

  function getForumContext() {
    const C = commons();
    const forum = C && C.forum ? C.forum : {};
    const locationInfo = C && C.location ? C.location : {};
    const topicId = Number(locationInfo.topic && locationInfo.topic.id || getTopicIdFromUrl() || 0);
    const topicTitle = getTopicTitle(locationInfo);

    return {
      forumId: Number(forum.id || 0),
      forumDomain: forum.domain || location.hostname,
      forumSubdomain: forum.subdomain || "",
      topicId,
      topicTitle,
      pageUrl: window.location.href
    };
  }

  function getTopicTitle(locationInfo) {
    const commonsTitle = locationInfo && locationInfo.topic && locationInfo.topic.title;
    if (commonsTitle) {
      return normalizeSpace(commonsTitle);
    }

    const title = normalizeSpace(document.title || "");
    if (!title) {
      return null;
    }

    return title
      .replace(/\s*[-|•]\s*(ForumFree|ForumCommunity).*$/i, "")
      .replace(/\s*[-|•]\s*difesaitalia\.forumfree\.it.*$/i, "")
      .replace(/\s*[-|•]\s*difesa\.forumfree\.it.*$/i, "")
      .trim() || title;
  }

  function getTopicIdFromUrl() {
    try {
      return Number(new URL(window.location.href).searchParams.get("t") || 0);
    } catch (_error) {
      const match = String(window.location.search || "").match(/[?&]t=(\d+)/);
      return match ? Number(match[1]) : 0;
    }
  }

  function assertCanUse() {
    const user = getUser();
    if (user.isGuest) {
      toast("error", APP_TITLE, "Devi essere autenticato per generare una card.");
      return false;
    }

    if (!isAllowedForumLocation()) {
      toast("error", APP_TITLE, "Questo script e configurato per " + CONFIG.allowedForumHosts.join(", ") + ".");
      return false;
    }

    return true;
  }

  function getEditorTextarea() {
    return document.querySelector("textarea[name='Post']") ||
      document.querySelector("textarea[name='post']") ||
      document.querySelector("textarea[name='message']") ||
      document.querySelector("textarea[id*='Post']") ||
      document.querySelector("textarea[id*='post']") ||
      document.querySelector("textarea");
  }

  function getEditorTextareas() {
    const items = Array.from(document.querySelectorAll([
      "textarea[name='Post']",
      "textarea[name='post']",
      "textarea[name='message']",
      "textarea[id*='Post']",
      "textarea[id*='post']",
      "textarea"
    ].join(",")));
    return [...new Set(items)];
  }

  function getEditorText() {
    const textarea = getEditorTextarea();
    return textarea ? textarea.value || "" : "";
  }

  function addContentToEditor(content) {
    const C = commons();
    if (C && C.utilities && C.utilities.replierForm && C.utilities.replierForm.textarea &&
        typeof C.utilities.replierForm.textarea.addContent === "function") {
      try {
        C.utilities.replierForm.textarea.addContent({ prefix: content });
        return true;
      } catch (_error) {
        C.utilities.replierForm.textarea.addContent(content);
        return true;
      }
    }

    const textarea = getEditorTextarea();
    if (!textarea) {
      toast("error", APP_TITLE, "Textarea editor non trovata.");
      return false;
    }

    const start = textarea.selectionStart || textarea.value.length;
    const end = textarea.selectionEnd || textarea.value.length;
    textarea.value = textarea.value.slice(0, start) + content + textarea.value.slice(end);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  async function requestEdge(action, payload, options = {}) {
    if (!isConfigured()) {
      throw new Error("Configura CONFIG.edgeEndpoint con l'URL della Supabase Edge Function.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);

    try {
      const response = await fetch(CONFIG.edgeEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ...payload, action }),
        signal: controller.signal,
        keepalive: Boolean(options.keepalive)
      });

      const text = await response.text();
      let data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (_error) {
          data = { error: text };
        }
      }

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || data.message || "Richiesta non riuscita.");
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  function normalizeMetadata(raw, fallbackUrl) {
    const metadata = raw && raw.metadata ? raw.metadata : raw || {};
    const sourceUrl = metadata.sourceUrl || metadata.source_url || fallbackUrl;
    const finalUrl = metadata.finalUrl || metadata.final_url || metadata.canonicalUrl || sourceUrl;
    const images = normalizeImages(metadata.images || metadata.candidateImages || metadata.candidate_images || []);

    return {
      sourceUrl,
      finalUrl,
      canonicalUrl: metadata.canonicalUrl || metadata.canonical_url || finalUrl,
      domain: metadata.domain || metadata.sourceDomain || metadata.source_domain || getDomain(finalUrl),
      title: decodeTextEntities(metadata.title || finalUrl),
      description: decodeTextEntities(metadata.description || metadata.excerpt || ""),
      author: decodeTextEntities(metadata.author || ""),
      publishedAt: metadata.publishedAt || metadata.published_at || metadata.articlePublishedAt || "",
      images
    };
  }

  function normalizeExistingPublications(raw) {
    const items = Array.isArray(raw) ? raw : [];
    return items.map((item) => {
      const postUrl = item && (item.postUrl || item.post_url) ? String(item.postUrl || item.post_url) : "";
      const topicTitle = item && (item.topicTitle || item.topic_title) ? String(item.topicTitle || item.topic_title) : "";
      return {
        postUrl,
        topicTitle: topicTitle || "Discussione",
        postId: item && (item.postId || item.post_id) || null,
        topicId: item && (item.topicId || item.topic_id) || null,
        confirmedAt: item && (item.confirmedAt || item.confirmed_at) || ""
      };
    }).filter((item) => item.postUrl);
  }

  function normalizeImages(images) {
    const seen = new Set();
    const out = [];

    for (const item of Array.isArray(images) ? images : []) {
      const url = typeof item === "string" ? item : item && item.url;
      if (!url || seen.has(url)) {
        continue;
      }
      seen.add(url);
      out.push({
        url,
        source: typeof item === "object" && item.source ? item.source : "page"
      });
      if (out.length >= CONFIG.maxImages) {
        break;
      }
    }

    return out;
  }

  function getSelectedImage(metadata) {
    if (!metadata || !metadata.images || !metadata.images.length) {
      return { url: "", index: -1 };
    }

    const index = Math.max(0, Number(state.preview && state.preview.selectedImageIndex || 0));
    const image = metadata.images[index] || metadata.images[0];
    return {
      url: image.url,
      index: metadata.images.indexOf(image)
    };
  }

  function renderCardHtml(metadata, embedId, selectedImageUrl, options = {}) {
    const url = metadata.finalUrl || metadata.sourceUrl;
    const title = truncate(decodeTextEntities(metadata.title || url), 160);
    const description = truncate(decodeTextEntities(metadata.description || ""), 260);
    const domain = metadata.domain || getDomain(url);
    const author = truncate(decodeTextEntities(metadata.author || ""), 80);
    const publishedAt = metadata.publishedAt || "";
    const displayDate = formatDisplayDate(publishedAt);
    const compactClass = options.compact ? " fd-embed-link--compact" : "";
    const noImageClass = selectedImageUrl ? "" : " fd-embed-link--no-image";
    const markerClass = embedId ? " " + getEmbedMarkerClass(embedId) : "";
    const idAttr = embedId ? ` data-fd-embed-id="${escapeAttr(embedId)}"` : "";
    const imageBlock = selectedImageUrl
      ? `<a class="fd-embed-link__media" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer nofollow"><img class="fd-embed-link__image" src="${escapeAttr(selectedImageUrl)}" alt=""></a>`
      : "";
    const sourceBlock = domain
      ? `<div class="fd-embed-link__source"><span class="fd-embed-link__source-mark" aria-hidden="true"></span><span class="fd-embed-link__source-text">${escapeText(domain)}</span></div>`
      : "";
    const excerptBlock = description ? `<p class="fd-embed-link__excerpt">${escapeText(description)}</p>` : "";
    const metaParts = [];

    if (author) {
      metaParts.push(`<span class="fd-embed-link__author">${escapeText(author)}</span>`);
    }

    if (author && displayDate) {
      metaParts.push("<span class=\"fd-embed-link__dot\" aria-hidden=\"true\"></span>");
    }

    if (displayDate) {
      metaParts.push(`<span class="fd-embed-link__date" data-datetime="${escapeAttr(toIsoDate(publishedAt))}">${escapeText(displayDate)}</span>`);
    }

    const metaBlock = metaParts.length ? `<div class="fd-embed-link__meta">${metaParts.join("")}</div>` : "";

    return [
      `<div class="fd-embed-link${compactClass}${noImageClass}${markerClass}"${idAttr}>`,
      imageBlock,
      "<div class=\"fd-embed-link__body\">",
      sourceBlock,
      `<a class="fd-embed-link__title" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer nofollow">${escapeText(title)}</a>`,
      excerptBlock,
      metaBlock,
      "</div>",
      "</div>"
    ].filter(Boolean).join("");
  }

  function getEmbedMarkerClass(embedId) {
    return "fd-embed-link-id-" + String(embedId || "").replace(/[^a-zA-Z0-9_-]/g, "-");
  }

  function contentHasEmbedId(content, embedId) {
    const text = String(content || "");
    const markerClass = getEmbedMarkerClass(embedId);
    return text.includes(`data-fd-embed-id="${embedId}"`) ||
      text.includes(`data-fd-embed-id='${embedId}'`) ||
      text.includes(markerClass);
  }

  function contentHasPendingEmbed(content, embedId, pendingItem) {
    if (contentHasEmbedId(content, embedId)) {
      return true;
    }

    return contentHasPendingEmbedUrl(content, pendingItem);
  }

  function contentHasPendingEmbedUrl(content, pendingItem) {
    const text = String(content || "");
    if (!text.includes("fd-embed-link")) {
      return false;
    }

    return getPendingUrls(pendingItem).some((url) => (
      text.includes(url) ||
      text.includes(escapeHtml(url)) ||
      text.includes(encodeURI(url))
    ));
  }

  function pickUrlFallbackEmbedIds(content, ids, pending, allowedIds) {
    const matches = ids.filter((id) => {
      if (allowedIds && allowedIds.indexOf(id) === -1) {
        return false;
      }
      return contentHasPendingEmbedUrl(content, pending[id]);
    });

    if (!matches.length) {
      return [];
    }

    const byUrl = {};
    matches.forEach((id) => {
      const key = getPendingUrls(pending[id])[0] || id;
      const current = byUrl[key];
      if (!current || Number(pending[id].createdAt || 0) > Number(pending[current].createdAt || 0)) {
        byUrl[key] = id;
      }
    });

    return Object.keys(byUrl).map((key) => byUrl[key]);
  }

  function getPendingUrls(pendingItem) {
    const urls = [];
    ["sourceUrl", "finalUrl", "canonicalUrl"].forEach((key) => {
      const value = pendingItem && pendingItem[key] ? String(pendingItem[key]) : "";
      if (value && urls.indexOf(value) === -1) {
        urls.push(value);
      }
    });
    return urls;
  }

  function formatDisplayDate(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return normalizeSpace(value);
    }

    return date.toLocaleDateString("it-IT", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function toIsoDate(value) {
    if (!value) {
      return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toISOString();
  }

  function renderUrlModal(initialUrl) {
    const inputId = ID_PREFIX + "url";
    return [
      "<div class=\"fd-embed-form\">",
      `  <input class="fd-embed-input" id="${inputId}" type="url" value="${escapeAttr(initialUrl || "")}" placeholder="https://example.com/articolo">`,
      "  <p class=\"fd-embed-error\" data-fd-embed-error hidden></p>",
      "</div>"
    ].join("\n");
  }

  function renderUrlFooter() {
    const checked = state.pasteInterceptionEnabled ? " checked" : "";
    const stateText = state.pasteInterceptionEnabled ? "On" : "Off";
    return [
      "<div class=\"fd-embed-url-footer\">",
      "  <label class=\"fd-embed-paste-switch\">",
      "    <span>Intercetta Link</span>",
      "    <span class=\"fd-embed-switch-control\">",
      `      <input type="checkbox" data-fd-embed-paste-toggle${checked}>`,
      "      <span class=\"fd-embed-switch-track\" aria-hidden=\"true\"><span class=\"fd-embed-switch-thumb\"></span></span>",
      `      <span class="fd-embed-switch-state" data-fd-embed-paste-state>${stateText}</span>`,
      "    </span>",
      "  </label>",
      "  <div class=\"cs-buttons cs-buttons-right fd-embed-actions\">",
      "    <button class=\"cs-btn cs-btn-sm cs-btn-outer-blue cs-modal-close el-cancel\" type=\"button\" data-cs-events=\"\" data-fd-embed-action=\"url-cancel\">Annulla</button>",
      "    <button class=\"cs-btn cs-btn-sm cs-btn-outer-green el-confirm\" type=\"button\" data-cs-events=\"\" data-fd-embed-action=\"url-preview\">Anteprima</button>",
      "  </div>",
      "</div>"
    ].join("\n");
  }

  function renderPasteModal(_url) {
    return "";
  }

  function renderPasteFooter() {
    return [
      "<div class=\"cs-buttons cs-buttons-right fd-embed-actions\">",
      "  <button class=\"cs-btn cs-btn-sm cs-btn-outer-yellow cs-modal-close el-cancel-session\" type=\"button\" data-cs-events=\"\" data-fd-embed-action=\"paste-disable\">Disabilita temporaneamente</button>",
      "  <button class=\"cs-btn cs-btn-sm cs-btn-outer-blue cs-modal-close el-cancel\" type=\"button\" data-cs-events=\"\" data-fd-embed-action=\"paste-normal\">Annulla</button>",
      "  <button class=\"cs-btn cs-btn-sm cs-btn-outer-green cs-modal-close el-confirm\" type=\"button\" data-cs-events=\"\" data-fd-embed-action=\"paste-confirm\">Conferma</button>",
      "</div>"
    ].join("\n");
  }

  function renderPreviewModal() {
    const preview = state.preview;
    const metadata = preview.metadata;
    const existingPublications = preview.existingPublications || [];
    const selected = getSelectedImage(metadata);
    const card = renderCardHtml(metadata, "", selected.url, { compact: false })
      .replace("<img class=\"fd-embed-link__image\"", "<img data-fd-embed-preview-image class=\"fd-embed-link__image\"");
    const existingBlock = renderExistingPublicationsBlock(existingPublications);
    const images = metadata.images.length ? [
      "<div class=\"fd-embed-field fd-embed-cover-picker el-img-preview-container\">",
      "  <strong>Scegli l'immagine di copertina:</strong>",
      "  <div class=\"fd-embed-images\">",
      metadata.images.map((image, index) => {
        const checked = index === selected.index ? " checked" : "";
        const selectedClass = index === selected.index ? " is-selected" : "";
        return [
          `    <label class="fd-embed-image-choice${selectedClass}" data-fd-embed-image-index="${index}">`,
          `      <input type="radio" name="fd-embed-image" value="${index}"${checked}>`,
          `      <img src="${escapeAttr(image.url)}" alt="">`,
          "    </label>"
        ].join("\n");
      }).join("\n"),
      "  </div>",
      "</div>"
    ].join("\n") : "<p class=\"fd-embed-hint\">Nessuna immagine valida trovata. L'Embed Link verra inserito senza copertina.</p>";

    return [
      "<div class=\"fd-embed-preview\">",
      existingBlock,
      images,
      card,
      "</div>"
    ].join("\n");
  }

  function renderExistingPublicationsBlock(existingPublications) {
    if (!existingPublications || !existingPublications.length) {
      return "";
    }

    return [
      "<div class=\"fd-embed-existing\" role=\"note\">",
      existingPublications.map((item) => (
        `  <p><strong>Attenzione!</strong><br>Sei sicuro di voler inviare questo Embed Link? Risulta gia pubblicato in <a href="${escapeAttr(item.postUrl)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(item.topicTitle)}</a></p>`
      )).join("\n"),
      "</div>"
    ].join("\n");
  }

  function renderPreviewFooter() {
    return [
      "<div class=\"cs-buttons cs-buttons-right fd-embed-actions\">",
      "  <button class=\"cs-btn cs-btn-sm cs-btn-outer-blue cs-modal-close el-cancel\" type=\"button\" data-cs-events=\"\" data-fd-embed-action=\"preview-cancel\">Annulla</button>",
      "  <button class=\"cs-btn cs-btn-sm cs-btn-outer-green cs-modal-close el-confirm\" type=\"button\" data-cs-events=\"\" data-fd-embed-action=\"preview-insert\">Inserisci</button>",
      "</div>"
    ].join("\n");
  }

  function showUrlError(message) {
    const error = document.querySelector("[data-fd-embed-error]");
    if (!error) {
      toast("error", APP_TITLE, message);
      return;
    }
    error.textContent = message;
    error.hidden = false;
  }

  async function openUrlModal(initialUrl) {
    state.lastOpenAttempt = {
      startedAt: new Date().toISOString(),
      initialUrl: initialUrl || "",
      steps: []
    };
    markOpenStep("open-url-modal-called");

    if (!assertCanUse()) {
      markOpenStep("assert-can-use-failed");
      return;
    }

    try {
      const modalId = showModal("Inserisci l'URL per l'Embed Link", renderUrlModal(initialUrl), renderUrlFooter(), "fd-embed-modal-preview cs-modal-w50");
      markOpenStep("show-modal-called", { modalId });
      const input = await waitForElement("#" + ID_PREFIX + "url", 500);
      if (input) {
        markOpenStep("url-input-found");
        input.focus();
        input.select();
        return;
      }

      markOpenStep("url-input-not-found", {
        localModalOpen: Boolean(state.localModal && state.localModal.parentNode),
        modalApiReady: hasAnyModalApi()
      });
      openUrlPromptFallback(initialUrl, "url-input-not-found");
    } catch (error) {
      state.lastModalError = error instanceof Error ? error.message : String(error);
      markOpenStep("open-url-modal-error", { error: state.lastModalError });
      console.error("[FDEmbedLink] openUrlModal failed", error);
      openUrlPromptFallback(initialUrl, "open-url-modal-error");
    }
  }

  function waitForElement(selector, timeoutMs) {
    const existing = document.querySelector(selector);
    if (existing) {
      return Promise.resolve(existing);
    }

    return new Promise((resolve) => {
      const startedAt = Date.now();
      const tick = () => {
        const found = document.querySelector(selector);
        if (found) {
          resolve(found);
          return;
        }
        if (Date.now() - startedAt >= timeoutMs) {
          resolve(null);
          return;
        }
        window.setTimeout(tick, 25);
      };
      tick();
    });
  }

  function hasAnyModalApi() {
    const C = commons();
    return Boolean(C && C.modal && (
      typeof C.modal.create === "function" ||
      typeof C.modal.set === "function"
    ));
  }

  async function openPreviewForUrl(rawUrl) {
    if (!assertCanUse()) {
      return;
    }

    const parsed = parseUrl(rawUrl);
    if (!parsed) {
      showUrlError("Inserisci un URL http o https valido, senza testo aggiuntivo.");
      return;
    }

    if (isDirectImageUrl(parsed.href)) {
      showUrlError("I link diretti a immagini vengono lasciati come link normali.");
      return;
    }

    toast("info", APP_TITLE, "Recupero anteprima in corso...");

    try {
      const data = await requestEdge("preview", {
        url: parsed.href,
        forum: getForumContext(),
        user: getUser()
      });
      const metadata = normalizeMetadata(data, parsed.href);
      const existingPublications = normalizeExistingPublications(data.existingPublications || data.existing_publications);
      state.lastPreviewExistingCount = existingPublications.length;
      state.lastPreviewExistingUrls = existingPublications.map((item) => item.postUrl).slice(0, 5);
      const selectedImageIndex = metadata.images.length ? 0 : -1;
      state.preview = {
        sourceUrl: parsed.href,
        metadata,
        existingPublications,
        selectedImageIndex
      };

      closeModal();
      showModal("Anteprima Embed Link", renderPreviewModal(), renderPreviewFooter(), "fd-embed-modal-preview el-modal cs-modal-w50");
    } catch (error) {
      showUrlError(error.message || "Impossibile generare l'anteprima.");
    }
  }

  async function createAndInsertEmbed() {
    if (!state.preview || !state.preview.metadata) {
      return;
    }

    const selected = getSelectedImage(state.preview.metadata);

    try {
      toast("info", APP_TITLE, "Creo la card...");
      const data = await requestEdge("create", {
        metadata: state.preview.metadata,
        selectedImageUrl: selected.url || null,
        selectedImageIndex: selected.index,
        context: getForumContext(),
        user: getUser()
      });
      const embedId = data.embedId || data.id;
      const publishToken = data.publishToken || data.publish_token;
      const metadata = normalizeMetadata(data.metadata || state.preview.metadata, state.preview.sourceUrl);
      const html = renderCardHtml(metadata, embedId, selected.url);

      if (!embedId || !publishToken) {
        throw new Error("La Edge Function non ha restituito embedId o publishToken.");
      }

      addContentToEditor("\n" + html + "\n");
      storePendingEmbed(embedId, publishToken, metadata);
      closeModal();
      toast("success", APP_TITLE, "Card inserita nell'editor.");
    } catch (error) {
      toast("error", APP_TITLE, error.message || "Creazione non riuscita.");
    }
  }

  function getPendingEmbeds() {
    try {
      return JSON.parse(sessionStorage.getItem(CONFIG.pendingStorageKey) || "{}") || {};
    } catch (_error) {
      return {};
    }
  }

  function setPendingEmbeds(value) {
    sessionStorage.setItem(CONFIG.pendingStorageKey, JSON.stringify(value));
  }

  function storePendingEmbed(embedId, publishToken, metadata) {
    const pending = getPendingEmbeds();
    pending[embedId] = {
      id: embedId,
      publishToken,
      sourceUrl: metadata.sourceUrl,
      finalUrl: metadata.finalUrl,
      canonicalUrl: metadata.canonicalUrl,
      userId: getUser().id,
      createdAt: Date.now()
    };
    setPendingEmbeds(pending);
  }

  function rememberSubmitEmbeds() {
    const text = getEditorText();
    const pending = getPendingEmbeds();
    const ids = Object.keys(pending).filter((id) => contentHasPendingEmbed(text, id, pending[id]));

    if (!ids.length) {
      return;
    }

    sessionStorage.setItem(CONFIG.submitStorageKey, JSON.stringify({
      ids,
      topicId: getForumContext().topicId,
      userId: getUser().id,
      createdAt: Date.now()
    }));
  }

  function buildPostUrl(post) {
    const postId = getPostId(post);
    const topicId = getForumContext().topicId;
    const element = post && post.nativeElement;

    if (element && postId) {
      const preferredLink = element.querySelector(`.lt.Sub a[href*="?t="][href*="#entry${postId}"]`);
      if (preferredLink && preferredLink.href) {
        return normalizePostUrl(preferredLink.href, topicId, postId);
      }

      const anchorLink = element.querySelector(`a[href*="?t="][href*="#entry${postId}"], a[href*="entry${postId}"]`);
      if (anchorLink && anchorLink.href) {
        return normalizePostUrl(anchorLink.href, topicId, postId);
      }
    }

    if (topicId && postId) {
      return window.location.origin + "/?t=" + encodeURIComponent(String(topicId)) + "#entry" + encodeURIComponent(String(postId));
    }

    return postId ? window.location.href.split("#")[0] + "#entry" + postId : window.location.href;
  }

  function getPostId(post) {
    const directId = Number(post && post.id || 0);
    if (directId) {
      return directId;
    }

    const element = post && post.nativeElement;
    if (!element) {
      return 0;
    }

    const candidates = [
      element,
      element.closest ? element.closest("li[id]") : null,
      element.querySelector ? element.querySelector("li[id]") : null
    ];

    for (const candidate of candidates) {
      const rawId = candidate && candidate.id ? String(candidate.id) : "";
      const match = rawId.match(/^e?(\d+)$/i) || rawId.match(/(\d+)/);
      if (match) {
        return Number(match[1]) || 0;
      }
    }

    return 0;
  }

  function normalizePostUrl(rawUrl, topicId, postId) {
    try {
      const url = new URL(rawUrl, window.location.origin);
      const resolvedTopicId = topicId || Number(url.searchParams.get("t") || 0);
      if (resolvedTopicId && postId) {
        return url.origin + "/?t=" + encodeURIComponent(String(resolvedTopicId)) + "#entry" + encodeURIComponent(String(postId));
      }
      return url.href;
    } catch (_error) {
      if (topicId && postId) {
        return window.location.origin + "/?t=" + encodeURIComponent(String(topicId)) + "#entry" + encodeURIComponent(String(postId));
      }
      return window.location.href;
    }
  }

  async function confirmPublishedEmbeds() {
    const C = commons();
    if (!C || !C.location || !Array.isArray(C.location.posts) || !C.location.posts.length) {
      return;
    }

    const pending = getPendingEmbeds();
    const ids = Object.keys(pending);
    if (!ids.length) {
      return;
    }

    const user = getUser();
    const remaining = { ...pending };
    const submitInfo = (() => {
      try {
        return JSON.parse(sessionStorage.getItem(CONFIG.submitStorageKey) || "{}") || {};
      } catch (_error) {
        return {};
      }
    })();
    const submittedIds = Array.isArray(submitInfo.ids) ? submitInfo.ids : [];

    for (const post of C.location.posts) {
      if (user.id && post.author && post.author.id && Number(post.author.id) !== user.id) {
        continue;
      }

      const html = String(post.content || "") + " " + (post.nativeElement ? post.nativeElement.innerHTML : "");
      let foundIds = ids.filter((id) => contentHasEmbedId(html, id));
      if (!foundIds.length) {
        foundIds = pickUrlFallbackEmbedIds(html, ids, pending, submittedIds.length ? submittedIds : null);
      }
      if (!foundIds.length) {
        continue;
      }

      const embeds = foundIds.map((id) => ({
        id,
        publishToken: pending[id].publishToken
      }));

      try {
        await publishEmbeds(embeds, {
          id: getPostId(post) || null,
          topicId: getForumContext().topicId,
          url: buildPostUrl(post)
        });

        for (const id of foundIds) {
          delete remaining[id];
        }
      } catch (error) {
        console.warn("[FDEmbedLink] publish failed", error);
      }
    }

    setPendingEmbeds(remaining);
  }

  async function publishEmbeds(embeds, post) {
    const payload = {
      embeds,
      post,
      user: getUser()
    };

    if (!isConfigured()) {
      throw new Error("Configura CONFIG.edgeEndpoint con l'URL della Supabase Edge Function.");
    }

    try {
      return await requestEdge("publish", payload, { keepalive: true });
    } catch (error) {
      if (!navigator.sendBeacon) {
        throw error;
      }
    }

    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify({ ...payload, action: "publish" })], {
        type: "application/json"
      });
      const sent = navigator.sendBeacon(CONFIG.edgeEndpoint, blob);
      if (sent) {
        return { ok: true, beacon: true };
      }
    }

    return requestEdge("publish", payload, { keepalive: true });
  }

  function handlePaste(event) {
    if (!isEditorPasteEvent(event)) {
      return true;
    }

    if (state.pasteDisabled || !state.pasteInterceptionEnabled || !assertCanUse()) {
      return true;
    }

    const clipboard = event.clipboardData || window.clipboardData;
    const text = clipboard ? clipboard.getData("text/plain") : "";
    const url = parseUrl(text);

    if (!url || isDirectImageUrl(url.href)) {
      return true;
    }

    event.stopPropagation();
    event.preventDefault();
    state.pasteText = text.trim();
    showModal("Vuoi inserire un Embed Link?", renderPasteModal(state.pasteText), renderPasteFooter(), "fd-embed-modal-paste fd-embed-modal-preview cs-modal-w50");
    return false;
  }

  function isEditorPasteEvent(event) {
    const target = event && event.target;
    const textarea = getEditorTextarea();

    if (!target || !target.closest) {
      return Boolean(textarea);
    }

    if (textarea && (target === textarea || target.closest("textarea") === textarea)) {
      return true;
    }

    if (target.closest("[contenteditable='true'], [contenteditable=''], .wysibb-body, .note-editable, .sceditor-container, .cke_editable")) {
      return true;
    }

    const submit = document.querySelector('input[name="submit_post"], button[name="submit_post"]');
    const form = submit && submit.closest ? submit.closest("form") : null;
    return Boolean(form && form.contains(target));
  }

  function handleImageChoice(target) {
    const label = target.closest("[data-fd-embed-image-index]");
    if (!label || !state.preview) {
      return;
    }

    const index = Number(label.getAttribute("data-fd-embed-image-index"));
    if (!Number.isFinite(index)) {
      return;
    }

    state.preview.selectedImageIndex = index;

    document.querySelectorAll(".fd-embed-image-choice").forEach((item) => {
      item.classList.toggle("is-selected", item === label);
    });

    const radio = label.querySelector("input[type='radio']");
    if (radio) {
      radio.checked = true;
    }

    const image = state.preview.metadata.images[index];
    const previewImage = document.querySelector("[data-fd-embed-preview-image]");
    if (image && previewImage) {
      previewImage.setAttribute("src", image.url);
    }
  }

  function handleDocumentClick(event) {
    const imageLabel = event.target.closest("[data-fd-embed-image-index]");
    if (imageLabel) {
      handleImageChoice(imageLabel);
    }

    const actionButton = event.target.closest("[data-fd-embed-action]");
    if (!actionButton) {
      return;
    }

    event.preventDefault();
    const action = actionButton.getAttribute("data-fd-embed-action");

    if (action === "url-cancel" || action === "preview-cancel") {
      if (state.localModal && Date.now() - state.localModalOpenedAt < 700) {
        return;
      }
      closeModal();
      return;
    }

    if (action === "url-preview") {
      const input = document.getElementById(ID_PREFIX + "url");
      openPreviewForUrl(input ? input.value : "");
      return;
    }

    if (action === "paste-disable") {
      state.pasteDisabled = true;
      addContentToEditor(state.pasteText);
      closeModal();
      toast("info", APP_TITLE, "Intercettazione link disabilitata fino al refresh.");
      return;
    }

    if (action === "paste-normal") {
      addContentToEditor(state.pasteText);
      closeModal();
      return;
    }

    if (action === "paste-confirm") {
      const pasted = state.pasteText;
      closeModal();
      openPreviewForUrl(pasted);
      return;
    }

    if (action === "preview-insert") {
      createAndInsertEmbed();
    }
  }

  function handleDocumentChange(event) {
    const toggle = event.target && event.target.closest
      ? event.target.closest("[data-fd-embed-paste-toggle]")
      : null;
    if (!toggle) {
      return;
    }

    savePasteInterceptionPreference(Boolean(toggle.checked));
    toast("info", APP_TITLE, toggle.checked
      ? "Intercettazione link riattivata."
      : "Intercettazione link disattivata.");
  }

  function handleSubmitCapture(event) {
    const target = event.target;
    if (target && target.matches && target.matches('input[name="submit_post"], button[name="submit_post"]')) {
      rememberSubmitEmbeds();
    }
  }

  function removeLegacyEditorButtons() {
    document.querySelectorAll([
      "[data-fd-embed-fallback]",
      "[data-fd-embed-fallback-button]",
      "[data-fd-embed-inline-wrapper]",
      "[data-fd-embed-inline-button]"
    ].join(",")).forEach((element) => {
      element.remove();
    });
  }

  function registerEditorButtons() {
    const C = commons();
    if (!C || !C.utilities) {
      return false;
    }

    const replierForm = C.utilities.replierForm || {};
    const buttons = replierForm.buttons;
    const buttonConfig = {
      title: EDITOR_BUTTON_TITLE,
      event: async () => {
        await openUrlModal("");
      },
      allowCustomEditors: false
    };

    if (!state.classicButtonRegistered && buttons && typeof buttons.add === "function") {
      try {
        buttons.add(buttonConfig);
        state.classicButtonRegistered = true;
      } catch (error) {
        state.lastModalError = error && error.message ? error.message : String(error || "");
      }
    }

    if (!state.visualButtonRegistered) {
      console.log("editor!");
      C.utilities.queue.push({
        tag: "ve:externals:add",
        event: {
          ...buttonConfig,
          serviceType: "link"
        }
      });
      state.visualButtonRegistered = true;
    }

    state.buttonsRegistered = state.classicButtonRegistered || state.visualButtonRegistered;
    return state.buttonsRegistered;
  }

  function registerPasteEvent() {
    const C = commons();
    const textarea = C && C.utilities && C.utilities.replierForm && C.utilities.replierForm.textarea;
    if (!state.textareaApiPasteRegistered && textarea && typeof textarea.addEvent === "function") {
      textarea.addEvent("paste", handlePaste);
      state.textareaApiPasteRegistered = true;
    }

    let boundAny = false;
    for (const item of getEditorTextareas()) {
      if (!state.pasteTargets.has(item)) {
        item.addEventListener("paste", handlePaste, true);
        state.pasteTargets.add(item);
        state.pasteTargetCount += 1;
      }
      boundAny = true;
    }

    if (state.textareaApiPasteRegistered || boundAny) {
      state.pasteRegistered = true;
      return true;
    }

    return false;
  }

  function isVisibleElement(element) {
    if (!element || element.hidden) {
      return false;
    }

    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function elementLabelMatches(element, text) {
    const values = [
      element.tagName === "INPUT" ? element.value : element.textContent,
      element.getAttribute("title"),
      element.getAttribute("aria-label"),
      element.getAttribute("alt")
    ];
    return values.some((value) => normalizeSpace(value) === text);
  }

  function findVisibleNativeEditorButton(text) {
    const selector = "button, a, input[type='button'], input[type='submit'], [role='button']";
    return Array.from(document.querySelectorAll(selector)).some((element) => {
      return elementLabelMatches(element, text) &&
        isVisibleElement(element);
    });
  }

  function scheduleIntegrationRetry() {
    window.clearTimeout(state.integrationTimer);

    const buttonsReady = registerEditorButtons();
    const pasteReady = registerPasteEvent();

    if (buttonsReady && pasteReady) {
      return;
    }

    state.integrationAttempts += 1;
    if (state.integrationAttempts === 80 || state.integrationAttempts % 120 === 0) {
      const details = diagnostics();
      if (!buttonsReady || !pasteReady) {
        console.warn("[FDEmbedLink] editor non agganciato completamente", details);
      } else if (!state.visualButtonRegistered) {
        console.info("[FDEmbedLink] editor classico agganciato; coda visuale non disponibile in questa pagina", details);
      }
    }

    state.integrationTimer = window.setTimeout(scheduleIntegrationRetry, state.integrationAttempts < 20 ? 250 : 1500);
  }

  function refreshIntegration() {
    state.integrationAttempts = 0;
    scheduleIntegrationRetry();
    return diagnostics();
  }

  function startIntegrationWatcher() {
    if (!state.integrationInterval) {
      state.integrationInterval = window.setInterval(() => {
        registerEditorButtons();
        registerPasteEvent();
      }, 2000);
    }

    if (!state.integrationObserver && document.body && window.MutationObserver) {
      state.integrationObserver = new MutationObserver(() => {
        registerEditorButtons();
        registerPasteEvent();
      });
      state.integrationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  function diagnostics() {
    const C = commons();
    const utilities = C && C.utilities ? C.utilities : null;
    const replierForm = utilities && utilities.replierForm ? utilities.replierForm : null;
    const textareaApi = replierForm && replierForm.textarea ? replierForm.textarea : null;
    const buttons = replierForm && replierForm.buttons ? replierForm.buttons : null;
    const localModal = state.localModal || document.querySelector("[data-fd-embed-local-modal]");

    return {
      app: APP_TITLE,
      version: CONFIG.version,
      configured: isConfigured(),
      host: location.hostname,
      allowedLocation: isAllowedForumLocation(),
      commonsReady: Boolean(C),
      utilitiesReady: Boolean(utilities),
      replierFormReady: Boolean(replierForm),
      classicButtonApiReady: Boolean(buttons && typeof buttons.add === "function"),
      classicButtonRegistered: state.classicButtonRegistered,
      classicButtonVisible: findVisibleNativeEditorButton(EDITOR_BUTTON_TITLE),
      modalCreateReady: Boolean(C && C.modal && typeof C.modal.create === "function"),
      modalSetReady: Boolean(C && C.modal && typeof C.modal.set === "function"),
      modalApiReady: hasAnyModalApi(),
      commonsModalOpen: Boolean(state.commonsModal),
      localModalOpen: Boolean(localModal && localModal.parentNode),
      localModalVisible: isVisibleElement(localModal),
      lastModalError: state.lastModalError,
      lastOpenAttempt: state.lastOpenAttempt,
      lastPreviewExistingCount: state.lastPreviewExistingCount,
      lastPreviewExistingUrls: state.lastPreviewExistingUrls,
      visualQueueReady: Boolean(utilities && Array.isArray(utilities.queue)),
      textareaApiReady: Boolean(textareaApi && typeof textareaApi.addEvent === "function" && typeof textareaApi.addContent === "function"),
      domTextareaReady: Boolean(getEditorTextarea()),
      domTextareaCount: getEditorTextareas().length,
      user: getUser(),
      state: {
        initialized: state.initialized,
        classicButtonRegistered: state.classicButtonRegistered,
        visualButtonRegistered: state.visualButtonRegistered,
        pasteRegistered: state.pasteRegistered,
        pasteInterceptionEnabled: state.pasteInterceptionEnabled,
        pasteTemporarilyDisabled: state.pasteDisabled,
        textareaApiPasteRegistered: state.textareaApiPasteRegistered,
        pasteTargetCount: state.pasteTargetCount,
        integrationAttempts: state.integrationAttempts,
        integrationIntervalActive: Boolean(state.integrationInterval),
        integrationObserverActive: Boolean(state.integrationObserver)
      }
    };
  }

  function init() {
    if (state.initialized) {
      return;
    }

    if (!commons()) {
      window.setTimeout(init, 120);
      return;
    }

    state.initialized = true;
    state.pasteInterceptionEnabled = loadPasteInterceptionPreference();
    removeLegacyEditorButtons();
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("change", handleDocumentChange);
    document.addEventListener("paste", handlePaste, true);
    document.addEventListener("click", handleSubmitCapture, true);
    document.addEventListener("submit", rememberSubmitEmbeds, true);
    startIntegrationWatcher();
    scheduleIntegrationRetry();
    confirmPublishedEmbeds();
  }

  const api = {
    version: CONFIG.version,
    config: CONFIG,
    init,
    openUrlModal,
    handlePaste,
    buildHtml: renderCardHtml,
    confirmPublishedEmbeds,
    diagnostics,
    refreshIntegration
  };

  window.FDEmbedLink = api;
  window.EmbedLink = api;

  init();
})();
