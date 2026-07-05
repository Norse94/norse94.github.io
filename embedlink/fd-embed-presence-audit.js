/* FD EMBED LINK presence audit build 2026-07-05.1 */
(() => {
  "use strict";

  const CONFIG = {
    appTitle: "FD EMBED LINK Presence Audit",
    endpoint: "https://mycvmmlezpxdoamecrhb.functions.supabase.co/embed-link",
    tokenStorageKey: "fd_embed_dashboard_token_v1",
    chunkSize: 20,
    maxRows: 500
  };

  const state = {
    rows: [],
    results: [],
    lastReport: null,
    busy: false
  };

  if (window.FDEmbedPresenceAudit && window.FDEmbedPresenceAudit.destroy) {
    window.FDEmbedPresenceAudit.destroy();
  }

  function createUi() {
    document.getElementById("fd-presence-audit")?.remove();
    document.getElementById("fd-presence-audit-style")?.remove();

    const style = document.createElement("style");
    style.id = "fd-presence-audit-style";
    style.textContent = `
      #fd-presence-audit {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 2147483002;
        width: min(760px, calc(100vw - 32px));
        max-height: min(720px, calc(100vh - 32px));
        display: grid;
        grid-template-rows: auto auto auto minmax(0, 1fr);
        overflow: hidden;
        border: 1px solid #b7c2ce;
        border-radius: 8px;
        background: #fff;
        color: #17202a;
        box-shadow: 0 18px 48px rgba(15, 23, 42, .28);
        font: 14px/1.35 Arial, Helvetica, sans-serif;
      }
      #fd-presence-audit * { box-sizing: border-box; }
      .fdpa-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 12px 14px;
        border-bottom: 1px solid #e1e7ef;
        background: #f7fafc;
      }
      .fdpa-head strong { font-size: 16px; }
      .fdpa-close {
        width: 30px;
        height: 30px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: #fff;
        cursor: pointer;
        font-size: 18px;
      }
      .fdpa-controls {
        display: grid;
        grid-template-columns: 1fr 130px 130px;
        gap: 8px;
        padding: 12px 14px;
        border-bottom: 1px solid #e1e7ef;
      }
      .fdpa-controls input {
        width: 100%;
        height: 34px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 0 10px;
        font: inherit;
      }
      .fdpa-button {
        height: 34px;
        border: 1px solid #007bff;
        border-radius: 6px;
        background: #fff;
        color: #007bff;
        cursor: pointer;
        font-weight: 700;
      }
      .fdpa-button:hover { background: #007bff; color: #fff; }
      .fdpa-button.is-green { border-color: #28a745; color: #28a745; }
      .fdpa-button.is-green:hover { background: #28a745; color: #fff; }
      .fdpa-button.is-red { border-color: #dc3545; color: #dc3545; }
      .fdpa-button.is-red:hover { background: #dc3545; color: #fff; }
      .fdpa-button:disabled {
        opacity: .55;
        cursor: not-allowed;
        background: #f8fafc;
        color: #64748b;
        border-color: #cbd5e1;
      }
      .fdpa-stats {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 8px;
        padding: 12px 14px;
        border-bottom: 1px solid #e1e7ef;
      }
      .fdpa-stat {
        border: 1px solid #e1e7ef;
        border-radius: 6px;
        padding: 8px;
        background: #fbfdff;
      }
      .fdpa-stat span {
        display: block;
        color: #64748b;
        font-size: 12px;
      }
      .fdpa-stat strong {
        display: block;
        margin-top: 2px;
        font-size: 18px;
      }
      .fdpa-body {
        min-height: 0;
        overflow: auto;
        padding: 0 14px 14px;
      }
      .fdpa-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 12px 0;
      }
      .fdpa-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }
      .fdpa-table th,
      .fdpa-table td {
        border-bottom: 1px solid #e8edf3;
        padding: 8px 6px;
        text-align: left;
        vertical-align: top;
      }
      .fdpa-table th {
        position: sticky;
        top: 0;
        background: #fff;
        z-index: 1;
        color: #475569;
        font-size: 12px;
      }
      .fdpa-table td { word-break: break-word; }
      .fdpa-badge {
        display: inline-flex;
        align-items: center;
        min-height: 22px;
        padding: 2px 7px;
        border-radius: 999px;
        border: 1px solid #cbd5e1;
        font-weight: 800;
        font-size: 12px;
      }
      .fdpa-badge.present { color: #08765d; background: #eef8f4; border-color: #9bd4c5; }
      .fdpa-badge.missing { color: #991b1b; background: #fef2f2; border-color: #fecaca; }
      .fdpa-badge.unavailable { color: #92400e; background: #fffbeb; border-color: #fde68a; }
      .fdpa-log {
        margin: 10px 0 0;
        max-height: 120px;
        overflow: auto;
        white-space: pre-wrap;
        border: 1px solid #e1e7ef;
        border-radius: 6px;
        padding: 8px;
        background: #0f172a;
        color: #e2e8f0;
        font: 12px/1.4 Consolas, Monaco, monospace;
      }
      @media (max-width: 720px) {
        #fd-presence-audit { left: 8px; right: 8px; bottom: 8px; width: auto; }
        .fdpa-controls { grid-template-columns: 1fr; }
        .fdpa-stats { grid-template-columns: repeat(2, 1fr); }
      }
    `;
    document.head.appendChild(style);

    const root = document.createElement("section");
    root.id = "fd-presence-audit";
    root.innerHTML = `
      <header class="fdpa-head">
        <strong>FD EMBED LINK Presence Audit</strong>
        <button class="fdpa-close" type="button" data-fdpa-close title="Chiudi">x</button>
      </header>
      <div class="fdpa-controls">
        <input type="password" data-fdpa-token placeholder="Token admin dashboard">
        <button class="fdpa-button" type="button" data-fdpa-load>Carica DB</button>
        <button class="fdpa-button is-green" type="button" data-fdpa-verify>Verifica</button>
      </div>
      <div class="fdpa-stats" data-fdpa-stats></div>
      <div class="fdpa-body">
        <div class="fdpa-actions">
          <button class="fdpa-button is-red" type="button" data-fdpa-apply>Segna rimossi</button>
          <button class="fdpa-button" type="button" data-fdpa-export>Esporta JSON</button>
          <button class="fdpa-button" type="button" data-fdpa-clear>Pulisci</button>
        </div>
        <table class="fdpa-table">
          <thead>
            <tr>
              <th style="width:96px">Stato</th>
              <th>Titolo</th>
              <th style="width:105px">Post</th>
              <th>URL</th>
            </tr>
          </thead>
          <tbody data-fdpa-rows>
            <tr><td colspan="4">Carica i record published dal DB.</td></tr>
          </tbody>
        </table>
        <pre class="fdpa-log" data-fdpa-log></pre>
      </div>
    `;
    document.body.appendChild(root);

    root.querySelector("[data-fdpa-token]").value = localStorage.getItem(CONFIG.tokenStorageKey) || "";
    root.addEventListener("click", handleClick);
    renderStats();
    return root;
  }

  function destroy() {
    document.getElementById("fd-presence-audit")?.remove();
    document.getElementById("fd-presence-audit-style")?.remove();
    delete window.FDEmbedPresenceAudit;
  }

  async function handleClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (target.closest("[data-fdpa-close]")) {
      destroy();
      return;
    }
    if (target.closest("[data-fdpa-load]")) {
      await loadRows();
      return;
    }
    if (target.closest("[data-fdpa-verify]")) {
      await verifyRows();
      return;
    }
    if (target.closest("[data-fdpa-apply]")) {
      await applyMissing();
      return;
    }
    if (target.closest("[data-fdpa-export]")) {
      exportJson();
      return;
    }
    if (target.closest("[data-fdpa-clear]")) {
      state.rows = [];
      state.results = [];
      state.lastReport = null;
      log("Pulito.");
      render();
    }
  }

  async function loadRows() {
    const token = tokenValue();
    if (!token) {
      log("Inserisci il token admin.");
      return;
    }

    setBusy(true);
    try {
      localStorage.setItem(CONFIG.tokenStorageKey, token);
      const data = await edgeRequest("dashboard", {
        dashboardToken: token,
        filters: {
          status: "published",
          limit: CONFIG.maxRows
        }
      });

      state.rows = (data.history || [])
        .filter((row) => row && row.id && row.post_id && row.post_url)
        .map(normalizeRow);
      state.results = state.rows.map((row) => ({ ...row, presence: "unverified" }));
      state.lastReport = null;
      log("Caricati " + state.rows.length + " record published dal DB.");
      render();
    } catch (error) {
      log("Errore caricamento DB: " + errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function verifyRows() {
    if (!state.rows.length) {
      log("Nessun record caricato.");
      return;
    }

    setBusy(true);
    try {
      const sameOriginRows = state.rows.filter((row) => isSameOriginPost(row.postUrl));
      const skipped = state.rows.length - sameOriginRows.length;
      const posts = await fetchForumPostsByIds(sameOriginRows.map((row) => row.postId));

      state.results = state.rows.map((row) => {
        if (!isSameOriginPost(row.postUrl)) {
          return { ...row, presence: "unavailable", reason: "post_url non same-origin" };
        }

        const post = posts[String(row.postId)];
        if (!post || typeof post.content !== "string") {
          return { ...row, presence: "unavailable", reason: "post non restituito da api.php" };
        }

        const enriched = enrichFromPost(row, post);
        return contentHasPublication(post.content, row)
          ? { ...enriched, presence: "present" }
          : { ...enriched, presence: "missing" };
      });

      const counts = countResults();
      log("Verifica completata. Presenti: " + counts.present + ", rimossi: " + counts.missing + ", non verificabili: " + counts.unavailable + (skipped ? " (cross-domain: " + skipped + ")" : "") + ".");
      render();
    } catch (error) {
      log("Errore verifica ForumFree: " + errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function applyMissing() {
    const token = tokenValue();
    if (!token) {
      log("Inserisci il token admin.");
      return;
    }

    const payload = state.results
      .filter((row) => row.presence === "missing" || row.presence === "present")
      .map((row) => ({
        id: row.id,
        postUrl: row.postUrl,
        postId: row.postId,
        topicTitle: row.topicTitle || "",
        presence: row.presence
      }));

    if (!payload.length) {
      log("Nessun risultato present/missing da inviare.");
      return;
    }

    setBusy(true);
    try {
      const data = await edgeRequest("presence", {
        publications: payload,
        user: forumUser()
      });
      state.lastReport = data;
      const updated = (data.results || []).filter((item) => item && item.updated).length;
      log("Report inviato. Aggiornati: " + updated + " su " + payload.length + ".");
      renderStats();
    } catch (error) {
      log("Errore report presence: " + errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function edgeRequest(action, payload) {
    const response = await fetch(CONFIG.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ...payload, action })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      throw new Error(data.error || data.message || "Richiesta Edge non riuscita.");
    }
    return data;
  }

  async function fetchForumPostsByIds(postIds) {
    const ids = [...new Set(postIds.map((id) => Number(id || 0)).filter(Boolean))];
    const posts = {};

    for (let index = 0; index < ids.length; index += CONFIG.chunkSize) {
      const chunk = ids.slice(index, index + CONFIG.chunkSize);
      const url = window.location.origin + "/api.php?p=" + encodeURIComponent(chunk.join(",")) + "&cookie=1";
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          accept: "application/json"
        }
      });
      if (!response.ok) {
        throw new Error("api.php " + response.status);
      }
      const data = await response.json();
      chunk.forEach((postId) => {
        const post = data && data["p" + postId];
        if (post && typeof post === "object") {
          posts[String(postId)] = post;
        }
      });
    }

    return posts;
  }

  function normalizeRow(row) {
    return {
      id: String(row.id || ""),
      title: String(row.title || ""),
      sourceUrl: String(row.source_url || ""),
      finalUrl: String(row.final_url || ""),
      canonicalUrl: String(row.canonical_url || ""),
      topicTitle: String(row.topic_title || "Discussione"),
      postId: Number(row.post_id || 0),
      postUrl: String(row.post_url || ""),
      status: String(row.status || "")
    };
  }

  function enrichFromPost(row, post) {
    const info = post.info || {};
    return {
      ...row,
      topicTitle: info.topic_title || row.topicTitle,
      topicId: info.topic_id || row.topicId
    };
  }

  function contentHasPublication(content, row) {
    const text = String(content || "");
    if (text.includes('data-fd-embed-id="' + row.id + '"') ||
        text.includes("data-fd-embed-id='" + row.id + "'") ||
        text.includes("fd-embed-link-id-" + row.id)) {
      return true;
    }

    if (!text.includes("fd-embed-link")) {
      return false;
    }

    const urls = [row.sourceUrl, row.finalUrl, row.canonicalUrl].filter(Boolean);
    if (typeof DOMParser === "function") {
      try {
        const doc = new DOMParser().parseFromString(text, "text/html");
        return Array.from(doc.querySelectorAll(".fd-embed-link")).some((card) => {
          const html = card.innerHTML || "";
          return urls.some((url) => contentContainsUrl(html, url));
        });
      } catch (_error) {
        // Fall back to text search.
      }
    }

    return urls.some((url) => contentContainsUrl(text, url));
  }

  function contentContainsUrl(content, url) {
    const text = String(content || "");
    return text.includes(url) ||
      text.includes(escapeHtml(url)) ||
      text.includes(encodeURI(url));
  }

  function isSameOriginPost(postUrl) {
    try {
      return new URL(postUrl, window.location.origin).origin === window.location.origin;
    } catch (_error) {
      return false;
    }
  }

  function forumUser() {
    const user = window.Commons && window.Commons.user ? window.Commons.user : {};
    return {
      id: Number(user.id || 0),
      nickname: user.nickname || user.name || null,
      isGuest: Boolean(user.isGuest || !user.id)
    };
  }

  function render() {
    renderStats();
    renderRows();
  }

  function renderStats() {
    const root = document.getElementById("fd-presence-audit");
    if (!root) {
      return;
    }
    const counts = countResults();
    root.querySelector("[data-fdpa-stats]").innerHTML = [
      ["DB", state.rows.length],
      ["Presenti", counts.present],
      ["Rimossi", counts.missing],
      ["Non verificabili", counts.unavailable],
      ["Aggiornati", countUpdated()]
    ].map(([label, value]) => `<div class="fdpa-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  }

  function renderRows() {
    const root = document.getElementById("fd-presence-audit");
    if (!root) {
      return;
    }
    const rows = state.results.length ? state.results : state.rows;
    const body = root.querySelector("[data-fdpa-rows]");
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="4">Nessun record caricato.</td></tr>';
      return;
    }

    body.innerHTML = rows.slice(0, 200).map((row) => `
      <tr>
        <td><span class="fdpa-badge ${escapeAttr(row.presence || "unavailable")}">${escapeHtml(row.presence || "loaded")}</span></td>
        <td><strong>${escapeHtml(row.topicTitle || "Discussione")}</strong><br><small>${escapeHtml(row.title || "")}</small></td>
        <td><a href="${escapeAttr(row.postUrl)}" target="_blank" rel="noopener noreferrer">#${escapeHtml(row.postId || "")}</a></td>
        <td><small>${escapeHtml(row.finalUrl || row.sourceUrl || "")}</small></td>
      </tr>
    `).join("");
  }

  function countResults() {
    return state.results.reduce((acc, row) => {
      const key = row.presence || "unavailable";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, { present: 0, missing: 0, unavailable: 0, unverified: 0 });
  }

  function countUpdated() {
    return state.lastReport && Array.isArray(state.lastReport.results)
      ? state.lastReport.results.filter((item) => item && item.updated).length
      : 0;
  }

  function exportJson() {
    const data = {
      app: CONFIG.appTitle,
      ranAt: new Date().toISOString(),
      url: window.location.href,
      rows: state.rows,
      results: state.results,
      report: state.lastReport
    };
    console.log(JSON.stringify(data, null, 2));
    log("JSON esportato in console.");
  }

  function tokenValue() {
    return document.querySelector("#fd-presence-audit [data-fdpa-token]")?.value.trim() || "";
  }

  function setBusy(value) {
    state.busy = value;
    document.querySelectorAll("#fd-presence-audit button").forEach((button) => {
      if (!button.matches("[data-fdpa-close]")) {
        button.disabled = value;
      }
    });
  }

  function log(message) {
    const line = "[" + new Date().toLocaleTimeString("it-IT") + "] " + message;
    const logEl = document.querySelector("#fd-presence-audit [data-fdpa-log]");
    if (logEl) {
      logEl.textContent = (line + "\n" + logEl.textContent).slice(0, 6000);
    }
    console.log("[FDEmbedPresenceAudit]", message);
  }

  function errorMessage(error) {
    return error && error.message ? error.message : String(error);
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
    return escapeHtml(value);
  }

  const root = createUi();
  window.FDEmbedPresenceAudit = {
    config: CONFIG,
    state,
    root,
    loadRows,
    verifyRows,
    applyMissing,
    exportJson,
    destroy
  };

  log("Pronto. Inserisci token admin, poi Carica DB.");
})();
