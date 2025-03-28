// Variabili globali
let invasionActive = false;
let aliens = [];
let alienMessages = [
    "N01 S1AM0 QU1!",
    "LA V0STRA T3CN0L0G1A C1 APPART13N3",
    "R3S1ST3R3 È 1NUT1L3",
    "PR3PARAT3V1 P3R LA C0L0N1ZZAZ10N3",
    "1 V0STR1 M3M3 S0N0 1NT3R3SSANT1",
    "ABBIAMO HACKERATO IL VOSTRO FORUM",
    "LA TERRA È NOSTRA ORA"
];

let originalPostContents = [];
let alienPostContents = [
    "Ho visto gli alieni! Sono tra noi! Non fidatevi di nessuno!",
    "Le autorità stanno nascondendo la verità. Gli alieni controllano già i governi.",
    "I segnali sono chiari. L'invasione è iniziata. Preparate i rifugi!",
    "01001110 01101111 01101001 00100000 01110011 01101001 01100001 01101101 01101111 00100000 01110001 01110101 01101001",
    "∀qqᴉɐɯo ɔouʇɹollɐʇo lɐ ʌosʇɹɐ ɹǝʇǝ˙ Oɹɐ ɔouʇɹollᴉɐɯo ᴉl ʌosʇɹo ɟoɹnɯ˙"
];

// Elementi DOM
const startButton = document.getElementById('start-invasion');
const resetButton = document.getElementById('reset-invasion');
const alienContainer = document.getElementById('alien-container');
const forumContainer = document.querySelector('.forum-container');
const forumHeader = document.querySelector('.forum-header');
const forumTitle = document.querySelector('.forum-title');
const forumContent = document.querySelector('.forum-content');
const controlPanel = document.querySelector('.control-panel');
const onlineUsers = document.getElementById('online-users');
const posts = document.querySelectorAll('.forum-post');

// Salva i contenuti originali dei post
document.addEventListener('DOMContentLoaded', () => {
    posts.forEach(post => {
        const content = post.querySelector('.post-content p').textContent;
        originalPostContents.push(content);
    });
});

// Event listeners
startButton.addEventListener('click', startInvasion);
resetButton.addEventListener('click', resetInvasion);

// Funzione per iniziare l'invasione
function startInvasion() {
    if (invasionActive) return;
    invasionActive = true;
    
    // Crea l'effetto schermo rotto
    const screenCrack = document.createElement('div');
    screenCrack.classList.add('screen-crack');
    document.body.appendChild(screenCrack);
    
    // Attiva l'effetto schermo rotto
    setTimeout(() => {
        screenCrack.classList.add('active');
    }, 500);
    
    // Cambia il colore di sfondo del body
    document.body.classList.add('invaded');
    
    // Inizia l'invasione progressiva
    setTimeout(() => {
        forumContainer.classList.add('invaded');
        forumHeader.classList.add('invaded');
        forumTitle.classList.add('invaded');
        forumTitle.textContent = "F0RUM 4L13N0";
        controlPanel.classList.add('invaded');
        
        // Crea e mostra il messaggio alieno
        showAlienMessage();
        
        // Inizia a generare alieni
        spawnAliens();
        
        // Inizia a modificare i post
        setTimeout(invadePosts, 2000);
        
        // Inizia a modificare il contatore utenti online
        startUserCounterGlitch();
    }, 1000);
}

// Funzione per resettare l'invasione
function resetInvasion() {
    invasionActive = false;
    
    // Rimuovi tutti gli alieni
    aliens.forEach(alien => {
        if (alien.element && alien.element.parentNode) {
            alien.element.parentNode.removeChild(alien.element);
        }
    });
    aliens = [];
    
    // Rimuovi l'effetto schermo rotto
    const screenCrack = document.querySelector('.screen-crack');
    if (screenCrack) {
        screenCrack.classList.remove('active');
        setTimeout(() => {
            if (screenCrack.parentNode) {
                screenCrack.parentNode.removeChild(screenCrack);
            }
        }, 500);
    }
    
    // Rimuovi il messaggio alieno
    const alienMessage = document.querySelector('.alien-message');
    if (alienMessage) {
        alienMessage.classList.remove('active');
        setTimeout(() => {
            if (alienMessage.parentNode) {
                alienMessage.parentNode.removeChild(alienMessage);
            }
        }, 500);
    }
    
    // Ripristina lo stile originale
    document.body.classList.remove('invaded');
    forumContainer.classList.remove('invaded');
    forumHeader.classList.remove('invaded');
    forumTitle.classList.remove('invaded');
    forumTitle.textContent = "Forum di Discussione";
    controlPanel.classList.remove('invaded');
    forumContent.classList.remove('invaded');
    
    // Ripristina i post
    posts.forEach((post, index) => {
        post.classList.remove('invaded');
        post.classList.remove('glitching');
        
        const postHeader = post.querySelector('.post-header');
        const postAvatar = post.querySelector('.post-avatar');
        const postAuthor = post.querySelector('.post-author');
        const postDate = post.querySelector('.post-date');
        const postContent = post.querySelector('.post-content');
        const postFooter = post.querySelector('.post-footer');
        
        postHeader.classList.remove('invaded');
        postAvatar.classList.remove('invaded');
        postAuthor.classList.remove('invaded');
        postDate.classList.remove('invaded');
        postContent.classList.remove('invaded');
        postFooter.classList.remove('invaded');
        
        // Ripristina il contenuto originale
        if (index < originalPostContents.length) {
            postContent.querySelector('p').textContent = originalPostContents[index];
        }
    });
    
    // Ripristina il contatore utenti online
    onlineUsers.textContent = '42';
    clearInterval(window.userCounterInterval);
}

