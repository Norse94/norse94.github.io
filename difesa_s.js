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
        max-width: 90vw;
        width: 400px;
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
        width: 100%;
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

    .ffav-menu-system #ffav-moreBtn {
        background-color: #4f4d46;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        transition: all 0.2s;
        flex: 1;
    }
    
    .ffav-menu-system #ffav-moreBtn:hover {
        background-color: #3a3936;
    }
    /* Different colors for each button */
    .ffav-menu-system #ffav-addPageBtn {
        background-color: #4a76a8;
        flex: 1;
    }
    
    /* Add this to your CSS styles section */
.ffav-menu-system .ffav-bulk-mode-btn.disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* Add these toggle switch styles to your CSS */
.ffav-menu-system .ffav-toggle-switch {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 20px;
    margin-right: 8px;
}

.ffav-menu-system .ffav-toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.ffav-menu-system .ffav-toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: .4s;
    border-radius: 34px;
}

.ffav-menu-system .ffav-toggle-slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
}

.ffav-menu-system .ffav-toggle-switch input:checked + .ffav-toggle-slider {
    background-color: #4a76a8;
}

.ffav-menu-system .ffav-toggle-switch input:checked + .ffav-toggle-slider:before {
    transform: translateX(20px);
}

/* Add these styles for the select all button and selected items */
.ffav-menu-system .ffav-bulk-select-all {
    margin-right: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
}

.ffav-menu-system .ffav-bulk-select-all .ffav-toggle-switch {
    display: none; /* Hide the toggle switch */
}

