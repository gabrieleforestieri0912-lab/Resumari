// Utils
const getYouTubeVideoId = (url) => {
  if (!url) return null;
  const regExp = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/|&v=)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return (match && match[1].length === 11) ? match[1] : null;
};

const RESUMARI_BASE_URL = 'https://resumari.vercel.app';

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

  const iconUrl = chrome.runtime.getURL('icons/icon128.png');

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

  const iconUrl = chrome.runtime.getURL('icons/icon128.png');

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

// Observer to handle YouTube's SPA dynamic scrolling and page changes
let debounceTimer = null;
const observer = new MutationObserver(() => {
  if (debounceTimer) return;
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    injectThumbnailButtons();
    injectVideoPageButtons();
  }, 250);
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

window.addEventListener('yt-navigate-finish', () => {
  setTimeout(() => {
    injectThumbnailButtons();
    injectVideoPageButtons();
  }, 300);
});

// Initial run
injectThumbnailButtons();
injectVideoPageButtons();
