const $ = (id) => document.getElementById(id);

const els = {
  secureContextBadge: $("secureContextBadge"),
  authView: $("authView"),
  chatView: $("chatView"),
  usernameInput: $("usernameInput"),
  passwordInput: $("passwordInput"),
  createProfileBtn: $("createProfileBtn"),
  loginBtn: $("loginBtn"),
  profilesList: $("profilesList"),
  welcomeTitle: $("welcomeTitle"),
  localFingerprint: $("localFingerprint"),
  logoutBtn: $("logoutBtn"),
  voiceEnabled: $("voiceEnabled"),
  disableStun: $("disableStun"),
  createOfferBtn: $("createOfferBtn"),
  joinOfferBtn: $("joinOfferBtn"),
  acceptAnswerBtn: $("acceptAnswerBtn"),
  outgoingSignal: $("outgoingSignal"),
  incomingSignal: $("incomingSignal"),
  copyOutgoingBtn: $("copyOutgoingBtn"),
  clearOutgoingBtn: $("clearOutgoingBtn"),
  connectionStatus: $("connectionStatus"),
  remoteIdentity: $("remoteIdentity"),
  muteBtn: $("muteBtn"),
  playRemoteAudioBtn: $("playRemoteAudioBtn"),
  hangupBtn: $("hangupBtn"),
  voiceStatus: $("voiceStatus"),
  remoteAudio: $("remoteAudio"),
  messages: $("messages"),
  messageForm: $("messageForm"),
  messageInput: $("messageInput"),
  sendBtn: $("sendBtn")
};

const PROFILE_STORE = "secure-p2p-chat:profiles:v1";
const SIGNAL_PREFIX = "SP2P1.";
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

let state = {
  profile: null,
  pc: null,
  dc: null,
  localStream: null,
  remotePublicKey: null,
  remotePublicRaw: null,
  remoteName: null,
  remoteFingerprint: null,
  chatKey: null,
  muted: false
};

function setStatus(message, kind = "") {
  els.connectionStatus.textContent = message;
  els.connectionStatus.className = `status ${kind}`.trim();
}

function setVoiceStatus(message) {
  els.voiceStatus.textContent = message;
}

function addSystemMessage(message) {
  const node = document.createElement("div");
  node.className = "message system";
  node.textContent = message;
  els.messages.appendChild(node);
  els.messages.scrollTop = els.messages.scrollHeight;
}

