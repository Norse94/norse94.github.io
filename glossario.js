// ============================================
// GLOSSARIO MILITARE
// ============================================

(function() {
  'use strict';

  // Configurazione
  const CONFIG = {
    jsonUrl: 'https://norse94.github.io/glossary_test_2000.json',
    buttonText: '📚 Glossario',
    title: 'Glossario Militare',
    placeholder: 'Cerca termine o acronimo...'
  };

  let glossaryData = [];
  let glossaryIndex = {}; // Indice hash per ricerche O(1)
  let isOpen = false;
  let currentFilter = '';
  let currentCategories = []; // Array di categorie selezionate
  let multiCategoryMode = false; // Modalità ricerca incrociata
  let currentSort = 'alfabetico';
  let isMobile = false;
  let categories = ['Tutte'];
  let filterTimeout = null; // Debounce per filtro ricerca
  let renderedItems = []; // Cache lista renderizzata

  // ============================================
  // STILI CSS
  // ============================================
  const styles = `
    /* Reset e isolamento stili glossario */
    .glossary-btn,
    .glossary-overlay,
    .glossary-overlay *,
    .glossary-modal,
    .glossary-modal * {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      box-sizing: border-box;
    }

    .glossary-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(64, 71, 86, 0.7) !important;
      z-index: 9999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      opacity: 0 !important;
      transition: opacity 0.3s ease !important;
      padding: 0 !important;
      margin: 0 !important;
      overflow: hidden !important;
    }

    .glossary-overlay.show {
      opacity: 1 !important;
    }

    .glossary-modal {
      border-radius: 6px !important;
      width: 100% !important;
      max-width: 900px !important;
      height: 90vh !important;
      display: flex !important;
      flex-direction: column !important;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
      transform: scale(0.9) !important;
      transition: transform 0.3s ease !important;
      margin: 20px !important;
      overflow: hidden !important;
    }

    .glossary-overlay.show .glossary-modal {
      transform: scale(1) !important;
    }

    .glossary-header {
      padding: 20px 24px !important;
      border-bottom: 1px solid #e5e7eb !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      background: #425F93 !important;
      color: white !important;
      flex-shrink: 0 !important;
    }

    .glossary-header-left {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
    }

    .glossary-back-btn {
      display: none !important;
      background: rgba(255, 255, 255, 0.2) !important;
      border: none !important;
      color: white !important;
      font-size: 20px !important;
      width: 36px !important;
      height: 36px !important;
      border-radius: 50% !important;
      cursor: pointer !important;
      transition: background 0.2s ease !important;
    }

    .glossary-back-btn.show {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .glossary-title {
      font-size: 22px !important;
      font-weight: 700 !important;
      margin: 0 !important;
      color: white !important;
    }

    .glossary-close {
      background: rgba(255, 255, 255, 0.2) !important;
      border: none !important;
      color: white !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      padding: 8px 12px !important;
      border-radius: 6px !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      text-decoration: underline !important;
      transition: background 0.2s ease !important;
    }

    .glossary-close:hover {
      background: rgba(255, 255, 255, 0.3) !important;
    }

    .glossary-search {
      padding: 20px !important;
      border-bottom: 1px solid #e5e7eb !important;
      background: white !important;
      height: 90px !important;
      overflow: hidden !important;
      transition: height 0.3s ease !important;
    }

    .glossary-search.expanded {
      height: auto !important;
    }

    .glossary-search-group {
      margin-bottom: 16px !important;
    }

    .glossary-search-group:last-child {
      margin-bottom: 0 !important;
    }

    .glossary-search-label {
      display: block !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      color: #374151 !important;
      margin-bottom: 8px !important;
    }

    .glossary-accordion {
      border-radius: 8px !important;
      overflow: hidden !important;
      background: white !important;
    }

 
    .glossary-accordion.open .glossary-accordion-arrow {
      transform: rotate(180deg) !important;
    }

    .glossary-accordion-content {
      max-height: 0 !important;
      overflow: hidden !important;
      transition: max-height 0.3s ease, opacity 0.3s ease !important;
      opacity: 0 !important;
    }

    .glossary-accordion.open .glossary-accordion-content {
      max-height: 500px !important;
      opacity: 1 !important;
      overflow-y: auto !important;
    }

    .glossary-accordion-body {
      padding: 16px !important;
    }

    .glossary-accordion-controls {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      margin-bottom: 12px !important;
    }

    .glossary-multi-toggle {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      color: #6b7280 !important;
      cursor: pointer !important;
      user-select: none !important;
      white-space: nowrap !important;
    }
    
    .glossary-multi-toggle span {
    color: black;
}

    .glossary-toggle-switch {
      position: relative !important;
      width: 36px !important;
      height: 20px !important;
      background: #d1d5db !important;
      border-radius: 10px !important;
      transition: background 0.3s ease !important;
      display: inline-block !important;
    }

    .glossary-toggle-switch::after {
      content: '' !important;
      position: absolute !important;
      top: 2px !important;
      left: 2px !important;
      width: 16px !important;
      height: 16px !important;
      background: white !important;
      border-radius: 50% !important;
      transition: transform 0.3s ease !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2) !important;
    }

    .glossary-toggle-switch.active {
      background: #425F93 !important;
    }

    .glossary-toggle-switch.active::after {
      transform: translateX(16px) !important;
    }

    .glossary-clear-filters {
      background: transparent !important;
      border: none !important;
      color: #ef4444 !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      padding: 4px 8px !important;
      border-radius: 4px !important;
      transition: background 0.2s ease !important;
    }

    .glossary-clear-filters:hover {
      background: #fee2e2 !important;
    }

    .glossary-clear-filters.hidden {
      display: none !important;
    }

    .glossary-filters {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
    }

    .glossary-filter-tab {
      padding: 6px 14px !important;
      border: 2px solid #e5e7eb !important;
      background: white !important;
      border-radius: 20px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      white-space: nowrap !important;
      color: #6b7280 !important;
      transition: all 0.2s ease !important;
    }

   .glossary-filter-tab.active {
      background: #425f93 !important;
      border-color: #425f93 !important;
      color: white !important;
}

   .glossary-filter-tab.selected {
      background: #ffffff !important;
      border-color: #425f93 !important;
      color: #425f93 !important;
}

    .glossary-sort-select {
      width: 100% !important;
      padding: 10px 12px !important;
      border: 2px solid #e5e7eb !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      background: white !important;
      color: #374151 !important;
      cursor: pointer !important;
    }

    .glossary-sort-select:focus {
      outline: none !important;
      border-color: #425F93 !important;
    }

    .glossary-search-input {
      width: 100% !important;
      padding: 12px 16px !important;
      border: 2px solid #e5e7eb !important;
      border-radius: 8px !important;
      font-size: 15px !important;
      display: block !important;
      background: white !important;
      color: #374151 !important;
    }

    .glossary-search-input:focus {
      outline: none !important;
      border-color: #425F93 !important;
    }

    .glossary-search-row {
      display: flex !important;
      gap: 8px !important;
      align-items: flex-end !important;
    }

    .glossary-search-input-wrapper {
      flex: 1 !important;
    }

    .glossary-toggle-filters-btn {
      background: #425F93 !important;
      border: none !important;
      color: white !important;
      padding: 12px 13px !important;
      border-radius: 6px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      white-space: nowrap !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
    }

    button.glossary-toggle-filters-btn span {
    color: white;
}

    .glossary-toggle-filters-btn span {
    color: white;
}

    .glossary-toggle-filters-btn .arrow {
      transition: transform 0.3s ease !important;
      font-size: 12px !important;
    }

    .glossary-toggle-filters-btn.open .arrow {
      transform: rotate(180deg) !important;
    }

    .glossary-filters-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      margin-bottom: 8px !important;
    }

    .glossary-filters-controls {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
    }

    .glossary-multi-toggle {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      color: #6b7280 !important;
      cursor: pointer !important;
      user-select: none !important;
      white-space: nowrap !important;
    }

    .glossary-toggle-switch {
      position: relative !important;
      width: 36px !important;
      height: 20px !important;
      background: #d1d5db !important;
      border-radius: 10px !important;
      transition: background 0.3s ease !important;
      display: inline-block !important;
    }

    .glossary-toggle-switch::after {
      content: '' !important;
      position: absolute !important;
      top: 2px !important;
      left: 2px !important;
      width: 16px !important;
      height: 16px !important;
      background: white !important;
      border-radius: 50% !important;
      transition: transform 0.3s ease !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2) !important;
    }

    .glossary-toggle-switch.active {
      background: #425f93 !important;
    }

    .glossary-toggle-switch.active::after {
      transform: translateX(16px) !important;
    }

    .glossary-clear-filters {
      background: transparent !important;
      border: none !important;
      color: #ef4444 !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      padding: 4px 8px !important;
      border-radius: 4px !important;
      transition: background 0.2s ease !important;
    }

    .glossary-clear-filters:hover {
      background: #fee2e2 !important;
    }

    .glossary-clear-filters.hidden {
      display: none !important;
    }

    .glossary-filters {
      display: flex !important;
      gap: 8px !important;
      overflow-x: auto !important;
      padding-bottom: 4px !important;
    }

    .glossary-filters::-webkit-scrollbar {
      height: 6px !important;
    }

    .glossary-filters::-webkit-scrollbar-track {
      background: #f3f4f6 !important;
      border-radius: 3px !important;
    }

    .glossary-filters::-webkit-scrollbar-thumb {
      background: #d1d5db !important;
      border-radius: 3px !important;
    }

    .glossary-filters::-webkit-scrollbar-thumb:hover {
      background: #9ca3af !important;
    }

    .glossary-filter-tab {
      padding: 6px 14px !important;
      border: 2px solid #e5e7eb !important;
      background: white !important;
      border-radius: 20px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      white-space: nowrap !important;
      color: #6b7280 !important;
      transition: all 0.2s ease !important;
    }

    .glossary-sort {
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
    }

    .glossary-sort-left {
      flex: 1 !important;
      display: flex !important;
      align-items: center !important;
      gap: 12px !important;
    }

    .glossary-sort-select {
      flex: 1 !important;
      padding: 10px 12px !important;
      border: 2px solid #e5e7eb !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      background: white !important;
      color: #374151 !important;
      cursor: pointer !important;
    }

    .glossary-sort-select:focus {
      outline: none !important;
      border-color: #667eea !important;
    }

    .glossary-sort-divider {
      width: 1px !important;
      height: 24px !important;
      background: #d1d5db !important;
      margin: 0 4px !important;
    }

    .glossary-content {
      display: flex !important;
      flex: 1 !important;
      overflow: hidden !important;
    }

    .glossary-list {
      width: 300px !important;
      overflow-y: auto !important;
      border-right: 1px solid #e5e7eb !important;
      background: #f9fafb !important;
      display: flex !important;
      flex-direction: column !important;
    }

    .glossary-list-header {
      background: #425F93 !important;
      padding: 16px !important;
      border-bottom: 2px solid #3c5580 !important;
      flex-shrink: 0 !important;
    }

    .glossary-info-btn {
      width: 100% !important;
      padding: 12px 16px !important;
      background: white !important;
      border: 2px solid white !important;
      border-radius: 8px !important;
      color: #425F93 !important;
      font-size: 14px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      margin-bottom: 10px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
    }

    .glossary-info-btn:hover {
      background: #dfebff !important;
      border-color: #dfebff !important;
      transform: translateY(-2px) !important;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
    }

    .glossary-propose-btn {
      width: 100% !important;
      padding: 10px 16px !important;
      background: rgba(255, 255, 255, 0.2) !important;
      border: 2px solid rgba(255, 255, 255, 0.5) !important;
      border-radius: 8px !important;
      color: white !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
    }

    .glossary-propose-btn:hover {
      background: rgba(255, 255, 255, 0.3) !important;
      border-color: rgba(255, 255, 255, 0.7) !important;
      transform: translateY(-2px) !important;
    }

    .glossary-list-items {
      flex: 1 !important;
      overflow-y: auto !important;
    }

    .glossary-item {
      padding: 14px 16px !important;
      cursor: pointer !important;
      border-bottom: 1px solid #e5e7eb !important;
      display: block !important;
    }

    .glossary-item:hover {
      background: #f3f4f6 !important;
    }

    .glossary-item.active {
      background: #dfebff !important;
      border-left: 4px solid #425F93 !important;
    }

    .glossary-item-acronym {
      font-weight: 700 !important;
      font-size: 16px !important;
      color: #1f2937 !important;
      margin-bottom: 4px !important;
      display: block !important;
    }

    .glossary-variant-badge {
      display: inline-block !important;
      vertical-align: super !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      color: #425F93 !important;
      margin-left: 2px !important;
    }

    .glossary-item-full {
      font-size: 12px !important;
      color: #6b7280 !important;
      margin-bottom: 4px !important;
      display: block !important;
    }

    .glossary-item-category {
      display: inline-block !important;
      font-size: 10px !important;
      padding: 2px 8px !important;
      border-radius: 12px !important;
      background: #dfebff !important;
      color: #425F93 !important;
      font-weight: 600 !important;
    }

    .glossary-detail {
      flex: 1 !important;
      overflow-y: auto !important;
      padding: 20px !important;
      background: white !important;
    }

    .glossary-detail-empty {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      height: 100% !important;
      color: #6b7280 !important;
      font-size: 16px !important;
      text-align: center !important;
      padding: 40px !important;
    }

    .glossary-welcome-content {
      all: revert !important;
      max-width: 600px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif !important;
    }

    .glossary-welcome-content * {
      all: revert !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif !important;
    }

    .glossary-welcome-title {
      all: revert !important;
      font-size: 32px !important;
      font-weight: 700 !important;
      color: #1f2937 !important;
      margin: 0 0 16px 0 !important;
    }

    .glossary-welcome-text {
      all: revert !important;
      font-size: 16px !important;
      line-height: 1.6 !important;
      color: #6b7280 !important;
      margin: 0 0 24px 0 !important;
    }

    .glossary-welcome-features {
      all: revert !important;
      text-align: left !important;
      margin: 0 0 24px 0 !important;
      padding: 0 !important;
      list-style: none !important;
    }

    .glossary-welcome-feature {
      all: revert !important;
      display: flex !important;
      align-items: flex-start !important;
      gap: 12px !important;
      margin-bottom: 12px !important;
      font-size: 14px !important;
      color: #374151 !important;
    }

    .glossary-welcome-icon {
      all: revert !important;
      font-size: 20px !important;
      flex-shrink: 0 !important;
    }

    .glossary-welcome-cta {
      all: revert !important;
      font-size: 14px !important;
      color: #6b7280 !important;
      margin-top: 24px !important;
      padding-top: 0 !important;
      border-top: none !important;
    }

    .glossary-welcome-cta strong {
      all: revert !important;
      font-weight: 700 !important;
    }

    .glossary-info-page * {
      all: revert !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif !important;
      box-sizing: border-box !important;
    }

    .glossary-share-buttons {
      display: flex !important;
      gap: 8px !important;
      margin: 12px 0 !important;
    }

    .glossary-share-btn {
      background: #f3f4f6 !important;
      border: 2px solid #e5e7eb !important;
      color: #374151 !important;
      padding: 6px 12px !important;
      border-radius: 8px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      flex: 1 !important;
      justify-content: center !important;
    }

    .glossary-share-btn:hover {
      background: #425F93 !important;
      border-color: #425F93 !important;
      color: white !important;
    }

    .glossary-share-btn.copied {
      background: #10b981 !important;
      border-color: #10b981 !important;
      color: white !important;
    }

    .glossary-share-btn.web-share {
      background: #dfebff !important;
      border-color: #425F93 !important;
      color: #425F93 !important;
    }

    .glossary-share-btn.web-share:hover {
      background: #425F93 !important;
      border-color: #425F93 !important;
      color: white !important;
    }

    .glossary-detail-acronym {
      font-size: 28px !important;
      font-weight: 700 !important;
      color: #1f2937 !important;
      margin: 0 !important;
      display: block !important;
    }

    .glossary-detail-full {
      font-size: 16px !important;
      color: #6b7280 !important;
      margin: 6px 0 !important;
      display: block !important;
    }

    .glossary-detail-meta {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
      margin: 12px 0 !important;
    }

    .glossary-badge {
      display: inline-flex !important;
      padding: 4px 12px !important;
      border-radius: 16px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
    }

    .glossary-badge.category {
      background: #dfebff !important;
      color: #425F93 !important;
    }

    .glossary-badge.status-active {
      background: #d1fae5 !important;
      color: #065f46 !important;
    }

    .glossary-badge.status-obsolete {
      background: #fee2e2 !important;
      color: #991b1b !important;
    }

    .glossary-badge.language {
      background: #f3e8ff !important;
      color: #6b21a8 !important;
    }

    .glossary-badge.year {
      background: #dfebff !important;
      color: #425F93 !important;
    }

    .glossary-detail-description {
      font-size: 15px !important;
      line-height: 1.6 !important;
      color: #374151 !important;
      margin-bottom: 20px !important;
    }

    .glossary-detail-section {
      margin: 12px 0 !important;
    }

    .glossary-detail-section-title {
      font-size: 16px !important;
      font-weight: 600 !important;
      color: #1f2937 !important;
      margin: 12px 0 !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    }

    .glossary-media-gallery {
      display: flex !important;
      gap: 12px !important;
      overflow-x: auto !important;
      padding: 8px 0 !important;
      scroll-behavior: smooth !important;
    }

    .glossary-media-gallery::-webkit-scrollbar {
      height: 8px !important;
    }

    .glossary-media-gallery::-webkit-scrollbar-track {
      background: #f3f4f6 !important;
      border-radius: 4px !important;
    }

    .glossary-media-gallery::-webkit-scrollbar-thumb {
      background: #d1d5db !important;
      border-radius: 4px !important;
    }

    .glossary-media-gallery::-webkit-scrollbar-thumb:hover {
      background: #9ca3af !important;
    }

    .glossary-media-item {
      flex-shrink: 0 !important;
      width: 200px !important;
      height: 150px !important;
      border-radius: 8px !important;
      overflow: hidden !important;
      cursor: pointer !important;
      position: relative !important;
      background: #f3f4f6 !important;
      transition: transform 0.2s ease, box-shadow 0.2s ease !important;
    }

    .glossary-media-item:hover {
      transform: scale(1.05) !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
      cursor: pointer !important;
    }

    .glossary-media-item img {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      display: block !important;
      cursor: pointer !important;
    }

    .glossary-media-item iframe {
      width: 100% !important;
      height: 100% !important;
      border: none !important;
      display: block !important;
      pointer-events: none !important;
    }

    .glossary-media-play-icon {
      position: absolute !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      width: 50px !important;
      height: 50px !important;
      background: rgba(0, 0, 0, 0.7) !important;
      border-radius: 50% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: white !important;
      font-size: 24px !important;
    }

    .glossary-media-lightbox {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(0, 0, 0, 0.95) !important;
      z-index: 99999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      opacity: 0 !important;
      transition: opacity 0.3s ease !important;
      padding: 20px !important;
    }

    .glossary-media-lightbox.show {
      opacity: 1 !important;
    }

    .glossary-media-lightbox-content {
      position: relative !important;
      max-width: 90vw !important;
      max-height: 90vh !important;
      background: black !important;
      border-radius: 8px !important;
      overflow: hidden !important;
    }

    .glossary-media-lightbox-content img {
      max-width: 100% !important;
      max-height: 90vh !important;
      display: block !important;
      margin: 0 auto !important;
    }

    .glossary-media-lightbox-content iframe {
      width: 80vw !important;
      height: 45vw !important;
      max-width: 1280px !important;
      max-height: 720px !important;
      border: none !important;
      display: block !important;
    }

    .glossary-media-lightbox-close {
      position: absolute !important;
      top: 20px !important;
      right: 20px !important;
      width: 40px !important;
      height: 40px !important;
      background: rgba(255, 255, 255, 0.2) !important;
      border: none !important;
      border-radius: 50% !important;
      color: white !important;
      font-size: 24px !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: background 0.2s ease !important;
      z-index: 1 !important;
    }

    .glossary-media-lightbox-close:hover {
      background: rgba(255, 255, 255, 0.3) !important;
    }

    .glossary-media-lightbox-nav {
      position: absolute !important;
      top: 50% !important;
      transform: translateY(-50%) !important;
      width: 50px !important;
      height: 50px !important;
      background: rgba(255, 255, 255, 0.2) !important;
      border: none !important;
      border-radius: 50% !important;
      color: white !important;
      font-size: 24px !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: background 0.2s ease !important;
      z-index: 1 !important;
    }

    .glossary-media-lightbox-nav:hover {
      background: rgba(255, 255, 255, 0.3) !important;
    }

    .glossary-media-lightbox-nav.prev {
      left: 20px !important;
    }

    .glossary-media-lightbox-nav.next {
      right: 20px !important;
    }

    .glossary-media-lightbox-counter {
      position: absolute !important;
      bottom: 20px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background: rgba(0, 0, 0, 0.7) !important;
      color: white !important;
      padding: 8px 16px !important;
      border-radius: 20px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
    }

    @media (max-width: 768px) {
      .glossary-media-item {
        width: 160px !important;
        height: 120px !important;
        cursor: pointer !important;
      }

      .glossary-media-lightbox-content iframe {
        width: 90vw !important;
        height: 50.625vw !important;
      }
    }

    .glossary-detail-aliases,
    .glossary-nations,
    .glossary-related-terms {
      display: flex !important;
      flex-wrap: wrap !important;
      gap: 8px !important;
      margin: 12px 0 !important;
    }

    .glossary-alias,
    .glossary-nation,
    .glossary-related-term {
      padding: 6px 12px !important;
      border-radius: 8px !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      display: inline-block !important;
    }

    .glossary-alias {
      background: #f3f4f6 !important;
      color: #374151 !important;
    }

    .glossary-nation {
      background: #fef3c7 !important;
      color: #78350f !important;
    }

    .glossary-related-term {
      background: #dfebff !important;
      color: #425F93 !important;
      cursor: pointer !important;
      border: 2px solid transparent !important;
    }

    .glossary-related-term:hover {
      background: white !important;
      border-color: #425F93 !important;
    }

    .glossary-detail-links,
    .glossary-detail-documents {
      display: block !important;
      margin: 12px 0 !important;
    }

    .glossary-detail-link,
    .glossary-detail-document {
      display: inline-block !important;
      color: #425F93 !important;
      padding: 8px 16px !important;
      border: 2px solid #425F93 !important;
      border-radius: 8px !important;
      margin: 0 8px 8px 0 !important;
      font-weight: 500 !important;
      font-size: 14px !important;
      text-decoration: none !important;
    }

    .glossary-detail-link:hover,
    .glossary-detail-document:hover {
      background: #425F93 !important;
      color: white !important;
      cursor: pointer !important;
    }

    .glossary-detail-document {
      border-color: #10b981 !important;
      color: #10b981 !important;
    }

    .glossary-detail-document:hover {
      background: #10b981 !important;
      color: white !important;
    }

    .glossary-no-results {
      padding: 40px 16px !important;
      text-align: center !important;
      color: #6b7280 !important;
      font-size: 15px !important;
      line-height: 1.6 !important;
    }

    .glossary-no-results-link {
      color: #425F93 !important;
      font-weight: 600 !important;
      text-decoration: underline !important;
      cursor: pointer !important;
      transition: color 0.2s ease !important;
    }

    .glossary-no-results-link:hover {
      color: #3c5580 !important;
    }

    .glossary-loading-screen {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: rgba(66, 95, 147, 0.95) !important;
      z-index: 10000 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      opacity: 1 !important;
      transition: opacity 0.3s ease !important;
    }

    .glossary-loading-screen.hide {
      opacity: 0 !important;
      pointer-events: none !important;
    }

    .glossary-loading-spinner {
      width: 60px !important;
      height: 60px !important;
      border: 4px solid rgba(255, 255, 255, 0.3) !important;
      border-top: 4px solid white !important;
      border-radius: 50% !important;
      animation: glossary-spin 1s linear infinite !important;
      margin-bottom: 24px !important;
    }

    @keyframes glossary-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .glossary-loading-text {
      color: white !important;
      font-size: 18px !important;
      font-weight: 600 !important;
      margin-bottom: 8px !important;
    }

    .glossary-loading-subtext {
      color: rgba(255, 255, 255, 0.8) !important;
      font-size: 14px !important;
    }

    @media (max-width: 768px) {
      .glossary-overlay {
        align-items: stretch !important;
        justify-content: stretch !important;
      }

      .glossary-modal {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        max-height: none !important;
        min-height: 100% !important;
        margin: 0 !important;
        border-radius: 0 !important;
        transform: none !important;
      }
      
      .glossary-overlay.show .glossary-modal {
        transform: none !important;
      }

      .glossary-search.hidden {
        transform: translateX(-100%) !important;
        opacity: 0 !important;
        visibility: hidden !important;
        position: absolute !important;
      }

      .glossary-content {
        position: relative !important;
      }

      .glossary-list {
        width: 100% !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        transition: transform 0.3s ease !important;
      }

      .glossary-list.hidden {
        transform: translateX(-100%) !important;
      }

      .glossary-detail {
        width: 100% !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        transform: translateX(100%) !important;
        transition: transform 0.3s ease !important;
      }

      .glossary-detail.show {
        transform: translateX(0) !important;
      }

      .glossary-share-buttons {
        flex-direction: column !important;
      }

      .glossary-share-btn {
        width: 100% !important;
        justify-content: center !important;
      }
    }
  `;

  // ============================================
  // INIZIALIZZAZIONE
  // ============================================
  function init() {
    injectStyles();
    addMenuLink();
    loadGlossaryData();
    loadTermFromURL();
  }

  function injectStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }

  function addMenuLink() {
    // 1. Cerca l'elemento <li class="menu"> con il link a #notifications
    const notificationsLi = document.querySelector('ul.left li.menu a[href="#notifications"]');
    
    if (notificationsLi && notificationsLi.parentElement) {
      // Crea il nuovo <li> per il glossario
      const glossarioLi = document.createElement('li');
      const glossarioLink = document.createElement('a');
      glossarioLink.href = '#glossario';
      glossarioLink.textContent = 'Glossario';
      
      // Previeni comportamento default e apri il glossario
      glossarioLink.onclick = (e) => {
        e.preventDefault();
        openGlossary();
      };
      
      glossarioLi.appendChild(glossarioLink);
      
      // Inserisci dopo l'elemento notifiche
      notificationsLi.parentElement.insertAdjacentElement('afterend', glossarioLi);
      
      console.log('Link Glossario aggiunto al menu');
    } else {
      console.log('Elemento menu notifiche non trovato');
    }

    // 2. Cerca l'elemento <li id="nav-title">
    const navTitle = document.getElementById('nav-title');
    
    if (navTitle) {
      // Crea un nuovo <li> con il pulsante icona
      const glossarioBtnLi = document.createElement('li');
      glossarioBtnLi.style.cssText = 'display: inline-flex; align-items: center; margin-left: 10px;';
      
      const glossarioBtn = document.createElement('button');
      glossarioBtn.style.cssText = `
        background: transparent;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        padding: 8px 12px;
        display: inline-flex;
        align-items: center;
        transition: opacity 0.2s ease;
      `;
      glossarioBtn.title = 'Apri Glossario';
      glossarioBtn.innerHTML = '<i class="fa-solid fa-book-atlas"></i>';
      
      // Hover effect
      glossarioBtn.onmouseenter = () => {
        glossarioBtn.style.opacity = '0.7';
      };
      glossarioBtn.onmouseleave = () => {
        glossarioBtn.style.opacity = '1';
      };
      
      // Click per aprire glossario
      glossarioBtn.onclick = (e) => {
        e.preventDefault();
        openGlossary();
      };
      
      glossarioBtnLi.appendChild(glossarioBtn);
      
      // Inserisci dopo nav-title
      navTitle.insertAdjacentElement('afterend', glossarioBtnLi);
      
      console.log('Pulsante icona Glossario aggiunto dopo nav-title');
    } else {
      console.log('Elemento nav-title non trovato');
    }
  }

  // ============================================
  // CARICAMENTO DATI
  // ============================================
  async function loadGlossaryData() {
    try {
      // Se c'è già un caricamento in corso, aspetta quello
      if (window.sharedGlossaryDataPromise) {
        console.log('%c📚 GLOSSARIO: Aspetto caricamento in corso...', 'background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold');
        glossaryData = await window.sharedGlossaryDataPromise;
        console.log('%c📚 GLOSSARIO: Uso dati appena caricati (cache condivisa) - Evito fetch duplicato!', 'background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold');
        console.log(`   ↳ Termini disponibili: ${glossaryData.length}`);
        return;
      }

      // Controlla se i dati sono già stati caricati
      if (window.sharedGlossaryData && window.sharedGlossaryData.length > 0) {
        console.log('%c📚 GLOSSARIO: Uso dati già caricati (cache condivisa) - Evito fetch duplicato!', 'background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold');
        console.log(`   ↳ Termini disponibili: ${window.sharedGlossaryData.length}`);
        glossaryData = window.sharedGlossaryData;
        return;
      }

      // Primo caricamento - crea la Promise condivisa
      console.log('%c📚 GLOSSARIO: Carico dati da JSON (primo caricamento)', 'background: #3b82f6; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold');
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

      glossaryData.sort((a, b) => a.acronym.localeCompare(b.acronym));

      // Costruisci indice hash per ricerche rapide
      buildGlossaryIndex();

      const otherCategories = [...new Set(glossaryData.flatMap(item => {
        if (Array.isArray(item.category)) {
          return item.category;
        } else if (item.category) {
          return [item.category];
        }
        return [];
      }))].sort();

      categories = ['Tutte', ...otherCategories];
    } catch (err) {
      console.error('Errore caricamento glossario:', err);
      glossaryData = [];
    }
  }

  // Costruisce un indice hash per ricerche O(1)
  function buildGlossaryIndex() {
    // Usa indice condiviso se disponibile
    if (window.sharedGlossaryIndex) {
      console.log('🔍 Uso indice condiviso dal tooltip');
      glossaryIndex = window.sharedGlossaryIndex;
      return;
    }

    glossaryIndex = {};

    glossaryData.forEach(term => {
      const key = term.acronym.toLowerCase();

      // Crea array se non esiste
      if (!glossaryIndex[key]) {
        glossaryIndex[key] = [];
      }

      // Aggiungi il termine (può avere varianti)
      glossaryIndex[key].push(term);
    });

    // Condividi indice globalmente
    window.sharedGlossaryIndex = glossaryIndex;
    console.log(`🔍 Indice hash creato: ${Object.keys(glossaryIndex).length} chiavi univoche`);
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

    // Mostra schermata di caricamento
    const loadingScreen = createLoadingScreen();
    document.body.appendChild(loadingScreen);

    // Blocca scroll
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    createOverlay().then(overlay => {
      document.body.appendChild(overlay);

      renderList();

      // Mostra overlay
      setTimeout(() => overlay.classList.add('show'), 10);

      // Nascondi schermata di caricamento dopo che l'overlay è visibile
      setTimeout(() => {
        loadingScreen.classList.add('hide');
        setTimeout(() => loadingScreen.remove(), 300);
      }, 100);
    });
  }

  function createLoadingScreen() {
    const loadingScreen = document.createElement('div');
    loadingScreen.className = 'glossary-loading-screen';
    loadingScreen.innerHTML = `
      <div class="glossary-loading-spinner"></div>
      <div class="glossary-loading-text">Caricamento glossario...</div>
      <div class="glossary-loading-subtext">Preparazione dei dati</div>
    `;
    return loadingScreen;
  }

  function closeGlossary() {
    const overlay = document.querySelector('.glossary-overlay');
    if (overlay) {
      overlay.classList.remove('show');
      setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }, 300);
    }
    isOpen = false;
  }

  async function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'glossary-overlay';
    overlay.onclick = (e) => {
      if (e.target === overlay) closeGlossary();
    };

    const modal = document.createElement('div');
    modal.className = 'glossary-modal';
    modal.onclick = (e) => e.stopPropagation();

    if (glossaryData.length === 0) {
      await loadGlossaryData();
    }

    const categoriesHTML = categories.map(cat => 
      `<button class="glossary-filter-tab ${cat === 'Tutte' ? 'active' : ''}" data-category="${cat}">${cat}</button>`
    ).join('');

    modal.innerHTML = `
      <div class="glossary-header">
        <div class="glossary-header-left">
          <button class="glossary-back-btn">←</button>
          <h2 class="glossary-title">${CONFIG.title}</h2>
        </div>
        <button class="glossary-close">Chiudi</button>
      </div>
      <div class="glossary-search">
        <div class="glossary-search-group">
          <div class="glossary-search-row">
            <div class="glossary-search-input-wrapper">
              <input type="text" class="glossary-search-input" placeholder="${CONFIG.placeholder}">
            </div>
            <button class="glossary-toggle-filters-btn">
              <span>Filtri</span>
              <span class="arrow">▼</span>
            </button>
          </div>
        </div>

        <div class="glossary-search-group">
          <div class="glossary-accordion">
            <div class="glossary-accordion-header" style="display: none;">
              <span class="glossary-accordion-title">⚙️ Filtri e ordinamento</span>
              <span class="glossary-accordion-arrow">▼</span>
            </div>
            <div class="glossary-accordion-content">
              <div class="glossary-accordion-body">
                <label class="glossary-search-label" style="margin-bottom: 8px;">📁 Filtra per categorie</label>
                <div class="glossary-accordion-controls">
                  <div class="glossary-multi-toggle">
                    <span class="glossary-toggle-switch"></span>
                    <span>Ricerca incrociata</span>
                  </div>
                  <button class="glossary-clear-filters hidden">✕ Azzera</button>
                </div>
                <div class="glossary-filters">${categoriesHTML}</div>
                
                <div style="height: 16px;"></div>
                
                <label class="glossary-search-label" style="margin-bottom: 8px;">⚡ Ordina risultati</label>
                <select class="glossary-sort-select">
                  <option value="alfabetico">Alfabetico (A-Z)</option>
                  <option value="alfabetico-inv">Alfabetico (Z-A)</option>
                  <option value="data-recente">Più recenti</option>
                  <option value="data-vecchio">Più vecchi</option>
                  <option value="categoria">Per categoria</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="glossary-content">
        <div class="glossary-list">
          <div class="glossary-list-header">
            <button class="glossary-info-btn" id="glossaryInfoBtn">
              ℹ️ Cos'è questo glossario?
            </button>
            <button class="glossary-propose-btn" id="glossaryProposeBtn">
              ✏️ Proponi nuovi termini
            </button>
          </div>
          <div class="glossary-list-items"></div>
        </div>
        <div class="glossary-detail">
          <div class="glossary-detail-empty">
            <div class="glossary-welcome-content">
              <h2 class="glossary-welcome-title">📚 Benvenuto nel Glossario Militare</h2>
              <hr style="all: revert !important; border: none !important; border-top: 2px solid #e5e7eb !important; margin: 20px 0 24px 0 !important;">
              <p class="glossary-welcome-text">
                Un database di acronimi, termini e concetti del mondo militare italiano e internazionale.
              </p>
              <div class="glossary-welcome-features">
                <div class="glossary-welcome-feature">
                  <span class="glossary-welcome-icon">🔍</span>
                  <span>Cerca tra migliaia di termini usando la barra di ricerca</span>
                </div>
                <div class="glossary-welcome-feature">
                  <span class="glossary-welcome-icon">📁</span>
                  <span>Filtra per categoria per trovare rapidamente ciò che cerchi</span>
                </div>
                <div class="glossary-welcome-feature">
                  <span class="glossary-welcome-icon">🔗</span>
                  <span>Ogni termine può includere descrizioni, immagini, video e link utili</span>
                </div>
                <div class="glossary-welcome-feature">
                  <span class="glossary-welcome-icon">🔄</span>
                  <span>Database con nuovi termini aggiunti periodicamente</span>
                </div>
              </div>
              <p class="glossary-welcome-cta">
                <strong>Inizia subito:</strong> seleziona un termine dalla lista a sinistra o usa la ricerca per trovare ciò che ti interessa.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    overlay.appendChild(modal);

    const closeBtn = modal.querySelector('.glossary-close');
    closeBtn.onclick = closeGlossary;

    const backBtn = modal.querySelector('.glossary-back-btn');
    backBtn.onclick = goBackToList;

    const searchInput = modal.querySelector('.glossary-search-input');
    searchInput.oninput = (e) => filterGlossary(e.target.value);

    const toggleFiltersBtn = modal.querySelector('.glossary-toggle-filters-btn');
    toggleFiltersBtn.onclick = toggleAccordion;

    const infoBtn = modal.querySelector('#glossaryInfoBtn');
    infoBtn.onclick = showGlossaryInfo;

    const proposeBtn = modal.querySelector('#glossaryProposeBtn');
    proposeBtn.onclick = () => {
      window.open('https://difesa.forumfree.it/?t=79610194', '_blank', 'noopener,noreferrer');
    };

    const accordion = modal.querySelector('.glossary-accordion');
    const accordionHeader = accordion.querySelector('.glossary-accordion-header');
    if (accordionHeader && accordionHeader.style.display !== 'none') {
      accordionHeader.onclick = toggleAccordion;
    }

    const filterTabs = modal.querySelectorAll('.glossary-filter-tab');
    filterTabs.forEach(tab => {
      tab.onclick = () => toggleCategory(tab.dataset.category);
    });

    const clearFiltersBtn = modal.querySelector('.glossary-clear-filters');
    clearFiltersBtn.onclick = clearFilters;

    const multiToggle = modal.querySelector('.glossary-multi-toggle');
    if (multiToggle) {
      multiToggle.onclick = toggleMultiCategoryMode;
    }

    const sortSelect = modal.querySelector('.glossary-sort-select');
    sortSelect.onchange = (e) => setSort(e.target.value);

    window.addEventListener('resize', handleResize);

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
      
      if (!isMobile && detailEl && backBtn && listEl && searchEl) {
        detailEl.classList.remove('show');
        backBtn.classList.remove('show');
        listEl.classList.remove('hidden');
        searchEl.classList.remove('hidden');
      }
    }
  }

  function showGlossaryInfo() {
    const detailEl = document.querySelector('.glossary-detail');
    if (!detailEl) return;

    // Salva il contenuto originale della schermata di benvenuto
    const welcomeContent = document.querySelector('.glossary-welcome-content');
    if (welcomeContent && !window.glossaryWelcomeBackup) {
      window.glossaryWelcomeBackup = welcomeContent.cloneNode(true);
    }

    const infoContainer = document.createElement('div');
    infoContainer.className = 'glossary-info-page';

    infoContainer.innerHTML = `
      <h2 style="all: revert !important; font-size: 28px !important; font-weight: 700 !important; color: #1f2937 !important; margin: 0 0 20px 0 !important;">
        📚 Informazioni sul Glossario Militare
      </h2>

      <div style="all: revert !important; background: #f0f5ff !important; border-left: 4px solid #425F93 !important; padding: 16px !important; border-radius: 8px !important; margin-bottom: 24px !important;">
        <p style="all: revert !important; margin: 0 !important; font-size: 15px !important; line-height: 1.6 !important; color: #374151 !important;">
          <strong>Cos'è questo glossario?</strong><br>
          Un database di acronimi, sigle e termini del mondo militare italiano e internazionale.
        </p>
      </div>

      <h3 style="all: revert !important; font-size: 20px !important; font-weight: 600 !important; color: #1f2937 !important; margin: 24px 0 12px 0 !important;">
        🎯 Caratteristiche principali
      </h3>

      <ul style="all: revert !important; list-style: none !important; padding: 0 !important; margin: 0 0 24px 0 !important;">
        <li style="all: revert !important; padding: 12px 0 !important; border-bottom: 1px solid #e5e7eb !important;">
          <strong style="all: revert !important; color: #425F93 !important;">🔍 Ricerca avanzata</strong><br>
          <span style="all: revert !important; font-size: 14px !important; color: #6b7280 !important;">Cerca per acronimo o per significato completo</span>
        </li>
        <li style="all: revert !important; padding: 12px 0 !important; border-bottom: 1px solid #e5e7eb !important;">
          <strong style="all: revert !important; color: #425F93 !important;">📁 Filtraggio per categorie</strong><br>
          <span style="all: revert !important; font-size: 14px !important; color: #6b7280 !important;">Organizzazione per temi e aree militari</span>
        </li>
        <li style="all: revert !important; padding: 12px 0 !important; border-bottom: 1px solid #e5e7eb !important;">
          <strong style="all: revert !important; color: #425F93 !important;">🔄 Gestione varianti</strong><br>
          <span style="all: revert !important; font-size: 14px !important; color: #6b7280 !important;">Stesso acronimo, significati diversi</span>
        </li>
        <li style="all: revert !important; padding: 12px 0 !important; border-bottom: 1px solid #e5e7eb !important;">
          <strong style="all: revert !important; color: #425F93 !important;">🎬 Contenuti multimediali</strong><br>
          <span style="all: revert !important; font-size: 14px !important; color: #6b7280 !important;">Immagini, video e documenti allegati</span>
        </li>
        <li style="all: revert !important; padding: 12px 0 !important;">
          <strong style="all: revert !important; color: #425F93 !important;">🔗 Link e risorse</strong><br>
          <span style="all: revert !important; font-size: 14px !important; color: #6b7280 !important;">Collegamenti a fonti e approfondimenti</span>
        </li>
      </ul>

      <h3 style="all: revert !important; font-size: 20px !important; font-weight: 600 !important; color: #1f2937 !important; margin: 24px 0 12px 0 !important;">
        💡 Come usarlo
      </h3>

      <ol style="all: revert !important; padding-left: 20px !important; margin: 0 0 24px 0 !important;">
        <li style="all: revert !important; margin-bottom: 12px !important; color: #374151 !important; line-height: 1.6 !important;">
          <strong>Naviga</strong> la lista dei termini nella colonna di sinistra
        </li>
        <li style="all: revert !important; margin-bottom: 12px !important; color: #374151 !important; line-height: 1.6 !important;">
          <strong>Cerca</strong> un termine specifico usando la barra di ricerca
        </li>
        <li style="all: revert !important; margin-bottom: 12px !important; color: #374151 !important; line-height: 1.6 !important;">
          <strong>Filtra</strong> per categoria per trovare argomenti correlati
        </li>
        <li style="all: revert !important; margin-bottom: 12px !important; color: #374151 !important; line-height: 1.6 !important;">
          <strong>Clicca</strong> su un termine per vedere tutti i dettagli
        </li>
      </ol>

      <div style="all: revert !important; background: #fef3c7 !important; border-left: 4px solid #f59e0b !important; padding: 16px !important; border-radius: 8px !important; margin: 24px 0 !important;">
        <p style="all: revert !important; margin: 0 !important; font-size: 14px !important; line-height: 1.6 !important; color: #78350f !important;">
          <strong>💡 Suggerimento:</strong> Non hai trovato un termine? Usa il pulsante "Proponi nuovi termini" in alto a sinistra per segnalarcelo!
        </p>
      </div>
    `;

    detailEl.innerHTML = '';
    detailEl.appendChild(infoContainer);

    if (isMobile) {
      detailEl.classList.add('show');
      const listEl = document.querySelector('.glossary-list');
      const searchEl = document.querySelector('.glossary-search');
      const backBtn = document.querySelector('.glossary-back-btn');
      if (listEl) listEl.classList.add('hidden');
      if (searchEl) searchEl.classList.add('hidden');
      if (backBtn) backBtn.classList.add('show');
    }
  }

  function goBackToList() {
    if (!isMobile) return;

    const detailEl = document.querySelector('.glossary-detail');
    const backBtn = document.querySelector('.glossary-back-btn');
    const listEl = document.querySelector('.glossary-list');
    const searchEl = document.querySelector('.glossary-search');

    if (detailEl && backBtn && listEl && searchEl) {
      detailEl.classList.remove('show');
      backBtn.classList.remove('show');
      listEl.classList.remove('hidden');
      searchEl.classList.remove('hidden');
    }
  }

  // ============================================
  // FILTRI E ORDINAMENTO
  // ============================================
  function toggleAccordion() {
    const accordion = document.querySelector('.glossary-accordion');
    const searchContainer = document.querySelector('.glossary-search');
    const toggleBtn = document.querySelector('.glossary-toggle-filters-btn');
    
    if (accordion) {
      accordion.classList.toggle('open');
    }
    
    if (searchContainer) {
      searchContainer.classList.toggle('expanded');
    }

    if (toggleBtn) {
      toggleBtn.classList.toggle('open');
    }
  }

  function toggleMultiCategoryMode() {
    multiCategoryMode = !multiCategoryMode;
    
    // Se disattiviamo la modalità multipla, mantieni solo la prima categoria selezionata
    if (!multiCategoryMode && currentCategories.length > 1) {
      currentCategories = [currentCategories[0]];
    }
    
    updateMultiToggleUI();
    updateFilterUI();
    renderList(currentFilter);
  }

  function updateMultiToggleUI() {
    const toggleSwitch = document.querySelector('.glossary-toggle-switch');
    if (toggleSwitch) {
      toggleSwitch.classList.toggle('active', multiCategoryMode);
    }
  }

  function toggleCategory(category) {
    if (category === 'Tutte') {
      // Resetta tutti i filtri
      currentCategories = [];
      updateFilterUI();
    } else {
      if (multiCategoryMode) {
        // Modalità multipla: aggiungi/rimuovi categorie
        const index = currentCategories.indexOf(category);
        if (index > -1) {
          currentCategories.splice(index, 1);
        } else {
          currentCategories.push(category);
        }
      } else {
        // Modalità singola: seleziona solo una categoria
        if (currentCategories.includes(category)) {
          currentCategories = [];
        } else {
          currentCategories = [category];
        }
      }
      updateFilterUI();
    }
    
    renderList(currentFilter);
  }

  function clearFilters() {
    currentCategories = [];
    updateFilterUI();
    renderList(currentFilter);
  }

  function updateFilterUI() {
    const allTabs = document.querySelectorAll('.glossary-filter-tab');
    const clearBtn = document.querySelector('.glossary-clear-filters');
    
    allTabs.forEach(tab => {
      const category = tab.dataset.category;
      
      if (category === 'Tutte') {
        tab.classList.toggle('active', currentCategories.length === 0);
        tab.classList.remove('selected');
      } else {
        tab.classList.remove('active');
        tab.classList.toggle('selected', currentCategories.includes(category));
      }
    });

    // Mostra/nascondi pulsante azzera filtri
    if (clearBtn) {
      clearBtn.classList.toggle('hidden', currentCategories.length === 0);
    }
  }

  function setSort(sort) {
    currentSort = sort;
    renderList(currentFilter);
  }

  function filterGlossary(query) {
    currentFilter = query;

    // Debounce: aspetta 150ms prima di filtrare
    if (filterTimeout) {
      clearTimeout(filterTimeout);
    }

    filterTimeout = setTimeout(() => {
      renderList(query);
    }, 150);
  }

  // ============================================
  // RENDERING
  // ============================================
  function renderList(filter = '') {
    const listEl = document.querySelector('.glossary-list-items');
    if (!listEl) return;

    // Usa requestAnimationFrame per rendering più fluido
    requestAnimationFrame(() => {
      let filtered = glossaryData.filter(item => {
        const search = filter.toLowerCase().trim();

        // Filtro per categorie
        if (currentCategories.length > 0) {
          const itemCategories = Array.isArray(item.category) ? item.category : [item.category];

          if (multiCategoryMode) {
            // Modalità AND: il termine deve avere TUTTE le categorie selezionate
            const hasAllCategories = currentCategories.every(cat => itemCategories.includes(cat));
            if (!hasAllCategories) {
              return false;
            }
          } else {
            // Modalità OR: il termine deve avere ALMENO UNA delle categorie
            const hasAnyCategory = currentCategories.some(cat => itemCategories.includes(cat));
            if (!hasAnyCategory) {
              return false;
            }
          }
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
          const catCompare = (() => {
            const catA = Array.isArray(a.category) ? a.category[0] : (a.category || '');
            const catB = Array.isArray(b.category) ? b.category[0] : (b.category || '');
            return catA.localeCompare(catB);
          })();
          return catCompare !== 0 ? catCompare : a.acronym.localeCompare(b.acronym);
        default:
          return 0;
      }
    });

      if (filtered.length === 0) {
        listEl.innerHTML = '<div class="glossary-no-results">Continua a digitare. Se non hai trovato ancora nulla puoi chiedere il significato del termine <a href="https://difesa.forumfree.it/?t=79610194" target="_blank" rel="noopener noreferrer" class="glossary-no-results-link">cliccando qui</a></div>';
        renderedItems = [];
        return;
      }

      // Cache e DocumentFragment per performance
      const fragment = document.createDocumentFragment();

      filtered.forEach(item => {
        const itemCategories = Array.isArray(item.category) ? item.category : (item.category ? [item.category] : []);
        const categoryBadges = itemCategories.length > 0
          ? itemCategories.map(cat => `<span class="glossary-item-category">${cat}</span>`).join(' ')
          : '';
        const variantBadge = item.variant ? `<span class="glossary-variant-badge">${item.variant}</span>` : '';

        const div = document.createElement('div');
        div.className = 'glossary-item';
        div.dataset.acronym = item.acronym;
        div.dataset.variant = item.variant || '';
        div.innerHTML = `
          <div class="glossary-item-acronym">${item.acronym}${variantBadge}</div>
          <div class="glossary-item-full">${item.full}</div>
          ${categoryBadges}
        `;

        // Event delegation più efficiente
        div.onclick = () => selectItem(item.acronym, item.variant || '');

        fragment.appendChild(div);
      });

      // Replace in una sola operazione
      listEl.innerHTML = '';
      listEl.appendChild(fragment);
      renderedItems = filtered;
    });
  }

  function selectItem(acronym, variant = '') {
    // Usa indice hash per ricerca O(1)
    const key = acronym.toLowerCase();
    const candidates = glossaryIndex[key];

    if (!candidates || candidates.length === 0) return;

    // Cerca il termine, considerando anche la variante se presente
    let item;
    if (variant) {
      item = candidates.find(i => i.variant === parseInt(variant));
    } else {
      item = candidates.find(i => !i.variant);
      // Se non trovato senza variant, prendi il primo
      if (!item) {
        item = candidates[0];
      }
    }
    if (!item) return;

    document.querySelectorAll('.glossary-item').forEach(el => {
      const isActive = el.dataset.acronym === acronym && el.dataset.variant === (variant || '');
      el.classList.toggle('active', isActive);
    });

    const detailEl = document.querySelector('.glossary-detail');
    if (!detailEl) return;

    const variantBadge = item.variant ? `<span class="glossary-variant-badge">${item.variant}</span>` : '';
    let html = `<h3 class="glossary-detail-acronym">${item.acronym}${variantBadge}</h3>`;
    html += `<p class="glossary-detail-full">${item.full}</p>`;
    
    html += `<div class="glossary-detail-meta">`;
    const itemCategories = Array.isArray(item.category) ? item.category : (item.category ? [item.category] : []);
    itemCategories.forEach(cat => {
      html += `<span class="glossary-badge category">📁 ${cat}</span>`;
    });
    if (item.status) {
      const statusClass = item.status.toLowerCase() === 'attivo' ? 'status-active' : 'status-obsolete';
      const statusIcon = item.status.toLowerCase() === 'attivo' ? '✓' : '✗';
      html += `<span class="glossary-badge ${statusClass}">${statusIcon} ${item.status}</span>`;
    }
    if (item.language) {
      html += `<span class="glossary-badge language">🌐 ${item.language}</span>`;
    }
    if (item.year) {
      html += `<span class="glossary-badge year">📅 ${item.year}</span>`;
    }
    html += `</div>`;

    if (item.description) {
      html += `<div class="glossary-detail-description">${item.description}</div>`;
    }

    html += `<div class="glossary-share-buttons">`;
    html += `<button class="glossary-share-btn copy-link" data-acronym="${item.acronym}" data-variant="${item.variant || ''}">🔗 Copia link</button>`;
    if (navigator.share) {
      html += `<button class="glossary-share-btn web-share" data-acronym="${item.acronym}" data-variant="${item.variant || ''}">📤 Condividi</button>`;
    }
    html += `</div>`;

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

    if (item.relatedTerms && item.relatedTerms.length > 0) {
      html += `<div class="glossary-detail-section">`;
      html += `<h4 class="glossary-detail-section-title">🔗 Termini correlati</h4>`;
      html += `<div class="glossary-related-terms">`;
      item.relatedTerms.forEach(term => {
        html += `<span class="glossary-related-term" data-term="${term}">${term}</span>`;
      });
      html += `</div></div>`;
    }

    // Galleria media (immagini + video)
    const allMedia = [];
    
    if (item.images && item.images.length > 0) {
      item.images.forEach(img => {
        allMedia.push({ type: 'image', url: img.url, title: img.title || '' });
      });
    }
    
    if (item.videos && item.videos.length > 0) {
      item.videos.forEach(video => {
        allMedia.push({ type: 'video', url: video.url, title: video.title || '' });
      });
    }

    if (allMedia.length > 0) {
      html += `<div class="glossary-detail-section">`;
      html += `<h4 class="glossary-detail-section-title">🎬 Media</h4>`;
      html += `<div class="glossary-media-gallery">`;
      
      allMedia.forEach((media, index) => {
        if (media.type === 'image') {
          html += `<div class="glossary-media-item" data-index="${index}" data-type="image" data-url="${media.url}">
            <img src="${media.url}" alt="${media.title}">
          </div>`;
        } else if (media.type === 'video') {
          const videoId = extractYouTubeId(media.url);
          if (videoId) {
            html += `<div class="glossary-media-item" data-index="${index}" data-type="video" data-url="${media.url}" data-videoid="${videoId}">
              <img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" alt="${media.title}">
              <div class="glossary-media-play-icon">▶</div>
            </div>`;
          }
        }
      });
      
      html += `</div></div>`;
    }

    if (item.documents && item.documents.length > 0) {
      html += `<div class="glossary-detail-section">`;
      html += `<h4 class="glossary-detail-section-title">📄 Documenti</h4>`;
      html += `<div class="glossary-detail-documents">`;
      item.documents.forEach(doc => {
        const icon = getDocumentIcon(doc.url);
        html += `<a href="${doc.url}" target="_blank" rel="noopener noreferrer" class="glossary-detail-document">${icon} ${doc.text}</a>`;
      });
      html += `</div></div>`;
    }

    if (item.links && item.links.length > 0) {
      html += `<div class="glossary-detail-section">`;
      html += `<h4 class="glossary-detail-section-title">🌐 Link utili</h4>`;
      html += `<div class="glossary-detail-links">`;
      item.links.forEach(link => {
        html += `<a href="${link.url}" target="_blank" rel="noopener noreferrer" class="glossary-detail-link">${link.text}</a>`;
      });
      html += `</div></div>`;
    }

    detailEl.innerHTML = html;

    const copyBtn = detailEl.querySelector('.glossary-share-btn.copy-link');
    if (copyBtn) {
      copyBtn.onclick = () => copyLinkToClipboard(copyBtn.dataset.acronym, copyBtn.dataset.variant);
    }

    const webShareBtn = detailEl.querySelector('.glossary-share-btn.web-share');
    if (webShareBtn) {
      webShareBtn.onclick = () => webShareItem(webShareBtn.dataset.acronym, webShareBtn.dataset.variant);
    }

    const relatedTerms = detailEl.querySelectorAll('.glossary-related-term');
    relatedTerms.forEach(term => {
      term.onclick = () => {
        selectItem(term.dataset.term);
        // Scrolla il termine nella lista per renderlo visibile
        scrollToSelectedItem(term.dataset.term);
      };
    });

    // Setup galleria media
    const mediaItems = detailEl.querySelectorAll('.glossary-media-item');
    mediaItems.forEach(mediaItem => {
      mediaItem.onclick = () => openMediaLightbox(item, parseInt(mediaItem.dataset.index));
    });

    if (isMobile) {
      detailEl.classList.add('show');
      const listEl = document.querySelector('.glossary-list');
      const searchEl = document.querySelector('.glossary-search');
      const backBtn = document.querySelector('.glossary-back-btn');
      if (listEl) listEl.classList.add('hidden');
      if (searchEl) searchEl.classList.add('hidden');
      if (backBtn) backBtn.classList.add('show');
    }
  }

  // ============================================
  // UTILITÀ
  // ============================================
  function scrollToSelectedItem(acronym, variant = '') {
    setTimeout(() => {
      const listEl = document.querySelector('.glossary-list');
      if (!listEl) return;

      // Cerca l'elemento attivo nella lista
      const activeItem = Array.from(listEl.querySelectorAll('.glossary-item')).find(el => {
        return el.dataset.acronym === acronym && el.dataset.variant === variant;
      });

      if (activeItem) {
        // Scrolla l'elemento nella vista
        activeItem.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }, 100);
  }

  function extractYouTubeId(url) {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  }

  function getDocumentIcon(url) {
    const extension = url.split('.').pop().toLowerCase();
    const icons = {
      'pdf': '📕',
      'doc': '📘',
      'docx': '📘',
      'xls': '📗',
      'xlsx': '📗',
      'ppt': '📙',
      'pptx': '📙',
      'txt': '📄',
      'zip': '📦',
      'rar': '📦'
    };
    return icons[extension] || '📄';
  }

  // ============================================
  // LIGHTBOX MEDIA
  // ============================================
  function openMediaLightbox(item, startIndex) {
    // Costruisci array di tutti i media
    const mediaItems = [];
    
    if (item.images && item.images.length > 0) {
      item.images.forEach(img => {
        mediaItems.push({ type: 'image', url: img.url, title: img.title || '' });
      });
    }
    
    if (item.videos && item.videos.length > 0) {
      item.videos.forEach(video => {
        mediaItems.push({ type: 'video', url: video.url, title: video.title || '' });
      });
    }

    if (mediaItems.length === 0) return;

    let currentIndex = startIndex;

    // Crea lightbox
    const lightbox = document.createElement('div');
    lightbox.className = 'glossary-media-lightbox';

    function renderMedia() {
      const media = mediaItems[currentIndex];
      let content = '';

      if (media.type === 'image') {
        content = `<img src="${media.url}" alt="${media.title}">`;
      } else if (media.type === 'video') {
        const videoId = extractYouTubeId(media.url);
        if (videoId) {
          content = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        }
      }

      lightbox.innerHTML = `
        <div class="glossary-media-lightbox-content">
          <button class="glossary-media-lightbox-close">×</button>
          ${mediaItems.length > 1 ? '<button class="glossary-media-lightbox-nav prev">‹</button>' : ''}
          ${mediaItems.length > 1 ? '<button class="glossary-media-lightbox-nav next">›</button>' : ''}
          ${content}
          ${mediaItems.length > 1 ? `<div class="glossary-media-lightbox-counter">${currentIndex + 1} / ${mediaItems.length}</div>` : ''}
        </div>
      `;

      // Event listeners
      const closeBtn = lightbox.querySelector('.glossary-media-lightbox-close');
      closeBtn.onclick = closeLightbox;

      const prevBtn = lightbox.querySelector('.glossary-media-lightbox-nav.prev');
      if (prevBtn) {
        prevBtn.onclick = () => {
          currentIndex = (currentIndex - 1 + mediaItems.length) % mediaItems.length;
          renderMedia();
        };
      }

      const nextBtn = lightbox.querySelector('.glossary-media-lightbox-nav.next');
      if (nextBtn) {
        nextBtn.onclick = () => {
          currentIndex = (currentIndex + 1) % mediaItems.length;
          renderMedia();
        };
      }

      // Keyboard navigation
      const keyHandler = (e) => {
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft' && prevBtn) prevBtn.click();
        if (e.key === 'ArrowRight' && nextBtn) nextBtn.click();
      };
      
      document.removeEventListener('keydown', keyHandler);
      document.addEventListener('keydown', keyHandler);
      lightbox._keyHandler = keyHandler;
    }

    function closeLightbox() {
      lightbox.classList.remove('show');
      if (lightbox._keyHandler) {
        document.removeEventListener('keydown', lightbox._keyHandler);
      }
      setTimeout(() => lightbox.remove(), 300);
    }

    // Click outside to close
    lightbox.onclick = (e) => {
      if (e.target === lightbox) closeLightbox();
    };

    document.body.appendChild(lightbox);
    renderMedia();
    setTimeout(() => lightbox.classList.add('show'), 10);
  }

  // ============================================
  // CONDIVISIONE
  // ============================================
  function copyLinkToClipboard(acronym, variant = '') {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('term', acronym);
    if (variant) {
      currentUrl.searchParams.set('variant', variant);
    }
    const url = currentUrl.toString();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        showCopyFeedback(true);
      }).catch(() => {
        fallbackCopy(url);
      });
    } else {
      fallbackCopy(url);
    }
  }

  function webShareItem(acronym, variant = '') {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('term', acronym);
    if (variant) {
      currentUrl.searchParams.set('variant', variant);
    }
    const url = currentUrl.toString();

    const displayName = variant ? `${acronym}${variant}` : acronym;
    if (navigator.share) {
      navigator.share({
        title: `Glossario Militare - ${displayName}`,
        text: `Scopri il significato di ${displayName} nel glossario militare`,
        url: url
      }).catch(err => {
        console.log('Condivisione annullata o errore:', err);
      });
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showCopyFeedback(true);
    } catch (err) {
      showCopyFeedback(false);
    }
    document.body.removeChild(textarea);
  }

  function showCopyFeedback(success) {
    const btn = document.querySelector('.glossary-share-btn.copy-link');
    if (!btn) return;

    const originalText = btn.innerHTML;
    
    if (success) {
      btn.innerHTML = '✓ Copiato!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.classList.remove('copied');
      }, 2000);
    } else {
      btn.innerHTML = '✗ Errore';
      setTimeout(() => {
        btn.innerHTML = originalText;
      }, 2000);
    }
  }

  let urlTermProcessed = false; // Flag per evitare doppia elaborazione

  function loadTermFromURL() {
    const params = new URLSearchParams(window.location.search);
    const term = params.get('term');
    const variant = params.get('variant') || '';

    if (!term || urlTermProcessed) {
      return;
    }

    // Marca come processato per evitare loop
    urlTermProcessed = true;

    const wasOpen = isOpen;

    if (!wasOpen) {
      openGlossary();
    }

    // Aspetta che il glossario sia pronto e i dati siano caricati
    const attemptSelect = (attempts = 0) => {
      if (attempts > 30) {
        console.log('Timeout: impossibile caricare il termine', term, variant);
        // Pulisci URL anche in caso di timeout
        cleanURLParams();
        return;
      }

      // Controlla se il glossario è caricato
      if (glossaryData.length === 0) {
        setTimeout(() => attemptSelect(attempts + 1), 100);
        return;
      }

      // Cerca il termine usando indice hash
      const key = term.toLowerCase();
      const candidates = glossaryIndex[key];

      if (!candidates || candidates.length === 0) {
        // Termine non trovato, riprova
        setTimeout(() => attemptSelect(attempts + 1), 100);
        return;
      }

      let item;
      if (variant) {
        item = candidates.find(i => i.variant === parseInt(variant));
      } else {
        item = candidates.find(i => !i.variant);
        // Se non trovato senza variant, prendi il primo
        if (!item) {
          item = candidates[0];
        }
      }

      if (item) {
        selectItem(term, variant);
        scrollToSelectedItem(term, variant);
        // Pulisci URL dopo successo
        cleanURLParams();
      } else {
        // Termine non trovato, riprova
        setTimeout(() => attemptSelect(attempts + 1), 100);
      }
    };

    setTimeout(() => attemptSelect(), wasOpen ? 0 : 500);
  }

  function cleanURLParams() {
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('term');
    newUrl.searchParams.delete('variant');
    window.history.replaceState({}, '', newUrl.toString());
  }

  // Esponi funzione globale per il sistema tooltip
  window.selectGlossaryTerm = function(acronym, variant = null) {
    if (!isOpen) {
      openGlossary();
    }
    setTimeout(() => {
      selectItem(acronym, variant || '');
      scrollToSelectedItem(acronym, variant || '');
    }, isOpen ? 0 : 300);
  };

  // Listener per evento custom dal sistema tooltip
  window.addEventListener('openGlossary', function(e) {
    if (e.detail && e.detail.term) {
      window.selectGlossaryTerm(e.detail.term, e.detail.variant);
    }
  });

  window.addEventListener('popstate', function() {
    loadTermFromURL();
  });

  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (!link) return;

    try {
      const linkUrl = new URL(link.href);
      const currentUrl = new URL(window.location.href);

      if (linkUrl.origin === currentUrl.origin &&
          linkUrl.pathname === currentUrl.pathname &&
          linkUrl.searchParams.has('term')) {

        e.preventDefault();
        const term = linkUrl.searchParams.get('term');
        const variant = linkUrl.searchParams.get('variant') || '';

        if (isOpen) {
          selectItem(term, variant);
          scrollToSelectedItem(term, variant);
        } else {
          openGlossary();
          setTimeout(() => {
            selectItem(term, variant);
            scrollToSelectedItem(term, variant);
          }, 100);
        }

        window.history.pushState({}, '', link.href);
        setTimeout(() => {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('term');
          newUrl.searchParams.delete('variant');
          window.history.replaceState({}, '', newUrl.toString());
        }, 100);
      }
    } catch (err) {
      // Ignora errori di parsing URL
    }
  });

  // ============================================
  // AVVIO
  // ============================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Controlla anche quando la pagina riceve focus (per link copiati nella barra indirizzi)
  let lastUrl = window.location.href;
  setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      // Reset del flag quando l'URL cambia
      urlTermProcessed = false;
      loadTermFromURL();
    }
  }, 500);

})();