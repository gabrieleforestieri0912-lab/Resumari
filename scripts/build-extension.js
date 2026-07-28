const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist-extension');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const manifest = {
  "manifest_version": 3,
  "name": "Resumari - Trascrizioni AI",
  "version": "1.1.2",
  "description": "Assistente AI per YouTube: trascrizioni istantanee, riassunti intelligenti e chat interattiva con i video.",
  "permissions": ["sidePanel", "storage"],
  "host_permissions": [
    "*://www.youtube.com/*",
    "http://localhost:3000/*",
    "http://127.0.0.1:3000/*",
    "https://resumari.it/*"
  ],
  "web_accessible_resources": [
    {
      "resources": ["icon.png", "resumari.png", "assets/*"],
      "matches": [
        "*://*.youtube.com/*", 
        "http://localhost:3000/*", 
        "http://127.0.0.1:3000/*",
        "https://resumari.it/*"
      ]
    }
  ],
  "action": {
    "default_icon": { "16": "icon.png", "32": "icon.png", "48": "icon.png", "128": "icon.png" },
    "default_title": "Resumari - Trascrizioni AI"
  },
  "side_panel": { "default_path": "index.html" },
  "background": { "service_worker": "background.js" },
  "content_scripts": [
    { "matches": ["*://www.youtube.com/*"], "js": ["content.js"], "run_at": "document_idle" },
    { "matches": ["https://resumari.it/*", "http://localhost:3000/*", "http://127.0.0.1:3000/*"], "js": ["content.js"], "run_at": "document_idle" }
  ],
  "icons": { "16": "icon.png", "32": "icon.png", "48": "icon.png", "128": "icon.png" }
};

