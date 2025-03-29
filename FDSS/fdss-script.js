/**
 * FDSS - Forum Discussion Save System
 * Script per la gestione di segnalibri e note in un forum
 */

// Funzione principale che inizializza lo script
(function() {
    // Verifica se lo script è già stato caricato
    if (window.FDSS) return;
    
    // Namespace globale per lo script
    window.FDSS = {
        version: '1.0.0',
        items: [],
        isSelectionMode: false,
        currentItemId: null,
        debugMode: false,
        debugPanel: null,
        
        // Sistema di debug
        debug: function(message, type = 'info') {
            // Sempre logga nella console
            const prefix = '[FDSS Debug]';
            switch(type) {
                case 'error':
                    console.error(prefix, message);
                    break;
                case 'warn':
                    console.warn(prefix, message);
                    break;
                case 'success':
                    console.log(prefix + ' ✓', message);
                    break;
                default:
                    console.log(prefix, message);
            }
            
            // Se il pannello di debug è attivo, aggiungi il messaggio anche lì
            if (this.debugMode && this.debugPanel) {
                const msgElement = document.createElement('div');
                msgElement.className = 'fdss-debug-message fdss-debug-' + type;
                msgElement.innerHTML = `<span class="fdss-debug-time">${new Date().toLocaleTimeString()}</span> <span class="fdss-debug-text">${message}</span>`;
                this.debugPanel.querySelector('.fdss-debug-content').appendChild(msgElement);
                // Auto-scroll al fondo
                this.debugPanel.querySelector('.fdss-debug-content').scrollTop = this.debugPanel.querySelector('.fdss-debug-content').scrollHeight;
            }
        },
        
        // Inizializza il pannello di debug
        initDebugPanel: function() {
            if (this.debugPanel) return;
            
            this.debugPanel = document.createElement('div');
            this.debugPanel.className = 'fdss-debug-panel';
            this.debugPanel.style.display = this.debugMode ? 'flex' : 'none';
            this.debugPanel.innerHTML = `
                <div class="fdss-debug-header">
                    <div class="fdss-debug-title">FDSS Debug</div>
                    <div class="fdss-debug-actions">
                        <button class="fdss-debug-clear">Pulisci</button>
                        <button class="fdss-debug-close">Chiudi</button>
                    </div>
                </div>
                <div class="fdss-debug-content"></div>
            `;
            document.body.appendChild(this.debugPanel);
            
            // Aggiungi gli event listener
            this.debugPanel.querySelector('.fdss-debug-clear').addEventListener('click', () => {
                this.debugPanel.querySelector('.fdss-debug-content').innerHTML = '';
            });
            
            this.debugPanel.querySelector('.fdss-debug-close').addEventListener('click', () => {
                this.debugMode = false;
                this.debugPanel.style.display = 'none';
            });
            
            // Aggiungi stili CSS per il pannello di debug
            const style = document.createElement('style');
            style.textContent = `
                .fdss-debug-panel {
                    position: fixed;
                    bottom: 80px;
                    right: 20px;
                    width: 400px;
                    height: 300px;
                    background-color: rgba(0, 0, 0, 0.85);
                    color: #fff;
                    border-radius: 8px;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    font-family: monospace;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                }
                .fdss-debug-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background-color: #333;
                    border-bottom: 1px solid #555;
                }
                .fdss-debug-title {
                    font-weight: bold;
                }
                .fdss-debug-actions button {
                    background-color: #555;
                    border: none;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    margin-left: 5px;
                    cursor: pointer;
                }
                .fdss-debug-actions button:hover {
                    background-color: #777;
                }
                .fdss-debug-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px;
                }
                .fdss-debug-message {
                    margin-bottom: 5px;
                    border-left: 3px solid #555;
                    padding-left: 8px;
                }
                .fdss-debug-time {
                    color: #aaa;
                    margin-right: 8px;
                }
                .fdss-debug-error {
                    border-left-color: #ff5252;
                }
                .fdss-debug-warn {
                    border-left-color: #ffb300;
                }
                .fdss-debug-success {
                    border-left-color: #4caf50;
                }
                .fdss-debug-toggle {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    width: 40px;
                    height: 40px;
                    background-color: #333;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    cursor: pointer;
                    z-index: 9999;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
                }
                .fdss-debug-toggle:hover {
                    background-color: #555;
                }
            `;
            document.head.appendChild(style);
            
            // Aggiungi pulsante toggle per il debug
            const toggleBtn = document.createElement('div');
            toggleBtn.className = 'fdss-debug-toggle';
            toggleBtn.innerHTML = '<i class="fas fa-bug"></i>';
            toggleBtn.addEventListener('click', () => {
                this.debugMode = !this.debugMode;
                this.debugPanel.style.display = this.debugMode ? 'flex' : 'none';
                this.debug('Debug mode ' + (this.debugMode ? 'attivato' : 'disattivato'), 'info');
            });
            document.body.appendChild(toggleBtn);
        },
        
        // Inizializzazione
        init: function() {
            try {
                this.initDebugPanel();
                this.debug('Inizializzazione FDSS v' + this.version, 'info');
                
                this.debug('Caricamento CSS...', 'info');
                this.loadCSS();
                
                this.debug('Caricamento Font Awesome...', 'info');
                this.loadFontAwesome();
                
                this.debug('Creazione interfaccia utente...', 'info');
                this.createUI();
                
                this.debug('Caricamento elementi salvati...', 'info');
                this.loadItems();
                
                this.debug('Aggiunta event listeners...', 'info');
                this.addEventListeners();
                
                this.debug('Aggiunta pulsanti di salvataggio...', 'info');
                this.addSaveButtons();
                
                this.debug('Inizializzazione completata con successo!', 'success');
            } catch (error) {
                this.debug('Errore durante l\'inizializzazione: ' + error.message, 'error');
                console.error('FDSS Initialization Error:', error);
            }
        },
        
        // Carica il CSS esterno
        loadCSS: function() {
            // Verifica se il CSS è già stato caricato
            if (document.querySelector('link[href*="fdss-style.css"]')) return;
            
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            
            // Usa l'URL esterno fornito per il file CSS
            link.href = 'https://norse94.github.io/FDSS/fdss-style.css';
            document.head.appendChild(link);
            this.debug('CSS caricato da URL esterno: ' + link.href, 'info');
        },
        
        // Carica Font Awesome per le icone
        loadFontAwesome: function() {
            if (!document.querySelector('link[href*="font-awesome"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';
                document.head.appendChild(link);
            }
        },
        
        // Crea l'interfaccia utente
        createUI: function() {
            // Pulsante flottante
            const floatingButton = document.createElement('div');
            floatingButton.className = 'fdss-floating-button';
            floatingButton.innerHTML = '<i class="fas fa-bookmark"></i>';
            document.body.appendChild(floatingButton);
            
            // Container principale
            const container = document.createElement('div');
            container.className = 'fdss-container';
            container.innerHTML = `
                <div class="fdss-header">
                    <div class="fdss-title">I miei segnalibri</div>
                    <div class="fdss-close-btn"><i class="fas fa-times"></i></div>
                </div>
                <div class="fdss-search-bar">
                    <input type="text" class="fdss-search-input" placeholder="Cerca segnalibri...">
                    <div class="fdss-filters">
                        <button class="fdss-filter-btn fdss-active" data-filter="all">Tutti</button>
                        <button class="fdss-filter-btn" data-filter="post">Post</button>
                        <button class="fdss-filter-btn" data-filter="discussion">Discussioni</button>
                        <button class="fdss-filter-btn" data-filter="link">Link</button>
                        <button class="fdss-filter-btn" data-filter="note">Note</button>
                    </div>
                </div>
                <div class="fdss-content">
                    <ul class="fdss-items-list"></ul>
                </div>
                <div class="fdss-footer">
                    <button class="fdss-select-mode-btn">Seleziona</button>
                    <button class="fdss-delete-selected">Elimina selezionati</button>
                    <button class="fdss-add-btn">Aggiungi nota</button>
                </div>
            `;
            document.body.appendChild(container);
            
            // Modal per aggiungere/modificare elementi
            const modal = document.createElement('div');
            modal.className = 'fdss-modal';
            modal.innerHTML = `
                <div class="fdss-modal-content">
                    <div class="fdss-modal-header">
                        <div class="fdss-modal-title">Aggiungi elemento</div>
                        <div class="fdss-modal-close"><i class="fas fa-times"></i></div>
                    </div>
                    <div class="fdss-modal-body">
                        <div class="fdss-form-group">
                            <label class="fdss-form-label">Tipo</label>
                            <select class="fdss-form-input" id="fdss-item-type">
                                <option value="note">Nota</option>
                                <option value="link">Link</option>
                            </select>
                        </div>
                        <div class="fdss-form-group">
                            <label class="fdss-form-label">Titolo</label>
                            <input type="text" class="fdss-form-input" id="fdss-item-title">
                        </div>
                        <div class="fdss-form-group" id="fdss-link-group">
                            <label class="fdss-form-label">URL</label>
                            <input type="text" class="fdss-form-input" id="fdss-item-url">
                        </div>
                        <div class="fdss-form-group">
                            <label class="fdss-form-label">Contenuto</label>
                            <textarea class="fdss-form-textarea" id="fdss-item-content"></textarea>
                        </div>
                        <div class="fdss-form-group">
                            <label class="fdss-form-label">Tag</label>
                            <div class="fdss-tags-input" id="fdss-tags-container">
                                <input type="text" class="fdss-tag-input" placeholder="Aggiungi tag...">
                            </div>
                        </div>
                    </div>
                    <div class="fdss-modal-footer">
                        <button class="fdss-modal-btn fdss-cancel-btn">Annulla</button>
                        <button class="fdss-modal-btn fdss-save-btn">Salva</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        },
        
        // Carica gli elementi salvati dal localStorage
        loadItems: function() {
            const savedItems = localStorage.getItem('fdss-items');
            if (savedItems) {
                this.items = JSON.parse(savedItems);
                this.renderItems();
            }
        },
        
        // Salva gli elementi nel localStorage
        saveItems: function() {
            localStorage.setItem('fdss-items', JSON.stringify(this.items));
        },
        
        // Renderizza gli elementi nella lista
        renderItems: function(filter = 'all', searchTerm = '') {
            const itemsList = document.querySelector('.fdss-items-list');
            itemsList.innerHTML = '';
            
            let filteredItems = this.items;
            
            // Applica filtro per tipo
            if (filter !== 'all') {
                filteredItems = filteredItems.filter(item => item.type === filter);
            }
            
            // Applica filtro di ricerca
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                filteredItems = filteredItems.filter(item => 
                    item.title.toLowerCase().includes(term) || 
                    item.content.toLowerCase().includes(term) ||
                    (item.tags && item.tags.some(tag => tag.toLowerCase().includes(term)))
                );
            }
            
            // Ordina per data di creazione (più recenti prima)
            filteredItems.sort((a, b) => b.date - a.date);
            
            if (filteredItems.length === 0) {
                itemsList.innerHTML = '<li class="fdss-item">Nessun elemento trovato</li>';
                return;
            }
            
            filteredItems.forEach(item => {
                const li = document.createElement('li');
                li.className = 'fdss-item';
                li.dataset.id = item.id;
                
                // Icona in base al tipo
                let typeIcon = '';
                switch(item.type) {
                    case 'post': typeIcon = 'fa-comment'; break;
                    case 'discussion': typeIcon = 'fa-comments'; break;
                    case 'link': typeIcon = 'fa-link'; break;
                    case 'note': typeIcon = 'fa-sticky-note'; break;
                }
                
                // Formatta la data
                const date = new Date(item.date);
                const formattedDate = `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;
                
                // Crea i tag HTML
                let tagsHtml = '';
                if (item.tags && item.tags.length > 0) {
                    tagsHtml = '<div class="fdss-item-tags">' + 
                        item.tags.map(tag => `<span class="fdss-tag">${tag}</span>`).join('') +
                        '</div>';
                }
                
                li.innerHTML = `
                    <input type="checkbox" class="fdss-checkbox">
                    <div class="fdss-item-header">
                        <h3 class="fdss-item-title">${item.title}</h3>
                        <div class="fdss-item-actions">
                            <span class="fdss-action-btn fdss-edit-btn"><i class="fas fa-edit"></i></span>
                            <span class="fdss-action-btn fdss-delete-btn"><i class="fas fa-trash"></i></span>
                        </div>
                    </div>
                    <div class="fdss-item-meta">
                        <span class="fdss-item-source"><i class="fas ${typeIcon}"></i> ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}</span>
                        <span class="fdss-item-date"><i class="far fa-clock"></i> ${formattedDate}</span>
                    </div>
                    <p class="fdss-item-content">${item.content}</p>
                    ${tagsHtml}
                `;
                
                itemsList.appendChild(li);
            });
        },
        
        // Aggiunge i listener per gli eventi
        addEventListeners: function() {
            const self = this;
            
            // Pulsante flottante per aprire/chiudere il container
            const floatingButton = document.querySelector('.fdss-floating-button');
            if (floatingButton) {
                floatingButton.addEventListener('click', function() {
                    const container = document.querySelector('.fdss-container');
                    if (container) {
                        if (container.style.display === 'flex') {
                            container.style.display = 'none';
                        } else {
                            container.style.display = 'flex';
                        }
                    }
                });
            }
            
            // Pulsante di chiusura
            const closeBtn = document.querySelector('.fdss-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', function() {
                    const container = document.querySelector('.fdss-container');
                    if (container) {
                        container.style.display = 'none';
                    }
                });
            }
            
            // Filtri
            const filterBtns = document.querySelectorAll('.fdss-filter-btn');
            if (filterBtns && filterBtns.length > 0) {
                filterBtns.forEach(btn => {
                    btn.addEventListener('click', function() {
                        document.querySelectorAll('.fdss-filter-btn').forEach(b => b.classList.remove('fdss-active'));
                        this.classList.add('fdss-active');
                        const filter = this.dataset.filter;
                        const searchInput = document.querySelector('.fdss-search-input');
                        const searchTerm = searchInput ? searchInput.value : '';
                        self.renderItems(filter, searchTerm);
                    });
                });
            }
            
            // Ricerca
            const searchInput = document.querySelector('.fdss-search-input');
            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    const activeFilterBtn = document.querySelector('.fdss-filter-btn.fdss-active');
                    const filter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';
                    self.renderItems(filter, this.value);
                });
            }
            
            // Modalità selezione
            const selectModeBtn = document.querySelector('.fdss-select-mode-btn');
            if (selectModeBtn) {
                selectModeBtn.addEventListener('click', function() {
                    const container = document.querySelector('.fdss-container');
                    self.isSelectionMode = !self.isSelectionMode;
                    
                    if (self.isSelectionMode && container) {
                        container.classList.add('fdss-selection-mode');
                        this.classList.add('fdss-active');
                        this.textContent = 'Annulla';
                    } else {
                        if (container) {
                            container.classList.remove('fdss-selection-mode');
                        }
                        this.classList.remove('fdss-active');
                        this.textContent = 'Seleziona';
                        // Deseleziona tutti i checkbox
                        const checkboxes = document.querySelectorAll('.fdss-checkbox');
                        if (checkboxes && checkboxes.length > 0) {
                            checkboxes.forEach(cb => cb.checked = false);
                        }
                    }
                });
            }
            
            // Elimina selezionati
            const deleteSelectedBtn = document.querySelector('.fdss-delete-selected');
            if (deleteSelectedBtn) {
                deleteSelectedBtn.addEventListener('click', function() {
                    const selectedItems = document.querySelectorAll('.fdss-checkbox:checked');
                    if (!selectedItems || selectedItems.length === 0) return;
                    
                    if (confirm(`Sei sicuro di voler eliminare ${selectedItems.length} elementi?`)) {
                        const idsToRemove = Array.from(selectedItems).map(cb => {
                            const item = cb.closest('.fdss-item');
                            return item ? item.dataset.id : null;
                        }).filter(id => id !== null);
                        
                        self.items = self.items.filter(item => !idsToRemove.includes(item.id));
                        self.saveItems();
                        
                        // Esci dalla modalità selezione
                        const selectModeBtn = document.querySelector('.fdss-select-mode-btn');
                        if (selectModeBtn) {
                            selectModeBtn.click();
                        }
                        
                        // Aggiorna la lista
                        const activeFilterBtn = document.querySelector('.fdss-filter-btn.fdss-active');
                        const filter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'all';
                        const searchInput = document.querySelector('.fdss-search-input');
                        const searchTerm = searchInput ? searchInput.value : '';
                        self.renderItems(filter, searchTerm);
                    }
                });
            }
            
            // Aggiungi nota
            document.querySelector('.fdss-add-btn').addEventListener('click', function() {
                self.openModal('add');
            });
            
            // Chiudi modal
            document.querySelector('.fdss-modal-close').addEventListener('click', function() {
                document.querySelector('.fdss-modal').style.display = 'none';
            });
            
            // Salva elemento dal modal
            document.querySelector('.fdss-save-btn').addEventListener('click', function() {
                self.saveItemFromModal();
            });
            
            // Cambia tipo di elemento nel modal
            document.querySelector('#fdss-item-type').addEventListener('change', function() {
                const linkGroup = document.querySelector('#fdss-link-group');
                if (this.value === 'link') {
                    linkGroup.style.display = 'block';
                } else {
                    linkGroup.style.display = 'none';
                }
            });
            
            // Gestione dei tag
            const tagInput = document.querySelector('.fdss-tag-input');
            tagInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const tag = this.value.trim();
                    if (tag) {
                        self.addTag(tag);
                        this.value = '';
                    }
                }
            });
            
            // Delegazione eventi per gli elementi della lista
            document.querySelector('.fdss-items-list').addEventListener('click', function(e) {
                const item = e.target.closest('.fdss-item');
                if (!item) return;
                
                // Se siamo in modalità selezione, gestisci il click sul checkbox
                if (self.isSelectionMode) {
                    if (e.target.classList.contains('fdss-checkbox')) {
                        return; // Lascia gestire il checkbox normalmente
                    }
                    
                    const checkbox = item.querySelector('.fdss-checkbox');
                    checkbox.checked = !checkbox.checked;
                    return;
                }
                
                // Altrimenti gestisci le azioni
                if (e.target.closest('.fdss-edit-btn')) {
                    const itemId = item.dataset.id;
                    self.openModal('edit', itemId);
                } else if (e.target.closest('.fdss-delete-btn')) {
                    const itemId = item.dataset.id;
                    if (confirm('Sei sicuro di voler eliminare questo elemento?')) {
                        self.deleteItem(itemId);
                    }
                } else if (!e.target.closest('.fdss-item-actions')) {
                    // Se l'utente clicca sull'elemento ma non sui pulsanti di azione
                    const itemId = item.dataset.id;
                    const foundItem = self.items.find(i => i.id === itemId);
                    
                    // Se è un link, post o discussione, apri il link
                    if (foundItem && (foundItem.type === 'link' || foundItem.type === 'post' || foundItem.type === 'discussion')) {
                        if (foundItem.url) {
                            window.open(foundItem.url, '_blank');
                        }
                    }
                }
            });
            
            // Delegazione eventi per i tag
            document.querySelector('#fdss-tags-container').addEventListener('click', function(e) {
                if (e.target.classList.contains('fdss-tag-remove')) {
                    const tagItem = e.target.closest('.fdss-tag-item');
                    if (tagItem) {
                        tagItem.remove();
                    }
                }
            });
        },
        
        // Aggiunge i pulsanti per salvare post e discussioni nel forum
        addSaveButtons: function() {
            try {
                this.debug('Inizio aggiunta pulsanti di salvataggio...', 'info');
                const self = this;
                
                // Pulsante per salvare la discussione su desktop
                const buttonsDiv = document.querySelector('.buttons');
                if (buttonsDiv) {
                    this.debug('Aggiunta pulsante salvataggio discussione (desktop)', 'info');
                    const saveDiscBtn = document.createElement('span');
                    saveDiscBtn.id = 'fdss-salvadiscbtn';
                    saveDiscBtn.textContent = 'Salva Disc.';
                    saveDiscBtn.addEventListener('click', function() {
                        self.debug('Pulsante salvataggio discussione (desktop) cliccato', 'info');
                        self.saveDiscussion();
                    });
                    buttonsDiv.appendChild(saveDiscBtn);
                    this.debug('Pulsante salvataggio discussione (desktop) aggiunto con successo', 'success');
                } else {
                    this.debug('Elemento .buttons non trovato nel DOM', 'warn');
                }
                
                // Pulsante per salvare la discussione su mobile
                const popShareDiv = document.querySelector('.pop-share');
                if (popShareDiv) {
                    this.debug('Aggiunta pulsante salvataggio discussione (mobile)', 'info');
                    const saveDiscBtnMobile = document.createElement('span');
                    saveDiscBtnMobile.className = 'fdss-savadiscbtnmobile';
                    saveDiscBtnMobile.innerHTML = '<i class="fas fa-bookmark"></i>';
                    saveDiscBtnMobile.addEventListener('click', function() {
                        self.debug('Pulsante salvataggio discussione (mobile) cliccato', 'info');
                        self.saveDiscussion();
                    });
                    popShareDiv.appendChild(saveDiscBtnMobile);
                    this.debug('Pulsante salvataggio discussione (mobile) aggiunto con successo', 'success');
                } else {
                    this.debug('Elemento .pop-share non trovato nel DOM', 'warn');
                }
                
                // Pulsante per salvare il post su desktop
                // Prova prima con il selettore specifico
                let miniButtonsDiv = document.querySelector('.mini_buttons.lt.Sub');
                
                // Se non trova, prova con un selettore più generico
                if (!miniButtonsDiv) {
                    miniButtonsDiv = document.querySelector('.mini_buttons');
                    this.debug('Usando selettore alternativo .mini_buttons', 'info');
                }
                
                if (miniButtonsDiv) {
                    this.debug('Aggiunta pulsante salvataggio post (desktop)', 'info');
                    const savePostBtn = document.createElement('a');
                    savePostBtn.id = 'fdss-salvapostbtn';
                    savePostBtn.textContent = 'Aggiungi ai Segnalibri';
                    savePostBtn.href = 'javascript:void(0);';
                    savePostBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        const postDiv = this.closest('.post');
                        if (postDiv) {
                            const postId = postDiv.id.substring(1); // Rimuove il primo carattere 'p'
                            self.debug('Pulsante salvataggio post (desktop) cliccato per post #' + postId, 'info');
                            self.savePost(postId);
                        } else {
                            self.debug('Impossibile trovare l\'elemento post parent', 'error');
                        }
                    });
                    miniButtonsDiv.appendChild(savePostBtn);
                    this.debug('Pulsante salvataggio post (desktop) aggiunto con successo', 'success');
                } else {
                    this.debug('Nessun elemento .mini_buttons trovato nel DOM', 'warn');
                }
                
                // Pulsante per salvare il post su mobile
                const groupSpans = document.querySelectorAll('.group');
                if (groupSpans && groupSpans.length > 0) {
                    this.debug('Trovati ' + groupSpans.length + ' elementi .group per pulsanti mobile', 'info');
                    let addedCount = 0;
                    
                    groupSpans.forEach(function(groupSpan, index) {
                        if (groupSpan && groupSpan.parentNode) {
                            const savePostBtnMobile = document.createElement('a');
                            savePostBtnMobile.id = 'fdss-salvapostbtnmobile';
                            savePostBtnMobile.innerHTML = '<i class="fas fa-bookmark"></i>';
                            savePostBtnMobile.href = 'javascript:void(0);';
                            savePostBtnMobile.addEventListener('click', function(e) {
                                e.preventDefault();
                                const postDiv = this.closest('.post');
                                if (postDiv) {
                                    const postId = postDiv.id.substring(1); // Rimuove il primo carattere 'p'
                                    self.debug('Pulsante salvataggio post (mobile) cliccato per post #' + postId, 'info');
                                    self.savePost(postId);
                                } else {
                                    self.debug('Impossibile trovare l\'elemento post parent (mobile)', 'error');
                                }
                            });
                            groupSpan.parentNode.insertBefore(savePostBtnMobile, groupSpan);
                            addedCount++;
                        }
                    });
                    
                    this.debug('Aggiunti ' + addedCount + ' pulsanti di salvataggio post (mobile)', 'success');
                } else {
                    this.debug('Nessun elemento .group trovato nel DOM', 'warn');
                }
                
                this.debug('Aggiunta pulsanti di salvataggio completata', 'success');
            } catch (error) {
                this.debug('Errore durante l\'aggiunta dei pulsanti di salvataggio: ' + error.message, 'error');
                console.error('FDSS addSaveButtons Error:', error);
            }
        },
        
        // Apre il modal per aggiungere o modificare un elemento
        openModal: function(mode, itemId = null) {
            const modal = document.querySelector('.fdss-modal');
            const modalTitle = modal.querySelector('.fdss-modal-title');
            const typeSelect = document.querySelector('#fdss-item-type');
            const titleInput = document.querySelector('#fdss-item-title');
            const urlInput = document.querySelector('#fdss-item-url');
            const contentInput = document.querySelector('#fdss-item-content');
            const tagsContainer = document.querySelector('#fdss-tags-container');
            const linkGroup = document.querySelector('#fdss-link-group');
            
            // Resetta il form
            typeSelect.value = 'note';
            titleInput.value = '';
            urlInput.value = '';
            contentInput.value = '';
            
            // Rimuovi tutti i tag tranne l'input
            Array.from(tagsContainer.children).forEach(child => {
                if (!child.classList.contains('fdss-tag-input')) {
                    child.remove();
                }
            });
            
            if (mode === 'edit' && itemId) {
                // Modalità modifica
                modalTitle.textContent = 'Modifica elemento';
                this.currentItemId = itemId;
                
                // Trova l'elemento da modificare
                const item = this.items.find(i => i.id === itemId);
                if (item) {
                    // Popola il form con i dati dell'elemento
                    if (item.type === 'post' || item.type === 'discussion') {
                        typeSelect.value = item.type;
                        typeSelect.disabled = true;
                    } else {
                        typeSelect.value = item.type;
                        typeSelect.disabled = false;
                    }
                    
                    titleInput.value = item.title || '';
                    urlInput.value = item.url || '';
                    contentInput.value = item.content || '';
                    
                    // Mostra/nascondi il campo URL in base al tipo
                    if (item.type === 'link') {
                        linkGroup.style.display = 'block';
                    } else {
                        linkGroup.style.display = 'none';
                    }
                    
                    // Aggiungi i tag
                    if (item.tags && item.tags.length > 0) {
                        item.tags.forEach(tag => this.addTag(tag));
                    }
                }
            } else {
                // Modalità aggiungi
                modalTitle.textContent = 'Aggiungi elemento';
                this.currentItemId = null;
                typeSelect.disabled = false;
                
                // Nascondi il campo URL per le note
                linkGroup.style.display = 'none';
            }
            
            // Mostra il modal
            modal.style.display = 'flex';
        },
        
        // Aggiunge un tag al container
        addTag: function(tagText) {
            const tagsContainer = document.querySelector('#fdss-tags-container');
            const tagInput = document.querySelector('.fdss-tag-input');
            
            // Verifica se il tag esiste già
            const existingTags = Array.from(tagsContainer.querySelectorAll('.fdss-tag-item span:first-child'))
                .map(span => span.textContent.toLowerCase());
            
            if (existingTags.includes(tagText.toLowerCase())) {
                return; // Tag già presente
            }
            
            // Crea l'elemento tag
            const tagItem = document.createElement('div');
            tagItem.className = 'fdss-tag-item';
            tagItem.innerHTML = `
                <span>${tagText}</span>
                <span class="fdss-tag-remove"><i class="fas fa-times"></i></span>
            `;
            
            // Inserisci il tag prima dell'input
            tagsContainer.insertBefore(tagItem, tagInput);
        },
        
        // Salva un elemento dal modal
        saveItemFromModal: function() {
            const typeSelect = document.querySelector('#fdss-item-type');
            const titleInput = document.querySelector('#fdss-item-title');
            const urlInput = document.querySelector('#fdss-item-url');
            const contentInput = document.querySelector('#fdss-item-content');
            const tagsContainer = document.querySelector('#fdss-tags-container');
            
            // Validazione
            if (!titleInput.value.trim()) {
                alert('Il titolo è obbligatorio.');
                return;
            }
            
            if (typeSelect.value === 'link' && !urlInput.value.trim()) {
                alert('L\'URL è obbligatorio per i link.');
                return;
            }
            
            // Raccogli i tag
            const tags = Array.from(tagsContainer.querySelectorAll('.fdss-tag-item span:first-child'))
                .map(span => span.textContent);
            
            // Crea o aggiorna l'elemento
            const item = {
                id: this.currentItemId || (typeSelect.value + '_' + Date.now()),
                type: typeSelect.value,
                title: titleInput.value.trim(),
                content: contentInput.value.trim(),
                date: Date.now(),
                tags: tags
            };
            
            // Aggiungi l'URL per i link
            if (typeSelect.value === 'link') {
                item.url = urlInput.value.trim();
            }
            
            if (this.currentItemId) {
                // Modalità modifica: trova e aggiorna l'elemento esistente
                const index = this.items.findIndex(i => i.id === this.currentItemId);
                if (index !== -1) {
                    // Mantieni i metadati originali
                    if (this.items[index].meta) {
                        item.meta = this.items[index].meta;
                    }
                    if (this.items[index].url && !item.url) {
                        item.url = this.items[index].url;
                    }
                    
                    this.items[index] = item;
                }
            } else {
                // Modalità aggiungi: aggiungi il nuovo elemento
                this.items.push(item);
            }
            
            // Salva gli elementi e aggiorna la lista
            this.saveItems();
            this.renderItems();
            
            // Chiudi il modal
            document.querySelector('.fdss-modal').style.display = 'none';
        },
        
        // Elimina un elemento
        deleteItem: function(itemId) {
            this.items = this.items.filter(item => item.id !== itemId);
            this.saveItems();
            this.renderItems();
        },
        
        // Salva una discussione come segnalibro
        saveDiscussion: function() {
            try {
                this.debug('Inizio salvataggio discussione...', 'info');
                
                // Ottieni il titolo della discussione
                const discussionTitleElement = document.querySelector('.discussion-title');
                const title = discussionTitleElement ? discussionTitleElement.textContent : 'Discussione';
                this.debug('Titolo discussione: ' + title, 'info');
                
                // Ottieni l'URL corrente
                const url = window.location.href;
                this.debug('URL corrente: ' + url, 'info');
                
                // Estrai l'ID della discussione dall'URL
                let discussionId = '';
                // Migliore gestione dell'estrazione dell'ID dalla query string
                const urlObj = new URL(url);
                discussionId = urlObj.searchParams.get('t');
                
                if (discussionId) {
                    this.debug('ID discussione estratto: ' + discussionId, 'success');
                } else {
                    // Fallback alla regex se URLSearchParams non funziona
                    const match = url.match(/\?t=([^&#]+)/);
                    if (match && match[1]) {
                        discussionId = match[1];
                        this.debug('ID discussione estratto con regex: ' + discussionId, 'success');
                    } else {
                        this.debug('Impossibile estrarre ID discussione dall\'URL', 'warn');
                    }
                }
                
                // Se abbiamo trovato l'ID della discussione, chiamiamo l'API
                if (discussionId) {
                    const apiUrl = '/api.php?t=' + discussionId;
                    this.debug('Chiamata API: ' + apiUrl, 'info');
                    
                    // Chiamata all'API
                    fetch(apiUrl)
                        .then(response => {
                            this.debug('Risposta API ricevuta, status: ' + response.status, 'info');
                            if (!response.ok) {
                                throw new Error('Risposta API non valida: ' + response.status);
                            }
                            return response.json();
                        })
                        .then(data => {
                            this.debug('Dati API elaborati con successo', 'success');
                            
                            // Crea un nuovo elemento con i dati dell'API
                            const item = {
                                id: 'discussion_' + Date.now(),
                                type: 'discussion',
                                title: title.trim(),
                                content: 'Discussione salvata dai segnalibri',
                                url: url,
                                date: Date.now(),
                                tags: [],
                                meta: data // Salva tutti i dati dell'API
                            };
                            
                            this.debug('Elemento discussione creato: ' + item.id, 'info');
                            
                            // Aggiungi l'elemento alla lista
                            this.items.push(item);
                            this.saveItems();
                            
                            // Salva i dati dell'API nel localStorage fino al cambio pagina
                            localStorage.setItem('fdss-api-data', JSON.stringify(data));
                            this.debug('Dati API salvati in localStorage', 'success');
                            
                            // Mostra un messaggio di conferma
                            alert('Discussione salvata nei segnalibri!');
                            this.debug('Discussione salvata con successo', 'success');
                        })
                        .catch(error => {
                            this.debug('Errore nel recupero dei dati dall\'API: ' + error.message, 'error');
                            console.error('FDSS API Error:', error);
                            
                            // In caso di errore, salva comunque la discussione senza i dati dell'API
                            const item = {
                                id: 'discussion_' + Date.now(),
                                type: 'discussion',
                                title: title.trim(),
                                content: 'Discussione salvata dai segnalibri',
                                url: url,
                                date: Date.now(),
                                tags: []
                            };
                            
                            this.debug('Salvataggio discussione senza dati API', 'warn');
                            this.items.push(item);
                            this.saveItems();
                            alert('Discussione salvata nei segnalibri!');
                            this.debug('Discussione salvata con successo (senza dati API)', 'success');
                        });
                } else {
                    // Se non troviamo l'ID, salviamo comunque la discussione
                    this.debug('Nessun ID discussione trovato, salvataggio semplice', 'warn');
                    const item = {
                        id: 'discussion_' + Date.now(),
                        type: 'discussion',
                        title: title.trim(),
                        content: 'Discussione salvata dai segnalibri',
                        url: url,
                        date: Date.now(),
                        tags: []
                    };
                    
                    this.items.push(item);
                    this.saveItems();
                    alert('Discussione salvata nei segnalibri!');
                    this.debug('Discussione salvata con successo (senza ID)', 'success');
                }
            } catch (error) {
                this.debug('Errore durante il salvataggio della discussione: ' + error.message, 'error');
                console.error('FDSS saveDiscussion Error:', error);
                alert('Errore durante il salvataggio della discussione: ' + error.message);
            }
        },
        
        // Salva un post come segnalibro
        savePost: function(postId) {
            try {
                this.debug('Inizio salvataggio post #' + postId + '...', 'info');
                
                // Trova il post nel DOM
                this.debug('Cerco post con ID: p' + postId, 'info');
                let postElement = document.getElementById('p' + postId);
                if (!postElement) {
                    this.debug('Post #' + postId + ' non trovato nel DOM con getElementById!', 'warn');
                    // Prova a cercare il post in modo alternativo
                    const allPosts = document.querySelectorAll('.post');
                    let foundPost = null;
                    
                    for (let i = 0; i < allPosts.length; i++) {
                        if (allPosts[i].id === 'p' + postId || allPosts[i].id === postId) {
                            foundPost = allPosts[i];
                            this.debug('Post trovato con metodo alternativo', 'success');
                            break;
                        }
                    }
                    
                    if (!foundPost) {
                        this.debug('Post #' + postId + ' non trovato nel DOM!', 'error');
                        alert('Post non trovato!');
                        return;
                    }
                    
                    // Usa il post trovato
                    postElement = foundPost;
                }
                this.debug('Elemento post trovato nel DOM', 'success');
                
                // Ottieni il contenuto del post
                const postContentElement = postElement.querySelector('.post-content');
                const postContent = postContentElement ? postContentElement.textContent : '';
                if (!postContent) {
                    this.debug('Contenuto del post vuoto o non trovato', 'warn');
                } else {
                    this.debug('Contenuto del post estratto: ' + postContent.substring(0, 50) + '...', 'info');
                }
                
                // Ottieni l'autore del post
                const authorElement = postElement.querySelector('.post-author strong');
                const author = authorElement ? authorElement.textContent : 'Utente';
                this.debug('Autore del post: ' + author, 'info');
                
                // Ottieni l'URL del post
                const url = window.location.href + '#p' + postId;
                this.debug('URL del post: ' + url, 'info');
                
                // Estrai l'ID della discussione dall'URL
                let discussionId = '';
                // Migliore gestione dell'estrazione dell'ID dalla query string
                const urlObj = new URL(url);
                discussionId = urlObj.searchParams.get('t');
                
                if (discussionId) {
                    this.debug('ID discussione estratto: ' + discussionId, 'success');
                } else {
                    // Fallback alla regex se URLSearchParams non funziona
                    const match = url.match(/\?t=([^&#]+)/);
                    if (match && match[1]) {
                        discussionId = match[1];
                        this.debug('ID discussione estratto con regex: ' + discussionId, 'success');
                    } else {
                        this.debug('Impossibile estrarre ID discussione dall\'URL', 'warn');
                    }
                }
                
                // Se abbiamo trovato l'ID della discussione, chiamiamo l'API
                if (discussionId) {
                    const apiUrl = '/api.php?t=' + discussionId;
                    this.debug('Chiamata API: ' + apiUrl, 'info');
                    
                    // Chiamata all'API
                    fetch(apiUrl)
                        .then(response => {
                            this.debug('Risposta API ricevuta, status: ' + response.status, 'info');
                            if (!response.ok) {
                                throw new Error('Risposta API non valida: ' + response.status);
                            }
                            return response.json();
                        })
                        .then(data => {
                            this.debug('Dati API elaborati con successo', 'success');
                            
                            // Crea un nuovo elemento con i dati dell'API
                            const item = {
                                id: 'post_' + Date.now(),
                                type: 'post',
                                title: 'Post di ' + author.trim(),
                                content: postContent.trim().substring(0, 200) + '...',
                                url: url,
                                date: Date.now(),
                                tags: [author.trim()],
                                meta: {
                                    postId: postId,
                                    apiData: data // Salva i dati dell'API relativi al post
                                }
                            };
                            
                            this.debug('Elemento post creato: ' + item.id, 'info');
                            
                            // Aggiungi l'elemento alla lista
                            this.items.push(item);
                            this.saveItems();
                            
                            // Salva i dati dell'API nel localStorage fino al cambio pagina
                            localStorage.setItem('fdss-api-data', JSON.stringify(data));
                            this.debug('Dati API salvati in localStorage', 'success');
                            
                            // Mostra un messaggio di conferma
                            alert('Post salvato nei segnalibri!');
                            this.debug('Post salvato con successo', 'success');
                        })
                        .catch(error => {
                            this.debug('Errore nel recupero dei dati dall\'API: ' + error.message, 'error');
                            console.error('FDSS API Error:', error);
                            
                            // In caso di errore, salva comunque il post senza i dati dell'API
                            const item = {
                                id: 'post_' + Date.now(),
                                type: 'post',
                                title: 'Post di ' + author.trim(),
                                content: postContent.trim().substring(0, 200) + '...',
                                url: url,
                                date: Date.now(),
                                tags: [author.trim()]
                            };
                            
                            this.debug('Salvataggio post senza dati API', 'warn');
                            this.items.push(item);
                            this.saveItems();
                            alert('Post salvato nei segnalibri!');
                            this.debug('Post salvato con successo (senza dati API)', 'success');
                        });
                } else {
                    // Se non troviamo l'ID, salviamo comunque il post
                    this.debug('Nessun ID discussione trovato, salvataggio semplice', 'warn');
                    const item = {
                        id: 'post_' + Date.now(),
                        type: 'post',
                        title: 'Post di ' + author.trim(),
                        content: postContent.trim().substring(0, 200) + '...',
                        url: url,
                        date: Date.now(),
                        tags: [author.trim()]
                    };
                    
                    this.items.push(item);
                    this.saveItems();
                    alert('Post salvato nei segnalibri!');
                    this.debug('Post salvato con successo (senza ID)', 'success');
                }
            } catch (error) {
                this.debug('Errore durante il salvataggio del post: ' + error.message, 'error');
                console.error('FDSS savePost Error:', error);
                alert('Errore durante il salvataggio del post: ' + error.message);
            }
        }
    };
    
    // Inizializza lo script quando il DOM è pronto
    document.addEventListener('DOMContentLoaded', function() {
        FDSS.init();
    });
})();