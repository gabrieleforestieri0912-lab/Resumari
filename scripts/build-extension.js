const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist-extension');
const panelDir = path.join(__dirname, 'extension-panel');
const VERSION = require('../package.json').version;

// The side panel is a fully standalone app (plain HTML/CSS/JS under
// scripts/extension-panel/) with NO dependency on the site's Next.js build:
// it talks to the backend over the absolute API base and shares auth through
// chrome.storage (resumariAuth). This keeps the extension small and lets it
// build without a `next build` step.
//
// MV3 CSP: script-src 'self' is enough — the panel uses only external scripts,
// no inline handlers. style-src keeps 'unsafe-inline' because panel.js
// occasionally sets element.style properties at runtime (allowed for styles).
const manifest = {
  "manifest_version": 3,
  "name": "Resumari - Trascrizioni AI",
  "version": VERSION,
  "description": "Assistente AI per YouTube: trascrizioni istantanee, riassunti intelligenti e chat con i video, senza cambiare scheda.",
  "minimum_chrome_version": "116",
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline'"
  },
  "permissions": ["sidePanel", "storage"],
  "host_permissions": [
    "*://www.youtube.com/*",
    "http://localhost:3000/*",
    "http://127.0.0.1:3000/*",
    "https://resumari.it/*"
  ],
  "commands": {
    "transcribe-video": {
      "suggested_key": { "default": "Alt+R", "mac": "Alt+R" },
      "description": "Trascrivi il video corrente"
    }
  },
  "web_accessible_resources": [
    {
      "resources": ["icon.png", "resumari.png"],
      "matches": [
        "*://*.youtube.com/*",
        "http://localhost:3000/*",
        "http://127.0.0.1:3000/*",
        "https://resumari.it/*"
      ]
    }
  ],
  // No default_popup: clicking the toolbar icon must open the side panel
  // directly (see chrome.sidePanel.setPanelBehavior in background.js).
  "action": {
    "default_icon": { "16": "icon.png", "32": "icon.png", "48": "icon.png", "128": "icon.png" },
    "default_title": "Resumari - Trascrizioni AI"
  },
  "side_panel": { "default_path": "panel.html" },
  "background": { "service_worker": "background.js" },
  "content_scripts": [
    { "matches": ["*://www.youtube.com/*"], "js": ["content.js"], "run_at": "document_idle" },
    { "matches": ["https://resumari.it/*", "http://localhost:3000/*", "http://127.0.0.1:3000/*"], "js": ["content.js"], "run_at": "document_idle" }
  ],
  "icons": { "16": "icon.png", "32": "icon.png", "48": "icon.png", "128": "icon.png" }
};

const background = `// Clicking the toolbar icon opens the side panel directly, with no popup in
// between. Must be called on worker startup (not inside an event listener).
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: "https://resumari.it/welcome" });
  }
});
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "openSidePanel" && sender.tab) { chrome.sidePanel.open({ windowId: sender.tab.windowId }); }
});
chrome.commands.onCommand.addListener((command) => {
  if (command !== "transcribe-video") return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab || !tab.id) return;
    chrome.tabs.sendMessage(tab.id, { type: "GET_VIDEO_ID" }, (res) => {
      if (chrome.runtime.lastError || !res || !res.videoId) return;
      chrome.storage.local.set({ pendingTranscript: { videoId: res.videoId, platform: "youtube", url: "https://www.youtube.com/watch?v=" + res.videoId, autoProcess: true, timestamp: Date.now() } });
      chrome.sidePanel.open({ windowId: tab.windowId });
    });
  });
});`;

