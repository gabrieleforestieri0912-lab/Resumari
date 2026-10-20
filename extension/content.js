// Utils
const getYouTubeVideoId = (url) => {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/|&v=)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return (match && match[1].length === 11) ? match[1] : null;
};

const RESUMARI_BASE_URL = 'https://resumari.vercel.app';

// Contesto dell'estensione: verificato UNA volta sola a caricamento.
// Dopo un reload/update dell'estensione con la tab aperta, ogni accesso
// successivo a chrome.runtime lancia "Extension context invalidated" e uccide
// tutte le iniezioni: qui il controllo avviene subito e il risultato viene
// memorizzato in una variabile, senza piu toccare chrome.runtime.
let contextDead = false;
try {
  contextDead = !chrome.runtime?.id;
} catch {
  contextDead = true;
}

// ---------------------------------------------------------------------------
// Icona Resumari — SVG INLINE, non <img> con URL chrome-extension://.
//
// Perche: le <img> iniettate nel DOM della pagina vengono caricate dal
// contesto di YouTube (https://www.youtube.com) e ogni caricamento di una
// risorsa chrome-extension:// fallisce con:
//   "Unsafe attempt to load URL chrome-extension://<id>/icons/icon128.png
//    from frame with URL https://www.youtube.com/...
//    Domains, protocols and ports must match."
// (un errore per ogni bottone iniettato, e uno nuovo a ogni re-iniezione
// fatta dal MutationObserver). Lo stesso accadrebbe con qualunque URL
// assoluto: la soluzione e non chiedere ALCUNA risorsa esterna.
//
// Uno SVG inline vive nel DOM, non e una risorsa caricata: niente CSP della
// pagina, niente blocchi cross-origin, niente web_accessible_resources.
// E anche piu nitido a 17-18px del PNG 1024x1024 compresso a 18px.
// ---------------------------------------------------------------------------
let iconUidCounter = 0;

// Crea l'icona Resumari come elemento <svg> pronto da iniettare.
// `className` riceve la stessa classe usata prima per la <img>, cosi il CSS
// esistente (dimensioni, drop-shadow, pointer-events) continua a valere.
function createResumariIcon(className) {
  // id univoco per il gradiente: piu icone nella stessa pagina non devono
  // condividere lo stesso id (il DOM di YouTube e vasto e non controllato).
  const uid = `resumari-grad-${++iconUidCounter}`;

  const markup =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" ` +
    `class="${className}" aria-hidden="true" focusable="false">` +
    `<defs>` +
    `<linearGradient id="${uid}" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#c084fc"/>` +
    `<stop offset="0.55" stop-color="#a855f7"/>` +
    `<stop offset="1" stop-color="#6d28d9"/>` +
    `</linearGradient>` +
    `</defs>` +
    // Documento con bordo viola
    `<rect x="13" y="5" width="38" height="54" rx="7" fill="#150a2e" ` +
    `stroke="url(#${uid})" stroke-width="2.4"/>` +
    // Angolo piegato
    `<path d="M37 5 L51 19 L37 19 Z" fill="#2e1461" ` +
    `stroke="url(#${uid})" stroke-width="2.2" stroke-linejoin="round"/>` +
    // Righe di testo
    `<rect x="20" y="26" width="24" height="4.4" rx="2.2" fill="url(#${uid})"/>` +
    `<rect x="20" y="35" width="19" height="4.4" rx="2.2" fill="url(#${uid})" opacity="0.82"/>` +
    `<rect x="20" y="44" width="14" height="4.4" rx="2.2" fill="url(#${uid})" opacity="0.64"/>` +
    // Scintillio principale
    `<path d="M10 4 C10 8 11 9 15 9 C11 9 10 10 10 14 C10 10 9 9 5 9 ` +
    `C9 9 10 8 10 4 Z" fill="#e9d5ff"/>` +
    // Scintillio secondario
    `<path d="M49 43 C49 46 49.8 46.8 52.8 46.8 C49.8 46.8 49 47.6 49 50.6 ` +
    `C49 47.6 48.2 46.8 45.2 46.8 C48.2 46.8 49 46 49 43 Z" fill="#c084fc"/>` +
    `</svg>`;

  try {
    // DOMParser + importNode invece di innerHTML: la creazione di elementi
    // tramite innerHTML puo essere bloccata dalla Trusted Types policy di
    // YouTube, mentre il parsing di una stringa XML e sempre ammesso.
    const parsed = new DOMParser().parseFromString(markup, 'image/svg+xml');
    const root = parsed.documentElement;
    if (!root || root.nodeName === 'parsererror') return null;
    return document.importNode(root, true);
  } catch {
    return null;
  }
}

