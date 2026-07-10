/* FD EMBED LINK build 2026-07-06.6 */
(() => {
  "use strict";

  const CONFIG = {
    appTitle: "FD EMBED LINK",
    version: "2026-07-06.6",
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
  const EDITOR_PRIMARY_TEXTAREA_SELECTOR = [
    "textarea[name='Post']",
    "textarea[name='post']",
    "textarea[name='message']",
    "textarea[id*='Post']",
    "textarea[id*='post']"
  ].join(",");
  const EDITOR_TEXTAREA_SELECTOR = EDITOR_PRIMARY_TEXTAREA_SELECTOR + ",textarea";
  const CONFIRMATION_RETRY_DELAYS_MS = [250, 500, 1000, 1500, 2500, 4000, 6000, 8000];
  const IMAGE_URL_RE = /\.(?:jpe?g|png|gif|webp|avif|svg)(?:[?#].*)?$/i;
  const ID_PREFIX = "fd-embed-link-";
  const HTML_ENTITY_MAP = {
    amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ",
    agrave: "à", aacute: "á", acirc: "â", atilde: "ã", auml: "ä", aring: "å", aelig: "æ",
    ccedil: "ç", egrave: "è", eacute: "é", ecirc: "ê", euml: "ë",
    igrave: "ì", iacute: "í", icirc: "î", iuml: "ï",
    eth: "ð", ntilde: "ñ", ograve: "ò", oacute: "ó", ocirc: "ô", otilde: "õ", ouml: "ö", oslash: "ø",
    ugrave: "ù", uacute: "ú", ucirc: "û", uuml: "ü", yacute: "ý", thorn: "þ", yuml: "ÿ",
    Agrave: "À", Aacute: "Á", Acirc: "Â", Atilde: "Ã", Auml: "Ä", Aring: "Å", AElig: "Æ",
    Ccedil: "Ç", Egrave: "È", Eacute: "É", Ecirc: "Ê", Euml: "Ë",
    Igrave: "Ì", Iacute: "Í", Icirc: "Î", Iuml: "Ï",
    ETH: "Ð", Ntilde: "Ñ", Ograve: "Ò", Oacute: "Ó", Ocirc: "Ô", Otilde: "Õ", Ouml: "Ö", Oslash: "Ø",
    Ugrave: "Ù", Uacute: "Ú", Ucirc: "Û", Uuml: "Ü", Yacute: "Ý", THORN: "Þ",
    euro: "€", pound: "£", yen: "¥", cent: "¢", copy: "©", reg: "®", trade: "™",
    deg: "°", plusmn: "±", micro: "µ", para: "¶", middot: "·",
    laquo: "«", raquo: "»", bdquo: "„", sbquo: "‚",
    lsquo: "'", rsquo: "'", ldquo: "\"", rdquo: "\"",
    ndash: "-", mdash: "-", hellip: "...", bull: "•"
  };

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
    lastPresenceCheck: null,
    lastPresenceDetails: [],
    lastPresenceReport: null,
    lastPublishTransport: "",
    lastPublishConfirmedIds: [],
    lastPublishQueuedIds: [],
    lastPublishFailedIds: [],
    lastPublishStatusCheck: null,
    lastPlainLinkId: "",
    lastPlainLinkUrl: "",
    lastPlainLinkError: "",
    activeTextarea: null,
    lastSubmitTextareaName: "",
    confirmationPromise: null,
    confirmationRetryTimer: 0,
    confirmationRetryAttempts: 0,
    confirmationRetryReason: "",
    lastConfirmationAt: "",
    submitFallbackUsed: 0,
    lastSubmitFallbackPostId: 0,
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
        .replace(/&#(\d+);/g, (match, code) => decodeEntityCodePoint(code, 10) || match)
        .replace(/&#x([0-9a-f]+);/gi, (match, code) => decodeEntityCodePoint(code, 16) || match)
        .replace(/&([a-zA-Z][a-zA-Z0-9]+);/g, (match, name) => decodeNamedEntity(name, match));

      if (decoded === text) {
        return decoded;
      }
      text = decoded;
    }

    return text;
  }

  function decodeEntityCodePoint(value, radix) {
    const code = Number.parseInt(value, radix);
    if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) {
      return "";
    }

    try {
      return String.fromCodePoint(code);
    } catch (_error) {
      return "";
    }
  }

  function decodeNamedEntity(name, fallback) {
    return Object.prototype.hasOwnProperty.call(HTML_ENTITY_MAP, name)
      ? HTML_ENTITY_MAP[name]
      : fallback;
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
      const cleanedCommonsTitle = cleanForumTopicTitle(commonsTitle);
      if (cleanedCommonsTitle) {
        return cleanedCommonsTitle;
      }
    }

    const title = normalizeSpace(document.title || "");
    if (!title) {
      return null;
    }

    return cleanForumTopicTitle(title);
  }

  function cleanForumTopicTitle(value) {
    const title = normalizeSpace(value || "")
      .replace(/\s*[-|•]\s*(ForumFree|ForumCommunity).*$/i, "")
      .replace(/\s*[-|•]\s*difesaitalia\.forumfree\.it.*$/i, "")
      .replace(/\s*[-|•]\s*difesa\.forumfree\.it.*$/i, "")
      .trim();

    if (!title || /^stai\s+modificando\s+un\s+messaggio\s+nella\s+discussione\b/i.test(title)) {
      return null;
    }

    return title;
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

  function getEditorTextarea(scope) {
    const root = scope && typeof scope.querySelector === "function" ? scope : document;
    const preferred = root.querySelector(EDITOR_PRIMARY_TEXTAREA_SELECTOR);
    if (scope && preferred) {
      return preferred;
    }

    const focused = document.activeElement;
    if (focused && focused.matches && focused.matches("textarea") && root.contains(focused)) {
      return focused;
    }

    if (state.activeTextarea && state.activeTextarea.isConnected && root.contains(state.activeTextarea)) {
      return state.activeTextarea;
    }

    return preferred || root.querySelector("textarea");
  }

  function getEditorTextareas(scope) {
    const root = scope && typeof scope.querySelectorAll === "function" ? scope : document;
    const items = Array.from(root.querySelectorAll(EDITOR_TEXTAREA_SELECTOR));
    return [...new Set(items)];
  }

  function getSubmissionForm(source) {
    const target = source && source.target ? source.target : source;
    if (!target) {
      return null;
    }
    if (target.tagName === "FORM") {
      return target;
    }
    return target.closest && target.closest("form") || null;
  }

  function getEditorText(source) {
    const form = getSubmissionForm(source);
    const textarea = getEditorTextarea(form || undefined);
    state.lastSubmitTextareaName = textarea
      ? String(textarea.name || textarea.id || "textarea")
      : "";
    return textarea ? textarea.value || "" : "";
  }

  function rememberActiveTextarea(event) {
    const target = event && event.target;
    if (!target || !target.closest) {
      return;
    }

    let textarea = target.closest("textarea");
    const editorSurface = target.closest("[contenteditable='true'], [contenteditable=''], .wysibb-body, .note-editable, .sceditor-container, .cke_editable");
    const form = (textarea || editorSurface) && (textarea || editorSurface).closest("form");
    if (!textarea && form) {
      textarea = getEditorTextarea(form);
    }

    const textareaCount = form ? form.querySelectorAll("textarea").length : 0;
    const isEditorTextarea = textarea && (
      textarea.matches(EDITOR_PRIMARY_TEXTAREA_SELECTOR) || textareaCount === 1 || Boolean(editorSurface)
    );
    if (isEditorTextarea && form && form.querySelector('input[name="submit_post"], button[name="submit_post"]')) {
      state.activeTextarea = textarea;
    }
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
        id: item && item.id ? String(item.id) : "",
        status: item && item.status ? String(item.status) : "",
        postUrl,
        topicTitle: topicTitle || "Discussione",
        sourceUrl: item && (item.sourceUrl || item.source_url) ? String(item.sourceUrl || item.source_url) : "",
        finalUrl: item && (item.finalUrl || item.final_url) ? String(item.finalUrl || item.final_url) : "",
        canonicalUrl: item && (item.canonicalUrl || item.canonical_url) ? String(item.canonicalUrl || item.canonical_url) : "",
        postId: item && (item.postId || item.post_id) || null,
        topicId: item && (item.topicId || item.topic_id) || null,
        confirmedAt: item && (item.confirmedAt || item.confirmed_at) || ""
      };
    }).filter((item) => item.postUrl && (!item.status || item.status === "published"));
  }

  function dedupeExistingPublicationsByTopic(existingPublications) {
    const seen = new Set();
    const deduped = [];

    (existingPublications || []).forEach((item) => {
      const key = existingPublicationTopicKey(item);
      if (!key || seen.has(key)) {
        return;
      }

      seen.add(key);
      deduped.push(item);
    });

    return deduped;
  }

  function existingPublicationTopicKey(item) {
    if (!item) {
      return "";
    }

    if (item.topicId) {
      return "topic:" + String(item.topicId);
    }

    try {
      const url = new URL(item.postUrl || "", window.location.origin);
      const topicId = url.searchParams.get("t");
      if (topicId) {
        return "topic:" + topicId;
      }

      const entryMatch = String(url.hash || "").match(/^#entry(\d+)$/);
      if (entryMatch) {
        return "post:" + entryMatch[1];
      }

      return "url:" + url.origin + url.pathname + url.search + url.hash;
    } catch (_error) {
      return item.postUrl ? "url:" + String(item.postUrl) : "";
    }
  }

  async function verifyExistingPublications(existingPublications, metadata) {
    if (!existingPublications || !existingPublications.length) {
      state.lastPresenceCheck = { checked: 0, present: 0, missing: 0, unverified: 0 };
      state.lastPresenceDetails = [];
      return [];
    }

    const verifiable = existingPublications.filter((item) => canVerifyExistingPublication(item));
    const unverified = existingPublications.filter((item) => !canVerifyExistingPublication(item));
    if (!verifiable.length) {
      state.lastPresenceCheck = {
        checked: 0,
        present: 0,
        missing: 0,
        unverified: unverified.length
      };
      state.lastPresenceDetails = unverified.map((item) => presenceDetail(item, "unverified", "record non verificabile"));
      return [];
    }

    try {
      const postsById = await fetchForumPostsByIds(verifiable.map((item) => Number(item.postId)));
      const present = [];
      const missing = [];
      const unavailable = [];

      verifiable.forEach((item) => {
        const currentPagePublication = findCurrentPagePublication(item);
        if (currentPagePublication) {
          present.push(currentPagePublication);
          return;
        }

        const post = postsById[String(item.postId)];
        if (!post || typeof post.content !== "string") {
          unavailable.push({ item, reason: "post non restituito da api.php" });
          return;
        }

        const consistencyError = forumPostConsistencyError(item, post);
        if (consistencyError) {
          unavailable.push({ item, reason: consistencyError });
          return;
        }

        if (contentHasExistingPublication(post.content, item, metadata)) {
          present.push(enrichPublicationFromForumPost(item, post));
        } else {
          missing.push(enrichPublicationFromForumPost(item, post));
        }
      });

      const reportItems = present.map((item) => ({ ...item, presence: "present" }))
        .concat(missing.map((item) => ({ ...item, presence: "missing" })))
        .concat(unavailable.map(({ item, reason }) => ({
          ...item,
          presence: "unavailable",
          presenceReason: reason
        })));
      if (reportItems.length) {
        await reportPublicationPresence(reportItems);
      }

      state.lastPresenceCheck = {
        checked: verifiable.length,
        present: present.length,
        missing: missing.length,
        unverified: unverified.length + unavailable.length
      };
      state.lastPresenceDetails = unverified.map((item) => presenceDetail(item, "unverified", "record non verificabile"))
        .concat(unavailable.map(({ item, reason }) => presenceDetail(item, "unavailable", reason)))
        .concat(missing.map((item) => presenceDetail(item, "missing", "marker UUID non trovato")))
        .concat(present.map((item) => presenceDetail(item, "present", "marker UUID trovato")));

      return present;
    } catch (error) {
      console.warn("[FDEmbedLink] existing publication presence check failed", error);
      state.lastPresenceCheck = {
        checked: 0,
        present: 0,
        missing: 0,
        unverified: existingPublications.length,
        error: error && error.message ? error.message : String(error)
      };
      state.lastPresenceDetails = existingPublications.map((item) => presenceDetail(item, "unverified", "errore verifica"));
      return [];
    }
  }

  function canVerifyExistingPublication(item) {
    if (!item || !item.id || !item.postId || !item.postUrl) {
      return false;
    }

    try {
      const url = new URL(item.postUrl, window.location.origin);
      return url.origin === window.location.origin;
    } catch (_error) {
      return false;
    }
  }

  function findCurrentPagePublication(item) {
    if (!item || !item.id || typeof document === "undefined") {
      return null;
    }

    const marker = Array.from(document.querySelectorAll("[data-fd-embed-id], .fd-embed-link"))
      .find((element) => contentHasEmbedId(element.outerHTML || "", item.id));
    if (!marker) {
      return null;
    }

    const postElement = marker.closest ? marker.closest("li.post[id], li[id^='ee']") : null;
    if (!postElement) {
      return null;
    }

    const postId = postIdFromElement(postElement);
    if (!postId) {
      return null;
    }

    const context = getForumContext();
    const preferredLink = postElement.querySelector(`.lt.Sub a[href*="?t="][href*="#entry${postId}"]`);
    const anchorLink = preferredLink || postElement.querySelector(`a[href*="?t="][href*="#entry${postId}"], a[href*="entry${postId}"]`);
    const postUrl = normalizePostUrl(anchorLink && anchorLink.href ? anchorLink.href : window.location.href, context.topicId, postId);

    return {
      ...item,
      postId,
      postUrl,
      topicId: context.topicId || item.topicId,
      topicTitle: context.topicTitle || item.topicTitle
    };
  }

  function postIdFromElement(element) {
    const rawId = element && element.id ? String(element.id) : "";
    const match = rawId.match(/^ee(\d+)$/i) || rawId.match(/^e?(\d+)$/i) || rawId.match(/(\d+)/);
    return match ? Number(match[1]) || 0 : 0;
  }

  async function fetchForumPostsByIds(postIds) {
    const ids = [...new Set(postIds.map((id) => Number(id || 0)).filter(Boolean))];
    const postsById = {};

    for (let index = 0; index < ids.length; index += 20) {
      const chunk = ids.slice(index, index + 20);
      const url = window.location.origin + "/api.php?p=" + encodeURIComponent(chunk.join(",")) + "&cookie=1";
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error("API ForumFree non disponibile (" + response.status + ").");
      }

      const data = await response.json();
      chunk.forEach((postId) => {
        const item = data && data["p" + postId];
        if (item && typeof item === "object") {
          postsById[String(postId)] = item;
        }
      });
    }

    return postsById;
  }

  function enrichPublicationFromForumPost(item, post) {
    const info = post && post.info ? post.info : {};
    const topicTitle = normalizeSpace(info.topic_title || "");
    return {
      ...item,
      topicTitle: topicTitle || item.topicTitle,
      topicId: info.topic_id || item.topicId
    };
  }

  function forumPostConsistencyError(item, post) {
    const info = post && post.info ? post.info : {};
    const expected = forumIdsFromPostUrl(item.postUrl);
    const actualTopicId = Number(info.topic_id || 0);
    if (expected.topicId && actualTopicId && actualTopicId !== expected.topicId) {
      return "topic_id API diverso dal post_url";
    }

    return "";
  }

  function forumIdsFromPostUrl(postUrl) {
    try {
      const url = new URL(postUrl, window.location.origin);
      const topicId = Number(url.searchParams.get("t") || 0);
      const entryMatch = String(url.hash || "").match(/^#entry(\d+)$/);
      return {
        topicId: Number.isFinite(topicId) ? topicId : 0,
        postId: entryMatch ? Number(entryMatch[1]) : 0
      };
    } catch (_error) {
      return { topicId: 0, postId: 0 };
    }
  }

  function presenceDetail(item, presence, reason) {
    return {
      id: item && item.id ? item.id : "",
      presence,
      reason,
      postId: item && item.postId ? item.postId : null,
      postUrl: item && item.postUrl ? item.postUrl : "",
      topicTitle: item && item.topicTitle ? item.topicTitle : ""
    };
  }

  function contentHasExistingPublication(content, publication, _metadata) {
    const text = String(content || "");
    if (publication.id && contentHasEmbedId(text, publication.id)) {
      return true;
    }

    return false;
  }

  async function reportPublicationPresence(publications) {
    const payload = publications
      .filter((item) => item && item.id && item.postUrl && ["present", "missing", "unavailable"].includes(item.presence))
      .map((item) => ({
        id: item.id,
        postUrl: item.postUrl,
        postId: item.postId || null,
        topicTitle: item.topicTitle || "",
        presence: item.presence,
        reason: item.presenceReason || ""
      }));

    if (!payload.length) {
      return;
    }

    state.lastPresenceReport = {
      sent: payload.length,
      missing: payload.filter((item) => item.presence === "missing").length,
      present: payload.filter((item) => item.presence === "present").length,
      unavailable: payload.filter((item) => item.presence === "unavailable").length,
      at: new Date().toISOString()
    };

    try {
      const result = await requestEdge("presence", {
        publications: payload,
        user: getUser()
      }, { keepalive: true });
      state.lastPresenceReport = {
        sent: payload.length,
        missing: payload.filter((item) => item.presence === "missing").length,
        present: payload.filter((item) => item.presence === "present").length,
        unavailable: payload.filter((item) => item.presence === "unavailable").length,
        ok: true,
        result,
        updated: Array.isArray(result && result.results)
          ? result.results.filter((item) => item && item.updated).length
          : 0,
        at: new Date().toISOString()
      };
    } catch (error) {
      console.warn("[FDEmbedLink] presence report failed", error);
      state.lastPresenceReport = {
        sent: payload.length,
        missing: payload.filter((item) => item.presence === "missing").length,
        present: payload.filter((item) => item.presence === "present").length,
        unavailable: payload.filter((item) => item.presence === "unavailable").length,
        ok: false,
        error: error && error.message ? error.message : String(error),
        at: new Date().toISOString()
      };
    }
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
      `<div class="fd-embed-link${compactClass}${noImageClass}${markerClass}" data-editable="false"${idAttr}>`,
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

  function renderTrackedLinkHtml(url, linkId) {
    const href = parseUrl(url);
    const safeUrl = href ? href.href : String(url || "");
    const markerClass = linkId ? " " + getTrackedLinkMarkerClass(linkId) + " " + getEmbedMarkerClass(linkId) : "";
    const idAttrs = linkId
      ? ` data-fd-link-id="${escapeAttr(linkId)}" data-fd-embed-id="${escapeAttr(linkId)}"`
      : "";

    return [
      `<span class="fd-tracked-link${markerClass}" data-fd-link-kind="plain"${idAttrs}>`,
      `<a href="${escapeAttr(safeUrl)}" target="_blank" rel="noopener noreferrer nofollow">${escapeText(safeUrl)}</a>`,
      "</span>"
    ].join("");
  }

  function getEmbedMarkerClass(embedId) {
    return "fd-embed-link-id-" + String(embedId || "").replace(/[^a-zA-Z0-9_-]/g, "-");
  }

  function getTrackedLinkMarkerClass(linkId) {
    return "fd-tracked-link-id-" + String(linkId || "").replace(/[^a-zA-Z0-9_-]/g, "-");
  }

  function contentHasEmbedId(content, embedId) {
    const text = String(content || "");
    const markerClass = getEmbedMarkerClass(embedId);
    const trackedClass = getTrackedLinkMarkerClass(embedId);
    return text.includes(`data-fd-embed-id="${embedId}"`) ||
      text.includes(`data-fd-embed-id='${embedId}'`) ||
      text.includes(`data-fd-link-id="${embedId}"`) ||
      text.includes(`data-fd-link-id='${embedId}'`) ||
      text.includes(markerClass) ||
      text.includes(trackedClass);
  }

  function contentHasPendingEmbed(content, embedId, pendingItem) {
    if (contentHasEmbedId(content, embedId)) {
      return true;
    }

    if (pendingItem && pendingItem.kind === "plain") {
      return contentHasPendingUrl(content, pendingItem);
    }

    return contentHasPendingEmbedUrl(content, pendingItem);
  }

  function contentHasPendingEmbedUrl(content, pendingItem) {
    const text = String(content || "");
    if (!text.includes("fd-embed-link")) {
      return false;
    }

    return contentHasPendingUrl(text, pendingItem);
  }

  function contentHasPendingUrl(content, pendingItem) {
    const text = String(content || "");
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

  function pickPlainUrlFallbackEmbedIds(content, ids, pending, allowedIds) {
    const matches = ids.filter((id) => {
      if (allowedIds && allowedIds.indexOf(id) === -1) {
        return false;
      }
      return contentHasPendingUrl(content, pending[id]);
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

    const links = existingPublications.map((item) => (
      `<a href="${escapeAttr(item.postUrl)}" target="_blank" rel="noopener noreferrer nofollow">${escapeText(item.topicTitle)}</a>`
    )).join(", ");

    return [
      "<div class=\"fd-embed-existing\" role=\"note\">",
      `  <p><strong>Attenzione!</strong><br>Sei sicuro di voler inviare questo Embed Link? Risulta gia pubblicato in ${links}</p>`,
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
      const existingPublications = await verifyExistingPublications(
        normalizeExistingPublications(data.existingPublications || data.existing_publications),
        metadata
      );
      const visibleExistingPublications = dedupeExistingPublicationsByTopic(existingPublications);
      state.lastPreviewExistingCount = visibleExistingPublications.length;
      state.lastPreviewExistingUrls = visibleExistingPublications.map((item) => item.postUrl).slice(0, 5);
      const selectedImageIndex = metadata.images.length ? 0 : -1;
      state.preview = {
        sourceUrl: parsed.href,
        metadata,
        existingPublications: visibleExistingPublications,
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
      storePendingEmbed(embedId, publishToken, metadata, { kind: "embed" });
      closeModal();
      toast("success", APP_TITLE, "Card inserita nell'editor.");
    } catch (error) {
      toast("error", APP_TITLE, error.message || "Creazione non riuscita.");
    }
  }

  async function createAndInsertPlainLink(rawUrl) {
    const parsed = parseUrl(rawUrl);
    if (!parsed || isDirectImageUrl(parsed.href)) {
      addContentToEditor(rawUrl || "");
      closeModal();
      return;
    }

    try {
      toast("info", APP_TITLE, "Creo il link tracciato...");
      const data = await requestEdge("create-plain", {
        url: parsed.href,
        context: getForumContext(),
        user: getUser()
      });
      const linkId = data.linkId || data.embedId || data.id;
      const publishToken = data.publishToken || data.publish_token;
      const metadata = normalizeMetadata(data.metadata || {
        sourceUrl: parsed.href,
        finalUrl: parsed.href,
        canonicalUrl: parsed.href,
        domain: getDomain(parsed.href),
        title: parsed.href,
        images: []
      }, parsed.href);

      if (!linkId || !publishToken) {
        throw new Error("La Edge Function non ha restituito linkId o publishToken.");
      }

      addContentToEditor(renderTrackedLinkHtml(metadata.finalUrl || parsed.href, linkId));
      storePendingEmbed(linkId, publishToken, metadata, { kind: "plain" });
      state.lastPlainLinkId = String(linkId);
      state.lastPlainLinkUrl = metadata.finalUrl || parsed.href;
      state.lastPlainLinkError = "";
      closeModal();
      toast("success", APP_TITLE, "Link tracciato inserito nell'editor.");
    } catch (error) {
      state.lastPlainLinkId = "";
      state.lastPlainLinkUrl = parsed.href;
      state.lastPlainLinkError = error && error.message ? error.message : String(error);
      console.warn("[FDEmbedLink] plain link tracking failed", error);
      addContentToEditor(parsed.href);
      closeModal();
      toast("info", APP_TITLE, "Link inserito senza tracking: creazione record non riuscita.");
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

  function storePendingEmbed(embedId, publishToken, metadata, options = {}) {
    const pending = getPendingEmbeds();
    pending[embedId] = {
      id: embedId,
      publishToken,
      kind: options.kind || "embed",
      sourceUrl: metadata.sourceUrl,
      finalUrl: metadata.finalUrl,
      canonicalUrl: metadata.canonicalUrl,
      userId: getUser().id,
      createdAt: Date.now()
    };
    setPendingEmbeds(pending);
  }

  function uniqueIds(values) {
    return (Array.isArray(values) ? values : [])
      .map((value) => String(value || ""))
      .filter((value, index, all) => value && all.indexOf(value) === index);
  }

  function publishResultConfirmedIds(result, requestedIds) {
    const allowed = uniqueIds(requestedIds);
    const confirmed = [];

    if (result && Array.isArray(result.confirmedIds)) {
      confirmed.push(...result.confirmedIds);
    }

    const rows = result && Array.isArray(result.results) ? result.results : [];
    rows.forEach((row) => {
      const id = row && row.id ? String(row.id) : "";
      const status = row && row.status ? String(row.status).toLowerCase() : "";

      if (!id) {
        return;
      }
      if (allowed.length && allowed.indexOf(id) === -1) {
        return;
      }
      if (row.updated === true || status === "published") {
        confirmed.push(id);
      }
    });

    return uniqueIds(confirmed);
  }

  function applyPublishResultToRemaining(remaining, result, requestedIds) {
    const ids = uniqueIds(requestedIds);
    const confirmedIds = publishResultConfirmedIds(result, ids);
    const queuedIds = result && result.queued ? uniqueIds(result.queuedIds || ids) : [];
    const failedIds = ids.filter((id) => confirmedIds.indexOf(id) === -1 && queuedIds.indexOf(id) === -1);

    state.lastPublishTransport = result && result.transport || "";
    state.lastPublishConfirmedIds = confirmedIds;
    state.lastPublishQueuedIds = queuedIds;
    state.lastPublishFailedIds = failedIds;

    confirmedIds.forEach((id) => {
      delete remaining[id];
    });

    if (queuedIds.length) {
      const queuedAt = Date.now();
      queuedIds.forEach((id) => {
        if (!remaining[id]) {
          return;
        }

        remaining[id] = {
          ...remaining[id],
          publishQueuedAt: queuedAt,
          publishAttempts: Number(remaining[id].publishAttempts || 0) + 1,
          lastPublishTransport: result && result.transport || "beacon",
          lastPublishError: result && result.error || ""
        };
      });
    }

    return confirmedIds;
  }

  function finishPendingConfirmation(remaining, submittedIds) {
    setPendingEmbeds(remaining);
    if (submittedIds.length && submittedIds.every((id) => !remaining[id])) {
      sessionStorage.removeItem(CONFIG.submitStorageKey);
    }
  }

  async function reconcileQueuedPublishStatus(remaining) {
    const embeds = Object.keys(remaining)
      .filter((id) => remaining[id] && remaining[id].publishQueuedAt && remaining[id].publishToken)
      .map((id) => ({
        id,
        publishToken: remaining[id].publishToken
      }));

    if (!embeds.length || !isConfigured()) {
      state.lastPublishStatusCheck = embeds.length ? { checked: embeds.length, confirmedIds: [], skipped: true } : null;
      return [];
    }

    try {
      const result = await requestEdge("publish-status", { embeds, user: getUser() });
      const ids = embeds.map((item) => item.id);
      const confirmedIds = publishResultConfirmedIds(result, ids);

      confirmedIds.forEach((id) => {
        delete remaining[id];
      });

      state.lastPublishStatusCheck = {
        checked: embeds.length,
        confirmedIds,
        results: result && Array.isArray(result.results) ? result.results : []
      };

      return confirmedIds;
    } catch (error) {
      state.lastPublishStatusCheck = {
        checked: embeds.length,
        confirmedIds: [],
        error: error && error.message || String(error)
      };
      return [];
    }
  }

  function rememberSubmitEmbeds(source) {
    const form = getSubmissionForm(source);
    const text = getEditorText(form || source);
    const pending = getPendingEmbeds();
    const ids = Object.keys(pending).filter((id) => contentHasPendingEmbed(text, id, pending[id]));

    if (!ids.length) {
      sessionStorage.removeItem(CONFIG.submitStorageKey);
      return;
    }

    const currentPostId = getPostIdFromUrl();
    sessionStorage.setItem(CONFIG.submitStorageKey, JSON.stringify({
      ids,
      p: currentPostId,
      action: currentPostId ? "update" : "create",
      topicId: getForumContext().topicId,
      lastPostId: getLastKnownPostId(),
      userId: getUser().id,
      createdAt: Date.now()
    }));
  }

  function getSubmitInfo() {
    try {
      return JSON.parse(sessionStorage.getItem(CONFIG.submitStorageKey) || "{}") || {};
    } catch (_error) {
      return {};
    }
  }

  function isFreshSubmitInfo(submitInfo) {
    const createdAt = Number(submitInfo && submitInfo.createdAt || 0);
    return Boolean(createdAt && Date.now() - createdAt < 30 * 60 * 1000);
  }

  function getPostIdFromUrl() {
    try {
      return Number(new URL(window.location.href).searchParams.get("p") || 0);
    } catch (_error) {
      const match = String(window.location.search || "").match(/[?&]p=(\d+)/);
      return match ? Number(match[1]) : 0;
    }
  }

  function getLastKnownPostId() {
    const C = commons();
    const posts = C && C.location && Array.isArray(C.location.posts) ? C.location.posts : [];
    return posts.reduce((max, post) => Math.max(max, getPostId(post) || 0), 0);
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
      return normalizePostUrl(window.location.href, topicId, postId);
    }

    return postId ? window.location.href.split("#")[0] + "#entry" + postId : window.location.href;
  }

  function getPostHtml(post) {
    return String(post && post.content || "") + " " + (post && post.nativeElement ? post.nativeElement.innerHTML : "");
  }

  function getPostAuthorId(post) {
    return Number(post && post.author && post.author.id || 0);
  }

  function isOwnPost(post, user) {
    const authorId = getPostAuthorId(post);
    return !(user.id && authorId && authorId !== user.id);
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

  function findSubmittedFallbackPost(posts, submitInfo, user) {
    if (!isFreshSubmitInfo(submitInfo)) {
      return null;
    }

    const submittedPostId = Number(submitInfo.p || 0);
    if (submittedPostId) {
      return posts.find((post) => getPostId(post) === submittedPostId && isOwnPost(post, user)) || null;
    }

    const lastPostId = Number(submitInfo.lastPostId || 0);
    const ownPosts = posts.filter((post) => isOwnPost(post, user) && getPostId(post));
    const newerPosts = ownPosts
      .filter((post) => getPostId(post) > lastPostId)
      .sort((a, b) => getPostId(b) - getPostId(a));

    if (newerPosts.length) {
      return newerPosts[0];
    }

    return ownPosts.length ? ownPosts[ownPosts.length - 1] : null;
  }

  function normalizePostUrl(rawUrl, topicId, postId) {
    try {
      const url = new URL(rawUrl, window.location.origin);
      const resolvedTopicId = topicId || Number(url.searchParams.get("t") || 0);
      if (resolvedTopicId && postId) {
        const params = new URLSearchParams();
        params.set("t", String(resolvedTopicId));
        const st = url.searchParams.get("st") || currentTopicPageOffset();
        if (st && Number(st) > 0) {
          params.set("st", String(Number(st)));
        }
        return url.origin + "/?" + params.toString() + "#entry" + encodeURIComponent(String(postId));
      }
      return url.href;
    } catch (_error) {
      if (topicId && postId) {
        const st = currentTopicPageOffset();
        const stPart = st && Number(st) > 0 ? "&st=" + encodeURIComponent(String(Number(st))) : "";
        return window.location.origin + "/?t=" + encodeURIComponent(String(topicId)) + stPart + "#entry" + encodeURIComponent(String(postId));
      }
      return window.location.href;
    }
  }

  function currentTopicPageOffset() {
    try {
      const value = new URL(window.location.href).searchParams.get("st") || "";
      return Number(value) > 0 ? String(Number(value)) : "";
    } catch (_error) {
      const match = String(window.location.search || "").match(/[?&]st=(\d+)/);
      return match && Number(match[1]) > 0 ? String(Number(match[1])) : "";
    }
  }

  function pendingConfirmationNeedsRetry(remaining, submitInfo) {
    const submittedIds = Array.isArray(submitInfo && submitInfo.ids) ? submitInfo.ids : [];
    const hasFreshSubmitted = isFreshSubmitInfo(submitInfo) && submittedIds.some((id) => remaining[id]);
    const hasQueuedBeacon = Object.keys(remaining).some((id) => (
      remaining[id] && remaining[id].publishQueuedAt && remaining[id].publishToken
    ));
    return hasFreshSubmitted || hasQueuedBeacon;
  }

  function resetConfirmationRetry() {
    window.clearTimeout(state.confirmationRetryTimer);
    state.confirmationRetryTimer = 0;
    state.confirmationRetryAttempts = 0;
    state.confirmationRetryReason = "";
  }

  function scheduleConfirmationRetry(reason) {
    if (state.confirmationRetryTimer || state.confirmationRetryAttempts >= CONFIRMATION_RETRY_DELAYS_MS.length) {
      return false;
    }

    const delay = CONFIRMATION_RETRY_DELAYS_MS[state.confirmationRetryAttempts];
    state.confirmationRetryReason = reason || "pending";
    state.confirmationRetryTimer = window.setTimeout(() => {
      state.confirmationRetryTimer = 0;
      state.confirmationRetryAttempts += 1;
      confirmPublishedEmbeds();
    }, delay);
    return true;
  }

  async function confirmPublishedEmbeds() {
    if (state.confirmationPromise) {
      return state.confirmationPromise;
    }

    const promise = runPublishedEmbedConfirmation();
    state.confirmationPromise = promise;
    try {
      return await promise;
    } finally {
      if (state.confirmationPromise === promise) {
        state.confirmationPromise = null;
      }
    }
  }

  async function runPublishedEmbedConfirmation() {
    state.lastConfirmationAt = new Date().toISOString();
    const pending = getPendingEmbeds();
    const ids = Object.keys(pending);
    if (!ids.length) {
      resetConfirmationRetry();
      return;
    }

    const user = getUser();
    const remaining = { ...pending };
    const submitInfo = getSubmitInfo();
    const submittedIds = Array.isArray(submitInfo.ids) ? submitInfo.ids : [];
    const attemptedIds = new Set();

    await reconcileQueuedPublishStatus(remaining);

    const C = commons();
    if (!C || !C.location || !Array.isArray(C.location.posts) || !C.location.posts.length) {
      finishPendingConfirmation(remaining, submittedIds);
      if (pendingConfirmationNeedsRetry(remaining, submitInfo)) {
        scheduleConfirmationRetry("posts-not-ready");
      } else {
        resetConfirmationRetry();
      }
      return;
    }

    for (const post of C.location.posts) {
      if (!isOwnPost(post, user)) {
        continue;
      }

      const activeIds = Object.keys(remaining).filter((id) => !attemptedIds.has(id));
      if (!activeIds.length) {
        break;
      }

      const html = getPostHtml(post);
      let foundIds = activeIds.filter((id) => contentHasEmbedId(html, id));
      if (!foundIds.length) {
        foundIds = pickUrlFallbackEmbedIds(html, activeIds, pending, submittedIds.length ? submittedIds : null);
      }
      if (!foundIds.length) {
        continue;
      }

      const embeds = foundIds.map((id) => ({
        id,
        publishToken: pending[id].publishToken
      }));

      try {
        const context = getForumContext();
        const result = await publishEmbeds(embeds, {
          id: getPostId(post) || null,
          topicId: context.topicId,
          topicTitle: context.topicTitle,
          url: buildPostUrl(post)
        });

        foundIds.forEach((id) => attemptedIds.add(id));
        applyPublishResultToRemaining(remaining, result, foundIds);
      } catch (error) {
        foundIds.forEach((id) => attemptedIds.add(id));
        console.warn("[FDEmbedLink] publish failed", error);
      }
    }

    const remainingIds = Object.keys(remaining).filter((id) => !attemptedIds.has(id));
    const fallbackPost = remainingIds.length ? findSubmittedFallbackPost(C.location.posts, submitInfo, user) : null;
    if (fallbackPost) {
      const html = getPostHtml(fallbackPost);
      const foundIds = pickPlainUrlFallbackEmbedIds(html, remainingIds, pending, submittedIds.length ? submittedIds : null);
      if (foundIds.length) {
        const embeds = foundIds.map((id) => ({
          id,
          publishToken: pending[id].publishToken
        }));

        try {
          const context = getForumContext();
          const result = await publishEmbeds(embeds, {
            id: getPostId(fallbackPost) || null,
            topicId: context.topicId,
            topicTitle: context.topicTitle,
            url: buildPostUrl(fallbackPost)
          });

          state.submitFallbackUsed += 1;
          state.lastSubmitFallbackPostId = getPostId(fallbackPost) || 0;
          foundIds.forEach((id) => attemptedIds.add(id));
          applyPublishResultToRemaining(remaining, result, foundIds);
        } catch (error) {
          foundIds.forEach((id) => attemptedIds.add(id));
          console.warn("[FDEmbedLink] submit fallback publish failed", error);
        }
      }
    }

    finishPendingConfirmation(remaining, submittedIds);
    if (pendingConfirmationNeedsRetry(remaining, submitInfo)) {
      scheduleConfirmationRetry("pending-after-scan");
    } else {
      resetConfirmationRetry();
    }
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

    let fetchError = null;
    const requestedIds = embeds.map((item) => item.id);

    try {
      const result = await requestEdge("publish", payload, { keepalive: true });
      return { ...result, transport: "fetch" };
    } catch (error) {
      fetchError = error;
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
        return {
          ok: false,
          queued: true,
          beacon: true,
          transport: "beacon",
          queuedIds: requestedIds,
          confirmedIds: [],
          error: fetchError && fetchError.message || ""
        };
      }
    }

    const result = await requestEdge("publish", payload, { keepalive: true });
    return { ...result, transport: "fetch-retry" };
  }

  function handlePaste(event) {
    if (!isEditorPasteEvent(event)) {
      return true;
    }

    rememberActiveTextarea(event);

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

    if (!target || !target.closest) {
      return false;
    }

    const textarea = target.closest("textarea");
    if (textarea) {
      const form = textarea.closest("form");
      const textareaCount = form ? form.querySelectorAll("textarea").length : 0;
      return Boolean(
        form &&
        (textarea.matches(EDITOR_PRIMARY_TEXTAREA_SELECTOR) || textareaCount === 1) &&
        form.querySelector('input[name="submit_post"], button[name="submit_post"]')
      );
    }

    const editorSurface = target.closest("[contenteditable='true'], [contenteditable=''], .wysibb-body, .note-editable, .sceditor-container, .cke_editable");
    if (editorSurface) {
      const form = editorSurface.closest("form");
      return Boolean(form && form.querySelector('input[name="submit_post"], button[name="submit_post"]'));
    }

    return false;
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
      createAndInsertPlainLink(state.pasteText);
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
    const submit = target && target.closest
      ? target.closest('input[name="submit_post"], button[name="submit_post"]')
      : null;
    if (submit) {
      rememberSubmitEmbeds(submit.closest("form") || event);
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
      lastPresenceCheck: state.lastPresenceCheck,
      lastPresenceDetails: state.lastPresenceDetails,
      lastPresenceReport: state.lastPresenceReport,
      lastPublishTransport: state.lastPublishTransport,
      lastPublishConfirmedIds: state.lastPublishConfirmedIds,
      lastPublishQueuedIds: state.lastPublishQueuedIds,
      lastPublishFailedIds: state.lastPublishFailedIds,
      lastPublishStatusCheck: state.lastPublishStatusCheck,
      lastPlainLinkId: state.lastPlainLinkId,
      lastPlainLinkUrl: state.lastPlainLinkUrl,
      lastPlainLinkError: state.lastPlainLinkError,
      activeTextareaName: state.activeTextarea
        ? String(state.activeTextarea.name || state.activeTextarea.id || "textarea")
        : "",
      lastSubmitTextareaName: state.lastSubmitTextareaName,
      lastConfirmationAt: state.lastConfirmationAt,
      submitInfo: getSubmitInfo(),
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
        confirmationInFlight: Boolean(state.confirmationPromise),
        confirmationRetryActive: Boolean(state.confirmationRetryTimer),
        confirmationRetryAttempts: state.confirmationRetryAttempts,
        confirmationRetryReason: state.confirmationRetryReason,
        submitFallbackUsed: state.submitFallbackUsed,
        lastSubmitFallbackPostId: state.lastSubmitFallbackPostId,
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
    document.addEventListener("focusin", rememberActiveTextarea, true);
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
    buildTrackedLinkHtml: renderTrackedLinkHtml,
    confirmPublishedEmbeds,
    diagnostics,
    refreshIntegration
  };

  window.FDEmbedLink = api;
  window.EmbedLink = api;

  init();
})();
