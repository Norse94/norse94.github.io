(function () {
    "use strict";

    const scriptInfo = {
        sid: "local-hashtags-v1",
        name: "HashTags Local",
        version: "1.0.0",
        settings: {
            blacklistSections: [],
            whitelistSections: [],
            maxIndexedPosts: 1500,
            maxSuggestions: 8,
            suggestionDebounce: 250,
            editorPollInterval: 750
        }
    };

    const HASHTAG_PATTERN = /#(?!\d+\b)[\p{L}][\p{L}\p{N}_+-]*/gu;
    const HASHTAG_IN_TEXT_PATTERN = /(^|[\s([{])(#(?!\d+\b)[\p{L}][\p{L}\p{N}_+-]*)/gu;
    const STORAGE_VERSION = 1;
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
        const clean = String(tag || "").trim();
        if (!clean) return "";
        return clean.startsWith("#") ? clean : `#${clean}`;
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
            this.communityId = String(forum.cid || forum.id || forum.subdomain || "forum");
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
            const sectionId = Number(location.section?.id || 0);
            const sectionTitle = location.section?.title || "Sezione";
            const indexedAt = Date.now();

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
            return Object.values(this.data.posts);
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
            const prefix = canonicalTag(startsWith).toLowerCase();
            return [...this.getHashtagStats().values()]
                .filter((item) => !prefix || item.tag.toLowerCase().startsWith(prefix))
                .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag))
                .slice(0, 20);
        }

        getSections() {
            const sections = new Map();

            this.getPosts().forEach((post) => {
                const key = String(post.sectionId || post.sectionTitle);
                if (!sections.has(key)) {
                    sections.set(key, { id: post.sectionId, title: post.sectionTitle });
                }
            });

            return [...sections.values()].sort((left, right) => left.title.localeCompare(right.title));
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
                    className: ["ht-modal", "ht-search-modal", "cs-modal-sm"],
                    title: "Ricerca hashtag",
                    content,
                    footer
                });
                return;
            }

            if (typeof modal?.set === "function") {
                this.mode = "set";
                this.id = modal.set({
                    class: ["ht-modal", "ht-search-modal", "cs-modal-w60"],
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

    class HashtagApp {
        constructor(commons) {
            this.commons = commons;
            this.index = new LocalHashtagIndex(commons);
            this.modal = null;
            this.editorRow = null;
            this.suggestionBar = null;
            this.editorTimer = null;
            this.lastEditorContent = null;
            this.refreshSuggestionsDebounced = debounce(
                () => this.refreshSuggestions(),
                scriptInfo.settings.suggestionDebounce
            );
            this.handleDocumentClick = this.handleDocumentClick.bind(this);
            this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
        }

        async init() {
            this.addStyles();
            this.handleHashRedirect();
            this.index.indexCurrentPage();
            this.applyPostEntities();
            this.modal = new CommonsModalAdapter(this.commons);
            document.addEventListener("click", this.handleDocumentClick);
            document.addEventListener("keydown", this.handleDocumentKeydown);

            const hasEditorApi = Boolean(this.commons.utilities?.replierForm?.textarea);
            if (hasEditorApi && (this.commons.location?.isTopic || this.commons.location?.isFullEditor)) {
                this.mountSuggestionsWithRetry();
                this.addAutocomplete();
            }

            window.addEventListener("pagehide", () => this.destroy(), { once: true });
        }

        destroy() {
            clearInterval(this.editorTimer);
            document.removeEventListener("click", this.handleDocumentClick);
            document.removeEventListener("keydown", this.handleDocumentKeydown);
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

            const existing = document.getElementById(BAR_ID);
            if (existing) {
                this.suggestionBar = existing;
                return true;
            }

            const textarea = document.querySelector("textarea#Post");
            const editorRow = textarea?.closest("li.st-editor-container");
            const editorArea = editorRow?.closest("ul.st-editor-area");

            if (!textarea || !editorRow || !editorArea) return false;

            const row = document.createElement("li");
            row.id = BAR_ID;
            row.className = "Item ht-suggestions-row";
            row.hidden = true;
            row.innerHTML = `
                <div class="ht-suggestions-head">
                    <div>
                        <strong>Hashtag suggeriti</strong>
                        <span class="ht-suggestions-status"></span>
                    </div>
                    <button type="button" class="cs-btn cs-btn-sm cs-btn-outer-blue ht-open-search">
                        Cerca nel forum
                    </button>
                </div>
                <div class="ht-suggestions-list" role="list" aria-live="polite"></div>
            `;

            const bottomAddons = editorArea.querySelector(":scope > li.bottom-addons");
            if (bottomAddons) editorArea.insertBefore(row, bottomAddons);
            else editorRow.after(row);

            this.editorRow = editorRow;
            this.suggestionBar = row;
            editorRow.addEventListener("input", this.refreshSuggestionsDebounced, true);
            editorRow.addEventListener("keyup", this.refreshSuggestionsDebounced, true);

            this.editorTimer = setInterval(
                () => this.refreshSuggestions(),
                scriptInfo.settings.editorPollInterval
            );

            this.refreshSuggestions(true);
            return true;
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
            const topicStats = this.index.getHashtagStats({ topicId });
            const sectionStats = this.index.getHashtagStats({ sectionId });
            const globalStats = this.index.getHashtagStats();
            const scores = new Map();

            const add = (tag, points, source, reason) => {
                const canonical = canonicalTag(tag);
                const key = canonical.toLowerCase();
                if (!canonical || insertedTags.has(key)) return;

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

            const suggestions = this.buildSuggestions(content);
            const list = this.suggestionBar.querySelector(".ht-suggestions-list");
            const status = this.suggestionBar.querySelector(".ht-suggestions-status");
            list.replaceChildren();

            suggestions.forEach((item) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = `cs-btn cs-btn-sm ht-suggestion ht-source-${item.source}`;
                button.dataset.hashtag = item.tag;
                button.setAttribute("role", "listitem");
                button.setAttribute("aria-label", `${item.tag}: ${item.reason}`);

                const tag = document.createElement("span");
                tag.className = "ht-suggestion-tag";
                tag.textContent = item.tag;

                const reason = document.createElement("span");
                reason.className = "ht-suggestion-reason";
                reason.textContent = item.reason;

                button.append(tag, reason);
                list.appendChild(button);
            });

            status.textContent = suggestions.length
                ? `${suggestions.length} proposte dal contenuto e dal forum`
                : "Nessun suggerimento disponibile";
            this.suggestionBar.hidden = false;
        }

        insertHashtag(tag) {
            const canonical = canonicalTag(tag);
            if (!canonical) return;

            const content = this.getEditorContent();
            const existing = new Set(extractHashtags(htmlToText(content)).map((value) => value.toLowerCase()));
            if (existing.has(canonical.toLowerCase())) return;

            this.commons.utilities.replierForm.textarea.addContent(` ${canonical} `);
            setTimeout(() => this.refreshSuggestions(true), 50);
        }

        addAutocomplete() {
            const autocomplete = this.commons.tooltip?.autocomplete;
            const textarea = document.querySelector("textarea#Post");
            if (typeof autocomplete !== "function" || !textarea) return;

            autocomplete(textarea, {
                char: "#",
                searchOptions: {
                    queryMinLength: 2,
                    allowSpaces: false,
                    caseSensitive: false,
                    exitOnEmpty: true
                },
                search: async ({ query }) => this.index.listHashtags(`#${query}`).map((item) => ({
                    id: item.tag.slice(1),
                    label: `${item.tag} (${item.count})`
                })),
                templates: {
                    queryTooShort: "Digita almeno 2 caratteri..."
                }
            });
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
                        const start = match.index + prefix.length;

                        fragment.append(document.createTextNode(text.slice(cursor, start)));

                        const button = document.createElement("button");
                        button.type = "button";
                        button.className = "ht-entity";
                        button.dataset.hashtag = tag;
                        button.textContent = tag;
                        button.setAttribute("aria-label", `Cerca ${tag}`);
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

            const quick = root.querySelector(".ht-search-quick-tags");
            quick.replaceChildren();
            this.index.listHashtags().slice(0, 6).forEach((item) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "cs-btn cs-btn-sm ht-search-quick-tag";
                button.dataset.hashtag = item.tag;
                button.textContent = `${item.tag} · ${item.count}`;
                quick.appendChild(button);
            });
        }

        collapseAdvanced(root) {
            const advanced = root.querySelector(".ht-search-advanced");
            const toggle = root.querySelector(".ht-search-toggle");
            advanced.hidden = true;
            toggle.setAttribute("aria-expanded", "false");
            toggle.textContent = "Mostra ricerca avanzata";
        }

        toggleAdvanced(root) {
            const advanced = root.querySelector(".ht-search-advanced");
            const toggle = root.querySelector(".ht-search-toggle");
            const willOpen = advanced.hidden;
            advanced.hidden = !willOpen;
            toggle.setAttribute("aria-expanded", String(willOpen));
            toggle.textContent = willOpen ? "Nascondi ricerca avanzata" : "Mostra ricerca avanzata";
        }

        advancedFilterCount(root) {
            return [
                root.querySelector(".ht-search-operator").value !== "all",
                Boolean(root.querySelector(".ht-search-section").value),
                Boolean(root.querySelector(".ht-search-topic").value.trim()),
                Boolean(root.querySelector(".ht-search-from").value),
                Boolean(root.querySelector(".ht-search-to").value),
                Number(root.querySelector(".ht-search-frequency").value) > 0,
                root.querySelector(".ht-search-sort").value !== "date"
            ].filter(Boolean).length;
        }

        getSearchState(root) {
            const query = root.querySelector(".ht-search-query").value.trim();
            return {
                query,
                queryTags: extractHashtags(query).map((tag) => tag.toLowerCase()),
                words: tokenize(query.replace(HASHTAG_PATTERN, " ")),
                kind: root.querySelector(".ht-search-kind").value,
                operator: root.querySelector(".ht-search-operator").value,
                sectionId: root.querySelector(".ht-search-section").value,
                topic: normalizeForSearch(root.querySelector(".ht-search-topic").value.trim()),
                from: root.querySelector(".ht-search-from").value,
                to: root.querySelector(".ht-search-to").value,
                minFrequency: Number(root.querySelector(".ht-search-frequency").value),
                sort: root.querySelector(".ht-search-sort").value
            };
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
            const date = String(post.date || "").slice(0, 10);
            const haystack = normalizeForSearch(`${post.topicTitle} ${post.excerpt} ${post.authorName} ${post.sectionTitle}`);

            return (!state.sectionId || String(post.sectionId) === state.sectionId)
                && (!state.topic || normalizeForSearch(post.topicTitle).includes(state.topic))
                && (!state.from || date >= state.from)
                && (!state.to || date <= state.to)
                && state.words.every((word) => haystack.includes(word));
        }

        matchesTags(tags, state) {
            if (!state.queryTags.length) return true;
            const available = new Set(tags.map((tag) => tag.toLowerCase()));
            return state.operator === "all"
                ? state.queryTags.every((tag) => available.has(tag))
                : state.queryTags.some((tag) => available.has(tag));
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

        runSearch(root) {
            const state = this.getSearchState(root);
            this.collapseAdvanced(root);
            const activeFilters = this.advancedFilterCount(root);
            root.querySelector(".ht-search-advanced-summary").textContent = activeFilters
                ? `${activeFilters} ${activeFilters === 1 ? "filtro avanzato attivo" : "filtri avanzati attivi"}`
                : "Nessun filtro avanzato";

            const matches = state.kind === "topic" ? this.searchTopics(state) : this.searchPosts(state);
            this.renderSearchResults(root, matches, state.kind);
        }

        renderSearchPrompt(root) {
            root.querySelector(".ht-search-count").textContent = "Inserisci una ricerca";
            root.querySelector(".ht-search-results").replaceChildren();
        }

        renderSearchResults(root, matches, kind) {
            const results = root.querySelector(".ht-search-results");
            const count = root.querySelector(".ht-search-count");
            results.replaceChildren();
            count.textContent = `${matches.length} ${matches.length === 1 ? "risultato" : "risultati"}`;

            if (!matches.length) {
                const empty = document.createElement("p");
                empty.className = "ht-search-empty";
                empty.textContent = "Nessun risultato nell'indice locale per questa combinazione.";
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

            const entity = target.closest(".ht-entity");
            if (entity) {
                event.preventDefault();
                this.openSearch(entity.dataset.hashtag || entity.textContent);
                return;
            }

            const suggestion = target.closest(".ht-suggestion");
            if (suggestion) {
                this.insertHashtag(suggestion.dataset.hashtag);
                return;
            }

            if (target.closest(".ht-open-search")) {
                this.openSearch();
                return;
            }

            const root = target.closest(".ht-search-modal") || this.modal?.nativeElement;
            if (!root?.querySelector?.(".ht-search-shell")) return;

            const quickTag = target.closest(".ht-search-quick-tag");
            if (quickTag) {
                root.querySelector(".ht-search-query").value = quickTag.dataset.hashtag || quickTag.textContent;
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
            if (event.key !== "Enter" || !target?.matches(".ht-search-query")) return;

            const root = target.closest(".ht-search-modal") || this.modal?.nativeElement;
            if (!root) return;
            event.preventDefault();
            this.runSearch(root);
        }

        addStyles() {
            if (document.getElementById(CSS_ID)) return;

            const style = document.createElement("style");
            style.id = CSS_ID;
            style.textContent = `
                .ht-suggestions-row { padding: 8px 2%; }
                .ht-suggestions-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
                .ht-suggestions-head strong, .ht-suggestions-status { display: block; }
                .ht-suggestions-status { margin-top: 2px; opacity: .72; font-size: .85em; }
                .ht-suggestions-list { display: flex; flex-wrap: wrap; gap: 6px; }
                .ht-suggestion { display: inline-flex !important; align-items: center; gap: 5px; }
                .ht-suggestion-reason { opacity: .7; font-size: .82em; }
                .ht-suggestion::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: #4a90e2; }
                .ht-source-link::before { background: #f2994a; }
                .ht-source-topic::before { background: #48b86a; }
                .ht-source-section::before { background: #d96aa7; }
                .ht-entity { display: inline; border: 0; border-radius: 3px; padding: 0 2px; background: rgba(255, 220, 40, .28); color: inherit; font: inherit; cursor: pointer; }
                .ht-search-simple, .ht-search-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 10px; }
                .ht-search-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                .ht-search-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
                .ht-search-field input, .ht-search-field select { width: 100%; box-sizing: border-box; }
                .ht-search-quick { margin-top: 10px; }
                .ht-search-quick-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 5px; }
                .ht-search-toggle-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
                .ht-search-advanced[hidden] { display: none; }
                .ht-search-local-note, .ht-search-advanced-summary, .ht-search-result-meta { opacity: .72; font-size: .85em; }
                .ht-search-result { padding: 10px 0; border-top: 1px solid rgba(127, 127, 127, .25); }
                .ht-search-result-head { display: flex; justify-content: space-between; gap: 8px; }
                .ht-search-result-head a { font-weight: 700; }
                .ht-search-result p { margin: 6px 0; }
                .ht-search-result-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
                .ht-search-result-tags span { padding: 2px 6px; border-radius: 999px; background: rgba(127, 127, 127, .12); }
                .ht-search-results-head { display: flex; justify-content: space-between; gap: 8px; margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(127, 127, 127, .25); }
                .ht-search-empty { padding: 12px 0; }
                @media (max-width: 600px) {
                    .ht-suggestions-head, .ht-search-result-head, .ht-search-results-head { align-items: flex-start; flex-direction: column; }
                    .ht-search-simple, .ht-search-grid { grid-template-columns: 1fr; }
                    .ht-suggestion-reason { display: none; }
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
                        <span>Ricerche frequenti</span>
                        <div class="ht-search-quick-tags"></div>
                    </div>
                    <div class="ht-search-toggle-row">
                        <button type="button" class="cs-btn cs-btn-sm ht-search-toggle" aria-expanded="false">
                            Mostra ricerca avanzata
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
                                <span>Dal</span>
                                <input type="date" class="textinput ht-search-from">
                            </label>
                            <label class="ht-search-field">
                                <span>Al</span>
                                <input type="date" class="textinput ht-search-to">
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
                        </div>
                    </div>
                    <div class="ht-search-results-head">
                        <span class="ht-search-count" aria-live="polite">Inserisci una ricerca</span>
                        <span class="ht-search-local-note">Indice locale · pagine visitate su questo browser</span>
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
