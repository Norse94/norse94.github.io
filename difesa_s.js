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