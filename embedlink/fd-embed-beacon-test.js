/*
 * FD EMBED LINK - verifica automatica publish/beacon 1
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

    return {
      ok: report.removedPendingIds.length > 0 || publishEvents.some((event) => event.ok),
      pendingBefore: report.pendingBeforeIds.length,
      pendingAfter: report.pendingAfterIds.length,
      confirmedIds: report.removedPendingIds,
      fetchPublishCalls: fetchPublish.length,
      beaconPublishCalls: beaconPublish.length,
      forceBeacon: report.options.forceBeacon,
      message: report.removedPendingIds.length
        ? "Publish confermato: pending rimossi dalla sessione."
        : "Nessun pending rimosso. Controlla che il post pubblicato contenga data-fd-embed-id e che Commons.location.posts sia disponibile."
    };
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
      networkEvents: probe.events,
      thrownError
    };

    report.summary = buildSummary(report);
    window.FDEmbedBeaconTest.lastReport = report;

    console.group(TEST_NAME);
    console.log("Summary", report.summary);
    console.log("Report", report);
    console.groupEnd();

    return report;
  }

  window.FDEmbedBeaconTest = {
    run,
    lastReport: null
  };

  console.info(TEST_NAME + " pronto. Esegui: await FDEmbedBeaconTest.run()");
})();
