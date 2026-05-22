# Secure P2P Chat v1.5

App web statica, mobile-first, pensata per GitHub Pages.

Funzioni incluse:

- profilo locale con password;
- chiave privata ECDH cifrata nel browser con PBKDF2 + AES-GCM;
- pairing manuale tramite codice copia/incolla;
- WebRTC DataChannel per chat testuale P2P;
- cifratura applicativa dei messaggi con ECDH + HKDF + AES-GCM;
- chiamata vocale P2P via WebRTC;
- modalità ascolto se un utente non ha microfono;
- mute/unmute quando il microfono è disponibile;
- supporto mobile-first per Safari e Chrome moderni;
- nessun service worker attivo durante i test.

## Novità v1.5

Se **Abilita voce nel pairing** è attivo ma il browser non trova un microfono, l'app non torna più a "solo testo".
Aggiunge invece un transceiver WebRTC audio `recvonly`, cioè:

```text
utente senza microfono → può ascoltare
utente con microfono   → può parlare e ascoltare
```

Quindi un PC senza microfono può comunque sentire un telefono o un portatile che parla.

## Come provarla in locale

Serve un contesto sicuro per Web Crypto e microfono. `localhost` va bene.

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

## Uso consigliato

Su entrambi i dispositivi:

1. crea un nuovo profilo locale;
2. lascia **Abilita voce nel pairing** attivo se almeno vuoi ascoltare;
3. se non hai microfono, l’app mostrerà la modalità ascolto;
4. genera un nuovo invito con la v1.5;
5. non riusare inviti di versioni precedenti.

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

- la voce usa la cifratura nativa di WebRTC, non una cifratura applicativa aggiuntiva;
- la chiave ECDH persistente non offre perfect forward secrecy;
- STUN esterno è abilitato di default per aumentare la probabilità di connessione;
- se il NAT/firewall è difficile può servire un TURN server, ma quello non è incluso;
- se perdi la password locale, non puoi recuperare il profilo.

## Se qualcosa non va

Dopo upgrade da versioni vecchie:

1. cancella i dati del sito;
2. ricarica la pagina;
3. ricrea il profilo;
4. rigenera l’invito.

Un invito valido deve contenere nel payload decodificato:

```json
"identityPublicKey": "MI..."
```

non:

```json
"identityPublicKey": {}
```
