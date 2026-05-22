# Secure P2P Chat v1.2

App web statica, mobile-first, pensata per GitHub Pages.

Funzioni incluse:

- profilo locale con password;
- chiave privata ECDH cifrata nel browser con PBKDF2 + AES-GCM;
- pairing manuale tramite codice copia/incolla;
- WebRTC DataChannel per chat testuale P2P;
- cifratura applicativa dei messaggi con ECDH + HKDF + AES-GCM;
- chiamata vocale P2P via WebRTC;
- mute/unmute;
- supporto mobile-first per Safari e Chrome moderni;
- PWA minimale con service worker.

## Come provarla in locale

Serve un contesto sicuro per Web Crypto e microfono. Puoi usare `localhost`.

```bash
python3 -m http.server 8080
```

Poi apri:

```text
http://localhost:8080
```

## Deploy su GitHub Pages

1. Crea un repository GitHub.
2. Carica questi file nella root del repository.
3. Vai in **Settings → Pages**.
4. Source: **Deploy from a branch**.
5. Branch: `main`, folder `/root`.
6. Apri l’URL `https://nomeutente.github.io/nome-repo/`.

## Uso

Persona A:

1. crea profilo o fa login;
2. decide se abilitare la voce;
3. clicca **Crea invito**;
4. copia il codice generato e lo invia a Persona B.

Persona B:

1. crea profilo o fa login;
2. decide se abilitare la voce;
3. incolla il codice in **Codice ricevuto**;
4. clicca **Usa invito ricevuto**;
5. copia la risposta generata e la invia a Persona A.

Persona A:

1. incolla la risposta in **Codice ricevuto**;
2. clicca **Conferma risposta ricevuta**.

Dopo pochi secondi la chat dovrebbe aprirsi.

## Note di sicurezza

Questa è una base funzionante, non un prodotto auditato.

Cose buone:

- nessun backend;
- messaggi testuali cifrati anche a livello applicativo;
- chiave privata cifrata localmente;
- pairing manuale;
- fingerprint visibile e verificabile;
- messaggi non salvati in cloud.

Limiti importanti:

- il codice di signaling va scambiato attraverso un canale esterno: se quel canale è compromesso, devi verificare i fingerprint;
- la chiave ECDH persistente non offre perfect forward secrecy;
- la voce usa la cifratura nativa di WebRTC, non una cifratura applicativa aggiuntiva;
- STUN esterno è abilitato di default per aumentare la probabilità di connessione;
- se il NAT/firewall è difficile può servire un TURN server, ma quello non è incluso;
- se perdi la password locale, non puoi recuperare il profilo.

## Miglioramenti consigliati

- QR code locale per invito/risposta;
- chiavi effimere firmate da identità persistente;
- verifica SAS tipo “confronta 4 parole”;
- esportazione/importazione cifrata del profilo;
- cronologia locale cifrata;
- cancellazione sicura del profilo;
- eventuale signaling opzionale via Cloudflare Worker mantenendo E2EE.


## Fix v1.1

- Corretto un bug che poteva generare un invito senza chiave pubblica valida.
- Aggiunti errori più chiari quando WebRTC, HTTPS o microfono bloccano la creazione dell’invito.
- Se l’invito non appare, prova prima con **Abilita voce nel pairing** disattivato.


## Fix v1.2

- Rinominato il file JS in `js/app.v1.2.js` per evitare che un vecchio service worker serva ancora `js/app.js`.
- Disabilitata la registrazione del service worker durante i test.
- Aggiunto controllo esplicito: l’invito non viene creato se la chiave pubblica è `{}` o non valida.
- Il vecchio bug produceva inviti con `"identityPublicKey":{}`. Un invito valido deve contenere una stringa base64 in `identityPublicKey`.

## Se arrivi dalla v1 o v1.1

Prima di riprovare:

1. apri DevTools → Application → Service Workers;
2. clicca **Unregister** sul service worker del sito;
3. vai in Application → Storage;
4. clicca **Clear site data**;
5. ricarica la pagina.

Su mobile, elimina i dati del sito dalle impostazioni del browser o cambia temporaneamente path/repository GitHub Pages.
