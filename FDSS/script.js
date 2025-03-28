document.addEventListener('DOMContentLoaded', function() {
    // Elementi UI
    const container = document.getElementById('fdss-container');
    const closeBtn = document.getElementById('fdss-close');
    const tabDiscussions = document.getElementById('fdss-tab-discussions');
    const tabPosts = document.getElementById('fdss-tab-posts');
    const discussionsContent = document.getElementById('fdss-discussions');
    const postsContent = document.getElementById('fdss-posts');
    const discussionsList = document.getElementById('fdss-discussions-list');
    const postsList = document.getElementById('fdss-posts-list');

    // Dati salvati
    let savedDiscussions = JSON.parse(localStorage.getItem('fdss-discussions')) || [];
    let savedPosts = JSON.parse(localStorage.getItem('fdss-posts')) || [];

    // Funzione per estrarre l'ID della discussione dall'URL
    function getDiscussionIdFromUrl() {
        const url = window.location.href;
        const match = url.match(/\?t=([^&#]*)/); // Estrae la parte dopo ?t= e prima di # o fine URL
        return match ? match[1] : null;
    }

    // Funzione per costruire l'URL dell'API
    function buildApiUrl(discussionId) {
        return `/api.php?t=${discussionId}`;
    }

    // Funzione per limitare il contenuto a 20 parole
    function limitContent(content, wordLimit = 20) {
        const words = content.split(/\s+/);
        if (words.length <= wordLimit) return content;
        return words.slice(0, wordLimit).join(' ') + '...';
    }

    // Funzione per formattare la data
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Funzione per salvare una discussione
    function saveDiscussion(apiData) {
        const discussionData = {
            id: apiData.info.id,
            title: apiData.info.title,
            description: apiData.info.desc,
            section: apiData.info.section_name,
            date: apiData.info.first_post_time,
            author: apiData.starter.nickname,
            savedAt: new Date().toISOString()
        };

        // Verifica se la discussione è già salvata
        const existingIndex = savedDiscussions.findIndex(d => d.id === discussionData.id);
        if (existingIndex !== -1) {
            savedDiscussions[existingIndex] = discussionData;
        } else {
            savedDiscussions.push(discussionData);
        }

        // Salva nel localStorage
        localStorage.setItem('fdss-discussions', JSON.stringify(savedDiscussions));
        
        // Mostra notifica
        showNotification('Discussione salvata con successo!');
    }

    // Funzione per salvare un post
    function savePost(apiData, postId) {
        // Trova il post specifico nell'array dei messaggi
        const post = apiData.messages.find(msg => msg.id === postId);
        if (!post) return;

        const postData = {
            id: post.id,
            discussionId: apiData.info.id,
            discussionTitle: apiData.info.title,
            content: limitContent(post.content),
            author: post.user.nickname,
            avatar: post.user.avatar,
            date: post.info.date,
            savedAt: new Date().toISOString()
        };

        // Verifica se il post è già salvato
        const existingIndex = savedPosts.findIndex(p => p.id === postData.id);
        if (existingIndex !== -1) {
            savedPosts[existingIndex] = postData;
        } else {
            savedPosts.push(postData);
        }

        // Salva nel localStorage
        localStorage.setItem('fdss-posts', JSON.stringify(savedPosts));
        
        // Mostra notifica
        showNotification('Post salvato con successo!');
    }

    // Funzione per mostrare una notifica
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'fdss-notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        // Rimuovi la notifica dopo 3 secondi
        setTimeout(() => {
            notification.classList.add('fdss-notification-hide');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Funzione per renderizzare le discussioni salvate
    function renderSavedDiscussions() {
        discussionsList.innerHTML = '';
        const emptyMessage = discussionsContent.querySelector('.fdss-empty-message');

        if (savedDiscussions.length === 0) {
            emptyMessage.style.display = 'block';
            return;
        }

        emptyMessage.style.display = 'none';

        // Ordina le discussioni per data di salvataggio (più recenti prima)
        savedDiscussions.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

        savedDiscussions.forEach(discussion => {
            const li = document.createElement('li');
            li.className = 'fdss-list-item';
            li.innerHTML = `
                <div class="fdss-item-header">
                    <h3 class="fdss-item-title">${discussion.title}</h3>
                    <button class="fdss-delete-btn" data-id="${discussion.id}" data-type="discussion">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="fdss-item-section">${discussion.section}</div>
                <div class="fdss-item-meta">
                    <span class="fdss-item-author">${discussion.author}</span>
                    <span class="fdss-item-date">${formatDate(discussion.date)}</span>
                </div>
            `;
            discussionsList.appendChild(li);
        });

        // Aggiungi event listener per i pulsanti di eliminazione
        const deleteButtons = discussionsList.querySelectorAll('.fdss-delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', handleDelete);
        });
    }

    // Funzione per renderizzare i post salvati
    function renderSavedPosts() {
        postsList.innerHTML = '';
        const emptyMessage = postsContent.querySelector('.fdss-empty-message');

        if (savedPosts.length === 0) {
            emptyMessage.style.display = 'block';
            return;
        }

        emptyMessage.style.display = 'none';

        // Ordina i post per data di salvataggio (più recenti prima)
        savedPosts.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

        savedPosts.forEach(post => {
            const li = document.createElement('li');
            li.className = 'fdss-list-item';
            li.innerHTML = `
                <div class="fdss-item-header">
                    <h3 class="fdss-item-title">${post.discussionTitle}</h3>
                    <button class="fdss-delete-btn" data-id="${post.id}" data-type="post">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="fdss-item-meta">
                    <span class="fdss-item-author">
                        ${post.avatar ? `<img src="${post.avatar}" class="fdss-item-avatar" alt="${post.author}">` : ''}
                        ${post.author}
                    </span>
                    <span class="fdss-item-date">${formatDate(post.date)}</span>
                </div>
                <div class="fdss-item-content">${post.content}</div>
            `;
            postsList.appendChild(li);
        });

        // Aggiungi event listener per i pulsanti di eliminazione
        const deleteButtons = postsList.querySelectorAll('.fdss-delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', handleDelete);
        });
    }

    // Funzione per gestire l'eliminazione di discussioni e post
    function handleDelete(e) {
        const button = e.currentTarget;
        const id = button.getAttribute('data-id');
        const type = button.getAttribute('data-type');

        if (type === 'discussion') {
            savedDiscussions = savedDiscussions.filter(d => d.id !== id);
            localStorage.setItem('fdss-discussions', JSON.stringify(savedDiscussions));
            renderSavedDiscussions();
        } else if (type === 'post') {
            savedPosts = savedPosts.filter(p => p.id !== id);
            localStorage.setItem('fdss-posts', JSON.stringify(savedPosts));
            renderSavedPosts();
        }

        showNotification(`${type === 'discussion' ? 'Discussione' : 'Post'} eliminato con successo!`);
    }

    // Funzione per cambiare tab
    function switchTab(e) {
        const tabId = e.currentTarget.id;
        
        // Rimuovi la classe active da tutti i tab e contenuti
        tabDiscussions.classList.remove('fdss-active');
        tabPosts.classList.remove('fdss-active');
        discussionsContent.classList.remove('fdss-active');
        postsContent.classList.remove('fdss-active');
        
        // Aggiungi la classe active al tab e contenuto selezionato
        if (tabId === 'fdss-tab-discussions') {
            tabDiscussions.classList.add('fdss-active');
            discussionsContent.classList.add('fdss-active');
            renderSavedDiscussions();
        } else {
            tabPosts.classList.add('fdss-active');
            postsContent.classList.add('fdss-active');
            renderSavedPosts();
        }
    }

    // Funzione per mostrare il pannello
    function showPanel() {
        container.classList.add('fdss-active');
        renderSavedDiscussions();
    }

    // Funzione per nascondere il pannello
    function hidePanel() {
        container.classList.remove('fdss-active');
    }

    // Funzione per inserire i pulsanti di salvataggio nel forum
    function insertSaveButtons() {
        // Pulsante per salvare la discussione su desktop
        const buttonsDiv = document.querySelector('.buttons');
        if (buttonsDiv) {
            const saveDiscBtn = document.createElement('span');
            saveDiscBtn.id = 'fdss-salvadiscbtn';
            saveDiscBtn.className = 'fdss-save-btn';
            saveDiscBtn.innerHTML = '<i class="fas fa-bookmark"></i> Salva Disc.';
            saveDiscBtn.addEventListener('click', handleSaveDiscussion);
            buttonsDiv.appendChild(saveDiscBtn);
        }

        // Pulsante per salvare la discussione su mobile
        const popShareDiv = document.querySelector('.pop-share');
        if (popShareDiv) {
            const saveDiscBtnMobile = document.createElement('span');
            saveDiscBtnMobile.className = 'fdss-savadiscbtnmobile fdss-save-btn';
            saveDiscBtnMobile.innerHTML = '<i class="fas fa-bookmark"></i>';
            saveDiscBtnMobile.addEventListener('click', handleSaveDiscussion);
            popShareDiv.appendChild(saveDiscBtnMobile);
        }

        // Pulsanti per salvare i post
        const miniButtonsDivs = document.querySelectorAll('.mini_buttons.lt.Sub');
        miniButtonsDivs.forEach(div => {
            const savePostBtn = document.createElement('a');
            savePostBtn.id = 'fdss-salvapostbtn';
            savePostBtn.className = 'fdss-save-btn';
            savePostBtn.href = 'javascript:void(0);';
            savePostBtn.innerHTML = '<i class="fas fa-bookmark"></i> Aggiungi ai Segnalibri';
            savePostBtn.addEventListener('click', handleSavePost);
            div.appendChild(savePostBtn);
        });

        // Pulsanti per salvare i post su mobile
        const groupSpans = document.querySelectorAll('.group');
        groupSpans.forEach(span => {
            const parentLi = span.closest('li');
            if (parentLi) {
                const savePostBtnMobile = document.createElement('a');
                savePostBtnMobile.id = 'fdss-salvapostbtnmobile';
                savePostBtnMobile.className = 'fdss-save-btn';
                savePostBtnMobile.href = 'javascript:void(0);';
                savePostBtnMobile.innerHTML = '<i class="fas fa-bookmark"></i>';
                savePostBtnMobile.addEventListener('click', handleSavePost);
                parentLi.insertBefore(savePostBtnMobile, span);
            }
        });

        // Aggiungi pulsante per aprire il pannello
        const openPanelBtn = document.createElement('div');
        openPanelBtn.id = 'fdss-open-panel';
        openPanelBtn.className = 'fdss-open-panel-btn';
        openPanelBtn.innerHTML = '<i class="fas fa-bookmark"></i> Discussioni Salvate';
        openPanelBtn.addEventListener('click', showPanel);
        document.body.appendChild(openPanelBtn);
    }

    // Funzione per gestire il salvataggio della discussione
    async function handleSaveDiscussion() {
        const discussionId = getDiscussionIdFromUrl();
        if (!discussionId) {
            showNotification('Impossibile trovare l\'ID della discussione.');
            return;
        }

        try {
            const apiUrl = buildApiUrl(discussionId);
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Errore nel recupero dei dati');
            
            const apiData = await response.json();
            saveDiscussion(apiData);
        } catch (error) {
            console.error('Errore:', error);
            showNotification('Errore nel salvataggio della discussione.');
        }
    }

    // Funzione per gestire il salvataggio del post
    async function handleSavePost(e) {
        const button = e.currentTarget;
        const parentLi = button.closest('li');
        if (!parentLi) {
            showNotification('Impossibile trovare il post.');
            return;
        }

        // Estrai l'ID del post dal LI (rimuovendo i primi due caratteri)
        const postId = parentLi.id.substring(2);
        if (!postId) {
            showNotification('Impossibile trovare l\'ID del post.');
            return;
        }

        const discussionId = getDiscussionIdFromUrl();
        if (!discussionId) {
            showNotification('Impossibile trovare l\'ID della discussione.');
            return;
        }

        try {
            const apiUrl = buildApiUrl(discussionId);
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Errore nel recupero dei dati');
            
            const apiData = await response.json();
            savePost(apiData, postId);
        } catch (error) {
            console.error('Errore:', error);
            showNotification('Errore nel salvataggio del post.');
        }
    }

    // Event listeners
    closeBtn.addEventListener('click', hidePanel);
    tabDiscussions.addEventListener('click', switchTab);
    tabPosts.addEventListener('click', switchTab);

    // Inizializza l'applicazione
    insertSaveButtons();

    // Aggiungi stili per la notifica
    const style = document.createElement('style');
    style.textContent = `
        .fdss-notification {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background-color: #4a76a8;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            transition: opacity 0.3s, transform 0.3s;
        }
        .fdss-notification-hide {
            opacity: 0;
            transform: translateY(10px);
        }
        .fdss-open-panel-btn {
            position: fixed;
            bottom: 20px;
            left: 20px;
            background-color: #4a76a8;
            color: white;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
            z-index: 9998;
            display: flex;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }
        .fdss-open-panel-btn i {
            margin-right: 8px;
        }
        @media (max-width: 768px) {
            .fdss-open-panel-btn {
                padding: 8px 12px;
                font-size: 0.9rem;
            }
        }
    `;
    document.head.appendChild(style);
});