// Funzione per generare alieni
function spawnAliens() {
    if (!invasionActive) return;
    
    // Crea un nuovo alieno
    createAlien();
    
    // Programma la creazione di altri alieni
    const nextSpawn = Math.random() * 1000 + 500;
    setTimeout(spawnAliens, nextSpawn);
}

// Funzione per creare un singolo alieno
function createAlien() {
    const alien = document.createElement('div');
    alien.classList.add('alien');
    
    // Dimensione casuale
    if (Math.random() > 0.7) {
        alien.classList.add('large');
    } else if (Math.random() < 0.3) {
        alien.classList.add('small');
    }
    
    // Posizione iniziale casuale
    const startX = Math.random() * window.innerWidth;
    const startY = -50;
    
    alien.style.left = `${startX}px`;
    alien.style.top = `${startY}px`;
    
    alienContainer.appendChild(alien);
    
    // Aggiungi l'alieno all'array
    const alienObj = {
        element: alien,
        x: startX,
        y: startY,
        speedX: (Math.random() - 0.5) * 4,
        speedY: Math.random() * 3 + 1,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 10
    };
    
    aliens.push(alienObj);
    
    // Inizia l'animazione
    requestAnimationFrame(() => animateAlien(alienObj));
}

// Funzione per animare un alieno
function animateAlien(alien) {
    if (!invasionActive || !alien.element || !alien.element.parentNode) return;
    
    // Aggiorna posizione
    alien.x += alien.speedX;
    alien.y += alien.speedY;
    
    // Aggiorna rotazione
    alien.rotation += alien.rotationSpeed;
    
    // Applica le nuove proprietà
    alien.element.style.left = `${alien.x}px`;
    alien.element.style.top = `${alien.y}px`;
    alien.element.style.transform = `rotate(${alien.rotation}deg)`;
    
    // Rimuovi l'alieno se è fuori dallo schermo
    if (alien.y > window.innerHeight + 100 || 
        alien.x < -100 || 
        alien.x > window.innerWidth + 100) {
        if (alien.element.parentNode) {
            alien.element.parentNode.removeChild(alien.element);
        }
        aliens.splice(aliens.indexOf(alien), 1);
        return;
    }
    
    // Continua l'animazione
    requestAnimationFrame(() => animateAlien(alien));
}

// Funzione per invadere i post
function invadePosts() {
    if (!invasionActive) return;
    
    forumContent.classList.add('invaded');
    
    // Invadi i post uno alla volta
    posts.forEach((post, index) => {
        setTimeout(() => {
            if (!invasionActive) return;
            
            // Aggiungi la classe invaded
            post.classList.add('invaded');
            post.classList.add('glitching');
            
            // Invadi gli elementi interni
            const postHeader = post.querySelector('.post-header');
            const postAvatar = post.querySelector('.post-avatar');
            const postAuthor = post.querySelector('.post-author');
            const postDate = post.querySelector('.post-date');
            const postContent = post.querySelector('.post-content');
            const postFooter = post.querySelector('.post-footer');
            
            postHeader.classList.add('invaded');
            postAvatar.classList.add('invaded');
            postAuthor.classList.add('invaded');
            postDate.classList.add('invaded');
            postContent.classList.add('invaded');
            postFooter.classList.add('invaded');
            
            // Cambia il contenuto del post
            setTimeout(() => {
                if (!invasionActive) return;
                
                // Scegli un messaggio alieno casuale
                const alienContent = alienPostContents[Math.floor(Math.random() * alienPostContents.length)];
                postContent.querySelector('p').textContent = alienContent;
                
                // Rimuovi l'effetto glitch dopo un po'
                setTimeout(() => {
                    post.classList.remove('glitching');
                }, 1000);
            }, 500);
        }, index * 1000);
    });
}

// Funzione per mostrare un messaggio alieno
function showAlienMessage() {
    if (!invasionActive) return;
    
    // Crea l'elemento messaggio
    const message = document.createElement('div');
    message.classList.add('alien-message');
    
    // Scegli un messaggio casuale
    const text = alienMessages[Math.floor(Math.random() * alienMessages.length)];
    message.textContent = text;
    
    document.body.appendChild(message);
    
    // Mostra il messaggio
    setTimeout(() => {
        message.classList.add('active');
        
        // Nascondi il messaggio dopo un po'
        setTimeout(() => {
            if (message.parentNode) {
                message.classList.remove('active');
                setTimeout(() => {
                    if (message.parentNode) {
                        message.parentNode.removeChild(message);
                    }
                    
                    // Mostra un altro messaggio dopo un po'
                    if (invasionActive) {
                        setTimeout(showAlienMessage, Math.random() * 5000 + 5000);
                    }
                }, 500);
            }
        }, 3000);
    }, 500);
}

// Funzione per far glitchare il contatore utenti online
function startUserCounterGlitch() {
    if (!invasionActive) return;
    
    let count = parseInt(onlineUsers.textContent);
    
    window.userCounterInterval = setInterval(() => {
        if (!invasionActive) {
            clearInterval(window.userCounterInterval);
            return;
        }
        
        // Aumenta il numero in modo casuale
        count += Math.floor(Math.random() * 50) + 10;
        onlineUsers.textContent = count;
        
        // Aggiungi un effetto glitch
        onlineUsers.classList.add('alien-text');
        setTimeout(() => {
            onlineUsers.classList.remove('alien-text');
        }, 200);
    }, 2000);
}