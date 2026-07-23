(function () {
    "use strict";

    const scriptInfo = {
        sid: "local-hashtags-v1",
        name: "HashTags Local",
        version: "1.5.0",
        settings: {
            blacklistSections: [],
            whitelistSections: [],
            maxIndexedPosts: 1500,
            maxSuggestions: 8,
            suggestionDebounce: 250,
            editorPollInterval: 750,
            autocompleteMinLength: 2,
            autocompleteMaxResults: 5,
            aliasGroups: [
                { canonical: "#IntelligenzaArtificiale", aliases: ["#AI"] },
                { canonical: "#Cybersecurity", aliases: ["#Cyber"] },
                { canonical: "#Droni", aliases: ["#UAV", "#UAS"] }
            ]
        }
    };

    const HASHTAG_PATTERN = /#(?!\d+\b)[\p{L}][\p{L}\p{N}_+-]*/gu;
    const HASHTAG_IN_TEXT_PATTERN = /(^|[\s([{])(#(?!\d+\b)[\p{L}][\p{L}\p{N}_+-]*)/gu;
    const STORAGE_VERSION = 3;
    const PREFERENCES_VERSION = 1;
    const CSS_ID = "ht-local-styles";
    const BAR_ID = "ht-suggestions";

    const STOP_WORDS = new Set([
        "a", "ad", "al", "alla", "alle", "anche", "che", "chi", "con", "da",
        "dal", "dalla", "delle", "dei", "del", "di", "e", "ed", "gli", "ha",
        "i", "il", "in", "io", "la", "le", "lo", "ma", "nel", "nella", "non",
        "o", "per", "piu", "più", "se", "si", "sono", "su", "tra", "un", "una"
    ]);

    const SEED_RULES = [
        { tag: "#Droni", terms: ["drone", "droni", "uas", "uav", "anti-drone", "antidrone"] },
        { tag: "#DifesaAerea", terms: ["difesa aerea", "radar", "intercettazione", "missile", "contraerea"] },
        { tag: "#Mediterraneo", terms: ["mediterraneo", "marittimo", "navale", "mare"] },
        { tag: "#NATO", terms: ["nato", "alleanza atlantica"], domains: ["nato.int"] },
        { tag: "#Cybersecurity", terms: ["cyber", "cybersecurity", "rete", "infrastruttura critica"] },
        { tag: "#IntelligenzaArtificiale", terms: ["intelligenza artificiale", "algoritmo", "machine learning", "ai"] },
        { tag: "#Innovazione", terms: ["innovazione", "tecnologia", "ricerca", "sviluppo"] },
        { tag: "#Sicurezza", terms: ["sicurezza", "minaccia", "rischio", "protezione"] },
        { tag: "#Geopolitica", terms: ["geopolitica", "strategia", "relazioni internazionali"] }
    ];

    function hashtagShape(tag) {
        const clean = String(tag || "").trim();
        if (!clean) return "";
        return clean.startsWith("#") ? clean : `#${clean}`;
    }

    const HASHTAG_ALIAS_LOOKUP = new Map();
    const HASHTAG_ALIASES_BY_CANONICAL = new Map();

    scriptInfo.settings.aliasGroups.forEach((group) => {
        const canonical = hashtagShape(group.canonical);
        if (!canonical) return;

        const canonicalKey = canonical.toLowerCase();
        const aliases = uniqueRawTags([canonical, ...(group.aliases || [])]);
        HASHTAG_ALIASES_BY_CANONICAL.set(canonicalKey, aliases);
        aliases.forEach((alias) => HASHTAG_ALIAS_LOOKUP.set(alias.toLowerCase(), canonical));
    });

    function uniqueRawTags(tags) {
        const found = new Map();

        tags.forEach((tag) => {
            const shaped = hashtagShape(tag);
            const key = shaped.toLowerCase();
            if (shaped && !found.has(key)) found.set(key, shaped);
        });

        return [...found.values()];
    }

    function normalizeSpace(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
    }

    function normalizeForSearch(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    function canonicalTag(tag) {
        const shaped = hashtagShape(tag);
        if (!shaped) return "";
        return HASHTAG_ALIAS_LOOKUP.get(shaped.toLowerCase()) || shaped;
    }

    function uniqueTags(tags) {
        const found = new Map();

        tags.forEach((tag) => {
            const canonical = canonicalTag(tag);
            const key = canonical.toLowerCase();
            if (canonical && !found.has(key)) found.set(key, canonical);
        });

        return [...found.values()];
    }

    function extractHashtags(text) {
        return uniqueTags(String(text || "").match(HASHTAG_PATTERN) || []);
    }

    function parseHashtagList(value) {
        return uniqueTags(
            String(value || "")
                .split(/[\s,;]+/)
                .map((tag) => tag.trim())
                .filter(Boolean)
        );
    }

    function formatInputDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function htmlToContainer(html) {
        const container = document.createElement("div");
        container.innerHTML = String(html || "");
        container.querySelectorAll("script, style, noscript").forEach((element) => element.remove());
        return container;
    }

    function htmlToText(html) {
        return normalizeSpace(htmlToContainer(html).textContent);
    }

    function extractLinks(html) {
        const container = htmlToContainer(html);
        const links = [...container.querySelectorAll("a[href]")]
            .map((anchor) => anchor.href)
            .filter(Boolean);

        const plainUrls = String(html || "").match(/https?:\/\/[^\s<>'\"]+/gi) || [];
        return [...new Set([...links, ...plainUrls])];
    }

    function getDomains(links) {
        return [...new Set(links.map((link) => {
            try {
                return new URL(link, window.location.href).hostname.replace(/^www\./, "").toLowerCase();
            } catch {
                return "";
            }
        }).filter(Boolean))];
    }

    function tokenize(value) {
        return normalizeForSearch(value)
            .replace(/[^\p{L}\p{N}]+/gu, " ")
            .split(/\s+/)
            .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
    }

    function hashtagTokens(tag) {
        const withoutHash = canonicalTag(tag).slice(1).replace(/([a-zà-öø-ÿ])([A-Z])/g, "$1 $2");
        return tokenize(withoutHash.replace(/[_+-]+/g, " "));
    }

    function safeDate(value) {
        let dateValue = Number(value);
        if (Number.isFinite(dateValue) && dateValue > 0 && dateValue < 100000000000) {
            dateValue *= 1000;
        }

        const date = new Date(Number.isFinite(dateValue) && dateValue > 0 ? dateValue : value);
        return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    }

    function getNumericUrlParameter(href, name) {
        const source = String(href || "").replace(/&amp;/gi, "&");

        try {
            const value = new URL(source, window.location.href).searchParams.get(name);
            if (/^\d+$/.test(value || "")) return Number(value);
        } catch {
            // Alcune skin usano URL relativi non standard: il fallback li gestisce.
        }

        const match = source.match(new RegExp(`[?&;]${name}=(\\d+)(?:[&#;]|$)`, "i"));
        return match ? Number(match[1]) : 0;
    }

    function findSectionTitleInPage(sectionId, topicTitle) {
        if (!sectionId) return "";

        const topicKey = normalizeForSearch(normalizeSpace(topicTitle));
        const candidates = [...document.querySelectorAll("a[href]")]
            .filter((anchor) => getNumericUrlParameter(anchor.getAttribute("href"), "f") === sectionId)
            .map((anchor) => {
                const href = anchor.getAttribute("href") || "";
                const title = normalizeSpace(anchor.textContent || anchor.getAttribute("title"));
                let score = 0;

                try {
                    const url = new URL(href, window.location.href);
                    const isCanonicalSectionLink = !url.searchParams.get("act")
                        && !url.searchParams.get("t")
                        && !/\/rss\.php$/i.test(url.pathname);

                    if (isCanonicalSectionLink) score += 1000;
                    if (/\/rss\.php$/i.test(url.pathname)) score -= 500;
                } catch {
                    // Il punteggio restante è sufficiente per gli URL non standard.
                }

                if (anchor.closest("#navstrip, .navstrip, .breadcrumbs, .breadcrumb, .navigation, .path")) score += 100;
                if (!getNumericUrlParameter(href, "t")) score += 20;
                if (title.length <= 80) score += 10;

                return { title, score };
            })
            .filter((candidate) => candidate.title
                && normalizeForSearch(candidate.title) !== topicKey)
            .sort((left, right) => right.score - left.score || left.title.length - right.title.length);

        return candidates[0]?.title || "";
    }

    function getCurrentSection(locationInfo, topicTitle) {
        const id = Number(locationInfo?.section?.id || 0);
        const commonsTitle = normalizeSpace(locationInfo?.section?.title);
        const topicKey = normalizeForSearch(normalizeSpace(topicTitle));
        const commonsTitleIsSection = commonsTitle
            && normalizeForSearch(commonsTitle) !== topicKey;
        const title = (commonsTitleIsSection ? commonsTitle : findSectionTitleInPage(id, topicTitle))
            || (id ? `Sezione ${id}` : "Sezione");

        return { id, title };
    }

    function debounce(callback, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => callback(...args), delay);
        };
    }

    class LocalHashtagIndex {
        constructor(commons) {
            this.commons = commons;
            const forum = commons.forum || {};
            this.communityId = String(
                forum.cid || forum.id || forum.subdomain || window.location.hostname || "forum"
            );
            this.storageKey = `ht-local-index:${this.communityId}`;
            this.data = this.load();
        }

        load() {
            try {
                const parsed = JSON.parse(localStorage.getItem(this.storageKey) || "null");
                if (parsed?.version === STORAGE_VERSION && parsed.posts && typeof parsed.posts === "object") {
                    return parsed;
                }
            } catch (error) {
                console.warn("[HashTags Local] Impossibile leggere l'indice locale", error);
            }

            return { version: STORAGE_VERSION, posts: {} };
        }

        save() {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.data));
            } catch (error) {
                console.warn("[HashTags Local] Impossibile salvare l'indice locale", error);
            }
        }

        indexCurrentPage() {
            const location = this.commons.location || {};
            if (!location.isTopic || !Array.isArray(location.posts)) return;

            const topicId = Number(location.topic?.id || 0);
            const topicTitle = location.topic?.title || document.title || "Discussione";
            const section = getCurrentSection(location, topicTitle);
            const sectionId = section.id;
            const sectionTitle = section.title;
            const indexedAt = Date.now();

            Object.values(this.data.posts).forEach((storedPost) => {
                if (Number(storedPost.sectionId) === sectionId) {
                    storedPost.sectionTitle = sectionTitle;
                }
            });

            location.posts.forEach((post) => {
                const contentRoot = post.nativeElement?.querySelector?.(".color");
                const html = String(post.content || contentRoot?.innerHTML || "");
                const text = htmlToText(html);
                const hashtags = extractHashtags(text);
                const postId = Number(post.id || 0);

                if (!postId) return;

                this.data.posts[`${topicId}:${postId}`] = {
                    postId,
                    topicId,
                    topicTitle,
                    sectionId,
                    sectionTitle,
                    authorId: Number(post.author?.id || 0),
                    authorName: post.author?.nickname || "Utente",
                    date: safeDate(post.time),
                    hashtags,
                    excerpt: text.slice(0, 320),
                    links: extractLinks(html),
                    url: new URL(`/?t=${topicId}&p=${postId}&ht-redirect=1`, window.location.origin).href,
                    indexedAt
                };
            });

            this.prune();
            this.save();
        }

        prune() {
            const entries = Object.entries(this.data.posts);
            const maxPosts = scriptInfo.settings.maxIndexedPosts;
            if (entries.length <= maxPosts) return;

            entries
                .sort((left, right) => Number(right[1].indexedAt || 0) - Number(left[1].indexedAt || 0))
                .slice(maxPosts)
                .forEach(([key]) => delete this.data.posts[key]);
        }

        getPosts() {
            return Object.values(this.data.posts).map((post) => ({
                ...post,
                hashtags: uniqueTags(Array.isArray(post.hashtags) ? post.hashtags : [])
            }));
        }

        getHashtagStats(filter = {}) {
            const stats = new Map();

            this.getPosts().forEach((post) => {
                if (filter.topicId && Number(post.topicId) !== Number(filter.topicId)) return;
                if (filter.sectionId && Number(post.sectionId) !== Number(filter.sectionId)) return;

                post.hashtags.forEach((tag) => {
                    const key = tag.toLowerCase();
                    const current = stats.get(key) || { tag, count: 0 };
                    current.count += 1;
                    stats.set(key, current);
                });
            });

            return stats;
        }

        getKnownTags() {
            const tags = new Map();

            SEED_RULES.forEach((rule) => tags.set(rule.tag.toLowerCase(), rule.tag));
            this.getHashtagStats().forEach((value, key) => tags.set(key, value.tag));

            return [...tags.values()];
        }

        listHashtags(startsWith = "") {
            const rawPrefix = hashtagShape(startsWith).toLowerCase();
            const canonicalPrefix = canonicalTag(startsWith).toLowerCase();
            const stats = this.getHashtagStats();

            return this.getKnownTags()
                .map((tag) => ({
                    tag,
                    count: stats.get(tag.toLowerCase())?.count || 0
                }))
                .filter((item) => {
                    if (!rawPrefix) return true;
                    if (item.tag.toLowerCase().startsWith(canonicalPrefix)) return true;

                    const aliases = HASHTAG_ALIASES_BY_CANONICAL.get(item.tag.toLowerCase()) || [];
                    return aliases.some((alias) => alias.toLowerCase().startsWith(rawPrefix));
                })
                .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag))
                .slice(0, 20);
        }

        getAuthors() {
            const authors = new Map();

            this.getPosts().forEach((post) => {
                const name = normalizeSpace(post.authorName);
                const key = normalizeForSearch(name);
                if (name && !authors.has(key)) authors.set(key, name);
            });

            return [...authors.values()].sort((left, right) => left.localeCompare(right));
        }

        getSections() {
            const sections = new Map();

            this.getPosts().forEach((post) => {
                const key = String(post.sectionId || post.sectionTitle);
                const title = normalizeSpace(post.sectionTitle);
                const isReliable = Boolean(title)
                    && normalizeForSearch(title) !== normalizeForSearch(post.topicTitle);
                const current = sections.get(key);

                if (!current || (!current.isReliable && isReliable)) {
                    sections.set(key, {
                        id: post.sectionId,
                        title: isReliable ? title : `Sezione ${post.sectionId}`,
                        isReliable
                    });
                }
            });

            return [...sections.values()]
                .map(({ id, title }) => ({ id, title }))
                .sort((left, right) => left.title.localeCompare(right.title));
        }
    }

    class LocalHashtagPreferences {
        constructor(commons) {
            const forum = commons.forum || {};
            this.communityId = String(
                forum.cid || forum.id || forum.subdomain || window.location.hostname || "forum"
            );
            this.storageKey = `ht-local-preferences:${this.communityId}`;
            this.data = this.load();
        }

        load() {
            try {
                const parsed = JSON.parse(localStorage.getItem(this.storageKey) || "null");
                if (
                    parsed?.version === PREFERENCES_VERSION
                    && parsed.dismissedBySection
                    && typeof parsed.dismissedBySection === "object"
                ) return parsed;
            } catch (error) {
                console.warn("[HashTags Local] Impossibile leggere le preferenze locali", error);
            }

            return { version: PREFERENCES_VERSION, dismissedBySection: {} };
        }

        save() {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.data));
            } catch (error) {
                console.warn("[HashTags Local] Impossibile salvare le preferenze locali", error);
            }
        }

        sectionKey(sectionId) {
            return String(Number(sectionId || 0));
        }

        getDismissed(sectionId) {
            const tags = this.data.dismissedBySection[this.sectionKey(sectionId)] || [];
            return uniqueTags(tags);
        }

        isDismissed(sectionId, tag) {
            const key = canonicalTag(tag).toLowerCase();
            return this.getDismissed(sectionId).some((item) => item.toLowerCase() === key);
        }

        dismiss(sectionId, tag) {
            if (!Number(sectionId)) return;
            const sectionKey = this.sectionKey(sectionId);
            const tags = uniqueTags([
                ...(this.data.dismissedBySection[sectionKey] || []),
                canonicalTag(tag)
            ]);
            this.data.dismissedBySection[sectionKey] = tags;
            this.save();
        }

        restore(sectionId, tag) {
            if (!Number(sectionId)) return;
            const sectionKey = this.sectionKey(sectionId);
            const key = canonicalTag(tag).toLowerCase();
            const tags = this.getDismissed(sectionId)
                .filter((item) => item.toLowerCase() !== key);

            if (tags.length) this.data.dismissedBySection[sectionKey] = tags;
            else delete this.data.dismissedBySection[sectionKey];
            this.save();
        }
    }

    class CommonsModalAdapter {
        constructor(commons) {
            this.commons = commons;
            this.mode = null;
            this.instance = null;
            this.id = null;
            this.create();
        }

        create() {
            const content = HashtagApp.searchModalContent();
            const footer = HashtagApp.searchModalFooter();
            const modal = this.commons.modal;

            if (typeof modal?.create === "function") {
                this.mode = "create";
                this.instance = modal.create({
                    className: ["ht-modal", "ht-search-modal", "cs-modal-sm", "cs-modal-text-left"],
                    title: "Ricerca hashtag",
                    content,
                    footer
                });
                return;
            }

            if (typeof modal?.set === "function") {
                this.mode = "set";
                this.id = modal.set({
                    class: ["ht-modal", "ht-search-modal", "cs-modal-w60", "cs-modal-text-left"],
                    title: "Ricerca hashtag",
                    content,
                    footer
                });
                return;
            }

            throw new Error("La libreria Commons.modal non è disponibile");
        }

        get nativeElement() {
            if (this.mode === "create") return this.instance?.nativeElement || null;
            return document.querySelector(".ht-search-modal");
        }

        show() {
            if (this.mode === "create") {
                this.instance.show();
                return;
            }

            const root = this.nativeElement;
            if (root && typeof this.commons.modal.open === "function") {
                this.commons.modal.open(root);
            } else {
                this.commons.modal.toggle(this.id);
            }
        }

        hide() {
            if (this.mode === "create") {
                this.instance.hide();
                return;
            }

            this.commons.modal.close(this.nativeElement || undefined);
        }
    }

    class CompactHashtagAutocomplete {
        constructor(app) {
            this.app = app;
            this.container = null;
            this.root = null;
            this.list = null;
            this.queryLabel = null;
            this.editors = new Map();
            this.observer = null;
            this.retryTimer = null;
            this.editor = null;
            this.token = null;
            this.results = [];
            this.activeIndex = 0;
            this.composing = false;
            this.handlePointerDown = this.handlePointerDown.bind(this);
            this.handlePointerMove = this.handlePointerMove.bind(this);
        }

        start(attempt = 0) {
            const container = document.querySelector("li.st-editor-container");
            if (!container) {
                if (attempt < 40) {
                    this.retryTimer = setTimeout(() => this.start(attempt + 1), 150);
                }
                return;
            }

            this.container = container;
            this.syncEditors();
            if (!this.observer) {
                this.observer = new MutationObserver(() => this.syncEditors());
                this.observer.observe(container, { childList: true, subtree: true });
            }
        }

        destroy() {
            clearTimeout(this.retryTimer);
            this.observer?.disconnect();
            this.editors.forEach((handlers, editor) => {
                Object.entries(handlers).forEach(([type, handler]) => {
                    editor.removeEventListener(type, handler);
                });
            });
            this.editors.clear();
            this.root?.removeEventListener("pointerdown", this.handlePointerDown);
            this.root?.removeEventListener("pointermove", this.handlePointerMove);
            this.root?.remove();
            this.root = null;
            this.editor = null;
            this.token = null;
            this.results = [];
        }

        syncEditors() {
            if (!this.container?.isConnected) return;

            [...this.editors.keys()].forEach((editor) => {
                if (editor.isConnected) return;
                const handlers = this.editors.get(editor);
                Object.entries(handlers).forEach(([type, handler]) => {
                    editor.removeEventListener(type, handler);
                });
                this.editors.delete(editor);
            });

            const candidates = this.container.querySelectorAll([
                "textarea#Post",
                "#st-visual-editor [contenteditable='true'][role='textbox']",
                "#st-visual-editor .ProseMirror[contenteditable='true']",
                ".ve-content [contenteditable='true'][role='textbox']"
            ].join(","));

            [...new Set(candidates)].forEach((editor) => this.bindEditor(editor));
        }

        bindEditor(editor) {
            if (this.editors.has(editor)) return;

            if (!editor.id) {
                editor.id = `ht-autocomplete-editor-${this.editors.size + 1}`;
            }

            editor.setAttribute("aria-autocomplete", "list");
            editor.setAttribute("aria-expanded", "false");

            const handlers = {
                input: () => {
                    if (!this.composing) this.update(editor);
                },
                click: () => this.update(editor),
                keyup: (event) => {
                    if (!["ArrowUp", "ArrowDown", "Enter", "Tab", "Escape"].includes(event.key)) {
                        this.update(editor);
                    }
                },
                keydown: (event) => this.handleEditorKeydown(event, editor),
                compositionstart: () => {
                    this.composing = true;
                },
                compositionend: () => {
                    this.composing = false;
                    this.update(editor);
                },
                blur: () => {
                    setTimeout(() => {
                        if (this.editor !== editor) return;
                        if (!this.editors.has(document.activeElement)) this.close();
                    }, 80);
                }
            };

            Object.entries(handlers).forEach(([type, handler]) => {
                editor.addEventListener(type, handler);
            });
            this.editors.set(editor, handlers);
        }

        ensureRoot() {
            if (this.root?.isConnected) return this.root;

            const root = document.createElement("div");
            root.id = "ht-autocomplete";
            root.className = "ht-autocomplete";
            root.hidden = true;
            root.setAttribute("role", "listbox");
            root.setAttribute("aria-label", "Suggerimenti hashtag");
            root.innerHTML = `
                <div class="ht-autocomplete-head">
                    <strong>Completa hashtag</strong>
                    <span class="ht-autocomplete-query"></span>
                </div>
                <div class="ht-autocomplete-list"></div>
                <div class="ht-autocomplete-help">
                    <span>↑↓ per scegliere</span>
                    <span>Invio per inserire</span>
                    <span>Esc per chiudere</span>
                </div>
            `;
            root.addEventListener("pointerdown", this.handlePointerDown);
            root.addEventListener("pointermove", this.handlePointerMove);
            document.body.appendChild(root);

            this.root = root;
            this.list = root.querySelector(".ht-autocomplete-list");
            this.queryLabel = root.querySelector(".ht-autocomplete-query");
            return root;
        }

        getToken(editor) {
            if (editor instanceof HTMLTextAreaElement) {
                const caret = editor.selectionStart;
                if (caret !== editor.selectionEnd) return null;
                const before = editor.value.slice(0, caret);
                const match = before.match(/(?:^|\s)#([\p{L}\p{N}_+-]*)$/u);
                if (!match) return null;
                return {
                    query: match[1],
                    start: caret - match[1].length - 1,
                    end: caret
                };
            }

            if (!editor.matches("[contenteditable='true']")) return null;
            const selection = window.getSelection();
            if (!selection?.rangeCount || !selection.isCollapsed) return null;
            const selectionRange = selection.getRangeAt(0);
            if (!editor.contains(selectionRange.startContainer)) return null;
            if (selectionRange.startContainer.nodeType !== Node.TEXT_NODE) return null;
            if (selectionRange.startContainer.parentElement?.closest("a, code, pre")) return null;

            const node = selectionRange.startContainer;
            const offset = selectionRange.startOffset;
            const before = node.nodeValue.slice(0, offset);
            const match = before.match(/(?:^|\s)#([\p{L}\p{N}_+-]*)$/u);
            if (!match) return null;

            const range = document.createRange();
            range.setStart(node, offset - match[1].length - 1);
            range.setEnd(node, offset);
            return { query: match[1], range };
        }

        update(editor) {
            const token = this.getToken(editor);
            if (!token) {
                this.close();
                return;
            }

            this.editor = editor;
            this.token = token;
            this.activeIndex = 0;
            const minLength = scriptInfo.settings.autocompleteMinLength;
            this.results = token.query.length >= minLength
                ? this.app.index.listHashtags(`#${token.query}`)
                    .slice(0, scriptInfo.settings.autocompleteMaxResults)
                : [];
            this.render();
        }

        render() {
            const root = this.ensureRoot();
            const minLength = scriptInfo.settings.autocompleteMinLength;
            this.list.replaceChildren();
            this.queryLabel.textContent = `#${this.token.query}`;

            if (this.token.query.length < minLength) {
                const hint = document.createElement("span");
                hint.className = "ht-autocomplete-message";
                hint.textContent = `Digita almeno ${minLength} caratteri…`;
                this.list.appendChild(hint);
            } else if (!this.results.length) {
                const empty = document.createElement("span");
                empty.className = "ht-autocomplete-message";
                empty.textContent = "Nessun hashtag trovato";
                this.list.appendChild(empty);
            } else {
                this.results.forEach((item, index) => {
                    const button = document.createElement("button");
                    const tag = document.createElement("span");
                    const count = document.createElement("span");
                    button.type = "button";
                    button.id = `ht-autocomplete-option-${index}`;
                    button.className = "ht-autocomplete-option";
                    button.dataset.index = String(index);
                    button.setAttribute("role", "option");
                    button.setAttribute("aria-selected", String(index === this.activeIndex));
                    tag.className = "ht-autocomplete-tag";
                    tag.textContent = item.tag;
                    count.className = "ht-autocomplete-count";
                    count.textContent = `${item.count} ${item.count === 1 ? "uso" : "usi"}`;
                    button.append(tag, count);
                    this.list.appendChild(button);
                });
            }

            root.hidden = false;
            this.editor.setAttribute("aria-controls", root.id);
            this.editor.setAttribute("aria-expanded", "true");
            this.updateActiveDescendant();
            this.position();
        }

        setActive(index) {
            if (!this.results.length) return;
            this.activeIndex = (index + this.results.length) % this.results.length;
            this.list.querySelectorAll(".ht-autocomplete-option").forEach((button, itemIndex) => {
                button.setAttribute("aria-selected", String(itemIndex === this.activeIndex));
            });
            this.updateActiveDescendant();
            this.list.querySelector(`[data-index="${this.activeIndex}"]`)?.scrollIntoView({
                block: "nearest"
            });
        }

        updateActiveDescendant() {
            if (!this.editor) return;
            if (this.results[this.activeIndex]) {
                this.editor.setAttribute("aria-activedescendant", `ht-autocomplete-option-${this.activeIndex}`);
            } else {
                this.editor.removeAttribute("aria-activedescendant");
            }
        }

        handleEditorKeydown(event, editor) {
            if (this.root?.hidden || editor !== this.editor) return;

            if (event.key === "ArrowDown") {
                event.preventDefault();
                this.setActive(this.activeIndex + 1);
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                this.setActive(this.activeIndex - 1);
            } else if ((event.key === "Enter" || event.key === "Tab") && this.results[this.activeIndex]) {
                event.preventDefault();
                this.commit(this.results[this.activeIndex]);
            } else if (event.key === "Escape") {
                event.preventDefault();
                this.close();
            }
        }

        handlePointerDown(event) {
            const option = event.target instanceof Element
                ? event.target.closest(".ht-autocomplete-option")
                : null;
            if (!option) return;
            event.preventDefault();
            const item = this.results[Number(option.dataset.index)];
            if (item) this.commit(item);
        }

        handlePointerMove(event) {
            const option = event.target instanceof Element
                ? event.target.closest(".ht-autocomplete-option")
                : null;
            if (option) this.setActive(Number(option.dataset.index));
        }

        commit(item) {
            if (!this.editor || !this.token) return;
            const replacement = `${canonicalTag(item.tag)} `;

            if (this.editor instanceof HTMLTextAreaElement) {
                const before = this.editor.value.slice(0, this.token.start);
                const after = this.editor.value.slice(this.token.end);
                const caret = before.length + replacement.length;
                this.editor.value = `${before}${replacement}${after}`;
                this.editor.focus();
                this.editor.setSelectionRange(caret, caret);
                this.editor.dispatchEvent(new InputEvent("input", {
                    bubbles: true,
                    inputType: "insertText",
                    data: replacement
                }));
            } else {
                this.insertIntoContenteditable(replacement);
            }

            this.close();
            this.app.lastEditorContent = null;
            this.app.refreshSuggestions(true);
        }

        insertIntoContenteditable(replacement) {
            const editor = this.editor;
            const range = this.token.range?.cloneRange();
            if (!range) return;

            editor.focus();
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);

            let inserted = false;
            try {
                inserted = document.execCommand("insertText", false, replacement);
            } catch {
                inserted = false;
            }

            if (inserted) return;

            range.deleteContents();
            const text = document.createTextNode(replacement);
            range.insertNode(text);
            range.setStartAfter(text);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            editor.dispatchEvent(new InputEvent("input", {
                bubbles: true,
                inputType: "insertText",
                data: replacement
            }));
        }

        close() {
            if (this.editor) {
                this.editor.setAttribute("aria-expanded", "false");
                this.editor.removeAttribute("aria-controls");
                this.editor.removeAttribute("aria-activedescendant");
            }
            if (this.root) this.root.hidden = true;
            this.editor = null;
            this.token = null;
            this.results = [];
            this.activeIndex = 0;
        }

        reposition() {
            if (this.root && !this.root.hidden && this.editor) this.position();
        }

        position() {
            if (!this.root || !this.editor) return;
            const caret = this.caretRect(this.editor);
            const viewportPadding = 8;
            const width = Math.min(320, Math.max(220, window.innerWidth - viewportPadding * 2));
            const background = this.findBackground(this.editor);
            const editorStyle = getComputedStyle(this.editor);

            this.root.style.width = `${width}px`;
            this.root.style.backgroundColor = background;
            this.root.style.color = editorStyle.color;

            const height = this.root.offsetHeight;
            const left = Math.max(
                viewportPadding,
                Math.min(caret.left, window.innerWidth - width - viewportPadding)
            );
            let top = caret.bottom + 6;
            if (top + height > window.innerHeight - viewportPadding) {
                top = Math.max(viewportPadding, caret.top - height - 6);
            }

            this.root.style.left = `${Math.round(left)}px`;
            this.root.style.top = `${Math.round(top)}px`;
        }

        caretRect(editor) {
            if (editor instanceof HTMLTextAreaElement) return this.textareaCaretRect(editor);

            const selection = window.getSelection();
            if (selection?.rangeCount && editor.contains(selection.anchorNode)) {
                const range = selection.getRangeAt(0).cloneRange();
                const rects = range.getClientRects();
                const rect = rects.length ? rects[rects.length - 1] : range.getBoundingClientRect();
                if (rect.width || rect.height) {
                    return {
                        left: rect.left,
                        top: rect.top,
                        right: rect.right,
                        bottom: rect.bottom
                    };
                }
            }

            const fallback = editor.getBoundingClientRect();
            return {
                left: fallback.left + 10,
                top: fallback.top + 10,
                right: fallback.left + 10,
                bottom: fallback.top + 30
            };
        }

        textareaCaretRect(editor) {
            const mirror = document.createElement("div");
            const marker = document.createElement("span");
            const style = getComputedStyle(editor);
            const properties = [
                "fontFamily", "fontSize", "fontStyle", "fontWeight", "letterSpacing", "lineHeight",
                "textTransform", "wordSpacing", "tabSize", "paddingTop", "paddingRight",
                "paddingBottom", "paddingLeft", "borderTopWidth", "borderRightWidth",
                "borderBottomWidth", "borderLeftWidth"
            ];

            mirror.style.position = "absolute";
            mirror.style.top = "0";
            mirror.style.left = "0";
            mirror.style.visibility = "hidden";
            mirror.style.whiteSpace = "pre-wrap";
            mirror.style.overflowWrap = "break-word";
            mirror.style.boxSizing = style.boxSizing;
            mirror.style.width = `${editor.offsetWidth}px`;
            properties.forEach((property) => {
                mirror.style[property] = style[property];
            });
            mirror.textContent = editor.value.slice(0, editor.selectionStart);
            marker.textContent = ".";
            mirror.appendChild(marker);
            document.body.appendChild(mirror);

            const editorRect = editor.getBoundingClientRect();
            const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2;
            const left = editorRect.left + marker.offsetLeft - editor.scrollLeft;
            const top = editorRect.top + marker.offsetTop - editor.scrollTop;
            mirror.remove();
            return { left, top, right: left + 1, bottom: top + lineHeight };
        }

        findBackground(element) {
            let current = element;
            while (current instanceof Element) {
                const color = getComputedStyle(current).backgroundColor;
                const match = color.match(/rgba?\(([^)]+)\)/);
                if (match) {
                    const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
                    if (parts.length < 4 || parts[3] > 0) return color;
                }
                current = current.parentElement;
            }
            return "Canvas";
        }
    }

    class HashtagApp {
        constructor(commons) {
            this.commons = commons;
            this.index = new LocalHashtagIndex(commons);
            this.preferences = new LocalHashtagPreferences(commons);
            this.autocomplete = new CompactHashtagAutocomplete(this);
            this.modal = null;
            this.editorRow = null;
            this.suggestionBar = null;
            this.editorTimer = null;
            this.lastEditorContent = null;
            this.replyForm = null;
            this.selectedSuggestions = new Map();
            this.currentSuggestions = [];
            this.hiddenSelectedSuggestions = [];
            this.hiddenContextSuggestions = [];
            this.tokenAutocompleteResults = [];
            this.tokenAutocompleteIndex = 0;
            this.suggestionResizeObserver = null;
            this.suggestionBarControlsBound = false;
            this.suggestionMenu = null;
            this.suggestionMenuTrigger = null;
            this.longPressTimer = null;
            this.longPressStart = null;
            this.suppressNextSuggestionClick = false;
            this.refreshSuggestionsDebounced = debounce(
                () => this.refreshSuggestions(),
                scriptInfo.settings.suggestionDebounce
            );
            this.handleDocumentClick = this.handleDocumentClick.bind(this);
            this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
            this.handleDocumentChange = this.handleDocumentChange.bind(this);
            this.handleDocumentContextMenu = this.handleDocumentContextMenu.bind(this);
            this.handlePointerDown = this.handlePointerDown.bind(this);
            this.handlePointerMove = this.handlePointerMove.bind(this);
            this.handlePointerEnd = this.handlePointerEnd.bind(this);
            this.handleReplySubmit = this.handleReplySubmit.bind(this);
            this.handleWindowViewportChange = () => {
                this.cancelLongPress();
                this.closeSuggestionMenu();
                this.closeColorHint();
                this.closeSuggestionOverflow();
                this.autocomplete.reposition();
                this.layoutSuggestionRow();
            };
        }

        async init() {
            this.addStyles();
            this.handleHashRedirect();
            this.index.indexCurrentPage();
            this.applyPostEntities();
            this.modal = new CommonsModalAdapter(this.commons);
            document.addEventListener("click", this.handleDocumentClick);
            document.addEventListener("keydown", this.handleDocumentKeydown);
            document.addEventListener("change", this.handleDocumentChange);
            document.addEventListener("contextmenu", this.handleDocumentContextMenu);
            document.addEventListener("pointerdown", this.handlePointerDown);
            document.addEventListener("pointermove", this.handlePointerMove);
            document.addEventListener("pointerup", this.handlePointerEnd);
            document.addEventListener("pointercancel", this.handlePointerEnd);
            window.addEventListener("resize", this.handleWindowViewportChange);
            window.addEventListener("scroll", this.handleWindowViewportChange, true);

            const hasEditorApi = Boolean(this.commons.utilities?.replierForm?.textarea);
            if (hasEditorApi && (this.commons.location?.isTopic || this.commons.location?.isFullEditor)) {
                this.mountSuggestionsWithRetry();
            }

            window.addEventListener("pagehide", () => this.destroy(), { once: true });
        }

        destroy() {
            clearInterval(this.editorTimer);
            clearTimeout(this.longPressTimer);
            document.removeEventListener("click", this.handleDocumentClick);
            document.removeEventListener("keydown", this.handleDocumentKeydown);
            document.removeEventListener("change", this.handleDocumentChange);
            document.removeEventListener("contextmenu", this.handleDocumentContextMenu);
            document.removeEventListener("pointerdown", this.handlePointerDown);
            document.removeEventListener("pointermove", this.handlePointerMove);
            document.removeEventListener("pointerup", this.handlePointerEnd);
            document.removeEventListener("pointercancel", this.handlePointerEnd);
            window.removeEventListener("resize", this.handleWindowViewportChange);
            window.removeEventListener("scroll", this.handleWindowViewportChange, true);
            this.replyForm?.removeEventListener("submit", this.handleReplySubmit, true);
            this.suggestionResizeObserver?.disconnect();
            this.suggestionMenu?.remove();
            this.autocomplete.destroy();
        }

        isSectionAllowed(sectionId) {
            const { blacklistSections, whitelistSections } = scriptInfo.settings;
            if (blacklistSections.length && blacklistSections.includes(Number(sectionId))) return false;
            if (whitelistSections.length && !whitelistSections.includes(Number(sectionId))) return false;
            return true;
        }

        mountSuggestionsWithRetry(attempt = 0) {
            if (this.mountSuggestions()) return;
            if (attempt >= 40) {
                console.warn("[HashTags Local] Editor non trovato");
                return;
            }

            setTimeout(() => this.mountSuggestionsWithRetry(attempt + 1), 150);
        }

        mountSuggestions() {
            if (!this.isSectionAllowed(this.commons.location?.section?.id || 0)) return true;

            const textarea = document.querySelector("textarea#Post");
            const existing = document.getElementById(BAR_ID);
            if (existing) {
                if (!existing.querySelector(".ht-token-input")) {
                    existing.remove();
                    return this.mountSuggestions();
                }
                this.suggestionBar = existing;
                this.bindReplySubmit(textarea);
                this.bindSuggestionBarControls();
                return true;
            }

            const editorRow = textarea?.closest("li.st-editor-container");
            const editorArea = editorRow?.closest("ul.st-editor-area");

            if (!textarea || !editorRow || !editorArea) return false;

            const row = document.createElement("li");
            row.id = BAR_ID;
            row.className = "Item ht-suggestions-row";
            row.hidden = true;
            row.innerHTML = `
                <div class="ht-suggestions-panel">
                    <div class="ht-suggestions-line">
                        <div class="ht-suggestion-group ht-selected-group">
                            <strong class="ht-suggestions-label"><span class="ht-label-full">Scelti:</span><span class="ht-label-short">Scelti:</span></strong>
                            <div class="ht-selected-list" role="group" aria-label="Hashtag da aggiungere"></div>
                            <button type="button" class="ht-overflow-button ht-selected-overflow" hidden aria-label="Mostra hashtag selezionati nascosti" aria-expanded="false" aria-controls="ht-suggestion-overflow"></button>
                            <label class="ht-token-entry">
                                <span class="ht-sr-only">Aggiungi hashtag</span>
                                <input type="text" class="ht-token-input" placeholder="+ Aggiungi hashtag" autocomplete="off" spellcheck="false" aria-autocomplete="list" aria-expanded="false">
                            </label>
                        </div>
                        <span class="ht-group-divider" aria-hidden="true"></span>
                        <div class="ht-suggestion-group ht-context-group">
                            <strong class="ht-suggestions-label"><span class="ht-label-full">Suggeriti:</span><span class="ht-label-short">Sug.:</span></strong>
                            <div class="ht-suggestions-list" role="group" aria-label="Hashtag suggeriti" aria-live="polite"></div>
                            <button type="button" class="ht-overflow-button ht-suggested-overflow" hidden aria-label="Mostra hashtag suggeriti nascosti" aria-expanded="false" aria-controls="ht-suggestion-overflow"></button>
                        </div>
                        <button type="button" class="ht-color-hint-toggle" aria-label="Spiega i colori dei pallini" aria-expanded="false" aria-controls="ht-color-hint" title="Significato dei colori">
                            <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false">
                                <circle cx="12" cy="12" r="9"></circle>
                                <path d="M12 11v6"></path>
                                <path d="M12 7h.01"></path>
                            </svg>
                        </button>
                    </div>
                    <div id="ht-token-autocomplete" class="ht-token-autocomplete" role="listbox" aria-label="Completa hashtag" hidden>
                        <div class="ht-token-autocomplete-list"></div>
                        <span class="ht-token-autocomplete-message"></span>
                    </div>
                    <div id="ht-color-hint" class="ht-color-hint" role="dialog" aria-label="Significato dei colori dei pallini" hidden>
                        <strong>Origine del suggerimento</strong>
                        <div class="ht-color-hint-grid">
                            <span><i class="ht-source-dot ht-source-text" aria-hidden="true"></i>Testo del post</span>
                            <span><i class="ht-source-dot ht-source-link" aria-hidden="true"></i>Link inseriti</span>
                            <span><i class="ht-source-dot ht-source-topic" aria-hidden="true"></i>Topic corrente</span>
                            <span><i class="ht-source-dot ht-source-section" aria-hidden="true"></i>Sezione corrente</span>
                            <span><i class="ht-source-dot ht-source-manual" aria-hidden="true"></i>Aggiunto manualmente</span>
                        </div>
                    </div>
                    <div id="ht-suggestion-overflow" class="ht-suggestion-overflow-panel" role="dialog" aria-label="Hashtag nascosti" hidden>
                        <div class="ht-overflow-panel-head">
                            <strong class="ht-overflow-panel-title"></strong>
                            <button type="button" class="ht-overflow-close" aria-label="Chiudi">×</button>
                        </div>
                        <div class="ht-overflow-items"></div>
                    </div>
                    <span class="ht-suggestions-status ht-sr-only" aria-live="polite"></span>
                </div>
            `;

            const bottomAddons = editorArea.querySelector(":scope > li.bottom-addons");
            if (bottomAddons) editorArea.insertBefore(row, bottomAddons);
            else editorRow.after(row);

            this.editorRow = editorRow;
            this.suggestionBar = row;
            this.bindReplySubmit(textarea);
            this.bindSuggestionBarControls();
            editorRow.addEventListener("input", this.refreshSuggestionsDebounced, true);
            editorRow.addEventListener("keyup", this.refreshSuggestionsDebounced, true);

            this.editorTimer = setInterval(
                () => this.refreshSuggestions(),
                scriptInfo.settings.editorPollInterval
            );

            this.refreshSuggestions(true);
            return true;
        }

        bindSuggestionBarControls() {
            if (!this.suggestionBar || this.suggestionBarControlsBound) return;

            const input = this.suggestionBar.querySelector(".ht-token-input");
            if (!input) return;

            input.addEventListener("input", () => this.renderTokenAutocomplete());
            input.addEventListener("paste", (event) => this.handleTokenPaste(event));
            input.addEventListener("keydown", (event) => this.handleTokenKeydown(event));
            input.addEventListener("blur", () => {
                setTimeout(() => {
                    if (!this.suggestionBar?.contains(document.activeElement)) {
                        this.closeTokenAutocomplete();
                    }
                }, 80);
            });

            const line = this.suggestionBar.querySelector(".ht-suggestions-line");
            if (line && typeof ResizeObserver === "function") {
                this.suggestionResizeObserver = new ResizeObserver(() => this.layoutSuggestionRow());
                this.suggestionResizeObserver.observe(line);
            }

            this.suggestionBarControlsBound = true;
        }

        getTokenInput() {
            return this.suggestionBar?.querySelector(".ht-token-input") || null;
        }

        isValidHashtag(tag) {
            return /^#(?!\d+\b)[\p{L}][\p{L}\p{N}_+-]*$/u.test(tag);
        }

        addSelectedHashtag(value, item = null, announce = true) {
            const tag = canonicalTag(value);
            const key = tag.toLowerCase();
            if (!tag || !this.isValidHashtag(tag)) {
                if (announce) this.announceSuggestionStatus("Formato hashtag non valido");
                return false;
            }

            const existing = new Set(
                extractHashtags(htmlToText(this.getEditorContent())).map((entry) => entry.toLowerCase())
            );
            if (existing.has(key)) {
                if (announce) this.announceSuggestionStatus(`${tag} è già presente nel post`);
                return false;
            }
            if (this.selectedSuggestions.has(key)) {
                if (announce) this.announceSuggestionStatus(`${tag} è già tra quelli da aggiungere`);
                return false;
            }

            this.selectedSuggestions.set(key, {
                tag,
                source: item?.source || "manual",
                reason: item?.reason || "aggiunto manualmente",
                count: Number(item?.count || 0),
                origin: item ? "suggestion" : "manual"
            });
            if (announce) this.announceSuggestionStatus(`${tag} aggiunto`);
            this.refreshSuggestions(true);
            return true;
        }

        removeSelectedHashtag(value) {
            const tag = canonicalTag(value);
            if (!tag || !this.selectedSuggestions.delete(tag.toLowerCase())) return;
            this.announceSuggestionStatus(`${tag} rimosso`);
            this.refreshSuggestions(true);
        }

        announceSuggestionStatus(message) {
            const status = this.suggestionBar?.querySelector(".ht-suggestions-status");
            if (status) status.textContent = message;
        }

        renderTokenAutocomplete() {
            const input = this.getTokenInput();
            const panel = this.suggestionBar?.querySelector(".ht-token-autocomplete");
            const list = panel?.querySelector(".ht-token-autocomplete-list");
            const message = panel?.querySelector(".ht-token-autocomplete-message");
            if (!input || !panel || !list || !message) return;

            const query = input.value.trim();
            const queryLength = query.replace(/^#/, "").length;
            list.replaceChildren();
            message.textContent = "";
            this.tokenAutocompleteResults = [];
            this.tokenAutocompleteIndex = 0;

            if (queryLength < scriptInfo.settings.autocompleteMinLength) {
                this.closeTokenAutocomplete();
                return;
            }

            this.tokenAutocompleteResults = this.index
                .listHashtags(query)
                .filter((item) => !this.selectedSuggestions.has(item.tag.toLowerCase()))
                .slice(0, scriptInfo.settings.autocompleteMaxResults);

            if (!this.tokenAutocompleteResults.length) {
                message.textContent = "Premi Invio o virgola per aggiungere un nuovo hashtag";
            } else {
                this.tokenAutocompleteResults.forEach((item, index) => {
                    const button = document.createElement("button");
                    const tag = document.createElement("span");
                    const count = document.createElement("span");
                    button.type = "button";
                    button.className = "ht-token-option";
                    button.dataset.index = String(index);
                    button.setAttribute("role", "option");
                    button.setAttribute("aria-selected", String(index === 0));
                    tag.textContent = item.tag;
                    count.textContent = `${item.count} ${item.count === 1 ? "uso" : "usi"}`;
                    button.append(tag, count);
                    list.appendChild(button);
                });
            }

            panel.hidden = false;
            input.setAttribute("aria-controls", panel.id);
            input.setAttribute("aria-expanded", "true");
            this.positionSuggestionPopover(panel, input);
        }

        setTokenAutocompleteIndex(index) {
            if (!this.tokenAutocompleteResults.length) return;
            this.tokenAutocompleteIndex = (
                index + this.tokenAutocompleteResults.length
            ) % this.tokenAutocompleteResults.length;
            this.suggestionBar
                ?.querySelectorAll(".ht-token-option")
                .forEach((button, itemIndex) => {
                    button.setAttribute(
                        "aria-selected",
                        String(itemIndex === this.tokenAutocompleteIndex)
                    );
                });
        }

        closeTokenAutocomplete(clearInput = false) {
            const input = this.getTokenInput();
            const panel = this.suggestionBar?.querySelector(".ht-token-autocomplete");
            if (panel) panel.hidden = true;
            if (input) {
                input.setAttribute("aria-expanded", "false");
                input.removeAttribute("aria-controls");
                if (clearInput) input.value = "";
            }
            this.tokenAutocompleteResults = [];
            this.tokenAutocompleteIndex = 0;
        }

        commitTokenInput(preferActive = true) {
            const input = this.getTokenInput();
            if (!input) return;

            const raw = input.value.trim();
            if (!raw) return;
            const active = preferActive
                ? this.tokenAutocompleteResults[this.tokenAutocompleteIndex]
                : null;
            const value = active?.tag || raw;
            if (this.addSelectedHashtag(value)) {
                input.value = "";
                this.closeTokenAutocomplete();
                input.focus();
            }
        }

        handleTokenPaste(event) {
            const text = event.clipboardData?.getData("text") || "";
            if (!/[,;\n]/.test(text)) return;

            event.preventDefault();
            const tokens = text
                .split(/[,;\n]+/)
                .map((token) => token.trim())
                .filter(Boolean);
            let added = 0;
            tokens.forEach((token) => {
                if (this.addSelectedHashtag(token, null, false)) added += 1;
            });

            const input = this.getTokenInput();
            if (input) input.value = "";
            this.closeTokenAutocomplete();
            this.announceSuggestionStatus(
                `${added} ${added === 1 ? "hashtag aggiunto" : "hashtag aggiunti"}`
            );
        }

        handleTokenKeydown(event) {
            if (event.key === "ArrowDown" && this.tokenAutocompleteResults.length) {
                event.preventDefault();
                this.setTokenAutocompleteIndex(this.tokenAutocompleteIndex + 1);
                return;
            }
            if (event.key === "ArrowUp" && this.tokenAutocompleteResults.length) {
                event.preventDefault();
                this.setTokenAutocompleteIndex(this.tokenAutocompleteIndex - 1);
                return;
            }
            if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                this.commitTokenInput(true);
                return;
            }
            if (event.key === "Escape") {
                event.preventDefault();
                this.closeTokenAutocomplete(true);
            }
        }

        bindReplySubmit(textarea) {
            const form = textarea?.closest("form")
                || document.forms?.REPLIER
                || document.querySelector("form[name='REPLIER']");
            if (!form || form === this.replyForm) return;

            this.replyForm?.removeEventListener("submit", this.handleReplySubmit, true);
            this.replyForm = form;
            this.replyForm.addEventListener("submit", this.handleReplySubmit, true);
        }

        getEditorContent() {
            try {
                return String(this.commons.utilities.replierForm.textarea.getContent() || "");
            } catch {
                return String(document.querySelector("textarea#Post")?.value || "");
            }
        }

        buildSuggestions(content) {
            const plainText = htmlToText(content);
            const normalizedText = normalizeForSearch(plainText);
            const messageTokens = new Set(tokenize(plainText));
            const insertedTags = new Set(extractHashtags(plainText).map((tag) => tag.toLowerCase()));
            const links = extractLinks(content);
            const domains = new Set(getDomains(links));
            const topicId = Number(this.commons.location?.topic?.id || 0);
            const sectionId = Number(this.commons.location?.section?.id || 0);
            const dismissedTags = new Set(
                this.preferences.getDismissed(sectionId).map((tag) => tag.toLowerCase())
            );
            const topicStats = this.index.getHashtagStats({ topicId });
            const sectionStats = this.index.getHashtagStats({ sectionId });
            const globalStats = this.index.getHashtagStats();
            const scores = new Map();

            const add = (tag, points, source, reason) => {
                const canonical = canonicalTag(tag);
                const key = canonical.toLowerCase();
                if (!canonical || insertedTags.has(key) || dismissedTags.has(key)) return;

                const item = scores.get(key) || {
                    tag: canonical,
                    score: 0,
                    sources: new Map(),
                    count: globalStats.get(key)?.count || 0
                };

                item.score += points;
                const currentSource = item.sources.get(source) || { points: 0, reason };
                currentSource.points += points;
                currentSource.reason = reason;
                item.sources.set(source, currentSource);
                scores.set(key, item);
            };

            this.index.getKnownTags().forEach((tag) => {
                const tokens = hashtagTokens(tag);
                if (tokens.length && tokens.every((token) => messageTokens.has(token))) {
                    add(tag, 8, "text", "corrisponde al testo");
                } else if (tokens.some((token) => messageTokens.has(token))) {
                    add(tag, 3, "text", "termine collegato nel testo");
                }
            });

            SEED_RULES.forEach((rule) => {
                if (rule.terms.some((term) => normalizedText.includes(normalizeForSearch(term)))) {
                    add(rule.tag, 7, "text", "tema rilevato nel testo");
                }

                if (rule.domains?.some((domain) => [...domains].some((value) => value === domain || value.endsWith(`.${domain}`)))) {
                    add(rule.tag, 10, "link", `rilevato dal link ${rule.domains[0]}`);
                }
            });

            const corpusScores = new Map();
            this.index.getPosts().forEach((post) => {
                const postTokens = new Set(tokenize(`${post.topicTitle} ${post.excerpt}`));
                const overlap = [...messageTokens].filter((token) => postTokens.has(token)).length;
                if (!overlap) return;

                post.hashtags.forEach((tag) => {
                    const key = tag.toLowerCase();
                    corpusScores.set(key, Math.max(corpusScores.get(key) || 0, Math.min(5, overlap)));
                });

                const postDomains = getDomains(post.links || []);
                if (postDomains.some((domain) => domains.has(domain))) {
                    post.hashtags.forEach((tag) => add(tag, 6, "link", "usato con lo stesso dominio"));
                }
            });

            corpusScores.forEach((points, key) => {
                const tag = globalStats.get(key)?.tag;
                if (tag) add(tag, points, "text", "correlato a contenuti già indicizzati");
            });

            topicStats.forEach((item) => {
                add(item.tag, 4 + Math.min(5, item.count), "topic", `${item.count} usi nel topic`);
            });

            sectionStats.forEach((item) => {
                add(item.tag, 2 + Math.min(3, item.count / 2), "section", `${item.count} usi nella sezione`);
            });

            return [...scores.values()]
                .map((item) => {
                    const primary = [...item.sources.entries()]
                        .sort((left, right) => right[1].points - left[1].points)[0];
                    return {
                        tag: item.tag,
                        score: item.score,
                        count: item.count,
                        source: primary?.[0] || "text",
                        reason: primary?.[1].reason || "suggerito dal contesto"
                    };
                })
                .filter((item) => item.score >= 3)
                .sort((left, right) => right.score - left.score || right.count - left.count || left.tag.localeCompare(right.tag))
                .slice(0, scriptInfo.settings.maxSuggestions);
        }

        refreshSuggestions(force = false) {
            if (!this.suggestionBar) return;

            const content = this.getEditorContent();
            if (!force && content === this.lastEditorContent) return;
            this.lastEditorContent = content;

            const insertedTags = new Set(
                extractHashtags(htmlToText(content)).map((tag) => tag.toLowerCase())
            );
            insertedTags.forEach((key) => this.selectedSuggestions.delete(key));

            const sectionId = Number(this.commons.location?.section?.id || 0);
            const dismissedTags = new Set(
                this.preferences.getDismissed(sectionId).map((tag) => tag.toLowerCase())
            );
            dismissedTags.forEach((key) => this.selectedSuggestions.delete(key));

            const currentSuggestions = this.buildSuggestions(content);
            this.currentSuggestions = currentSuggestions.filter(
                (item) => !this.selectedSuggestions.has(item.tag.toLowerCase())
            );
            const selectedList = this.suggestionBar.querySelector(".ht-selected-list");
            const suggestedList = this.suggestionBar.querySelector(".ht-suggestions-list");
            const status = this.suggestionBar.querySelector(".ht-suggestions-status");
            selectedList.replaceChildren();
            suggestedList.replaceChildren();

            this.selectedSuggestions.forEach((item) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = `ht-selected-chip ht-source-${item.source || "manual"}`;
                button.dataset.hashtag = item.tag;
                button.setAttribute("aria-label", `Rimuovi ${item.tag}`);
                button.title = `${item.reason}. Premi per rimuovere`;

                const tag = document.createElement("span");
                const remove = document.createElement("span");
                tag.className = "ht-suggestion-tag";
                tag.textContent = item.tag;
                remove.className = "ht-selected-remove";
                remove.setAttribute("aria-hidden", "true");
                remove.textContent = "×";
                button.append(tag, remove);
                selectedList.appendChild(button);
            });

            this.currentSuggestions.forEach((item) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = `ht-suggestion ht-source-${item.source}`;
                button.dataset.hashtag = item.tag;
                button.dataset.source = item.source;
                button.dataset.reason = item.reason;
                button.dataset.count = String(item.count || 0);
                button.setAttribute("aria-haspopup", "menu");
                button.setAttribute("aria-expanded", "false");
                button.setAttribute(
                    "aria-label",
                    `${item.tag}: ${item.reason}. Premi per aggiungerlo all'invio.`
                );
                button.title = item.reason;

                const tag = document.createElement("span");
                tag.className = "ht-suggestion-tag";
                tag.textContent = item.tag;

                button.appendChild(tag);
                suggestedList.appendChild(button);
            });

            const selectedCount = this.selectedSuggestions.size;
            status.textContent = selectedCount
                ? `${selectedCount} ${selectedCount === 1 ? "hashtag selezionato" : "hashtag selezionati"}; saranno aggiunti all'invio`
                : this.currentSuggestions.length
                    ? `${this.currentSuggestions.length} suggerimenti disponibili`
                    : "Nessun suggerimento disponibile";
            this.suggestionBar.hidden = false;
            requestAnimationFrame(() => this.layoutSuggestionRow());
        }

        toggleSuggestedHashtag(button) {
            const tag = canonicalTag(button?.dataset.hashtag);
            if (!tag) return;
            this.addSelectedHashtag(tag, {
                source: button.dataset.source || "text",
                reason: button.dataset.reason || "suggerito dal contesto",
                count: Number(button.dataset.count || 0)
            });
        }

        positionSuggestionPopover(popover, trigger) {
            const container = this.suggestionBar?.querySelector(".ht-suggestions-panel");
            if (!container || !popover || !trigger) return;

            const containerRect = container.getBoundingClientRect();
            const triggerRect = trigger.getBoundingClientRect();
            const popoverRect = popover.getBoundingClientRect();
            const width = popoverRect.width;
            const height = popoverRect.height;
            const viewportWidth = document.documentElement.clientWidth;
            const viewportHeight = document.documentElement.clientHeight;
            const padding = 8;
            const gap = 8;
            const spaces = {
                bottom: viewportHeight - triggerRect.bottom - padding,
                top: triggerRect.top - padding,
                right: viewportWidth - triggerRect.right - padding,
                left: triggerRect.left - padding
            };
            const required = {
                bottom: height + gap,
                top: height + gap,
                right: width + gap,
                left: width + gap
            };
            const placements = ["bottom", "top", "right", "left"];
            const placement = placements.find((item) => spaces[item] >= required[item])
                || [...placements].sort(
                    (left, right) => spaces[right] / required[right] - spaces[left] / required[left]
                )[0];

            let viewportLeft;
            let viewportTop;
            if (placement === "bottom" || placement === "top") {
                viewportLeft = triggerRect.left + (triggerRect.width - width) / 2;
                viewportTop = placement === "bottom"
                    ? triggerRect.bottom + gap
                    : triggerRect.top - height - gap;
            } else {
                viewportLeft = placement === "right"
                    ? triggerRect.right + gap
                    : triggerRect.left - width - gap;
                viewportTop = triggerRect.top + (triggerRect.height - height) / 2;
            }

            viewportLeft = Math.max(
                padding,
                Math.min(viewportLeft, viewportWidth - width - padding)
            );
            viewportTop = Math.max(
                padding,
                Math.min(viewportTop, viewportHeight - height - padding)
            );

            const localLeft = viewportLeft - containerRect.left;
            const localTop = viewportTop - containerRect.top;
            const anchorX = Math.max(
                12,
                Math.min(
                    triggerRect.left + triggerRect.width / 2 - viewportLeft,
                    width - 12
                )
            );
            const anchorY = Math.max(
                12,
                Math.min(
                    triggerRect.top + triggerRect.height / 2 - viewportTop,
                    height - 12
                )
            );

            popover.dataset.placement = placement;
            popover.style.left = `${localLeft}px`;
            popover.style.right = "auto";
            popover.style.top = `${localTop}px`;
            popover.style.bottom = "auto";
            popover.style.setProperty("--ht-popover-anchor-x", `${anchorX}px`);
            popover.style.setProperty("--ht-popover-anchor-y", `${anchorY}px`);
        }

        layoutSuggestionRow() {
            const line = this.suggestionBar?.querySelector(".ht-suggestions-line");
            const selectedButtons = [
                ...(this.suggestionBar?.querySelectorAll(".ht-selected-chip") || [])
            ];
            const suggestedButtons = [
                ...(this.suggestionBar?.querySelectorAll(".ht-suggestion") || [])
            ];
            const selectedOverflow = this.suggestionBar?.querySelector(".ht-selected-overflow");
            const suggestedOverflow = this.suggestionBar?.querySelector(".ht-suggested-overflow");
            if (!line || !selectedOverflow || !suggestedOverflow) return;

            selectedButtons.forEach((button) => {
                button.hidden = false;
            });
            suggestedButtons.forEach((button) => {
                button.hidden = false;
            });
            selectedOverflow.hidden = true;
            suggestedOverflow.hidden = true;
            this.hiddenSelectedSuggestions = [];
            this.hiddenContextSuggestions = [];

            const updateOverflow = (button, items) => {
                button.hidden = !items.length;
                button.textContent = items.length ? `+${items.length}` : "";
            };

            let guard = selectedButtons.length + suggestedButtons.length + 4;
            while (line.scrollWidth > line.clientWidth + 1 && guard > 0) {
                const visibleSuggested = suggestedButtons.filter((button) => !button.hidden);
                if (visibleSuggested.length) {
                    const button = visibleSuggested[visibleSuggested.length - 1];
                    button.hidden = true;
                    this.hiddenContextSuggestions.unshift(button.dataset.hashtag);
                    updateOverflow(suggestedOverflow, this.hiddenContextSuggestions);
                } else {
                    const visibleSelected = selectedButtons.filter((button) => !button.hidden);
                    if (!visibleSelected.length) break;
                    const button = visibleSelected[visibleSelected.length - 1];
                    button.hidden = true;
                    this.hiddenSelectedSuggestions.unshift(button.dataset.hashtag);
                    updateOverflow(selectedOverflow, this.hiddenSelectedSuggestions);
                }
                guard -= 1;
            }
        }

        openSuggestionOverflow(type) {
            const panel = this.suggestionBar?.querySelector(".ht-suggestion-overflow-panel");
            const title = panel?.querySelector(".ht-overflow-panel-title");
            const items = panel?.querySelector(".ht-overflow-items");
            if (!panel || !title || !items) return;

            this.closeColorHint();
            this.closeTokenAutocomplete();
            const tags = type === "selected"
                ? this.hiddenSelectedSuggestions
                : this.hiddenContextSuggestions;
            title.textContent = type === "selected"
                ? "Hashtag da aggiungere nascosti"
                : "Suggerimenti nascosti";
            panel.dataset.type = type;
            items.replaceChildren();

            tags.forEach((tag) => {
                const selected = this.selectedSuggestions.get(tag.toLowerCase());
                const suggested = this.currentSuggestions.find(
                    (item) => item.tag.toLowerCase() === tag.toLowerCase()
                );
                const item = selected || suggested;
                const button = document.createElement("button");
                const label = document.createElement("span");
                const action = document.createElement("span");
                button.type = "button";
                button.className = `ht-overflow-item ht-source-${item?.source || "manual"}`;
                button.dataset.hashtag = tag;
                button.dataset.overflowType = type;
                button.dataset.source = item?.source || "manual";
                button.dataset.reason = item?.reason || "";
                button.dataset.count = String(item?.count || 0);
                label.textContent = tag;
                action.textContent = type === "selected" ? "×" : "+";
                action.setAttribute("aria-hidden", "true");
                button.setAttribute(
                    "aria-label",
                    type === "selected" ? `Rimuovi ${tag}` : `Aggiungi ${tag}`
                );
                button.append(label, action);
                items.appendChild(button);
            });

            panel.hidden = false;
            const triggerSelector = type === "selected"
                ? ".ht-selected-overflow"
                : ".ht-suggested-overflow";
            this.suggestionBar
                ?.querySelector(triggerSelector)
                ?.setAttribute("aria-expanded", "true");
            const trigger = this.suggestionBar?.querySelector(triggerSelector);
            this.positionSuggestionPopover(panel, trigger);
            panel.querySelector(".ht-overflow-item, .ht-overflow-close")?.focus();
        }

        closeSuggestionOverflow(restoreFocus = false) {
            const panel = this.suggestionBar?.querySelector(".ht-suggestion-overflow-panel");
            if (!panel || panel.hidden) return;
            const type = panel.dataset.type;
            panel.hidden = true;
            this.suggestionBar
                ?.querySelectorAll(".ht-overflow-button")
                .forEach((button) => button.setAttribute("aria-expanded", "false"));
            if (restoreFocus) {
                const selector = type === "selected"
                    ? ".ht-selected-overflow"
                    : ".ht-suggested-overflow";
                this.suggestionBar?.querySelector(selector)?.focus();
            }
            panel.removeAttribute("data-type");
        }

        toggleColorHint() {
            const hint = this.suggestionBar?.querySelector(".ht-color-hint");
            const trigger = this.suggestionBar?.querySelector(".ht-color-hint-toggle");
            if (!hint || !trigger) return;

            const willOpen = hint.hidden;
            this.closeSuggestionOverflow();
            this.closeTokenAutocomplete();
            hint.hidden = !willOpen;
            trigger.setAttribute("aria-expanded", String(willOpen));
            if (willOpen) this.positionSuggestionPopover(hint, trigger);
        }

        closeColorHint(restoreFocus = false) {
            const hint = this.suggestionBar?.querySelector(".ht-color-hint");
            const trigger = this.suggestionBar?.querySelector(".ht-color-hint-toggle");
            if (!hint || hint.hidden) return;
            hint.hidden = true;
            trigger?.setAttribute("aria-expanded", "false");
            if (restoreFocus) trigger?.focus();
        }

        ensureSuggestionMenu() {
            if (this.suggestionMenu?.isConnected) return this.suggestionMenu;

            const menu = document.createElement("div");
            menu.className = "ht-suggestion-menu";
            menu.hidden = true;
            menu.setAttribute("role", "menu");
            menu.setAttribute("aria-label", "Azioni sul suggerimento");
            menu.innerHTML = `
                <button type="button" class="ht-dismiss-suggestion" role="menuitem">
                    Non suggerire in questa sezione
                </button>
            `;
            document.body.appendChild(menu);
            this.suggestionMenu = menu;
            return menu;
        }

        openSuggestionMenu(button) {
            if (!button || !Number(this.commons.location?.section?.id || 0)) return;

            this.closeSuggestionMenu();
            const menu = this.ensureSuggestionMenu();
            const tag = canonicalTag(button.dataset.hashtag);
            menu.dataset.hashtag = tag;
            menu.hidden = false;
            button.setAttribute("aria-expanded", "true");
            this.suggestionMenuTrigger = button;

            const rect = button.getBoundingClientRect();
            const menuRect = menu.getBoundingClientRect();
            const padding = 8;
            const preferredTop = rect.bottom + 6;
            const top = preferredTop + menuRect.height <= window.innerHeight - padding
                ? preferredTop
                : Math.max(padding, rect.top - menuRect.height - 6);
            const left = Math.max(
                padding,
                Math.min(rect.left, window.innerWidth - menuRect.width - padding)
            );

            menu.style.top = `${top}px`;
            menu.style.left = `${left}px`;
            menu.querySelector(".ht-dismiss-suggestion").focus();
        }

        closeSuggestionMenu(restoreFocus = false) {
            if (!this.suggestionMenu || this.suggestionMenu.hidden) return;

            const trigger = this.suggestionMenuTrigger;
            this.suggestionMenu.hidden = true;
            this.suggestionMenu.removeAttribute("data-hashtag");
            trigger?.setAttribute("aria-expanded", "false");
            this.suggestionMenuTrigger = null;

            if (restoreFocus && trigger?.isConnected) trigger.focus();
        }

        dismissSuggestedHashtag(tag) {
            const sectionId = Number(this.commons.location?.section?.id || 0);
            const canonical = canonicalTag(tag);
            if (!sectionId || !canonical) return;

            this.preferences.dismiss(sectionId, canonical);
            this.selectedSuggestions.delete(canonical.toLowerCase());
            this.closeSuggestionMenu();
            this.refreshSuggestions(true);

            const status = this.suggestionBar?.querySelector(".ht-suggestions-status");
            if (status) status.textContent = `${canonical} non sarà più suggerito in questa sezione`;

            setTimeout(() => {
                const nextSuggestion = this.suggestionBar?.querySelector(".ht-suggestion");
                const fallback = document.querySelector("textarea#Post");
                (nextSuggestion || fallback)?.focus();
            }, 0);
        }

        cancelLongPress() {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
            this.longPressStart = null;
        }

        handleDocumentContextMenu(event) {
            const target = event.target instanceof Element
                ? event.target.closest(".ht-suggestion")
                : null;
            if (!target) return;

            event.preventDefault();
            this.openSuggestionMenu(target);
        }

        handlePointerDown(event) {
            const target = event.target instanceof Element
                ? event.target.closest(".ht-suggestion")
                : null;
            if (!target || event.button !== 0 || event.pointerType === "mouse") return;

            this.cancelLongPress();
            this.longPressStart = {
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY
            };
            this.longPressTimer = setTimeout(() => {
                this.longPressTimer = null;
                this.longPressStart = null;
                this.suppressNextSuggestionClick = true;
                this.openSuggestionMenu(target);
                setTimeout(() => {
                    this.suppressNextSuggestionClick = false;
                }, 1000);
            }, 550);
        }

        handlePointerMove(event) {
            if (!this.longPressStart || event.pointerId !== this.longPressStart.pointerId) return;

            const distance = Math.hypot(
                event.clientX - this.longPressStart.x,
                event.clientY - this.longPressStart.y
            );
            if (distance > 10) this.cancelLongPress();
        }

        handlePointerEnd(event) {
            if (!this.longPressStart || event.pointerId !== this.longPressStart.pointerId) return;
            this.cancelLongPress();
        }

        isPublishSubmit(event) {
            const submitter = event.submitter;
            if (!submitter) return true;

            const name = normalizeForSearch(submitter.getAttribute("name"));
            const value = normalizeForSearch(
                submitter.value || submitter.textContent || submitter.getAttribute("title")
            );
            if (
                name === "full"
                || name.includes("preview")
                || value.includes("full editor")
                || value.includes("preview")
                || value.includes("anteprima")
            ) return false;
            return true;
        }

        moveEditorCaretToEnd() {
            const visualEditor = document.querySelector(
                "#st-visual-editor [contenteditable='true'], .st-editor [contenteditable='true']"
            );
            const visualIsActive = visualEditor
                && visualEditor.getClientRects().length
                && getComputedStyle(visualEditor).display !== "none";

            if (visualIsActive) {
                const range = document.createRange();
                range.selectNodeContents(visualEditor);
                range.collapse(false);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                visualEditor.focus();
                return;
            }

            const textarea = document.querySelector("textarea#Post");
            if (!textarea) return;
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }

        appendSelectedSuggestions() {
            if (!this.selectedSuggestions.size) return;

            const content = this.getEditorContent();
            const existing = new Set(
                extractHashtags(htmlToText(content)).map((tag) => tag.toLowerCase())
            );
            const tags = [...this.selectedSuggestions.values()]
                .map((item) => item.tag)
                .filter((tag) => !existing.has(tag.toLowerCase()));

            this.selectedSuggestions.clear();
            if (!tags.length) {
                this.refreshSuggestions(true);
                return;
            }

            this.moveEditorCaretToEnd();
            const prefix = htmlToText(content) ? "\n" : "";
            this.commons.utilities.replierForm.textarea.addContent(`${prefix}${tags.join(" ")}`);
            this.lastEditorContent = null;
            this.refreshSuggestions(true);
        }

        handleReplySubmit(event) {
            if (!this.isPublishSubmit(event)) return;
            this.appendSelectedSuggestions();
        }

        addAutocomplete() {
            this.autocomplete.start();
        }

        applyPostEntities() {
            if (!this.commons.location?.isTopic) return;

            (this.commons.location.posts || []).forEach((post) => {
                const content = post.nativeElement?.querySelector?.(".color");
                if (!content) return;

                const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
                    acceptNode: (node) => {
                        if (!node.nodeValue?.includes("#")) return NodeFilter.FILTER_REJECT;
                        if (node.parentElement?.closest("a, button, code, pre, script, style, textarea, .ht-entity")) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        return NodeFilter.FILTER_ACCEPT;
                    }
                });

                const nodes = [];
                while (walker.nextNode()) nodes.push(walker.currentNode);

                nodes.forEach((node) => {
                    const text = node.nodeValue;
                    const matches = [...text.matchAll(HASHTAG_IN_TEXT_PATTERN)];
                    if (!matches.length) return;

                    const fragment = document.createDocumentFragment();
                    let cursor = 0;

                    matches.forEach((match) => {
                        const prefix = match[1] || "";
                        const tag = match[2];
                        const canonical = canonicalTag(tag);
                        const start = match.index + prefix.length;

                        fragment.append(document.createTextNode(text.slice(cursor, start)));

                        const button = document.createElement("button");
                        button.type = "button";
                        button.className = "ht-entity";
                        button.dataset.hashtag = canonical;
                        button.textContent = canonical;
                        button.setAttribute("aria-label", `Cerca ${canonical}`);
                        fragment.append(button);

                        cursor = start + tag.length;
                    });

                    fragment.append(document.createTextNode(text.slice(cursor)));
                    node.replaceWith(fragment);
                });
            });
        }

        handleHashRedirect() {
            if (!this.commons.location?.isTopic) return;
            const redirect = this.commons.utilities?.getUrlParameter?.("ht-redirect");
            if (!redirect) return;

            const interval = setInterval(() => {
                const link = this.commons.location.posts?.[0]?.nativeElement
                    ?.querySelector?.(".title2.top .when")?.parentElement?.href;
                if (!link) return;

                clearInterval(interval);
                if (typeof window.stop === "function") window.stop();
                window.location.href = link;
            }, 200);

            setTimeout(() => clearInterval(interval), 4000);
        }

        openSearch(tag = "") {
            this.modal.show();

            this.withModalRoot((root) => {
                this.prepareSearchModal(root);
                const query = root.querySelector(".ht-search-query");
                if (tag) query.value = canonicalTag(tag);
                this.collapseAdvanced(root);

                if (tag || query.value.trim()) this.runSearch(root);
                else this.renderSearchPrompt(root);

                query.focus();
            });
        }

        withModalRoot(callback, attempt = 0) {
            const root = this.modal.nativeElement || document.querySelector(".ht-search-modal");
            if (root?.querySelector(".ht-search-shell")) {
                callback(root);
                return;
            }

            if (attempt < 20) setTimeout(() => this.withModalRoot(callback, attempt + 1), 25);
        }

        prepareSearchModal(root) {
            const sectionSelect = root.querySelector(".ht-search-section");
            const selectedSection = sectionSelect.value;
            sectionSelect.replaceChildren(new Option("Tutte le sezioni", ""));

            this.index.getSections().forEach((section) => {
                sectionSelect.add(new Option(section.title, String(section.id)));
            });

            sectionSelect.value = selectedSection;

            const authors = root.querySelector(".ht-search-authors");
            authors.replaceChildren();
            this.index.getAuthors().forEach((author) => {
                authors.appendChild(new Option(author, author));
            });

            const quick = root.querySelector(".ht-search-quick-tags");
            const quickItems = this.index.listHashtags()
                .filter((item) => item.count > 0)
                .slice(0, 6);
            quick.replaceChildren();
            quickItems.forEach((item) => {
                const button = document.createElement("button");
                const label = document.createElement("span");
                const count = document.createElement("span");
                button.type = "button";
                button.className = "cs-btn cs-btn-sm ht-search-quick-tag";
                button.dataset.hashtag = item.tag;
                label.textContent = item.tag;
                count.className = "ht-search-quick-count";
                count.textContent = String(item.count);
                button.setAttribute(
                    "aria-label",
                    `${item.tag}, ${item.count} ${item.count === 1 ? "uso" : "usi"}`
                );
                button.append(label, count);
                quick.appendChild(button);
            });
            quick.closest(".ht-search-quick").hidden = !quickItems.length;

            this.renderDismissedPreferences(root);
            this.updatePeriodFields(root);
        }

        renderDismissedPreferences(root) {
            const sectionId = Number(this.commons.location?.section?.id || 0);
            const container = root.querySelector(".ht-search-dismissed");
            const list = root.querySelector(".ht-search-dismissed-tags");
            if (!container || !list) return;

            const tags = sectionId ? this.preferences.getDismissed(sectionId) : [];
            list.replaceChildren();
            tags.forEach((tag) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "cs-btn cs-btn-sm ht-search-restore-tag";
                button.dataset.hashtag = tag;
                button.textContent = `Ripristina ${tag}`;
                list.appendChild(button);
            });

            container.hidden = !tags.length;
        }

        updatePeriodFields(root) {
            const period = root.querySelector(".ht-search-period")?.value || "all";
            const customDates = root.querySelector(".ht-search-custom-dates");
            if (customDates) customDates.hidden = period !== "custom";
        }

        collapseAdvanced(root) {
            const advanced = root.querySelector(".ht-search-advanced");
            const toggle = root.querySelector(".ht-search-toggle");
            advanced.hidden = true;
            toggle.setAttribute("aria-expanded", "false");
            toggle.textContent = "Filtri avanzati";
        }

        toggleAdvanced(root) {
            const advanced = root.querySelector(".ht-search-advanced");
            const toggle = root.querySelector(".ht-search-toggle");
            const willOpen = advanced.hidden;
            advanced.hidden = !willOpen;
            toggle.setAttribute("aria-expanded", String(willOpen));
            toggle.textContent = willOpen ? "Nascondi filtri avanzati" : "Filtri avanzati";
        }

        advancedFilterCount(root) {
            return [
                root.querySelector(".ht-search-operator").value !== "all",
                Boolean(root.querySelector(".ht-search-section").value),
                Boolean(root.querySelector(".ht-search-topic").value.trim()),
                Boolean(root.querySelector(".ht-search-excluded").value.trim()),
                Boolean(root.querySelector(".ht-search-author").value.trim()),
                root.querySelector(".ht-search-period").value !== "all",
                Number(root.querySelector(".ht-search-frequency").value) > 0,
                root.querySelector(".ht-search-sort").value !== "date"
            ].filter(Boolean).length;
        }

        resolveSearchDates(period, customFrom, customTo) {
            if (period === "custom") return { from: customFrom, to: customTo };
            if (period === "all") return { from: "", to: "" };

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const from = new Date(today);

            if (period === "7") from.setDate(from.getDate() - 6);
            else if (period === "30") from.setDate(from.getDate() - 29);
            else if (period === "365") from.setFullYear(from.getFullYear() - 1);

            return { from: formatInputDate(from), to: formatInputDate(today) };
        }

        getSearchState(root) {
            const query = root.querySelector(".ht-search-query").value.trim();
            const period = root.querySelector(".ht-search-period").value;
            const dates = this.resolveSearchDates(
                period,
                root.querySelector(".ht-search-from").value,
                root.querySelector(".ht-search-to").value
            );
            return {
                query,
                queryTags: extractHashtags(query).map((tag) => tag.toLowerCase()),
                words: tokenize(query.replace(HASHTAG_PATTERN, " ")),
                excludedTags: parseHashtagList(
                    root.querySelector(".ht-search-excluded").value
                ).map((tag) => tag.toLowerCase()),
                author: normalizeForSearch(root.querySelector(".ht-search-author").value.trim()),
                kind: root.querySelector(".ht-search-kind").value,
                operator: root.querySelector(".ht-search-operator").value,
                sectionId: root.querySelector(".ht-search-section").value,
                topic: normalizeForSearch(root.querySelector(".ht-search-topic").value.trim()),
                period,
                from: dates.from,
                to: dates.to,
                fromTime: dates.from ? new Date(`${dates.from}T00:00:00`).getTime() : 0,
                toTime: dates.to ? new Date(`${dates.to}T23:59:59.999`).getTime() : 0,
                minFrequency: Number(root.querySelector(".ht-search-frequency").value),
                sort: root.querySelector(".ht-search-sort").value
            };
        }

        validateSearchState(root, state) {
            const error = root.querySelector(".ht-search-error");
            const from = root.querySelector(".ht-search-from");
            const to = root.querySelector(".ht-search-to");
            const invalidRange = Boolean(
                state.from
                && state.to
                && state.fromTime > state.toTime
            );

            from.removeAttribute("aria-invalid");
            to.removeAttribute("aria-invalid");
            error.hidden = true;
            error.textContent = "";

            if (!invalidRange) return true;

            from.setAttribute("aria-invalid", "true");
            to.setAttribute("aria-invalid", "true");
            error.textContent = "La data iniziale deve precedere o coincidere con la data finale.";
            error.hidden = false;

            const advanced = root.querySelector(".ht-search-advanced");
            const toggle = root.querySelector(".ht-search-toggle");
            advanced.hidden = false;
            toggle.setAttribute("aria-expanded", "true");
            toggle.textContent = "Nascondi filtri avanzati";
            from.focus();
            return false;
        }

        topicFrequencies(posts) {
            const frequencies = new Map();

            posts.forEach((post) => {
                const topicKey = String(post.topicId);
                if (!frequencies.has(topicKey)) frequencies.set(topicKey, new Map());
                const topic = frequencies.get(topicKey);
                post.hashtags.forEach((tag) => topic.set(tag.toLowerCase(), (topic.get(tag.toLowerCase()) || 0) + 1));
            });

            return frequencies;
        }

        frequencyFor(topicMap, queryTags) {
            if (!topicMap) return 0;
            if (queryTags.length) return queryTags.reduce((total, tag) => total + (topicMap.get(tag) || 0), 0);
            return Math.max(0, ...topicMap.values());
        }

        basePostFilter(post, state) {
            const postTime = new Date(post.date).getTime();
            const haystack = normalizeForSearch(`${post.topicTitle} ${post.excerpt} ${post.authorName} ${post.sectionTitle}`);
            const author = normalizeForSearch(post.authorName);

            return (!state.sectionId || String(post.sectionId) === state.sectionId)
                && (!state.topic || normalizeForSearch(post.topicTitle).includes(state.topic))
                && (!state.author || author.includes(state.author))
                && (!state.fromTime || postTime >= state.fromTime)
                && (!state.toTime || postTime <= state.toTime)
                && state.words.every((word) => haystack.includes(word));
        }

        matchesPositiveTags(tags, state) {
            if (!state.queryTags.length) return true;
            const available = new Set(uniqueTags(tags).map((tag) => tag.toLowerCase()));
            return state.operator === "all"
                ? state.queryTags.every((tag) => available.has(tag))
                : state.queryTags.some((tag) => available.has(tag));
        }

        matchesTags(tags, state) {
            const available = new Set(uniqueTags(tags).map((tag) => tag.toLowerCase()));
            if (state.excludedTags.some((tag) => available.has(tag))) return false;
            return this.matchesPositiveTags(tags, state);
        }

        searchPosts(state) {
            const allPosts = this.index.getPosts();
            const frequencies = this.topicFrequencies(allPosts);

            return allPosts
                .filter((post) => this.basePostFilter(post, state))
                .filter((post) => this.matchesTags(post.hashtags, state))
                .map((post) => ({
                    ...post,
                    frequency: this.frequencyFor(frequencies.get(String(post.topicId)), state.queryTags)
                }))
                .filter((post) => post.frequency >= state.minFrequency)
                .sort((left, right) => state.sort === "frequency"
                    ? right.frequency - left.frequency || right.date.localeCompare(left.date)
                    : right.date.localeCompare(left.date));
        }

        searchTopics(state) {
            const grouped = new Map();

            this.index.getPosts()
                .filter((post) => this.basePostFilter(post, state))
                .forEach((post) => {
                    const key = String(post.topicId);
                    const topic = grouped.get(key) || {
                        topicId: post.topicId,
                        topicTitle: post.topicTitle,
                        sectionId: post.sectionId,
                        sectionTitle: post.sectionTitle,
                        date: post.date,
                        hashtags: [],
                        posts: [],
                        url: new URL(`/?t=${post.topicId}`, window.location.origin).href
                    };

                    topic.posts.push(post);
                    topic.hashtags.push(...post.hashtags);
                    if (post.date > topic.date) topic.date = post.date;
                    grouped.set(key, topic);
                });

            return [...grouped.values()]
                .map((topic) => {
                    topic.hashtags = uniqueTags(topic.hashtags);
                    const counts = new Map();
                    topic.posts.forEach((post) => post.hashtags.forEach((tag) => {
                        counts.set(tag.toLowerCase(), (counts.get(tag.toLowerCase()) || 0) + 1);
                    }));
                    topic.frequency = this.frequencyFor(counts, state.queryTags);
                    return topic;
                })
                .filter((topic) => this.matchesTags(topic.hashtags, state))
                .filter((topic) => topic.frequency >= state.minFrequency)
                .sort((left, right) => state.sort === "frequency"
                    ? right.frequency - left.frequency || right.date.localeCompare(left.date)
                    : right.date.localeCompare(left.date));
        }

        buildSearchDiscovery(matches, kind, state) {
            const matchedPostsById = new Map();
            const matchedItems = kind === "topic"
                ? matches.flatMap((topic) => topic.posts)
                : matches;

            matchedItems.forEach((post) => {
                matchedPostsById.set(`${post.topicId}:${post.postId}`, post);
            });
            const matchedPosts = [...matchedPostsById.values()];
            const topicIds = new Set(matchedPosts.map((post) => String(post.topicId)));
            const contextPosts = this.index.getPosts()
                .filter((post) => topicIds.has(String(post.topicId)))
                .filter((post) => this.basePostFilter(post, state))
                .filter((post) => {
                    const tags = new Set(post.hashtags.map((tag) => tag.toLowerCase()));
                    return !state.excludedTags.some((tag) => tags.has(tag));
                });

            const preferenceSectionId = Number(
                state.sectionId || this.commons.location?.section?.id || 0
            );
            const blocked = new Set([
                ...state.queryTags,
                ...state.excludedTags,
                ...this.preferences.getDismissed(preferenceSectionId)
                    .map((tag) => tag.toLowerCase())
            ]);
            const scores = new Map();
            const globalStats = this.index.getHashtagStats();

            const addRelated = (tag, points, signal) => {
                const canonical = canonicalTag(tag);
                const key = canonical.toLowerCase();
                if (!canonical || blocked.has(key)) return;

                const current = scores.get(key) || {
                    tag: canonical,
                    score: 0,
                    postSignals: 0,
                    topicSignals: 0,
                    count: globalStats.get(key)?.count || 0
                };
                current.score += points;
                current[signal] += 1;
                scores.set(key, current);
            };

            matchedPosts.forEach((post) => {
                if (
                    state.queryTags.length
                    && !state.queryTags.some((tag) =>
                        post.hashtags.some((item) => item.toLowerCase() === tag))
                ) return;

                uniqueTags(post.hashtags).forEach((tag) => addRelated(tag, 3, "postSignals"));
            });

            const contextByTopic = new Map();
            contextPosts.forEach((post) => {
                const key = String(post.topicId);
                if (!contextByTopic.has(key)) contextByTopic.set(key, []);
                contextByTopic.get(key).push(post);
            });
            contextByTopic.forEach((posts) => {
                const tags = uniqueTags(posts.flatMap((post) => post.hashtags));
                tags.forEach((tag) => addRelated(tag, 1, "topicSignals"));
            });

            const related = [...scores.values()]
                .sort((left, right) =>
                    right.score - left.score
                    || right.postSignals - left.postSignals
                    || right.count - left.count
                    || left.tag.localeCompare(right.tag))
                .slice(0, 5);

            const pairCounts = new Map();
            matchedPosts.forEach((post) => {
                const tags = uniqueTags(post.hashtags)
                    .filter((tag) => !state.excludedTags.includes(tag.toLowerCase()))
                    .filter((tag) => !this.preferences.isDismissed(preferenceSectionId, tag))
                    .slice(0, 12)
                    .sort((left, right) => left.localeCompare(right));

                for (let left = 0; left < tags.length; left += 1) {
                    for (let right = left + 1; right < tags.length; right += 1) {
                        const pair = [tags[left], tags[right]];
                        if (
                            state.queryTags.length
                            && pair.every((tag) => state.queryTags.includes(tag.toLowerCase()))
                        ) continue;

                        const key = pair.map((tag) => tag.toLowerCase()).join("|");
                        const current = pairCounts.get(key) || { tags: pair, count: 0 };
                        current.count += 1;
                        pairCounts.set(key, current);
                    }
                }
            });

            const combinations = [...pairCounts.values()]
                .sort((left, right) =>
                    right.count - left.count
                    || left.tags.join(" ").localeCompare(right.tags.join(" ")))
                .slice(0, 3);

            return { related, combinations };
        }

        renderSearchDiscovery(root, matches, kind, state) {
            const container = root.querySelector(".ht-search-discovery");
            const relatedGroup = root.querySelector(".ht-search-related");
            const relatedList = root.querySelector(".ht-search-related-tags");
            const combinationGroup = root.querySelector(".ht-search-combinations");
            const combinationList = root.querySelector(".ht-search-combination-tags");
            const discovery = this.buildSearchDiscovery(matches, kind, state);

            relatedList.replaceChildren();
            discovery.related.forEach((item) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "cs-btn cs-btn-sm ht-search-discovery-tag";
                button.dataset.tags = JSON.stringify([item.tag]);
                button.title = `${item.postSignals} corrispondenze nello stesso post, ${item.topicSignals} nel topic`;
                button.textContent = `${item.tag} · ${item.score}`;
                relatedList.appendChild(button);
            });

            combinationList.replaceChildren();
            discovery.combinations.forEach((item) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "cs-btn cs-btn-sm ht-search-discovery-tag";
                button.dataset.tags = JSON.stringify(item.tags);
                button.title = `${item.count} ${item.count === 1 ? "post" : "post"} con questa combinazione`;
                button.textContent = `${item.tags.join(" + ")} · ${item.count}`;
                combinationList.appendChild(button);
            });

            relatedGroup.hidden = !discovery.related.length;
            combinationGroup.hidden = !discovery.combinations.length;
            container.hidden = !discovery.related.length && !discovery.combinations.length;
        }

        addDiscoveryTagsToQuery(root, tags) {
            const query = root.querySelector(".ht-search-query");
            const words = normalizeSpace(query.value.replace(HASHTAG_PATTERN, " "));
            const currentTags = extractHashtags(query.value);
            const mergedTags = uniqueTags([...currentTags, ...tags]);
            query.value = [words, ...mergedTags].filter(Boolean).join(" ");
            this.runSearch(root);
        }

        runSearch(root) {
            const state = this.getSearchState(root);
            if (!this.validateSearchState(root, state)) return;

            this.collapseAdvanced(root);
            const activeFilters = this.advancedFilterCount(root);
            root.querySelector(".ht-search-advanced-summary").textContent = activeFilters
                ? `${activeFilters} ${activeFilters === 1 ? "filtro avanzato attivo" : "filtri avanzati attivi"}`
                : "Nessun filtro avanzato";

            const matches = state.kind === "topic" ? this.searchTopics(state) : this.searchPosts(state);
            this.renderSearchResults(root, matches, state.kind, state);
        }

        renderSearchPrompt(root) {
            const resultsHead = root.querySelector(".ht-search-results-head");
            const results = root.querySelector(".ht-search-results");
            const prompt = document.createElement("div");
            const mark = document.createElement("span");
            const copy = document.createElement("div");
            const title = document.createElement("strong");
            const description = document.createElement("span");

            resultsHead.hidden = true;
            results.replaceChildren();
            prompt.className = "ht-search-prompt";
            mark.className = "ht-search-prompt-mark";
            mark.setAttribute("aria-hidden", "true");
            mark.textContent = "#";
            title.textContent = "Cerca nell’indice locale";
            description.textContent = "Scrivi un hashtag o una parola, oppure scegli uno degli hashtag più usati.";
            copy.append(title, description);
            prompt.append(mark, copy);
            results.appendChild(prompt);
            root.querySelector(".ht-search-discovery").hidden = true;
        }

        renderSearchResults(root, matches, kind, state) {
            const results = root.querySelector(".ht-search-results");
            const count = root.querySelector(".ht-search-count");
            root.querySelector(".ht-search-results-head").hidden = false;
            results.replaceChildren();
            count.textContent = `${matches.length} ${matches.length === 1 ? "risultato" : "risultati"}`;
            this.renderSearchDiscovery(root, matches, kind, state);

            if (!matches.length) {
                const empty = document.createElement("div");
                const title = document.createElement("strong");
                const description = document.createElement("span");
                empty.className = "ht-search-empty";
                title.textContent = "Nessun risultato";
                description.textContent = "Prova a rimuovere un filtro o a usare un hashtag diverso.";
                empty.append(title, description);
                results.appendChild(empty);
                return;
            }

            matches.slice(0, 100).forEach((item) => {
                const article = document.createElement("article");
                article.className = "ht-search-result";

                const heading = document.createElement("div");
                heading.className = "ht-search-result-head";

                const link = document.createElement("a");
                link.href = item.url;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.textContent = item.topicTitle;

                const date = document.createElement("time");
                date.dateTime = item.date;
                date.textContent = new Date(item.date).toLocaleDateString("it-IT");
                heading.append(link, date);

                const description = document.createElement("p");
                description.textContent = kind === "topic"
                    ? `${item.posts.length} post indicizzati · ${item.sectionTitle}`
                    : item.excerpt;

                const meta = document.createElement("div");
                meta.className = "ht-search-result-meta";
                meta.textContent = kind === "topic"
                    ? `${item.frequency} usi nel topic`
                    : `${item.authorName} · ${item.sectionTitle} · ${item.frequency} usi nel topic`;

                const tags = document.createElement("div");
                tags.className = "ht-search-result-tags";
                item.hashtags.forEach((tag) => {
                    const span = document.createElement("span");
                    span.textContent = tag;
                    tags.appendChild(span);
                });

                article.append(heading, description, meta, tags);
                results.appendChild(article);
            });
        }

        handleDocumentClick(event) {
            const target = event.target instanceof Element ? event.target : null;
            if (!target) return;

            const selectedChip = target.closest(".ht-selected-chip");
            if (selectedChip) {
                this.removeSelectedHashtag(selectedChip.dataset.hashtag);
                return;
            }

            const tokenOption = target.closest(".ht-token-option");
            if (tokenOption) {
                this.tokenAutocompleteIndex = Number(tokenOption.dataset.index || 0);
                this.commitTokenInput(true);
                return;
            }

            const overflowItem = target.closest(".ht-overflow-item");
            if (overflowItem) {
                if (overflowItem.dataset.overflowType === "selected") {
                    this.removeSelectedHashtag(overflowItem.dataset.hashtag);
                } else {
                    this.addSelectedHashtag(overflowItem.dataset.hashtag, {
                        source: overflowItem.dataset.source || "text",
                        reason: overflowItem.dataset.reason || "suggerito dal contesto",
                        count: Number(overflowItem.dataset.count || 0)
                    });
                }
                this.closeSuggestionOverflow();
                return;
            }

            if (target.closest(".ht-overflow-close")) {
                this.closeSuggestionOverflow(true);
                return;
            }

            if (target.closest(".ht-selected-overflow")) {
                this.openSuggestionOverflow("selected");
                return;
            }

            if (target.closest(".ht-suggested-overflow")) {
                this.openSuggestionOverflow("suggested");
                return;
            }

            if (target.closest(".ht-color-hint-toggle")) {
                this.toggleColorHint();
                return;
            }

            if (
                !target.closest(".ht-color-hint")
                && !target.closest(".ht-color-hint-toggle")
            ) this.closeColorHint();

            if (
                !target.closest(".ht-suggestion-overflow-panel")
                && !target.closest(".ht-overflow-button")
            ) this.closeSuggestionOverflow();

            if (
                !target.closest(".ht-token-autocomplete")
                && !target.closest(".ht-token-input")
            ) this.closeTokenAutocomplete();

            const dismissAction = target.closest(".ht-dismiss-suggestion");
            if (dismissAction) {
                this.dismissSuggestedHashtag(this.suggestionMenu?.dataset.hashtag);
                return;
            }

            const suggestion = target.closest(".ht-suggestion");
            if (suggestion && this.suppressNextSuggestionClick) {
                event.preventDefault();
                this.suppressNextSuggestionClick = false;
                return;
            }

            if (
                this.suggestionMenu
                && !this.suggestionMenu.hidden
                && !target.closest(".ht-suggestion-menu")
            ) this.closeSuggestionMenu();

            const entity = target.closest(".ht-entity");
            if (entity) {
                event.preventDefault();
                this.openSearch(entity.dataset.hashtag || entity.textContent);
                return;
            }

            if (suggestion) {
                this.toggleSuggestedHashtag(suggestion);
                return;
            }

            if (target.closest(".ht-open-search")) {
                this.openSearch();
                return;
            }

            const root = target.closest(".ht-search-modal") || this.modal?.nativeElement;
            if (!root?.querySelector?.(".ht-search-shell")) return;

            const restoreTag = target.closest(".ht-search-restore-tag");
            if (restoreTag) {
                const sectionId = Number(this.commons.location?.section?.id || 0);
                this.preferences.restore(sectionId, restoreTag.dataset.hashtag);
                this.renderDismissedPreferences(root);
                this.refreshSuggestions(true);
                return;
            }

            const discoveryTag = target.closest(".ht-search-discovery-tag");
            if (discoveryTag) {
                try {
                    const tags = JSON.parse(discoveryTag.dataset.tags || "[]");
                    this.addDiscoveryTagsToQuery(root, tags);
                } catch {
                    // Il dataset è generato internamente; un valore non valido viene ignorato.
                }
                return;
            }

            const quickTag = target.closest(".ht-search-quick-tag");
            if (quickTag) {
                root.querySelector(".ht-search-query").value = canonicalTag(
                    quickTag.dataset.hashtag || quickTag.textContent
                );
                this.runSearch(root);
                return;
            }

            if (target.closest(".ht-search-toggle")) {
                this.toggleAdvanced(root);
                return;
            }

            if (target.closest(".ht-search-submit")) {
                this.runSearch(root);
                return;
            }

            if (target.closest(".ht-search-close")) {
                this.modal.hide();
            }
        }

        handleDocumentKeydown(event) {
            const target = event.target instanceof Element ? event.target : null;

            const colorHint = this.suggestionBar?.querySelector(".ht-color-hint");
            if (event.key === "Escape" && colorHint && !colorHint.hidden) {
                event.preventDefault();
                this.closeColorHint(true);
                return;
            }

            const overflowPanel = this.suggestionBar?.querySelector(".ht-suggestion-overflow-panel");
            if (event.key === "Escape" && overflowPanel && !overflowPanel.hidden) {
                event.preventDefault();
                this.closeSuggestionOverflow(true);
                return;
            }

            if (event.key === "Escape" && this.suggestionMenu && !this.suggestionMenu.hidden) {
                event.preventDefault();
                this.closeSuggestionMenu(true);
                return;
            }

            const suggestion = target?.closest(".ht-suggestion");
            if (
                suggestion
                && (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10"))
            ) {
                event.preventDefault();
                this.openSuggestionMenu(suggestion);
                return;
            }

            if (event.key !== "Enter" || !target?.matches(".ht-search-query")) return;

            const root = target.closest(".ht-search-modal") || this.modal?.nativeElement;
            if (!root) return;
            event.preventDefault();
            this.runSearch(root);
        }

        handleDocumentChange(event) {
            const target = event.target instanceof Element ? event.target : null;
            if (!target?.matches(".ht-search-period")) return;

            const root = target.closest(".ht-search-modal") || this.modal?.nativeElement;
            if (root) this.updatePeriodFields(root);
        }

        addStyles() {
            if (document.getElementById(CSS_ID)) return;

            const style = document.createElement("style");
            style.id = CSS_ID;
            style.textContent = `
                ul.st-editor-area > li.ht-suggestions-row {
                    display: block !important;
                    box-sizing: border-box !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 6px 2% !important;
                    list-style: none !important;
                    text-align: left !important;
                    background: transparent !important;
                }
                .ht-suggestions-row .ht-suggestions-panel {
                    position: relative !important;
                    display: block !important;
                    box-sizing: border-box !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: 0 !important;
                    background: transparent !important;
                    text-align: left !important;
                }
                .ht-suggestions-row .ht-suggestions-line,
                .ht-suggestions-row .ht-suggestion-group,
                .ht-suggestions-row .ht-selected-list,
                .ht-suggestions-row .ht-suggestions-list {
                    display: flex !important;
                    align-items: center !important;
                    box-sizing: border-box !important;
                    flex-wrap: nowrap !important;
                    min-width: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    gap: 6px !important;
                }
                .ht-suggestions-row .ht-suggestions-line {
                    width: 100% !important;
                    overflow: hidden !important;
                }
                .ht-suggestions-row .ht-suggestion-group,
                .ht-suggestions-row .ht-selected-list,
                .ht-suggestions-row .ht-suggestions-list {
                    flex: 0 0 auto !important;
                }
                .ht-suggestions-row .ht-suggestions-label {
                    display: inline !important;
                    flex: 0 0 auto !important;
                    width: auto !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    font-size: inherit !important;
                    line-height: 1.2 !important;
                    text-align: left !important;
                    white-space: nowrap !important;
                }
                .ht-suggestions-row .ht-label-short {
                    display: none !important;
                }
                .ht-suggestions-row .ht-group-divider {
                    display: block !important;
                    flex: 0 0 1px !important;
                    width: 1px !important;
                    height: 24px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: rgba(127, 127, 127, .28) !important;
                }
                .ht-suggestions-row .ht-token-entry {
                    display: block !important;
                    flex: 0 0 132px !important;
                    width: 132px !important;
                    min-width: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                .ht-suggestions-row .ht-token-input {
                    appearance: none !important;
                    display: block !important;
                    box-sizing: border-box !important;
                    width: 100% !important;
                    height: 30px !important;
                    margin: 0 !important;
                    padding: 5px 8px !important;
                    border: 1px solid rgba(127, 127, 127, .28) !important;
                    border-radius: 999px !important;
                    background: transparent !important;
                    color: inherit !important;
                    font: inherit !important;
                    line-height: 1.2 !important;
                    box-shadow: none !important;
                }
                .ht-suggestions-row .ht-token-input:focus {
                    border-color: rgba(80, 120, 190, .72) !important;
                    outline: 2px solid rgba(80, 120, 190, .24) !important;
                    outline-offset: 1px !important;
                }
                .ht-suggestions-row .ht-color-hint-toggle,
                .ht-suggestions-row .ht-overflow-button,
                .ht-suggestions-row .ht-overflow-close {
                    appearance: none !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    flex: 0 0 auto !important;
                    box-sizing: border-box !important;
                    width: 30px !important;
                    height: 30px !important;
                    margin: 0 !important;
                    padding: 5px !important;
                    border: 0 !important;
                    border-radius: 6px !important;
                    background: transparent !important;
                    color: inherit !important;
                    cursor: pointer !important;
                    box-shadow: none !important;
                    font: inherit !important;
                }
                .ht-suggestions-row .ht-overflow-button {
                    width: auto !important;
                    min-width: 30px !important;
                    padding-inline: 7px !important;
                    border: 1px solid rgba(127, 127, 127, .24) !important;
                    border-radius: 999px !important;
                    background: rgba(127, 127, 127, .08) !important;
                }
                .ht-suggestions-row .ht-color-hint-toggle {
                    margin-left: auto !important;
                }
                .ht-suggestions-row .ht-color-hint-toggle:hover,
                .ht-suggestions-row .ht-color-hint-toggle:focus-visible,
                .ht-suggestions-row .ht-overflow-button:hover,
                .ht-suggestions-row .ht-overflow-button:focus-visible,
                .ht-suggestions-row .ht-overflow-close:hover,
                .ht-suggestions-row .ht-overflow-close:focus-visible {
                    background: rgba(127, 127, 127, .12) !important;
                }
                .ht-suggestions-row .ht-color-hint-toggle svg {
                    display: block !important;
                    flex: 0 0 auto !important;
                    fill: none !important;
                    stroke: currentColor !important;
                    stroke-width: 2 !important;
                    stroke-linecap: round !important;
                }
                .ht-suggestions-row .ht-suggestion,
                .ht-suggestions-row .ht-selected-chip {
                    appearance: none !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    box-sizing: border-box !important;
                    width: auto !important;
                    min-width: 0 !important;
                    margin: 0 !important;
                    padding: 5px 9px !important;
                    gap: 5px !important;
                    border: 1px solid rgba(127, 127, 127, .24) !important;
                    border-radius: 999px !important;
                    background: rgba(127, 127, 127, .08) !important;
                    color: inherit !important;
                    font: inherit !important;
                    font-weight: 400 !important;
                    line-height: 1.2 !important;
                    text-align: left !important;
                    text-decoration: none !important;
                    cursor: pointer !important;
                    box-shadow: none !important;
                }
                .ht-suggestions-row .ht-suggestion:hover,
                .ht-suggestions-row .ht-selected-chip:hover {
                    border-color: rgba(80, 120, 190, .45) !important;
                    background: rgba(80, 120, 190, .10) !important;
                }
                .ht-suggestions-row .ht-selected-remove {
                    flex: 0 0 auto;
                    margin-left: 1px;
                    font-weight: 700;
                }
                .ht-suggestion-tag { white-space: nowrap; }
                .ht-suggestion::before,
                .ht-selected-chip::before,
                .ht-overflow-item::before {
                    content: "";
                    flex: 0 0 7px;
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                    background: #4a90e2;
                }
                .ht-source-link::before, .ht-source-dot.ht-source-link { background: #f2994a; }
                .ht-source-topic::before, .ht-source-dot.ht-source-topic { background: #48b86a; }
                .ht-source-section::before, .ht-source-dot.ht-source-section { background: #d96aa7; }
                .ht-source-manual::before, .ht-source-dot.ht-source-manual { background: #7f7f7f; }
                .ht-source-dot.ht-source-text { background: #4a90e2; }
                .ht-source-dot {
                    display: inline-block;
                    flex: 0 0 7px;
                    width: 7px;
                    height: 7px;
                    border-radius: 50%;
                }
                .ht-token-autocomplete,
                .ht-color-hint,
                .ht-suggestion-overflow-panel {
                    position: absolute;
                    z-index: 2147483000;
                    top: calc(100% + 6px);
                    box-sizing: border-box;
                    max-width: min(360px, calc(100vw - 16px));
                    padding: 8px;
                    border: 1px solid rgba(127, 127, 127, .3);
                    border-radius: 8px;
                    background: Canvas;
                    color: CanvasText;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, .18);
                }
                .ht-token-autocomplete {
                    left: 0;
                    width: min(360px, 100%);
                }
                .ht-color-hint,
                .ht-suggestion-overflow-panel {
                    right: 0;
                    width: min(320px, 100%);
                }
                .ht-token-autocomplete::before,
                .ht-color-hint::before,
                .ht-suggestion-overflow-panel::before {
                    content: "";
                    position: absolute;
                    box-sizing: border-box;
                    width: 11px;
                    height: 11px;
                    border: 1px solid rgba(127, 127, 127, .3);
                    background: Canvas;
                    pointer-events: none;
                }
                .ht-token-autocomplete[data-placement="bottom"]::before,
                .ht-color-hint[data-placement="bottom"]::before,
                .ht-suggestion-overflow-panel[data-placement="bottom"]::before {
                    top: -6px;
                    left: var(--ht-popover-anchor-x, 50%);
                    transform: translateX(-50%) rotate(45deg);
                }
                .ht-token-autocomplete[data-placement="top"]::before,
                .ht-color-hint[data-placement="top"]::before,
                .ht-suggestion-overflow-panel[data-placement="top"]::before {
                    bottom: -6px;
                    left: var(--ht-popover-anchor-x, 50%);
                    transform: translateX(-50%) rotate(45deg);
                }
                .ht-token-autocomplete[data-placement="right"]::before,
                .ht-color-hint[data-placement="right"]::before,
                .ht-suggestion-overflow-panel[data-placement="right"]::before {
                    top: var(--ht-popover-anchor-y, 50%);
                    left: -6px;
                    transform: translateY(-50%) rotate(45deg);
                }
                .ht-token-autocomplete[data-placement="left"]::before,
                .ht-color-hint[data-placement="left"]::before,
                .ht-suggestion-overflow-panel[data-placement="left"]::before {
                    top: var(--ht-popover-anchor-y, 50%);
                    right: -6px;
                    transform: translateY(-50%) rotate(45deg);
                }
                .ht-token-autocomplete[hidden],
                .ht-color-hint[hidden],
                .ht-suggestion-overflow-panel[hidden],
                .ht-suggestions-row [hidden] {
                    display: none !important;
                }
                .ht-token-autocomplete-list,
                .ht-color-hint-grid,
                .ht-overflow-items {
                    display: grid;
                    gap: 4px;
                }
                .ht-token-option,
                .ht-overflow-item {
                    appearance: none;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    box-sizing: border-box;
                    width: 100%;
                    margin: 0;
                    padding: 7px 8px;
                    gap: 8px;
                    border: 0;
                    border-radius: 6px;
                    background: transparent;
                    color: inherit;
                    font: inherit;
                    text-align: left;
                    cursor: pointer;
                }
                .ht-overflow-item {
                    justify-content: flex-start;
                }
                .ht-overflow-item > span:last-child {
                    margin-left: auto;
                }
                .ht-token-option:hover,
                .ht-token-option:focus-visible,
                .ht-token-option[aria-selected="true"],
                .ht-overflow-item:hover,
                .ht-overflow-item:focus-visible {
                    background: rgba(127, 127, 127, .14);
                }
                .ht-token-autocomplete-message {
                    display: block;
                    opacity: .72;
                }
                .ht-color-hint-grid {
                    margin-top: 7px;
                }
                .ht-color-hint-grid > span {
                    display: flex;
                    align-items: center;
                    gap: 7px;
                }
                .ht-overflow-panel-head {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    margin-bottom: 5px;
                }
                .ht-suggestion-menu {
                    position: fixed;
                    z-index: 2147483646;
                    box-sizing: border-box;
                    max-width: calc(100vw - 16px);
                    padding: 4px;
                    border: 1px solid rgba(127, 127, 127, .35);
                    border-radius: 8px;
                    background: Canvas;
                    color: CanvasText;
                    box-shadow: 0 6px 20px rgba(0, 0, 0, .18);
                }
                .ht-suggestion-menu[hidden] { display: none !important; }
                .ht-suggestion-menu button {
                    appearance: none;
                    display: block;
                    box-sizing: border-box;
                    width: 100%;
                    margin: 0;
                    padding: 7px 9px;
                    border: 0;
                    border-radius: 5px;
                    background: transparent;
                    color: inherit;
                    font: inherit;
                    text-align: left;
                    cursor: pointer;
                }
                .ht-suggestion-menu button:hover,
                .ht-suggestion-menu button:focus { background: rgba(127, 127, 127, .14); }
                .ht-autocomplete {
                    position: fixed !important;
                    z-index: 2147483000 !important;
                    display: grid !important;
                    box-sizing: border-box !important;
                    max-width: calc(100vw - 16px) !important;
                    margin: 0 !important;
                    padding: 8px !important;
                    gap: 7px !important;
                    border: 1px solid rgba(127, 127, 127, .3) !important;
                    border-radius: 8px !important;
                    background: Canvas;
                    color: CanvasText;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, .18) !important;
                    text-align: left !important;
                    font: inherit !important;
                }
                .ht-autocomplete[hidden] { display: none !important; }
                .ht-autocomplete-head {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    min-width: 0 !important;
                    gap: 8px !important;
                }
                .ht-autocomplete-query,
                .ht-autocomplete-count,
                .ht-autocomplete-help,
                .ht-autocomplete-message { opacity: .72; }
                .ht-autocomplete-list {
                    display: grid !important;
                    max-height: 240px !important;
                    gap: 3px !important;
                    overflow-y: auto !important;
                }
                .ht-autocomplete-option {
                    appearance: none !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    box-sizing: border-box !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 7px 8px !important;
                    gap: 10px !important;
                    border: 0 !important;
                    border-radius: 6px !important;
                    background: transparent !important;
                    color: inherit !important;
                    text-align: left !important;
                    font: inherit !important;
                    cursor: pointer !important;
                    box-shadow: none !important;
                }
                .ht-autocomplete-option:hover,
                .ht-autocomplete-option:focus-visible,
                .ht-autocomplete-option[aria-selected="true"] {
                    background: rgba(74, 144, 226, .16) !important;
                }
                .ht-autocomplete-tag {
                    min-width: 0 !important;
                    overflow-wrap: anywhere !important;
                }
                .ht-autocomplete-count {
                    flex: 0 0 auto !important;
                    white-space: nowrap !important;
                    font-size: .84em !important;
                }
                .ht-autocomplete-message {
                    display: block !important;
                    padding: 7px 8px !important;
                }
                .ht-autocomplete-help {
                    display: flex !important;
                    align-items: center !important;
                    flex-wrap: wrap !important;
                    padding-top: 6px !important;
                    gap: 4px 10px !important;
                    border-top: 1px solid rgba(127, 127, 127, .2) !important;
                    font-size: .8em !important;
                }
                .ht-sr-only {
                    position: absolute !important;
                    width: 1px !important;
                    height: 1px !important;
                    padding: 0 !important;
                    margin: -1px !important;
                    overflow: hidden !important;
                    clip: rect(0, 0, 0, 0) !important;
                    white-space: nowrap !important;
                    border: 0 !important;
                }
                .ht-entity { display: inline; border: 0; border-radius: 3px; padding: 0 2px; background: rgba(255, 220, 40, .28); color: inherit; font: inherit; cursor: pointer; }
                .ht-search-shell {
                    display: grid;
                    gap: 14px;
                    text-align: left;
                }
                .ht-search-simple, .ht-search-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 10px; }
                .ht-search-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .ht-search-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
                .ht-search-field > span,
                .ht-search-section-label { font-weight: 700; }
                .ht-search-field input, .ht-search-field select { width: 100%; box-sizing: border-box; }
                .ht-search-custom-dates { grid-column: 1 / -1; }
                .ht-search-custom-dates[hidden] { display: none; }
                .ht-search-quick { display: grid; gap: 7px; }
                .ht-search-quick-tags { display: flex; flex-wrap: wrap; gap: 7px; }
                .ht-search-quick-tag {
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 7px !important;
                    margin: 0 !important;
                    padding: 5px 9px !important;
                    border: 1px solid rgba(127, 127, 127, .28) !important;
                    border-radius: 999px !important;
                    background: rgba(127, 127, 127, .07) !important;
                    color: inherit !important;
                    box-shadow: none !important;
                }
                .ht-search-quick-tag:hover,
                .ht-search-quick-tag:focus-visible { background: rgba(127, 127, 127, .14) !important; }
                .ht-search-quick-count {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 18px;
                    min-height: 18px;
                    padding: 0 4px;
                    border-radius: 999px;
                    background: rgba(127, 127, 127, .16);
                    font-size: .82em;
                    line-height: 1;
                }
                .ht-search-toggle-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 8px;
                    padding: 10px 0;
                    border-top: 1px solid rgba(127, 127, 127, .22);
                    border-bottom: 1px solid rgba(127, 127, 127, .22);
                }
                .ht-search-toggle {
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                }
                .ht-search-toggle::after {
                    content: "";
                    width: 6px;
                    height: 6px;
                    border-right: 1.5px solid currentColor;
                    border-bottom: 1.5px solid currentColor;
                    transform: rotate(45deg) translateY(-2px);
                    transform-origin: center;
                }
                .ht-search-toggle[aria-expanded="true"]::after {
                    transform: rotate(225deg) translate(-1px, -1px);
                }
                .ht-search-advanced[hidden] { display: none; }
                .ht-search-advanced {
                    padding: 12px;
                    border: 1px solid rgba(127, 127, 127, .22);
                    border-radius: 8px;
                    background: rgba(127, 127, 127, .05);
                }
                .ht-search-error { margin: 9px 0 0; color: #b42318; }
                .ht-search-dismissed { margin-top: 10px; }
                .ht-search-dismissed[hidden] { display: none; }
                .ht-search-dismissed-tags,
                .ht-search-related-tags,
                .ht-search-combination-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-top: 5px;
                }
                .ht-search-local-note, .ht-search-advanced-summary, .ht-search-result-meta { opacity: .72; font-size: .85em; }
                .ht-search-result { padding: 10px 0; border-top: 1px solid rgba(127, 127, 127, .25); }
                .ht-search-result-head { display: flex; justify-content: space-between; gap: 8px; }
                .ht-search-result-head a { font-weight: 700; }
                .ht-search-result p { margin: 6px 0; }
                .ht-search-result-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
                .ht-search-result-tags span { padding: 2px 6px; border-radius: 999px; background: rgba(127, 127, 127, .12); }
                .ht-search-results-head { display: flex; justify-content: space-between; gap: 8px; padding-top: 12px; border-top: 1px solid rgba(127, 127, 127, .25); }
                .ht-search-results-head[hidden] { display: none; }
                .ht-search-discovery { display: grid; gap: 8px; margin-top: 10px; }
                .ht-search-discovery[hidden],
                .ht-search-related[hidden],
                .ht-search-combinations[hidden] { display: none; }
                .ht-search-prompt,
                .ht-search-empty {
                    display: flex;
                    align-items: flex-start;
                    gap: 10px;
                    padding: 12px;
                    border-radius: 8px;
                    background: rgba(127, 127, 127, .07);
                }
                .ht-search-prompt > div,
                .ht-search-empty {
                    flex-direction: column;
                }
                .ht-search-prompt > div,
                .ht-search-empty { display: flex; gap: 3px; }
                .ht-search-prompt-mark {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    flex: 0 0 30px;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    background: rgba(127, 127, 127, .14);
                    font-weight: 700;
                }
                .ht-search-prompt span:not(.ht-search-prompt-mark),
                .ht-search-empty span { opacity: .76; }
                @media (max-width: 520px) {
                    .ht-suggestions-row .ht-suggestions-line,
                    .ht-suggestions-row .ht-suggestion-group,
                    .ht-suggestions-row .ht-selected-list,
                    .ht-suggestions-row .ht-suggestions-list {
                        gap: 3px !important;
                    }
                    .ht-suggestions-row .ht-label-full {
                        display: none !important;
                    }
                    .ht-suggestions-row .ht-label-short {
                        display: inline !important;
                    }
                    .ht-suggestions-row .ht-token-entry {
                        flex-basis: 86px !important;
                        width: 86px !important;
                    }
                }
                @media (max-width: 600px) {
                    .ht-search-result-head, .ht-search-results-head { align-items: flex-start !important; flex-direction: column !important; }
                    .ht-search-simple, .ht-search-grid { grid-template-columns: 1fr; }
                }
            `;
            document.head.appendChild(style);
        }

        static searchModalContent() {
            return `
                <div class="ht-search-shell">
                    <div class="ht-search-simple">
                        <label class="ht-search-field">
                            <span>Hashtag o parole</span>
                            <input type="search" class="textinput ht-search-query" placeholder="#NATO, Mediterraneo, radar…">
                        </label>
                        <label class="ht-search-field">
                            <span>Mostra</span>
                            <select class="textinput ht-search-kind">
                                <option value="post">Post</option>
                                <option value="topic">Discussioni</option>
                            </select>
                        </label>
                    </div>
                    <div class="ht-search-quick">
                        <span class="ht-search-section-label">Hashtag più usati</span>
                        <div class="ht-search-quick-tags"></div>
                    </div>
                    <div class="ht-search-toggle-row">
                        <button type="button" class="cs-btn cs-btn-sm cs-btn-outer ht-search-toggle" aria-expanded="false">
                            Filtri avanzati
                        </button>
                        <span class="ht-search-advanced-summary">Nessun filtro avanzato</span>
                    </div>
                    <div class="ht-search-advanced" hidden>
                        <div class="ht-search-grid">
                            <label class="ht-search-field">
                                <span>Con più hashtag</span>
                                <select class="textinput ht-search-operator">
                                    <option value="all">Tutti gli hashtag</option>
                                    <option value="any">Almeno uno</option>
                                </select>
                            </label>
                            <label class="ht-search-field">
                                <span>Sezione</span>
                                <select class="textinput ht-search-section">
                                    <option value="">Tutte le sezioni</option>
                                </select>
                            </label>
                            <label class="ht-search-field">
                                <span>Titolo topic</span>
                                <input type="search" class="textinput ht-search-topic" placeholder="Es. Mediterraneo">
                            </label>
                            <label class="ht-search-field">
                                <span>Autore</span>
                                <input type="search" class="textinput ht-search-author" list="ht-search-author-list" placeholder="Nome o parte del nome">
                            </label>
                            <datalist id="ht-search-author-list" class="ht-search-authors"></datalist>
                            <label class="ht-search-field">
                                <span>Escludi hashtag</span>
                                <input type="search" class="textinput ht-search-excluded" placeholder="#Tag1, Tag2…">
                            </label>
                            <label class="ht-search-field">
                                <span>Periodo</span>
                                <select class="textinput ht-search-period">
                                    <option value="all">Qualsiasi data</option>
                                    <option value="7">Ultimi 7 giorni</option>
                                    <option value="30">Ultimi 30 giorni</option>
                                    <option value="365">Ultimi 12 mesi</option>
                                    <option value="custom">Intervallo personalizzato</option>
                                </select>
                            </label>
                            <label class="ht-search-field">
                                <span>Frequenza nel topic</span>
                                <select class="textinput ht-search-frequency">
                                    <option value="0">Qualsiasi frequenza</option>
                                    <option value="3">Ricorrente · almeno 3 usi</option>
                                    <option value="8">Molto usato · almeno 8 usi</option>
                                </select>
                            </label>
                            <label class="ht-search-field">
                                <span>Ordina per</span>
                                <select class="textinput ht-search-sort">
                                    <option value="date">Più recenti</option>
                                    <option value="frequency">Più usati</option>
                                </select>
                            </label>
                            <div class="ht-search-custom-dates ht-search-grid" hidden>
                                <label class="ht-search-field">
                                    <span>Dal</span>
                                    <input type="date" class="textinput ht-search-from">
                                </label>
                                <label class="ht-search-field">
                                    <span>Al</span>
                                    <input type="date" class="textinput ht-search-to">
                                </label>
                            </div>
                        </div>
                        <p class="ht-search-error" role="alert" hidden></p>
                        <div class="ht-search-dismissed" hidden>
                            <span>Suggerimenti esclusi in questa sezione</span>
                            <div class="ht-search-dismissed-tags"></div>
                        </div>
                    </div>
                    <div class="ht-search-results-head" hidden>
                        <span class="ht-search-count" aria-live="polite">Inserisci una ricerca</span>
                        <span class="ht-search-local-note">Indice locale · pagine visitate su questo browser</span>
                    </div>
                    <div class="ht-search-discovery" hidden>
                        <div class="ht-search-related" hidden>
                            <strong>Correlati:</strong>
                            <div class="ht-search-related-tags"></div>
                        </div>
                        <div class="ht-search-combinations" hidden>
                            <strong>Combinazioni frequenti:</strong>
                            <div class="ht-search-combination-tags"></div>
                        </div>
                    </div>
                    <div class="ht-search-results"></div>
                </div>
            `;
        }

        static searchModalFooter() {
            return `
                <div class="cs-buttons cs-buttons-right">
                    <button type="button" class="cs-btn cs-btn-sm cs-btn-outer ht-search-close cs-modal-close">Chiudi</button>
                    <button type="button" class="cs-btn cs-btn-sm cs-btn-outer-blue ht-search-submit">Cerca</button>
                </div>
            `;
        }
    }

    async function start() {
        const commons = window.Commons;
        if (!commons) {
            console.warn("[HashTags Local] Commons non disponibile");
            return;
        }

        console.debug(`[HashTags Local] Avvio ${scriptInfo.version}`);
        const app = new HashtagApp(commons);
        await app.init();
        window.HashTagsLocal = app;
    }

    start().catch((error) => console.error("[HashTags Local] Errore di avvio", error));
})();
