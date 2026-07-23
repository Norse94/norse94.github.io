(() => {
  'use strict';

  const CONFIG = Object.freeze({
    pageSize: 15,
    concurrency: 4,
    maxDomains: 500,
    maxPagesPerScan: 2000,
    endAfterConsecutiveDuplicatePages: 2,
    requestTimeoutMs: 20000,
    maxRequestAttempts: 4,
    excerptLength: 600,
    databaseName: 'forumfree-domain-scanner',
    databaseVersion: 1,
    storeName: 'scans'
  });

  const ROOT = typeof window !== 'undefined' ? window : globalThis;

  function pageToOffset(value) {
    const text = String(value).trim();
    if (!/^[1-9]\d*$/.test(text)) {
      throw new Error('La pagina deve essere un numero intero maggiore o uguale a 1.');
    }
    const page = Number(text);
    const offset = (page - 1) * CONFIG.pageSize;
    if (!Number.isSafeInteger(page) || !Number.isSafeInteger(offset)) {
      throw new Error('Il numero di pagina è troppo grande.');
    }
    return offset;
  }

  function offsetToPage(offset) {
    return Math.floor(Number(offset) / CONFIG.pageSize) + 1;
  }

  function normalizeDomainPattern(rawValue) {
    let value = String(rawValue).trim().toLowerCase();
    if (!value) return null;

    const wildcard = value.startsWith('*.');
    if (wildcard) value = value.slice(2);
    value = value.replace(/\.$/, '');

    if (!value || value.includes('*') || /[\s/:?#]/.test(value)) return null;

    let hostname;
    try {
      hostname = new URL(`http://${value}`).hostname.toLowerCase().replace(/\.$/, '');
    } catch (_error) {
      return null;
    }

    if (!hostname.includes('.') || hostname.length > 253 || !/^[a-z0-9.-]+$/.test(hostname)) {
      return null;
    }

    const labels = hostname.split('.');
    if (labels.some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) {
      return null;
    }

    return wildcard ? `*.${hostname}` : hostname;
  }

  function parseDomainsText(text) {
    const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/);
    const domains = new Set();
    const invalid = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const normalized = normalizeDomainPattern(trimmed);
      if (!normalized) invalid.push({ line: index + 1, value: trimmed });
      else domains.add(normalized);
    });

    return {
      domains: Array.from(domains).sort(),
      invalid,
      nonEmptyLines: lines.filter((line) => line.trim()).length
    };
  }

  function hostnameMatchesPattern(hostnameValue, patternValue) {
    const hostname = String(hostnameValue).toLowerCase().replace(/\.$/, '');
    const pattern = String(patternValue).toLowerCase();
    if (pattern.startsWith('*.')) {
      const root = pattern.slice(2);
      return hostname !== root && hostname.endsWith(`.${root}`);
    }
    return hostname === pattern;
  }

  function buildMatcher(patterns) {
    return {
      exact: new Set(patterns.filter((pattern) => !pattern.startsWith('*.'))),
      wildcards: patterns.filter((pattern) => pattern.startsWith('*.'))
    };
  }

  function matchHostname(hostname, matcher) {
    const matches = [];
    if (matcher.exact.has(hostname)) matches.push(hostname);
    matcher.wildcards.forEach((pattern) => {
      if (hostnameMatchesPattern(hostname, pattern)) matches.push(pattern);
    });
    return matches;
  }

  function makeBatchOffsets(nextOffset, count = CONFIG.concurrency) {
    return Array.from({ length: count }, (_value, index) => nextOffset + index * CONFIG.pageSize);
  }

  function collectUnseenMessages(messages, seenIds) {
    const unseen = [];
    messages.forEach((message, index) => {
      const id = message && message.id != null ? String(message.id) : '';
      if (!id || seenIds.has(id)) return;
      seenIds.add(id);
      unseen.push({ message, index });
    });
    return unseen;
  }

  function advanceDuplicateCount(previousCount, numberOfNewMessages) {
    return numberOfNewMessages === 0 ? previousCount + 1 : 0;
  }

  function resultTimestamp(result) {
    const timestamp = Date.parse(result && result.date ? result.date : '');
    return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
  }

  function localDateStartTimestamp(dateValue) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue || ''));
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date.getTime();
  }

  function filterResultsFromDate(results, dateValue) {
    const minimumTimestamp = localDateStartTimestamp(dateValue);
    if (minimumTimestamp == null) return results.slice();
    return results.filter((result) => resultTimestamp(result) >= minimumTimestamp);
  }

  if (ROOT.__FFDS_TEST_MODE__) {
    ROOT.__FFDS_TEST_API__ = Object.freeze({
      pageToOffset,
      offsetToPage,
      normalizeDomainPattern,
      parseDomainsText,
      hostnameMatchesPattern,
      buildMatcher,
      matchHostname,
      makeBatchOffsets,
      collectUnseenMessages,
      advanceDuplicateCount,
      resultTimestamp,
      localDateStartTimestamp,
      filterResultsFromDate,
      sortResults,
      config: CONFIG
    });
    return;
  }

  if (typeof document === 'undefined' || typeof indexedDB === 'undefined') return;
  if (ROOT.__forumFreeDomainScannerLoaded) return;
  ROOT.__forumFreeDomainScannerLoaded = true;

  const state = {
    db: null,
    shadow: null,
    loadedDomains: null,
    loadedFileName: '',
    currentRecord: null,
    currentMatcher: null,
    seenIds: new Set(),
    resultIndex: 0,
    isRunning: false,
    pauseRequested: false,
    cancelRequested: false,
    controllers: new Set()
  };

  class PermanentRequestError extends Error {}

  function formatInteger(value) {
    return new Intl.NumberFormat('it-IT').format(Number(value) || 0);
  }

  function formatDate(value) {
    if (!value) return 'Data non disponibile';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('it-IT', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function parseRetryAfter(value) {
    if (!value) return 0;
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const date = Date.parse(value);
    return Number.isNaN(date) ? 0 : Math.max(0, date - Date.now());
  }

  function hashDomains(domains) {
    const bytes = new TextEncoder().encode(domains.join('\n'));
    return crypto.subtle.digest('SHA-256', bytes).then((buffer) =>
      Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
    );
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.databaseName, CONFIG.databaseVersion);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CONFIG.storeName)) {
          const store = db.createObjectStore(CONFIG.storeName, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Impossibile aprire IndexedDB.'));
      request.onblocked = () => reject(new Error('Il database è bloccato da un’altra scheda del forum.'));
    });
  }

  function getScan(id) {
    return new Promise((resolve, reject) => {
      const transaction = state.db.transaction(CONFIG.storeName, 'readonly');
      const request = transaction.objectStore(CONFIG.storeName).get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  function getAllScans() {
    return new Promise((resolve, reject) => {
      const transaction = state.db.transaction(CONFIG.storeName, 'readonly');
      const request = transaction.objectStore(CONFIG.storeName).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  function saveScan(record) {
    record.updatedAt = new Date().toISOString();
    return new Promise((resolve, reject) => {
      const transaction = state.db.transaction(CONFIG.storeName, 'readwrite');
      transaction.objectStore(CONFIG.storeName).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Errore durante il salvataggio.'));
      transaction.onabort = () => reject(transaction.error || new Error('Salvataggio interrotto.'));
    });
  }

  function deleteScan(id) {
    return new Promise((resolve, reject) => {
      const transaction = state.db.transaction(CONFIG.storeName, 'readwrite');
      transaction.objectStore(CONFIG.storeName).delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Errore durante la cancellazione.'));
    });
  }

  function createInterface() {
    const host = document.createElement('div');
    host.id = 'ff-domain-scanner-host';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { all: initial; color-scheme: light; }
        *, *::before, *::after { box-sizing: border-box; }
        button, input { font: inherit; }
        button { cursor: pointer; }
        button:disabled { cursor: not-allowed; opacity: .48; }
        .launcher {
          position: fixed; right: 22px; bottom: 22px; z-index: 2147483645;
          border: 0; border-radius: 999px; padding: 13px 19px;
          background: #173b6c; color: #fff; font: 700 14px/1.2 system-ui, sans-serif;
          box-shadow: 0 8px 25px rgba(16, 35, 62, .3);
        }
        .launcher:hover { background: #0f2d56; }
        .overlay {
          position: fixed; inset: 0; z-index: 2147483646; display: grid; place-items: center;
          padding: 18px; background: rgba(8, 20, 37, .72); font: 14px/1.45 system-ui, sans-serif;
          color: #182437;
        }
        .hidden { display: none !important; }
        .panel {
          width: min(1040px, 100%); max-height: min(900px, calc(100vh - 36px)); overflow: auto;
          border-radius: 16px; background: #f5f7fa; box-shadow: 0 25px 80px rgba(0, 0, 0, .36);
        }
        .header {
          position: sticky; top: 0; z-index: 4; display: flex; align-items: center; justify-content: space-between;
          gap: 16px; padding: 18px 22px; background: #173b6c; color: #fff;
        }
        .header h2 { margin: 0; font-size: 20px; }
        .close { border: 0; background: transparent; color: #fff; font-size: 26px; line-height: 1; }
        .content { padding: 20px; display: grid; gap: 18px; }
        .card { background: #fff; border: 1px solid #dbe2eb; border-radius: 12px; padding: 17px; }
        .card h3 { margin: 0 0 13px; color: #173b6c; font-size: 16px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px 16px; }
        .field { display: grid; gap: 6px; min-width: 0; }
        .field.full { grid-column: 1 / -1; }
        label { font-weight: 700; color: #2c3d54; }
        input[type='number'], input[type='file'], input[type='date'] {
          width: 100%; min-height: 42px; border: 1px solid #b9c5d4; border-radius: 8px;
          padding: 9px 11px; background: #fff; color: #182437;
        }
        input:focus { outline: 3px solid rgba(43, 109, 183, .2); border-color: #2b6db7; }
        .hint { color: #627087; font-size: 12px; }
        .domain-summary { min-height: 20px; color: #40516a; }
        .toolbar { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 15px; }
        .btn { border: 1px solid #afbccb; border-radius: 8px; padding: 9px 14px; background: #fff; color: #1d3452; font-weight: 700; }
        .btn:hover:not(:disabled) { background: #eef3f9; }
        .btn.primary { border-color: #2166a8; background: #2166a8; color: #fff; }
        .btn.primary:hover:not(:disabled) { background: #174f87; }
        .btn.danger { border-color: #b33838; color: #a52626; }
        .status { margin-top: 14px; padding: 10px 12px; border-radius: 8px; background: #edf2f8; color: #2c4668; }
        .status[data-kind='success'] { background: #e6f5ec; color: #176338; }
        .status[data-kind='error'] { background: #fdeaea; color: #8b2020; }
        .status[data-kind='warning'] { background: #fff4d9; color: #74520c; }
        progress { width: 100%; height: 14px; margin-top: 13px; accent-color: #2166a8; }
        .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 12px; }
        .metric { padding: 10px; border-radius: 8px; background: #f2f5f9; text-align: center; }
        .metric strong { display: block; color: #173b6c; font-size: 18px; }
        .saved-list { display: grid; gap: 9px; }
        .saved-item { display: flex; justify-content: space-between; gap: 12px; padding: 11px; border: 1px solid #dce3ec; border-radius: 9px; }
        .saved-info { min-width: 0; }
        .saved-title { font-weight: 800; color: #203b5f; overflow-wrap: anywhere; }
        .saved-meta { margin-top: 3px; color: #66758a; font-size: 12px; }
        .saved-actions { display: flex; flex-wrap: wrap; align-content: center; justify-content: flex-end; gap: 6px; }
        .saved-actions .btn { padding: 6px 9px; font-size: 12px; }
        .empty { color: #6a788c; font-style: italic; }
        .result-filter { display: flex; flex-wrap: wrap; gap: 9px; align-items: end; margin-bottom: 14px; }
        .result-filter .filter-field { display: grid; gap: 5px; min-width: 210px; }
        .result-filter input { min-height: 38px; }
        .filter-summary { color: #627087; font-size: 12px; align-self: center; }
        .result-top { display: flex; justify-content: space-between; gap: 14px; align-items: flex-start; }
        .counter { font-weight: 800; color: #173b6c; }
        .post-meta { margin-top: 6px; color: #5c6d83; }
        .excerpt { margin: 14px 0; padding: 12px; max-height: 220px; overflow: auto; white-space: pre-wrap; border-radius: 8px; background: #f2f5f8; color: #24364d; }
        .section-label { margin: 11px 0 6px; font-weight: 800; color: #344b68; }
        .chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .chip { padding: 4px 8px; border-radius: 999px; background: #e6eff9; color: #174f87; font: 700 12px/1.3 system-ui, sans-serif; }
        .url-list { margin: 0; padding-left: 20px; }
        .url-list li { margin: 5px 0; overflow-wrap: anywhere; }
        .url-list a { color: #165b9f; }
        .result-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px; }
        @media (max-width: 700px) {
          .overlay { padding: 0; }
          .panel { max-height: 100vh; height: 100vh; border-radius: 0; }
          .form-grid, .metrics { grid-template-columns: 1fr; }
          .field.full { grid-column: auto; }
          .saved-item { display: grid; }
          .saved-actions { justify-content: flex-start; }
        }
      </style>
      <button id="launcher" class="launcher" type="button">Analizza discussione</button>
      <div id="overlay" class="overlay hidden" role="dialog" aria-modal="true" aria-labelledby="dialogTitle">
        <section class="panel">
          <header class="header">
            <h2 id="dialogTitle">Scanner domini ForumFree</h2>
            <button id="close" class="close" type="button" aria-label="Chiudi">×</button>
          </header>
          <main class="content">
            <section class="card">
              <h3>Nuova scansione</h3>
              <div class="form-grid">
                <div class="field">
                  <label for="topicId">ID discussione</label>
                  <input id="topicId" type="number" min="1" step="1" inputmode="numeric">
                </div>
                <div class="field">
                  <label for="startPage">Pagina iniziale</label>
                  <input id="startPage" type="number" min="1" step="1" value="1" inputmode="numeric">
                  <div id="offsetPreview" class="hint">Offset API: 0</div>
                </div>
                <div class="field full">
                  <label for="domainFile">File domini (.txt, massimo 500 domini)</label>
                  <input id="domainFile" type="file" accept=".txt,text/plain">
                  <div id="domainSummary" class="domain-summary">Nessun file caricato.</div>
                </div>
              </div>
              <div class="toolbar">
                <button id="start" class="btn primary" type="button">Avvia</button>
                <button id="pause" class="btn" type="button" disabled>Pausa</button>
                <button id="resume" class="btn" type="button" disabled>Riprendi</button>
                <button id="cancel" class="btn danger" type="button" disabled>Cancella scansione</button>
              </div>
              <div id="status" class="status" data-kind="info" aria-live="polite">Inizializzazione…</div>
              <progress id="progress" max="100" value="0"></progress>
              <div class="metrics">
                <div class="metric"><strong id="pagesMetric">0</strong>Pagine</div>
                <div class="metric"><strong id="postsMetric">0</strong>Post</div>
                <div class="metric"><strong id="matchesMetric">0</strong>Positivi</div>
                <div class="metric"><strong id="currentPageMetric">—</strong>Ultima pagina</div>
              </div>
            </section>

            <section class="card">
              <h3>Scansioni salvate</h3>
              <div id="savedList" class="saved-list"><div class="empty">Caricamento…</div></div>
            </section>

            <section class="card">
              <h3>Risultati</h3>
              <div class="result-filter">
                <div class="filter-field">
                  <label for="resultFromDate">Mostra risultati dal (incluso)</label>
                  <input id="resultFromDate" type="date">
                </div>
                <button id="clearResultDate" class="btn" type="button">Azzera data</button>
                <span id="resultFilterSummary" class="filter-summary"></span>
              </div>
              <div id="resultEmpty" class="empty">Nessun risultato selezionato.</div>
              <div id="resultCard" class="hidden">
                <div class="result-top">
                  <div>
                    <div id="resultCounter" class="counter"></div>
                    <div id="resultMeta" class="post-meta"></div>
                  </div>
                </div>
                <div id="resultExcerpt" class="excerpt"></div>
                <div class="section-label">Domini corrispondenti</div>
                <div id="matchedDomains" class="chips"></div>
                <div class="section-label">URL rilevati</div>
                <ul id="matchedUrls" class="url-list"></ul>
                <div class="result-actions">
                  <button id="previousResult" class="btn" type="button">Indietro</button>
                  <button id="nextResult" class="btn" type="button">Avanti</button>
                  <button id="openPost" class="btn primary" type="button">Apri post</button>
                </div>
              </div>
            </section>
          </main>
        </section>
      </div>
    `;
    document.body.appendChild(host);
    state.shadow = shadow;
  }

  function element(id) {
    return state.shadow.getElementById(id);
  }

  function setStatus(message, kind = 'info') {
    const node = element('status');
    node.textContent = message;
    node.dataset.kind = kind;
  }

  function updateOffsetPreview() {
    try {
      const offset = pageToOffset(element('startPage').value);
      element('offsetPreview').textContent = `Offset API: ${formatInteger(offset)}`;
    } catch (error) {
      element('offsetPreview').textContent = error.message;
    }
  }

  function updateControls() {
    const hasCurrent = Boolean(state.currentRecord);
    const isPaused = hasCurrent && state.currentRecord.status === 'paused';
    element('start').disabled = state.isRunning || !state.db;
    element('pause').disabled = !state.isRunning;
    element('resume').disabled = state.isRunning || !isPaused || !state.db;
    element('cancel').disabled = state.isRunning ? false : !hasCurrent;
    element('topicId').disabled = state.isRunning;
    element('startPage').disabled = state.isRunning;
    element('domainFile').disabled = state.isRunning;
  }

  function renderProgress(record) {
    if (!record) {
      element('progress').value = 0;
      element('pagesMetric').textContent = '0';
      element('postsMetric').textContent = '0';
      element('matchesMetric').textContent = '0';
      element('currentPageMetric').textContent = '—';
      return;
    }

    let percentage = 0;
    if (record.status === 'complete') percentage = 100;
    else if (record.reportedPages) {
      const estimated = Math.max(1, record.reportedPages - record.startPage + 1);
      percentage = Math.min(99, (record.pagesProcessed / estimated) * 100);
    }
    element('progress').value = percentage;
    element('pagesMetric').textContent = formatInteger(record.pagesProcessed);
    element('postsMetric').textContent = formatInteger(record.postsChecked);
    element('matchesMetric').textContent = formatInteger(record.results.length);
    element('currentPageMetric').textContent = record.lastProcessedPage ? formatInteger(record.lastProcessedPage) : '—';
  }

  function prefillFromLocation() {
    const params = new URLSearchParams(location.search);
    const topicId = params.get('t');
    const offset = params.get('st');
    if (topicId && /^\d+$/.test(topicId)) element('topicId').value = topicId;
    if (offset && /^\d+$/.test(offset)) element('startPage').value = String(offsetToPage(Number(offset)));
    updateOffsetPreview();
  }

  function getTopicId() {
    const value = element('topicId').value.trim();
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
      throw new Error('Inserisci un ID discussione valido.');
    }
    return value;
  }

  async function handleFileSelection() {
    const file = element('domainFile').files[0];
    state.loadedDomains = null;
    state.loadedFileName = '';
    if (!file) {
      element('domainSummary').textContent = 'Nessun file caricato.';
      return;
    }

    try {
      const parsed = parseDomainsText(await file.text());
      if (parsed.invalid.length) {
        const details = parsed.invalid.slice(0, 5).map((item) => `riga ${item.line}: ${item.value}`).join('; ');
        throw new Error(`Domini non validi (${parsed.invalid.length}): ${details}${parsed.invalid.length > 5 ? '; …' : ''}`);
      }
      if (!parsed.domains.length) throw new Error('Il file non contiene domini.');
      if (parsed.domains.length > CONFIG.maxDomains) {
        throw new Error(`Il file contiene ${parsed.domains.length} domini unici; il massimo è ${CONFIG.maxDomains}.`);
      }
      state.loadedDomains = parsed.domains;
      state.loadedFileName = file.name;
      const removed = parsed.nonEmptyLines - parsed.domains.length;
      element('domainSummary').textContent = `${parsed.domains.length} domini validi${removed > 0 ? `, ${removed} duplicati rimossi` : ''}.`;
    } catch (error) {
      element('domainSummary').textContent = error.message;
      setStatus(error.message, 'error');
    }
  }

  function statusLabel(record) {
    if (record.status === 'complete') return 'Completata';
    if (record.status === 'running') return 'Interrotta';
    return 'In pausa';
  }

  async function refreshSavedScans() {
    const container = element('savedList');
    container.replaceChildren();
    if (!state.db) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Salvataggio locale non disponibile.';
      container.appendChild(empty);
      return;
    }

    const scans = (await getAllScans()).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    if (!scans.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Nessuna scansione salvata.';
      container.appendChild(empty);
      return;
    }

    scans.forEach((record) => {
      const row = document.createElement('div');
      row.className = 'saved-item';
      const info = document.createElement('div');
      info.className = 'saved-info';
      const title = document.createElement('div');
      title.className = 'saved-title';
      title.textContent = record.topicTitle || `Discussione ${record.topicId}`;
      const meta = document.createElement('div');
      meta.className = 'saved-meta';
      meta.textContent = `${statusLabel(record)} · da pagina ${formatInteger(record.startPage)} · ${formatInteger(record.pagesProcessed)} pagine · ${formatInteger(record.results.length)} positivi · ${formatDate(record.updatedAt)}`;
      info.append(title, meta);

      const actions = document.createElement('div');
      actions.className = 'saved-actions';
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'btn';
      open.textContent = 'Apri';
      open.addEventListener('click', () => openSavedScan(record.id));
      actions.appendChild(open);

      if (record.status !== 'complete') {
        const resume = document.createElement('button');
        resume.type = 'button';
        resume.className = 'btn primary';
        resume.textContent = 'Riprendi';
        resume.disabled = state.isRunning;
        resume.addEventListener('click', () => resumeSavedScan(record.id));
        actions.appendChild(resume);
      }

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn danger';
      remove.textContent = 'Elimina';
      remove.disabled = state.isRunning && state.currentRecord && state.currentRecord.id === record.id;
      remove.addEventListener('click', () => removeSavedScan(record.id));
      actions.appendChild(remove);
      row.append(info, actions);
      container.appendChild(row);
    });
  }

  function sortResults(results) {
    results.sort((a, b) => {
      const aTimestamp = resultTimestamp(a);
      const bTimestamp = resultTimestamp(b);
      if (aTimestamp !== bTimestamp) {
        if (aTimestamp === Number.NEGATIVE_INFINITY) return 1;
        if (bTimestamp === Number.NEGATIVE_INFINITY) return -1;
        return bTimestamp - aTimestamp;
      }
      return b.offset - a.offset || b.positionInPage - a.positionInPage || String(b.postId).localeCompare(String(a.postId));
    });
  }

  function getVisibleResults() {
    const record = state.currentRecord;
    const results = record && Array.isArray(record.results) ? record.results : [];
    return filterResultsFromDate(results, element('resultFromDate').value);
  }

  function showRecord(record) {
    state.currentRecord = record;
    state.loadedDomains = Array.isArray(record.domains) ? record.domains.slice() : null;
    state.loadedFileName = 'lista salvata';
    element('topicId').value = record.topicId;
    element('startPage').value = record.startPage;
    updateOffsetPreview();
    element('domainSummary').textContent = `${record.domains.length} domini caricati dalla scansione salvata.`;
    renderProgress(record);
    state.resultIndex = 0;
    renderResult();
    updateControls();
  }

  async function openSavedScan(id) {
    try {
      const record = await getScan(id);
      if (!record) throw new Error('La scansione non esiste più.');
      if (record.status === 'running') record.status = 'paused';
      record.seenPostIds = Array.isArray(record.seenPostIds) ? record.seenPostIds : [];
      record.results = Array.isArray(record.results) ? record.results : [];
      sortResults(record.results);
      showRecord(record);
      setStatus(record.status === 'complete' ? 'Risultati caricati.' : (record.lastError || 'Scansione pronta per essere ripresa.'), record.status === 'complete' ? 'success' : 'warning');
    } catch (error) {
      setStatus(error.message, 'error');
    }
  }

  async function resumeSavedScan(id) {
    if (state.isRunning) return;
    try {
      const record = await getScan(id);
      if (!record) throw new Error('La scansione non esiste più.');
      if (record.status === 'complete') {
        showRecord(record);
        setStatus('La scansione è già completa.', 'success');
        return;
      }
      record.seenPostIds = Array.isArray(record.seenPostIds) ? record.seenPostIds : [];
      record.results = Array.isArray(record.results) ? record.results : [];
      showRecord(record);
      await runScan(record);
    } catch (error) {
      setStatus(error.message, 'error');
    }
  }

  async function removeSavedScan(id) {
    if (state.isRunning && state.currentRecord && state.currentRecord.id === id) return;
    if (!ROOT.confirm('Eliminare definitivamente checkpoint e risultati di questa scansione?')) return;
    await deleteScan(id);
    if (state.currentRecord && state.currentRecord.id === id) {
      state.currentRecord = null;
      state.resultIndex = 0;
      renderProgress(null);
      renderResult();
      updateControls();
    }
    await refreshSavedScans();
    setStatus('Scansione eliminata.', 'success');
  }

  function cleanCandidate(rawValue) {
    let value = String(rawValue || '').trim();
    if (!value) return '';
    value = value.replace(/[),.;!?}\]]+$/g, '');
    if (value.startsWith('//')) value = `https:${value}`;
    else if (/^www\./i.test(value)) value = `https://${value}`;
    return value;
  }

  function extractUrlsAndText(html) {
    const documentCopy = new DOMParser().parseFromString(String(html || ''), 'text/html');
    const candidates = new Set();
    const baseUrl = 'https://difesa.forumfree.it/';

    function addCandidate(raw) {
      const cleaned = cleanCandidate(raw);
      if (!cleaned) return;
      try {
        const url = new URL(cleaned, baseUrl);
        if (url.protocol === 'http:' || url.protocol === 'https:') candidates.add(url.href);
      } catch (_error) {
        // URL malformato: viene ignorato.
      }
    }

    documentCopy.querySelectorAll('[href], [src], [data-url]').forEach((node) => {
      ['href', 'src', 'data-url'].forEach((attribute) => {
        if (node.hasAttribute(attribute)) addCandidate(node.getAttribute(attribute));
      });
    });

    const text = (documentCopy.body ? documentCopy.body.textContent : documentCopy.textContent || '').replace(/\s+/g, ' ').trim();
    const urlExpression = /(?:https?:\/\/|\/\/|www\.)[^\s<>"'`]+/gi;
    for (const match of text.matchAll(urlExpression)) addCandidate(match[0]);

    return { urls: Array.from(candidates), text };
  }

  function analyzeMessage(message, offset, positionInPage, matcher) {
    const extracted = extractUrlsAndText(message.content || '');
    const matchedDomains = new Set();
    const matchedUrls = [];

    extracted.urls.forEach((urlValue) => {
      try {
        const hostname = new URL(urlValue).hostname.toLowerCase().replace(/\.$/, '');
        const patterns = matchHostname(hostname, matcher);
        if (patterns.length) {
          patterns.forEach((pattern) => matchedDomains.add(pattern));
          matchedUrls.push(urlValue);
        }
      } catch (_error) {
        // URL già filtrato, controllo difensivo.
      }
    });

    if (!matchedUrls.length) return null;
    return {
      postId: String(message.id),
      offset,
      page: offsetToPage(offset),
      positionInPage,
      author: message.user && message.user.nickname ? String(message.user.nickname) : 'Autore sconosciuto',
      date: message.info && message.info.date ? String(message.info.date) : '',
      excerpt: extracted.text.length > CONFIG.excerptLength ? `${extracted.text.slice(0, CONFIG.excerptLength).trim()}…` : extracted.text,
      matchedDomains: Array.from(matchedDomains).sort(),
      matchedUrls: Array.from(new Set(matchedUrls))
    };
  }

  async function fetchPage(topicId, offset) {
    let lastError = null;
    for (let attempt = 1; attempt <= CONFIG.maxRequestAttempts; attempt += 1) {
      if (state.pauseRequested || state.cancelRequested) throw new Error('Scansione interrotta.');

      const controller = new AbortController();
      let timedOut = false;
      state.controllers.add(controller);
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, CONFIG.requestTimeoutMs);

      try {
        const url = new URL('/api.php', location.origin);
        url.searchParams.set('t', topicId);
        url.searchParams.set('st', String(offset));
        url.searchParams.set('raw', '1');
        url.searchParams.set('cookie', '1');
        const response = await fetch(url.href, {
          method: 'GET',
          credentials: 'include',
          headers: { Accept: 'application/json' },
          signal: controller.signal
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new PermanentRequestError(`Accesso API negato (${response.status}). Verifica la sessione staff.`);
          }
          if (response.status === 404) {
            throw new PermanentRequestError('Discussione non trovata (404). Verifica l’ID inserito.');
          }
          const error = new Error(`Errore API ${response.status}.`);
          error.retryAfterMs = parseRetryAfter(response.headers.get('Retry-After'));
          error.retryable = response.status === 429 || response.status >= 500;
          if (!error.retryable) throw new PermanentRequestError(error.message);
          throw error;
        }

        let data;
        try {
          data = await response.json();
        } catch (_error) {
          throw new PermanentRequestError('La risposta non è JSON. La sessione potrebbe essere scaduta.');
        }
        if (!data || !Array.isArray(data.messages)) {
          throw new PermanentRequestError('Risposta API non riconosciuta: manca l’elenco messages.');
        }
        return { offset, data };
      } catch (error) {
        if (state.pauseRequested || state.cancelRequested) throw error;
        if (error instanceof PermanentRequestError) throw error;
        lastError = timedOut ? new Error(`Timeout sulla pagina ${offsetToPage(offset)}.`) : error;
        if (attempt >= CONFIG.maxRequestAttempts) break;
        const retryAfter = Number(error.retryAfterMs) || 0;
        const exponential = 1000 * (2 ** (attempt - 1));
        const jitter = 0.8 + Math.random() * 0.4;
        const waitMs = Math.min(60000, Math.max(retryAfter, exponential * jitter));
        setStatus(`Tentativo ${attempt} fallito sulla pagina ${formatInteger(offsetToPage(offset))}; nuovo tentativo tra ${Math.ceil(waitMs / 1000)} s.`, 'warning');
        await sleep(waitMs);
      } finally {
        clearTimeout(timeout);
        state.controllers.delete(controller);
      }
    }
    throw new Error(lastError && lastError.message ? lastError.message : 'Richiesta API fallita dopo quattro tentativi.');
  }

  function abortActiveRequests() {
    state.controllers.forEach((controller) => controller.abort());
    state.controllers.clear();
  }

  async function commitCheckpoint(record) {
    record.seenPostIds = Array.from(state.seenIds);
    sortResults(record.results);
    await saveScan(record);
    renderProgress(record);
  }

  async function runScan(record) {
    if (state.isRunning) return;
    state.currentRecord = record;
    state.currentMatcher = buildMatcher(record.domains);
    state.seenIds = new Set((record.seenPostIds || []).map(String));
    state.isRunning = true;
    state.pauseRequested = false;
    state.cancelRequested = false;
    record.status = 'running';
    record.lastError = '';
    let completed = false;
    try {
      await saveScan(record);
      updateControls();
      setStatus(`Scansione avviata dalla pagina ${formatInteger(record.startPage)}.`, 'info');

      while (record.pagesProcessed < CONFIG.maxPagesPerScan) {
        if (state.pauseRequested || state.cancelRequested) throw new Error('Scansione interrotta.');
        const remaining = CONFIG.maxPagesPerScan - record.pagesProcessed;
        const batchSize = Math.min(CONFIG.concurrency, remaining);
        const offsets = makeBatchOffsets(record.nextOffset, batchSize);
        const pages = await Promise.all(offsets.map((offset) => fetchPage(record.topicId, offset)));
        pages.sort((a, b) => a.offset - b.offset);

        let reachedEnd = false;
        for (const pageResponse of pages) {
          const { offset, data } = pageResponse;
          const info = data.info || {};
          const reportedPages = Number(info.pages);
          if (Number.isFinite(reportedPages) && reportedPages > 0) {
            record.reportedPages = Math.max(Number(record.reportedPages) || 0, reportedPages);
          }
          if (!record.topicTitle && info.title) record.topicTitle = String(info.title);

          if (record.pagesProcessed === 0 && record.reportedPages && record.startPage > record.reportedPages + 1) {
            throw new PermanentRequestError(`La pagina iniziale ${record.startPage} supera la fine indicata dall’API (${record.reportedPages}).`);
          }

          const newMessages = collectUnseenMessages(data.messages, state.seenIds);
          record.consecutiveDuplicatePages = advanceDuplicateCount(record.consecutiveDuplicatePages, newMessages.length);

          newMessages.forEach(({ message, index }) => {
            const result = analyzeMessage(message, offset, index, state.currentMatcher);
            if (result) record.results.push(result);
          });

          record.pagesProcessed += 1;
          record.postsChecked += newMessages.length;
          record.lastProcessedPage = offsetToPage(offset);
          record.nextOffset = offset + CONFIG.pageSize;

          if (record.consecutiveDuplicatePages >= CONFIG.endAfterConsecutiveDuplicatePages) {
            reachedEnd = true;
            break;
          }
        }

        await commitCheckpoint(record);
        setStatus(`Analisi in corso: completata la pagina ${formatInteger(record.lastProcessedPage)}.`, 'info');
        if (reachedEnd) {
          completed = true;
          break;
        }
      }

      if (!completed) {
        throw new Error(`Raggiunto il limite di sicurezza di ${CONFIG.maxPagesPerScan} pagine senza individuare la fine.`);
      }

      record.status = 'complete';
      record.completedAt = new Date().toISOString();
      record.lastError = '';
      await commitCheckpoint(record);
      state.resultIndex = 0;
      renderResult();
      setStatus(`Scansione completata: ${formatInteger(record.results.length)} post positivi su ${formatInteger(record.postsChecked)} post controllati.`, 'success');
    } catch (error) {
      if (state.cancelRequested) {
        await deleteScan(record.id);
        state.currentRecord = null;
        state.seenIds.clear();
        renderProgress(null);
        renderResult();
        setStatus('Scansione cancellata insieme ai dati salvati.', 'success');
      } else {
        record.status = 'paused';
        record.lastError = state.pauseRequested ? 'Scansione messa in pausa.' : (error.message || 'Errore sconosciuto.');
        record.seenPostIds = Array.from(state.seenIds);
        try {
          await saveScan(record);
        } catch (storageError) {
          record.lastError += ` Salvataggio non riuscito: ${storageError.message}`;
        }
        renderProgress(record);
        renderResult();
        setStatus(record.lastError, state.pauseRequested ? 'warning' : 'error');
      }
    } finally {
      state.isRunning = false;
      state.pauseRequested = false;
      state.cancelRequested = false;
      abortActiveRequests();
      updateControls();
      await refreshSavedScans();
    }
  }

  async function startNewScan() {
    if (state.isRunning) return;
    try {
      if (!state.db) throw new Error('IndexedDB non è disponibile: impossibile salvare la scansione.');
      const topicId = getTopicId();
      const startPage = Number(element('startPage').value);
      const startOffset = pageToOffset(element('startPage').value);
      if (!state.loadedDomains || !state.loadedDomains.length) {
        throw new Error('Carica prima un file di domini valido.');
      }

      const domainHash = await hashDomains(state.loadedDomains);
      const id = `${topicId}:${startPage}:${domainHash}`;
      const existing = await getScan(id);
      if (existing && !ROOT.confirm('Esiste già una scansione con la stessa discussione, pagina iniziale e lista domini. Ricominciare da zero?')) {
        if (existing.status === 'running') existing.status = 'paused';
        existing.seenPostIds = Array.isArray(existing.seenPostIds) ? existing.seenPostIds : [];
        existing.results = Array.isArray(existing.results) ? existing.results : [];
        showRecord(existing);
        setStatus('Scansione esistente caricata. Usa Riprendi oppure Apri.', 'warning');
        return;
      }

      const now = new Date().toISOString();
      const record = {
        schemaVersion: 1,
        id,
        topicId,
        topicTitle: '',
        startPage,
        startOffset,
        nextOffset: startOffset,
        domainHash,
        domains: state.loadedDomains.slice(),
        sourceFileName: state.loadedFileName,
        status: 'paused',
        createdAt: now,
        updatedAt: now,
        completedAt: '',
        pagesProcessed: 0,
        postsChecked: 0,
        lastProcessedPage: 0,
        reportedPages: 0,
        consecutiveDuplicatePages: 0,
        seenPostIds: [],
        results: [],
        lastError: ''
      };
      await saveScan(record);
      showRecord(record);
      await runScan(record);
    } catch (error) {
      setStatus(error.message, 'error');
    }
  }

  function requestPause() {
    if (!state.isRunning) return;
    state.pauseRequested = true;
    setStatus('Pausa in corso: arresto delle richieste attive…', 'warning');
    abortActiveRequests();
  }

  async function resumeCurrent() {
    if (!state.currentRecord || state.currentRecord.status !== 'paused' || state.isRunning) return;
    await runScan(state.currentRecord);
  }

  async function cancelCurrent() {
    if (!state.currentRecord) return;
    if (!ROOT.confirm('Cancellare la scansione corrente, il checkpoint e tutti i risultati?')) return;
    if (state.isRunning) {
      state.cancelRequested = true;
      setStatus('Cancellazione in corso…', 'warning');
      abortActiveRequests();
      return;
    }
    const id = state.currentRecord.id;
    await deleteScan(id);
    state.currentRecord = null;
    state.resultIndex = 0;
    renderProgress(null);
    renderResult();
    updateControls();
    await refreshSavedScans();
    setStatus('Scansione cancellata.', 'success');
  }

  function renderResult() {
    const empty = element('resultEmpty');
    const card = element('resultCard');
    const record = state.currentRecord;
    const allResults = record && Array.isArray(record.results) ? record.results : [];
    const results = getVisibleResults();
    const fromDate = element('resultFromDate').value;
    element('resultFilterSummary').textContent = fromDate && record ? `${formatInteger(results.length)} di ${formatInteger(allResults.length)} risultati visibili` : '';
    if (!results.length) {
      if (!record) empty.textContent = 'Nessun risultato selezionato.';
      else if (fromDate && allResults.length) empty.textContent = `Nessun risultato dalla data ${fromDate} in avanti.`;
      else empty.textContent = 'La scansione selezionata non contiene ancora post positivi.';
      empty.classList.remove('hidden');
      card.classList.add('hidden');
      return;
    }

    state.resultIndex = Math.max(0, Math.min(state.resultIndex, results.length - 1));
    const result = results[state.resultIndex];
    empty.classList.add('hidden');
    card.classList.remove('hidden');
    element('resultCounter').textContent = `Risultato ${formatInteger(state.resultIndex + 1)} di ${formatInteger(results.length)}${results.length !== allResults.length ? ` (${formatInteger(allResults.length)} totali)` : ''}`;
    element('resultMeta').textContent = `Pagina ${formatInteger(result.page)} · offset ${formatInteger(result.offset)} · post ${result.postId} · ${result.author} · ${formatDate(result.date)}`;
    element('resultExcerpt').textContent = result.excerpt || '(Post senza testo visibile)';

    const domains = element('matchedDomains');
    domains.replaceChildren();
    result.matchedDomains.forEach((domain) => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = domain;
      domains.appendChild(chip);
    });

    const urls = element('matchedUrls');
    urls.replaceChildren();
    result.matchedUrls.forEach((urlValue) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = urlValue;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = urlValue;
      item.appendChild(link);
      urls.appendChild(item);
    });

    element('previousResult').disabled = state.resultIndex === 0;
    element('nextResult').disabled = state.resultIndex === results.length - 1;
  }

  function changeResult(delta) {
    const results = getVisibleResults();
    if (!results.length) return;
    state.resultIndex += delta;
    renderResult();
  }

  function openCurrentPost() {
    const results = getVisibleResults();
    if (!state.currentRecord || !results.length) return;
    const result = results[state.resultIndex];
    const url = `https://difesa.forumfree.it/?t=${encodeURIComponent(state.currentRecord.topicId)}&st=${encodeURIComponent(result.offset)}#entry${encodeURIComponent(result.postId)}`;
    ROOT.open(url, '_blank', 'noopener,noreferrer');
  }

  function bindEvents() {
    element('launcher').addEventListener('click', async () => {
      element('overlay').classList.remove('hidden');
      await refreshSavedScans();
    });
    element('close').addEventListener('click', () => element('overlay').classList.add('hidden'));
    element('overlay').addEventListener('click', (event) => {
      if (event.target === element('overlay')) element('overlay').classList.add('hidden');
    });
    element('startPage').addEventListener('input', updateOffsetPreview);
    element('domainFile').addEventListener('change', handleFileSelection);
    element('start').addEventListener('click', startNewScan);
    element('pause').addEventListener('click', requestPause);
    element('resume').addEventListener('click', resumeCurrent);
    element('cancel').addEventListener('click', cancelCurrent);
    element('previousResult').addEventListener('click', () => changeResult(-1));
    element('nextResult').addEventListener('click', () => changeResult(1));
    element('openPost').addEventListener('click', openCurrentPost);
    element('resultFromDate').addEventListener('input', () => {
      state.resultIndex = 0;
      renderResult();
    });
    element('clearResultDate').addEventListener('click', () => {
      element('resultFromDate').value = '';
      state.resultIndex = 0;
      renderResult();
    });
  }

  async function initialize() {
    createInterface();
    bindEvents();
    prefillFromLocation();
    updateControls();
    try {
      state.db = await openDatabase();
      setStatus('Pronto. Inserisci i dati della discussione e carica il file domini.', 'success');
      await refreshSavedScans();
    } catch (error) {
      setStatus(`Salvataggio locale non disponibile: ${error.message}`, 'error');
      await refreshSavedScans();
    }
    updateControls();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
