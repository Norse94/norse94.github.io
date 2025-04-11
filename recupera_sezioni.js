/**
 * Script per recuperare gli ID delle sezioni dal forum difesa.forumfree.it
 * Questo script effettua una richiesta API e recupera gli ID delle sezioni
 */

// Funzione principale che effettua la richiesta API e recupera gli ID delle sezioni
async function recuperaSezioni() {
    try {
        // URL dell'API
        const apiUrl = 'https://difesa.forumfree.it/api.php?cookie=1';
        
        // Effettua la richiesta API
        const response = await fetch(apiUrl);
        
        // Verifica se la richiesta è andata a buon fine
        if (!response.ok) {
            throw new Error(`Errore nella richiesta API: ${response.status} ${response.statusText}`);
        }
        
        // Converte la risposta in formato JSON
        const data = await response.json();
        
        // Verifica se la risposta contiene l'array delle sezioni
        if (!data.sections || !Array.isArray(data.sections)) {
            throw new Error('La risposta API non contiene l\'array delle sezioni');
        }
        
        // Estrae gli ID e i nomi delle sezioni
        // IMPORTANTE: L'ID è il valore principale da recuperare per ogni sezione
        const sezioni = data.sections.map(section => ({
            id: section.id, // QUESTO È L'ID DA RECUPERARE PER LA SINGOLA SEZIONE
            nome: section.name,
            descrizione: section.desc,
            gruppo: section.group
        }));
        
        // Stampa i risultati
        console.log('ID delle sezioni recuperati:');
        sezioni.forEach(sezione => {
            console.log(`ID SEZIONE: ${sezione.id} <- QUESTO È L'ID DA RECUPERARE, Nome: ${sezione.nome}, Gruppo: ${sezione.gruppo}`);
        });
        
        // Restituisce l'array delle sezioni
        return sezioni;
        
    } catch (error) {
        console.error('Si è verificato un errore durante il recupero delle sezioni:', error.message);
        return [];
    }
}

// Funzione per chiamare l'API con l'ID della sezione
async function chiamaApiConId(id) {
    try {
        // Costruisce l'URL dell'API con l'ID della sezione
        const apiUrl = `https://difesa.forumfree.it/api.php?f=${id}&cookie=1`;
        console.log(`Chiamata API con URL: ${apiUrl}`);
        
        // Effettua la richiesta API
        const response = await fetch(apiUrl);
        
        // Verifica se la richiesta è andata a buon fine
        if (!response.ok) {
            throw new Error(`Errore nella richiesta API: ${response.status} ${response.statusText}`);
        }
        
        // Converte la risposta in formato JSON
        const data = await response.json();
        return data;
        
    } catch (error) {
        console.error(`Si è verificato un errore durante la chiamata API con ID ${id}:`, error.message);
        throw error;
    }
}

// Funzione per visualizzare i risultati della chiamata API
function visualizzaRisultatiApi(data, sezioneId) {
    // Crea un elemento modal per visualizzare i risultati
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';
    
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = 'white';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '5px';
    modalContent.style.maxWidth = '80%';
    modalContent.style.maxHeight = '80%';
    modalContent.style.overflow = 'auto';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Chiudi';
    closeBtn.className = 'btn';
    closeBtn.style.backgroundColor = '#d9534f';
    closeBtn.style.marginBottom = '15px';
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    const title = document.createElement('h3');
    title.textContent = `Risultati API per la sezione con ID: ${sezioneId}`;
    
    // Aggiungi l'URL completo dell'API
    const urlInfo = document.createElement('div');
    urlInfo.style.backgroundColor = '#e9ecef';
    urlInfo.style.padding = '10px';
    urlInfo.style.borderRadius = '4px';
    urlInfo.style.marginBottom = '15px';
    urlInfo.style.borderLeft = '4px solid #007bff';
    urlInfo.innerHTML = `<strong>URL API utilizzato:</strong> <code>https://difesa.forumfree.it/api.php?f=${sezioneId}&cookie=1</code>`;
    
    const pre = document.createElement('pre');
    pre.style.backgroundColor = '#f8f9fa';
    pre.style.padding = '10px';
    pre.style.borderRadius = '4px';
    pre.style.overflow = 'auto';
    pre.style.maxHeight = '400px';
    pre.textContent = JSON.stringify(data, null, 2);
    
    modalContent.appendChild(closeBtn);
    modalContent.appendChild(title);
    modalContent.appendChild(urlInfo);
    modalContent.appendChild(pre);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}

// Funzione per esportare i dati in formato JSON
function esportaSezioniJSON(sezioni) {
    try {
        // Aggiunge un messaggio esplicativo prima di esportare
        console.log('Esportazione degli ID delle sezioni in corso...');
        console.log('IMPORTANTE: L\'ID è il valore principale da recuperare per ogni sezione');
        
        // Crea una stringa JSON formattata
        const jsonData = JSON.stringify(sezioni, null, 2);
        
        // Crea un elemento per il download
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonData);
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "sezioni_forum.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        console.log('Dati esportati con successo in formato JSON');
    } catch (error) {
        console.error('Errore durante l\'esportazione dei dati:', error.message);
    }
}

// Esegui la funzione principale quando il documento è pronto
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Avvio recupero sezioni...');
    const sezioni = await recuperaSezioni();
    
    // Se ci sono sezioni, crea un pulsante per esportarle
    if (sezioni.length > 0) {
        const exportButton = document.createElement('button');
        exportButton.textContent = 'Esporta sezioni in JSON';
        exportButton.style.padding = '10px';
        exportButton.style.margin = '20px';
        exportButton.style.backgroundColor = '#4CAF50';
        exportButton.style.color = 'white';
        exportButton.style.border = 'none';
        exportButton.style.borderRadius = '4px';
        exportButton.style.cursor = 'pointer';
        
        exportButton.addEventListener('click', () => {
            esportaSezioniJSON(sezioni);
        });
        
        // Aggiungi il pulsante al documento
        document.body.appendChild(exportButton);
    }
});

// Esegui la funzione anche se lo script viene eseguito direttamente
if (typeof window === 'undefined' || document.readyState === 'complete') {
    recuperaSezioni();
}