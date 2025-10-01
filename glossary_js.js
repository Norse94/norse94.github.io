// ============================================
// GLOSSARIO MILITARE INTERATTIVO
// ============================================

(function() {
  'use strict';

  // Configurazione
  const CONFIG = {
    jsonUrl: 'https://your-server.com/glossary.json',
    buttonText: '📚 Glossario',
    title: 'Glossario Militare',
    placeholder: 'Cerca termine o acronimo...'
  };

  let glossaryData = [];
  let isOpen = false;
  let currentFilter = '';
  let currentCategory = 'Tutte';
  let currentSort = 'alfabetico';
  let isMobile = false;
  let categories = ['Tutte'];

  // ============================================
  // STILI CSS
  // ============================================
  const styles = `
    .glossary-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 14px 24px;
      border-radius: 50px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
      z-index: 9998;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    .glossary-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }

    .glossary-btn:active {
      transform: translateY(0);
    }

    .glossary-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .glossary-overlay.show {
      opacity: 1;
    }

    .glossary-modal {
      background: white;
      border-radius: 16px;
      width: 100%;
      max-width: 900px;
      height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      transform: scale(0.9);
      transition: transform 0.3s ease;
      margin: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }

    .glossary-overlay.show .glossary-modal {
      transform: scale(1);
    }

    .glossary-header {
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 16px 16px 0 0;
      flex-shrink: 0;
    }

    .glossary-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .glossary-back-btn {
      display: none;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      font-size: 20px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      cursor: pointer;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease;
      flex-shrink: 0;
    }

    .glossary-back-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .glossary-title {
      font-size: 22px;
      font-weight: 700;
      margin: 0;
    }

    .glossary-close {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      font-size: 24px;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease;
      flex-shrink: 0;
    }

    .glossary-close:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .glossary-search {
      padding: 16px;
      border-bottom: 1px solid #e5e7eb;
      flex-shrink: 0;
    }

    .glossary-search-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.2s ease;
      box-sizing: border-box;
      margin-bottom: 12px;
    }

    .glossary-search-input:focus {
      outline: none;
      border-color: #667eea;
    }

    .glossary-filters {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      overflow-x: auto;
      padding-bottom: 4px;
    }

    .glossary-filters::-webkit-scrollbar {
      height: 4px;
    }

    .glossary-filters::-webkit-scrollbar-thumb {
      background: #d1d5db;
      border-radius: 2px;
    }

    .glossary-filter-tab {
      padding: 6px 14px;
      border: 2px solid #e5e7eb;
      background: white;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
      color: #6b7280;
    }

    .glossary-filter-tab:hover {
      border-color: #667eea;
      color: #667eea;
    }

    .glossary-filter-tab.active {
      background: #667eea;
      border-color: #667eea;
      color: white;
    }

    .glossary-sort {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .glossary-sort-label {
      font-size: 13px;
      font-weight: 600;
      color: #6b7280;
      white-space: nowrap;
    }

    .glossary-sort-select {
      flex: 1;
      padding: 6px 12px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      background: white;
      color: #374151;
      transition: border-color 0.2s ease;
    }

    .glossary-sort-select:focus {
      outline: none;
      border-color: #667eea;
    }

    .glossary-content {
      display: flex;
      flex: 1;
      overflow: hidden;
      min-height: 0;
    }

    .glossary-list {
      width: 300px;
      overflow-y: auto;
      border-right: 1px solid #e5e7eb;
      background: #f9fafb;
      flex-shrink: 0;
    }

    .glossary-item {
      padding: 14px 16px;
      cursor: pointer;
      border-bottom: 1px solid #e5e7eb;
      transition: background 0.2s ease;
    }

    .glossary-item:hover {
      background: #f3f4f6;
    }

    .glossary-item.active {
      background: #ede9fe;
      border-left: 4px solid #667eea;
    }

    .glossary-item-acronym {
      font-weight: 700;
      font-size: 16px;
      color: #1f2937;
      margin-bottom: 4px;
    }

    .glossary-item-full {
      font-size: 12px;
      color: #6b7280;
      line-height: 1.4;
      margin-bottom: 4px;
    }

    .glossary-item-category {
      display: inline-block;
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 12px;
      background: #dbeafe;
      color: #1e40af;
      font-weight: 600;
    }

    .glossary-detail {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      min-height: 0;
    }

    .glossary-detail-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #9ca3af;
      font-size: 16px;
      text-align: center;
      padding: 20px;
    }

    .glossary-detail-header {
      margin-bottom: 20px;
      position: relative;
    }

    .glossary-share-btn {
      position: absolute;
      top: 0;
      right: 0;
      background: #f3f4f6;
      border: 2px solid #e5e7eb;
      color: #374151;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .glossary-share-btn:hover {
      background: #667eea;
      border-color: #667eea;
      color: white;
    }

    .glossary-share-btn.copied {
      background: #10b981;
      border-color: #10b981;
      color: white;
    }

    .glossary-detail-acronym {
      font-size: 28px;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 8px 0;
      word-break: break-word;
    }

    .glossary-detail-full {
      font-size: 16px;
      color: #6b7280;
      margin: 0 0 12px 0;
      line-height: 1.5;
    }

    .glossary-detail-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 20px;
    }

    .glossary-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 600;
    }

    .glossary-badge.category {
      background: #dbeafe;
      color: #1e40af;
    }

    .glossary-badge.status-active {
      background: #d1fae5;
      color: #065f46;
    }

    .glossary-badge.status-obsolete {
      background: #fee2e2;
      color: #991b1b;
    }

    .glossary-badge.status-development {
      background: #fef3c7;
      color: #92400e;
    }

    .glossary-badge.language {
      background: #f3e8ff;
      color: #6b21a8;
    }

    .glossary-badge.year {
      background: #e0e7ff;
      color: #3730a3;
    }

    .glossary-detail-description {
      font-size: 15px;
      line-height: 1.6;
      color: #374151;
      margin-bottom: 20px;
    }

    .glossary-detail-section {
      margin-bottom: 24px;
    }

    .glossary-detail-section-title {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 12px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .glossary-detail-aliases {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .glossary-alias {
      background: #f3f4f6;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 14px;
      color: #374151;
      font-weight: 500;
    }

    .glossary-nations {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .glossary-nation {
      background: #fef3c7;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 14px;
      color: #78350f;
      font-weight: 500;
    }

    .glossary-related-terms {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .glossary-related-term {
      background: #ede9fe;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 14px;
      color: #5b21b6;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
    }

    .glossary-related-term:hover {
      background: #ddd6fe;
      border-color: #7c3aed;
    }

    .glossary-detail-gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }

    .glossary-detail-gallery-item {
      width: 100%;
      aspect-ratio: 16/9;
      border-radius: 8px;
      object-fit: cover;
      cursor: pointer;
      transition: transform 0.2s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .glossary-detail-gallery-item:hover {
      transform: scale(1.05);
    }

    .glossary-detail-video {
      width: 100%;
      max-width: 100%;
      aspect-ratio: 16/9;
      border-radius: 8px;
      margin-bottom: 20px;
      border: none;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .glossary-detail-links {
      margin-top: 20px;
    }

    .glossary-detail-link {
      display: inline-block;
      color: #667eea;
      text-decoration: none;
      padding: 8px 16px;
      border: 2px solid #667eea;
      border-radius: 8px;
      margin: 0 8px 8px 0;
      transition: all 0.2s ease;
      font-weight: 500;
      font-size: 14px;
    }

    .glossary-detail-link:hover {
      background: #667eea;
      color: white;
    }

    .glossary-documents {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .glossary-document {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
      text-decoration: none;
      color: #374151;
      transition: all 0.2s ease;
      border: 2px solid #e5e7eb;
    }

    .glossary-document:hover {
      background: #f3f4f6;
      border-color: #667eea;
    }

    .glossary-document-icon {
      font-size: 20px;
    }

    .glossary-document-name {
      flex: 1;
      font-weight: 500;
      font-size: 14px;
    }

    .glossary-no-results {
      padding: 40px 16px;
      text-align: center;
      color: #9ca3af;
    }

    .glossary-lightbox {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }

    .glossary-lightbox.show {
      opacity: 1;
      pointer-events: auto;
    }

    .glossary-lightbox-image {
      max-width: 90%;
      max-height: 90%;
      border-radius: 8px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    .glossary-lightbox-close {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      font-size: 32px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease;
    }

    .glossary-lightbox-close:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    @media (max-width: 768px) {
      .glossary-overlay {
        padding: 0;
      }

      .glossary-modal {
        max-width: 100%;
        height: 100vh;
        margin: 0;
        border-radius: 0;
      }

      .glossary-header {
        border-radius: 0;
        padding: 16px;
      }

      .glossary-title {
        font-size: 18px;
      }

      .glossary-close {
        width: 32px;
        height: 32px;
        font-size: 20px;
      }

      .glossary-back-btn {
        width: 32px;
        height: 32px;
        font-size: 18px;
      }

      .glossary-search {
        padding: 12px;
        transition: transform 0.3s ease, opacity 0.3s ease;
      }

      .glossary-search.hidden {
        transform: translateX(-100%);
        opacity: 0;
        visibility: hidden;
        position: absolute;
        pointer-events: none;
      }

      .glossary-search-input {
        padding: 10px 12px;
        font-size: 16px;
        margin-bottom: 10px;
      }

      .glossary-filters {
        margin-bottom: 10px;
      }

      .glossary-filter-tab {
        font-size: 12px;
        padding: 5px 12px;
      }

      .glossary-sort {
        flex-direction: column;
        align-items: stretch;
        gap: 6px;
      }

      .glossary-sort-label {
        font-size: 12px;
      }

      .glossary-sort-select {
        width: 100%;
        font-size: 12px;
      }

      .glossary-content {
        position: relative;
      }

      .glossary-list {
        width: 100%;
        border-right: none;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        transition: transform 0.3s ease;
        z-index: 1;
      }

      .glossary-list.hidden {
        transform: translateX(-100%);
      }

      .glossary-detail {
        width: 100%;
        padding: 20px 16px;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        transition: transform 0.3s ease;
        z-index: 2;
        transform: translateX(100%);
        background: white;
        box-sizing: border-box;
      }

      .glossary-detail.show {
        transform: translateX(0);
      }

      .glossary-back-btn.show {
        display: flex;
      }

      .glossary-item {
        padding: 12px;
      }

      .glossary-item-acronym {
        font-size: 15px;
      }

      .glossary-item-full {
        font-size: 11px;
      }

      .glossary-share-btn {
        position: static;
        margin-bottom: 12px;
        width: 100%;
        justify-content: center;
      }

      .glossary-detail-acronym {
        font-size: 24px;
      }

      .glossary-detail-full {
        font-size: 14px;
      }

      .glossary-detail-description {
        font-size: 14px;
      }

      .glossary-detail-link {
        font-size: 13px;
        padding: 6px 12px;
      }

      .glossary-detail-gallery {
        grid-template-columns: 1fr;
      }

      .glossary-btn {
        bottom: 15px;
        right: 15px;
        padding: 12px 18px;
        font-size: 14px;
      }
    }

    @media (max-width: 480px) {
      .glossary-title {
        font-size: 16px;
      }

      .glossary-detail-acronym {
        font-size: 22px;
      }

      .glossary-btn {
        padding: 10px 16px;
        font-size: 13px;
      }
    }
  `;

  // ============================================
  // INIZIALIZZAZIONE
  // ============================================
  function init() {
    injectStyles();
    createButton();
    loadGlossaryData();
    loadTermFromURL();
  }

  function injectStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }

  function createButton() {
    const btn = document.createElement('button');
    btn.className = 'glossary-btn';
    btn.textContent = CONFIG.buttonText;
    btn.onclick = toggleGlossary;
    document.body.appendChild(btn);
  }

  // ============================================
  // CARICAMENTO DATI
  // ============================================
  async function loadGlossaryData() {
    try {
      const response = await fetch(CONFIG.jsonUrl);
      if (!response.ok) {
        throw new Error('Errore nel caricamento del glossario');
      }
      glossaryData = await response.json();
      glossaryData.sort((a, b) => a.acronym.localeCompare(b.acronym));
      
      // Estrai categorie uniche
      categories = ['Tutte', ...new Set(glossaryData.map(item => item.category).filter(Boolean))].sort();
    } catch (err) {
      console.error('Errore caricamento glossario:', err);
      // Usa dati vuoti in caso di errore
      glossaryData = [];
    }
  }

  // ============================================
  // GESTIONE MODALE
  // ============================================
  function toggleGlossary() {
    if (isOpen) {
      closeGlossary();
    } else {
      openGlossary();
    }
  }

  function openGlossary() {
    if (isOpen) return;
    isOpen = true;
    checkMobile();

    const overlay = createOverlay();
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    setTimeout(() => overlay.classList.add('show'), 10);
  }

  function closeGlossary() {
    const overlay = document.querySelector('.glossary-overlay');
    if (overlay) {
      overlay.classList.remove('show');
      setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = '';
      }, 300);
    }
    isOpen = false;
  }

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'glossary-overlay';
    overlay.onclick = (e) => {
      if (e.target === overlay) closeGlossary();
    };

    const modal = document.createElement('div');
    modal.className = 'glossary-modal';
    modal.onclick = (e) => e.stopPropagation();

    const categoriesHTML = categories.map(cat => 
      `<button class="glossary-filter-tab ${cat === 'Tutte' ? 'active' : ''}" data-category="${cat}">${cat}</button>`
    ).join('');

    modal.innerHTML = `
      <div class="glossary-header">
        <div class="glossary-header-left">
          <button class="glossary-back-btn">←</button>
          <h2 class="glossary-title">${CONFIG.title}</h2>
        </div>
        <button class="glossary-close">×</button>
      </div>
      <div class="glossary-search">
        <input type="text" class="glossary-search-input" placeholder="${CONFIG.placeholder}">
        <div class="glossary-filters">${categoriesHTML}</div>
        <div class="glossary-sort">
          <span class="glossary-sort-label">Ordina:</span>
          <select class="glossary-sort-select">
            <option value="alfabetico">Alfabetico (A-Z)</option>
            <option value="alfabetico-inv">Alfabetico (Z-A)</option>
            <option value="data-recente">Più recenti</option>
            <option value="data-vecchio">Più vecchi</option>
            <option value="categoria">Per categoria</option>
          </select>
        </div>
      </div>
      <div class="glossary-content">
        <div class="glossary-list"></div>
        <div class="glossary-detail">
          <div class="glossary-detail-empty">Seleziona un termine dalla lista</div>
        </div>
      </div>
    `;

    overlay.appendChild(modal);

    // Event listeners
    const closeBtn = modal.querySelector('.glossary-close');
    closeBtn.onclick = closeGlossary;

    const backBtn = modal.querySelector('.glossary-back-btn');
    backBtn.onclick = goBackToList;

    const searchInput = modal.querySelector('.glossary-search-input');
    searchInput.oninput = (e) => filterGlossary(e.target.value);

    const filterTabs = modal.querySelectorAll('.glossary-filter-tab');
    filterTabs.forEach(tab => {
      tab.onclick = () => setCategory(tab.dataset.category);
    });

    const sortSelect = modal.querySelector('.glossary-sort-select');
    sortSelect.onchange = (e) => setSort(e.target.value);

    window.addEventListener('resize', handleResize);

    renderList();

    return overlay;
  }

  function checkMobile() {
    isMobile = window.innerWidth <= 768;
  }

  function handleResize() {
    const wasMobile = isMobile;
    checkMobile();
    
    if (wasMobile !== isMobile) {
      const detailEl = document.querySelector('.glossary-detail');
      const backBtn = document.querySelector('.glossary-back-btn');
      const listEl = document.querySelector('.glossary-list');
      const searchEl = document.querySelector('.glossary-search');
      
      if (!isMobile) {
        detailEl.classList.remove('show');
        backBtn.classList.remove('show');
        listEl.classList.remove('hidden');
        searchEl.classList.remove('hidden');
      }
    }
  }

  function goBackToList() {
    if (!isMobile) return;
    
    const detailEl = document.querySelector('.glossary-detail');
    const backBtn = document.querySelector('.glossary-back-btn');
    const listEl = document.querySelector('.glossary-list');
    const searchEl = document.querySelector('.glossary-search');
    
    detailEl.classList.remove('show');
    backBtn.classList.remove('show');
    listEl.classList.remove('hidden');
    searchEl.classList.remove('hidden');
  }

  // ============================================
  // FILTRI E ORDINAMENTO
  // ============================================
  function setCategory(category) {
    currentCategory = category;
    
    document.querySelectorAll('.glossary-filter-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.category === category);
    });
    
    renderList(currentFilter);
  }

  function setSort(sort) {
    currentSort = sort;
    renderList(currentFilter);
  }

  function filterGlossary(query) {
    currentFilter = query;
    renderList(query);
  }

  // ============================================
  // RENDERING
  // ============================================
  function renderList(filter = '') {
    const listEl = document.querySelector('.glossary-list');
    if (!listEl) return;

    let filtered = glossaryData.filter(item => {
      const search = filter.toLowerCase().trim();
      
      if (currentCategory !== 'Tutte' && item.category !== currentCategory) {
        return false;
      }
      
      if (search) {
        if (search.length === 1) {
          return item.acronym.toLowerCase().startsWith(search);
        }
        return item.acronym.toLowerCase().includes(search) ||
               item.full.toLowerCase().includes(search);
      }
      
      return true;
    });

    filtered.sort((a, b) => {
      switch(currentSort) {
        case 'alfabetico':
          return a.acronym.localeCompare(b.acronym);
        case 'alfabetico-inv':
          return b.acronym.localeCompare(a.acronym);
        case 'data-recente':
          return (b.year || 0) - (a.year || 0);
        case 'data-vecchio':
          return (a.year || 0) - (b.year || 0);
        case 'categoria':
          const catCompare = (a.category || '').localeCompare(b.category || '');
          return catCompare !== 0 ? catCompare : a.acronym.localeCompare(b.acronym);
        default:
          return 0;
      }
    });

    if (filtered.length === 0) {
      listEl.innerHTML = '<div class="glossary-no-results">Nessun risultato trovato</div>';
      return;
    }

    listEl.innerHTML = filtered.map(item => `
      <div class="glossary-item" data-acronym="${item.acronym}">
        <div class="glossary-item-acronym">${item.acronym}</div>
        <div class="glossary-item-full">${item.full}</div>
        ${item.category ? `<span class="glossary-item-category">${item.category}</span>` : ''}
      </div>
    `).join('');

    listEl.querySelectorAll('.glossary-item').forEach(el => {
      el.onclick = () => selectItem(el.dataset.acronym);
    });
  }

  function selectItem(acronym) {
    const item = glossaryData.find(i => i.acronym === acronym);
    if (!item) return;

    document.querySelectorAll('.glossary-item').forEach(el => {
      el.classList.toggle('active', el.dataset.acronym === acronym);
    });

    const detailEl = document.querySelector('.glossary-detail');
    if (!detailEl) return;

    let html = `<div class="glossary-detail-header">`;
    html += `<button class="glossary-share-btn" data-acronym="${item.acronym}">🔗 Condividi</button>`;
    html += `<h3 class="glossary-detail-acronym">${item.acronym}</h3>`;
    html += `<p class="glossary-detail-full">${item.full}</p>`;
    
    html += `<div class="glossary-detail-meta">`;
    if (item.category) {
      html += `<span class="glossary-badge category">📁 ${item.category}</span>`;
    }
    if (item.status) {
      const statusClass = item.status.toLowerCase() === 'attivo' ? 'status-active' : 
                         item.status.toLowerCase() === 'obsoleto' ? 'status-obsolete' : 
                         'status-development';
      const statusIcon = item.status.toLowerCase() === 'attivo' ? '✓' : 
                        item.status.toLowerCase() === 'obsoleto' ? '✗' : '⚙️';
      html += `<span class="glossary-badge ${statusClass}">${statusIcon} ${item.status}</span>`;
    }
    if (item.language) {
      html += `<span class="glossary-badge language">🌐 ${item.language}</span>`;
    }
    if (item.year) {
      html += `<span class="glossary-badge year">📅 ${item.year}</span>`;
    }
    html += `</div></div>`;

    if (item.description) {
      html += `<div class="glossary-detail-description">${item.description}</div>`;
    }

    if (item.aliases && item.aliases.length > 0) {
      html += `<div class="glossary-detail-section">`;
      html += `<h4 class="glossary-detail-section-title">🏷️ Alias</h4>`;
      html += `<div class="glossary-detail-aliases">`;
      item.aliases.forEach(alias => {
        html += `<span class="glossary-alias">${alias}</span>`;
      });
      html += `</div></div>`;
    }

    if (item.nations && item.nations.length > 0) {
      html += `<div class="glossary-detail-section">`;
      html += `<h4 class="glossary-detail-section-title">🌍 Paesi</h4>`;
      html += `<div class="glossary-nations">`;
      item.nations.forEach(nation => {
        html += `<span class="glossary-nation">${nation}</span>`;
      });
      html += `</div></div>`;
    }

    if (item.gallery && item.gallery.length > 0) {
      html += `<div class="glossary-detail-section">`;
      html += `<h4 class="glossary-detail-section-title">🖼️ Galleria</h4>`;
      html += `<div class="glossary-detail-gallery">`;
      item.gallery.forEach(img => {
        html += `<img src="${img}" alt="${item.acronym}" class="glossary-detail-gallery-item" data-img="${img}">`;
      });
      html += `</div></div>`;
    }

    if (item.video) {
      html += `<div class="glossary-detail-section">`;
      html += `<h4 class="glossary-detail-section-title">🎥 Video</h4>`;
      html += `<iframe src="${item.video}" class="glossary-detail-video" allowfullscreen></iframe>`;
      html += `</div>`;
    }

    if (item.documents && item.documents.length > 0) {
      html += `<div class="glossary-detail-section">`;
      html += `<h4 class="glossary-detail-section-title">📄 Documenti</h4>`;
      html += `<div class="glossary-documents">`;
      item.documents.forEach(doc => {
        html += `<a href="${doc.url}" target="_blank" rel="noopener noreferrer" class="glossary-document">`;
        html += `<span class="glossary-document-icon">📎</span>`;
        html += `<span class="glossary-document-name">${doc.name}</span>`;
        html += `</a>`;
      });
      html += `</div></div>`;
    }

    if (item.relatedTerms && item.relatedTerms.length > 0) {
      html += `<div class="glossary-detail-section">`;
      html += `<h4 class="glossary-detail-section-title">🔗 Termini correlati</h4>`;
      html += `<div class="glossary-related-terms">`;
      item.relatedTerms.forEach(term => {
        html += `<span class="glossary-related-term" data-term="${term}">${term}</span>`;
      });
      html += `</div></div>`;
    }

    if (item.links && item.links.length > 0) {
      html += `<div class="glossary-detail-section">`;
      html += `<h4 class="glossary-detail-section-title">🌐 Link utili</h4>`;
      item.links.forEach(link => {
        html += `<a href="${link.url}" target="_blank" rel="noopener noreferrer" class="glossary-detail-link">${link.text}</a>`;
      });
      html += `</div>`;
    }

    detailEl.innerHTML = html;

    const shareBtn = detailEl.querySelector('.glossary-share-btn');
    if (shareBtn) {
      shareBtn.onclick = () => shareItem(shareBtn.dataset.acronym);
    }

    const galleryItems = detailEl.querySelectorAll('.glossary-detail-gallery-item');
    galleryItems.forEach(img => {
      img.onclick = () => openLightbox(img.dataset.img);
    });

    const relatedTerms = detailEl.querySelectorAll('.glossary-related-term');
    relatedTerms.forEach(term => {
      term.onclick = () => selectItem(term.dataset.term);
    });

    if (isMobile) {
      detailEl.classList.add('show');
      document.querySelector('.glossary-list').classList.add('hidden');
      document.querySelector('.glossary-search').classList.add('hidden');
      document.querySelector('.glossary-back-btn').classList.add('show');
    }
  }

  // ============================================
  // CONDIVISIONE
  // ============================================
  function shareItem(acronym) {
    const url = `${window.location.origin}${window.location.pathname}?term=${encodeURIComponent(acronym)}`;
    
    if (navigator.share) {
      navigator.share({
        title: `Glossario Militare - ${acronym}`,
        text: `Scopri il significato di ${acronym} nel glossario militare`,
        url: url
      }).catch(err => {
        copyToClipboard(url, acronym);
      });
    } else {
      copyToClipboard(url, acronym);
    }
  }

  function copyToClipboard(text, acronym) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showShareFeedback(acronym, true);
      }).catch(() => {
        fallbackCopy(text, acronym);
      });
    } else {
      fallbackCopy(text, acronym);
    }
  }

  function fallbackCopy(text, acronym) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showShareFeedback(acronym, true);
    } catch (err) {
      showShareFeedback(acronym, false);
    }
    document.body.removeChild(textarea);
  }

  function showShareFeedback(acronym, success) {
    const btn = document.querySelector('.glossary-share-btn');
    if (!btn) return;

    if (success) {
      btn.innerHTML = '✓ Link copiato!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = '🔗 Condividi';
        btn.classList.remove('copied');
      }, 2000);
    } else {
      btn.innerHTML = '✗ Errore';
      setTimeout(() => {
        btn.innerHTML = '🔗 Condividi';
      }, 2000);
    }
  }

  function loadTermFromURL() {
    const params = new URLSearchParams(window.location.search);
    const term = params.get('term');
    if (term) {
      openGlossary();
      setTimeout(() => {
        selectItem(term);
      }, 100);
    }
  }

  // ============================================
  // LIGHTBOX
  // ============================================
  function openLightbox(imgSrc) {
    const lightbox = document.createElement('div');
    lightbox.className = 'glossary-lightbox';
    lightbox.innerHTML = `
      <button class="glossary-lightbox-close">×</button>
      <img src="${imgSrc}" class="glossary-lightbox-image" alt="Immagine ingrandita">
    `;
    
    const closeBtn = lightbox.querySelector('.glossary-lightbox-close');
    closeBtn.onclick = closeLightbox;
    
    lightbox.onclick = (e) => {
      if (e.target === lightbox) closeLightbox();
    };
    
    document.body.appendChild(lightbox);
    setTimeout(() => lightbox.classList.add('show'), 10);
  }

  function closeLightbox() {
    const lightbox = document.querySelector('.glossary-lightbox');
    if (lightbox) {
      lightbox.classList.remove('show');
      setTimeout(() => lightbox.remove(), 300);
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

})();