.ffav-menu-system .ffav-select-all-btn {
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

.ffav-menu-system .ffav-select-all-btn:hover {
    background-color: #3a5b88;
}

.ffav-menu-system .ffav-saved-item.bulk-mode {
    position: relative;
    cursor: pointer;
    padding-left: 15px;
    transition: background-color 0.2s;
}

.ffav-menu-system .ffav-saved-item.bulk-mode .ffav-item-toggle {
    display: none; /* Hide the toggle switch */
}

.ffav-menu-system .ffav-saved-item.bulk-mode.selected {
    background-color: rgba(74, 118, 168, 0.15);
    border-left: 3px solid #4a76a8;
}

.ffav-menu-system .ffav-saved-item.bulk-mode.selected .ffav-title {
    color: #4a76a8;
    font-weight: bold;
}

.ffav-menu-system .ffav-saved-item.bulk-mode a {
    pointer-events: none; /* Disable link clicks in bulk mode */
}

/* Add a visual indicator for selected items */
.ffav-menu-system .ffav-saved-item.bulk-mode::before {
    content: "";
    position: absolute;
    left: 5px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 5px 0 5px 8px;
    border-color: transparent transparent transparent #4a76a8;
    opacity: 0;
    transition: opacity 0.2s;
}

.ffav-menu-system .ffav-saved-item.bulk-mode.selected::before {
    opacity: 1;
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
/* Add these styles for the item toggle switches */
.ffav-menu-system .ffav-saved-item.bulk-mode {
    padding-left: 50px;
    position: relative;
}

.ffav-menu-system .ffav-saved-item.bulk-mode .ffav-item-toggle {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 30px;
    height: 16px;
}

.ffav-menu-system .ffav-saved-item.bulk-mode .ffav-item-toggle .ffav-toggle-slider:before {
    height: 12px;
    width: 12px;
}

.ffav-menu-system .ffav-saved-item.bulk-mode .ffav-item-toggle input:checked + .ffav-toggle-slider:before {
    transform: translateX(14px);
}

/* Mobile styles for toggle switches */
@media (max-width: 768px) {
    .ffav-menu-system .ffav-toggle-switch {
        width: 36px;
        height: 18px;
    }
    
    .ffav-menu-system .ffav-toggle-slider:before {
        height: 14px;
        width: 14px;
    }
    
    .ffav-menu-system .ffav-toggle-switch input:checked + .ffav-toggle-slider:before {
        transform: translateX(18px);
    }
    
    .ffav-menu-system .ffav-saved-item.bulk-mode {
        padding-left: 45px;
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
}
    /* Add styles for the more options modal */
    .ffav-menu-system .ffav-more-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        z-index: 10001; /* Increased z-index to ensure it appears above other elements */
        justify-content: center;
        align-items: center;
        font-family: Arial, sans-serif;
    }
    
    .ffav-menu-system .ffav-more-modal-content {
        background-color: white;
        padding: 20px;
        border-radius: 8px;
        width: 300px;
        max-width: 90vw;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        position: relative; /* Added position relative */
        z-index: 10002; /* Ensure content is above the overlay */
    }
    
    .ffav-menu-system .ffav-more-modal-title {
        font-size: 18px;
        margin-bottom: 15px;
        color: #333;
        text-align: center;
    }
    
    .ffav-menu-system .ffav-more-options {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    
    .ffav-menu-system .ffav-more-option-btn {
        background-color: #4a76a8;
        color: white;
        border: none;
        padding: 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s;
    }
    
    .ffav-menu-system .ffav-more-option-btn:hover {
        background-color: #3a5b88;
    }
    
    .ffav-menu-system .ffav-more-close {
        text-align: center;
        margin-top: 15px;
    }
    
    .ffav-menu-system .ffav-more-close-btn {
        background-color: #f1f1f1;
        color: #333;
        border: none;
        padding: 8px 15px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
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
    filteredFavorites.sort((a, b) => b.id - a.id);
    
    if (filteredFavorites.length === 0) {
        savedItems.innerHTML = searchTerm || filters.type !== 'all'
            ? '<li class="ffav-saved-item ffav-no-results">Nessun risultato trovato per i filtri selezionati</li>'
            : '<li class="ffav-saved-item"><div class="ffav-content">Nessun elemento salvato</div></li>';
        return;
    }
    
    // In the renderSavedItems function, modify how we handle bulk mode items
    filteredFavorites.forEach(item => {
        const listItem = document.createElement('li');
        listItem.className = 'ffav-saved-item';
        
        // Add bulk-mode class if in bulk mode
        if (isBulkMode) {
            listItem.classList.add('bulk-mode');
            if (selectedItems.includes(item.id)) {
                listItem.classList.add('selected');
            }
            
            // Add click event to the entire list item with improved handling
            listItem.addEventListener('click', (e) => {
                // We'll handle all clicks in bulk mode
                e.preventDefault();
                e.stopPropagation();
                
                const id = item.id;
                const isSelected = selectedItems.includes(id);
                
                if (isSelected) {
                    selectedItems = selectedItems.filter(itemId => itemId !== id);
                    listItem.classList.remove('selected');
                } else {
                    selectedItems.push(id);
                    listItem.classList.add('selected');
                }
                
                // Update the hidden checkbox state
                const checkbox = listItem.querySelector('.ffav-item-checkbox');
                if (checkbox) {
                    checkbox.checked = !isSelected;
                }
                
                updateBulkCounter();
                updateBulkDeleteButton();
                
                // If all items are selected, check the "select all" checkbox
                const allCheckboxes = document.querySelectorAll('.ffav-item-checkbox');
                const allSelected = Array.from(allCheckboxes).every(cb => selectedItems.includes(parseInt(cb.dataset.id)));
                // No need to update checkbox state since we're using a button now
            });
        }
        
        let itemHTML = '';
        if (isBulkMode) {
            itemHTML += `
            <label class="ffav-toggle-switch ffav-item-toggle">
                <input type="checkbox" class="ffav-item-checkbox" data-id="${item.id}" ${selectedItems.includes(item.id) ? 'checked' : ''}>
                <span class="ffav-toggle-slider"></span>
            </label>`;
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


let isBulkMode = false;
let selectedItems = [];

function handleItemCheckboxClick(e) {

    e.stopPropagation();
    
    const id = parseInt(e.target.dataset.id);
    const listItem = e.target.closest('.ffav-saved-item');
    
    if (e.target.checked) {
        if (!selectedItems.includes(id)) {
            selectedItems.push(id);
            if (listItem) listItem.classList.add('selected');
        }
    } else {
        selectedItems = selectedItems.filter(itemId => itemId !== id);
        if (listItem) listItem.classList.remove('selected');
        document.getElementById('ffav-select-all').checked = false;
    }
    
    updateBulkCounter();
    updateBulkDeleteButton();
}

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
function createFavoritesMenu() {
    const systemContainer = document.createElement('div');
    systemContainer.className = 'ffav-menu-system';
    document.body.appendChild(systemContainer);
    const menuHTML = `
     <div id="ffav-favoritesMenu">
        <div id="ffav-menuContainer">
            <div id="ffav-bulk-actions" class="ffav-bulk-actions" style="display: none;">
                <div class="ffav-bulk-actions-left">
                    <button class="ffav-select-all-btn" id="ffav-select-all-btn">
                        <i class="fa fa-check-square-o"></i> Seleziona tutti
                    </button>
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
                <button id="ffav-addManualBtn" class="ffav-menu-btn"><i class="fa fa-plus"></i> Aggiungi</button>
                <button id="ffav-bulk-mode-btn" class="ffav-menu-btn"><i class="fa fa-check-square-o"></i> Selezione</button>
                <button id="ffav-moreBtn" class="ffav-menu-btn"><i class="fa fa-ellipsis-h"></i> Altro</button>
            </div>
        </div>
        <button id="ffav-favButton"><i class="fa fa-bookmark"></i></button>
    </div>
    <div id="ffav-favoritesModal" class="ffav-modal">
        <div class="ffav-modal-content">
            <div class="ffav-modal-title">Aggiungi ai segnalibri</div>
            <div class="ffav-form-group">
                <label for="ffav-linkTitle">Titolo</label>
                <input type="text" id="ffav-linkTitle" placeholder="Titolo del link">
            </div>
            <div class="ffav-form-group">
                <label for="ffav-linkUrl">URL</label>
                <input type="text" id="ffav-linkUrl" placeholder="https://...">
            </div>
            <div class="ffav-modal-buttons">
                <button class="ffav-cancel">Annulla</button>
                <button class="ffav-save">Salva</button>
            </div>
        </div>
    </div>
    <div id="ffav-moreModal" class="ffav-more-modal">
        <div class="ffav-more-modal-content">
            <div class="ffav-more-modal-title">Altre opzioni</div>
            <div class="ffav-more-options">
                <button id="ffav-exportBtn" class="ffav-more-option-btn">
                    <i class="fa fa-download"></i> Esporta segnalibri
                </button>
                <button id="ffav-importBtn" class="ffav-more-option-btn">
                    <i class="fa fa-upload"></i> Importa segnalibri
                </button>
            </div>
            <div class="ffav-more-close">
                <button class="ffav-more-close-btn">Chiudi</button>
            </div>
        </div>
    </div>`;
    
    systemContainer.innerHTML = menuHTML;

    // Get references to DOM elements AFTER they've been created
    const favButton = document.getElementById('ffav-favButton');
    const menuContainer = document.getElementById('ffav-menuContainer');
    const bulkModeBtn = document.getElementById('ffav-bulk-mode-btn');
    const bulkActions = document.getElementById('ffav-bulk-actions');
    const selectAllBtn = document.getElementById('ffav-select-all-btn');
    const bulkDeleteBtn = document.getElementById('ffav-bulk-delete-btn');
    const bulkCancelBtn = document.getElementById('ffav-bulk-cancel-btn');
    const bulkCounter = document.querySelector('.ffav-bulk-counter');
    const searchInput = document.getElementById('ffav-searchInput');
    const filterButtons = document.querySelectorAll('.ffav-filter-btn');
    const addManualBtn = document.getElementById('ffav-addManualBtn');
    const moreBtn = document.getElementById('ffav-moreBtn');
    const moreModal = document.getElementById('ffav-moreModal');
    const moreCloseBtn = document.querySelector('.ffav-more-close-btn');
    const exportBtn = document.getElementById('ffav-exportBtn');
    const importBtn = document.getElementById('ffav-importBtn');
    const modal = document.getElementById('ffav-favoritesModal');
    const linkTitle = document.getElementById('ffav-linkTitle');
    const linkUrl = document.getElementById('ffav-linkUrl');
    const saveLink = modal.querySelector('.ffav-save');
    const cancelModal = modal.querySelector('.ffav-cancel');
    
    // Add event listener for the "More" button
    if (moreBtn) {
        moreBtn.addEventListener('click', () => {
            if (moreModal) {
                moreModal.style.display = 'flex';
                console.log('More modal opened');
            }
        });
    } else {
        console.error('More button not found');
    }
    
    // Add event listener for the close button in the more modal
    if (moreCloseBtn) {
        moreCloseBtn.addEventListener('click', () => {
            if (moreModal) {
                moreModal.style.display = 'none';
                console.log('More modal closed');
            }
        });
    } else {
        console.error('More close button not found');
    }
    
    // Close more modal when clicking outside
    if (moreModal) {
        moreModal.addEventListener('click', e => {
            if (e.target === moreModal) {
                moreModal.style.display = 'none';
                console.log('More modal closed by clicking outside');
            }
        });
    } else {
        console.error('More modal not found');
    }
}