const style = document.createElement('style');
style.textContent = `
/* Main menu styles */
      .ffav-menu-system #ffav-favoritesMenu {
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        font-family: Arial, sans-serif;
    }

 .ffav-menu-system i.fa.fa-comments {
    font-size: xx-large;
    margin-right: 10px;
    margin-left: 3px;
}
    
    .ffav-menu-system #ffav-favButton {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background-color: #4a76a8;
        color: white;
        border: none;
        cursor: pointer;
        display: flex;
        justify-content: center;
        align-items: center;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
    }
    
    .ffav-menu-system #ffav-favButton:hover {
        background-color: #bc3232;
        transform: scale(1.05);
    }
    
    .ffav-menu-system #ffav-favButton i {
        font-size: 20px;
    }
    
    /* Menu container - responsive */
    .ffav-menu-system #ffav-menuContainer {
        display: none;
        width: 378px;
        max-width: 90vw;
        max-height: 80vh;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        margin-bottom: 10px;
        overflow: hidden;
        flex-direction: column;
    }
    
    /* Saved items style - responsive */
    .ffav-menu-system #ffav-savedItems {
        overflow-y: auto;
        max-height: calc(80vh - 70px);
        padding: 0;
        margin: 0;
        list-style: none;
        width: 100%;
    }
    
    .ffav-menu-system .ffav-saved-item {
        padding: 8px 10px;
        border-bottom: 1px solid #eee;
        display: flex;
        align-items: center;
        transition: background-color 0.2s;
    }
    
    .ffav-menu-system .ffav-saved-item:hover {
        background-color: #f5f8fa;
    }
    
    .ffav-menu-system .ffav-saved-item .ffav-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        margin-right: 10px;
        object-fit: cover;
    }
    
    .ffav-menu-system .ffav-saved-item .ffav-content {
        flex: 1;
        text-align: left;
        min-width: 0;
    }
    
    .ffav-menu-system .ffav-saved-item .ffav-title {
        font-weight: bold;
        color: #444;
        text-decoration: none;
        margin-bottom: 2px;
        display: block;
        font-size: 13px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    
    .ffav-menu-system .ffav-saved-item .ffav-excerpt {
        color: #666;
        font-size: 12px;
        margin: 3px 0;
        line-height: 1.3;
        overflow: hidden;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        text-overflow: ellipsis;
    }
    
    .ffav-menu-system .ffav-saved-item .ffav-thread-title {
        color: #666;
        font-size: 12px;
        font-style: italic;
        margin-bottom: 2px;
    }
    
    .ffav-menu-system .ffav-saved-item .ffav-date {
        color: #888;
        font-size: 11px;
    }
    
    .ffav-menu-system .ffav-saved-item .ffav-actions {
        display: flex;
        gap: 5px;
    }
    
    .ffav-menu-system .ffav-saved-item .ffav-actions button {
        background: none;
        border: none;
        color: #4a76a8;
        cursor: pointer;
        font-size: 11px;
        padding: 2px 5px;
    }
    
    .ffav-menu-system .ffav-saved-item .ffav-actions button:hover {
        text-decoration: underline;
    }
    
    /* Menu buttons style - responsive grid */
    .ffav-menu-system #ffav-menuButtons {
        display: flex;
        justify-content: space-between;
        gap: 6px;
        padding: 10px;
        border-top: 1px solid #eee;
        width: 95%;
        box-sizing: border-box;
    }
    
    /* Rimuovo il grid-column per il pulsante full width */
    .ffav-menu-system #ffav-addManualBtn {
        background-color: #4a76a8;
        flex: 1;
    }
    
    .ffav-menu-system #ffav-exportBtn {
        background-color: #4f4d46;
        flex: 1;
    }
    
    .ffav-menu-system #ffav-importBtn {
        background-color: #4f4d46;
        flex: 1;
    }
    /* Different colors for each button */
    .ffav-menu-system #ffav-addPageBtn {
        background-color: #4a76a8;
        flex: 1;
    }
    
    .ffav-menu-system #ffav-addManualBtn {
        background-color: #4a76a8;
    }
    
    .ffav-menu-system #ffav-exportBtn {
        background-color: #4f4d46;
    }
    
    .ffav-menu-system #ffav-importBtn {
        background-color: #4f4d46;
    }
    
    .ffav-menu-system .ffav-menu-btn {
        color: white;
        border: none;
        padding: 8px 0;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
        text-align: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .ffav-menu-system .ffav-menu-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 3px 5px rgba(0,0,0,0.2);
        filter: brightness(1.1);
    }
    
    /* Notification styles */
    .ffav-menu-system .ffav-notification {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        z-index: 10000;
        font-size: 14px;
        animation: ffav-fadeOut 3s forwards;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        text-align: center;
        font-family: Arial, sans-serif;
        line-height: 1.4;
        width: auto;
        max-width: 80vw;
    }
    
    .ffav-menu-system .ffav-notification.ffav-success {
        background-color: rgba(46, 125, 50, 0.9);
    }
    
    .ffav-menu-system .ffav-notification.ffav-error {
        background-color: rgba(198, 40, 40, 0.9);
    }
    
    @keyframes ffav-fadeOut {
        0% { opacity: 1; }
        70% { opacity: 1; }
        100% { opacity: 0; }
    }
    
    /* Modal styles - responsive */
    .ffav-menu-system .ffav-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        z-index: 10000;
        justify-content: center;
        align-items: center;
        font-family: Arial, sans-serif;
    }
    
    .ffav-menu-system .ffav-modal-content {
        background-color: white;
        padding: 20px;
        border-radius: 8px;
        width: 400px;
        max-width: 90vw;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    }
    
    .ffav-menu-system .ffav-modal-title {
        font-size: 18px;
        margin-bottom: 15px;
        color: #333;
    }
    
    .ffav-menu-system .ffav-form-group {
        margin-bottom: 15px;
    }
    
    .ffav-menu-system .ffav-form-group label {
        display: block;
        margin-bottom: 5px;
        font-size: 14px;
        color: #555;
    }
    
    .ffav-menu-system .ffav-form-group input {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
    }
    
    .ffav-menu-system .ffav-modal-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
    }
    
    .ffav-menu-system .ffav-modal-buttons button {
        padding: 8px 15px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    }
    
    .ffav-menu-system .ffav-modal-buttons .ffav-cancel {
        background-color: #f1f1f1;
        color: #333;
    }
    
    .ffav-menu-system .ffav-modal-buttons .ffav-save {
        background-color: #4a76a8;
        color: white;
    }
    
    /* Save post button style */
    .ffav-menu-system .ffav-save-post-btn {
        margin-right: 10px;
        color: #4a76a8;
        cursor: pointer;
    }
    
    .ffav-menu-system .ffav-save-post-btn:hover {
        color: #3a5b88;
    }
    
    /* Search container styles */
    .ffav-menu-system #ffav-searchContainer {
        padding: 10px;
        border-top: 1px solid #eee;
        width: 100%;
        box-sizing: border-box;
    }
    
    .ffav-menu-system #ffav-searchInput {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        margin-bottom: 8px;
        box-sizing: border-box;
    }
    
    .ffav-menu-system #ffav-filterOptions {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
        margin-top: 5px;
    }
    
    .ffav-menu-system .ffav-filter-btn {
        background-color: #f1f1f1;
        border: none;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        color: #555;
        transition: all 0.2s;
    }
    
    .ffav-menu-system .ffav-filter-btn:hover {
        background-color: #e0e0e0;
    }
    
    .ffav-menu-system .ffav-filter-btn.active {
        background-color: #4a76a8;
        color: white;
    }
    
span#ffav-saveThreadBtn {
    cursor: pointer;
}
    /* Mobile styles */
    @media (max-width: 768px) {
        .ffav-menu-system #ffav-favoritesMenu {
            bottom: 10px;
            left: 10px;
        }
        
        .ffav-menu-system #ffav-favButton {
            width: 60px;
            height: 60px;
        }
        
        .ffav-menu-system #ffav-favButton i {
            font-size: 24px;
        }
        
        .ffav-menu-system #ffav-menuContainer {
            max-height: 70vh;
        }
        
        .ffav-menu-system #ffav-savedItems {
            max-height: calc(70vh - 60px);
        }
        
        .ffav-menu-system .ffav-save-post-btn {
            padding: 5px 8px;
            font-size: 14px;
        }
        
        .ffav-menu-system .ffav-notification {
            padding: 8px 15px;
            font-size: 14px;
        }
/* Aggiungere questa media query alla fine del CSS esistente */
@media (max-width: 480px) {
    .ffav-menu-system .ffav-menu-btn {
        font-size: 14px;
        padding: 6px 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
    }
    
    .ffav-menu-system .ffav-menu-btn i {
        font-size: 14px;
    }
    
    .ffav-menu-system #ffav-menuButtons {
        gap: 4px;
    }
    
    .ffav-menu-system .ffav-saved-item .ffav-title {
        font-size: 14px;
    }
    
    .ffav-menu-system .ffav-saved-item .ffav-date {
        font-size: 12px;
    }
    
    .ffav-menu-system .ffav-saved-item {
        padding: 6px 8px;
    }
    
    .ffav-menu-system .ffav-saved-item .ffav-avatar {
        width: 24px;
        height: 24px;
    }
}
    }

/* Bulk delete styles */
.ffav-menu-system .ffav-bulk-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    border-bottom: 1px solid #eee;
    background-color: #f8f8f8;
    width: 100%;
    box-sizing: border-box;
}

.ffav-menu-system .ffav-bulk-actions-left {
    display: flex;
    align-items: center;
}

.ffav-menu-system .ffav-bulk-actions-right {
    display: flex;
    gap: 8px;
}

.ffav-menu-system .ffav-bulk-select-all {
    margin-right: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
}

.ffav-menu-system .ffav-bulk-select-all input {
    margin-right: 4px;
}

.ffav-menu-system .ffav-bulk-counter {
    font-size: 13px;
    color: #666;
}

.ffav-menu-system .ffav-bulk-delete-btn {
    background-color: #bc3232;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: all 0.2s;
}

.ffav-menu-system .ffav-bulk-delete-btn:hover {
    background-color: #a02020;
}

.ffav-menu-system .ffav-bulk-delete-btn:disabled {
    background-color: #d8d8d8;
    cursor: not-allowed;
}

.ffav-menu-system .ffav-bulk-cancel-btn {
    background-color: #6c757d;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: all 0.2s;
}

.ffav-menu-system .ffav-bulk-cancel-btn:hover {
    background-color: #5a6268;
}

.ffav-menu-system .ffav-bulk-mode-btn {
    background-color: #4a76a8;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: all 0.2s;
}

.ffav-menu-system .ffav-bulk-mode-btn:hover {
    background-color: #3a5b88;
}

.ffav-menu-system .ffav-saved-item.bulk-mode {
    padding-left: 35px;
    position: relative;
}

.ffav-menu-system .ffav-saved-item.bulk-mode .ffav-item-checkbox {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
}

.ffav-menu-system .ffav-item-checkbox {
    width: 18px;
    height: 18px;
    cursor: pointer;
}

/* Mobile styles for bulk delete */
@media (max-width: 768px) {
    .ffav-menu-system .ffav-bulk-actions {
        padding: 6px 8px;
    }
    
    .ffav-menu-system .ffav-bulk-counter {
        font-size: 12px;
    }
    
    .ffav-menu-system .ffav-bulk-delete-btn,
    .ffav-menu-system .ffav-bulk-cancel-btn,
    .ffav-menu-system .ffav-bulk-mode-btn {
        padding: 4px 8px;
        font-size: 11px;
    }
    
    .ffav-menu-system .ffav-saved-item.bulk-mode {
        padding-left: 30px;
    }
    
    .ffav-menu-system .ffav-item-checkbox {
        width: 16px;
        height: 16px;
    }
}`;
document.head.appendChild(style);

