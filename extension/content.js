// Utils
const getYouTubeVideoId = (url) => {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/|&v=)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return (match && match[1].length === 11) ? match[1] : null;
};

const RESUMARI_BASE_URL = 'https://resumari.vercel.app';

// Icona risolta UNA SOLA VOLTA a caricamento, quando il contesto è ancora valido.
// Dopo un reload/update dell'estensione con la tab aperta, ogni accesso
// successivo a chrome.runtime lancia "Extension context invalidated" e uccide
// tutte le iniezioni: memorizzando la stringa qui, non si tocca più
// chrome.runtime in nessuna chiamata successiva.
const ICON_URL = (() => {
  try {
    return chrome.runtime.getURL('icons/icon128.png');
  } catch {
    return null;
  }
})();

// true quando il contesto dell'estensione è morto: le iniezioni vengono
// annullate in silenzio invece di lanciare eccezioni non catturate.
let contextDead = ICON_URL === null;

// Versione del content script: serve per diagnosticare in console quale istanza
// è in esecuzione nella tab (dopo un reload dell'estensione, le tab aperte
// prima eseguono ancora la vecchia istanza finché non vengono ricaricate).
const RESUMARI_CONTENT_VERSION = '1.1.2';

// UI Injection
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

  const iconUrl = ICON_URL;

  renderers.forEach(renderer => {
    // Evita iniezioni duplicate
    if (renderer.querySelector('.resumari-thumb-btn')) return;

    // Cerca il link o il contenitore cliccabile della thumbnail
    const anchor = renderer.querySelector('a#thumbnail, a.ytd-thumbnail, a[href*="/watch"], a[href*="/shorts"]');
    if (!anchor) return;

    // Estrae l'ID del video dal link
    const videoId = getYouTubeVideoId(anchor.href);
    if (!videoId) return;

    // Crea il bottone circolare glassmorphic viola glow
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'resumari-thumb-btn';
    btn.title = 'Trascrivi e riassumi con Resumari';
    btn.setAttribute('aria-label', 'Trascrivi con Resumari');

    const img = document.createElement('img');
    img.src = iconUrl;
    img.alt = 'Resumari';
    img.className = 'resumari-thumb-icon';

    btn.appendChild(img);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      window.open(`${RESUMARI_BASE_URL}/chat?video=${videoId}`, '_blank');
    });

    // YouTube ha vari container per thumbnail/preview.
    // Inserendolo dentro anchor (o container thumbnail), assicuriamo che sia posizionato in alto a destra.
    // Per garantire che sia sopra qualsiasi inline player di preview (ytd-inline-preview-player),
    // impostiamo z-index elevato e pointer-events attivi.
    anchor.appendChild(btn);
  });
}

