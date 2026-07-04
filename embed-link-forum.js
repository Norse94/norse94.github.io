/* FD EMBED LINK build 2026-07-04.7 */
(() => {
  "use strict";

  const CONFIG = {
    appTitle: "FD EMBED LINK",
    version: "2026-07-04.7",
    edgeEndpoint: "https://mycvmmlezpxdoamecrhb.functions.supabase.co/embed-link",
    allowedForumHost: "difesa.forumfree.it",
    maxImages: 5,
    requestTimeoutMs: 12000,
    pendingStorageKey: "fd_embed_link_pending_v1",
    submitStorageKey: "fd_embed_link_submit_v1"
  };

  const APP_TITLE = CONFIG.appTitle;
  const IMAGE_URL_RE = /\.(?:jpe?g|png|gif|webp|avif|svg)(?:[?#].*)?$/i;
  const ID_PREFIX = "fd-embed-link-";

  const state = {
    initialized: false,
    buttonsRegistered: false,
    classicButtonRegistered: false,
    visualButtonRegistered: false,
    editorFallbackRegistered: false,
    pasteRegistered: false,
    pasteDisabled: false,
    pasteText: "",
    preview: null,
    localModal: null,
    fallbackClickCount: 0,
    lastOpenAttempt: null,
    lastModalError: "",
    integrationAttempts: 0,
    integrationTimer: 0
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
      if (!C || !C.modal || typeof C.modal.set !== "function") {
        return showLocalModal(title, content, footer, className);
      }

      return C.modal.set({
        class: ["fd-embed-modal", "cs-modal-text-left", className || "cs-modal-w60"],
        title,
        content,
        footer
      }, true);
    } catch (error) {
      state.lastModalError = error instanceof Error ? error.message : String(error);
      console.error("[FDEmbedLink] apertura modal fallita", error);
      return 0;
    }
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
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function normalizeSpace(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
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
    const allowedHost = CONFIG.allowedForumHost.toLowerCase();
    const C = commons();
    const forum = C && C.forum ? C.forum : {};

    if (location.protocol === "file:") {
      return true;
    }

    if (host === allowedHost || host === "www." + allowedHost) {
      return true;
    }

    return forum.subdomain === "difesa" && forum.domain === "forumfree.it";
  }

  function getForumContext() {
    const C = commons();
    const forum = C && C.forum ? C.forum : {};
    const locationInfo = C && C.location ? C.location : {};

    return {
      forumId: Number(forum.id || 0),
      forumDomain: forum.domain || location.hostname,
      forumSubdomain: forum.subdomain || "",
      topicId: Number(locationInfo.topic && locationInfo.topic.id || 0),
      topicTitle: locationInfo.topic && locationInfo.topic.title || null,
      pageUrl: window.location.href
    };
  }

  function assertCanUse() {
    const user = getUser();
    if (user.isGuest) {
      toast("error", APP_TITLE, "Devi essere autenticato per generare una card.");
      return false;
    }

    if (!isAllowedForumLocation()) {
      toast("error", APP_TITLE, "Questo script e configurato per " + CONFIG.allowedForumHost + ".");
      return false;
    }

    return true;
  }

  function getEditorTextarea() {
    return document.querySelector("textarea[name='Post']") ||
      document.querySelector("textarea[name='post']") ||
      document.querySelector("textarea[name='message']") ||
      document.querySelector("textarea");
  }

  function getEditorText() {
    const textarea = getEditorTextarea();
    return textarea ? textarea.value || "" : "";
  }

  function addContentToEditor(content) {
    const C = commons();
    if (C && C.utilities && C.utilities.replierForm && C.utilities.replierForm.textarea &&
        typeof C.utilities.replierForm.textarea.addContent === "function") {
      C.utilities.replierForm.textarea.addContent(content);
      return true;
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
      title: metadata.title || finalUrl,
      description: metadata.description || metadata.excerpt || "",
      author: metadata.author || "",
      publishedAt: metadata.publishedAt || metadata.published_at || metadata.articlePublishedAt || "",
      images
    };
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
    const title = truncate(metadata.title || url, 160);
    const description = truncate(metadata.description || "", 260);
    const domain = metadata.domain || getDomain(url);
    const author = truncate(metadata.author || "", 80);
    const publishedAt = metadata.publishedAt || "";
    const displayDate = formatDisplayDate(publishedAt);
    const compactClass = options.compact ? " fd-embed-link--compact" : "";
    const noImageClass = selectedImageUrl ? "" : " fd-embed-link--no-image";
    const idAttr = embedId ? ` data-fd-embed-id="${escapeAttr(embedId)}"` : "";
    const imageBlock = selectedImageUrl ? [
      `  <a class="fd-embed-link__media" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer nofollow">`,
      `    <img class="fd-embed-link__image" src="${escapeAttr(selectedImageUrl)}" alt="">`,
      "  </a>"
    ].join("\n") : "";
    const sourceBlock = domain ? [
      "    <div class=\"fd-embed-link__source\">",
      "      <span class=\"fd-embed-link__source-mark\" aria-hidden=\"true\"></span>",
      `      <span class="fd-embed-link__source-text">${escapeHtml(domain)}</span>`,
      "    </div>"
    ].join("\n") : "";
    const excerptBlock = description ? `    <p class="fd-embed-link__excerpt">${escapeHtml(description)}</p>` : "";
    const metaParts = [];

    if (author) {
      metaParts.push(`      <span class="fd-embed-link__author">${escapeHtml(author)}</span>`);
    }

    if (author && displayDate) {
      metaParts.push("      <span class=\"fd-embed-link__dot\" aria-hidden=\"true\"></span>");
    }

    if (displayDate) {
      metaParts.push(`      <time class="fd-embed-link__date" datetime="${escapeAttr(toIsoDate(publishedAt))}">${escapeHtml(displayDate)}</time>`);
    }

    const metaBlock = metaParts.length ? [
      "    <div class=\"fd-embed-link__meta\">",
      metaParts.join("\n"),
      "    </div>"
    ].join("\n") : "";

    return [
      `<div class="fd-embed-link${compactClass}${noImageClass}"${idAttr}>`,
      imageBlock,
      "  <div class=\"fd-embed-link__body\">",
      sourceBlock,
      `    <a class="fd-embed-link__title" href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(title)}</a>`,
      excerptBlock,
      metaBlock,
      "  </div>",
      "</div>"
    ].filter(Boolean).join("\n");
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
      "  <div class=\"fd-embed-field\">",
      `    <label for="${inputId}">URL articolo</label>`,
      `    <input class="fd-embed-input" id="${inputId}" type="url" value="${escapeAttr(initialUrl || "")}" placeholder="https://example.com/articolo">`,
      "    <p class=\"fd-embed-hint\">Inserisci un link http o https. I link diretti a immagini non vengono trasformati in card.</p>",
      "    <p class=\"fd-embed-error\" data-fd-embed-error hidden></p>",
      "  </div>",
      "</div>"
    ].join("\n");
  }

  function renderUrlFooter() {
    return [
      "<div class=\"fd-embed-actions\">",
      "  <button class=\"fd-embed-button\" type=\"button\" data-fd-embed-action=\"url-cancel\">Annulla</button>",
      "  <button class=\"fd-embed-button fd-embed-button--primary\" type=\"button\" data-fd-embed-action=\"url-preview\">Anteprima</button>",
      "</div>"
    ].join("\n");
  }

  function renderPasteModal(url) {
    return [
      "<div class=\"fd-embed-form\">",
      "  <p class=\"fd-embed-hint\">Hai incollato un link puro. Vuoi trasformarlo in una card embed?</p>",
      `  <input class="fd-embed-input" type="text" value="${escapeAttr(url)}" readonly>`,
      "</div>"
    ].join("\n");
  }

  function renderPasteFooter() {
    return [
      "<div class=\"fd-embed-actions\">",
      "  <button class=\"fd-embed-button fd-embed-button--warning\" type=\"button\" data-fd-embed-action=\"paste-disable\">Disabilita temporaneamente</button>",
      "  <button class=\"fd-embed-button\" type=\"button\" data-fd-embed-action=\"paste-normal\">Annulla</button>",
      "  <button class=\"fd-embed-button fd-embed-button--primary\" type=\"button\" data-fd-embed-action=\"paste-confirm\">Conferma</button>",
      "</div>"
    ].join("\n");
  }

  function renderPreviewModal() {
    const preview = state.preview;
    const metadata = preview.metadata;
    const selected = getSelectedImage(metadata);
    const card = renderCardHtml(metadata, "", selected.url, { compact: false })
      .replace("<img class=\"fd-embed-link__image\"", "<img data-fd-embed-preview-image class=\"fd-embed-link__image\"");
    const images = metadata.images.length ? [
      "<div class=\"fd-embed-field\">",
      "  <strong>Immagine di copertina</strong>",
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
    ].join("\n") : "<p class=\"fd-embed-hint\">Nessuna immagine valida trovata. La card verra inserita senza copertina.</p>";

    return [
      "<div class=\"fd-embed-preview\">",
      card,
      images,
      "</div>"
    ].join("\n");
  }

  function renderPreviewFooter() {
    return [
      "<div class=\"fd-embed-actions\">",
      "  <button class=\"fd-embed-button\" type=\"button\" data-fd-embed-action=\"preview-cancel\">Annulla</button>",
      "  <button class=\"fd-embed-button fd-embed-button--primary\" type=\"button\" data-fd-embed-action=\"preview-insert\">Inserisci</button>",
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
      const modalId = showModal(APP_TITLE, renderUrlModal(initialUrl), renderUrlFooter(), "cs-modal-w60");
      markOpenStep("show-modal-called", { modalId });
      const input = document.getElementById(ID_PREFIX + "url");
      if (input) {
        markOpenStep("url-input-found");
        input.focus();
        input.select();
        return;
      }

      markOpenStep("url-input-not-found", {
        localModalOpen: Boolean(state.localModal && state.localModal.parentNode),
        modalApiReady: Boolean(commons() && commons().modal && typeof commons().modal.set === "function")
      });
      openUrlPromptFallback(initialUrl, "url-input-not-found");
    } catch (error) {
      state.lastModalError = error instanceof Error ? error.message : String(error);
      markOpenStep("open-url-modal-error", { error: state.lastModalError });
      console.error("[FDEmbedLink] openUrlModal failed", error);
      openUrlPromptFallback(initialUrl, "open-url-modal-error");
    }
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
      const selectedImageIndex = metadata.images.length ? 0 : -1;
      state.preview = {
        sourceUrl: parsed.href,
        metadata,
        selectedImageIndex
      };

      closeModal();
      showModal("Anteprima " + APP_TITLE, renderPreviewModal(), renderPreviewFooter(), "cs-modal-w70");
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
      userId: getUser().id,
      createdAt: Date.now()
    };
    setPendingEmbeds(pending);
  }

  function rememberSubmitEmbeds() {
    const text = getEditorText();
    const pending = getPendingEmbeds();
    const ids = Object.keys(pending).filter((id) => text.includes(`data-fd-embed-id="${id}"`) || text.includes(`data-fd-embed-id='${id}'`));

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
    const postId = post && post.id;
    const element = post && post.nativeElement;
    const base = window.location.origin + window.location.pathname + window.location.search;

    if (element && postId) {
      const link = element.querySelector(`a[href*="#entry${postId}"], a[href*="entry${postId}"]`);
      if (link && link.href) {
        return link.href;
      }
    }

    return postId ? base + "#entry" + postId : window.location.href;
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

    for (const post of C.location.posts) {
      if (user.id && post.author && post.author.id && Number(post.author.id) !== user.id) {
        continue;
      }

      const html = String(post.content || "") + " " + (post.nativeElement ? post.nativeElement.innerHTML : "");
      const foundIds = ids.filter((id) => html.includes(`data-fd-embed-id="${id}"`) || html.includes(`data-fd-embed-id='${id}'`));
      if (!foundIds.length) {
        continue;
      }

      const embeds = foundIds.map((id) => ({
        id,
        publishToken: pending[id].publishToken
      }));

      try {
        await publishEmbeds(embeds, {
          id: post.id || null,
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
    if (state.pasteDisabled || !assertCanUse()) {
      return true;
    }

    const clipboard = event.clipboardData || window.clipboardData;
    const text = clipboard ? clipboard.getData("text/plain") : "";
    const url = parseUrl(text);

    if (!url || isDirectImageUrl(url.href)) {
      return true;
    }

    event.preventDefault();
    state.pasteText = text.trim();
    showModal("Link incollato", renderPasteModal(state.pasteText), renderPasteFooter(), "cs-modal-w50");
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

    if (action === "fallback-open") {
      state.fallbackClickCount += 1;
      openUrlModal("");
      return;
    }

    if (action === "url-cancel" || action === "preview-cancel") {
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

  function handleSubmitCapture(event) {
    const target = event.target;
    if (target && target.matches && target.matches('input[name="submit_post"], button[name="submit_post"]')) {
      rememberSubmitEmbeds();
    }
  }

  function registerEditorButtons() {
    if (state.classicButtonRegistered && state.visualButtonRegistered) {
      state.buttonsRegistered = true;
      return true;
    }

    const C = commons();
    if (!C || !C.utilities) {
      return false;
    }

    const replierForm = C.utilities.replierForm || {};
    const buttons = replierForm.buttons;
    if (!state.classicButtonRegistered && buttons && typeof buttons.add === "function") {
      buttons.add({
        title: APP_TITLE,
        event: async () => {
          await openUrlModal("");
        },
        allowCustomEditors: false
      });
      state.classicButtonRegistered = true;
    }

    if (!state.visualButtonRegistered && Array.isArray(C.utilities.queue)) {
      C.utilities.queue.push({
        tag: "ve:externals:add",
        event: {
          title: APP_TITLE,
          event: () => {
            openUrlModal("");
          },
          serviceType: "link"
        }
      });
      state.visualButtonRegistered = true;
    }

    state.buttonsRegistered = state.classicButtonRegistered || state.visualButtonRegistered;
    return state.buttonsRegistered;
  }

  function registerPasteEvent() {
    if (state.pasteRegistered) {
      return true;
    }

    const C = commons();
    const textarea = C && C.utilities && C.utilities.replierForm && C.utilities.replierForm.textarea;
    if (textarea && typeof textarea.addEvent === "function") {
      textarea.addEvent("paste", handlePaste);
      state.pasteRegistered = true;
      return true;
    }

    const fallback = getEditorTextarea();
    if (fallback) {
      fallback.addEventListener("paste", handlePaste);
      state.pasteRegistered = true;
      return true;
    }

    return false;
  }

  function registerEditorFallbackButton() {
    const existing = document.querySelector("[data-fd-embed-fallback-button]");
    if (existing) {
      bindFallbackButton(existing);
      existing.hidden = !getEditorTextarea();
      state.editorFallbackRegistered = true;
      return true;
    }

    if (!getEditorTextarea()) {
      return false;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "fd-embed-editor-fallback fd-embed-editor-fallback--floating";
    wrapper.setAttribute("data-fd-embed-fallback", "");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "fd-embed-editor-fallback__button";
    button.setAttribute("data-fd-embed-fallback-button", "");
    button.setAttribute("data-fd-embed-action", "fallback-open");
    button.textContent = APP_TITLE;
    bindFallbackButton(button);

    wrapper.appendChild(button);
    document.body.appendChild(wrapper);
    state.editorFallbackRegistered = true;
    return true;
  }

  function bindFallbackButton(button) {
    button.setAttribute("data-fd-embed-action", "fallback-open");
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      state.fallbackClickCount += 1;
      openUrlModal("");
    };
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

  function findVisibleTextButton(text) {
    const selector = "button, a, input[type='button'], input[type='submit'], [role='button']";
    return Array.from(document.querySelectorAll(selector)).some((element) => {
      const value = element.tagName === "INPUT" ? element.value : element.textContent;
      return !element.matches("[data-fd-embed-fallback-button]") &&
        normalizeSpace(value) === text &&
        isVisibleElement(element);
    });
  }

  function scheduleIntegrationRetry() {
    window.clearTimeout(state.integrationTimer);

    const buttonsReady = registerEditorButtons();
    const pasteReady = registerPasteEvent();
    const fallbackReady = registerEditorFallbackButton();
    const entryReady = buttonsReady || fallbackReady;

    if (state.classicButtonRegistered && state.visualButtonRegistered && pasteReady) {
      return;
    }

    state.integrationAttempts += 1;
    if (state.integrationAttempts >= 80) {
      const details = diagnostics();
      if (!entryReady || !pasteReady) {
        console.warn("[FDEmbedLink] editor non agganciato completamente", details);
      } else if (!state.visualButtonRegistered) {
        console.info("[FDEmbedLink] editor classico agganciato; coda visuale non disponibile in questa pagina", details);
      }
      return;
    }

    state.integrationTimer = window.setTimeout(scheduleIntegrationRetry, state.integrationAttempts < 20 ? 250 : 1000);
  }

  function refreshIntegration() {
    state.integrationAttempts = 0;
    scheduleIntegrationRetry();
    return diagnostics();
  }

  function diagnostics() {
    const C = commons();
    const utilities = C && C.utilities ? C.utilities : null;
    const replierForm = utilities && utilities.replierForm ? utilities.replierForm : null;
    const textareaApi = replierForm && replierForm.textarea ? replierForm.textarea : null;
    const buttons = replierForm && replierForm.buttons ? replierForm.buttons : null;
    const fallbackButton = document.querySelector("[data-fd-embed-fallback-button]");
    const localModal = state.localModal || document.querySelector("[data-fd-embed-local-modal]");

    return {
      app: APP_TITLE,
      configured: isConfigured(),
      host: location.hostname,
      allowedLocation: isAllowedForumLocation(),
      commonsReady: Boolean(C),
      utilitiesReady: Boolean(utilities),
      replierFormReady: Boolean(replierForm),
      classicButtonApiReady: Boolean(buttons && typeof buttons.add === "function"),
      classicButtonRegistered: state.classicButtonRegistered,
      classicButtonVisible: findVisibleTextButton(APP_TITLE),
      modalApiReady: Boolean(C && C.modal && typeof C.modal.set === "function"),
      localModalOpen: Boolean(localModal && localModal.parentNode),
      localModalVisible: isVisibleElement(localModal),
      lastModalError: state.lastModalError,
      lastOpenAttempt: state.lastOpenAttempt,
      visualQueueReady: Boolean(utilities && Array.isArray(utilities.queue)),
      textareaApiReady: Boolean(textareaApi && typeof textareaApi.addEvent === "function" && typeof textareaApi.addContent === "function"),
      domTextareaReady: Boolean(getEditorTextarea()),
      fallbackButtonReady: Boolean(fallbackButton),
      fallbackButtonVisible: isVisibleElement(fallbackButton),
      user: getUser(),
      state: {
        initialized: state.initialized,
        classicButtonRegistered: state.classicButtonRegistered,
        visualButtonRegistered: state.visualButtonRegistered,
        editorFallbackRegistered: state.editorFallbackRegistered,
        pasteRegistered: state.pasteRegistered,
        fallbackClickCount: state.fallbackClickCount,
        integrationAttempts: state.integrationAttempts
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
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("click", handleSubmitCapture, true);
    document.addEventListener("submit", rememberSubmitEmbeds, true);
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