const content = `chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg.type === "GET_VIDEO_ID") {
    sendResponse({ videoId: getVideoId() });
    return;
  }
  if (msg.type === "AUTH_SYNC" && msg.token && msg.user) {
    localStorage.setItem("token", msg.token);
    localStorage.setItem("user", JSON.stringify(msg.user));
    window.dispatchEvent(new CustomEvent("resumari-auth-changed", { detail: { token: msg.token, user: msg.user } }));
    try { chrome.storage.local.set({ resumariAuth: { token: msg.token, user: msg.user } }); } catch (e) {}
    sendResponse({ success: true });
    return;
  }
  if (msg.type === "AUTH_LOGOUT") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new CustomEvent("resumari-auth-changed", { detail: null }));
    try { chrome.storage.local.remove("resumariAuth"); } catch (e) {}
    sendResponse({ success: true });
    return;
  }
});

// --- Shared auth bridge (site <-> side panel) via chrome.storage.local ---
// One login anywhere (site or panel) is reflected everywhere.
function isResumariSite() {
  var host = location.hostname;
  return host.indexOf("resumari") !== -1 || host === "localhost" || host === "127.0.0.1";
}
// Site -> extension: the site dispatches this event on login/logout.
// NOTE: this trusts page-dispatched events; the side panel re-validates any
// token against /api/profile before adopting it, so forged values never grant
// access — they are only ever cleared again.
window.addEventListener("resumari-auth-change", function (e) {
  var d = e && e.detail;
  if (d && d.token && d.user) {
    try { chrome.storage.local.set({ resumariAuth: { token: d.token, user: d.user } }); } catch (ex) {}
  } else {
    try { chrome.storage.local.remove("resumariAuth"); } catch (ex) {}
  }
});
// Extension -> site: keep the site's localStorage in sync when the panel logs
// in/out. Only on the Resumari site — never on YouTube or other origins.
chrome.storage.onChanged.addListener(function (changes, area) {
  if (area !== "local" || !changes.resumariAuth || !isResumariSite()) return;
  var next = changes.resumariAuth.newValue;
  if (next && next.token && next.user) {
    localStorage.setItem("token", next.token);
    localStorage.setItem("user", JSON.stringify(next.user));
    window.dispatchEvent(new CustomEvent("resumari-auth-changed", { detail: { token: next.token, user: next.user } }));
  } else {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new CustomEvent("resumari-auth-changed", { detail: null }));
  }
});

const ICON_URL = chrome.runtime.getURL("resumari.png");
function getPlatform() {
  const host = location.hostname;
  if (host.includes("youtube.com")) return "youtube";
  return null;
}
function getVideoIdFromUrl(url) {
  try {
    var u = new URL(url);
    if (u.hostname.indexOf("youtube") !== -1 && u.pathname.indexOf("/shorts/") === 0) {
      return u.pathname.split("/")[2] || null;
    }
    return u.searchParams.get("v");
  } catch (e) { return null; }
}
function getVideoId() {
  if (getPlatform() !== "youtube") return null;
  return getVideoIdFromUrl(location.href);
}
function isVideoPage() {
  if (getPlatform() !== "youtube") return false;
  return location.pathname === "/watch";
}
function openSidePanel(videoId, platform) {
  if (!videoId) return;
  const url = "https://www.youtube.com/watch?v=" + videoId;
  const payload = { videoId, platform, url, autoProcess: true, timestamp: Date.now() };
  chrome.storage.local.set({ pendingTranscript: payload });
  chrome.runtime.sendMessage({ type: "openSidePanel" });
}
function injectStyles() {
  if (document.getElementById("resumari-styles")) return;
  const s = document.createElement("style");
  s.id = "resumari-styles";
  s.textContent =
    ".resumari-chip { display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 12px;border-radius:18px;border:none;background:rgba(0,0,0,0.05);color:#0f0f0f;font-family:Roboto,Arial,sans-serif;font-size:14px;font-weight:500;cursor:pointer;margin-left:8px;transition:background 0.15s cubic-bezier(0.4,0,0.2,1);flex-shrink:0;align-self:center;white-space:nowrap}" +
    ".resumari-chip:hover { background:rgba(0,0,0,0.1) !important }" +
    ".resumari-chip:active { transform:scale(0.96) !important;transition-duration:0.08s !important }" +
    "html[dark] .resumari-chip { background:rgba(255,255,255,0.1);color:#f1f1f1 }" +
    "html[dark] .resumari-chip:hover { background:rgba(255,255,255,0.2) !important }" +
    "@media (prefers-reduced-motion:reduce){.resumari-chip{transition:none !important;transform:none !important}}" +
    ".resumari-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(16px);z-index:999999;padding:10px 18px;border-radius:999px;background:rgba(15,15,15,0.92);color:#fff;font-family:Roboto,Arial,sans-serif;font-size:13px;font-weight:500;box-shadow:0 8px 30px rgba(0,0,0,0.35);opacity:0;pointer-events:none;transition:opacity 0.2s ease,transform 0.2s ease;backdrop-filter:blur(8px);max-width:80vw;text-align:center}" +
    ".resumari-toast.resumari-toast-show{opacity:1;transform:translateX(-50%) translateY(0)}" +
    "@media (prefers-reduced-motion:reduce){.resumari-toast{transition:none}}" +
    ".resumari-thumb-btn { position:absolute !important;top:6px !important;right:6px !important;width:32px !important;height:32px !important;padding:0 !important;border-radius:50% !important;border:1px solid rgba(255,255,255,0.15) !important;background:rgba(0,0,0,0.65) !important;cursor:pointer !important;display:flex !important;align-items:center !important;justify-content:center !important;z-index:200 !important;opacity:0 !important;transition:opacity 0.2s ease,transform 0.2s ease,background 0.2s ease !important;backdrop-filter:blur(6px) !important;pointer-events:auto !important;box-shadow:0 2px 8px rgba(0,0,0,0.5) !important;transform:scale(0.9) !important}" +
    ".resumari-thumb-btn:hover { background:rgba(147,51,234,0.55) !important;border-color:rgba(147,51,234,0.5) !important;backdrop-filter:blur(10px) !important;transform:scale(1.15) !important;box-shadow:0 4px 20px rgba(147,51,234,0.45),0 0 0 1px rgba(147,51,234,0.2) !important }" +
    ".resumari-thumb-btn img { width:22px !important;height:22px !important;border-radius:50% !important;display:block !important }" +
    ".resumari-thumb-container { overflow:visible !important }" +
    "ytd-thumbnail:hover .resumari-thumb-btn,.resumari-thumb-container:hover .resumari-thumb-btn," +
    "yt-thumbnail-view-model:hover .resumari-thumb-btn," +
    "ytd-rich-item-renderer:hover .resumari-thumb-btn,ytd-video-renderer:hover .resumari-thumb-btn,ytd-grid-video-renderer:hover .resumari-thumb-btn,ytd-compact-video-renderer:hover .resumari-thumb-btn,ytd-compact-autoplay-renderer:hover .resumari-thumb-btn,ytd-playlist-video-renderer:hover .resumari-thumb-btn,ytd-playlist-panel-video-renderer:hover .resumari-thumb-btn,ytd-reel-item-renderer:hover .resumari-thumb-btn," +
    "yt-lockup-view-model:hover .resumari-thumb-btn { opacity:1 !important;transform:scale(1) !important }";
  document.head.appendChild(s);
}
var toastTimer = null;
function showToast(text) {
  var t = document.getElementById("resumari-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "resumari-toast";
    t.className = "resumari-toast";
    document.body.appendChild(t);
  }
  t.textContent = text;
  t.classList.add("resumari-toast-show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    t.classList.remove("resumari-toast-show");
  }, 1800);
}
var injectTimer = null;
function scheduleInjection() {
  if (injectTimer) clearTimeout(injectTimer);
  injectTimer = setTimeout(function () {
    injectTimer = null;
    injectVideoPageButton();
    injectThumbnailButtons();
  }, 150);
}
function findThumbLink(thumb) {
  var direct = thumb.querySelector("a#thumbnail") || thumb.querySelector("a[href*='/watch?v=']") || thumb.querySelector("a[href*='/shorts/']");
  if (direct) return direct;
  var ancestor = (typeof thumb.closest === "function") && (thumb.closest("a[href*='/watch?v=']") || thumb.closest("a[href*='/shorts/']") || thumb.closest("a#thumbnail"));
  if (ancestor) return ancestor;
  // Modern YouTube sidebar (watch pages): the link wraps the thumbnail.
  var parent = thumb.parentElement;
  if (parent) {
    var sibling = parent.querySelector && (parent.querySelector("a[href*='/watch?v=']") || parent.querySelector("a[href*='/shorts/']") || parent.querySelector("a#thumbnail"));
    if (sibling) return sibling;
  }
  return null;
}
function addThumbnailButton(thumb) {
  if (thumb.querySelector(".resumari-thumb-btn")) return;
  var link = findThumbLink(thumb);
  if (!link) return;
  var videoId = getVideoIdFromUrl(link.href);
  if (!videoId) return;
  var btn = document.createElement("button");
  btn.className = "resumari-thumb-btn";
  btn.innerHTML = '<img src="' + ICON_URL + '" alt="R">';
  btn.addEventListener("click", function(e) {
    e.stopPropagation();
    e.preventDefault();
    showToast("Apertura Resumari…");
    try { openSidePanel(videoId, "youtube"); } catch(ex) {}
  });
  var pos = getComputedStyle(thumb).position;
  if (pos !== "relative" && pos !== "absolute" && pos !== "fixed") {
    thumb.style.position = "relative";
  }
  thumb.style.setProperty("overflow", "visible", "important");
  thumb.appendChild(btn);
  thumb.classList.add("resumari-thumb-container");
}
function injectThumbnailButtons() {
  var handled = {}; // de-duplicate by link href across the two thumbnail element types
  document.querySelectorAll("ytd-thumbnail, yt-thumbnail-view-model").forEach(function(thumb) {
    var link = findThumbLink(thumb);
    if (!link || handled[link.href]) return;
    handled[link.href] = true;
    addThumbnailButton(thumb);
  });
}
function injectVideoPageButton() {
  if (!isVideoPage()) { var old = document.getElementById("resumari-transcribe-btn"); if (old) old.remove(); return }
  var existing = document.getElementById("resumari-transcribe-btn");
  var c = document.querySelector("ytd-watch-metadata #actions, ytd-video-primary-info-renderer #actions");
  if (!c) return;
  if (existing) {
    if (c.contains(existing)) return;
    existing.remove();
  }
  const b = document.createElement("button");
  b.className = "resumari-chip";
  b.id = "resumari-transcribe-btn";
  b.innerHTML = '<img src="' + ICON_URL + '" style="width:18px;height:18px;border-radius:50%"> <span>Trascrivi</span>';
  b.onclick = function() { var id = getVideoId(); if (id) { showToast("Apertura Resumari…"); openSidePanel(id, "youtube"); } };
  var shareBtn = c.querySelector('ytd-button-renderer[aria-label*="Share"], ytd-button-renderer[aria-label*="Condividi"]');
  if (shareBtn) c.insertBefore(b, shareBtn);
  else c.appendChild(b);
}
function init() {
  injectStyles();
  injectVideoPageButton();
  injectThumbnailButtons();
  let lastUrl = location.href;
  new MutationObserver(function() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
    }
    scheduleInjection();
  }).observe(document.body, { childList: true, subtree: true });
  setTimeout(injectThumbnailButtons, 1500);
  setTimeout(injectThumbnailButtons, 3000);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();`;