const favoritesStorage = {
    get: function() {
        const favorites = localStorage.getItem('forumFavorites');
        return favorites ? JSON.parse(favorites) : [];
    },
    set: function(favorites) {
        localStorage.setItem('forumFavorites', JSON.stringify(favorites));
    },
    add: function(item) {
        const favorites = this.get();
        
        if (favorites.length >= 100) {
            showNotification('Hai raggiunto il limite di 100 elementi. Elimina qualcosa prima di aggiungere nuovi elementi.', 'error', true);
            return false;
        }
        
        favorites.push({
            id: Date.now(),
            ...item,
            date: new Date().toLocaleDateString()
        });
        this.set(favorites);
        
        if (favorites.length >= 90 && favorites.length < 100) {
            showNotification(`Hai salvato ${favorites.length}/100 elementi. Stai per raggiungere il limite massimo.`, 'warning', true);
        }
        
        return favorites;
    },
    remove: function(id) {
        const favorites = this.get();
        const updatedFavorites = favorites.filter(item => item.id !== id);
        this.set(updatedFavorites);
        return updatedFavorites;
    },
    update: function(id, updatedData) {
        const favorites = this.get();
        const index = favorites.findIndex(item => item.id === id);
        if (index !== -1) {
            favorites[index] = { ...favorites[index], ...updatedData };
            this.set(favorites);
        }
        return favorites;
    },
    isAtLimit: function() {
        return this.get().length >= 100;
    }
};