// Versione del content script: serve per diagnosticare in console quale istanza
// è in esecuzione nella tab (dopo un reload dell'estensione, le tab aperte
// prima eseguono ancora la vecchia istanza finché non vengono ricaricate).
const RESUMARI_CONTENT_VERSION = '1.1.9';

// ---------------------------------------------------------------------------
// Overlay barra di caricamento con progresso — feedback immediato su YouTube
// quando parte una trascrizione (video singolo o intero canale).
// La trascrizione vera avviene nella scheda Resumari (web app), dove vive la
// barra determinata con percentuale: qui si mostra una barra indeterminata
// con le istruzioni per seguire il progresso, così l'utente non resta senza
// feedback dopo il click. Puro DOM, nessuna dipendenza da chrome.*.
// ---------------------------------------------------------------------------
function showResumariProgressOverlay({ title, subtitle }) {
  try {
    if (document.querySelector('.resumari-progress-overlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'resumari-progress-overlay';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');

    const header = document.createElement('div');
    header.className = 'resumari-progress-header';

    const logo = createResumariIcon('resumari-progress-logo');
    if (logo) {
      try { header.appendChild(logo); } catch {}
    }

    const texts = document.createElement('div');
    texts.className = 'resumari-progress-texts';

    const titleEl = document.createElement('div');
    titleEl.className = 'resumari-progress-title';
    titleEl.textContent = title;

    const subEl = document.createElement('div');
    subEl.className = 'resumari-progress-subtitle';
    subEl.textContent = subtitle;

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'resumari-progress-close';
    close.title = 'Chiudi';
    close.setAttribute('aria-label', 'Chiudi avviso');
    close.textContent = '✕';
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.remove();
    });

    texts.appendChild(titleEl);
    texts.appendChild(subEl);
    header.appendChild(texts);
    header.appendChild(close);

    const track = document.createElement('div');
    track.className = 'resumari-progress-track';
    const fill = document.createElement('div');
    fill.className = 'resumari-progress-fill';
    track.appendChild(fill);

    const footer = document.createElement('div');
    footer.className = 'resumari-progress-footer';
    footer.textContent = 'Segui il progresso nella scheda Resumari';

    overlay.appendChild(header);
    overlay.appendChild(track);
    overlay.appendChild(footer);

    document.documentElement.appendChild(overlay);

    // Auto-dismiss: è solo un avviso di avvio, il progresso reale è in web app.
    setTimeout(() => {
      try { overlay.remove(); } catch {}
    }, 15000);
  } catch {}
}

// UI Injection
// NOTA persistenza preview: il bottone NON va mai iniettato dentro
// `a#thumbnail`. Quando l'hover attiva l'anteprima, YouTube monta
// `ytd-inline-preview-player` come sibling dell'anchor (o ne riscrive il
// contenuto): tutto ciò che sta dentro l'anchor viene coperto dal player
// (stacking context separato, z-index interno inutile) oppure rimosso dal
// re-render del template Polymer. L'host stabile è `ytd-thumbnail`
// (o il parent dell'anchor), che sopravvive alla preview.
function ensureRelativePosition(el) {
  if (!el || el === document.documentElement || el === document.body) return;
  try {
    if (getComputedStyle(el).position === 'static') {
      el.style.position = 'relative';
    }
  } catch {}
}

