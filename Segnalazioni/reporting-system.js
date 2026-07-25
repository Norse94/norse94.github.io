(function bootstrapForumFreeReporting(global) {
  "use strict";

  if (global.FFReportingSystem) return;

  var DEFAULTS = {
    supabaseUrl: "",
    supabasePublishableKey: "",
    locale: "auto",
    minReasonLength: 5,
    maxReasonLength: 300,
    includedSections: [],
    excludedSections: [],
    excludedAuthorGroupIds: [],
    disableInClosedTopics: false,
    disableInAnnouncements: false,
    resolveGroupId: null,
    resolveNickname: null,
    autoInit: true,
    debug: false,
  };

  var TEXT = {
    it: {
      report: "Segnala",
      reported: "Segnalato",
      reports: "Segnalazioni",
      reportTitle: "Segnala il post di {name}",
      reportReason: "Motivo della segnalazione",
      reportPlaceholder: "Descrivi in modo chiaro il motivo della segnalazione",
      reportHint: "Una volta inviata, la segnalazione non può essere annullata.",
      send: "Invia segnalazione",
      cancel: "Annulla",
      close: "Chiudi",
      sent: "Segnalazione inviata correttamente.",
      genericError: "Qualcosa è andato storto. Riprova.",
      configMissing: "Configura URL e publishable key di Supabase.",
      reasonLength: "Inserisci da {min} a {max} caratteri.",
      loading: "Caricamento…",
      noReports: "Nessuna segnalazione trovata.",
      unread: "non lette",
      markAllRead: "Segna tutte come lette",
      markedRead: "Segnalazioni segnate come lette.",
      refresh: "Aggiorna",
      filters: "Filtri",
      status: "Stato",
      section: "Sezione",
      allSections: "Tutte le sezioni",
      apply: "Applica",
      loadMore: "Carica altre",
      open: "Aperta",
      escalated: "Escalata",
      resolved: "Risolta",
      archived: "Archiviata",
      allActive: "Aperte ed escalate",
      allStatuses: "Tutti gli stati",
      postBy: "Post di {name}",
      reportedBy: "Segnalato da {name}",
      openPost: "Vai al post",
      showReason: "Mostra dettaglio",
      hideReason: "Nascondi dettaglio",
      escalate: "Escala ad admin",
      resolve: "Risolvi",
      reopen: "Riapri",
      archive: "Archivia",
      confirmEscalate: "Escalare questa segnalazione a un admin?",
      confirmResolve: "Contrassegnare la segnalazione come risolta?",
      confirmReopen: "Riaprire questa segnalazione?",
      confirmArchive: "Archiviare questa segnalazione?",
      updated: "Segnalazione aggiornata.",
      configuration: "Configurazione",
      groups: "Gruppi staff",
      moderators: "Moderatori",
      groupHelp: "Abilita i gruppi e indica i FID separati da virgole.",
      moderatorHelp: "Associa ogni MID moderatore ai FID che può controllare.",
      enabled: "Abilitato",
      groupName: "Gruppo",
      groupId: "ID gruppo",
      sectionIds: "FID sezioni",
      mid: "MID",
      nickname: "Nickname",
      addModerator: "Aggiungi moderatore",
      addGroup: "Aggiungi gruppo",
      remove: "Rimuovi",
      save: "Salva",
      saved: "Configurazione salvata.",
      invalidSections: "Usa soltanto FID numerici positivi separati da virgole.",
      invalidModerator: "MID e sezioni del moderatore non sono validi.",
      invalidGroup: "ID gruppo non valido o già presente.",
      mobileNotice: "Hai {count} segnalazioni non lette",
      counter: "{current}/{max}",
      apiTrustWarning:
        "Ruoli e identità sono ricavati dalla pagina ForumFree e non costituiscono autenticazione forte.",
    },
    en: {
      report: "Report",
      reported: "Reported",
      reports: "Reports",
      reportTitle: "Report {name}'s post",
      reportReason: "Reason",
      reportPlaceholder: "Clearly describe why you are reporting this post",
      reportHint: "Once sent, the report cannot be cancelled.",
      send: "Send report",
      cancel: "Cancel",
      close: "Close",
      sent: "Report sent successfully.",
      genericError: "Something went wrong. Please try again.",
      configMissing: "Configure the Supabase URL and publishable key.",
      reasonLength: "Enter between {min} and {max} characters.",
      loading: "Loading…",
      noReports: "No reports found.",
      unread: "unread",
      markAllRead: "Mark all as read",
      markedRead: "Reports marked as read.",
      refresh: "Refresh",
      filters: "Filters",
      status: "Status",
      section: "Section",
      allSections: "All sections",
      apply: "Apply",
      loadMore: "Load more",
      open: "Open",
      escalated: "Escalated",
      resolved: "Resolved",
      archived: "Archived",
      allActive: "Open and escalated",
      allStatuses: "All statuses",
      postBy: "Post by {name}",
      reportedBy: "Reported by {name}",
      openPost: "Go to post",
      showReason: "Show details",
      hideReason: "Hide details",
      escalate: "Escalate to admin",
      resolve: "Resolve",
      reopen: "Reopen",
      archive: "Archive",
      confirmEscalate: "Escalate this report to an admin?",
      confirmResolve: "Mark this report as resolved?",
      confirmReopen: "Reopen this report?",
      confirmArchive: "Archive this report?",
      updated: "Report updated.",
      configuration: "Configuration",
      groups: "Staff groups",
      moderators: "Moderators",
      groupHelp: "Enable groups and enter comma-separated forum IDs.",
      moderatorHelp: "Assign each moderator MID to the forum IDs they can manage.",
      enabled: "Enabled",
      groupName: "Group",
      groupId: "Group ID",
      sectionIds: "Forum IDs",
      mid: "MID",
      nickname: "Nickname",
      addModerator: "Add moderator",
      addGroup: "Add group",
      remove: "Remove",
      save: "Save",
      saved: "Configuration saved.",
      invalidSections: "Use positive numeric forum IDs separated by commas.",
      invalidModerator: "Moderator MID or sections are invalid.",
      invalidGroup: "Group ID is invalid or already present.",
      mobileNotice: "You have {count} unread reports",
      counter: "{current}/{max}",
      apiTrustWarning:
        "Roles and identities are read from the ForumFree page and are not strong authentication.",
    },
  };

  var STYLE_ID = "ffrs-styles";
  var state = {
    initialized: false,
    config: null,
    locale: "it",
    context: null,
    access: null,
    ownReportedPostIds: new Set(),
    postReports: new Map(),
    unreadCount: 0,
    configuration: null,
    modal: null,
    previousFocus: null,
    observer: null,
    mutationTimer: null,
    list: null,
  };

  function log() {
    if (!state.config || !state.config.debug) return;
    var args = Array.prototype.slice.call(arguments);
    args.unshift("[FF Reporting]");
    console.debug.apply(console, args);
  }

  function t(key, replacements) {
    var value = (TEXT[state.locale] && TEXT[state.locale][key]) || TEXT.it[key] || key;
    Object.keys(replacements || {}).forEach(function replaceToken(token) {
      value = value.replace(new RegExp("\\{" + token + "\\}", "g"), String(replacements[token]));
    });
    return value;
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function button(label, className, handler) {
    var node = element("button", className, label);
    node.type = "button";
    if (handler) node.addEventListener("click", handler);
    return node;
  }

  function parsePositive(value) {
    var parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }

  function classId(prefix) {
    var classes = Array.from(document.body ? document.body.classList : []);
    for (var i = 0; i < classes.length; i += 1) {
      var match = classes[i].match(new RegExp("^" + prefix + "(\\d+)$", "i"));
      if (match) return Number(match[1]);
    }
    return null;
  }

  function detectLocale(config) {
    if (config.locale === "it" || config.locale === "en") return config.locale;
    return global.ff_lang === 0 || global.ff_lang === "it_IT" ? "it" : "en";
  }

  function resolveNickname(config) {
    if (typeof config.resolveNickname === "function") {
      try {
        var custom = config.resolveNickname();
        if (custom) return String(custom).trim().slice(0, 100);
      } catch (error) {
        log("resolveNickname failed", error);
      }
    }

    var globalName = global.ff_nickname || global.ff_username || global.member_name;
    if (globalName) return String(globalName).trim().slice(0, 100);

    var profile = document.querySelector(
      ".user-links .nickname, .userbar .nickname, header .member-name, a[href*='act=Profile'][href*='MID=']",
    );
    return profile ? profile.textContent.trim().slice(0, 100) : "";
  }

  function resolveGroupId(config) {
    if (typeof config.resolveGroupId === "function") {
      try {
        return parsePositive(config.resolveGroupId());
      } catch (error) {
        log("resolveGroupId failed", error);
      }
    }

    var direct =
      parsePositive(global.ff_group_id) ||
      parsePositive(global.ff_gid) ||
      parsePositive(document.body && document.body.dataset.groupId);
    if (direct) return direct;

    var classes = Array.from(document.body ? document.body.classList : []);
    for (var i = 0; i < classes.length; i += 1) {
      var match = classes[i].match(/^(?:group|gruppo|gid|g)(\d+)$/i);
      if (match) return Number(match[1]);
    }
    return null;
  }

  function buildContext(config) {
    var body = document.body;
    var isGuest = !body || body.classList.contains("guest");
    var mid = isGuest ? null : parsePositive(global.ff_mid);
    var role = body && body.classList.contains("admin")
      ? "admin"
      : body && body.classList.contains("globalmod")
        ? "globalmod"
        : "member";

    return {
      domain: global.location.hostname.toLowerCase(),
      topicId: classId("t") || parsePositive(new URL(global.location.href).searchParams.get("t")),
      sectionId: classId("f"),
      actor: {
        mid: mid,
        nickname: resolveNickname(config),
        role: role,
        groupId: resolveGroupId(config),
      },
      isGuest: isGuest || !mid,
    };
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = element("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".ffrs-report-button,.ffrs-post-badge{cursor:pointer;display:inline-flex;align-items:center;gap:.35rem;min-height:44px;border:0;background:transparent;color:inherit;font:inherit;padding:.25rem .5rem}",
      ".ffrs-report-button:hover,.ffrs-post-badge:hover{color:#b42318}",
      ".ffrs-post-badge{border-radius:999px;background:#fff1f0;color:#b42318;font-weight:700}",
      ".ffrs-post-badge[data-escalated='true']{background:#ffe8cc;color:#9a3412}",
      ".ffrs-menu-button{appearance:none;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;min-height:44px;width:100%;text-align:left;padding:.5rem .75rem}",
      ".ffrs-menu-count{display:inline-flex;align-items:center;justify-content:center;min-width:1.5rem;height:1.5rem;margin-left:.35rem;padding:0 .35rem;border-radius:999px;background:#d92d20;color:#fff;font-size:.75rem;font-weight:700}",
      ".ffrs-menu-fallback{position:fixed;right:1rem;bottom:1rem;z-index:2147483000;min-height:44px;border:0;border-radius:999px;background:#b42318;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.25);padding:.75rem 1rem;font-weight:700;cursor:pointer}",
      ".ffrs-mobile-notice{display:none;position:sticky;top:0;z-index:999;min-height:44px;background:#fff3cd;color:#7a4d00;border:0;border-bottom:1px solid #ffe69c;width:100%;padding:.7rem 1rem;text-align:center;font-weight:700;cursor:pointer}",
      ".ffrs-dialog-root[hidden]{display:none!important}",
      ".ffrs-dialog-root{position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;padding:1rem}",
      ".ffrs-backdrop{position:absolute;inset:0;background:rgba(16,24,40,.68);backdrop-filter:blur(2px)}",
      ".ffrs-dialog{position:relative;display:flex;flex-direction:column;width:min(760px,100%);max-height:min(90vh,900px);overflow:hidden;background:#fff;color:#1d2939;border-radius:16px;box-shadow:0 24px 72px rgba(0,0,0,.35);font:14px/1.5 Arial,sans-serif}",
      ".ffrs-dialog-header,.ffrs-dialog-footer{display:flex;align-items:center;gap:.75rem;padding:1rem 1.25rem;background:#fff}",
      ".ffrs-dialog-header{position:sticky;top:0;z-index:2;border-bottom:1px solid #eaecf0}",
      ".ffrs-dialog-title{flex:1;margin:0;font-size:1.2rem;line-height:1.3}",
      ".ffrs-dialog-close{width:44px;height:44px;border:0;border-radius:999px;background:#f2f4f7;color:#344054;font-size:1.35rem;cursor:pointer}",
      ".ffrs-dialog-body{overflow:auto;padding:1.25rem;overscroll-behavior:contain}",
      ".ffrs-dialog-footer{position:sticky;bottom:0;z-index:2;justify-content:flex-end;border-top:1px solid #eaecf0;flex-wrap:wrap}",
      ".ffrs-field{display:grid;gap:.4rem;margin-bottom:1rem}",
      ".ffrs-field>label{font-weight:700}",
      ".ffrs-input,.ffrs-select,.ffrs-textarea{width:100%;box-sizing:border-box;border:1px solid #d0d5dd;border-radius:8px;background:#fff;color:#101828;padding:.7rem .8rem;font:inherit}",
      ".ffrs-textarea{min-height:130px;resize:vertical}",
      ".ffrs-counter{text-align:right;color:#667085;font-size:.8rem}",
      ".ffrs-hint{margin:.25rem 0;color:#667085;font-size:.85rem}",
      ".ffrs-warning{padding:.75rem;border-radius:8px;background:#fff6ed;color:#9a3412;font-size:.85rem}",
      ".ffrs-error{color:#b42318;font-weight:700}",
      ".ffrs-actions{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center}",
      ".ffrs-button{min-height:44px;border:1px solid #d0d5dd;border-radius:8px;background:#fff;color:#344054;padding:.55rem .9rem;font-weight:700;cursor:pointer}",
      ".ffrs-button:hover{background:#f9fafb}",
      ".ffrs-button:disabled{opacity:.55;cursor:not-allowed}",
      ".ffrs-button-primary{border-color:#b42318;background:#b42318;color:#fff}",
      ".ffrs-button-primary:hover{background:#912018}",
      ".ffrs-button-warning{border-color:#f79009;color:#9a3412;background:#fff7ed}",
      ".ffrs-button-success{border-color:#039855;color:#027a48;background:#ecfdf3}",
      ".ffrs-button-danger{border-color:#d92d20;color:#b42318;background:#fef3f2}",
      ".ffrs-toolbar{display:grid;grid-template-columns:minmax(150px,1fr) minmax(120px,.7fr) auto;gap:.75rem;align-items:end;margin-bottom:1rem}",
      ".ffrs-toolbar .ffrs-field{margin:0}",
      ".ffrs-report-list{display:grid;gap:.8rem}",
      ".ffrs-report-card{border:1px solid #eaecf0;border-left:4px solid #98a2b3;border-radius:10px;background:#fff;overflow:hidden}",
      ".ffrs-report-card[data-status='escalated']{border-left-color:#f79009;background:#fffcf5}",
      ".ffrs-report-card[data-status='open']{border-left-color:#2e90fa}",
      ".ffrs-report-card[data-status='resolved']{border-left-color:#12b76a;opacity:.9}",
      ".ffrs-report-card[data-status='archived']{border-left-color:#667085;opacity:.72}",
      ".ffrs-report-card[data-read='false']{box-shadow:0 0 0 2px rgba(46,144,250,.13)}",
      ".ffrs-card-summary{display:grid;grid-template-columns:1fr auto;gap:.75rem;width:100%;border:0;background:transparent;color:inherit;text-align:left;padding:1rem;cursor:pointer}",
      ".ffrs-card-title{margin:0;font-weight:700}",
      ".ffrs-card-meta{display:flex;gap:.5rem;flex-wrap:wrap;color:#667085;font-size:.82rem}",
      ".ffrs-status{display:inline-flex;padding:.18rem .5rem;border-radius:999px;background:#f2f4f7;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.03em}",
      ".ffrs-card-detail[hidden]{display:none}",
      ".ffrs-card-detail{display:grid;gap:.8rem;padding:0 1rem 1rem}",
      ".ffrs-reason{white-space:pre-wrap;overflow-wrap:anywhere;padding:.8rem;border-radius:8px;background:#f9fafb}",
      ".ffrs-empty,.ffrs-loading{text-align:center;padding:2rem;color:#667085}",
      ".ffrs-tabs{display:flex;gap:.4rem;margin-bottom:1rem;border-bottom:1px solid #eaecf0}",
      ".ffrs-tab{min-height:44px;border:0;border-bottom:3px solid transparent;background:transparent;padding:.6rem .8rem;font-weight:700;cursor:pointer}",
      ".ffrs-tab[aria-selected='true']{border-color:#b42318;color:#b42318}",
      ".ffrs-config-row{display:grid;grid-template-columns:auto minmax(130px,.8fr) minmax(180px,1fr) auto;gap:.6rem;align-items:center;padding:.65rem 0;border-bottom:1px solid #eaecf0}",
      ".ffrs-config-row input[type='checkbox']{width:20px;height:20px}",
      ".ffrs-toast-region{position:fixed;right:1rem;bottom:1rem;z-index:2147483647;display:grid;gap:.5rem;max-width:min(360px,calc(100vw - 2rem))}",
      ".ffrs-toast{padding:.85rem 1rem;border-radius:10px;background:#101828;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,.25)}",
      ".ffrs-toast[data-kind='error']{background:#b42318}",
      "body.ffrs-modal-open{overflow:hidden}",
      "@media(max-width:640px){.ffrs-mobile-notice{display:block}.ffrs-dialog-root{align-items:end;padding:0}.ffrs-dialog{width:100%;max-height:92dvh;border-radius:18px 18px 0 0}.ffrs-dialog-body{padding:1rem}.ffrs-dialog-header,.ffrs-dialog-footer{padding:.8rem 1rem}.ffrs-dialog-footer>.ffrs-button{flex:1}.ffrs-toolbar{grid-template-columns:1fr 1fr}.ffrs-toolbar>.ffrs-button{grid-column:1/-1}.ffrs-card-summary{grid-template-columns:1fr}.ffrs-config-row{grid-template-columns:auto 1fr}.ffrs-config-row>.ffrs-input:nth-of-type(2){grid-column:1/-1}.ffrs-config-row>.ffrs-button{grid-column:1/-1}.ffrs-menu-fallback{bottom:.75rem;right:.75rem}}",
      "@media(min-width:641px){.ffrs-mobile-notice{display:none!important}}",
    ].join("\n");
    document.head.appendChild(style);
  }

  function toast(message, kind) {
    if (
      global.Commons &&
      global.Commons.toast &&
      typeof global.Commons.toast.show === "function"
    ) {
      global.Commons.toast.show({
        title: "Reporting System",
        content: message,
        class: kind === "error" ? "cs-toast-error" : "cs-toast-success",
      });
      return;
    }

    var region = document.querySelector(".ffrs-toast-region");
    if (!region) {
      region = element("div", "ffrs-toast-region");
      region.setAttribute("role", "status");
      region.setAttribute("aria-live", "polite");
      document.body.appendChild(region);
    }
    var item = element("div", "ffrs-toast", message);
    item.dataset.kind = kind || "success";
    region.appendChild(item);
    global.setTimeout(function removeToast() {
      item.remove();
      if (!region.childElementCount) region.remove();
    }, 4500);
  }

  function ensureDialog() {
    if (state.modal) return state.modal;

    var root = element("div", "ffrs-dialog-root");
    root.hidden = true;
    var backdrop = element("div", "ffrs-backdrop");
    var dialog = element("section", "ffrs-dialog");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "ffrs-dialog-title");
    dialog.tabIndex = -1;
    var header = element("header", "ffrs-dialog-header");
    var title = element("h2", "ffrs-dialog-title");
    title.id = "ffrs-dialog-title";
    var closeButton = button("×", "ffrs-dialog-close", closeDialog);
    closeButton.setAttribute("aria-label", t("close"));
    var body = element("div", "ffrs-dialog-body");
    var footer = element("footer", "ffrs-dialog-footer");
    header.append(title, closeButton);
    dialog.append(header, body, footer);
    root.append(backdrop, dialog);
    document.body.appendChild(root);

    backdrop.addEventListener("click", closeDialog);
    root.addEventListener("keydown", trapDialogFocus);
    state.modal = { root: root, dialog: dialog, title: title, body: body, footer: footer };
    return state.modal;
  }

  function trapDialogFocus(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key !== "Tab") return;

    var focusable = Array.from(
      state.modal.dialog.querySelectorAll(
        "button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])",
      ),
    ).filter(function visible(node) {
      return !node.hidden && node.getClientRects().length > 0;
    });
    if (!focusable.length) {
      event.preventDefault();
      state.modal.dialog.focus();
      return;
    }
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openDialog(title) {
    var modal = ensureDialog();
    state.previousFocus = document.activeElement;
    modal.title.textContent = title;
    modal.body.replaceChildren();
    modal.footer.replaceChildren();
    modal.root.hidden = false;
    document.body.classList.add("ffrs-modal-open");
    global.setTimeout(function focusDialog() {
      var focus = modal.dialog.querySelector("button,input,select,textarea,a[href]");
      (focus || modal.dialog).focus();
    }, 0);
    return modal;
  }

  function closeDialog() {
    if (!state.modal || state.modal.root.hidden) return;
    state.modal.root.hidden = true;
    state.modal.body.replaceChildren();
    state.modal.footer.replaceChildren();
    document.body.classList.remove("ffrs-modal-open");
    if (state.previousFocus && typeof state.previousFocus.focus === "function") {
      state.previousFocus.focus();
    }
    state.previousFocus = null;
    state.list = null;
  }

  function actorPayload() {
    return {
      mid: state.context.actor.mid,
      nickname: state.context.actor.nickname,
      role: state.context.actor.role,
      groupId: state.context.actor.groupId,
    };
  }

  async function api(action, payload) {
    var base = String(state.config.supabaseUrl || "").replace(/\/+$/, "");
    var response = await global.fetch(base + "/functions/v1/reporting-api", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: state.config.supabasePublishableKey,
      },
      body: JSON.stringify({
        action: action,
        board: { domain: state.context.domain },
        actor: actorPayload(),
        payload: payload || {},
      }),
    });

    var envelope;
    try {
      envelope = await response.json();
    } catch (_error) {
      throw new Error(t("genericError"));
    }
    if (!response.ok || !envelope.ok) {
      var error = new Error(
        envelope && envelope.error && envelope.error.message
          ? envelope.error.message
          : t("genericError"),
      );
      error.code = envelope && envelope.error ? envelope.error.code : "HTTP_ERROR";
      throw error;
    }
    return envelope.data;
  }

  function currentPosts() {
    return Array.from(document.querySelectorAll(".topic .post")).filter(function validPost(post) {
      return /^ee\d+$/.test(post.id);
    });
  }

  function postContext(post) {
    var postId = parsePositive(post.id.replace(/^ee/, ""));
    var nick = post.querySelector(".nick");
    var authorLink = post.querySelector(
      ".nick a[href*='MID='],a.nick[href*='MID='],a[href*='act=Profile'][href*='MID=']",
    );
    var authorMid = null;
    if (authorLink) {
      try {
        authorMid = parsePositive(new URL(authorLink.href, global.location.href).searchParams.get("MID"));
      } catch (_error) {
        authorMid = null;
      }
    }
    var groupMatch = post.className.match(/\bbox_gruppo(\d+)\b/i);
    return {
      element: post,
      toolbar: post.querySelector(".top .mini_buttons.rt"),
      postId: postId,
      topicId: state.context.topicId,
      sectionId: state.context.sectionId,
      authorMid: authorMid,
      authorNickname: nick ? nick.textContent.trim().slice(0, 100) : "",
      authorGroupId: groupMatch ? Number(groupMatch[1]) : null,
      postUrl:
        global.location.origin +
        "/?t=" +
        state.context.topicId +
        "&p=" +
        postId +
        "#entry" +
        postId,
    };
  }

  function isReportable(post) {
    var config = state.config;
    if (
      state.context.isGuest ||
      !post.toolbar ||
      !post.postId ||
      !post.topicId ||
      !post.sectionId ||
      state.ownReportedPostIds.has(post.postId)
    ) {
      return false;
    }
    if (
      config.includedSections.length &&
      !config.includedSections.includes(post.sectionId)
    ) {
      return false;
    }
    if (config.excludedSections.includes(post.sectionId)) return false;
    if (
      post.authorGroupId &&
      config.excludedAuthorGroupIds.includes(post.authorGroupId)
    ) {
      return false;
    }
    if (
      config.disableInClosedTopics &&
      document.querySelector(".topic.closed,.topic.chiuso")
    ) {
      return false;
    }
    if (
      config.disableInAnnouncements &&
      document.querySelector(".topic.announcement,.topic.annuncio")
    ) {
      return false;
    }
    return true;
  }

  function renderPosts() {
    currentPosts().forEach(function renderPost(postElement) {
      var post = postContext(postElement);
      if (!post.toolbar) return;

      var reportButton = post.toolbar.querySelector(".ffrs-report-button");
      if (isReportable(post)) {
        if (!reportButton) {
          reportButton = button(t("report"), "ffrs-report-button", function onReport() {
            showReportComposer(post);
          });
          reportButton.dataset.postId = String(post.postId);
          reportButton.prepend(element("span", "", "⚑"));
          post.toolbar.prepend(reportButton);
        }
      } else if (reportButton) {
        reportButton.remove();
      }

      var existingBadge = post.toolbar.querySelector(".ffrs-post-badge");
      var summary = state.postReports.get(post.postId);
      if (state.access && state.access.isStaff && summary && summary.count > 0) {
        if (!existingBadge) {
          existingBadge = button("", "ffrs-post-badge", function openPostReports() {
            showStaffPanel(post.postId, post.authorNickname);
          });
          post.toolbar.prepend(existingBadge);
        }
        existingBadge.textContent = t("reported") + " · " + summary.count;
        existingBadge.dataset.escalated = summary.escalatedCount > 0 ? "true" : "false";
      } else if (existingBadge) {
        existingBadge.remove();
      }
    });
  }

  function showReportComposer(post) {
    var modal = openDialog(
      t("reportTitle", {
        name:
          post.authorNickname ||
          (post.authorMid ? "#" + post.authorMid : "#" + post.postId),
      }),
    );
    var field = element("div", "ffrs-field");
    var label = element("label", "", t("reportReason"));
    label.htmlFor = "ffrs-reason";
    var textarea = element("textarea", "ffrs-textarea");
    textarea.id = "ffrs-reason";
    textarea.maxLength = state.config.maxReasonLength;
    textarea.placeholder = t("reportPlaceholder");
    var counter = element(
      "div",
      "ffrs-counter",
      t("counter", { current: 0, max: state.config.maxReasonLength }),
    );
    var error = element("div", "ffrs-error");
    error.setAttribute("role", "alert");
    field.append(label, textarea, counter, error);
    modal.body.append(field, element("p", "ffrs-hint", t("reportHint")));

    textarea.addEventListener("input", function updateCounter() {
      counter.textContent = t("counter", {
        current: textarea.value.length,
        max: state.config.maxReasonLength,
      });
      error.textContent = "";
    });

    var cancel = button(t("cancel"), "ffrs-button", closeDialog);
    var send = button(t("send"), "ffrs-button ffrs-button-primary", async function submit() {
      var reason = textarea.value.trim();
      if (
        reason.length < state.config.minReasonLength ||
        reason.length > state.config.maxReasonLength
      ) {
        error.textContent = t("reasonLength", {
          min: state.config.minReasonLength,
          max: state.config.maxReasonLength,
        });
        textarea.focus();
        return;
      }

      send.disabled = true;
      cancel.disabled = true;
      try {
        await api("createReport", {
          postId: post.postId,
          topicId: post.topicId,
          sectionId: post.sectionId,
          postUrl: post.postUrl,
          postAuthorMid: post.authorMid,
          postAuthorNickname: post.authorNickname,
          reason: reason,
        });
        state.ownReportedPostIds.add(post.postId);
        renderPosts();
        closeDialog();
        toast(t("sent"));
        if (state.access && state.access.isStaff) await refreshBootstrap();
      } catch (requestError) {
        error.textContent = requestError.message || t("genericError");
        send.disabled = false;
        cancel.disabled = false;
      }
    });
    modal.footer.append(cancel, send);
    textarea.focus();
  }

  function findMenuList() {
    return document.querySelector(
      ".menuwrap .menu .submenu.alternative ul,.menuwrap .menu ul.submenu,.menuwrap .menu>ul,header.header .menu>ul",
    );
  }

  function renderMenu() {
    var existing = document.querySelector(".ffrs-menu-item,.ffrs-menu-fallback");
    var notice = document.querySelector(".ffrs-mobile-notice");
    if (!state.access || !state.access.isStaff) {
      if (existing) existing.remove();
      if (notice) notice.remove();
      return;
    }

    var menuButton;
    if (!existing) {
      var list = findMenuList();
      if (list) {
        existing = element("li", "ffrs-menu-item");
        menuButton = button(t("reports"), "ffrs-menu-button", function openReports() {
          showStaffPanel();
        });
        existing.appendChild(menuButton);
        list.prepend(existing);
      } else {
        existing = button(t("reports"), "ffrs-menu-fallback", function openFallback() {
          showStaffPanel();
        });
        document.body.appendChild(existing);
        menuButton = existing;
      }
    } else {
      menuButton = existing.matches("button")
        ? existing
        : existing.querySelector(".ffrs-menu-button");
    }

    var count = menuButton.querySelector(".ffrs-menu-count");
    if (state.unreadCount > 0) {
      if (!count) {
        count = element("span", "ffrs-menu-count");
        menuButton.appendChild(count);
      }
      count.textContent = state.unreadCount > 99 ? "99+" : String(state.unreadCount);
      menuButton.setAttribute(
        "aria-label",
        t("reports") + ": " + state.unreadCount + " " + t("unread"),
      );
    } else if (count) {
      count.remove();
    }

    if (state.unreadCount > 0) {
      if (!notice) {
        notice = button("", "ffrs-mobile-notice", function openMobileReports() {
          showStaffPanel();
        });
        var header = document.querySelector("header.header");
        if (header) header.insertAdjacentElement("afterend", notice);
        else document.body.prepend(notice);
      }
      notice.textContent = t("mobileNotice", { count: state.unreadCount });
    } else if (notice) {
      notice.remove();
    }
  }

  function normalizeApiReport(report) {
    return {
      id: report.id,
      postId: Number(report.post_id),
      topicId: Number(report.topic_id),
      sectionId: Number(report.section_id),
      postUrl: report.post_url,
      postAuthorMid: report.post_author_mid ? Number(report.post_author_mid) : null,
      postAuthorNickname: report.post_author_nickname || "",
      reporterMid: Number(report.reporter_mid),
      reporterNickname: report.reporter_nickname || "",
      reporterRole: report.reporter_role || "member",
      reason: report.reason || "",
      status: report.status,
      queuePriority: Number(report.queue_priority),
      createdAt: report.created_at,
      isRead: Boolean(report.is_read),
    };
  }

  function statusLabel(status) {
    return t(status);
  }

  function statusSelection(select) {
    if (select.value === "active") return ["open", "escalated"];
    if (select.value === "all") {
      return state.access.isAdmin
        ? ["open", "escalated", "resolved", "archived"]
        : ["open", "escalated", "resolved"];
    }
    return [select.value];
  }

  async function showStaffPanel(postId, authorNickname) {
    var title = postId
      ? t("postBy", { name: authorNickname || "#" + postId })
      : t("reports");
    var modal = openDialog(title);
    var toolbar = element("div", "ffrs-toolbar");

    var statusField = element("div", "ffrs-field");
    var statusLabelNode = element("label", "", t("status"));
    var statusSelect = element("select", "ffrs-select");
    [
      ["active", t("allActive")],
      ["all", t("allStatuses")],
      ["open", t("open")],
      ["escalated", t("escalated")],
      ["resolved", t("resolved")],
    ].forEach(function addStatus(option) {
      var node = element("option", "", option[1]);
      node.value = option[0];
      statusSelect.appendChild(node);
    });
    if (state.access.isAdmin) {
      var archived = element("option", "", t("archived"));
      archived.value = "archived";
      statusSelect.appendChild(archived);
    }
    statusField.append(statusLabelNode, statusSelect);

    var sectionField = element("div", "ffrs-field");
    var sectionLabel = element("label", "", t("section"));
    var sectionInput = element("input", "ffrs-input");
    sectionInput.type = "number";
    sectionInput.min = "1";
    sectionInput.placeholder = t("allSections");
    sectionField.append(sectionLabel, sectionInput);

    var apply = button(t("apply"), "ffrs-button", function applyFilters() {
      state.list.statuses = statusSelection(statusSelect);
      state.list.sectionId = parsePositive(sectionInput.value);
      loadReportPage(true);
    });
    toolbar.append(statusField, sectionField, apply);

    var topActions = element("div", "ffrs-actions");
    var markAll = button(t("markAllRead"), "ffrs-button", async function markAllRead() {
      markAll.disabled = true;
      try {
        await api("markAllRead", {});
        state.unreadCount = 0;
        renderMenu();
        toast(t("markedRead"));
        await loadReportPage(true);
      } catch (error) {
        toast(error.message || t("genericError"), "error");
      } finally {
        markAll.disabled = false;
      }
    });
    var refresh = button(t("refresh"), "ffrs-button", function refreshReports() {
      loadReportPage(true);
    });
    topActions.append(markAll, refresh);
    if (state.access.isAdmin) {
      topActions.append(
        button(t("configuration"), "ffrs-button", function openConfiguration() {
          showConfiguration();
        }),
      );
    }

    var warning = element("p", "ffrs-warning", t("apiTrustWarning"));
    var list = element("div", "ffrs-report-list");
    var more = button(t("loadMore"), "ffrs-button");
    more.hidden = true;
    more.addEventListener("click", function nextPage() {
      loadReportPage(false);
    });

    modal.body.append(toolbar, topActions, warning, list, more);
    modal.footer.append(button(t("close"), "ffrs-button", closeDialog));
    state.list = {
      postId: postId || null,
      statuses: ["open", "escalated"],
      sectionId: null,
      cursor: null,
      items: [],
      container: list,
      moreButton: more,
    };
    await loadReportPage(true);
  }

  async function loadReportPage(reset) {
    if (!state.list) return;
    var currentList = state.list;
    if (reset) {
      currentList.cursor = null;
      currentList.items = [];
      currentList.container.replaceChildren(element("div", "ffrs-loading", t("loading")));
    }
    currentList.moreButton.disabled = true;

    try {
      var result = await api(currentList.postId ? "getPostReports" : "listReports", {
        postId: currentList.postId,
        sectionId: currentList.sectionId,
        statuses: currentList.statuses,
        cursor: currentList.cursor,
        limit: 20,
      });
      var incoming = (result.items || []).map(normalizeApiReport);
      currentList.items = reset ? incoming : currentList.items.concat(incoming);
      currentList.cursor = result.nextCursor || null;
      renderReportList(currentList);
    } catch (error) {
      currentList.container.replaceChildren(
        element("div", "ffrs-error", error.message || t("genericError")),
      );
    } finally {
      currentList.moreButton.disabled = false;
    }
  }

  function renderReportList(listState) {
    listState.container.replaceChildren();
    if (!listState.items.length) {
      listState.container.appendChild(element("div", "ffrs-empty", t("noReports")));
    } else {
      listState.items.forEach(function addCard(report) {
        listState.container.appendChild(reportCard(report));
      });
    }
    listState.moreButton.hidden = !listState.cursor;
  }

  function reportCard(report) {
    var card = element("article", "ffrs-report-card");
    card.dataset.status = report.status;
    card.dataset.read = report.isRead ? "true" : "false";

    var summary = button("", "ffrs-card-summary");
    summary.setAttribute("aria-expanded", "false");
    var main = element("div");
    var title = element(
      "p",
      "ffrs-card-title",
      t("reportedBy", {
        name: report.reporterNickname || "#" + report.reporterMid,
      }),
    );
    var meta = element("div", "ffrs-card-meta");
    meta.append(
      element("span", "ffrs-status", statusLabel(report.status)),
      element("span", "", "FID " + report.sectionId),
      element("span", "", new Date(report.createdAt).toLocaleString(state.locale)),
    );
    main.append(title, meta);
    summary.append(main, element("span", "", "⌄"));

    var detail = element("div", "ffrs-card-detail");
    detail.hidden = true;
    detail.append(
      element("div", "ffrs-reason", report.reason),
      element(
        "p",
        "ffrs-hint",
        t("postBy", {
          name: report.postAuthorNickname || "#" + (report.postAuthorMid || report.postId),
        }),
      ),
    );
    var actions = element("div", "ffrs-actions");
    var postLink = element("a", "ffrs-button", t("openPost"));
    postLink.href = report.postUrl;
    postLink.target = "_blank";
    postLink.rel = "noopener";
    actions.appendChild(postLink);

    if (state.access.permissions.escalate && report.status === "open") {
      actions.appendChild(
        transitionButton(report, "escalate", t("escalate"), "ffrs-button-warning"),
      );
    }
    if (
      state.access.permissions.resolve &&
      (report.status === "open" || report.status === "escalated")
    ) {
      actions.appendChild(
        transitionButton(report, "resolve", t("resolve"), "ffrs-button-success"),
      );
    }
    if (state.access.permissions.reopen && report.status === "resolved") {
      actions.appendChild(
        transitionButton(report, "reopen", t("reopen"), "ffrs-button-primary"),
      );
    }
    if (state.access.permissions.archive && report.status !== "archived") {
      actions.appendChild(
        transitionButton(report, "archive", t("archive"), "ffrs-button-danger"),
      );
    }
    detail.appendChild(actions);

    summary.addEventListener("click", async function toggleDetail() {
      var opening = detail.hidden;
      detail.hidden = !opening;
      summary.setAttribute("aria-expanded", opening ? "true" : "false");
      if (opening && !report.isRead) {
        try {
          await api("markRead", { reportIds: [report.id] });
          report.isRead = true;
          card.dataset.read = "true";
          state.unreadCount = Math.max(0, state.unreadCount - 1);
          renderMenu();
        } catch (error) {
          toast(error.message || t("genericError"), "error");
        }
      }
    });

    card.append(summary, detail);
    return card;
  }

  function transitionButton(report, action, label, extraClass) {
    return button(label, "ffrs-button " + extraClass, async function runTransition(event) {
      event.stopPropagation();
      if (!global.confirm(t("confirm" + action.charAt(0).toUpperCase() + action.slice(1)))) {
        return;
      }
      event.currentTarget.disabled = true;
      try {
        await api(action, { reportId: report.id });
        toast(t("updated"));
        await refreshBootstrap();
        await loadReportPage(true);
      } catch (error) {
        toast(error.message || t("genericError"), "error");
        event.currentTarget.disabled = false;
      }
    });
  }

  function parseSectionIds(value) {
    var text = String(value || "").trim();
    if (!text) return [];
    var parts = text.split(",").map(function parsePart(item) {
      return parsePositive(item.trim());
    });
    if (parts.some(function invalid(item) { return !item; })) return null;
    return Array.from(new Set(parts)).sort(function sort(a, b) { return a - b; });
  }

  function apiGroupRules() {
    var rules =
      state.configuration && Array.isArray(state.configuration.groupRules)
        ? state.configuration.groupRules
        : [];
    return rules.map(function normalizeRule(rule) {
      return {
        groupId: Number(rule.forum_group_id || rule.groupId),
        name: rule.group_name || rule.name || "",
        sectionIds: rule.section_ids || rule.sectionIds || [],
        enabled: rule.enabled !== false,
      };
    });
  }

  function apiModeratorScopes() {
    var scopes =
      state.configuration && Array.isArray(state.configuration.moderatorScopes)
        ? state.configuration.moderatorScopes
        : [];
    return scopes.map(function normalizeScope(scope) {
      return {
        mid: Number(scope.moderator_mid || scope.mid),
        nickname: scope.moderator_nickname || scope.nickname || "",
        sectionIds: scope.section_ids || scope.sectionIds || [],
      };
    });
  }

  function showConfiguration(activeTab) {
    var modal = openDialog(t("configuration"));
    var tabs = element("div", "ffrs-tabs");
    tabs.setAttribute("role", "tablist");
    var groupTab = button(t("groups"), "ffrs-tab");
    var moderatorTab = button(t("moderators"), "ffrs-tab");
    groupTab.setAttribute("role", "tab");
    moderatorTab.setAttribute("role", "tab");
    tabs.append(groupTab, moderatorTab);
    var panel = element("div");
    modal.body.append(tabs, panel);
    modal.footer.append(button(t("close"), "ffrs-button", closeDialog));

    function renderTab(tab) {
      groupTab.setAttribute("aria-selected", tab === "groups" ? "true" : "false");
      moderatorTab.setAttribute("aria-selected", tab === "moderators" ? "true" : "false");
      panel.replaceChildren();
      if (tab === "groups") renderGroupConfiguration(panel);
      else renderModeratorConfiguration(panel);
    }
    groupTab.addEventListener("click", function groups() { renderTab("groups"); });
    moderatorTab.addEventListener("click", function moderators() { renderTab("moderators"); });
    renderTab(activeTab || "groups");
  }

  function renderGroupConfiguration(panel) {
    panel.appendChild(element("p", "ffrs-hint", t("groupHelp")));
    var existing = new Map(
      apiGroupRules().map(function pair(rule) { return [rule.groupId, rule]; }),
    );
    var source = Array.isArray(global.boardGroups)
      ? global.boardGroups
          .map(function fromBoard(group) {
            return { groupId: Number(group.id), name: String(group.name || "") };
          })
          .filter(function valid(group) { return group.groupId > 0; })
      : [];
    existing.forEach(function addMissing(rule, groupId) {
      if (!source.some(function has(group) { return group.groupId === groupId; })) {
        source.push({ groupId: groupId, name: rule.name });
      }
    });
    source.sort(function sort(a, b) { return a.groupId - b.groupId; });

    var rows = element("div");
    var listedGroupIds = new Set();
    function addGroupRow(group, enableNew) {
      if (!group.groupId || listedGroupIds.has(group.groupId)) return false;
      listedGroupIds.add(group.groupId);
      var saved = existing.get(group.groupId);
      var row = element("div", "ffrs-config-row");
      row.dataset.groupId = String(group.groupId);
      var enabled = element("input");
      enabled.type = "checkbox";
      enabled.checked = Boolean((saved && saved.enabled) || enableNew);
      enabled.setAttribute("aria-label", t("enabled") + " " + group.name);
      var name = element("input", "ffrs-input");
      name.value = (saved && saved.name) || group.name;
      name.setAttribute("aria-label", t("groupName"));
      var sections = element("input", "ffrs-input");
      sections.value = saved ? saved.sectionIds.join(",") : "";
      sections.placeholder = "12,34,56";
      sections.setAttribute("aria-label", t("sectionIds"));
      row.append(enabled, name, sections);
      rows.appendChild(row);
      return true;
    }
    source.forEach(function addGroup(group) {
      addGroupRow(group, false);
    });

    var error = element("div", "ffrs-error");
    var addControls = element("div", "ffrs-actions");
    var groupId = element("input", "ffrs-input");
    groupId.type = "number";
    groupId.min = "1";
    groupId.placeholder = t("groupId");
    groupId.setAttribute("aria-label", t("groupId"));
    var add = button(t("addGroup"), "ffrs-button", function addManualGroup() {
      var parsedGroupId = parsePositive(groupId.value);
      if (
        !parsedGroupId ||
        !addGroupRow(
          { groupId: parsedGroupId, name: t("groupName") + " " + parsedGroupId },
          true,
        )
      ) {
        error.textContent = t("invalidGroup");
        return;
      }
      groupId.value = "";
      error.textContent = "";
    });
    addControls.append(groupId, add);

    var save = button(t("save"), "ffrs-button ffrs-button-primary", async function saveGroups() {
      var rules = [];
      var invalid = false;
      rows.querySelectorAll(".ffrs-config-row").forEach(function readRow(row) {
        var inputs = row.querySelectorAll("input");
        if (!inputs[0].checked) return;
        var sectionIds = parseSectionIds(inputs[2].value);
        if (!sectionIds || !sectionIds.length || !inputs[1].value.trim()) {
          invalid = true;
          return;
        }
        rules.push({
          groupId: Number(row.dataset.groupId),
          name: inputs[1].value.trim(),
          sectionIds: sectionIds,
          enabled: true,
        });
      });
      if (invalid) {
        error.textContent = t("invalidSections");
        return;
      }
      save.disabled = true;
      try {
        var result = await api("saveGroupRules", { rules: rules });
        state.configuration.groupRules = result.groupRules;
        toast(t("saved"));
        await refreshBootstrap();
        showConfiguration("groups");
      } catch (requestError) {
        error.textContent = requestError.message || t("genericError");
        save.disabled = false;
      }
    });
    panel.append(rows, addControls, error, save);
  }

  function renderModeratorConfiguration(panel) {
    panel.appendChild(element("p", "ffrs-hint", t("moderatorHelp")));
    var rows = element("div");

    function addRow(scope) {
      var row = element("div", "ffrs-config-row");
      var mid = element("input", "ffrs-input");
      mid.type = "number";
      mid.min = "1";
      mid.placeholder = t("mid");
      mid.value = scope && scope.mid ? String(scope.mid) : "";
      var nickname = element("input", "ffrs-input");
      nickname.placeholder = t("nickname");
      nickname.value = (scope && scope.nickname) || "";
      var sections = element("input", "ffrs-input");
      sections.placeholder = "12,34,56";
      sections.value = scope ? scope.sectionIds.join(",") : "";
      var remove = button(t("remove"), "ffrs-button ffrs-button-danger", function removeRow() {
        row.remove();
      });
      row.append(mid, nickname, sections, remove);
      rows.appendChild(row);
    }

    apiModeratorScopes().forEach(addRow);
    var add = button(t("addModerator"), "ffrs-button", function addModerator() {
      addRow(null);
    });
    var error = element("div", "ffrs-error");
    var save = button(
      t("save"),
      "ffrs-button ffrs-button-primary",
      async function saveModerators() {
        var scopes = [];
        var invalid = false;
        rows.querySelectorAll(".ffrs-config-row").forEach(function readRow(row) {
          var inputs = row.querySelectorAll("input");
          var mid = parsePositive(inputs[0].value);
          var sectionIds = parseSectionIds(inputs[2].value);
          if (!mid || !sectionIds || !sectionIds.length) {
            invalid = true;
            return;
          }
          scopes.push({
            mid: mid,
            nickname: inputs[1].value.trim(),
            sectionIds: sectionIds,
          });
        });
        if (invalid) {
          error.textContent = t("invalidModerator");
          return;
        }
        save.disabled = true;
        try {
          var result = await api("saveModeratorScopes", { scopes: scopes });
          state.configuration.moderatorScopes = result.moderatorScopes;
          toast(t("saved"));
          await refreshBootstrap();
          showConfiguration("moderators");
        } catch (requestError) {
          error.textContent = requestError.message || t("genericError");
          save.disabled = false;
        }
      },
    );
    panel.append(rows, add, error, save);
  }

  async function refreshBootstrap() {
    var postIds = currentPosts().map(function postId(post) {
      return Number(post.id.replace(/^ee/, ""));
    });
    var data = await api("bootstrap", { postIds: postIds });
    state.access = data.access;
    state.ownReportedPostIds = new Set(data.ownReportedPostIds || []);
    state.postReports = new Map(
      (data.postReports || []).map(function postSummary(item) {
        return [
          Number(item.postId),
          {
            count: Number(item.count || 0),
            escalatedCount: Number(item.escalatedCount || 0),
          },
        ];
      }),
    );
    state.unreadCount = Number(data.unreadCount || 0);
    state.configuration = data.configuration || state.configuration || {
      groupRules: [],
      moderatorScopes: [],
    };
    renderPosts();
    renderMenu();
  }

  function observePosts() {
    var topic = document.querySelector(".topic");
    if (!topic || typeof MutationObserver === "undefined") return;
    state.observer = new MutationObserver(function onMutation() {
      global.clearTimeout(state.mutationTimer);
      state.mutationTimer = global.setTimeout(renderPosts, 50);
    });
    state.observer.observe(topic, { childList: true, subtree: true });
  }

  async function init() {
    if (state.initialized) return;
    state.config = Object.assign({}, DEFAULTS, global.FFReportingConfig || {});
    state.config.includedSections = (state.config.includedSections || [])
      .map(parsePositive)
      .filter(Boolean);
    state.config.excludedSections = (state.config.excludedSections || [])
      .map(parsePositive)
      .filter(Boolean);
    state.config.excludedAuthorGroupIds = (state.config.excludedAuthorGroupIds || [])
      .map(parsePositive)
      .filter(Boolean);
    var requestedMax = parsePositive(state.config.maxReasonLength) || 300;
    state.config.maxReasonLength = Math.max(5, Math.min(requestedMax, 300));
    var requestedMin = parsePositive(state.config.minReasonLength) || 5;
    state.config.minReasonLength = Math.max(
      5,
      Math.min(requestedMin, state.config.maxReasonLength),
    );
    state.locale = detectLocale(state.config);
    state.context = buildContext(state.config);
    state.initialized = true;
    injectStyles();

    if (state.context.isGuest) {
      log("Guest page: reporting disabled");
      return;
    }
    if (!state.config.supabaseUrl || !state.config.supabasePublishableKey) {
      console.warn("[FF Reporting] " + t("configMissing"));
      toast(t("configMissing"), "error");
      return;
    }

    try {
      await refreshBootstrap();
      observePosts();
    } catch (error) {
      console.error("[FF Reporting] bootstrap failed", error);
      toast(error.message || t("genericError"), "error");
    }
  }

  function destroy() {
    if (state.observer) state.observer.disconnect();
    global.clearTimeout(state.mutationTimer);
    document
      .querySelectorAll(
        ".ffrs-report-button,.ffrs-post-badge,.ffrs-menu-item,.ffrs-menu-fallback,.ffrs-mobile-notice,.ffrs-dialog-root,.ffrs-toast-region",
      )
      .forEach(function remove(node) { node.remove(); });
    var styles = document.getElementById(STYLE_ID);
    if (styles) styles.remove();
    document.body.classList.remove("ffrs-modal-open");
    state.initialized = false;
    state.access = null;
    state.modal = null;
    state.observer = null;
  }

  global.FFReportingSystem = {
    init: init,
    destroy: destroy,
    refresh: refreshBootstrap,
    getState: function getState() {
      return {
        initialized: state.initialized,
        context: state.context,
        access: state.access,
        unreadCount: state.unreadCount,
        ownReportedPostIds: Array.from(state.ownReportedPostIds),
      };
    },
  };

  var initialConfig = Object.assign({}, DEFAULTS, global.FFReportingConfig || {});
  if (initialConfig.autoInit !== false) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
  }
})(window);
