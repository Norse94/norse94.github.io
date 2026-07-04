/*
 * FD EMBED LINK - verifica automatica publish/beacon
 *
 * Uso:
 * 1. Pubblica un post che contiene un Embed Link appena generato.
 * 2. Nella pagina della discussione pubblicata, incolla questo file in console.
 * 3. Esegui:
 *      await FDEmbedBeaconTest.run()
 *
 * Per forzare il fallback navigator.sendBeacon invece della fetch keepalive:
 *      await FDEmbedBeaconTest.run({ forceBeacon: true })
 */
(function () {
  "use strict";

  const TEST_NAME = "FD EMBED LINK beacon test";
  const DEFAULT_TIMEOUT_MS = 5000;
  const DEFAULT_POLL_MS = 250;

  function nowIso() {
    return new Date().toISOString();
  }

  function cloneJson(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_error) {
      return value;
    }
  }

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value || "");
    } catch (_error) {
      return fallback;
    }
  }

  function readStorageJson(key) {
    return safeJsonParse(window.sessionStorage.getItem(key), {});
  }

  function getApi() {
    const api = window.FDEmbedLink || window.EmbedLink;
    if (!api) {
      throw new Error("FDEmbedLink non trovato nella pagina.");
    }
    if (!api.config || !api.config.edgeEndpoint) {
      throw new Error("Configurazione FDEmbedLink non disponibile.");
    }
    if (typeof api.confirmPublishedEmbeds !== "function") {
      throw new Error("confirmPublishedEmbeds non disponibile.");
    }
    return api;
  }

  function objectKeys(value) {
    return Object.keys(value || {});
  }

  function diffRemoved(before, after) {
    const afterIds = new Set(objectKeys(after));
    return objectKeys(before).filter((id) => !afterIds.has(id));
  }

  function diffAdded(before, after) {
    const beforeIds = new Set(objectKeys(before));
    return objectKeys(after).filter((id) => !beforeIds.has(id));
  }

  function findEmbedIdsInText(text) {
    const ids = [];
    const seen = new Set();
    const regex = /data-fd-embed-id\s*=\s*["']([^"']+)["']/g;
    const classRegex = /fd-embed-link-id-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/gi;
    let match;
    while ((match = regex.exec(String(text || "")))) {
      if (!seen.has(match[1])) {
        seen.add(match[1]);
        ids.push(match[1]);
      }
    }
    while ((match = classRegex.exec(String(text || "")))) {
      if (!seen.has(match[1])) {
        seen.add(match[1]);
        ids.push(match[1]);
      }
    }
    return ids;
  }

  function inspectForumPosts() {
    const commons = window.Commons || {};
    const posts = commons.location && Array.isArray(commons.location.posts)
      ? commons.location.posts
      : [];

    return posts.map((post) => {
      const html = String(post && post.content || "") + " " + (post && post.nativeElement ? post.nativeElement.innerHTML : "");
      return {
        id: post && post.id || null,
        authorId: post && post.author && post.author.id || null,
        embedIds: findEmbedIdsInText(html),
        hasNativeElement: Boolean(post && post.nativeElement)
      };
    });
  }

  function findDomEmbedIds() {
    const ids = [];
    const seen = new Set();
    Array.prototype.slice.call(document.querySelectorAll("[data-fd-embed-id]")).forEach((item) => {
      const id = item.getAttribute("data-fd-embed-id");
      if (id && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    });
    findEmbedIdsInText(document.body ? document.body.innerHTML : "").forEach((id) => {
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    });
    return ids;
  }

  function intersect(left, right) {
    const rightSet = new Set(right || []);
    return (left || []).filter((item) => rightSet.has(item));
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

  function findPendingIdsByUrlInText(pending, text) {
    const haystack = String(text || "");
    if (!haystack.includes("fd-embed-link")) {
      return [];
    }

    return objectKeys(pending).filter((id) => {
      return getPendingUrls(pending[id]).some((url) => (
        haystack.includes(url) ||
        haystack.includes(escapeHtml(url)) ||
        haystack.includes(encodeURI(url))
      ));
    });
  }

  async function readRequestBody(input) {
    if (!input) {
      return "";
    }

    if (typeof input === "string") {
      return input;
    }

    if (input instanceof Blob) {
      return await input.text();
    }

    if (input instanceof FormData) {
      return "[FormData]";
    }

    if (input instanceof URLSearchParams) {
      return input.toString();
    }

    if (typeof Request !== "undefined" && input instanceof Request) {
      try {
        return await input.clone().text();
      } catch (_error) {
        return "";
      }
    }

    return String(input);
  }

  function parseActionFromBody(bodyText) {
    const parsed = safeJsonParse(bodyText, null);
    return parsed && typeof parsed === "object" ? parsed.action || "" : "";
  }

  function installNetworkProbe(edgeEndpoint, options) {
    const events = [];
    const originalFetch = window.fetch;
    const originalSendBeacon = navigator.sendBeacon ? navigator.sendBeacon.bind(navigator) : null;
    const forceBeacon = Boolean(options && options.forceBeacon);

    window.fetch = async function fdEmbedBeaconTestFetch(input, init) {
      const url = typeof input === "string" ? input : input && input.url;
      const isEdgeCall = String(url || "").indexOf(edgeEndpoint) === 0;

      if (!isEdgeCall) {
        return originalFetch.apply(this, arguments);
      }

      const bodyText = await readRequestBody(init && init.body ? init.body : input);
      const action = parseActionFromBody(bodyText);
      const event = {
        transport: "fetch",
        url: String(url || ""),
        action,
        keepalive: Boolean(init && init.keepalive),
        startedAt: nowIso(),
        forcedFailure: false,
        ok: false,
        status: null,
        error: ""
      };
      events.push(event);

      if (forceBeacon && action === "publish") {
        event.forcedFailure = true;
        event.error = "FETCH_FORCED_FAILURE_FOR_BEACON_TEST";
        throw new Error(event.error);
      }

      try {
        const response = await originalFetch.apply(this, arguments);
        event.ok = Boolean(response && response.ok);
        event.status = response ? response.status : null;
        event.completedAt = nowIso();
        return response;
      } catch (error) {
        event.error = error && error.message ? error.message : String(error);
        event.completedAt = nowIso();
        throw error;
      }
    };

    if (originalSendBeacon) {
      navigator.sendBeacon = function fdEmbedBeaconTestSendBeacon(url, data) {
        const isEdgeCall = String(url || "").indexOf(edgeEndpoint) === 0;
        if (!isEdgeCall) {
          return originalSendBeacon(url, data);
        }

        const event = {
          transport: "sendBeacon",
          url: String(url || ""),
          action: "",
          startedAt: nowIso(),
          ok: false,
          status: "queued",
          error: ""
        };
        events.push(event);

        try {
          if (data instanceof Blob) {
            data.text().then((text) => {
              event.action = parseActionFromBody(text);
              event.body = text;
            }).catch(() => {});
          } else if (typeof data === "string") {
            event.action = parseActionFromBody(data);
            event.body = data;
          }

          const sent = originalSendBeacon(url, data);
          event.ok = Boolean(sent);
          event.completedAt = nowIso();
          return sent;
        } catch (error) {
          event.error = error && error.message ? error.message : String(error);
          event.completedAt = nowIso();
          throw error;
        }
      };
    }

    return {
      events,
      restore() {
        window.fetch = originalFetch;
        if (originalSendBeacon) {
          navigator.sendBeacon = originalSendBeacon;
        }
      }
    };
  }

  async function waitForPendingChange(storageKey, before, timeoutMs, pollMs) {
    const started = Date.now();
    let after = readStorageJson(storageKey);
    while (Date.now() - started < timeoutMs) {
      after = readStorageJson(storageKey);
      if (diffRemoved(before, after).length || diffAdded(before, after).length) {
        return after;
      }
      await new Promise((resolve) => window.setTimeout(resolve, pollMs));
    }
    return after;
  }

  function buildSummary(report) {
    const publishEvents = report.networkEvents.filter((event) => event.action === "publish" || event.transport === "sendBeacon");
    const fetchPublish = publishEvents.filter((event) => event.transport === "fetch");
    const beaconPublish = publishEvents.filter((event) => event.transport === "sendBeacon");
    const submittedIds = report.submitInfo && Array.isArray(report.submitInfo.ids) ? report.submitInfo.ids : [];
    const submittedStillPending = intersect(submittedIds, report.pendingBeforeIds);
    const submittedInDom = intersect(submittedIds, report.domEmbedIds);
    const pendingInDom = intersect(report.pendingBeforeIds, report.domEmbedIds);
    const pendingInCommonsPosts = intersect(report.pendingBeforeIds, report.commonsPostEmbedIds);
    const domNotPending = report.domEmbedIds.filter((id) => report.pendingBeforeIds.indexOf(id) === -1);
    const pendingMatchedByUrl = report.pendingMatchedByUrl || [];
    const maybeAlreadyConfirmed = submittedIds.length > 0 && submittedStillPending.length === 0 && submittedInDom.length > 0;
    let message = "";

    if (report.removedPendingIds.length) {
      message = "Publish confermato: pending rimossi dalla sessione.";
    } else if (publishEvents.some((event) => event.ok)) {
      message = "Richiesta publish inviata, ma i pending locali non sono cambiati.";
    } else if (maybeAlreadyConfirmed) {
      message = "Probabile conferma gia eseguita al caricamento pagina: l'ID inviato e nel DOM ma non e piu nei pending.";
    } else if (domNotPending.length) {
      message = "Nel DOM ci sono marker embed, ma nessuno corrisponde ai pending in sessione. Probabile codice di esempio/vecchio UUID senza publishToken.";
    } else if (pendingMatchedByUrl.length) {
      message = "Il marker non corrisponde, ma almeno un pending combacia via URL. Carica la build 2026-07-05.7 o successiva per confermare con fallback URL.";
    } else if (!pendingInDom.length && !pendingInCommonsPosts.length) {
      message = "I pending rimasti non sono presenti nel post corrente: sembrano vecchi/stale o appartengono ad altri post.";
    } else {
      message = "Nessun pending rimosso. Controlla che il post pubblicato contenga data-fd-embed-id e che Commons.location.posts sia disponibile.";
    }

    return {
      ok: report.removedPendingIds.length > 0 || publishEvents.some((event) => event.ok) || maybeAlreadyConfirmed,
      pendingBefore: report.pendingBeforeIds.length,
      pendingAfter: report.pendingAfterIds.length,
      confirmedIds: report.removedPendingIds,
      fetchPublishCalls: fetchPublish.length,
      beaconPublishCalls: beaconPublish.length,
      forceBeacon: report.options.forceBeacon,
      submittedIds,
      submittedStillPending,
      submittedInDom,
      pendingInDom,
      pendingInCommonsPosts,
      domNotPending,
      pendingMatchedByUrl,
      maybeAlreadyConfirmed,
      message
    };
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function shortId(id) {
    const value = String(id || "");
    return value.length > 13 ? value.slice(0, 8) + "..." + value.slice(-4) : value;
  }

  function formatIdList(ids) {
    if (!ids || !ids.length) {
      return "nessuno";
    }
    return ids.map(shortId).join(", ");
  }

  function getPanelSnapshot() {
    let config = {};
    let diagnostics = null;
    try {
      const api = getApi();
      config = api.config || {};
      diagnostics = typeof api.diagnostics === "function" ? api.diagnostics() : null;
    } catch (_error) {
      config = {};
    }

    const pendingKey = config.pendingStorageKey || "fd_embed_link_pending_v1";
    const submitKey = config.submitStorageKey || "fd_embed_link_submit_v1";
    const pending = readStorageJson(pendingKey);
    const submitInfo = readStorageJson(submitKey);
    const domEmbedIds = findDomEmbedIds();
    const commonsPosts = inspectForumPosts();

    return {
      configured: Boolean(config.edgeEndpoint),
      version: diagnostics && diagnostics.version || "",
      pendingIds: objectKeys(pending),
      submitIds: submitInfo && Array.isArray(submitInfo.ids) ? submitInfo.ids : [],
      domEmbedIds,
      commonsPostEmbedIds: commonsPosts.reduce((ids, post) => ids.concat(post.embedIds), []),
      commonsPostCount: commonsPosts.length
    };
  }

  function ensurePanelStyles() {
    if (document.getElementById("fd-embed-beacon-test-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "fd-embed-beacon-test-style";
    style.textContent = [
      "#fd-embed-beacon-test-panel{position:fixed;right:14px;bottom:14px;z-index:2147483647;width:min(420px,calc(100vw - 28px));max-height:calc(100vh - 28px);display:flex;flex-direction:column;border:1px solid #bfc8c4;border-radius:8px;background:#fff;color:#151819;box-shadow:0 18px 48px rgba(21,24,25,.28);font:13px/1.4 Arial,sans-serif;text-align:left;overflow:hidden}",
      "#fd-embed-beacon-test-panel *{box-sizing:border-box}",
      ".fd-bt-header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-bottom:1px solid #d7ded8;background:#f6f8f7}",
      ".fd-bt-title{font-weight:700}",
      ".fd-bt-close{border:0;background:transparent;color:#151819;font:inherit;font-size:18px;line-height:1;cursor:pointer}",
      ".fd-bt-body{min-height:0;overflow:auto;padding:12px;display:grid;gap:10px}",
      ".fd-bt-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}",
      ".fd-bt-stat{border:1px solid #d7ded8;border-radius:6px;padding:8px;background:#fbfcfb}",
      ".fd-bt-stat strong{display:block;font-size:18px;line-height:1.1}",
      ".fd-bt-muted{color:#5d666b;font-size:12px}",
      ".fd-bt-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px}",
      ".fd-bt-btn{min-height:30px;padding:5px 9px;border:1px solid #bfc8c4;border-radius:5px;background:#fff;color:#151819;font:inherit;font-weight:700;cursor:pointer}",
      ".fd-bt-btn:disabled{opacity:.55;cursor:wait}",
      ".fd-bt-btn-blue{border-color:#007bff;color:#007bff}",
      ".fd-bt-btn-green{border-color:#28a745;color:#28a745}",
      ".fd-bt-btn-yellow{border-color:#b8860b;color:#8a6508}",
      ".fd-bt-result{border:1px solid #d7ded8;border-radius:6px;padding:8px;background:#fbfcfb;white-space:pre-wrap;word-break:break-word}",
      ".fd-bt-result.is-ok{border-color:#28a745;background:#f3fbf5}",
      ".fd-bt-result.is-warn{border-color:#b8860b;background:#fffaf0}",
      ".fd-bt-details{width:100%;min-height:130px;resize:vertical;border:1px solid #d7ded8;border-radius:6px;padding:8px;background:#fbfcfb;color:#151819;font:12px/1.35 Consolas,monospace}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function renderPanel(panel, report, stateText) {
    const snapshot = getPanelSnapshot();
    const summary = report && report.summary ? report.summary : null;
    const status = stateText || (summary ? summary.message : "Pronto.");
    const isOk = summary && summary.ok;
    const details = report ? JSON.stringify(report, null, 2) : "";

    panel.querySelector("[data-fd-bt-version]").textContent = snapshot.version || "-";
    panel.querySelector("[data-fd-bt-pending]").textContent = String(snapshot.pendingIds.length);
    panel.querySelector("[data-fd-bt-submit]").textContent = String(snapshot.submitIds.length);
    panel.querySelector("[data-fd-bt-dom]").textContent = String(snapshot.domEmbedIds.length);
    panel.querySelector("[data-fd-bt-posts]").textContent = String(snapshot.commonsPostCount);
    panel.querySelector("[data-fd-bt-pending-ids]").textContent = formatIdList(snapshot.pendingIds);
    panel.querySelector("[data-fd-bt-submit-ids]").textContent = formatIdList(snapshot.submitIds);
    panel.querySelector("[data-fd-bt-dom-ids]").textContent = formatIdList(snapshot.domEmbedIds);

    const result = panel.querySelector("[data-fd-bt-result]");
    result.className = "fd-bt-result" + (summary ? (isOk ? " is-ok" : " is-warn") : "");
    result.textContent = status;

    panel.querySelector("[data-fd-bt-details]").value = details;
  }

  function setPanelBusy(panel, busy) {
    Array.prototype.slice.call(panel.querySelectorAll("button[data-fd-bt-run]")).forEach((button) => {
      button.disabled = busy;
    });
  }

  async function runFromPanel(panel, forceBeacon) {
    setPanelBusy(panel, true);
    renderPanel(panel, null, forceBeacon ? "Test beacon forzato in corso..." : "Test publish in corso...");
    try {
      const report = await run({ forceBeacon });
      renderPanel(panel, report);
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      renderPanel(panel, null, "Errore test: " + message);
    } finally {
      setPanelBusy(panel, false);
    }
  }

  function createPanel() {
    ensurePanelStyles();

    const existing = document.getElementById("fd-embed-beacon-test-panel");
    if (existing) {
      renderPanel(existing);
      return existing;
    }

    const panel = document.createElement("section");
    panel.id = "fd-embed-beacon-test-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "FD EMBED LINK beacon test");
    panel.innerHTML = [
      "<div class=\"fd-bt-header\">",
      "  <div>",
      "    <div class=\"fd-bt-title\">FD Embed Link Test</div>",
      "    <div class=\"fd-bt-muted\">Versione script: <span data-fd-bt-version>-</span></div>",
      "  </div>",
      "  <button class=\"fd-bt-close\" type=\"button\" data-fd-bt-close aria-label=\"Chiudi\">x</button>",
      "</div>",
      "<div class=\"fd-bt-body\">",
      "  <div class=\"fd-bt-grid\">",
      "    <div class=\"fd-bt-stat\"><strong data-fd-bt-pending>0</strong><span class=\"fd-bt-muted\">pending sessione</span></div>",
      "    <div class=\"fd-bt-stat\"><strong data-fd-bt-submit>0</strong><span class=\"fd-bt-muted\">ID ultimo submit</span></div>",
      "    <div class=\"fd-bt-stat\"><strong data-fd-bt-dom>0</strong><span class=\"fd-bt-muted\">embed nel DOM</span></div>",
      "    <div class=\"fd-bt-stat\"><strong data-fd-bt-posts>0</strong><span class=\"fd-bt-muted\">post Commons</span></div>",
      "  </div>",
      "  <div class=\"fd-bt-muted\"><b>Pending:</b> <span data-fd-bt-pending-ids>nessuno</span></div>",
      "  <div class=\"fd-bt-muted\"><b>Submit:</b> <span data-fd-bt-submit-ids>nessuno</span></div>",
      "  <div class=\"fd-bt-muted\"><b>DOM:</b> <span data-fd-bt-dom-ids>nessuno</span></div>",
      "  <div class=\"fd-bt-actions\">",
      "    <button class=\"fd-bt-btn\" type=\"button\" data-fd-bt-refresh>Aggiorna</button>",
      "    <button class=\"fd-bt-btn fd-bt-btn-green\" type=\"button\" data-fd-bt-run=\"normal\">Test normale</button>",
      "    <button class=\"fd-bt-btn fd-bt-btn-yellow\" type=\"button\" data-fd-bt-run=\"beacon\">Forza beacon</button>",
      "    <button class=\"fd-bt-btn fd-bt-btn-blue\" type=\"button\" data-fd-bt-copy>Copia report</button>",
      "  </div>",
      "  <div class=\"fd-bt-result\" data-fd-bt-result>Pronto.</div>",
      "  <textarea class=\"fd-bt-details\" data-fd-bt-details readonly placeholder=\"Il report apparira qui dopo il test.\"></textarea>",
      "</div>"
    ].join("");

    panel.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest("[data-fd-bt-close]")) {
        panel.remove();
        return;
      }

      if (target.closest("[data-fd-bt-refresh]")) {
        renderPanel(panel);
        return;
      }

      const runButton = target.closest("[data-fd-bt-run]");
      if (runButton) {
        runFromPanel(panel, runButton.getAttribute("data-fd-bt-run") === "beacon");
        return;
      }

      if (target.closest("[data-fd-bt-copy]")) {
        const text = window.FDEmbedBeaconTest.lastReport
          ? JSON.stringify(window.FDEmbedBeaconTest.lastReport, null, 2)
          : panel.querySelector("[data-fd-bt-details]").value;
        if (navigator.clipboard && text) {
          navigator.clipboard.writeText(text).then(() => {
            renderPanel(panel, window.FDEmbedBeaconTest.lastReport, "Report copiato negli appunti.");
          }).catch(() => {
            renderPanel(panel, window.FDEmbedBeaconTest.lastReport, "Copia automatica non riuscita.");
          });
        }
      }
    });

    document.body.appendChild(panel);
    renderPanel(panel);
    return panel;
  }

  async function run(rawOptions) {
    const options = Object.assign({
      forceBeacon: false,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      pollMs: DEFAULT_POLL_MS,
      restoreNetwork: true
    }, rawOptions || {});

    const api = getApi();
    const config = api.config;
    const pendingKey = config.pendingStorageKey || "fd_embed_link_pending_v1";
    const submitKey = config.submitStorageKey || "fd_embed_link_submit_v1";
    const pendingBefore = readStorageJson(pendingKey);
    const submitInfo = readStorageJson(submitKey);
    const domEmbedIdsBefore = findDomEmbedIds();
    const commonsPostsBefore = inspectForumPosts();
    const pageHtmlBefore = String(document.body ? document.body.innerHTML : "");
    const pendingMatchedByUrlBefore = findPendingIdsByUrlInText(pendingBefore, pageHtmlBefore);
    const diagnosticsBefore = typeof api.diagnostics === "function" ? api.diagnostics() : null;
    const probe = installNetworkProbe(config.edgeEndpoint, options);

    let thrownError = "";
    let pendingAfter = pendingBefore;

    try {
      await api.confirmPublishedEmbeds();
      pendingAfter = await waitForPendingChange(pendingKey, pendingBefore, options.timeoutMs, options.pollMs);
    } catch (error) {
      thrownError = error && error.message ? error.message : String(error);
      pendingAfter = readStorageJson(pendingKey);
    } finally {
      if (options.restoreNetwork) {
        probe.restore();
      }
    }

    const report = {
      name: TEST_NAME,
      ranAt: nowIso(),
      options: cloneJson(options),
      diagnosticsBefore,
      pendingStorageKey: pendingKey,
      submitStorageKey: submitKey,
      pendingBefore,
      pendingAfter,
      pendingBeforeIds: objectKeys(pendingBefore),
      pendingAfterIds: objectKeys(pendingAfter),
      removedPendingIds: diffRemoved(pendingBefore, pendingAfter),
      addedPendingIds: diffAdded(pendingBefore, pendingAfter),
      submitInfo,
      domEmbedIds: domEmbedIdsBefore,
      commonsPosts: commonsPostsBefore,
      commonsPostEmbedIds: commonsPostsBefore.reduce((ids, post) => ids.concat(post.embedIds), []),
      pendingMatchedByUrl: pendingMatchedByUrlBefore,
      networkEvents: probe.events,
      thrownError
    };

    report.summary = buildSummary(report);
    window.FDEmbedBeaconTest.lastReport = report;

    console.group(TEST_NAME);
    console.log("Summary", report.summary);
    console.log("Report", report);
    console.groupEnd();

    const panel = document.getElementById("fd-embed-beacon-test-panel");
    if (panel) {
      renderPanel(panel, report);
    }

    return report;
  }

  window.FDEmbedBeaconTest = {
    run,
    openPanel: createPanel,
    closePanel() {
      const panel = document.getElementById("fd-embed-beacon-test-panel");
      if (panel) {
        panel.remove();
      }
    },
    lastReport: null
  };

  if (document.body) {
    createPanel();
  } else {
    document.addEventListener("DOMContentLoaded", createPanel, { once: true });
  }

  console.info(TEST_NAME + " pronto. Usa la finestrella a schermo oppure esegui: await FDEmbedBeaconTest.run()");
})();
