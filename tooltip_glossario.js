// ============================================
// SISTEMA TOOLTIP GLOSSARIO
// ============================================

(function() {
  'use strict';

  // Configurazione
  const CONFIG = {
    jsonUrl: 'https://norse94.github.io/glossary_test_2000.json',
    targetClass: 'color', // Classe delle tabelle dove cercare i termini
    tooltipDelay: 300 // Delay prima di mostrare il tooltip (ms)
  };

  let glossaryData = [];
  let glossaryIndex = {}; // Indice hash per ricerche O(1)
  let combinedRegexes = []; // Array di regex (divise in chunks per performance)
  let processedTerms = new Set();
  let processedElements = new WeakSet(); // Cache elementi già processati
  let currentTooltip = null;
  let tooltipTimeout = null;
  let hideTimeout = null;
  let cellObserver = null; // Intersection Observer per lazy loading

  // ============================================
  // STILI CSS
  // ============================================
  const styles = `
    .glossary-term {
      color: #425F93 !important;
      font-weight: 600 !important;
      cursor: help !important;
      text-decoration: underline !important;
      text-decoration-style: dotted !important;
      text-decoration-color: #425F93 !important;
      position: relative !important;
      transition: all 0.2s ease !important;
    }

    .glossary-term-variant {
      vertical-align: super !important;
      font-size: 0.7em !important;
      font-weight: 700 !important;
      margin-left: 1px !important;
    }

    .glossary-term:hover {
      color: #3c5580 !important;
      background: rgba(66, 95, 147, 0.1) !important;
      text-decoration-style: solid !important;
    }

    .glossary-tooltip {
      position: fixed !important;
      background: white !important;
      border: 2px solid #425F93 !important;
      border-radius: 12px !important;
      padding: 16px !important;
      max-width: 400px !important;
      box-shadow: 0 10px 40px rgba(64, 71, 86, 0.2) !important;
      z-index: 10000 !important;
      opacity: 0 !important;
      transform: translateY(10px) !important;
      transition: opacity 0.3s ease, transform 0.3s ease !important;
      pointer-events: none !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif !important;
    }

    .glossary-tooltip.show {
      opacity: 1 !important;
      transform: translateY(0) !important;
      pointer-events: auto !important;
    }

    .glossary-tooltip-header {
      display: flex !important;
      align-items: flex-start !important;
      justify-content: space-between !important;
      margin-bottom: 8px !important;
      gap: 12px !important;
    }

    .glossary-tooltip-title {
      font-size: 18px !important;
      font-weight: 700 !important;
      color: #1f2937 !important;
      margin: 0 !important;
      line-height: 1.3 !important;
      text-align: center !important;
      flex: 1 !important;
    }

    .glossary-tooltip-close {
      background: transparent !important;
      border: none !important;
      color: #9ca3af !important;
      font-size: 20px !important;
      cursor: pointer !important;
      padding: 0 !important;
      width: 24px !important;
      height: 24px !important;
      flex-shrink: 0 !important;
      line-height: 1 !important;
      transition: color 0.2s ease !important;
    }

    .glossary-tooltip-close:hover {
      color: #374151 !important;
    }

    .glossary-tooltip-full {
      font-size: 13px !important;
      color: #6b7280 !important;
      margin: 0 0 12px 0 !important;
      font-style: italic !important;
    }

    .glossary-tooltip-description {
      font-size: 14px !important;
      line-height: 1.5 !important;
      color: #374151 !important;
      margin: 0 0 12px 0 !important;
      max-height: 150px !important;
      overflow-y: auto !important;
    }

    .glossary-tooltip-description::-webkit-scrollbar {
      width: 6px !important;
    }

    .glossary-tooltip-description::-webkit-scrollbar-track {
      background: #f3f4f6 !important;
      border-radius: 3px !important;
    }

    .glossary-tooltip-description::-webkit-scrollbar-thumb {
      background: #d1d5db !important;
      border-radius: 3px !important;
    }

    .glossary-tooltip-meta {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 6px !important;
      margin-bottom: 12px !important;
    }

    .glossary-tooltip-badge {
      display: inline-flex !important;
      padding: 3px 10px !important;
      border-radius: 12px !important;
      font-size: 11px !important;
      font-weight: 600 !important;
    }

    .glossary-tooltip-badge.category {
      background: #dfebff !important;
      color: #425F93 !important;
    }

    .glossary-tooltip-badge.year {
      background: #dfebff !important;
      color: #425F93 !important;
    }

    .glossary-tooltip-link {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
      color: #425F93 !important;
      text-decoration: none !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      padding: 8px 16px !important;
      border: 2px solid #425F93 !important;
      border-radius: 8px !important;
      transition: all 0.2s ease !important;
      background: white !important;
    }

    .glossary-tooltip-link:hover {
      background: #425F93 !important;
      color: white !important;
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 12px rgba(66, 95, 147, 0.3) !important;
    }

    .glossary-variants-section {
      margin: 12px 0 !important;
      padding: 12px !important;
      background: #f9fafb !important;
      border-radius: 8px !important;
      border: 1px solid #e5e7eb !important;
    }

    .glossary-variants-title {
      font-size: 12px !important;
      font-weight: 700 !important;
      color: #6b7280 !important;
      margin: 0 0 8px 0 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }

    .glossary-variant-item {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 8px 10px !important;
      margin-bottom: 6px !important;
      background: white !important;
      border-radius: 6px !important;
      border: 1px solid #e5e7eb !important;
      transition: all 0.2s ease !important;
    }

    .glossary-variant-item:last-child {
      margin-bottom: 0 !important;
    }

    .glossary-variant-item:hover {
      border-color: #425F93 !important;
      background: #f0f5ff !important;
    }

    .glossary-variant-info {
      flex: 1 !important;
      min-width: 0 !important;
    }

    .glossary-variant-name {
      font-size: 13px !important;
      font-weight: 600 !important;
      color: #1f2937 !important;
      margin: 0 0 2px 0 !important;
      display: flex !important;
      align-items: center !important;
      gap: 4px !important;
    }

    .glossary-variant-full {
      font-size: 11px !important;
      color: #6b7280 !important;
      margin: 0 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    .glossary-variant-btn {
      background: #425F93 !important;
      border: none !important;
      color: white !important;
      padding: 6px 12px !important;
      border-radius: 6px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      white-space: nowrap !important;
      flex-shrink: 0 !important;
    }

    .glossary-variant-btn:hover {
      background: #3c5580 !important;
      transform: scale(1.05) !important;
    }

    .glossary-variant-current {
      background: #dfebff !important;
      border-color: #425F93 !important;
    }

    .glossary-tooltip-arrow {
      position: absolute !important;
      width: 0 !important;
      height: 0 !important;
      border-style: solid !important;
    }

    .glossary-tooltip-arrow.top {
      bottom: 100% !important;
      border-width: 0 8px 8px 8px !important;
      border-color: transparent transparent #425F93 transparent !important;
    }

    .glossary-tooltip-arrow.bottom {
      top: 100% !important;
      border-width: 8px 8px 0 8px !important;
      border-color: #425F93 transparent transparent transparent !important;
    }

    @media (max-width: 768px) {
      .glossary-tooltip {
        max-width: calc(100vw - 32px) !important;
        left: 16px !important;
        right: 16px !important;
      }

      .glossary-tooltip-link {
        width: 100% !important;
        justify-content: center !important;
      }
    }
  `;

  // ============================================
  // INIZIALIZZAZIONE
  // ============================================
  function init() {
    console.log('🔧 Tooltip: Inizializzazione...');
    injectStyles();
    loadGlossaryData().then(() => {
      console.log('🔧 Tooltip: Dati caricati, inizio elaborazione tabelle...');

      // Setup observer prima di processare tabelle
      setupCellObserver();

      processTablesWithColorClass();
      setupClickOutsideHandler();
      console.log('🔧 Tooltip: Inizializzazione completata');
    }).catch(err => {
      console.error('❌ Tooltip: Errore durante inizializzazione:', err);
    });
  }

  function injectStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }

  async function loadGlossaryData() {
    try {
      // Se c'è già un caricamento in corso, aspetta quello
      if (window.sharedGlossaryDataPromise) {
        console.log('%c💡 TOOLTIP: Aspetto caricamento in corso...', 'background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold');
        glossaryData = await window.sharedGlossaryDataPromise;
        console.log('%c💡 TOOLTIP: Uso dati appena caricati (cache condivisa) - Evito fetch duplicato!', 'background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold');
        console.log(`   ↳ Termini disponibili: ${glossaryData.length}`);

        // Usa indice condiviso o costruiscilo
        useOrBuildSharedIndex();
        return;
      }

      // Controlla se i dati sono già stati caricati
      if (window.sharedGlossaryData && window.sharedGlossaryData.length > 0) {
        console.log('%c💡 TOOLTIP: Uso dati già caricati (cache condivisa) - Evito fetch duplicato!', 'background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold');
        console.log(`   ↳ Termini disponibili: ${window.sharedGlossaryData.length}`);
        glossaryData = window.sharedGlossaryData;

        // Usa indice condiviso o costruiscilo
        useOrBuildSharedIndex();
        return;
      }

      // Primo caricamento - crea la Promise condivisa
      console.log('%c💡 TOOLTIP: Carico dati da JSON (primo caricamento)', 'background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold');
      console.log(`   ↳ URL: ${CONFIG.jsonUrl}`);

      window.sharedGlossaryDataPromise = fetch(CONFIG.jsonUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error('Errore nel caricamento del glossario');
          }
          return response.json();
        })
        .then(data => {
          window.sharedGlossaryData = data;
          window.sharedGlossaryDataPromise = null; // Pulisci la promise
          console.log(`   ↳ Caricati ${data.length} termini - Salvati in cache condivisa`);
          return data;
        });

      glossaryData = await window.sharedGlossaryDataPromise;

      // Usa indice condiviso o costruiscilo
      useOrBuildSharedIndex();
    } catch (err) {
      console.error('❌ Errore caricamento glossario:', err);
      glossaryData = [];
    }
  }

  // Usa indice condiviso o costruiscilo
  function useOrBuildSharedIndex() {
    // Controlla se esiste già un indice condiviso
    if (window.sharedGlossaryIndex && window.sharedCombinedRegexes) {
      console.log('📊 Uso indice e regex condivisi - Evito ricostruzione!');
      glossaryIndex = window.sharedGlossaryIndex;
      combinedRegexes = window.sharedCombinedRegexes;
      console.log(`🔍 Indice condiviso: ${Object.keys(glossaryIndex).length} chiavi`);
      console.log(`⚡ Regex condivise: ${combinedRegexes.length} chunks`);
      return;
    }

    // Costruisci e condividi
    console.log('📊 Costruisco indice e regex (primo caricamento tooltip)...');
    buildGlossaryIndex();
    window.sharedGlossaryIndex = glossaryIndex;
    window.sharedCombinedRegexes = combinedRegexes;
    console.log('✅ Indice e regex condivisi salvati globalmente');
  }

  // Costruisce un indice hash per ricerche O(1)
  function buildGlossaryIndex() {
    try {
      glossaryIndex = {};

      if (!glossaryData || glossaryData.length === 0) {
        console.error('❌ Nessun dato da indicizzare!');
        return;
      }

      console.log(`📝 Indicizzazione di ${glossaryData.length} termini...`);

      glossaryData.forEach(term => {
        if (!term || !term.acronym) {
          console.warn('⚠️ Termine senza acronimo:', term);
          return;
        }

        const key = term.acronym.toLowerCase();

        // Crea array se non esiste
        if (!glossaryIndex[key]) {
          glossaryIndex[key] = [];
        }

        // Aggiungi il termine (può avere varianti)
        glossaryIndex[key].push(term);

        // Aggiungi anche gli alias all'indice
        if (term.aliases && Array.isArray(term.aliases)) {
          term.aliases.forEach(alias => {
            const aliasKey = alias.toLowerCase();
            if (!glossaryIndex[aliasKey]) {
              glossaryIndex[aliasKey] = [];
            }
            glossaryIndex[aliasKey].push(term);
          });
        }
      });

      const indexSize = Object.keys(glossaryIndex).length;
      console.log(`🔍 Indice hash tooltip creato: ${indexSize} chiavi univoche (acronimi + alias)`);

      // Costruisci regex combinata per performance
      if (indexSize > 0) {
        buildCombinedRegex();
      } else {
        console.error('❌ Indice vuoto! Non posso creare regex.');
      }
    } catch (err) {
      console.error('❌ Errore costruzione indice:', err);
    }
  }

  // Costruisce regex combinate divise in chunks per gestire molti termini
  function buildCombinedRegex() {
    try {
      console.log('🔨 Costruzione regex combinate...');
      combinedRegexes = [];

      // Raccogli tutti gli acronimi e alias
      const allTerms = new Set();
      glossaryData.forEach(term => {
        allTerms.add(term.acronym);
        if (term.aliases && Array.isArray(term.aliases)) {
          term.aliases.forEach(alias => allTerms.add(alias));
        }
      });

      console.log(`   📝 Raccolti ${allTerms.size} termini unici (acronimi + alias)`);

      // Ordina per lunghezza decrescente (per matchare termini più lunghi prima)
      const sortedTerms = Array.from(allTerms).sort((a, b) => b.length - a.length);

      // Dividi in chunks di 500 termini per evitare regex troppo grandi
      const chunkSize = 500;
      const chunks = [];

      for (let i = 0; i < sortedTerms.length; i += chunkSize) {
        chunks.push(sortedTerms.slice(i, i + chunkSize));
      }

      console.log(`   ✂️ Divisi in ${chunks.length} chunks di max ${chunkSize} termini`);

      // Crea una regex per ogni chunk
      chunks.forEach((chunk, idx) => {
        try {
          const escapedTerms = chunk.map(term => escapeRegExp(term));
          const pattern = `\\b(${escapedTerms.join('|')})\\b`;
          const regex = new RegExp(pattern, 'gi');
          combinedRegexes.push(regex);
          console.log(`   ✅ Regex ${idx + 1}/${chunks.length} creata (${chunk.length} termini)`);
        } catch (regexErr) {
          console.error(`   ❌ Errore creazione regex ${idx + 1}:`, regexErr);
        }
      });

      if (combinedRegexes.length === 0) {
        console.error('❌ Nessuna regex creata! Uso fallback.');
        combinedRegexes = [/(?!)/gi];
      } else {
        console.log(`⚡ Regex combinate create: ${sortedTerms.length} termini divisi in ${combinedRegexes.length} regex`);
      }
    } catch (err) {
      console.error('❌ Errore nella creazione delle regex combinate:', err);
      // Fallback: usa una regex semplice che non troverà nulla (evita crash)
      combinedRegexes = [/(?!)/gi];
    }
  }

  // ============================================
  // INTERSECTION OBSERVER (LAZY LOADING)
  // ============================================
  function setupCellObserver() {
    if (!window.IntersectionObserver) {
      console.warn('⚠️ IntersectionObserver non supportato, uso fallback immediato');
      processTablesImmediate();
      return;
    }

    // Crea observer con opzioni ottimizzate
    cellObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const cell = entry.target;

          // Processa la cella solo quando diventa visibile
          try {
            highlightTermsInElement(cell);
          } catch (err) {
            console.error(`❌ Errore evidenziazione cella:`, err);
          }

          // Stop observing dopo il processing
          cellObserver.unobserve(cell);
        }
      });
    }, {
      // Inizia il processing quando la cella è al 10% visibile
      threshold: 0.1,
      // Margine di 200px per pre-caricare celle vicine
      rootMargin: '200px'
    });

    console.log('✅ Intersection Observer attivato');
  }

  // ============================================
  // ELABORAZIONE TABELLE
  // ============================================
  function processTablesWithColorClass() {
    console.log(`🔍 Cercando tabelle con classe "${CONFIG.targetClass}"...`);
    const tables = document.querySelectorAll(`table.${CONFIG.targetClass}`);

    if (tables.length === 0) {
      console.warn(`⚠️ Nessuna tabella con classe "${CONFIG.targetClass}" trovata`);
      return;
    }

    console.log(`✅ Trovate ${tables.length} tabelle con classe "${CONFIG.targetClass}"`);

    let totalCells = 0;
    tables.forEach((table, idx) => {
      const cells = table.querySelectorAll('td, th');
      totalCells += cells.length;
      console.log(`   Tabella ${idx + 1}: ${cells.length} celle`);

      cells.forEach(cell => {
        // Osserva ogni cella invece di processarla immediatamente
        if (cellObserver) {
          cellObserver.observe(cell);
        } else {
          // Fallback: processa immediatamente se observer non disponibile
          try {
            highlightTermsInElement(cell);
          } catch (err) {
            console.error(`❌ Errore evidenziazione cella:`, err);
          }
        }
      });
    });

    console.log(`📊 ${totalCells} celle monitorate per lazy loading`);
  }

  // Fallback per browser senza IntersectionObserver
  function processTablesImmediate() {
    console.log(`🔍 Cercando tabelle con classe "${CONFIG.targetClass}"...`);
    const tables = document.querySelectorAll(`table.${CONFIG.targetClass}`);

    if (tables.length === 0) {
      console.warn(`⚠️ Nessuna tabella con classe "${CONFIG.targetClass}" trovata`);
      return;
    }

    let totalCells = 0;
    tables.forEach((table, idx) => {
      const cells = table.querySelectorAll('td, th');
      totalCells += cells.length;

      cells.forEach(cell => {
        try {
          highlightTermsInElement(cell);
        } catch (err) {
          console.error(`❌ Errore evidenziazione cella:`, err);
        }
      });
    });

    console.log(`✅ Elaborazione completata: ${totalCells} celle, ${processedTerms.size} termini evidenziati`);
  }

  function highlightTermsInElement(element) {
    // Skip se già processato
    if (processedElements.has(element)) {
      return;
    }
    processedElements.add(element);

    // Ottieni tutti i nodi di testo
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      // Salta nodi già processati o dentro link
      if (!node.parentElement.classList.contains('glossary-term') &&
          node.parentElement.tagName !== 'A') {
        textNodes.push(node);
      }
    }

    if (textNodes.length === 0) {
      return; // Nessun nodo testo da processare
    }

    textNodes.forEach(textNode => {
      const text = textNode.textContent;

      if (!text || text.trim().length === 0) {
        return; // Salta nodi vuoti
      }

      let replacements = [];

      // Verifica che le regex siano disponibili
      if (!combinedRegexes || combinedRegexes.length === 0) {
        console.error('❌ Nessuna regex disponibile per evidenziazione!');
        return;
      }

      // Usa tutte le regex combinate per trovare tutti i match
      combinedRegexes.forEach((regex, regexIdx) => {
        regex.lastIndex = 0; // Reset regex
        let match;
        let matchCount = 0;

        while ((match = regex.exec(text)) !== null) {
          matchCount++;
          const matchedText = match[0];
          const matchedKey = matchedText.toLowerCase();

          // Trova il termine corrispondente usando l'indice hash
          const candidates = glossaryIndex[matchedKey];

          if (candidates && candidates.length > 0) {
            // Prendi il primo termine (gestisce varianti se necessario)
            const term = candidates[0];

            // Verifica case-sensitive se necessario
            if (term.caseSensitive === true) {
              // Solo maiuscole
              if (matchedText !== matchedText.toUpperCase()) {
                continue; // Salta questo match
              }
            }

            replacements.push({
              start: match.index,
              end: match.index + matchedText.length,
              text: matchedText,
              term: term
            });
          }
        }
      });

      if (replacements.length > 0) {
        // Ordina per posizione e rimuovi sovrapposizioni
        replacements.sort((a, b) => a.start - b.start);
        replacements = removeOverlaps(replacements);

        // Costruisci il nuovo contenuto
        if (replacements.length > 0) {
          const fragment = document.createDocumentFragment();
          let lastIndex = 0;

          replacements.forEach(replacement => {
            // Aggiungi il testo prima del termine
            if (replacement.start > lastIndex) {
              fragment.appendChild(
                document.createTextNode(text.substring(lastIndex, replacement.start))
              );
            }

            // Crea lo span per il termine
            const span = document.createElement('span');
            span.className = 'glossary-term';
            span.dataset.acronym = replacement.term.acronym;
            span.dataset.variant = replacement.term.variant || '';

            // Aggiungi testo del termine
            const textNode = document.createTextNode(replacement.text);
            span.appendChild(textNode);

            // Aggiungi numero variante se presente
            if (replacement.term.variant) {
              const variantSpan = document.createElement('span');
              variantSpan.className = 'glossary-term-variant';
              variantSpan.textContent = replacement.term.variant;
              span.appendChild(variantSpan);
            }

            // Aggiungi event listeners
            span.addEventListener('mouseenter', (e) => showTooltip(e, replacement.term));
            span.addEventListener('mouseleave', hideTooltipDelayed);

            // Click apre glossario solo su desktop
            span.addEventListener('click', (e) => {
              e.preventDefault();
              // Controlla se siamo su mobile (larghezza < 768px)
              if (window.innerWidth >= 768) {
                openGlossaryToTerm(replacement.term.acronym, replacement.term.variant);
              }
            });

            fragment.appendChild(span);
            processedTerms.add(replacement.term.acronym);

            lastIndex = replacement.end;
          });

          // Aggiungi il testo rimanente
          if (lastIndex < text.length) {
            fragment.appendChild(
              document.createTextNode(text.substring(lastIndex))
            );
          }

          // Sostituisci il nodo di testo originale
          textNode.parentNode.replaceChild(fragment, textNode);
        }
      }
    });
  }

  function removeOverlaps(replacements) {
    const filtered = [];
    let lastEnd = -1;

    replacements.forEach(replacement => {
      if (replacement.start >= lastEnd) {
        filtered.push(replacement);
        lastEnd = replacement.end;
      }
    });

    return filtered;
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ============================================
  // GESTIONE TOOLTIP
  // ============================================
  function showTooltip(event, term) {
    // Cancella eventuali timeout precedenti
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }

    tooltipTimeout = setTimeout(() => {
      // Rimuovi tooltip esistenti
      if (currentTooltip) {
        currentTooltip.remove();
      }

      // Crea il nuovo tooltip
      const tooltip = createTooltip(term);
      document.body.appendChild(tooltip);
      currentTooltip = tooltip;

      // Posiziona il tooltip
      positionTooltip(tooltip, event.target);

      // Mostra con animazione
      setTimeout(() => tooltip.classList.add('show'), 10);

      // Aggiungi event listeners per mantenere il tooltip aperto
      tooltip.addEventListener('mouseenter', () => {
        if (tooltipTimeout) {
          clearTimeout(tooltipTimeout);
        }
        if (hideTimeout) {
          clearTimeout(hideTimeout);
        }
      });

      tooltip.addEventListener('mouseleave', hideTooltipDelayed);
    }, CONFIG.tooltipDelay);
  }

  function hideTooltipDelayed() {
    if (tooltipTimeout) {
      clearTimeout(tooltipTimeout);
    }
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }

    hideTimeout = setTimeout(() => {
      if (currentTooltip) {
        currentTooltip.classList.remove('show');
        setTimeout(() => {
          if (currentTooltip) {
            currentTooltip.remove();
            currentTooltip = null;
          }
        }, 300);
      }
    }, 200);
  }

  function createTooltip(term) {
    const tooltip = document.createElement('div');
    tooltip.className = 'glossary-tooltip';

    // Trova tutte le varianti dello stesso acronimo
    const allVariants = glossaryData.filter(t => t.acronym === term.acronym);
    const hasVariants = allVariants.length > 1;

    const variantBadge = term.variant ? `<sup style="font-size: 0.7em; margin-left: 2px;">${term.variant}</sup>` : '';
    let html = `
      <div class="glossary-tooltip-header">
        <h3 class="glossary-tooltip-title">${term.acronym}${variantBadge}</h3>
        <button class="glossary-tooltip-close">×</button>
      </div>
    `;

    if (term.full) {
      html += `<p class="glossary-tooltip-full">${term.full}</p>`;
    }

    if (term.description) {
      const shortDesc = term.description.length > 200
        ? term.description.substring(0, 200) + '...'
        : term.description;
      html += `<div class="glossary-tooltip-description">${shortDesc}</div>`;
    }

    // Meta informazioni
    html += `<div class="glossary-tooltip-meta">`;
    const categories = Array.isArray(term.category) ? term.category : (term.category ? [term.category] : []);
    categories.forEach(cat => {
      html += `<span class="glossary-tooltip-badge category">📁 ${cat}</span>`;
    });
    if (term.year) {
      html += `<span class="glossary-tooltip-badge year">📅 ${term.year}</span>`;
    }
    html += `</div>`;

    // Mostra tutte le varianti se presenti
    if (hasVariants) {
      html += `<div class="glossary-variants-section">`;
      html += `<div class="glossary-variants-title">🔄 Altre varianti di questo termine</div>`;

      allVariants.forEach(variant => {
        const isCurrent = variant === term;
        const variantNum = variant.variant ? `<sup>${variant.variant}</sup>` : '';
        const currentClass = isCurrent ? 'glossary-variant-current' : '';

        html += `
          <div class="glossary-variant-item ${currentClass}">
            <div class="glossary-variant-info">
              <div class="glossary-variant-name">${variant.acronym}${variantNum}</div>
              <div class="glossary-variant-full">${variant.full}</div>
            </div>
            ${!isCurrent ? `<button class="glossary-variant-btn" data-acronym="${variant.acronym}" data-variant="${variant.variant || ''}">Vedi</button>` : `<span style="font-size: 11px; color: #6b7280; font-weight: 600;">Corrente</span>`}
          </div>
        `;
      });

      html += `</div>`;
    }

    // Link al glossario completo
    html += `<div style="display: flex; justify-content: center; margin-top: 12px;">
      <a href="#" class="glossary-tooltip-link" data-acronym="${term.acronym}" data-variant="${term.variant || ''}">
        📚 Vedi dettagli completi
      </a>
    </div>`;

    tooltip.innerHTML = html;

    // Event listeners
    const closeBtn = tooltip.querySelector('.glossary-tooltip-close');
    closeBtn.onclick = () => {
      tooltip.classList.remove('show');
      setTimeout(() => tooltip.remove(), 300);
      currentTooltip = null;
    };

    const link = tooltip.querySelector('.glossary-tooltip-link');
    link.onclick = (e) => {
      e.preventDefault();
      openGlossaryToTerm(term.acronym, term.variant);
      tooltip.classList.remove('show');
      setTimeout(() => tooltip.remove(), 300);
      currentTooltip = null;
    };

    // Event listeners per i pulsanti delle varianti
    const variantBtns = tooltip.querySelectorAll('.glossary-variant-btn');
    variantBtns.forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const acronym = btn.dataset.acronym;
        const variant = btn.dataset.variant;
        openGlossaryToTerm(acronym, variant);
        tooltip.classList.remove('show');
        setTimeout(() => tooltip.remove(), 300);
        currentTooltip = null;
      };
    });

    return tooltip;
  }

  function positionTooltip(tooltip, target) {
    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top, left;
    let arrowClass = 'top';

    // Calcola posizione verticale
    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;

    if (spaceBelow > tooltipRect.height + 20 || spaceBelow > spaceAbove) {
      // Mostra sotto
      top = rect.bottom + 10;
      arrowClass = 'top';
    } else {
      // Mostra sopra
      top = rect.top - tooltipRect.height - 10;
      arrowClass = 'bottom';
    }

    // Calcola posizione orizzontale del tooltip
    left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

    // Salva la posizione ideale del centro del termine (per la freccia)
    const targetCenterX = rect.left + (rect.width / 2);

    // Assicurati che il tooltip rimanga dentro il viewport
    if (left < 16) left = 16;
    if (left + tooltipRect.width > viewportWidth - 16) {
      left = viewportWidth - tooltipRect.width - 16;
    }

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;

    // Aggiungi freccia
    const arrow = document.createElement('div');
    arrow.className = `glossary-tooltip-arrow ${arrowClass}`;

    // Calcola la posizione della freccia rispetto al tooltip
    // La freccia deve puntare al centro del termine, non al centro del tooltip
    const arrowLeft = targetCenterX - left;

    // Assicurati che la freccia rimanga dentro il tooltip (con margini)
    const minArrowLeft = 20; // margine minimo dal bordo sinistro
    const maxArrowLeft = tooltipRect.width - 20; // margine minimo dal bordo destro
    const finalArrowLeft = Math.max(minArrowLeft, Math.min(maxArrowLeft, arrowLeft));

    arrow.style.left = `${finalArrowLeft}px`;
    arrow.style.transform = 'translateX(-50%)';

    tooltip.appendChild(arrow);
  }

  function setupClickOutsideHandler() {
    document.addEventListener('click', (e) => {
      if (currentTooltip && 
          !currentTooltip.contains(e.target) && 
          !e.target.classList.contains('glossary-term')) {
        currentTooltip.classList.remove('show');
        setTimeout(() => {
          if (currentTooltip) {
            currentTooltip.remove();
            currentTooltip = null;
          }
        }, 300);
      }
    });
  }

  // ============================================
  // INTEGRAZIONE CON GLOSSARIO PRINCIPALE
  // ============================================
  function openGlossaryToTerm(acronym, variant = null) {
    // Usa solo l'evento custom per aprire il glossario
    if (window.selectGlossaryTerm) {
      window.selectGlossaryTerm(acronym, variant);
    } else {
      // Fallback: crea evento custom
      const event = new CustomEvent('openGlossary', {
        detail: { term: acronym, variant: variant }
      });
      window.dispatchEvent(event);
    }
  }

  // ============================================
  // AVVIO
  // ============================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Esponi funzione globale per integrare con il glossario principale
  window.glossaryTooltipSystem = {
    processElement: highlightTermsInElement,
    refresh: processTablesWithColorClass,
    // Funzione di test per debug
    testMatch: function(text) {
      console.log('🧪 Test matching su testo:', text);
      console.log('📊 Regex disponibili:', combinedRegexes.length);
      console.log('📚 Termini in indice:', Object.keys(glossaryIndex).length);

      let totalMatches = 0;
      combinedRegexes.forEach((regex, idx) => {
        regex.lastIndex = 0;
        let match;
        let matches = [];
        while ((match = regex.exec(text)) !== null) {
          const key = match[0].toLowerCase();
          const term = glossaryIndex[key] ? glossaryIndex[key][0] : null;
          matches.push({
            text: match[0],
            position: match.index,
            term: term ? term.acronym : 'NOT_FOUND'
          });
          totalMatches++;
        }
        if (matches.length > 0) {
          console.log(`   Regex ${idx + 1}: ${matches.length} match`, matches);
        }
      });
      console.log(`✅ Totale: ${totalMatches} match trovati`);
      return totalMatches;
    }
  };

})();