// Injects the backend base URL into the standalone panel JS. Falls back to the
// local dev server (localhost:3000). The panel talks to the backend directly
// (CORS is handled by src/proxy.ts on the server), so it works both in local
// development and in production when NEXT_PUBLIC_APP_URL is set on the host
// (e.g. https://resumari.it on Vercel).
function panelJsWithBase() {
  const apiBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const src = fs.readFileSync(path.join(panelDir, 'panel.js'), 'utf-8');
  return src.split('__RESUMARI_API_BASE__').join(apiBase);
}

function buildExtension() {
  // Always start from a clean dist so stale files from older builds never
  // ship inside the extension package (e.g. leftover Next.js chunks from
  // previous builds of the old site-based panel).
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  fs.writeFileSync(path.join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const publicIcon = path.join(__dirname, '../public/resumari.png');
  const distIcon = path.join(distDir, 'icon.png');
  if (fs.existsSync(publicIcon)) fs.copyFileSync(publicIcon, distIcon);

  const distResumariImg = path.join(distDir, 'resumari.png');
  if (fs.existsSync(publicIcon)) fs.copyFileSync(publicIcon, distResumariImg);

  fs.writeFileSync(path.join(distDir, 'background.js'), background);
  fs.writeFileSync(path.join(distDir, 'content.js'), content);

  // Standalone side panel: panel.html + panel.css + panel.js.
  fs.copyFileSync(path.join(panelDir, 'panel.html'), path.join(distDir, 'panel.html'));
  fs.copyFileSync(path.join(panelDir, 'panel.css'), path.join(distDir, 'panel.css'));
  fs.writeFileSync(path.join(distDir, 'panel.js'), panelJsWithBase());

  console.log(`✅ Extension version ${VERSION} created (standalone panel)`);
}

if (require.main === module) {
  buildExtension();
}

module.exports = { manifest, background, content, panelJsWithBase, buildExtension, distDir };