const menuStateStorage = {
    get: function() {
        return localStorage.getItem('forumFavoritesMenuOpen') === 'true';
    },
    set: function(isOpen) {
        localStorage.setItem('forumFavoritesMenuOpen', isOpen.toString());
    }
};

let disableDuplicateCheck = false;

function toggleDuplicateCheck(disable = true) {
    disableDuplicateCheck = disable;
    showNotification(`Controllo duplicati ${disable ? 'disattivato' : 'attivato'}`, 'success');
    return `Duplicate checking is now ${disable ? 'disabled' : 'enabled'}`;
}

window.toggleDuplicateCheck = toggleDuplicateCheck;
window.disableDupes = () => toggleDuplicateCheck(true);
window.enableDupes = () => toggleDuplicateCheck(false);

function normalizeUrl(url) {
    try {
        const urlObj = new URL(url);
        urlObj.searchParams.delete('st');
        urlObj.searchParams.delete('view');
        
        let normalizedUrl = urlObj.toString();
        const entryMatch = url.match(/#entry(\d+)/i);
        
        return entryMatch 
            ? normalizedUrl.split('#')[0] + '#entry' + entryMatch[1]
            : normalizedUrl.split('#')[0];
    } catch (e) {
        return url;
    }
}

function isDuplicateItem(newItem, existingItems) {
    if (disableDuplicateCheck) return false;
    
    const normalizedNewUrl = normalizeUrl(newItem.url);
    
    return existingItems.some(item => {
        if (item.type !== newItem.type) return false;
        
        const normalizedExistingUrl = normalizeUrl(item.url);
        
        if (newItem.type === 'post') {
            const newEntryMatch = normalizedNewUrl.match(/#entry(\d+)/i);
            const existingEntryMatch = normalizedExistingUrl.match(/#entry(\d+)/i);
            
            if (newEntryMatch && existingEntryMatch) {
                return newEntryMatch[1] === existingEntryMatch[1];
            }
            
            const getPostId = url => {
                const match = url.match(/[?&]p=(\d+)/);
                return match ? match[1] : null;
            };
            
            const newPostId = getPostId(normalizedNewUrl);
            const existingPostId = getPostId(normalizedExistingUrl);
            
            return newPostId && existingPostId && newPostId === existingPostId;
        }
        
        if (newItem.type === 'thread') {
            const getThreadId = url => {
                const match = url.match(/[?&]t=(\d+)/);
                return match ? match[1] : null;
            };
            
            const newThreadId = getThreadId(normalizedNewUrl);
            const existingThreadId = getThreadId(normalizedExistingUrl);
            
            return newThreadId && existingThreadId && newThreadId === existingThreadId;
        }
        
        return normalizedNewUrl === normalizedExistingUrl;
    });
}

function isExactUrlSaved(url, favorites) {
    if (disableDuplicateCheck) return false;
    return favorites.some(item => normalizeUrl(item.url) === normalizeUrl(url));
}

let editingItemId = null;

function showNotification(message, type = 'normal', isLimitWarning = false) {
    const notif = document.createElement('div');
    notif.className = `ffav-notification ffav-${type}`;
    
    if (isLimitWarning) {
        notif.classList.add('ffav-limit-warning');
    }
    
    notif.textContent = message;
    
    const systemContainer = document.querySelector('.ffav-menu-system');
    systemContainer.appendChild(notif);
    
    setTimeout(() => notif.remove(), isLimitWarning ? 5000 : 3000);
}

function renderSavedItems(searchTerm = '', filters = {}) {
    const savedItems = document.getElementById('ffav-savedItems');
    if (!savedItems) return;
    
    const favorites = favoritesStorage.get();
    savedItems.innerHTML = '';
    
    const itemCount = favorites.length;
    if (itemCount >= 90 && itemCount < 100) {
        setTimeout(() => {
            showNotification(`Attenzione: hai salvato ${itemCount}/100 elementi. Stai per raggiungere il limite massimo.`, 'warning', true);
        }, 500);
    } else if (itemCount === 100) {
        setTimeout(() => {
            showNotification('Hai raggiunto il limite di 100 elementi. Elimina qualcosa prima di aggiungere nuovi elementi.', 'warning', true);
        }, 500);
    }
    
    let filteredFavorites = favorites;
  
    if (filters.type && filters.type !== 'all') {
        filteredFavorites = filteredFavorites.filter(item => item.type === filters.type);
    }
    
    if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredFavorites = filteredFavorites.filter(item => {
            return (item.title && item.title.toLowerCase().includes(searchLower)) ||
                ((item.excerpt && item.excerpt.toLowerCase().includes(searchLower)) || 
                (item.description && item.description.toLowerCase().includes(searchLower))) ||
                (item.threadTitle && item.threadTitle.toLowerCase().includes(searchLower)) ||
                (item.sectionName && item.sectionName.toLowerCase().includes(searchLower));
        });
    }
    
    // Sort items in reverse chronological order (newest first)
    filteredFavorites.sort((a, b) => b.id - a.id);
    
    if (filteredFavorites.length === 0) {
        savedItems.innerHTML = searchTerm || filters.type !== 'all'
            ? '<li class="ffav-saved-item ffav-no-results">Nessun risultato trovato per i filtri selezionati</li>'
            : '<li class="ffav-saved-item"><div class="ffav-content">Nessun elemento salvato</div></li>';
        return;
    }
    
    filteredFavorites.forEach(item => {
        const listItem = document.createElement('li');
        listItem.className = 'ffav-saved-item';
        
        // Add bulk-mode class if in bulk mode
        if (isBulkMode) {
            listItem.classList.add('bulk-mode');
        }
        
        let itemHTML = '';
        
        // Add checkbox for bulk mode
        if (isBulkMode) {
            itemHTML += `<input type="checkbox" class="ffav-item-checkbox" data-id="${item.id}" ${selectedItems.includes(item.id) ? 'checked' : ''}>`;
        }
        
        if (item.type === 'post') {
            const excerptHTML = item.excerpt ? `<div class="ffav-excerpt">${item.excerpt}</div>` : '';
            const displayTitle = item.threadTitle ? `${item.title} in ${item.threadTitle}` : item.title;
            
            itemHTML += `
                <img src="${item.avatar || 'https://img.forumfree.net/style_images/default_avatar.png'}" class="ffav-avatar" alt="Avatar">
                <div class="ffav-content">
                    <a href="${item.url}" class="ffav-title" target="_self">${displayTitle}</a>
                    ${excerptHTML}
                    <div class="ffav-date">${item.date}</div>
                </div>
            `;
            
            // Only show action buttons if not in bulk mode
            if (!isBulkMode) {
                itemHTML += `
                <div class="ffav-actions">
                    <button data-id="${item.id}" class="ffav-edit-btn"><i class="fa fa-pencil"></i></button>
                    <button data-id="${item.id}" class="ffav-delete-btn"><i class="fa fa-trash"></i></button>
                </div>`;
            }
        } else if (item.type === 'thread') {
            const descriptionHTML = item.description ? `<div class="ffav-excerpt">${item.description}</div>` : '';
            const displayTitle = item.sectionName ? `${item.title} in ${item.sectionName}` : item.title;
            
            itemHTML += `
                <div class="ffav-avatar-placeholder"><i class="fa fa-comments"></i></div>
                <div class="ffav-content">
                    <a href="${item.url}" class="ffav-title" target="_self">${displayTitle}</a>
                    ${descriptionHTML}
                    <div class="ffav-date"><span class="ffav-saved-date">${item.date}</span></div>
                </div>
            `;
            
            // Only show action buttons if not in bulk mode
            if (!isBulkMode) {
                itemHTML += `
                <div class="ffav-actions">
                    <button data-id="${item.id}" class="ffav-edit-btn"><i class="fa fa-pencil"></i></button>
                    <button data-id="${item.id}" class="ffav-delete-btn"><i class="fa fa-trash"></i></button>
                </div>`;
            }
        } else {
            itemHTML += `
                <div class="ffav-content">
                    <a href="${item.url}" class="ffav-title" target="_self">${item.title}</a>
                    <div class="ffav-date">${item.date}</div>
                </div>
            `;
            
            // Only show action buttons if not in bulk mode
            if (!isBulkMode) {
                itemHTML += `
                <div class="ffav-actions">
                    <button data-id="${item.id}" class="ffav-edit-btn"><i class="fa fa-pencil"></i></button>
                    <button data-id="${item.id}" class="ffav-delete-btn"><i class="fa fa-trash"></i></button>
                </div>`;
            }
        }
        
        listItem.innerHTML = itemHTML;
        savedItems.appendChild(listItem);
    });

    // Add event listeners for checkboxes in bulk mode
    if (isBulkMode) {
        document.querySelectorAll('.ffav-item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', handleItemCheckboxClick);
        });
    }

    // Add event listeners for edit and delete buttons
    document.querySelectorAll('.ffav-edit-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const id = parseInt(e.target.closest('.ffav-edit-btn').dataset.id);
            const item = favoritesStorage.get().find(item => item.id === id);
            
            if (item) {
                editingItemId = id;
                document.getElementById('ffav-linkTitle').value = item.title;
                document.getElementById('ffav-linkUrl').value = item.url;
                document.getElementById('ffav-favoritesModal').style.display = 'flex';
            }
        });
    });
    
    document.querySelectorAll('.ffav-delete-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const id = parseInt(e.target.closest('.ffav-delete-btn').dataset.id);
            const item = favoritesStorage.get().find(item => item.id === id);
            const itemTitle = item ? item.title : 'questo elemento';
            
            if (confirm(`Sei sicuro di voler eliminare "${itemTitle}" dai segnalibri?`)) {
                favoritesStorage.remove(id);
                renderSavedItems(searchTerm, filters);
                showNotification('Elemento eliminato', 'success');
            }
        });
    });
}