function injectVideoPageButtons() {
  // Previene iniezioni duplicate
  if (document.querySelector('.resumari-watch-btn')) return;

  const videoId = getYouTubeVideoId(window.location.href);
  if (!videoId) return;

  // Cerca il gruppo segmentato dei pulsanti Like/Dislike di YouTube
  const likeSegment = document.querySelector(
    'ytd-segmented-like-dislike-button-renderer, segmented-like-dislike-button-view-model, #segmented-like-button'
  );

  // In alternativa cerca il pulsante condividi o la barra delle azioni (#actions-inner #top-level-buttons-computed)
  const shareBtn = document.querySelector(
    'ytd-button-renderer:has(yt-icon[icon="share"]), yt-button-view-model:has(yt-icon[icon="share"])'
  );
  const actionsContainer = document.querySelector(
    '#top-row #actions-inner #top-level-buttons-computed, #top-level-buttons-computed, #actions #top-level-buttons'
  );

  if (!likeSegment && !shareBtn && !actionsContainer) return;

  const iconUrl = ICON_URL;

  const transcriptBtn = document.createElement('button');
  transcriptBtn.type = 'button';
  transcriptBtn.className = 'resumari-watch-btn';
  transcriptBtn.title = 'Trascrivi e riassumi questo video con Resumari';
  transcriptBtn.setAttribute('aria-label', 'Trascrivi con Resumari');

  const img = document.createElement('img');
  img.src = iconUrl;
  img.alt = 'Resumari';
  img.className = 'resumari-watch-icon';

  const label = document.createElement('span');
  label.textContent = 'Trascrivi';

  transcriptBtn.appendChild(img);
  transcriptBtn.appendChild(label);

  transcriptBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(`${RESUMARI_BASE_URL}/chat?video=${videoId}&action=transcript`, '_blank');
  });

  // Posizionamento: preferibilmente subito dopo il blocco Like/Dislike (quindi prima di Condividi)
  if (likeSegment && likeSegment.parentNode) {
    if (likeSegment.nextSibling) {
      likeSegment.parentNode.insertBefore(transcriptBtn, likeSegment.nextSibling);
    } else {
      likeSegment.parentNode.appendChild(transcriptBtn);
    }
  } else if (shareBtn && shareBtn.parentNode) {
    shareBtn.parentNode.insertBefore(transcriptBtn, shareBtn);
  } else if (actionsContainer) {
    actionsContainer.appendChild(transcriptBtn);
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

// Sceglie il pulsante da cui clonare lo stile nativo:
// preferisce il pulsante di testo affiancato (es. "Abbonati"/Join, outline),
// altrimenti lo stesso Iscriviti (filled) — in entrambi i casi lo stile è
// identico agli altri pulsanti di YouTube, dark e light compresi.
function pickStyleSource(target) {
  const { renderer, nativeBtn } = target;
  const row = (renderer && renderer.parentElement) || nativeBtn.parentElement;
  if (row) {
    const candidates = row.querySelectorAll("button, yt-button-shape");
    for (const node of candidates) {
      const btn = node.tagName === "BUTTON" ? node : node.querySelector("button");
      if (!btn || btn === nativeBtn || btn.classList.contains("resumari-channel-btn")) continue;
      if (renderer && renderer.contains(btn)) continue;
      const text = (btn.textContent || "").trim();
      // Solo pulsanti con etichetta breve: esclude campanello e overflow (icon-only)
      if (text.length >= 3 && text.length <= 24 && !SUBSCRIBE_LABELS.test(text)) {
        return btn;
      }
    }
  }
  return nativeBtn;
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

  const styleSource = pickStyleSource(target);

  const btn = document.createElement("button");
  btn.type = "button";
  // Classi native di YouTube clonate → stesso aspetto di Iscriviti/Abbonati
  // (font, altezza, border-radius, tema chiaro/scuro e hover identici)
  btn.className = `${styleSource.className} resumari-channel-btn`.trim();

  const img = document.createElement("img");
  img.src = ICON_URL;
  img.alt = "";
  img.draggable = false;
  img.className = "resumari-channel-icon";

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
  });

  // Spaziatura identica agli altri pulsanti: se il contenitore non ha gap
  // (container legacy usano i margin), aggiunge un margine equivalente.
  const row = target.anchor.parentElement;
  if (row) {
    const gap = parseFloat(getComputedStyle(row).columnGap || "0") || 0;
    if (!gap) btn.style.marginLeft = "8px";
    row.insertBefore(btn, target.anchor.nextSibling);
  } else {
    target.anchor.insertAdjacentElement("afterend", btn);
  }
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
// mutation della pagina. Gli altri errori vengono solo loggati.
function runInjections() {
  if (contextDead) return;
  if (!isExtensionContextAlive()) {
    stopWatching();
    return;
  }
  try {
    injectThumbnailButtons();
    injectVideoPageButtons();
    injectChannelPageButton();
  } catch (err) {
    const msg = String((err && err.message) || err);
    if (msg.includes('Extension context invalidated')) {
      stopWatching();
      return;
    }
    console.warn('Resumari: errore durante lintestazione dei pulsanti:', err);
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
  subtree: true
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
