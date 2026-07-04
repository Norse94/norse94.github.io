/* FD EMBED LINK build 2026-07-04.13 */
(() => {
  "use strict";

  const CONFIG = {
    appTitle: "FD EMBED LINK",
    version: "2026-07-04.13",
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
    classicButtonAddAttempts: 0,
    visualButtonRegistered: false,
    editorInlineButtonRegistered: false,
    editorFallbackRegistered: false,
    pasteRegistered: false,
    textareaApiPasteRegistered: false,
    pasteTargetCount: 0,
    pasteDisabled: false,
    pasteText: "",
    preview: null,
    commonsModal: null,
    localModal: null,
    localModalOpenedAt: 0,
    fallbackClickCount: 0,
    lastFallbackActivationAt: 0,
    lastInlineInsertTarget: "",
    lastOpenAttempt: null,
    lastModalError: "",
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
      if (!C || !C.modal) {
        return showLocalModal(title, content, footer, className);
      }

      if (typeof C.modal.create === "function") {
        closeModal();
        const created = C.modal.create({
          className: ["fd-embed-modal", "cs-modal-text-left", className || "cs-modal-w60"],
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
          class: ["fd-embed-modal", "cs-modal-text-left", className || "cs-modal-w60"],
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

  function getEditorRoot(textarea) {
    if (!textarea || !textarea.closest) {
      return document.body;
    }

    return textarea.closest("form") ||
      textarea.closest("[id*='reply'], [class*='reply'], [id*='editor'], [class*='editor']") ||
      textarea.parentElement ||
      document.body;
  }

  function isBeforeElement(candidate, reference) {
    if (!candidate || !reference || candidate === reference) {
      return false;
    }

    if (typeof candidate.compareDocumentPosition !== "function" || !window.Node) {
      return true;
    }

    return Boolean(candidate.compareDocumentPosition(reference) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  function describeElement(element) {
    if (!element) {
      return "";
    }

    const tag = String(element.tagName || "element").toLowerCase();
    const id = element.id ? "#" + element.id : "";
    const classes = element.classList && element.classList.length
      ? "." + Array.from(element.classList).slice(0, 4).join(".")
      : "";
    return tag + id + classes;
  }

  function findEditorToolbar(textarea) {
    const root = getEditorRoot(textarea);
    if (!root || !root.querySelectorAll) {
      return null;
    }

    const selectors = [
      ".sceditor-toolbar",
      ".wysibb-toolbar",
      ".note-toolbar",
      ".cke_top .cke_toolbox",
      ".cke_top",
      ".bbcode-toolbar",
      ".bbcode-buttons",
      ".format-buttons",
      ".editor-toolbar",
      ".editorButtons",
      ".editor_buttons",
      ".editortoolbar",
      ".codebuttons",
      "#codebuttons",
      "#buttons",
      "[data-editor-toolbar]",
      "[id*='toolbar']",
      "[class*='toolbar']"
    ].join(",");

    const candidates = Array.from(root.querySelectorAll(selectors)).filter((candidate) => {
      return candidate !== textarea &&
        !candidate.closest("[data-fd-embed-inline-wrapper]") &&
        isBeforeElement(candidate, textarea);
    });

    const visibleCandidates = candidates.filter(isVisibleElement);
    return visibleCandidates[visibleCandidates.length - 1] || candidates[candidates.length - 1] || null;
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
    if (!isEditorPasteEvent(event)) {
      return true;
    }

    if (state.pasteDisabled || !assertCanUse()) {
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
    showModal("Link incollato", renderPasteModal(state.pasteText), renderPasteFooter(), "cs-modal-w50");
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

    if (action === "fallback-open") {
      event.stopPropagation();
      state.fallbackClickCount += 1;
      openUrlModal("");
      return;
    }

    if (action === "editor-open") {
      event.stopPropagation();
      openUrlModal("");
      return;
    }

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

  function handleFallbackActivation(event) {
    if (event.type !== "click") {
      return;
    }

    const target = event.target && event.target.closest ? event.target.closest("[data-fd-embed-fallback-button]") : null;
    if (!target) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const now = Date.now();
    if (now - state.lastFallbackActivationAt < 650) {
      return;
    }
    state.lastFallbackActivationAt = now;
    state.fallbackClickCount += 1;
    openUrlModal("");
  }

  function handleSubmitCapture(event) {
    const target = event.target;
    if (target && target.matches && target.matches('input[name="submit_post"], button[name="submit_post"]')) {
      rememberSubmitEmbeds();
    }
  }

  function registerEditorButtons() {
    if (state.classicButtonRegistered && state.visualButtonRegistered && findVisibleNativeEditorButton(APP_TITLE)) {
      state.buttonsRegistered = true;
      return true;
    }

    const C = commons();
    if (!C || !C.utilities) {
      return false;
    }

    const replierForm = C.utilities.replierForm || {};
    const buttons = replierForm.buttons;
    const nativeButtonVisible = findVisibleNativeEditorButton(APP_TITLE);
    const buttonConfig = {
      title: APP_TITLE,
      event: async () => {
        await openUrlModal("");
      },
      allowCustomEditors: false
    };

    if (buttons && typeof buttons.add === "function" &&
        (!state.classicButtonRegistered || (!nativeButtonVisible && state.classicButtonAddAttempts < 8))) {
      try {
        buttons.add(buttonConfig);
        state.classicButtonRegistered = true;
        state.classicButtonAddAttempts += 1;
      } catch (error) {
        state.lastModalError = error && error.message ? error.message : String(error || "");
      }
    }

    if (!state.visualButtonRegistered && Array.isArray(C.utilities.queue)) {
      C.utilities.queue.push({
        tag: "ve:externals:add",
        event: {
          ...buttonConfig,
          serviceType: "link"
        }
      });
      state.visualButtonRegistered = true;
    }

    state.buttonsRegistered = state.classicButtonRegistered || state.visualButtonRegistered || state.editorInlineButtonRegistered;
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

  function createEditorOpenButton(kind) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = kind === "toolbar"
      ? "fd-embed-editor-inline__button fd-embed-editor-inline__button--toolbar"
      : "fd-embed-editor-inline__button";
    button.setAttribute("data-fd-embed-inline-button", "");
    button.setAttribute("data-fd-embed-action", "editor-open");
    button.setAttribute("aria-label", APP_TITLE);
    button.title = APP_TITLE;
    button.textContent = APP_TITLE;
    bindEditorOpenButton(button);
    applyInlineButtonStyles(button);
    return button;
  }

  function bindEditorOpenButton(button) {
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      openUrlModal("");
    };
  }

  function applyInlineWrapperStyles(wrapper) {
    wrapper.style.cssText = [
      "display:flex",
      "justify-content:flex-start",
      "align-items:center",
      "gap:6px",
      "margin:8px 0"
    ].join(";");
  }

  function applyInlineButtonStyles(button) {
    button.style.cssText = [
      "min-height:32px",
      "padding:6px 11px",
      "border:1px solid #17685b",
      "border-radius:6px",
      "background:#17685b",
      "color:#fff",
      "font:inherit",
      "font-size:13px",
      "font-weight:700",
      "line-height:1.2",
      "cursor:pointer",
      "box-shadow:none"
    ].join(";");
  }

  function registerEditorInlineButtons() {
    let inserted = false;

    for (const textarea of getEditorTextareas()) {
      if (!textarea || !textarea.isConnected || textarea.closest("[data-fd-embed-inline-wrapper]")) {
        continue;
      }

      const toolbar = findEditorToolbar(textarea);
      const previous = textarea.previousElementSibling;
      const existing = toolbar && toolbar.querySelector
        ? toolbar.querySelector("[data-fd-embed-inline-button]")
        : previous && previous.matches && previous.matches("[data-fd-embed-inline-wrapper]")
          ? previous.querySelector("[data-fd-embed-inline-button]")
          : null;

      if (existing) {
        bindEditorOpenButton(existing);
        applyInlineButtonStyles(existing);
        inserted = true;
        continue;
      }

      if (toolbar) {
        const button = createEditorOpenButton("toolbar");
        toolbar.appendChild(button);
        state.lastInlineInsertTarget = describeElement(toolbar);
        inserted = true;
        continue;
      }

      if (textarea.parentNode) {
        const wrapper = document.createElement("div");
        wrapper.className = "fd-embed-editor-inline";
        wrapper.setAttribute("data-fd-embed-inline-wrapper", "");

        const button = createEditorOpenButton("inline");
        wrapper.appendChild(button);
        textarea.parentNode.insertBefore(wrapper, textarea);
        applyInlineWrapperStyles(wrapper);
        state.lastInlineInsertTarget = "before " + describeElement(textarea);
        inserted = true;
      }
    }

    state.editorInlineButtonRegistered = inserted || Boolean(document.querySelector("[data-fd-embed-inline-button]"));
    return state.editorInlineButtonRegistered;
  }

  function hasVisibleInlineButton() {
    return Array.from(document.querySelectorAll("[data-fd-embed-inline-button]")).some(isVisibleElement);
  }

  function registerEditorFallbackButton() {
    const existing = document.querySelector("[data-fd-embed-fallback-button]");
    if (existing) {
      bindFallbackButton(existing);
      applyFallbackButtonStyles(existing);
      existing.hidden = !getEditorTextarea() || hasVisibleInlineButton();
      state.editorFallbackRegistered = true;
      return true;
    }

    if (!getEditorTextarea() || hasVisibleInlineButton()) {
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
    applyFallbackButtonStyles(button);

    wrapper.appendChild(button);
    document.body.appendChild(wrapper);
    applyFallbackWrapperStyles(wrapper);
    state.editorFallbackRegistered = true;
    return true;
  }

  function applyFallbackWrapperStyles(wrapper) {
    wrapper.style.cssText = [
      "position:fixed",
      "right:12px",
      "bottom:12px",
      "z-index:2147483000",
      "display:flex",
      "margin:0"
    ].join(";");
  }

  function applyFallbackButtonStyles(button) {
    button.style.cssText = [
      "min-height:38px",
      "padding:8px 12px",
      "border:1px solid #17685b",
      "border-radius:6px",
      "background:#17685b",
      "color:#fff",
      "font:inherit",
      "font-size:13px",
      "font-weight:700",
      "line-height:1.2",
      "cursor:pointer",
      "box-shadow:0 6px 18px rgba(21,24,25,.18)"
    ].join(";");
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
      return !element.matches("[data-fd-embed-fallback-button]") &&
        !element.matches("[data-fd-embed-inline-button]") &&
        elementLabelMatches(element, text) &&
        isVisibleElement(element);
    });
  }

  function scheduleIntegrationRetry() {
    window.clearTimeout(state.integrationTimer);

    const buttonsReady = registerEditorButtons();
    const inlineButtonReady = registerEditorInlineButtons();
    const pasteReady = registerPasteEvent();
    const fallbackReady = registerEditorFallbackButton();

    if (state.classicButtonRegistered && state.visualButtonRegistered && pasteReady) {
      return;
    }

    state.integrationAttempts += 1;
    if (state.integrationAttempts === 80 || state.integrationAttempts % 120 === 0) {
      const details = diagnostics();
      if (!(buttonsReady || inlineButtonReady || fallbackReady) || !pasteReady) {
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
        registerEditorInlineButtons();
        registerPasteEvent();
        registerEditorFallbackButton();
      }, 2000);
    }

    if (!state.integrationObserver && document.body && window.MutationObserver) {
      state.integrationObserver = new MutationObserver(() => {
        registerEditorButtons();
        registerEditorInlineButtons();
        registerPasteEvent();
        registerEditorFallbackButton();
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
    const fallbackButton = document.querySelector("[data-fd-embed-fallback-button]");
    const inlineButton = document.querySelector("[data-fd-embed-inline-button]");
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
      classicButtonAddAttempts: state.classicButtonAddAttempts,
      classicButtonVisible: findVisibleNativeEditorButton(APP_TITLE),
      editorInlineButtonReady: Boolean(inlineButton),
      editorInlineButtonVisible: hasVisibleInlineButton(),
      lastInlineInsertTarget: state.lastInlineInsertTarget,
      modalCreateReady: Boolean(C && C.modal && typeof C.modal.create === "function"),
      modalSetReady: Boolean(C && C.modal && typeof C.modal.set === "function"),
      modalApiReady: hasAnyModalApi(),
      commonsModalOpen: Boolean(state.commonsModal),
      localModalOpen: Boolean(localModal && localModal.parentNode),
      localModalVisible: isVisibleElement(localModal),
      lastModalError: state.lastModalError,
      lastOpenAttempt: state.lastOpenAttempt,
      visualQueueReady: Boolean(utilities && Array.isArray(utilities.queue)),
      textareaApiReady: Boolean(textareaApi && typeof textareaApi.addEvent === "function" && typeof textareaApi.addContent === "function"),
      domTextareaReady: Boolean(getEditorTextarea()),
      domTextareaCount: getEditorTextareas().length,
      fallbackButtonReady: Boolean(fallbackButton),
      fallbackButtonVisible: isVisibleElement(fallbackButton),
      user: getUser(),
      state: {
        initialized: state.initialized,
        classicButtonRegistered: state.classicButtonRegistered,
        classicButtonAddAttempts: state.classicButtonAddAttempts,
        visualButtonRegistered: state.visualButtonRegistered,
        editorInlineButtonRegistered: state.editorInlineButtonRegistered,
        editorFallbackRegistered: state.editorFallbackRegistered,
        pasteRegistered: state.pasteRegistered,
        textareaApiPasteRegistered: state.textareaApiPasteRegistered,
        pasteTargetCount: state.pasteTargetCount,
        fallbackClickCount: state.fallbackClickCount,
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
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("click", handleFallbackActivation, true);
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