// Add these global variables at the top of your script, before any functions
let isBulkMode = false;
let selectedItems = [];

// Add the handleItemCheckboxClick function to the global scope
function handleItemCheckboxClick(e) {
    const id = parseInt(e.target.dataset.id);
    
    if (e.target.checked) {
        if (!selectedItems.includes(id)) {
            selectedItems.push(id);
        }
    } else {
        selectedItems = selectedItems.filter(itemId => itemId !== id);
        document.getElementById('ffav-select-all').checked = false;
    }
    
    updateBulkCounter();
    updateBulkDeleteButton();
}

// Add these utility functions to the global scope as well
function updateBulkCounter() {
    const bulkCounter = document.querySelector('.ffav-bulk-counter');
    if (bulkCounter) {
        bulkCounter.textContent = `${selectedItems.length} selezionati`;
    }
}

function updateBulkDeleteButton() {
    const bulkDeleteBtn = document.getElementById('ffav-bulk-delete-btn');
    if (bulkDeleteBtn) {
        bulkDeleteBtn.disabled = selectedItems.length === 0;
    }
}

// Then in the createFavoritesMenu function, remove the handleItemCheckboxClick function
function createFavoritesMenu() {
    const systemContainer = document.createElement('div');
    systemContainer.className = 'ffav-menu-system';
    document.body.appendChild(systemContainer);
    
    const menuHTML = `
         <div id="ffav-favoritesMenu">
        <div id="ffav-menuContainer">
            <div id="ffav-bulk-actions" class="ffav-bulk-actions" style="display: none;">
                <div class="ffav-bulk-actions-left">
                    <label class="ffav-bulk-select-all">
                        <input type="checkbox" id="ffav-select-all">
                        <span>Seleziona tutti</span>
                    </label>
                    <span class="ffav-bulk-counter">0 selezionati</span>
                </div>
                <div class="ffav-bulk-actions-right">
                    <button class="ffav-bulk-delete-btn" id="ffav-bulk-delete-btn" disabled>
                        <i class="fa fa-trash"></i> Elimina
                    </button>
                    <button class="ffav-bulk-cancel-btn" id="ffav-bulk-cancel-btn">
                        <i class="fa fa-times"></i> Annulla
                    </button>
                </div>
            </div>
            <ul id="ffav-savedItems"></ul>
            <div id="ffav-searchContainer">
                <input type="text" id="ffav-searchInput" placeholder="Cerca nei segnalibri...">
                <div id="ffav-filterOptions">
                    <button class="ffav-filter-btn active" data-filter="all">Tutti</button>
                    <button class="ffav-filter-btn" data-filter="post">Post</button>
                    <button class="ffav-filter-btn" data-filter="thread">Discussioni</button>
                    <button class="ffav-filter-btn" data-filter="page">Link</button>
                </div>
            </div>
            <div id="ffav-menuButtons">
                <button class="ffav-menu-btn" id="ffav-addManualBtn"><i class="fa fa-plus-circle"></i> Nuovo link</button>
                <button class="ffav-menu-btn" id="ffav-exportBtn"><i class="fa fa-download"></i> Esporta</button>
                <button class="ffav-menu-btn" id="ffav-importBtn"><i class="fa fa-upload"></i> Importa</button>
                <button class="ffav-menu-btn ffav-bulk-mode-btn" id="ffav-bulk-mode-btn">
                    <i class="fa fa-check-square-o"></i> Selezione multipla
                </button>
            </div>
        </div>
        <button id="ffav-favButton">
            <i class="fa fa-bookmark"></i>
        </button>
    </div>
    `;
    
    systemContainer.innerHTML = menuHTML;

    const modalHTML = `
        <div id="ffav-favoritesModal" class="ffav-modal">
            <div class="ffav-modal-content">
                <div class="ffav-modal-title">Aggiungi/Modifica</div>
                <div class="ffav-form-group">
                    <label for="ffav-linkTitle">Titolo</label>
                    <input type="text" id="ffav-linkTitle" placeholder="Titolo del link">
                </div>
                <div class="ffav-form-group">
                    <label for="ffav-linkUrl">URL</label>
                    <input type="text" id="ffav-linkUrl" placeholder="URL completo">
                </div>
                <div class="ffav-modal-buttons">
                    <button class="ffav-cancel" id="ffav-cancelModal">Annulla</button>
                    <button class="ffav-save" id="ffav-saveLink">Salva</button>
                </div>
            </div>
        </div>
    `;
    
    systemContainer.insertAdjacentHTML('beforeend', modalHTML);
   
    const favButton = document.getElementById('ffav-favButton');
    const menuContainer = document.getElementById('ffav-menuContainer');
    const addManualBtn = document.getElementById('ffav-addManualBtn');
    const exportBtn = document.getElementById('ffav-exportBtn');
    const importBtn = document.getElementById('ffav-importBtn');
    const modal = document.getElementById('ffav-favoritesModal');
    const cancelModal = document.getElementById('ffav-cancelModal');
    const saveLink = document.getElementById('ffav-saveLink');
    const linkTitle = document.getElementById('ffav-linkTitle');
    const linkUrl = document.getElementById('ffav-linkUrl');
    const searchInput = document.getElementById('ffav-searchInput');
    const filterButtons = document.querySelectorAll('.ffav-filter-btn');
    
    // Bulk delete elements
    const bulkModeBtn = document.getElementById('ffav-bulk-mode-btn');
    const bulkActions = document.getElementById('ffav-bulk-actions');
    const selectAllCheckbox = document.getElementById('ffav-select-all');
    const bulkDeleteBtn = document.getElementById('ffav-bulk-delete-btn');
    const bulkCancelBtn = document.getElementById('ffav-bulk-cancel-btn');
    const bulkCounter = document.querySelector('.ffav-bulk-counter');
    
    // Bulk mode toggle
    bulkModeBtn.addEventListener('click', () => {
        toggleBulkMode(!isBulkMode);
    });
    
    // Select all checkbox
    selectAllCheckbox.addEventListener('change', () => {
        const isChecked = selectAllCheckbox.checked;
        const checkboxes = document.querySelectorAll('.ffav-item-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        
        if (isChecked) {
            selectedItems = Array.from(checkboxes).map(checkbox => parseInt(checkbox.dataset.id));
        } else {
            selectedItems = [];
        }
        
        updateBulkCounter();
        updateBulkDeleteButton();
    });
    
    // Bulk delete button
    bulkDeleteBtn.addEventListener('click', () => {
        if (selectedItems.length === 0) return;
        
        if (confirm(`Sei sicuro di voler eliminare ${selectedItems.length} elementi dai segnalibri?`)) {
            const favorites = favoritesStorage.get();
            const updatedFavorites = favorites.filter(item => !selectedItems.includes(item.id));
            
            favoritesStorage.set(updatedFavorites);
            showNotification(`${selectedItems.length} elementi eliminati`, 'success');
            
            toggleBulkMode(false);
            renderSavedItems(searchInput.value.trim(), currentFilters);
        }
    });
    
    // Bulk cancel button
    bulkCancelBtn.addEventListener('click', () => {
        toggleBulkMode(false);
    });
    
    // Toggle bulk mode function
    function toggleBulkMode(enable) {
        isBulkMode = enable;
        
        if (enable) {
            bulkActions.style.display = 'flex';
            bulkModeBtn.style.display = 'none';
            selectedItems = [];
            updateBulkCounter();
            updateBulkDeleteButton();
        } else {
            bulkActions.style.display = 'none';
            bulkModeBtn.style.display = 'flex';
            selectAllCheckbox.checked = false;
        }
        
        renderSavedItems(searchInput.value.trim(), currentFilters);
    }
    
    // Update bulk counter
    function updateBulkCounter() {
        bulkCounter.textContent = `${selectedItems.length} selezionati`;
    }
    
    // Update bulk delete button state
    function updateBulkDeleteButton() {
        bulkDeleteBtn.disabled = selectedItems.length === 0;
    }
    
    // Handle item checkbox click
    function handleItemCheckboxClick(e) {
        const id = parseInt(e.target.dataset.id);
        
        if (e.target.checked) {
            if (!selectedItems.includes(id)) {
                selectedItems.push(id);
            }
        } else {
            selectedItems = selectedItems.filter(itemId => itemId !== id);
            selectAllCheckbox.checked = false;
        }
        
        updateBulkCounter();
        updateBulkDeleteButton();
    }
   
    const currentFilters = { type: 'all' };
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            filterButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            currentFilters.type = this.dataset.filter;
            renderSavedItems(searchInput.value.trim(), currentFilters);
        });
    });
    
    searchInput.addEventListener('input', e => {
        renderSavedItems(e.target.value.trim(), currentFilters);
    });
    
    favButton.addEventListener('click', () => {
        if (menuContainer.style.display === 'flex') {
            menuContainer.style.display = 'none';
            menuStateStorage.set(false);
        } else {
            menuContainer.style.display = 'flex';
            menuStateStorage.set(true);
            searchInput.value = '';
            filterButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.filter === 'all') {
                    btn.classList.add('active');
                }
            });
            currentFilters.type = 'all';
            renderSavedItems();
        }
    });
    
    if (menuStateStorage.get()) {
        menuContainer.style.display = 'flex';
        renderSavedItems();
    }
    
    addManualBtn.addEventListener('click', () => {
        editingItemId = null;
        linkTitle.value = '';
        linkUrl.value = '';
        modal.style.display = 'flex';
    });
    
    saveLink.addEventListener('click', () => {
        const title = linkTitle.value.trim();
        const url = linkUrl.value.trim();
        
        if (!title || !url) {
            showNotification('Inserisci titolo e URL', 'error');
            return;
        }
        
        if (!editingItemId) {
            const favorites = favoritesStorage.get();
            if (isDuplicateItem({url: url, type: 'page'}, favorites)) {
                showNotification('Questo link è già nei segnalibri', 'error');
                return;
            }
            
            if (favoritesStorage.isAtLimit()) {
                showNotification('Hai raggiunto il limite di 100 elementi. Elimina qualcosa prima di aggiungere nuovi elementi.', 'error');
                return;
            }
        }
        
        if (editingItemId) {
            favoritesStorage.update(editingItemId, { title, url });
            showNotification('Link aggiornato', 'success');
        } else {
            favoritesStorage.add({
                title,
                url,
                type: 'page'
            });
            showNotification('Link aggiunto ai segnalibri', 'success');
        }
        
        modal.style.display = 'none';
        renderSavedItems();
    });
    
    cancelModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    modal.addEventListener('click', e => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    exportBtn.addEventListener('click', () => {
        const favorites = favoritesStorage.get();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(favorites));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "segnalibri_forum.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        showNotification('Segnalibri esportati', 'success');
    });
    
    importBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = event => {
                    try {
                        const favorites = JSON.parse(event.target.result);
                        favoritesStorage.set(favorites);
                        renderSavedItems();
                        showNotification('Segnalibri importati con successo', 'success');
                    } catch (error) {
                        showNotification('Errore durante l\'importazione', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    });
}