fs.writeFileSync(path.join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

const publicIcon = path.join(__dirname, '../public/resumari.png');
const distIcon = path.join(distDir, 'icon.png');
if (fs.existsSync(publicIcon)) fs.copyFileSync(publicIcon, distIcon);

const distResumariImg = path.join(distDir, 'resumari.png');
if (fs.existsSync(publicIcon)) fs.copyFileSync(publicIcon, distResumariImg);

const background = `chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: "https://resumari.it/welcome" });
  }
});
chrome.action.onClicked.addListener((tab) => { chrome.sidePanel.open({ windowId: tab.windowId }); });
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "openSidePanel" && sender.tab) { chrome.sidePanel.open({ windowId: sender.tab.windowId }); }
});`;

fs.writeFileSync(path.join(distDir, 'background.js'), background);

const content = `chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg.type === "AUTH_SYNC" && msg.token && msg.user) {
    localStorage.setItem("token", msg.token);
    localStorage.setItem("user", JSON.stringify(msg.user));
    window.dispatchEvent(new CustomEvent("resumari-auth-changed", { detail: { token: msg.token, user: msg.user } }));
    sendResponse({ success: true });
    return;
  }
  if (msg.type === "AUTH_LOGOUT") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new CustomEvent("resumari-auth-changed", { detail: null }));
    sendResponse({ success: true });
    return;
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
    return new URLSearchParams(url.split("?")[1]).get("v");
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
    ".resumari-chip { display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 12px;border-radius:18px;border:none;background:rgba(0,0,0,0.05);color:#0f0f0f;font-family:Roboto,Arial,sans-serif;font-size:14px;font-weight:500;cursor:pointer;margin-left:8px;transition:background 0.15s ease;flex-shrink:0;align-self:center;white-space:nowrap}" +
    ".resumari-chip:hover { background:rgba(0,0,0,0.1) !important }" +
    "html[dark] .resumari-chip { background:rgba(255,255,255,0.1);color:#f1f1f1 }" +
    "html[dark] .resumari-chip:hover { background:rgba(255,255,255,0.15) !important }" +
    ".resumari-thumb-btn { position:absolute !important;top:6px !important;right:6px !important;width:32px !important;height:32px !important;padding:0 !important;border-radius:50% !important;border:1px solid rgba(255,255,255,0.15) !important;background:rgba(0,0,0,0.65) !important;cursor:pointer !important;display:flex !important;align-items:center !important;justify-content:center !important;z-index:200 !important;opacity:0 !important;transition:opacity 0.2s ease,transform 0.2s ease,background 0.2s ease !important;backdrop-filter:blur(6px) !important;pointer-events:auto !important;box-shadow:0 2px 8px rgba(0,0,0,0.5) !important;transform:scale(0.9) !important}" +
    ".resumari-thumb-btn:hover { background:rgba(147,51,234,0.55) !important;border-color:rgba(147,51,234,0.5) !important;backdrop-filter:blur(10px) !important;transform:scale(1.15) !important;box-shadow:0 4px 20px rgba(147,51,234,0.45),0 0 0 1px rgba(147,51,234,0.2) !important }" +
    ".resumari-thumb-btn img { width:22px !important;height:22px !important;border-radius:50% !important;display:block !important }" +
    ".resumari-thumb-container { overflow:visible !important }" +
    "ytd-thumbnail:hover .resumari-thumb-btn,.resumari-thumb-container:hover .resumari-thumb-btn," +
    "ytd-rich-item-renderer:hover .resumari-thumb-btn,ytd-video-renderer:hover .resumari-thumb-btn,ytd-grid-video-renderer:hover .resumari-thumb-btn,ytd-compact-video-renderer:hover .resumari-thumb-btn,ytd-compact-autoplay-renderer:hover .resumari-thumb-btn,ytd-playlist-video-renderer:hover .resumari-thumb-btn,ytd-playlist-panel-video-renderer:hover .resumari-thumb-btn,ytd-reel-item-renderer:hover .resumari-thumb-btn { opacity:1 !important;transform:scale(1) !important }";
  document.head.appendChild(s);
}
function addThumbnailButton(thumb) {
  if (thumb.querySelector(".resumari-thumb-btn")) return;
  var link = thumb.querySelector("a#thumbnail") || thumb.querySelector("a[href*='/watch?v=']") || thumb.closest("a#thumbnail") || thumb.closest("a[href*='/watch?v=']");
  if (!link) return;
  var videoId = getVideoIdFromUrl(link.href);
  if (!videoId) return;
  var btn = document.createElement("button");
  btn.className = "resumari-thumb-btn";
  btn.innerHTML = '<img src="' + ICON_URL + '" alt="R">';
  btn.addEventListener("click", function(e) {
    e.stopPropagation();
    e.preventDefault();
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
  document.querySelectorAll("ytd-thumbnail").forEach(function(thumb) {
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
  b.onclick = function() { var id = getVideoId(); if (id) openSidePanel(id, "youtube"); };
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
    injectVideoPageButton();
    injectThumbnailButtons();
  }).observe(document.body, { childList: true, subtree: true });
  setTimeout(injectThumbnailButtons, 1500);
  setTimeout(injectThumbnailButtons, 3000);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();`;

fs.writeFileSync(path.join(distDir, 'content.js'), content);

const nextDir = path.join(__dirname, '../.next');
const assetsDir = path.join(distDir, 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

const staticChunksDir = path.join(nextDir, 'static/chunks');
if (fs.existsSync(staticChunksDir)) {
  const destChunksDir = path.join(assetsDir, 'chunks');
  if (!fs.existsSync(destChunksDir)) fs.mkdirSync(destChunksDir, { recursive: true });
  fs.readdirSync(staticChunksDir).forEach(f => fs.copyFileSync(path.join(staticChunksDir, f), path.join(destChunksDir, f)));
}

const staticMediaDir = path.join(nextDir, 'static/media');
if (fs.existsSync(staticMediaDir)) {
  const destMediaDir = path.join(assetsDir, 'media');
  if (!fs.existsSync(destMediaDir)) fs.mkdirSync(destMediaDir, { recursive: true });
  fs.readdirSync(staticMediaDir).forEach(f => fs.copyFileSync(path.join(staticMediaDir, f), path.join(destMediaDir, f)));
}

const customIndexPath = path.join(distDir, 'index.html');
if (!fs.existsSync(customIndexPath)) {
  const appHtmlPath = path.join(nextDir, 'server/app/index.html');
  if (fs.existsSync(appHtmlPath)) {
    let h = fs.readFileSync(appHtmlPath, 'utf-8');
    h = h.split('/_next/static/').join('./assets/').split('src="/resumari.png"').join('src="./assets/resumari.png"').split('href="/resumari.png"').join('href="./assets/resumari.png"').split('/_next/static/media/').join('./assets/media/');
    h = h.replace('</head>', '<script>try{chrome.storage.local.get("pendingTranscript",function(r){var p=r.pendingTranscript;if(p&&p.autoProcess){chrome.storage.local.remove("pendingTranscript");localStorage.setItem("resumari_pending_video",JSON.stringify({videoId:p.videoId,action:"transcribe_full"}));window.__resumariPendingReady=true}})}catch(e){}</script><script>window.name = "resumari-extension";</script></head>');
    fs.writeFileSync(path.join(distDir, 'index.html'), h);
  }
}

const pageJsPath = path.join(nextDir, 'server/app/page.js');
if (fs.existsSync(pageJsPath)) fs.copyFileSync(pageJsPath, path.join(distDir, 'assets/page.js'));

const publicDir = path.join(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  fs.readdirSync(publicDir).forEach(f => {
    if (f.endsWith('.png') || f.endsWith('.ico') || f.endsWith('.svg')) fs.copyFileSync(path.join(publicDir, f), path.join(assetsDir, f));
  });
}
console.log('✅ Extension version 1.1.2 created');
