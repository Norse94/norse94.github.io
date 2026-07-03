(() => {
  "use strict";

  const CONFIG = {
    appTitle: "FD EMBED LINK",
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
    pasteRegistered: false,
    pasteDisabled: false,
    pasteText: "",
    preview: null
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
    const C = commons();
    if (C && C.modal && typeof C.modal.close === "function") {
      C.modal.close();
    }
  }

  function showModal(title, content, footer, className) {
    const C = commons();
    if (!C || !C.modal || typeof C.modal.set !== "function") {
      return 0;
    }

    return C.modal.set({
      class: ["fd-embed-modal", "cs-modal-text-left", className || "cs-modal-w60"],
      title,
      content,
      footer
    }, true);
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

    if (location.hostname && location.hostname !== CONFIG.allowedForumHost && location.protocol !== "file:") {
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
    if (!assertCanUse()) {
      return;
    }

    showModal(APP_TITLE, renderUrlModal(initialUrl), renderUrlFooter(), "cs-modal-w60");
    const input = document.getElementById(ID_PREFIX + "url");
    if (input) {
      input.focus();
      input.select();
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
    if (state.buttonsRegistered) {
      return true;
    }

    const C = commons();
    if (!C || !C.utilities || !C.utilities.replierForm) {
      return false;
    }

    const buttons = C.utilities.replierForm.buttons;
    if (buttons && typeof buttons.add === "function") {
      buttons.add({
        title: APP_TITLE,
        event: async () => {
          await openUrlModal("");
        },
        allowCustomEditors: false
      });
    }

    if (Array.isArray(C.utilities.queue)) {
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
    }

    state.buttonsRegistered = Boolean(buttons && typeof buttons.add === "function") || Array.isArray(C.utilities.queue);
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
    const buttonsReady = registerEditorButtons();
    const pasteReady = registerPasteEvent();
    if (!buttonsReady || !pasteReady) {
      window.setTimeout(() => {
        registerEditorButtons();
        registerPasteEvent();
      }, 500);
    }
    confirmPublishedEmbeds();
  }

  const api = {
    config: CONFIG,
    init,
    openUrlModal,
    handlePaste,
    buildHtml: renderCardHtml,
    confirmPublishedEmbeds
  };

  window.FDEmbedLink = api;
  window.EmbedLink = api;

  init();
})();