function addSavePostButtons() {
    const posts = document.querySelectorAll('li[id^="ee"]');
    if (posts.length === 0) return;
    
    let threadTitle = '';
    const titleElement = document.querySelector('.mtitle h1') || document.querySelector('.title strong');
    if (titleElement) {
        threadTitle = titleElement.textContent.trim();
    }
    
    posts.forEach(post => {
        try {
            const isMobileStructure = post.querySelector('.details .group') !== null;
            isMobileStructure ? handleMobilePost(post, threadTitle) : handleDesktopPost(post, threadTitle);
        } catch (e) {
            console.error('Errore durante l\'aggiunta del pulsante salva post:', e);
        }
    });
}

function handleDesktopPost(post, threadTitle) {
    const buttonContainer = post.querySelector('.mini_buttons.lt.Sub');
    if (!buttonContainer || buttonContainer.querySelector('.ffav-save-post-btn')) return;
    
    const nickname = post.querySelector('.nick a').textContent;
    const postLink = post.querySelector('.lt.Sub a:nth-child(2)').getAttribute('href');
    const dateElement = post.querySelector('.when span:nth-child(2)');
    const date = dateElement ? dateElement.textContent.trim() : 'Data sconosciuta';
    const avatar = post.querySelector('.avatar img').getAttribute('src');
    
    const contentTable = post.querySelector('.right.Item > table.color');
    let postContent = '';
    if (contentTable) {
        const contentClone = contentTable.cloneNode(true);
        const quoteElements = contentClone.querySelectorAll('.quote_top, .quote');
        quoteElements.forEach(element => element.remove());
        
        postContent = contentClone.textContent.trim().replace(/\s+/g, ' ');
        const words = postContent.split(' ');
        if (words.length > 20) {
            postContent = words.slice(0, 20).join(' ') + '...';
        }
    }
    
    const saveBtn = document.createElement('a');
    saveBtn.className = 'ffav-save-post-btn';
    saveBtn.href = 'javascript:void(0)';
    saveBtn.innerHTML = '<i class="fa fa-bookmark"></i> Aggiungi ai segnalibri';
    
    saveBtn.addEventListener('click', function() {
        const postTitle = `${nickname}`;
        const fullPostUrl = new URL(postLink, window.location.origin).href;
        
        const favorites = favoritesStorage.get();
        if (isDuplicateItem({type: 'post', url: fullPostUrl}, favorites)) {
            showNotification('Questo post è già nei segnalibri', 'error');
            return;
        }
        
        favoritesStorage.add({
            title: postTitle,
            url: fullPostUrl,
            type: 'post',
            avatar: avatar,
            author: nickname,
            date: date,
            excerpt: postContent,
            threadTitle: threadTitle
        });
        
        // Removing this code that opens the menu
        // const menuContainer = document.getElementById('ffav-menuContainer');
        // if (menuContainer && menuContainer.style.display !== 'flex') {
        //     menuContainer.style.display = 'flex';
        //     menuStateStorage.set(true);
        // }
        
        renderSavedItems();
        showNotification('Post salvato nei segnalibri', 'success');
    });
    
    buttonContainer.insertBefore(saveBtn, buttonContainer.firstChild);
}

