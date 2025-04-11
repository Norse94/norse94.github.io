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
        const sezioni = data.sections.map(section => ({
            id: section.id,
            nome: section.name,
            descrizione: section.desc,
            gruppo: section.group
        }));
        
        // Stampa i risultati
        console.log('ID delle sezioni recuperati:');
        sezioni.forEach(sezione => {
            console.log(`ID: ${sezione.id}, Nome: ${sezione.nome}, Gruppo: ${sezione.gruppo}`);
        });
        
        // Restituisce l'array delle sezioni
        return sezioni;
        
    } catch (error) {
        console.error('Si è verificato un errore durante il recupero delle sezioni:', error.message);
        return [];
    }
}

// Funzione per esportare i dati in formato JSON
function esportaSezioniJSON(sezioni) {
    try {
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