function findThumbHost(anchor, renderer) {
  // Caso standard (home/search/correlati): l'anchor è DENTRO ytd-thumbnail.
  const ancestor = anchor.closest('ytd-thumbnail');
  if (ancestor) return ancestor;
  // Caso playlist (ytd-playlist-video-renderer,
  // ytd-playlist-panel-video-renderer): l'anchor #thumbnail AVVOLGE
  // ytd-thumbnail (è un antenato, non un discendente), quindi closest()
  // fallisce e il fallback a parentElement ancorava il bottone alla riga
  // intera — da qui il posizionamento errato in alto a destra del testo.
  // Si usa lo ytd-thumbnail discendente, che ha le dimensioni della sola
  // miniatura.
  try {
    const inner = anchor.querySelector('ytd-thumbnail');
    if (inner) return inner;
  } catch {}
  try {
    const inRenderer = renderer
      ? renderer.querySelector('ytd-thumbnail')
      : null;
    if (inRenderer) return inRenderer;
  } catch {}
  // Shorts / layout nuovi: il parent diretto dell'anchor è comunque più
  // stabile dell'anchor stessa (il cui innerHTML viene riscritto).
  return anchor.parentElement;
}

function injectThumbnailButtons() {
  // Selettori per tutti i contesti YouTube:
  // - Video standard: home, search, related, canali, subscriptions
  // - Shorts: grid home, caroselli shorts, search shorts
  // - Playlist: video in elenco playlist (ytd-playlist-video-renderer, ytd-playlist-panel-video-renderer)
  const renderers = document.querySelectorAll(`
    ytd-rich-item-renderer,
    ytd-video-renderer,
    ytd-compact-video-renderer,
    ytd-grid-video-renderer,
    ytd-reel-item-renderer,
    ytd-rich-grid-slim-media,
    yt-shorts-lockup-view-model,
    ytd-playlist-video-renderer,
    ytd-playlist-panel-video-renderer
  `);

  renderers.forEach(renderer => {
    // Cerca il link o il contenitore cliccabile della thumbnail
    const anchor = renderer.querySelector('a#thumbnail, a.ytd-thumbnail, a[href*="/watch"], a[href*="/shorts"]');
    if (!anchor) return;

    // Estrae l'ID del video dal link
    const videoId = getYouTubeVideoId(anchor.href);
    if (!videoId) return;

    // Host stabile (sopravvive a preview + re-render): mai l'anchor stessa.
    const host = findThumbHost(anchor, renderer);
    if (!host) return;
    ensureRelativePosition(host);

    // Bottone esistente: lo si ricolloca/aggiorna invece di duplicarlo.
    // Fondamentale perché YouTube ricicla i renderer nello scroll: senza
    // update il click aprirebbe il video vecchio.
    const existing = renderer.querySelector('.resumari-thumb-btn');
    if (existing) {
      if (existing.dataset.videoId !== videoId) {
        existing.dataset.videoId = videoId;
      }
      if (existing.parentElement !== host) {
        host.appendChild(existing);
      } else if (host.querySelector('ytd-inline-preview-player') && host.lastElementChild !== existing) {
        // La preview monta ytd-inline-preview-player DOPO il nostro bottone:
        // lo si riporta in fondo così resta l'ultimo figlio e dipinge sopra
        // al player (a parità di stacking, vince l'ordine nel DOM).
        host.appendChild(existing);
      }
      return;
    }

    // Crea il bottone circolare glassmorphic viola glow
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'resumari-thumb-btn';
    btn.title = 'Trascrivi e riassumi con Resumari';
    btn.setAttribute('aria-label', 'Trascrivi con Resumari');
    btn.dataset.videoId = videoId;

    const icon = createResumariIcon('resumari-thumb-icon');
    if (icon) btn.appendChild(icon);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const id = btn.dataset.videoId;
      if (!id) return;
      window.open(`${RESUMARI_BASE_URL}/chat?video=${id}`, '_blank');
      showResumariProgressOverlay({
        title: 'Trascrizione video avviata',
        subtitle: 'Stiamo caricando la trascrizione in Resumari.',
      });
    });

    // Inserito nell'host stabile (ytd-thumbnail / parent dell'anchor), NON
    // dentro l'anchor: resta sopra ytd-inline-preview-player (z-index elevato
    // + pointer-events attivi da CSS) e non viene cancellato dal re-render.
    host.appendChild(btn);
  });
}