function handleMobilePost(post, threadTitle) {
    if (post.querySelector('.ffav-save-post-btn-mobile')) return;
    
    try {
        const nickname = post.querySelector('.details .nick').textContent.trim();
        const avatar = post.querySelector('.details .avatar img').getAttribute('src');
        const linkElement = post.querySelector('.option a');
        const postLink = linkElement ? linkElement.getAttribute('href') : window.location.href;
        const dateElement = post.querySelector('.option .timeago');
        const date = dateElement ? dateElement.getAttribute('title') : 'Data sconosciuta';

        const contentTable = post.querySelector('table.color');
        let postContent = '';
        if (contentTable) {
            postContent = contentTable.textContent.trim().replace(/\s+/g, ' ');
            const words = postContent.split(' ');
            if (words.length > 20) {
                postContent = words.slice(0, 20).join(' ') + '...';
            }
        }

        const saveBtn = document.createElement('a');
        saveBtn.className = 'ffav-save-post-btn-mobile';
        saveBtn.href = 'javascript:void(0)';
        saveBtn.innerHTML = '<i class="fa fa-bookmark"></i>';
        saveBtn.style.marginRight = '5px';
        saveBtn.style.color = '#4a76a8';
        saveBtn.style.cursor = 'pointer';

        saveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const postTitle = `${nickname}`;
            const fullPostUrl = new URL(postLink, window.location.origin).href;

            const favorites = favoritesStorage.get();
            if (isDuplicateItem({type: 'post', url: fullPostUrl}, favorites)) {
                showNotification('Questo post è già nei segnalibri', 'error');
                return;
            }

            favoritesStorage.add({
                title: postTitle,
                url: fullPostUrl,
                type: 'post',
                avatar: avatar,
                author: nickname,
                date: date,
                excerpt: postContent,
                threadTitle: threadTitle
            });
            
            // Remove this code to prevent menu from opening
            // const menuContainer = document.getElementById('ffav-menuContainer');
            // if (menuContainer && menuContainer.style.display !== 'flex') {
            //     menuContainer.style.display = 'flex';
            //     menuStateStorage.set(true);
            // }
            
            renderSavedItems();
            showNotification('Post salvato nei segnalibri', 'success');
        });
        
        const groupElement = post.querySelector('.details .group');
        if (groupElement) {
            groupElement.parentNode.insertBefore(saveBtn, groupElement);
        }
    } catch (e) {
        console.error('Errore durante l\'aggiunta del pulsante salva post mobile:', e);
    }
}

