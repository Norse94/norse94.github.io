/**
 * Google Drive Synchronization for Forum Favorites
 * This script handles the synchronization of forum favorites with Google Drive
 */

(function() {
    // Google API configuration
    const API_KEY = 'fAIzaSyB0sQhyITTtGcVGPDXZBb6NkWqmGT5dgKo'; // Replace with your Google API key
    const CLIENT_ID = '1032602955752-3q7tmphm12eegl50j5j5bgcqaq6a7abk.apps.googleusercontent.com'; // Replace with your Google Client ID
    const SCOPES = 'https://www.googleapis.com/auth/drive.file';
    const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
    const FILE_NAME = 'forum_favorites.json';
    
    let tokenClient;
    let gapiInited = false;
    let gisInited = false;
    let fileId = null;
    
    // Initialize DOM elements safely
    function getElement(id) {
        return document.getElementById(id);
    }
    
    // Initialize the Google Drive sync
    function initGDriveSync() {
        // Get DOM elements
        const syncStatus = getElement('ffav-syncStatus');
        const syncProgressBar = getElement('ffav-syncProgressBar');
        const syncLog = getElement('ffav-syncLog');
        const authBtn = getElement('ffav-authGdrive');
        const syncNowBtn = getElement('ffav-syncNow');
        const logoutBtn = getElement('ffav-logoutGdrive');
        
        if (!window.gapi) {
            logMessage('Google API non caricata correttamente', 'error', syncLog);
            return;
        }
        
        gapi.load('client', async () => {
            try {
                await gapi.client.init({
                    apiKey: API_KEY,
                    discoveryDocs: DISCOVERY_DOCS,
                });
                gapiInited = true;
                
                // Initialize the tokenClient
                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: (tokenResponse) => handleAuthResponse(tokenResponse, syncStatus, syncProgressBar, syncLog),
                });
                gisInited = true;
                
                // Check if already authorized
                if (localStorage.getItem('gdrive_token')) {
                    gapi.client.setToken(JSON.parse(localStorage.getItem('gdrive_token')));
                    updateUIForAuthorized(syncStatus, authBtn, syncNowBtn, logoutBtn);
                    checkForExistingFile(syncStatus, syncProgressBar, syncLog);
                } else {
                    updateUIForUnauthorized(syncStatus, authBtn, syncNowBtn, logoutBtn);
                }
                
                logMessage('Google Drive API inizializzata', 'info', syncLog);
            } catch (error) {
                logMessage('Errore durante l\'inizializzazione: ' + error.message, 'error', syncLog);
            }
        });
    }
    
    // Handle the authorization response
    function handleAuthResponse(tokenResponse, syncStatus, syncProgressBar, syncLog) {
        if (tokenResponse && tokenResponse.access_token) {
            localStorage.setItem('gdrive_token', JSON.stringify(tokenResponse));
            updateUIForAuthorized(syncStatus, getElement('ffav-authGdrive'), getElement('ffav-syncNow'), getElement('ffav-logoutGdrive'));
            checkForExistingFile(syncStatus, syncProgressBar, syncLog);
        } else {
            updateUIForUnauthorized(syncStatus, getElement('ffav-authGdrive'), getElement('ffav-syncNow'), getElement('ffav-logoutGdrive'));
            logMessage('Autorizzazione fallita', 'error', syncLog);
        }
    }
    
    // Check if the favorites file already exists in Google Drive
    async function checkForExistingFile(syncStatus, syncProgressBar, syncLog) {
        try {
            updateProgress(20, syncProgressBar);
            logMessage('Ricerca del file dei preferiti su Drive...', 'info', syncLog);
            
            const response = await gapi.client.drive.files.list({
                q: `name='${FILE_NAME}' and trashed=false`,
                fields: 'files(id, name, modifiedTime)'
            });
            
            const files = response.result.files;
            
            if (files && files.length > 0) {
                fileId = files[0].id;
                const lastModified = new Date(files[0].modifiedTime);
                if (syncStatus) syncStatus.textContent = `Ultimo aggiornamento: ${lastModified.toLocaleString()}`;
                logMessage(`File trovato (ID: ${fileId})`, 'success', syncLog);
                updateProgress(100, syncProgressBar);
                
                // Check if we need to sync
                const localTimestamp = localStorage.getItem('gdrive_last_sync');
                if (!localTimestamp || new Date(localTimestamp) < lastModified) {
                    logMessage('Versione remota più recente, download in corso...', 'info', syncLog);
                    await downloadFavorites(syncStatus, syncProgressBar, syncLog);
                }
            } else {
                fileId = null;
                if (syncStatus) syncStatus.textContent = 'Nessun file trovato su Drive';
                logMessage('Nessun file trovato, sarà creato al primo salvataggio', 'info', syncLog);
                updateProgress(100, syncProgressBar);
            }
        } catch (error) {
            logMessage('Errore durante la ricerca del file: ' + error.message, 'error', syncLog);
            updateProgress(0, syncProgressBar);
        }
    }
    
    // Download favorites from Google Drive
    async function downloadFavorites(syncStatus, syncProgressBar, syncLog) {
        if (!fileId) return;
        
        try {
            updateProgress(30, syncProgressBar);
            logMessage('Download dei preferiti da Drive...', 'info', syncLog);
            
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });
            
            const favorites = JSON.parse(response.body);
            localStorage.setItem('forumFavorites', JSON.stringify(favorites));
            localStorage.setItem('gdrive_last_sync', new Date().toISOString());
            
            logMessage('Preferiti scaricati e aggiornati localmente', 'success', syncLog);
            updateProgress(100, syncProgressBar);
            
            // Refresh the UI
            if (window.renderSavedItems) {
                window.renderSavedItems();
            }
            
            return favorites;
        } catch (error) {
            logMessage('Errore durante il download: ' + error.message, 'error', syncLog);
            updateProgress(0, syncProgressBar);
            return null;
        }
    }
    
    // Upload favorites to Google Drive
    async function uploadFavorites(syncStatus, syncProgressBar, syncLog) {
        try {
            updateProgress(30, syncProgressBar);
            logMessage('Caricamento dei preferiti su Drive...', 'info', syncLog);
            
            const favorites = JSON.parse(localStorage.getItem('forumFavorites') || '[]');
            const fileContent = JSON.stringify(favorites);
            const fileMetadata = {
                name: FILE_NAME,
                mimeType: 'application/json'
            };
            
            let response;
            
            if (fileId) {
                // Update existing file
                response = await gapi.client.request({
                    path: '/upload/drive/v3/files/' + fileId,
                    method: 'PATCH',
                    params: { uploadType: 'media' },
                    body: fileContent
                });
            } else {
                // Create new file
                const boundary = '-------314159265358979323846';
                const delimiter = "\r\n--" + boundary + "\r\n";
                const close_delim = "\r\n--" + boundary + "--";
                
                const multipartRequestBody =
                    delimiter +
                    'Content-Type: application/json\r\n\r\n' +
                    JSON.stringify(fileMetadata) +
                    delimiter +
                    'Content-Type: application/json\r\n\r\n' +
                    fileContent +
                    close_delim;
                
                response = await gapi.client.request({
                    path: '/upload/drive/v3/files',
                    method: 'POST',
                    params: { uploadType: 'multipart' },
                    headers: {
                        'Content-Type': 'multipart/related; boundary="' + boundary + '"'
                    },
                    body: multipartRequestBody
                });
                
                fileId = response.result.id;
            }
            
            localStorage.setItem('gdrive_last_sync', new Date().toISOString());
            if (syncStatus) syncStatus.textContent = `Ultimo aggiornamento: ${new Date().toLocaleString()}`;
            
            logMessage('Preferiti caricati su Drive con successo', 'success', syncLog);
            updateProgress(100, syncProgressBar);
            
            return true;
        } catch (error) {
            logMessage('Errore durante il caricamento: ' + error.message, 'error', syncLog);
            updateProgress(0, syncProgressBar);
            return false;
        }
    }
    
    // Sync favorites (two-way sync)
    async function syncFavorites() {
        const syncStatus = getElement('ffav-syncStatus');
        const syncProgressBar = getElement('ffav-syncProgressBar');
        const syncLog = getElement('ffav-syncLog');
        
        if (!isAuthorized()) {
            logMessage('Devi autorizzare Google Drive prima di sincronizzare', 'error', syncLog);
            return;
        }
        
        try {
            updateProgress(10, syncProgressBar);
            logMessage('Avvio sincronizzazione...', 'info', syncLog);
            
            // First check if remote file exists and is newer
            await checkForExistingFile(syncStatus, syncProgressBar, syncLog);
            
            // Then upload local changes
            await uploadFavorites(syncStatus, syncProgressBar, syncLog);
            
            showNotification('Sincronizzazione completata', 'success');
        } catch (error) {
            logMessage('Errore durante la sincronizzazione: ' + error.message, 'error', syncLog);
            updateProgress(0, syncProgressBar);
            showNotification('Errore durante la sincronizzazione', 'error');
        }
    }
    
    // Authorize with Google Drive
    function authorize() {
        if (!gapiInited || !gisInited) {
            const syncLog = getElement('ffav-syncLog');
            logMessage('API Google non inizializzate correttamente', 'error', syncLog);
            return;
        }
        
        tokenClient.requestAccessToken();
    }
    
    // Logout from Google Drive
    function logout() {
        const syncStatus = getElement('ffav-syncStatus');
        const syncLog = getElement('ffav-syncLog');
        const authBtn = getElement('ffav-authGdrive');
        const syncNowBtn = getElement('ffav-syncNow');
        const logoutBtn = getElement('ffav-logoutGdrive');
        
        const token = gapi.client.getToken();
        if (token) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
            localStorage.removeItem('gdrive_token');
            localStorage.removeItem('gdrive_last_sync');
            fileId = null;
            updateUIForUnauthorized(syncStatus, authBtn, syncNowBtn, logoutBtn);
            logMessage('Disconnesso da Google Drive', 'info', syncLog);
        }
    }
    
    // Check if authorized
    function isAuthorized() {
        return gapi.client && gapi.client.getToken() !== null;
    }
    
    // Update UI for authorized state
    function updateUIForAuthorized(syncStatus, authBtn, syncNowBtn, logoutBtn) {
        if (authBtn) authBtn.style.display = 'none';
        if (syncNowBtn) syncNowBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (syncStatus) syncStatus.textContent = 'Connesso a Google Drive';
    }
    
    // Update UI for unauthorized state
    function updateUIForUnauthorized(syncStatus, authBtn, syncNowBtn, logoutBtn) {
        if (authBtn) authBtn.style.display = 'inline-block';
        if (syncNowBtn) syncNowBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (syncStatus) syncStatus.textContent = 'Non connesso a Google Drive';
    }
    
    // Update progress bar
    function updateProgress(percent, progressBar) {
        if (progressBar) {
            progressBar.style.width = percent + '%';
        }
    }
    
    // Log message to the sync log
    function logMessage(message, type = 'info', logElement) {
        if (!logElement) return;
        
        const logEntry = document.createElement('p');
        logEntry.className = `ffav-log-${type}`;
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        logElement.appendChild(logEntry);
        logElement.scrollTop = logElement.scrollHeight;
        
        // Limit log entries
        while (logElement.children.length > 20) {
            logElement.removeChild(logElement.firstChild);
        }
    }
    
    // Show notification (reusing the existing notification function)
    function showNotification(message, type) {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }
    
    // Export the API
    window.gdriveSync = {
        init: initGDriveSync,
        authorize: authorize,
        syncFavorites: syncFavorites,
        logout: logout,
        isAuthorized: isAuthorized
    };
    
    // Initialize when the script is loaded
    window.initGDriveSync = initGDriveSync;
})();