/**
 * Google Drive Synchronization for Forum Favorites
 * This script handles the synchronization of forum favorites with Google Drive
 */

(function() {
    // Google API configuration
    const API_KEY = 'YAIzaSyB0sQhyITTtGcVGPDXZBb6NkWqmGT5dgKo'; // Replace with your Google API key
    const CLIENT_ID = 'favoritiforum'; // Replace with your Google Client ID
    const SCOPES = 'https://www.googleapis.com/auth/drive.file';
    const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
    const FILE_NAME = 'forum_favorites.json';
    
    let tokenClient;
    let gapiInited = false;
    let gisInited = false;
    let fileId = null;
    
    // DOM elements
    const syncStatus = document.getElementById('ffav-syncStatus');
    const syncProgressBar = document.getElementById('ffav-syncProgressBar');
    const syncLog = document.getElementById('ffav-syncLog');
    const authBtn = document.getElementById('ffav-authGdrive');
    const syncNowBtn = document.getElementById('ffav-syncNow');
    const logoutBtn = document.getElementById('ffav-logoutGdrive');
    
    // Initialize the Google Drive sync
    function initGDriveSync() {
        if (!window.gapi) {
            logMessage('Google API non caricata correttamente', 'error');
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
                    callback: handleAuthResponse,
                });
                gisInited = true;
                
                // Check if already authorized
                if (localStorage.getItem('gdrive_token')) {
                    gapi.client.setToken(JSON.parse(localStorage.getItem('gdrive_token')));
                    updateUIForAuthorized();
                    checkForExistingFile();
                } else {
                    updateUIForUnauthorized();
                }
                
                logMessage('Google Drive API inizializzata', 'info');
            } catch (error) {
                logMessage('Errore durante l\'inizializzazione: ' + error.message, 'error');
            }
        });
    }
    
    // Handle the authorization response
    function handleAuthResponse(tokenResponse) {
        if (tokenResponse && tokenResponse.access_token) {
            localStorage.setItem('gdrive_token', JSON.stringify(tokenResponse));
            updateUIForAuthorized();
            checkForExistingFile();
        } else {
            updateUIForUnauthorized();
            logMessage('Autorizzazione fallita', 'error');
        }
    }
    
    // Check if the favorites file already exists in Google Drive
    async function checkForExistingFile() {
        try {
            updateProgress(20);
            logMessage('Ricerca del file dei preferiti su Drive...', 'info');
            
            const response = await gapi.client.drive.files.list({
                q: `name='${FILE_NAME}' and trashed=false`,
                fields: 'files(id, name, modifiedTime)'
            });
            
            const files = response.result.files;
            
            if (files && files.length > 0) {
                fileId = files[0].id;
                const lastModified = new Date(files[0].modifiedTime);
                syncStatus.textContent = `Ultimo aggiornamento: ${lastModified.toLocaleString()}`;
                logMessage(`File trovato (ID: ${fileId})`, 'success');
                updateProgress(100);
                
                // Check if we need to sync
                const localTimestamp = localStorage.getItem('gdrive_last_sync');
                if (!localTimestamp || new Date(localTimestamp) < lastModified) {
                    logMessage('Versione remota più recente, download in corso...', 'info');
                    await downloadFavorites();
                }
            } else {
                fileId = null;
                syncStatus.textContent = 'Nessun file trovato su Drive';
                logMessage('Nessun file trovato, sarà creato al primo salvataggio', 'info');
                updateProgress(100);
            }
        } catch (error) {
            logMessage('Errore durante la ricerca del file: ' + error.message, 'error');
            updateProgress(0);
        }
    }
    
    // Download favorites from Google Drive
    async function downloadFavorites() {
        if (!fileId) return;
        
        try {
            updateProgress(30);
            logMessage('Download dei preferiti da Drive...', 'info');
            
            const response = await gapi.client.drive.files.get({
                fileId: fileId,
                alt: 'media'
            });
            
            const favorites = JSON.parse(response.body);
            localStorage.setItem('forumFavorites', JSON.stringify(favorites));
            localStorage.setItem('gdrive_last_sync', new Date().toISOString());
            
            logMessage('Preferiti scaricati e aggiornati localmente', 'success');
            updateProgress(100);
            
            // Refresh the UI
            if (window.renderSavedItems) {
                window.renderSavedItems();
            }
            
            return favorites;
        } catch (error) {
            logMessage('Errore durante il download: ' + error.message, 'error');
            updateProgress(0);
            return null;
        }
    }
    
    // Upload favorites to Google Drive
    async function uploadFavorites() {
        try {
            updateProgress(30);
            logMessage('Caricamento dei preferiti su Drive...', 'info');
            
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
            syncStatus.textContent = `Ultimo aggiornamento: ${new Date().toLocaleString()}`;
            
            logMessage('Preferiti caricati su Drive con successo', 'success');
            updateProgress(100);
            
            return true;
        } catch (error) {
            logMessage('Errore durante il caricamento: ' + error.message, 'error');
            updateProgress(0);
            return false;
        }
    }
    
    // Sync favorites (two-way sync)
    async function syncFavorites() {
        if (!isAuthorized()) {
            logMessage('Devi autorizzare Google Drive prima di sincronizzare', 'error');
            return;
        }
        
        try {
            updateProgress(10);
            logMessage('Avvio sincronizzazione...', 'info');
            
            // First check if remote file exists and is newer
            await checkForExistingFile();
            
            // Then upload local changes
            await uploadFavorites();
            
            showNotification('Sincronizzazione completata', 'success');
        } catch (error) {
            logMessage('Errore durante la sincronizzazione: ' + error.message, 'error');
            updateProgress(0);
            showNotification('Errore durante la sincronizzazione', 'error');
        }
    }
    
    // Authorize with Google Drive
    function authorize() {
        if (!gapiInited || !gisInited) {
            logMessage('API Google non inizializzate correttamente', 'error');
            return;
        }
        
        tokenClient.requestAccessToken();
    }
    
    // Logout from Google Drive
    function logout() {
        const token = gapi.client.getToken();
        if (token) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
            localStorage.removeItem('gdrive_token');
            localStorage.removeItem('gdrive_last_sync');
            fileId = null;
            updateUIForUnauthorized();
            logMessage('Disconnesso da Google Drive', 'info');
        }
    }
    
    // Check if authorized
    function isAuthorized() {
        return gapi.client.getToken() !== null;
    }
    
    // Update UI for authorized state
    function updateUIForAuthorized() {
        authBtn.style.display = 'none';
        syncNowBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'inline-block';
        syncStatus.textContent = 'Connesso a Google Drive';
    }
    
    // Update UI for unauthorized state
    function updateUIForUnauthorized() {
        authBtn.style.display = 'inline-block';
        syncNowBtn.style.display = 'none';
        logoutBtn.style.display = 'none';
        syncStatus.textContent = 'Non connesso a Google Drive';
    }
    
    // Update progress bar
    function updateProgress(percent) {
        if (syncProgressBar) {
            syncProgressBar.style.width = percent + '%';
        }
    }
    
    // Log message to the sync log
    function logMessage(message, type = 'info') {
        if (!syncLog) return;
        
        const logEntry = document.createElement('p');
        logEntry.className = `ffav-log-${type}`;
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        syncLog.appendChild(logEntry);
        syncLog.scrollTop = syncLog.scrollHeight;
        
        // Limit log entries
        while (syncLog.children.length > 20) {
            syncLog.removeChild(syncLog.firstChild);
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