function addSaveThreadButton() {
    if (!window.location.href.includes('?t=')) return;
    
    const isMobile = document.querySelector('.title strong') !== null;
    isMobile ? addMobileThreadButton() : addDesktopThreadButton();
}

function addDesktopThreadButton() {
    let toolbar = document.querySelector('.buttons') || 
                 document.querySelector('.right.Sub.buttons') || 
                 document.querySelector('.right.Sub') || 
                 document.querySelector('.forum_tools');
    
    if (!toolbar || document.getElementById('ffav-saveThreadBtn')) return;
    
    let threadTitle = '';
    let threadDescription = '';
    let sectionName = '';

    const titleElement = document.querySelector('.mtitle h1');
    if (titleElement) {
        threadTitle = titleElement.textContent.trim();
    }
    
    const descElement = document.querySelector('.mtitle h2.mdesc');
    if (descElement) {
        threadDescription = descElement.textContent.trim();
    }

    const sectionLink = document.querySelector('.nav li:nth-child(2) a');
    if (sectionLink) {
        sectionName = sectionLink.textContent.trim();
    }

    let threadUrl = window.location.href;
    if (threadUrl.includes('&st=')) {
        threadUrl = threadUrl.split('&st=')[0];
    }

    const saveBtn = document.createElement('span');
    saveBtn.id = 'ffav-saveThreadBtn';
    saveBtn.innerHTML = '<i class="fa fa-bookmark"></i> Salva Discussione';

    saveBtn.addEventListener('click', function() {
        const favorites = favoritesStorage.get();
        if (isDuplicateItem({url: threadUrl, type: 'thread'}, favorites)) {
            showNotification('Questa discussione è già nei segnalibri', 'error');
            return;
        }
        
        favoritesStorage.add({
            title: threadTitle,
            description: threadDescription,
            sectionName: sectionName,
            url: threadUrl,
            type: 'thread'
        });
        
        // Remove these lines to prevent the menu from opening
        // const menuContainer = document.getElementById('ffav-menuContainer');
        // if (menuContainer && menuContainer.style.display !== 'flex') {
        //     menuContainer.style.display = 'flex';
        //     menuStateStorage.set(true);
        // }
        
        renderSavedItems();
        showNotification('Discussione salvata nei segnalibri', 'success');
    });
    
    toolbar.insertBefore(saveBtn, toolbar.firstChild);
}