function addChatMessage({ body, from, mine, ts }) {
  const node = document.createElement("div");
  node.className = `message ${mine ? "me" : ""}`;
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = `${from} · ${new Date(ts || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const content = document.createElement("div");
  content.textContent = body;
  node.append(meta, content);
  els.messages.appendChild(node);
  els.messages.scrollTop = els.messages.scrollHeight;
}

function bytesToBase64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of arr) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function base64UrlEncode(bytes) {
  return bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value) {
  let base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  while (base64.length % 4) base64 += "=";
  return base64ToBytes(base64);
}

function concatBytes(...parts) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function compareBytes(a, b) {
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}

function randomBytes(length) {
  const out = new Uint8Array(length);
  crypto.getRandomValues(out);
  return out;
}

async function sha256(bytes) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

function formatFingerprint(hashBytes) {
  return Array.from(hashBytes.slice(0, 16))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join(":")
    .toUpperCase();
}

async function fingerprintFromPublicKey(publicKeyBytes) {
  return formatFingerprint(await sha256(publicKeyBytes));
}

function getProfiles() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_STORE) || "{}");
  } catch {
    return {};
  }
}

function saveProfiles(profiles) {
  localStorage.setItem(PROFILE_STORE, JSON.stringify(profiles));
  renderProfilesList();
}

function renderProfilesList() {
  const profiles = getProfiles();
  const names = Object.keys(profiles);
  if (!names.length) {
    els.profilesList.textContent = "Nessun profilo salvato.";
    return;
  }

  els.profilesList.innerHTML = "";
  for (const name of names) {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "small-pill";
    pill.textContent = name;
    pill.addEventListener("click", () => {
      els.usernameInput.value = name;
      els.passwordInput.focus();
    });
    els.profilesList.appendChild(pill);
  }
}

async function derivePasswordKey(password, salt, iterations) {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256"
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function generateIdentityKeyPair() {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
}

async function importPrivateKey(pkcs8Bytes) {
  return crypto.subtle.importKey(
    "pkcs8",
    pkcs8Bytes,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
}

async function importPublicKey(spkiBytes) {
  return crypto.subtle.importKey(
    "spki",
    spkiBytes,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
}

async function createProfile() {
  const username = els.usernameInput.value.trim();
  const password = els.passwordInput.value;

  if (!username) throw new Error("Scegli un nome profilo.");
  if (password.length < 10) throw new Error("Usa una password locale di almeno 10 caratteri.");

  const profiles = getProfiles();
  if (profiles[username]) throw new Error("Esiste già un profilo con questo nome.");

  const iterations = 310000;
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const keyPair = await generateIdentityKeyPair();
  const privatePkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));
  const publicSpki = new Uint8Array(await crypto.subtle.exportKey("spki", keyPair.publicKey));
  const passwordKey = await derivePasswordKey(password, salt, iterations);
  const encryptedPrivateKey = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, passwordKey, privatePkcs8)
  );

  const profile = {
    username,
    iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    encryptedPrivateKey: bytesToBase64(encryptedPrivateKey),
    publicKey: bytesToBase64(publicSpki),
    fingerprint: await fingerprintFromPublicKey(publicSpki),
    createdAt: new Date().toISOString()
  };

  profiles[username] = profile;
  saveProfiles(profiles);
  await loginWithProfile(username, password);
  addSystemMessage("Profilo creato. Salva la password: senza password la chiave privata non è recuperabile.");
}

async function loginWithProfile(username, password) {
  const profiles = getProfiles();
  const saved = profiles[username];
  if (!saved) throw new Error("Profilo non trovato in questo browser.");

  const salt = base64ToBytes(saved.salt);
  const iv = base64ToBytes(saved.iv);
  const encryptedPrivateKey = base64ToBytes(saved.encryptedPrivateKey);
  const passwordKey = await derivePasswordKey(password, salt, saved.iterations);

  let privatePkcs8;
  try {
    privatePkcs8 = new Uint8Array(
      await crypto.subtle.decrypt({ name: "AES-GCM", iv }, passwordKey, encryptedPrivateKey)
    );
  } catch {
    throw new Error("Password errata o profilo corrotto.");
  }

  const privateKey = await importPrivateKey(privatePkcs8);
  const publicRaw = base64ToBytes(saved.publicKey);
  const publicKey = await importPublicKey(publicRaw);

  state.profile = {
    ...saved,
    privateKey,
    publicKey,
    publicRaw
  };

  els.authView.classList.add("hidden");
  els.chatView.classList.remove("hidden");
  els.welcomeTitle.textContent = `Ciao, ${saved.username}`;
  els.localFingerprint.textContent = `Tuo fingerprint: ${saved.fingerprint}`;
  setStatus("Profilo sbloccato. Crea o incolla un invito.", "ok");
}

function logout() {
  closeConnection();
  state.profile = null;
  state.remotePublicKey = null;
  state.remotePublicRaw = null;
  state.remoteName = null;
  state.remoteFingerprint = null;
  state.chatKey = null;
  els.chatView.classList.add("hidden");
  els.authView.classList.remove("hidden");
  els.passwordInput.value = "";
}

async function encodeSignal(payload) {
  const json = JSON.stringify(payload);
  return SIGNAL_PREFIX + base64UrlEncode(textEncoder.encode(json));
}

function decodeSignal(value) {
  const trimmed = value.trim();
  if (!trimmed.startsWith(SIGNAL_PREFIX)) {
    throw new Error("Codice non riconosciuto: deve iniziare con SP2P1.");
  }

  const json = textDecoder.decode(base64UrlDecode(trimmed.slice(SIGNAL_PREFIX.length)));
  return JSON.parse(json);
}

function rtcConfig() {
  if (els.disableStun.checked) return { iceServers: [] };
  return {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }
    ]
  };
}

async function prepareLocalAudioIfNeeded(pc) {
  if (!els.voiceEnabled.checked) {
    setVoiceStatus("Voce non abilitata per questo pairing.");
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Questo browser non espone getUserMedia per il microfono.");
  }

  state.localStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    },
    video: false
  });

  for (const track of state.localStream.getTracks()) {
    pc.addTrack(track, state.localStream);
  }

  state.muted = false;
  els.muteBtn.disabled = false;
  els.muteBtn.textContent = "Mute";
  setVoiceStatus("Microfono attivo. La voce partirà quando la connessione sarà stabilita.");
}

function makePeerConnection() {
  closeConnection(false);

  const pc = new RTCPeerConnection(rtcConfig());
  state.pc = pc;

  pc.addEventListener("connectionstatechange", () => {
    setStatus(`Stato WebRTC: ${pc.connectionState}`, pc.connectionState === "connected" ? "ok" : "");
    els.hangupBtn.disabled = pc.connectionState === "closed";
  });

  pc.addEventListener("iceconnectionstatechange", () => {
    if (pc.iceConnectionState === "failed") {
      setStatus("Connessione ICE fallita. Prova con STUN attivo o una rete diversa.", "warn");
    }
  });

  pc.addEventListener("track", (event) => {
    const [stream] = event.streams;
    if (stream) {
      els.remoteAudio.srcObject = stream;
      els.playRemoteAudioBtn.disabled = false;
      setVoiceStatus("Audio remoto ricevuto. Su iPhone/Safari potrebbe servire premere “Attiva audio remoto”.");
      els.remoteAudio.play().catch(() => {});
    }
  });

  pc.addEventListener("datachannel", (event) => {
    setupDataChannel(event.channel);
  });

  els.hangupBtn.disabled = false;
  return pc;
}

function setupDataChannel(channel) {
  state.dc = channel;

  channel.addEventListener("open", async () => {
    await deriveChatKeyIfReady();
    els.messageInput.disabled = false;
    els.sendBtn.disabled = false;
    setStatus("DataChannel aperto. Chat pronta.", "ok");
    addSystemMessage("Connessione P2P stabilita.");
  });

  channel.addEventListener("close", () => {
    els.messageInput.disabled = true;
    els.sendBtn.disabled = true;
    setStatus("DataChannel chiuso.", "warn");
  });

  channel.addEventListener("message", handleDataChannelMessage);
}

async function waitForIceGatheringComplete(pc) {
  if (pc.iceGatheringState === "complete") return;

  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 8000);
    const onChange = () => {
      if (pc.iceGatheringState === "complete") {
        clearTimeout(timeout);
        pc.removeEventListener("icegatheringstatechange", onChange);
        resolve();
      }
    };
    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

async function createOffer() {
  if (!state.profile) throw new Error("Fai login prima.");
  const pc = makePeerConnection();
  await prepareLocalAudioIfNeeded(pc);

  const channel = pc.createDataChannel("secure-chat", { ordered: true });
  setupDataChannel(channel);

  await pc.setLocalDescription(await pc.createOffer());
  setStatus("Raccolta dati ICE in corso…");
  await waitForIceGatheringComplete(pc);

  const signal = {
    v: 1,
    type: "offer",
    createdAt: new Date().toISOString(),
    username: state.profile.username,
    fingerprint: state.profile.fingerprint,
    identityPublicKey: state.profile.publicKey,
    sdp: pc.localDescription.sdp
  };

  els.outgoingSignal.value = await encodeSignal(signal);
  setStatus("Invito creato. Copialo e invialo al tuo amico.", "ok");
}

async function joinOffer() {
  if (!state.profile) throw new Error("Fai login prima.");
  const signal = decodeSignal(els.incomingSignal.value);
  if (signal.type !== "offer") throw new Error("Il codice incollato non è un invito.");

  await setRemoteIdentity(signal);

  const pc = makePeerConnection();
  await prepareLocalAudioIfNeeded(pc);

  await pc.setRemoteDescription({ type: "offer", sdp: signal.sdp });
  await pc.setLocalDescription(await pc.createAnswer());
  setStatus("Raccolta dati ICE in corso…");
  await waitForIceGatheringComplete(pc);

  const answer = {
    v: 1,
    type: "answer",
    createdAt: new Date().toISOString(),
    username: state.profile.username,
    fingerprint: state.profile.fingerprint,
    identityPublicKey: state.profile.publicKey,
    sdp: pc.localDescription.sdp
  };

  els.outgoingSignal.value = await encodeSignal(answer);
  setStatus("Risposta creata. Copiala e inviala a chi ha creato l’invito.", "ok");
}

async function acceptAnswer() {
  if (!state.profile || !state.pc) throw new Error("Prima crea un invito.");
  const signal = decodeSignal(els.incomingSignal.value);
  if (signal.type !== "answer") throw new Error("Il codice incollato non è una risposta.");

  await setRemoteIdentity(signal);
  await state.pc.setRemoteDescription({ type: "answer", sdp: signal.sdp });
  setStatus("Risposta accettata. Connessione in corso…", "ok");
}

async function setRemoteIdentity(signal) {
  if (!signal.identityPublicKey) throw new Error("Il codice non contiene la chiave pubblica remota.");

  const remoteRaw = base64ToBytes(signal.identityPublicKey);
  const computedFingerprint = await fingerprintFromPublicKey(remoteRaw);
  const remotePublicKey = await importPublicKey(remoteRaw);

  state.remotePublicRaw = remoteRaw;
  state.remotePublicKey = remotePublicKey;
  state.remoteName = signal.username || "Contatto remoto";
  state.remoteFingerprint = computedFingerprint;

  const warning = signal.fingerprint && signal.fingerprint !== computedFingerprint
    ? `<p class="warning">Attenzione: fingerprint dichiarato e fingerprint calcolato non coincidono.</p>`
    : "";

  els.remoteIdentity.innerHTML = `
    <strong>${escapeHtml(state.remoteName)}</strong>
    <p class="mono tiny">Fingerprint: ${computedFingerprint}</p>
    ${warning}
    <p class="muted">Confronta questo fingerprint con il tuo amico usando un canale esterno.</p>
  `;

  await deriveChatKeyIfReady();
}

async function deriveChatKeyIfReady() {
  if (!state.profile?.privateKey || !state.remotePublicKey || !state.remotePublicRaw) return;
  if (state.chatKey) return;

  const sharedBits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: state.remotePublicKey },
      state.profile.privateKey,
      256
    )
  );

  const first = compareBytes(state.profile.publicRaw, state.remotePublicRaw) <= 0
    ? state.profile.publicRaw
    : state.remotePublicRaw;
  const second = first === state.profile.publicRaw ? state.remotePublicRaw : state.profile.publicRaw;
  const salt = await sha256(concatBytes(first, second));

  const hkdfKey = await crypto.subtle.importKey("raw", sharedBits, "HKDF", false, ["deriveKey"]);
  state.chatKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: textEncoder.encode("secure-p2p-chat-app-message-key-v1")
    },
    hkdfKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  addSystemMessage("Chiave chat derivata con ECDH + HKDF.");
}

async function encryptMessage(payload) {
  if (!state.chatKey) throw new Error("Chiave chat non pronta.");
  const iv = randomBytes(12);
  const plaintext = textEncoder.encode(JSON.stringify(payload));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, state.chatKey, plaintext)
  );

  return {
    kind: "cipher",
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext)
  };
}

async function decryptMessage(envelope) {
  if (!state.chatKey) throw new Error("Chiave chat non pronta.");
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(envelope.iv) },
    state.chatKey,
    base64ToBytes(envelope.ciphertext)
  );
  return JSON.parse(textDecoder.decode(plaintext));
}

async function sendMessage(event) {
  event.preventDefault();

  const body = els.messageInput.value.trim();
  if (!body) return;
  if (!state.dc || state.dc.readyState !== "open") throw new Error("DataChannel non aperto.");

  const payload = {
    type: "text",
    from: state.profile.username,
    body,
    ts: Date.now()
  };

  const envelope = await encryptMessage(payload);
  state.dc.send(JSON.stringify(envelope));
  addChatMessage({ ...payload, mine: true });
  els.messageInput.value = "";
}

async function handleDataChannelMessage(event) {
  let envelope;
  try {
    envelope = JSON.parse(event.data);
  } catch {
    addSystemMessage("Ricevuto messaggio non valido.");
    return;
  }

  if (envelope.kind !== "cipher") {
    addSystemMessage("Ricevuto messaggio non cifrato: ignorato.");
    return;
  }

  try {
    const payload = await decryptMessage(envelope);
    if (payload.type === "text") {
      addChatMessage({
        body: payload.body,
        from: payload.from || state.remoteName || "Remoto",
        mine: false,
        ts: payload.ts
      });
    }
  } catch {
    addSystemMessage("Impossibile decifrare un messaggio ricevuto.");
  }
}

function toggleMute() {
  if (!state.localStream) return;
  state.muted = !state.muted;
  for (const track of state.localStream.getAudioTracks()) {
    track.enabled = !state.muted;
  }
  els.muteBtn.textContent = state.muted ? "Unmute" : "Mute";
  setVoiceStatus(state.muted ? "Microfono in mute." : "Microfono attivo.");
}

async function playRemoteAudio() {
  if (!els.remoteAudio.srcObject) return;
  try {
    await els.remoteAudio.play();
    setVoiceStatus("Audio remoto attivo.");
  } catch (error) {
    setVoiceStatus(`Audio remoto bloccato dal browser: ${error.message}`);
  }
}

function closeConnection(resetRemote = true) {
  if (state.dc) {
    try { state.dc.close(); } catch {}
  }

  if (state.pc) {
    try { state.pc.close(); } catch {}
  }

  if (state.localStream) {
    for (const track of state.localStream.getTracks()) track.stop();
  }

  state.pc = null;
  state.dc = null;
  state.localStream = null;
  state.chatKey = null;
  state.muted = false;

  if (resetRemote) {
    state.remotePublicKey = null;
    state.remotePublicRaw = null;
    state.remoteName = null;
    state.remoteFingerprint = null;
    els.remoteIdentity.textContent = "Nessun contatto remoto ancora impostato.";
  }

  els.remoteAudio.srcObject = null;
  els.messageInput.disabled = true;
  els.sendBtn.disabled = true;
  els.muteBtn.disabled = true;
  els.playRemoteAudioBtn.disabled = true;
  els.hangupBtn.disabled = true;
  els.muteBtn.textContent = "Mute";
  setVoiceStatus("Voce non attiva.");
  setStatus("Non connesso.");
}

function escapeHtml(input) {
  return String(input).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

async function runSafely(action) {
  try {
    await action();
  } catch (error) {
    console.error(error);
    setStatus(error.message || String(error), "warn");
    addSystemMessage(error.message || String(error));
  }
}

function setupEvents() {
  els.createProfileBtn.addEventListener("click", () => runSafely(createProfile));
  els.loginBtn.addEventListener("click", () => {
    const username = els.usernameInput.value.trim();
    const password = els.passwordInput.value;
    runSafely(() => loginWithProfile(username, password));
  });

  els.logoutBtn.addEventListener("click", logout);
  els.createOfferBtn.addEventListener("click", () => runSafely(createOffer));
  els.joinOfferBtn.addEventListener("click", () => runSafely(joinOffer));
  els.acceptAnswerBtn.addEventListener("click", () => runSafely(acceptAnswer));
  els.messageForm.addEventListener("submit", (event) => runSafely(() => sendMessage(event)));
  els.muteBtn.addEventListener("click", toggleMute);
  els.playRemoteAudioBtn.addEventListener("click", () => runSafely(playRemoteAudio));
  els.hangupBtn.addEventListener("click", () => closeConnection());

  els.copyOutgoingBtn.addEventListener("click", async () => {
    if (!els.outgoingSignal.value) return;
    await navigator.clipboard.writeText(els.outgoingSignal.value);
    setStatus("Codice copiato negli appunti.", "ok");
  });

  els.clearOutgoingBtn.addEventListener("click", () => {
    els.outgoingSignal.value = "";
  });

  els.passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const username = els.usernameInput.value.trim();
      const password = els.passwordInput.value;
      runSafely(() => loginWithProfile(username, password));
    }
  });
}

function init() {
  if (!window.isSecureContext) {
    els.secureContextBadge.textContent = "HTTPS richiesto";
    els.secureContextBadge.style.borderColor = "rgba(239,68,68,.5)";
    setStatus("Apri l’app via HTTPS o localhost. GitHub Pages va bene.", "warn");
  } else {
    els.secureContextBadge.textContent = "secure context";
  }

  if (!crypto?.subtle) {
    setStatus("Web Crypto API non disponibile in questo browser.", "warn");
  }

  setupEvents();
  renderProfilesList();

  // Service worker disabilitato nella v1.2 per evitare cache stale durante i test.
}

init();
