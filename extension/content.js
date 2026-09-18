// Utils
const getYouTubeVideoId = (url) => {
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const RESUMARI_BASE_URL = 'https://resumari.vercel.app';

// UI Injection
function injectThumbnailButtons() {
  // YouTube uses a lot of dynamic content, so we look for video renderers
  const thumbnails = document.querySelectorAll('ytd-rich-grid-media, ytd-video-renderer, ytd-compact-video-renderer');

  thumbnails.forEach(thumb => {
    if (thumb.querySelector('.resumari-btn')) return;

    const overlay = document.createElement('div');
    overlay.className = 'resumari-thumbnail-overlay';

    const btn = document.createElement('button');
    btn.className = 'resumari-btn';
    btn.innerHTML = '✨ Riassumi';

    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const anchor = thumb.querySelector('a#thumbnail');
      if (anchor) {
        const videoId = getYouTubeVideoId(anchor.href);
        if (videoId) {
          window.open(`${RESUMARI_BASE_URL}/chat?video=${videoId}`, '_blank');
        }
      }
    };

    overlay.appendChild(btn);

    // Try to find the thumbnail container to append to
    const container = thumb.querySelector('#thumbnail') || thumb.querySelector('.ytd-thumbnail');
    if (container) {
      container.style.position = 'relative';
      container.appendChild(overlay);
    }
  });
}

function injectVideoPageButtons() {
  const actionPanel = document.querySelector('#top-row #actions-inner');
  if (!actionPanel || document.querySelector('.resumari-video-actions')) return;

  const videoId = getYouTubeVideoId(window.location.href);
  if (!videoId) return;

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'resumari-video-actions';

  const summarizeBtn = document.createElement('button');
  summarizeBtn.className = 'resumari-btn';
  summarizeBtn.innerHTML = '✨ Riassumi';
  summarizeBtn.onclick = () => {
    window.open(`${RESUMARI_BASE_URL}/chat?video=${videoId}`, '_blank');
  };

  const transcriptBtn = document.createElement('button');
  transcriptBtn.className = 'resumari-btn';
  transcriptBtn.innerHTML = '📄 Trascrizione';
  transcriptBtn.onclick = () => {
    window.open(`${RESUMARI_BASE_URL}/chat?video=${videoId}&action=transcript`, '_blank');
  };

  actionsDiv.appendChild(summarizeBtn);
  actionsDiv.appendChild(transcriptBtn);
  actionPanel.appendChild(actionsDiv);
}

// Observer to handle YouTube's SPA navigation
const observer = new MutationObserver(() => {
  injectThumbnailButtons();
  injectVideoPageButtons();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Initial run
injectThumbnailButtons();
injectVideoPageButtons();