function addMobileThreadButton() {
    if (document.querySelector('.ffav-save-thread-btn-mobile')) return;

    let threadTitle = '';
    let threadDescription = '';
    let sectionName = '';

    const titleElement = document.querySelector('.title strong');
    if (titleElement) threadTitle = titleElement.textContent.trim();
    
    const descElement = document.querySelector('.title .desc');
    if (descElement) threadDescription = descElement.textContent.trim().replace(/^,\s*/, '');
    
    const sectionElement = document.querySelector('.title .section-title');
    if (sectionElement) {
        sectionName = Array.from(sectionElement.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE)
            .map(node => node.textContent.trim())
            .join('').trim();
    }
    
    let threadUrl = window.location.href;
    if (threadUrl.includes('&st=')) threadUrl = threadUrl.split('&st=')[0];
    
    const popShareElement = document.querySelector('.pop-share');
    if (!popShareElement) return;
    
    const saveBtn = document.createElement('span');
    saveBtn.className = 'ffav-save-thread-btn-mobile';
    saveBtn.innerHTML = '<i class="fa fa-bookmark"></i>';
    saveBtn.style.marginRight = '10px';
    saveBtn.style.color = '#646464';
    saveBtn.style.cursor = 'pointer';
    saveBtn.style.fontSize = '1.6em';
    
    saveBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        const favorites = favoritesStorage.get();
        if (isDuplicateItem({url: threadUrl, type: 'thread'}, favorites)) {
            showNotification('Questa discussione è già nei segnalibri', 'error');
            return;
        }

        favoritesStorage.add({
            title: threadTitle,
            description: threadDescription,
            sectionName: sectionName,
            url: threadUrl,
            type: 'thread'
        });
        
        // Remove these lines to prevent the menu from opening automatically
        // const menuContainer = document.getElementById('ffav-menuContainer');
        // if (menuContainer && menuContainer.style.display !== 'flex') {
        //     menuContainer.style.display = 'flex';
        //     menuStateStorage.set(true);
        // }
        
        renderSavedItems();
        showNotification('Discussione salvata nei segnalibri', 'success');
    });
    
    popShareElement.parentNode.insertBefore(saveBtn, popShareElement);
}

function handleResize() {
    const menuContainer = document.getElementById('ffav-menuContainer');
    const savedItems = document.getElementById('ffav-savedItems');
    
    if (!menuContainer || !savedItems) return;
    
    if (window.innerWidth <= 768) {
        menuContainer.style.maxWidth = '90vw';
        savedItems.style.maxHeight = 'calc(70vh - 60px)';
    } else {
        menuContainer.style.maxWidth = '378px';
        savedItems.style.maxHeight = 'calc(80vh - 70px)';
    }
}

function init() {
    createFavoritesMenu();
    addSavePostButtons();
    addSaveThreadButton();
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === 1 && node.matches('li[id^="ee"]')) {
                        addSavePostButtons();
                        break;
                    }
                }
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

document.readyState === 'loading' 
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

