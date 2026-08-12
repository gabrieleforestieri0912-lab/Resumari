/* ===== Resumari side panel — standalone app =====
 * The panel lives entirely inside the extension (no dependency on the site's
 * Next.js build). It talks to the real backend over the absolute API base and
 * shares auth with the site through chrome.storage.local (resumariAuth), the
 * same key the content script mirrors from the site. */
(function () {
  "use strict";

  /* Build-time replaced base (scripts/build-extension.js replaces the marker
   * with the real backend URL). Falls back to the local dev server. */
  var API_BASE = "__RESUMARI_API_BASE__";
  if (API_BASE.indexOf("__RESUMARI") === 0) API_BASE = "http://localhost:3000";

  var AUTH_KEY = "resumariAuth";
  var LOGGED_OUT_KEY = "resumariLoggedOut";
  var PENDING_KEY = "pendingTranscript";
  var THEME_KEY = "resumariTheme";
  var YT_THEME_KEY = "resumariYoutubeTheme";

  var state = {
    user: null,
    token: null,
    credits: null,
    transcripts: [],
    selected: null,
    query: "",
    usage: null,
    chat: [], // [{ role: "user" | "ai", text, time }]
    chatTyping: false,
    chatContext: null, // { videoId, title } set from a transcript detail
    loginMode: "password", // password | code
    loginStep: "email", // code sub-step: email | code
    theme: "auto", // auto | light | dark
    youtubeTheme: null, // last known YouTube theme from content.js
    onYoutube: false, // is the active tab a YouTube page?
  };

  var CHAT_KEY = "resumari_panel_chat";

  /* ---------- tiny DOM helpers ---------- */
  function $(id) { return document.getElementById(id); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
        else if (k === "onclick") node.addEventListener("click", attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (!c) return;
      if (typeof c === "string") {
        // Strings that look like markup (inline SVG icons) are parsed as HTML
        // so they render as icons; a plain createTextNode would show the raw
        // '<svg …>' code as visible text in the panel.
        if (/^\s*</.test(c)) {
          var tpl = document.createElement("template");
          tpl.innerHTML = c;
          node.appendChild(tpl.content);
        } else {
          node.appendChild(document.createTextNode(c));
        }
      } else {
        node.appendChild(c);
      }
    });
    return node;
  }

  function show(id) { $(id).hidden = false; }
  function hide(id) { $(id).hidden = true; }

  function toast(text) {
    var t = $("toast");
    t.textContent = text;
    t.hidden = false;
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.hidden = true; }, 2000);
  }

  /* ---------- auth helpers ---------- */
  function authFetch(path, init) {
    var headers = Object.assign({ "Content-Type": "application/json" }, (init && init.headers) || {});
    if (state.token) headers["Authorization"] = "Bearer " + state.token;
    return fetch(API_BASE + path, Object.assign({}, init, { headers: headers }));
  }

  function storageGet(key) {
    return new Promise(function (resolve) {
      try {
        chrome.storage.local.get(key, function (res) { resolve(res && res[key]); });
      } catch (e) { resolve(null); }
    });
  }

  function storageSet(obj) {
    try { chrome.storage.local.set(obj); } catch (e) { /* ignore */ }
  }

  function storageRemove(key) {
    try { chrome.storage.local.remove(key); } catch (e) { /* ignore */ }
  }

  function saveLocal() {
    try {
      localStorage.setItem("token", state.token);
      localStorage.setItem("user", JSON.stringify(state.user));
    } catch (e) { /* ignore */ }
  }

  function clearLocal() {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch (e) { /* ignore */ }
  }

  /* ---------- format helpers ---------- */
  function formatTime(seconds) {
    var s = Math.max(0, Math.floor(seconds || 0));
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (h > 0) return h + ":" + String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
    return m + ":" + String(sec).padStart(2, "0");
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" });
    } catch (e) { return ""; }
  }

  function formatDateTime(iso) {
    try {
      return new Date(iso).toLocaleDateString("it-IT", {
        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
      });
    } catch (e) { return ""; }
  }

  function wordCount(transcript) {
    return (transcript || []).reduce(function (n, l) {
      return n + (l.text || "").split(/\s+/).filter(Boolean).length;
    }, 0);
  }

  function transcriptToText(transcript) {
    return (transcript || [])
      .map(function (line) { return "[" + formatTime(line.time != null ? line.time : line.start || 0) + "] " + line.text; })
      .join("\n");
  }

  function thumbnail(videoId, existing) {
    return existing || ("https://img.youtube.com/vi/" + videoId + "/hqdefault.jpg");
  }

  // MUST stay in sync with src/lib/credits.ts (PLAN_LIMITS) — the standalone
  // panel can't import the server module, so it duplicates the values.
  var PLAN_LIMITS = { free: 10, pro: 1000, business: 3000 };
  var PLAN_NAMES = { free: "Starter", pro: "Pro Pack", business: "Business" };

  /* ---------- view switching ---------- */
  function showView(name) {
    hide("view-loading");
    hide("view-login");
    hide("view-app");
    show("view-" + name);
  }

  function switchTab(tab) {
    var tabs = ["transcripts", "chat", "account", "usage"];
    tabs.forEach(function (t) {
      var m = $("tab-" + t);
      if (m) m.classList.toggle("tab--active", t === tab);
    });
    document.querySelectorAll(".nav__item").forEach(function (btn) {
      btn.classList.toggle("nav__item--active", btn.getAttribute("data-tab") === tab);
    });
    if (tab === "account") renderAccount();
    if (tab === "usage") loadUsage();
    if (tab === "chat") {
      renderChat();
      setTimeout(function () { var i = $("chat-input"); if (i) i.focus(); }, 60);
    }
  }

  /* ---------- auth: bootstrap ---------- */
  function bootstrap() {
    // A logout from the panel is sticky: while resumariLoggedOut is set, any
    // token the site mirrors back into chrome.storage (e.g. a still-open
    // NextAuth session re-synced by the content script) is ignored, so the
    // panel stays on the login page until the user logs in again explicitly.
    storageGet(LOGGED_OUT_KEY).then(function (loggedOut) {
      if (loggedOut) {
        clearLocal();
        storageRemove(AUTH_KEY);
        showView("login");
        return;
      }
      adoptStoredAuth();
    });
  }

  function adoptStoredAuth() {
    var shared = null;
    storageGet(AUTH_KEY).then(function (auth) {
      shared = auth;
      var token = (shared && shared.token) || localStorage.getItem("token");
      var storedUser = localStorage.getItem("user");
      if (!token) {
        showView("login");
        return;
      }
      // Validate the token against the backend.
      state.token = token;
      fetch(API_BASE + "/api/profile", { headers: { Authorization: "Bearer " + token } })
        .then(function (res) {
          if (!res.ok) {
            // Invalid token: clear everywhere.
            clearLocal();
            storageRemove(AUTH_KEY);
            state.token = null;
            showView("login");
            return;
          }
          return res.json().then(function (data) {
            // Re-check the shared auth didn't change while validating.
            return storageGet(AUTH_KEY).then(function (still) {
              if (shared && still && still.token !== token) return;
              state.user = data;
              state.token = token;
              state.credits = typeof data.credits === "number" ? data.credits : null;
              saveLocal();
              storageSet({ [AUTH_KEY]: { token: token, user: data } });
              enterApp();
            });
          });
        })
        .catch(function () {
          // Offline: keep the cached session so the panel still opens.
          if (storedUser) {
            try { state.user = JSON.parse(storedUser); state.token = token; enterApp(); return; } catch (e) {}
          }
          showView("login");
        });
    });
  }

  function enterApp() {
    showView("app");
    renderHeader();
    loadChat();
    switchTab("transcripts");
    loadTranscripts();
    processPendingVideo();
  }

  function renderHeader() {
    var name = (state.user && (state.user.name || (state.user.email || "").split("@")[0])) || "Utente";
    $("app-user").textContent = name;
    $("credits-value").textContent = state.credits != null ? state.credits : "…";
  }

  /* ---------- pending video (from YouTube button / shortcut) ---------- */
  // Keep the pending video until it has been transcribed AND saved: on failure
  // it stays in storage so the next panel open (or a new Trascrivi click on
  // YouTube) retries instead of silently losing the request.
  function processPendingVideo() {
    storageGet(PENDING_KEY).then(function (p) {
      if (!p || !p.videoId || !p.autoProcess) return;
      transcribeVideo(p.videoId);
    });
  }

  function transcribeVideo(videoId) {
    var content = $("tx-content");
    content.innerHTML = "";
    content.appendChild(
      el("div", { class: "tx-empty" }, [
        el("div", { class: "spinner", style: "margin:0 auto 12px" }),
        el("p", { class: "muted", text: "Trascrizione in corso…" }),
      ]),
    );
    authFetch("/api/video", {
      method: "POST",
      body: JSON.stringify({ videoUrl: "https://youtube.com/watch?v=" + videoId }),
    })
      .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, d: d }; }); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.d.message || "Impossibile trascrivere il video");
        var data = r.d;
        return authFetch("/api/transcripts", {
          method: "POST",
          body: JSON.stringify({
            videoId: data.videoId || videoId,
            title: data.title || "Video",
            channel: data.channelTitle || "Canale sconosciuto",
            thumbnail: data.thumbnail || null,
            transcript: data.transcript || [],
            language: data.transcriptLanguage || null,
            isGenerated: data.transcriptLanguage === "generated",
            durationSec: 0,
            creditsUsed: 1,
          }),
        }).then(function (sres) {
          return sres.json().then(function (saved) {
            if (!sres.ok) throw new Error(saved.message || "Errore nel salvataggio");
            return saved;
          });
        });
      })
      .then(function (saved) {
        refreshCredits();
        // Only drop the pending marker once the transcript is safely saved, so
        // a failed attempt can be retried on the next panel open.
        storageRemove(PENDING_KEY);
        // prepend and open
        state.transcripts = [saved].concat(
          state.transcripts.filter(function (t) { return t.video_id !== saved.video_id; }),
        );
        openTranscript(saved);
      })
      .catch(function (e) {
        renderTranscripts();
        toast(e.message || "Errore di rete. Riprova.");
      });
  }

  function refreshCredits() {
    authFetch("/api/profile").then(function (res) {
      if (!res.ok) return;
      res.json().then(function (data) {
        state.credits = typeof data.credits === "number" ? data.credits : null;
        $("credits-value").textContent = state.credits != null ? state.credits : "…";
        if ($("acc-credits")) renderAccountCredits();
      });
    }).catch(function () {});
  }

  /* ---------- transcripts ---------- */
  function loadTranscripts() {
    var content = $("tx-content");
    content.innerHTML = "";
    content.appendChild(
      el("div", { class: "tx-empty" }, [
        el("div", { class: "spinner", style: "margin:0 auto 12px" }),
        el("p", { class: "muted", text: "Caricamento trascrizioni…" }),
      ]),
    );
    authFetch("/api/transcripts")
      .then(function (res) {
        if (res.status === 401) return [];
        return res.json().then(function (d) { return Array.isArray(d) ? d : []; });
      })
      .then(function (list) {
        // If a transcript was saved while this GET was in flight (pending video
        // flow), keep it on top instead of being overwritten by a stale list.
        if (state.selected) {
          var hasSelected = list.some(function (t) { return t.id === state.selected.id; });
          if (!hasSelected) list = [state.selected].concat(list);
        }
        state.transcripts = list;
        renderTranscripts();
      })
      .catch(function () {
        state.transcripts = [];
        renderTranscripts();
      });
  }

  function filteredTranscripts() {
    var q = state.query.trim().toLowerCase();
    if (!q) return state.transcripts;
    return state.transcripts.filter(function (t) {
      return (
        (t.title || "").toLowerCase().indexOf(q) !== -1 ||
        (t.channel || "").toLowerCase().indexOf(q) !== -1
      );
    });
  }

  function renderTranscripts() {
    var content = $("tx-content");
    content.innerHTML = "";
    var list = filteredTranscripts();

    if (list.length === 0) {
      content.appendChild(
        el("div", { class: "tx-empty" }, [
          el("div", { class: "tx-empty__card" }, [
            el("p", { class: "tx-empty__label", text: "Raccolta trascrizioni" }),
            el("p", { class: "tx-empty__title", text: "Nessuna trascrizione" }),
            el("p", { class: "tx-empty__text", text: "Apri un video su YouTube e premi Trascrivi: la trascrizione verrà raccolta qui, pronta da consultare e riassumere." }),
            el("button", { class: "btn--white", onclick: openYoutube }, [
              '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg> Vai su YouTube',
            ]),
          ]),
          el("p", { class: "muted", text: state.query ? 'Nessun risultato per "' + state.query + '"' : "" }),
        ]),
      );
      return;
    }

    content.appendChild(
      el("div", { class: "tx-count", text: list.length + (list.length === 1 ? " trascrizione" : " trascrizioni") }),
    );

    list.forEach(function (item) {
      var card = el("button", { class: "tx-card", onclick: function () { openTranscript(item); } }, [
        el("div", { class: "tx-card__thumb" }, [
          el("img", { src: thumbnail(item.video_id, item.thumbnail), alt: "" }),
          item.is_generated ? el("span", { class: "tx-card__badge", text: "AI" }) : null,
        ]),
        el("div", { class: "tx-card__body" }, [
          el("p", { class: "tx-card__title", text: item.title }),
          el("p", { class: "tx-card__channel", text: item.channel || "Canale sconosciuto" }),
          el("div", { class: "tx-card__meta" }, [
            el("span", { text: formatDate(item.created_at) }),
            el("span", { class: "tx-card__dot" }),
            el("span", { text: wordCount(item.transcript) + " parole" }),
          ]),
        ]),
      ]);
      content.appendChild(card);
    });
  }

  function openTranscript(item) {
    state.selected = item;
    renderDetail();
  }

  function closeDetail() {
    state.selected = null;
    hide("tx-detail");
    show("tx-list");
  }

  function renderDetail() {
    var item = state.selected;
    if (!item) return;
    hide("tx-list");
    var detail = $("tx-detail");
    detail.innerHTML = "";
    detail.appendChild(
      el("div", { class: "tx-detail__header" }, [
        el("button", { class: "icon-btn", title: "Indietro", "aria-label": "Indietro", onclick: closeDetail }, [
          '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
        ]),
        el("div", {}, [
          el("p", { class: "tx-detail__title", text: item.title }),
          el("p", { class: "tx-detail__channel", text: item.channel || "Canale sconosciuto" }),
        ]),
      ]),
    );

    // Thumbnail
    detail.appendChild(
      el("div", { class: "thumb" }, [
        el("img", { src: thumbnail(item.video_id, item.thumbnail), alt: item.title }),
        el("div", { class: "thumb__shade" }),
        el("div", { class: "thumb__badges" }, [
          item.is_generated ? el("span", { class: "thumb__badge thumb__badge--amber", text: "AI" }) : null,
          el("span", { class: "thumb__badge", text: wordCount(item.transcript) + " parole" }),
        ]),
        el("div", { class: "thumb__meta" }, [
          el("span", { text: formatDate(item.created_at) }),
          item.language ? el("span", { text: "Lingua: " + item.language }) : null,
        ]),
      ]),
    );

    // Actions
    detail.appendChild(
      el("div", { class: "actions" }, [
        el("button", { class: "action action--dark", id: "detail-copy", onclick: handleCopy }, [
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
          el("span", { text: "Copia trascrizione" }),
        ]),
        el("button", { class: "action action--gradient", id: "detail-summarize", onclick: handleSummarize }, [
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg>',
          el("span", { text: "Riassumi con IA" }),
        ]),
        el("button", { class: "action action--ghost", id: "detail-chat", onclick: function () { startChatWithTranscript(item); } }, [
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
          el("span", { text: "Chiedi in chat" }),
        ]),
      ]),
    );
    detail.appendChild(
      el("div", { class: "actions__row" }, [
        el("a", { class: "action action--open", href: "https://www.youtube.com/watch?v=" + item.video_id, target: "_blank", rel: "noopener noreferrer" }, [
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/><path d="m10 15 5-3-5-3z"/></svg> Apri su YouTube',
        ]),
        el("button", { class: "action action--danger", id: "detail-delete", onclick: handleDelete }, [
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Elimina',
        ]),
      ]),
    );

    // Transcript
    if (item.transcript && item.transcript.length > 0) {
      var body = el("div", { class: "tx-transcript__body" });
      item.transcript.forEach(function (line) {
        body.appendChild(
          el("div", { class: "tx-line" }, [
            el("span", { class: "tx-line__time", text: formatTime(line.time != null ? line.time : line.start || 0) }),
            el("span", { text: line.text }),
          ]),
        );
      });
      detail.appendChild(
        el("div", { class: "tx-transcript" }, [
          el("p", { class: "tx-transcript__head", text: "Trascrizione completa" }),
          body,
        ]),
      );
    } else {
      detail.appendChild(
        el("div", { class: "tx-empty-box" }, [
          el("p", { text: "Nessuna trascrizione disponibile" }),
          el("p", { text: "Questo video non ha sottotitoli automatici abilitati." }),
        ]),
      );
    }

    show("tx-detail");
  }

  function handleCopy() {
    var item = state.selected;
    if (!item) return;
    navigator.clipboard.writeText(transcriptToText(item.transcript)).then(function () {
      var btn = $("detail-copy");
      if (!btn) return;
      btn.classList.add("action--copied");
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copiato!';
      setTimeout(function () {
        if ($("detail-copy")) {
          $("detail-copy").classList.remove("action--copied");
          $("detail-copy").innerHTML =
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copia trascrizione';
        }
      }, 1600);
    }).catch(function () {
      toast("Impossibile copiare");
    });
  }

  function handleSummarize() {
    var item = state.selected;
    if (!item) return;
    var btn = $("detail-summarize");
    var original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn__mini-spinner"></span> Riassumo…';
    authFetch("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({
        message:
          "Fai un riassunto conciso e strutturato in punti chiave di questo video, in italiano. Rispondi in testo semplice, senza usare formattazione Markdown (niente asterischi, hashtag o caratteri speciali).",
        videoId: item.video_id,
      }),
    })
      .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, d: d }; }); })
      .then(function (r) {
        if (!r.ok) throw new Error(r.d.message || "Errore durante il riassunto");
        refreshCredits();
        var detail = $("tx-detail");
        // Remove any previous summary so repeated summaries never stack.
        var old = detail.querySelector(".summary");
        if (old) old.remove();
        var summary = el("div", { class: "summary" }, [
          el("p", { class: "summary__label" }, [
            '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg> Riepilogo IA',
          ]),
          el("p", { class: "summary__text", text: r.d.response }),
          el("button", { class: "summary__hide", text: "Nascondi", onclick: function () { summary.remove(); } }),
        ]);
        detail.insertBefore(summary, detail.querySelector(".tx-transcript") || detail.lastChild);
      })
      .catch(function (e) {
        toast(e.message || "Errore di rete");
      })
      .finally(function () {
        btn.disabled = false;
        if ($("detail-summarize")) btn.innerHTML = original;
      });
  }

  function handleDelete() {
    var item = state.selected;
    if (!item) return;
    var btn = $("detail-delete");
    btn.disabled = true;
    authFetch("/api/transcripts/" + item.id, { method: "DELETE" })
      .then(function (res) {
        if (!res.ok) throw new Error("Errore nell'eliminazione");
        state.transcripts = state.transcripts.filter(function (t) { return t.id !== item.id; });
        closeDetail();
        renderTranscripts();
      })
      .catch(function (e) { toast(e.message); btn.disabled = false; });
  }

  /* ---------- chat ---------- */
  function loadChat() {
    try {
      var raw = localStorage.getItem(CHAT_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed.messages)) state.chat = parsed.messages;
        if (parsed.context) state.chatContext = parsed.context;
      }
    } catch (e) { /* ignore corrupt storage */ }
  }

  function saveChat() {
    try {
      localStorage.setItem(CHAT_KEY, JSON.stringify({ messages: state.chat, context: state.chatContext }));
    } catch (e) { /* ignore */ }
  }

  // Tiny safe markdown renderer (escaping first). Supports the subset the AI
  // actually emits: code fences, headings, lists, bold, italic, inline code,
  // links, blockquotes and paragraphs.
  function mdToHtml(text) {
    var html = String(text || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

    // Code fences first (their content stays escaped verbatim).
    var fences = [];
    html = html.replace(/```([^`]*?)```/gs, function (_, code) {
      fences.push(code);
      return "@@CODE" + (fences.length - 1) + "@@";
    });

    var lines = html.split("\n");
    var out = [];
    var listType = null; // "ul" | "ol"
    var inQuote = false;
    function closeList() {
      if (listType) { out.push("</" + listType + ">"); listType = null; }
    }
    function closeQuote() {
      if (inQuote) { out.push("</blockquote>"); inQuote = false; }
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var m;
      if (m = line.match(/^#{1,3}\s+(.*)$/)) {
        closeList(); closeQuote();
        var h = m[1].replace(/<\/?h[1-3]>/g, "");
        out.push("<h" + m[0].split(" ")[0].length + ">" + h + "</h" + m[0].split(" ")[0].length + ">");
      } else if (m = line.match(/^[-*]\s+(.*)$/)) {
        closeQuote();
        if (listType !== "ul") { closeList(); out.push("<ul>"); listType = "ul"; }
        out.push("<li>" + m[1] + "</li>");
      } else if (m = line.match(/^\d+\.\s+(.*)$/)) {
        closeQuote();
        if (listType !== "ol") { closeList(); out.push("<ol>"); listType = "ol"; }
        out.push("<li>" + m[1] + "</li>");
      } else if (line.indexOf("> ") === 0) {
        closeList();
        if (!inQuote) { out.push("<blockquote>"); inQuote = true; }
        out.push(mdInline(line.slice(2)));
      } else if (line.replace(/@@CODE\d+@@/g, "").trim() === "") {
        // blank line (or a code placeholder alone)
        var ph = line.match(/^@@CODE(\d+)@@$/);
        if (ph) {
          closeList(); closeQuote();
          out.push("<pre><code>" + fences[Number(ph[1])] + "</code></pre>");
        } else {
          closeList(); closeQuote();
        }
      } else {
        var codePh = line.match(/^@@CODE(\d+)@@$/);
        if (codePh) {
          closeList(); closeQuote();
          out.push("<pre><code>" + fences[Number(codePh[1])] + "</code></pre>");
        } else {
          closeList(); closeQuote();
          out.push("<p>" + mdInline(line) + "</p>");
        }
      }
    }
    closeList(); closeQuote();
    return out.join("");
  }

  function mdInline(text) {
    var codeSpans = [];
    text = text.replace(/`([^`]+)`/g, function (_, c) {
      codeSpans.push(c);
      return "@@INL" + (codeSpans.length - 1) + "@@";
    });
    text = text
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return text.replace(/@@INL(\d+)@@/g, function (_, n) {
      return "<code>" + codeSpans[Number(n)] + "</code>";
    });
  }

  function renderChat() {
    var wrap = $("chat-messages");
    if (!wrap) return;
    var ctx = $("chat-ctx");
    if (state.chatContext && state.chatContext.videoId) {
      ctx.hidden = false;
      var t = ctx.querySelector(".chat__ctx-text");
      if (t) t.textContent = "Video: " + (state.chatContext.title || state.chatContext.videoId);
    } else {
      ctx.hidden = true;
    }

    wrap.innerHTML = "";
    if (state.chat.length === 0 && !state.chatTyping) {
      wrap.appendChild(
        el("div", { class: "chat__empty" }, [
          '<svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
          el("p", { class: "chat__empty-title", text: "Chat IA" }),
          el("p", { class: "chat__empty-text", text: "Fai domande, riassunti e analisi sui tuoi video. Incolla un link YouTube oppure apri una trascrizione e premi \"Chiedi in chat\"." }),
        ]),
      );
    }

    state.chat.forEach(function (msg) {
      wrap.appendChild(chatRow(msg));
    });

    if (state.chatTyping) {
      wrap.appendChild(
        el("div", { class: "chat__row chat__row--ai" }, [
          el("div", { class: "chat__avatar chat__avatar--ai" }, [
            '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg>',
          ]),
          el("div", { class: "chat__typing" }, [
            el("span"), el("span"), el("span"),
          ]),
        ]),
      );
    }
    wrap.scrollTop = wrap.scrollHeight;
  }

  function chatRow(msg) {
    var isUser = msg.role === "user";
    return el("div", { class: "chat__row " + (isUser ? "chat__row--user" : "chat__row--ai") }, [
      el("div", { class: "chat__avatar " + (isUser ? "chat__avatar--user" : "chat__avatar--ai") }, [
        isUser
          ? '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
          : '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg>',
      ]),
      el("div", { class: "chat__col" }, [
        el("div", { class: "chat__bubble" + (isUser ? "" : " chat__bubble--markdown"), html: isUser ? escHtml(msg.text) : mdToHtml(msg.text) }),
        el("div", { class: "chat__time", text: msg.time || "" }),
      ]),
    ]);
  }

  function escHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/\n/g, "<br>");
  }

  function chatSend() {
    var input = $("chat-input");
    var text = (input.value || "").trim();
    if (!text || state.chatTyping) return;

    state.chat.push({ role: "user", text: text, time: nowTime() });
    input.value = "";
    autoResizeChatInput();
    updateChatSendState();
    state.chatTyping = true;
    saveChat();
    renderChat();

    var payload = { message: text };
    if (state.chatContext && state.chatContext.videoId) {
      payload.videoId = state.chatContext.videoId;
    }

    authFetch("/api/ai/chat", { method: "POST", body: JSON.stringify(payload) })
      .then(function (res) {
        return res.json().then(function (d) { return { ok: res.ok, status: res.status, d: d }; });
      })
      .then(function (r) {
        state.chatTyping = false;
        if (!r.ok) {
          if (r.status === 401) { handleLogout(); return; }
          var msg = r.d.message || "Errore durante la richiesta";
          if (r.d && r.d.credits === 0) {
            state.chat.push({ role: "ai", text: "Crediti esauriti. Passa a un piano Pro o Business per continuare a usare la chat.", time: nowTime() });
          } else {
            state.chat.push({ role: "ai", text: msg, time: nowTime() });
          }
        } else {
          if (typeof r.d.credits === "number") {
            state.credits = r.d.credits;
            renderHeader();
          }
          state.chat.push({ role: "ai", text: r.d.response || "", time: nowTime() });
        }
        saveChat();
        renderChat();
      })
      .catch(function () {
        state.chatTyping = false;
        state.chat.push({ role: "ai", text: "Errore di rete. Controlla la connessione e riprova.", time: nowTime() });
        saveChat();
        renderChat();
      });
  }

  function nowTime() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function newChat() {
    state.chat = [];
    state.chatContext = null;
    saveChat();
    renderChat();
    var input = $("chat-input");
    if (input) input.focus();
  }

  function clearChatContext() {
    state.chatContext = null;
    saveChat();
    renderChat();
  }

  // Called from the transcript detail: opens the chat tab pinned to that video.
  function startChatWithTranscript(item) {
    if (!item) return;
    state.chatContext = { videoId: item.video_id, title: item.title };
    saveChat();
    switchTab("chat");
  }

  function autoResizeChatInput() {
    var input = $("chat-input");
    if (!input) return;
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 96) + "px";
  }

  function updateChatSendState() {
    var send = $("chat-send");
    var input = $("chat-input");
    if (send && input) send.disabled = !input.value.trim() || state.chatTyping;
  }

  /* ---------- account ---------- */
  var PLANS = [
    {
      id: "free", name: "Starter", price: "Gratis", period: "",
      icon: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/></svg>',
      desc: "Per provare Resumari senza impegno.",
      features: ["10 Crediti omaggio", "Trascrizioni base", "Esporta in TXT"],
    },
    {
      id: "pro", name: "Pro Pack", price: "€7.99", period: "/mese",
      icon: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
      desc: "Ideale per chi analizza video ogni giorno.",
      features: ["1000 Crediti / mese", "Reset automatico ogni mese", "Formati avanzati (JSON, CSV, SRT)", "Accesso API Beta"],
      popular: true,
    },
    {
      id: "business", name: "Business", price: "€19.99", period: "/mese",
      icon: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="2"/><line x1="15" y1="22" x2="15" y2="2"/></svg>',
      desc: "Per team e analisi massive.",
      features: ["3000 Crediti / mese", "Reset automatico ogni mese", "Team Management", "Account Manager"],
    },
  ];

  function renderAccount() {
    var user = state.user || {};
    var plan = user.plan || "free";
    var limit = PLAN_LIMITS[plan] || 10;
    var name = user.name || (user.email || "").split("@")[0] || "Utente";
    $("acc-avatar").textContent = name.charAt(0).toUpperCase();
    $("acc-name").textContent = name;
    $("acc-email").textContent = user.email || "";
    $("acc-plan").textContent = PLAN_NAMES[plan] || plan;
    renderAccountCredits();
    renderPlans(plan);
  }

  function renderAccountCredits() {
    var plan = (state.user && state.user.plan) || "free";
    var limit = PLAN_LIMITS[plan] || 10;
    var credits = state.credits;
    $("acc-credits").textContent = credits != null ? credits : "…";
    $("acc-credits-sub").textContent =
      "di " + limit + " al mese nel piano " + (PLAN_NAMES[plan] || plan);
    var progress = $("acc-progress");
    progress.hidden = false;
    var pct = Math.min(100, ((credits != null ? credits : 0) / limit) * 100);
    $("acc-progress-bar").style.width = pct + "%";
  }

  function renderPlans(currentPlan) {
    var wrap = $("acc-plans");
    wrap.innerHTML = "";
    PLANS.forEach(function (p) {
      var isCurrent = p.id === currentPlan;
      var card = el("div", { class: "plan" + (isCurrent ? " plan--current" : "") + (p.popular && !isCurrent ? " plan--popular" : "") }, [
        el("div", { class: "plan__head" }, [
          el("div", { class: "plan__icon", html: p.icon }),
          el("div", {}, [
            el("p", { class: "plan__name", text: p.name }),
            el("p", { class: "plan__price", html: p.price + (p.period ? " <span>" + p.period + "</span>" : "") }),
            el("p", { class: "plan__desc", text: p.desc }),
          ]),
          isCurrent ? el("span", { class: "plan__status", text: "Attivo" }) : null,
        ]),
        el("div", { class: "plan__features" }, p.features.map(function (f) {
          return el("div", { class: "plan__feature" }, [
            '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
            el("span", { text: f }),
          ]);
        })),
        isCurrent
          ? el("button", { class: "btn btn--block", disabled: true, text: "Piano corrente", style: "background:#f1f0f6;color:#9a9aa6" })
          : p.id === "free"
            ? el("button", { class: "btn btn--block", disabled: true, text: "Piano gratuito", style: "background:#f1f0f6;color:#9a9aa6" })
            : el("button", {
                class: "btn btn--primary btn--block plan__cta",
                text: p.id === "pro" ? "Passa a Pro" : "Passa a Business",
                onclick: function () { startCheckout(p.id, this); },
              }),
      ]);
      wrap.appendChild(card);
    });
  }

  function startCheckout(planId, btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="btn__spinner"></span>';
    authFetch("/api/create-checkout-session", {
      method: "POST",
      body: JSON.stringify({ plan: planId }),
    })
      .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, d: d }; }); })
      .then(function (r) {
        if (!r.ok || !r.d.url) throw new Error(r.d.message || "Impossibile avviare il checkout");
        window.open(r.d.url, "_blank");
      })
      .catch(function (e) {
        showAlert("acc-alert", e.message || "Errore di rete", "error");
      })
      .finally(function () {
        renderPlans((state.user && state.user.plan) || "free");
      });
  }

  /* ---------- usage ---------- */
  function loadUsage() {
    var statsEl = $("usage-stats");
    var contentEl = $("usage-content");
    statsEl.innerHTML = "";
    contentEl.innerHTML = "";
    contentEl.appendChild(
      el("div", { class: "usage-loading" }, [
        el("div", { class: "spinner" }),
        el("p", { class: "muted", text: "Caricamento storico…" }),
      ]),
    );
    authFetch("/api/usage")
      .then(function (res) {
        if (res.status === 401) throw new Error("Non autorizzato");
        return res.json();
      })
      .then(function (data) {
        state.usage = data;
        renderUsage();
      })
      .catch(function () {
        contentEl.innerHTML = "";
        contentEl.appendChild(
          el("div", { class: "usage-error" }, [
            el("p", { class: "muted", text: "Errore di rete. Riprova." }),
          ]),
        );
      });
  }

  function renderUsage() {
    var data = state.usage;
    if (!data) return;
    var statsEl = $("usage-stats");
    var contentEl = $("usage-content");
    statsEl.innerHTML = "";
    contentEl.innerHTML = "";

    if (!data.totals || data.totals.events === 0) {
      contentEl.appendChild(
        el("div", { class: "usage-empty" }, [
          el("p", { text: "Nessuna attività", style: "font-weight:800;font-size:15px" }),
          el("p", { class: "muted", text: "Le tue trascrizioni e i riassunti AI appariranno qui.", style: "margin-top:4px;font-size:12px" }),
        ]),
      );
      return;
    }

    var t = data.totals;
    var stats = [
      { label: "Crediti usati", value: t.creditsUsed, cls: "stat--purple", icon: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>' },
      { label: "Video analizzati", value: t.videos, cls: "stat--green", icon: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="14" rx="2" ry="2"/><path d="M10 9v6l5-3z"/></svg>' },
      { label: "Trascrizioni", value: t.transcripts, cls: "stat--amber", icon: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' },
      { label: "Chat / Riassunti", value: t.chats, cls: "stat--blue", icon: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' },
    ];
    stats.forEach(function (s) {
      statsEl.appendChild(
        el("div", { class: "stat " + s.cls }, [
          el("div", { class: "stat__icon", html: s.icon }),
          el("p", { class: "stat__value", text: s.value }),
          el("p", { class: "stat__label", text: s.label }),
        ]),
      );
    });

    // group by day
    var groups = [];
    (data.events || []).forEach(function (ev) {
      var day = new Date(ev.createdAt).toLocaleDateString("it-IT", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });
      var last = groups[groups.length - 1];
      if (last && last.day === day) last.items.push(ev);
      else groups.push({ day: day, items: [ev] });
    });

    groups.forEach(function (g) {
      var wrap = el("div", { class: "usage__group" }, [
        el("p", { class: "usage__day", text: g.day.charAt(0).toUpperCase() + g.day.slice(1) }),
      ]);
      g.items.forEach(function (ev) {
        var isTx = ev.type === "transcript";
        wrap.appendChild(
          el("div", { class: "usage-event " + (isTx ? "usage-event--tx" : "usage-event--chat") }, [
            el("div", { class: "usage-event__icon", html: isTx
              ? '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>'
              : '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' }),
            el("div", { class: "usage-event__body" }, [
              el("p", { class: "usage-event__title", text: ev.title }),
              el("div", { class: "usage-event__meta" }, [
                el("span", { text: formatDateTime(ev.createdAt) }),
                el("span", { class: "usage-event__type", text: isTx ? "Trascrizione" : "Chat IA" }),
              ]),
            ]),
            el("span", { class: "usage-event__credits", text: "-" + ev.credits + " crediti" }),
          ]),
        );
      });
      contentEl.appendChild(wrap);
    });
  }

  /* ---------- theme ---------- */
  var THEME_ICONS = {
    auto: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    light: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
    dark: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  };

  function isYoutubeActive() {
    return new Promise(function (resolve) {
      try {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, function (tabs) {
          var t = tabs && tabs[0];
          resolve(!!(t && t.url && t.url.indexOf("youtube.com") !== -1));
        });
      } catch (e) { resolve(false); }
    });
  }

  function refreshYoutubeContext() {
    isYoutubeActive().then(function (active) {
      state.onYoutube = active;
      applyTheme();
    });
  }

  function applyTheme() {
    var resolved;
    if (state.theme === "light") {
      resolved = "light";
    } else if (state.theme === "dark") {
      resolved = "dark";
    } else if (state.onYoutube && state.youtubeTheme) {
      // Auto: follow the YouTube theme so there is no contrast.
      resolved = state.youtubeTheme;
    } else {
      // Auto elsewhere: follow the operating system.
      try {
        resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      } catch (e) { resolved = "light"; }
    }
    document.documentElement.setAttribute("data-theme", resolved);
    document.querySelectorAll(".theme-icon").forEach(function (ic) {
      ic.innerHTML = THEME_ICONS[state.theme] || THEME_ICONS.auto;
    });
    document.querySelectorAll(".theme-menu__item").forEach(function (b) {
      b.classList.toggle("theme-menu__item--active", b.getAttribute("data-theme-choice") === state.theme);
    });
  }

  function setThemeChoice(choice) {
    state.theme = choice === "light" || choice === "dark" ? choice : "auto";
    storageSet({ [THEME_KEY]: state.theme });
    applyTheme();
    document.querySelectorAll(".theme-menu").forEach(function (m) { m.hidden = true; });
  }

  function loadTheme() {
    storageGet(THEME_KEY).then(function (t) {
      state.theme = t === "light" || t === "dark" ? t : "auto";
      return storageGet(YT_THEME_KEY);
    }).then(function (yt) {
      state.youtubeTheme = yt === "light" || yt === "dark" ? yt : null;
      applyTheme();
      refreshYoutubeContext();
    });
  }

  /* ---------- login flow ---------- */
  function showAlert(id, text, type) {
    var a = $(id);
    a.textContent = text;
    a.className = "alert alert--" + (type || "error");
    a.hidden = false;
  }

  function setLoginLoading(on) {
    $("login-submit").disabled = on;
    $("login-submit-label").hidden = on;
    $("login-submit").querySelector(".btn__spinner").hidden = !on;
  }

  function setLoginMode(mode) {
    state.loginMode = mode === "code" ? "code" : "password";
    state.loginStep = "email";
    var isPw = state.loginMode === "password";
    document.querySelectorAll(".seg__item").forEach(function (b) {
      var active = b.getAttribute("data-mode") === state.loginMode;
      b.classList.toggle("seg__item--active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
    $("login-password-field").hidden = !isPw;
    $("login-password").required = isPw;
    $("login-code-field").hidden = true;
    $("login-code").value = "";
    $("login-back").hidden = true;
    $("login-message").hidden = true;
    $("login-subtitle").textContent = isPw
      ? "Accedi con email e password"
      : "Inserisci la tua email per ricevere un codice di accesso";
    $("login-submit-label").textContent = isPw ? "Accedi" : "Invia codice";
    $("login-email").focus();
  }

  function resetLogin() {
    // Back to the first step of the code flow (or a clean password form).
    state.loginStep = "email";
    $("login-code-field").hidden = true;
    $("login-code").value = "";
    $("login-back").hidden = true;
    $("login-message").hidden = true;
    $("login-subtitle").textContent =
      state.loginMode === "password"
        ? "Accedi con email e password"
        : "Inserisci la tua email per ricevere un codice di accesso";
    $("login-submit-label").textContent = state.loginMode === "password" ? "Accedi" : "Invia codice";
  }

  function handleLoginSubmit(e) {
    e.preventDefault();
    var email = $("login-email").value.trim();
    var password = $("login-password").value;
    var code = $("login-code").value.trim();

    // Mode 1: email + password form.
    if (state.loginMode === "password") {
      if (!email || !password) return;
      setLoginLoading(true);
      hide("login-message");
      fetch(API_BASE + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password }),
      })
        .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, d: d }; }); })
        .then(function (r) {
          if (!r.ok || !r.d.token) throw new Error(r.d.message || "Credenziali non valide");
          state.token = r.d.token;
          state.user = r.d.user;
          state.credits = typeof r.d.user.credits === "number" ? r.d.user.credits : null;
          saveLocal();
          // Clear the sticky logout flag BEFORE publishing the new token, so
          // the adoption listener can never read a stale flag.
          storageRemove(LOGGED_OUT_KEY);
          storageSet({ [AUTH_KEY]: { token: r.d.token, user: r.d.user } });
          enterApp();
        })
        .catch(function (err) { showAlert("login-message", err.message || "Errore di rete", "error"); })
        .finally(function () { setLoginLoading(false); });
      return;
    }

    // Mode 2: magic code (send-code -> verify-code).
    if (state.loginStep === "email") {
      if (!email) return;
      setLoginLoading(true);
      hide("login-message");
      fetch(API_BASE + "/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }),
      })
        .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, d: d }; }); })
        .then(function (r) {
          if (!r.ok) throw new Error(r.d.message || "Errore nell'invio del codice");
          state.loginStep = "code";
          show("login-code-field");
          $("login-subtitle").textContent = "Inserisci il codice a 6 cifre ricevuto via email";
          $("login-submit-label").textContent = "Accedi";
          $("login-back").hidden = false;
          $("login-code").focus();
        })
        .catch(function (err) { showAlert("login-message", err.message || "Errore di rete", "error"); })
        .finally(function () { setLoginLoading(false); });
    } else {
      if (!code || code.length !== 6) return;
      setLoginLoading(true);
      hide("login-message");
      fetch(API_BASE + "/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, code: code }),
      })
        .then(function (res) { return res.json().then(function (d) { return { ok: res.ok, d: d }; }); })
        .then(function (r) {
          if (!r.ok || !r.d.token) throw new Error(r.d.message || "Codice non valido");
          state.token = r.d.token;
          state.user = r.d.user;
          state.credits = typeof r.d.user.credits === "number" ? r.d.user.credits : null;
          saveLocal();
          // Clear the sticky logout flag BEFORE publishing the new token, so
          // the adoption listener can never read a stale flag.
          storageRemove(LOGGED_OUT_KEY);
          storageSet({ [AUTH_KEY]: { token: r.d.token, user: r.d.user } });
          enterApp();
        })
        .catch(function (err) { showAlert("login-message", err.message || "Errore di rete", "error"); })
        .finally(function () { setLoginLoading(false); });
    }
  }

  /* ---------- logout confirmation ---------- */
  function openLogoutConfirm() {
    $("logout-modal").hidden = false;
    $("logout-confirm").focus();
  }
  function closeLogoutConfirm(restoreFocus) {
    $("logout-modal").hidden = true;
    // Return focus to the logout button (cancel/overlay/Escape paths) so
    // keyboard users are not left stranded. On confirm the app view is
    // destroyed, so focus is intentionally not restored there.
    if (restoreFocus && $("logout-btn")) $("logout-btn").focus();
  }

  function handleLogout() {
    clearLocal();
    // Sticky logout: keep resumariLoggedOut so the site's session cannot
    // silently log the panel back in until an explicit login happens here.
    storageSet({ [LOGGED_OUT_KEY]: true });
    storageRemove(AUTH_KEY);
    state.user = null;
    state.token = null;
    state.credits = null;
    state.transcripts = [];
    state.selected = null;
    state.usage = null;
    setLoginMode("password");
    showView("login");
  }

  /* ---------- misc ---------- */
  function openYoutube() {
    window.open("https://www.youtube.com", "_blank");
  }

  function openSite(path) {
    window.open(API_BASE + path, "_blank");
  }

  /* ---------- event wiring ---------- */
  function wire() {
    $("login-form").addEventListener("submit", handleLoginSubmit);
    $("login-back").addEventListener("click", resetLogin);
    document.querySelectorAll(".seg__item").forEach(function (btn) {
      btn.addEventListener("click", function () { setLoginMode(btn.getAttribute("data-mode")); });
    });
    // Theme picker (works both on the login view and in the app header).
    document.querySelectorAll(".theme-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var menu = btn.parentElement.querySelector(".theme-menu");
        if (menu) menu.hidden = !menu.hidden;
      });
    });
    document.querySelectorAll(".theme-menu__item").forEach(function (btn) {
      btn.addEventListener("click", function () { setThemeChoice(btn.getAttribute("data-theme-choice")); });
    });
    document.addEventListener("click", function (e) {
      document.querySelectorAll(".theme-menu").forEach(function (menu) {
        if (!menu.hidden && !menu.contains(e.target)) menu.hidden = true;
      });
    });
    try {
      chrome.tabs.onActivated.addListener(function () { refreshYoutubeContext(); });
    } catch (e) { /* non-extension context */ }
    try {
      var mqTheme = window.matchMedia("(prefers-color-scheme: dark)");
      if (mqTheme.addEventListener) {
        mqTheme.addEventListener("change", function () {
          if (state.theme === "auto") applyTheme();
        });
      }
    } catch (e) { /* unsupported */ }
    $("logout-btn").addEventListener("click", openLogoutConfirm);
    $("logout-confirm").addEventListener("click", function () {
      closeLogoutConfirm();
      handleLogout();
    });
    $("logout-cancel").addEventListener("click", function () { closeLogoutConfirm(true); });
    document.querySelectorAll("[data-logout-cancel]").forEach(function (el) {
      el.addEventListener("click", function () { closeLogoutConfirm(true); });
    });
    document.addEventListener("keydown", function (e) {
      // Only react to Escape while the confirmation dialog is open, so the
      // handler never interferes with other Escape-based UI (e.g. menus).
      if (e.key === "Escape" && !$("logout-modal").hidden) closeLogoutConfirm(true);
    });
    $("credits-badge").addEventListener("click", function () { switchTab("account"); });

    // Chat tab
    $("chat-send").addEventListener("click", chatSend);
    $("chat-input").addEventListener("input", function () {
      autoResizeChatInput();
      updateChatSendState();
    });
    $("chat-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        chatSend();
      }
    });
    $("chat-new").addEventListener("click", newChat);
    $("chat-ctx-clear").addEventListener("click", clearChatContext);
    $("tx-search").addEventListener("input", function (e) {
      state.query = e.target.value;
      renderTranscripts();
    });
    $("acc-refresh").addEventListener("click", function () {
      var btn = $("acc-refresh");
      btn.classList.add("spinning");
      refreshCredits();
      setTimeout(function () { btn.classList.remove("spinning"); }, 800);
    });
    $("usage-refresh").addEventListener("click", function () {
      var btn = $("usage-refresh");
      btn.classList.add("spinning");
      loadUsage();
      setTimeout(function () { btn.classList.remove("spinning"); }, 800);
    });
    document.querySelectorAll(".nav__item").forEach(function (btn) {
      btn.addEventListener("click", function () { switchTab(btn.getAttribute("data-tab")); });
    });
    document.querySelectorAll(".link-card").forEach(function (card) {
      card.addEventListener("click", function () { openSite(card.getAttribute("data-site")); });
    });

    // Adopt logins/logouts made on the site (shared chrome.storage bridge).
    try {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== "local" || !changes[AUTH_KEY]) return;
        var next = changes[AUTH_KEY].newValue;
        if (next && next.token) {
          // Already adopted locally.
          if (state.token === next.token) return;
          // After an explicit panel logout the session is sticky: a token the
          // site mirrors back (e.g. a still-open NextAuth session) must not
          // silently log the panel in again.
          storageGet(LOGGED_OUT_KEY).then(function (loggedOut) {
            if (loggedOut) {
              storageRemove(AUTH_KEY);
              return;
            }
            state.token = next.token;
            fetch(API_BASE + "/api/profile", { headers: { Authorization: "Bearer " + next.token } })
              .then(function (res) {
                if (!res.ok) {
                  storageRemove(AUTH_KEY);
                  return;
                }
                return res.json().then(function (data) {
                  state.user = data;
                  state.credits = typeof data.credits === "number" ? data.credits : null;
                  saveLocal();
                  enterApp();
                });
              })
              .catch(function () {});
          });
        } else {
          handleLogout();
        }
      });
    } catch (e) { /* non-extension context */ }

    // Follow YouTube theme changes while the panel is open (auto mode).
    try {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== "local" || !changes[YT_THEME_KEY]) return;
        var next = changes[YT_THEME_KEY].newValue;
        if (next === "light" || next === "dark") {
          state.youtubeTheme = next;
          if (state.theme === "auto") applyTheme();
        }
      });
    } catch (e) { /* non-extension context */ }
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    wire();
    loadTheme();
    bootstrap();
  });

  // Also expose the version marker used by tests.
  window.__RESUMARI_PANEL__ = true;
})();