function injectVideoPageButtons() {
  // Solo pagine di visione: in SPA (home, canale, search…) un bottone orfano
  // di una navigazione precedente va rimosso invece di restare appeso.
  if (!isWatchPage()) {
    document.querySelectorAll('.resumari-watch-btn').forEach((el) => {
      try { el.remove(); } catch {}
    });
    return;
  }

  const videoId = getYouTubeVideoId(window.location.href);
  if (!videoId) return;

  // Bottone già presente (navigazione SPA watch→watch senza reload):
  // aggiorna l'ID — senza questo il click trascriverebbe il video precedente —
  // e ricollocalo se YouTube ha ricostruito la barra delle azioni.
  const existing = document.querySelector('.resumari-watch-btn');
  if (existing) {
    if (existing.dataset.videoId !== videoId) {
      existing.dataset.videoId = videoId;
    }
    placeWatchButton(existing);
    return;
  }


  const transcriptBtn = document.createElement('button');
  transcriptBtn.type = 'button';
  transcriptBtn.className = 'resumari-watch-btn';
  transcriptBtn.title = 'Trascrivi e riassumi questo video con Resumari';
  transcriptBtn.setAttribute('aria-label', 'Trascrivi con Resumari');
  transcriptBtn.dataset.videoId = videoId;

  const icon = createResumariIcon('resumari-watch-icon');
  if (icon) transcriptBtn.appendChild(icon);

  const label = document.createElement('span');
  label.textContent = 'Trascrivi';

  transcriptBtn.appendChild(label);

  transcriptBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Letto al click (non in closure): immune dallo stale ID dopo le
    // navigazioni SPA watch→watch.
    const id = transcriptBtn.dataset.videoId || getYouTubeVideoId(window.location.href);
    if (!id) return;
    window.open(`${RESUMARI_BASE_URL}/chat?video=${id}&action=transcript`, '_blank');
    showResumariProgressOverlay({
      title: 'Trascrizione video avviata',
      subtitle: 'Stiamo caricando la trascrizione in Resumari.',
    });
  });

  placeWatchButton(transcriptBtn);
}

// Pagina di visione video: /watch, /shorts/<id>, /embed/<id>.
function isWatchPage() {
  const path = window.location.pathname || '';
  return path === '/watch' || path.startsWith('/watch/') ||
    path.startsWith('/shorts/') || path.startsWith('/embed/');
}

// querySelector protetto: i selettori con :has() lanciano SyntaxError sui
// Chromium datati e ucciderebbero l'intera iniezione senza questo guard.
function safeQuerySelector(selector) {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

// Trova il punto di ancoraggio nella barra delle azioni sotto al video.
function findWatchActionsTarget() {
  const likeSegment = safeQuerySelector(
    'ytd-segmented-like-dislike-button-renderer, segmented-like-dislike-button-view-model, #segmented-like-button'
  );
  if (likeSegment) return { kind: 'after', node: likeSegment };

  const shareBtn = safeQuerySelector(
    'ytd-button-renderer:has(yt-icon[icon="share"]), yt-button-view-model:has(yt-icon[icon="share"])'
  );
  if (shareBtn) return { kind: 'before', node: shareBtn };

  const actionsContainer = safeQuerySelector(
    '#top-row #actions-inner #top-level-buttons-computed, #top-level-buttons-computed, #actions #top-level-buttons'
  );
  if (actionsContainer) return { kind: 'append', node: actionsContainer };

  return null;
}

// Posizionamento (o riposizionamento) del bottone watch: subito dopo il blocco
// Like/Dislike, quindi prima di Condividi. Ritorna false se la barra delle
// azioni non è ancora stata idratata (si riprova al prossimo tick).
function placeWatchButton(btn) {
  const target = findWatchActionsTarget();
  if (!target || !target.node || !target.node.parentNode) return false;

  // Già al posto giusto: niente spostamenti (evita loop con l'observer).
  if (btn.parentNode === target.node.parentNode) {
    if (target.kind === 'after' && btn.previousSibling === target.node) return true;
    if (target.kind === 'before' && btn.nextSibling === target.node) return true;
    if (target.kind === 'append' && target.node.lastChild === btn) return true;
  }

  try {
    if (target.kind === 'after') {
      target.node.parentNode.insertBefore(btn, target.node.nextSibling);
    } else if (target.kind === 'before') {
      target.node.parentNode.insertBefore(btn, target.node);
    } else {
      target.node.appendChild(btn);
    }
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Bottone "Trascrivi canale" — SOLO pagine di canale, in testata accanto ad
// "Iscriviti" (mai sotto ai video / nelle griglie).
// ---------------------------------------------------------------------------

// Pagina canale: /@handle, /channel/UC…, /user/…, /c/… con eventuali sotto-schede
// (/videos, /shorts, /playlists, /community, /about…). Non include /watch o /shorts/<id>.
const CHANNEL_PAGE_RE = /^\/(?:@[\w.\-]+|channel\/[\w.\-]+|user\/[\w.\-]+|c\/[\w.\-]+)(?:\/|$)/;

// Etichette localizzate del pulsante Iscriviti (fallback quando il renderer
// non è raggiungibile tramite selettore).
const SUBSCRIBE_LABELS = /^(iscriviti|subscribe|abonnieren|s['’]?abonner|suscribirte|subskrybuj|assinar|seguisci|登録|구독)$/i;

function isChannelPage() {
  return CHANNEL_PAGE_RE.test(window.location.pathname);
}

// querySelector che attraversa anche le Shadow DOM: i nuovi header/view-model
// di YouTube nascondono parte del DOM in shadow root.
function deepQuery(selector, root = document) {
  const direct = root.querySelector(selector);
  if (direct) return direct;
  const all = root.querySelectorAll("*");
  for (const el of all) {
    if (el.shadowRoot) {
      const nested = deepQuery(selector, el.shadowRoot);
      if (nested) return nested;
    }
  }
  return null;
}

// Cerca un <button> il cui testo corrisponde a una delle etichette fornite,
// attraversando le Shadow DOM (fallback per localizzazioni non previste).
function findButtonByText(labels, root = document) {
  const buttons = [];
  const collect = (r) => {
    r.querySelectorAll("button").forEach((b) => buttons.push(b));
    r.querySelectorAll("*").forEach((el) => {
      if (el.shadowRoot) collect(el.shadowRoot);
    });
  };
  collect(root);
  return buttons.find((b) => labels.test((b.textContent || "").trim())) || null;
}

// Individua il pulsante Iscriviti nell'header del canale.
// Ritorna { renderer, nativeBtn, anchor }: `anchor` è l'elemento dopo cui
// inserire il nostro bottone (subito a fianco di Iscriviti).
function findChannelSubscribeTarget() {
  const headerRoot =
    deepQuery("ytd-c4-tabbed-header-renderer") ||
    deepQuery("ytd-page-header-renderer") ||
    deepQuery("yt-page-header-renderer") ||
    deepQuery("yt-channel-header-form-view-model") ||
    document;

  // 1) Renderer nativo del pulsante Iscriviti (header vecchio e nuovo)
  const renderer =
    deepQuery("ytd-subscribe-button-renderer", headerRoot) ||
    deepQuery("ytd-subscribe-button-renderer");
  if (renderer) {
    const nativeBtn = renderer.querySelector("button") || deepQuery("button", renderer);
    // Il renderer può esistere ancora non idratato (senza <button>): in tal
    // caso non si injecta e si riprova al prossimo tick del MutationObserver.
    if (nativeBtn) return { renderer, nativeBtn, anchor: renderer };
  }

  // 2) Fallback: button nativo con etichetta "Iscriviti"/"Subscribe"
  const labelBtn = findButtonByText(SUBSCRIBE_LABELS, headerRoot);
  if (labelBtn) {
    return {
      renderer: labelBtn.closest("ytd-subscribe-button-renderer"),
      nativeBtn: labelBtn,
      anchor: labelBtn.closest("yt-button-shape, ytd-button-renderer") || labelBtn,
    };
  }

  return null;
}

function injectChannelPageButton() {
  // Solo pagine canale: fuori da lì il bottone va rimosso (navigazione SPA)
  if (!isChannelPage()) {
    document.querySelectorAll(".resumari-channel-btn").forEach((el) => el.remove());
    return;
  }

  // Evita iniezioni duplicate
  if (document.querySelector(".resumari-channel-btn")) return;

  const target = findChannelSubscribeTarget();
  if (!target || !target.anchor || !target.anchor.parentNode) return;

  const btn = document.createElement("button");
  btn.type = "button";
  // Stile Resumari identico a thumbnail e watch (definiti per intero in
  // styles.css: chip scuro, bordo viola, glow viola in hover): nessuna classe
  // nativa di YouTube viene clonata, quindi il bottone è coerente con gli
  // altri due in ogni tema.
  btn.className = "resumari-channel-btn";

  const icon = createResumariIcon('resumari-channel-icon');
  if (icon) btn.appendChild(icon);

  const label = document.createElement("span");
  label.textContent = "Trascrivi canale";

  btn.appendChild(img);
  btn.appendChild(label);
  btn.title = "Trascrivi tutti i video di questo canale con Resumari";
  btn.setAttribute("aria-label", "Trascrivi il canale con Resumari");

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    // Handoff gestito da /videos?channel=...: coda in localStorage che
    // sopravvive al redirect di login e avvia la trascrizione automatica.
    const channelUrl = window.location.origin + window.location.pathname;
    window.open(
      `${RESUMARI_BASE_URL}/videos?channel=${encodeURIComponent(channelUrl)}`,
      "_blank"
    );
    showResumariProgressOverlay({
      title: 'Trascrizione canale avviata',
      subtitle: 'Verranno trascritti gli ultimi video del canale.',
    });
  });

  // Spaziatura e ancoraggio gestiti da CSS (margin-left come il bottone watch):
  // il bottone va subito dopo "Iscriviti", senza dipendere dal gap del contenitore.
  target.anchor.insertAdjacentElement("afterend", btn);
}

// Spegne il watcher (observer + debounce): usato quando il contesto muore.
function stopWatching() {
  contextDead = true;
  try { if (debounceTimer) clearTimeout(debounceTimer); } catch {}
  try { observer.disconnect(); } catch {}
}

// Verifica (in modo sicuro) che il contesto dell'estensione sia ancora vivo.
// Le iniezioni correnti non toccano più chrome.* (l'icona è già risolta in
// ICON_URL), quindi questo è un controllo preventivo: se un reload/update
// dell'estensione ha revocato il contesto, ci fermiamo qui in silenzio.
function isExtensionContextAlive() {
  try {
    // In un contesto valido restituisce sempre l'ID dell'estensione (stringa);
    // se il contesto è stato invalidato l'accesso lancia
    // "Extension context invalidated", catturato qui sotto.
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

// Esegue le tre iniezioni in un unico punto protetto: se il contesto
// dell'estensione è stato invalidato (reload con la tab aperta), l'observer
// viene scollegato invece di lanciare "Extension context invalidated" a ogni
// mutation della pagina. Ogni iniezione è isolata: l'errore di una non blocca
// le altre (es. selettori non ancora idratati sulla watch page).
function runInjections() {
  if (contextDead) return;
  if (!isExtensionContextAlive()) {
    stopWatching();
    return;
  }
  const jobs = [injectThumbnailButtons, injectVideoPageButtons, injectChannelPageButton];
  for (const job of jobs) {
    try {
      job();
    } catch (err) {
      const msg = String((err && err.message) || err);
      if (msg.includes('Extension context invalidated')) {
        stopWatching();
        return;
      }
      console.warn('Resumari: errore durante lintestazione dei pulsanti:', err);
    }
  }
}

// Observer to handle YouTube's SPA dynamic scrolling and page changes
let debounceTimer = null;
const observer = new MutationObserver(() => {
  if (debounceTimer) return;
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    runInjections();
  }, 250);
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['href', 'src']
});

window.addEventListener('yt-navigate-finish', () => {
  setTimeout(runInjections, 300);
});

// Initial run
console.info(
  `[Resumari] content script v${RESUMARI_CONTENT_VERSION} attivo ` +
  `(contesto ${contextDead ? 'NON valido — iniezioni disabilitate' : 'valido'})`
);
runInjections();
