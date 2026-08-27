const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist-extension');
const panelDir = path.join(__dirname, 'extension-panel');
const VERSION = require('../package.json').version;

// Mirror Next.js behavior for scripts that run outside `next build` (e.g.
// `npm run copy:extension`): honor NEXT_PUBLIC_APP_URL from .env.local
// without depending on dotenv. Already-set env vars always win.
function loadLocalEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  lines.forEach((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) return;
    const key = m[1];
    if (key in process.env) return;
    process.env[key] = m[2].replace(/^["']|["']$/g, '');
  });
}
loadLocalEnv();

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
    "https://resumari.com/*"
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
        "https://resumari.com/*"
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
    { "matches": ["https://resumari.com/*", "http://localhost:3000/*", "http://127.0.0.1:3000/*"], "js": ["content.js"], "run_at": "document_idle" }
  ],
  "icons": { "16": "icon.png", "32": "icon.png", "48": "icon.png", "128": "icon.png" }
};

const background = `// Clicking the toolbar icon opens the side panel directly, with no popup in
// between. Must be called on worker startup (not inside an event listener).
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({ url: "https://resumari.com/welcome" });
  }
});
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Only our own content scripts may drive the background: a web page cannot
  // reach chrome.runtime directly, but this keeps any stray caller out and
  // lets us open tabs only for URLs we built ourselves.
  if (!sender || sender.id !== chrome.runtime.id) return;
  if (msg.type === "openSidePanel" && sender.tab) { chrome.sidePanel.open({ windowId: sender.tab.windowId }); }
  // openChannelTab must point at our own handoff page (base is baked at
  // build time) — never an arbitrary URL.
  if (msg.type === "openChannelTab" && typeof msg.url === "string" && msg.url.indexOf("__RESUMARI_APP_BASE__/videos?channel=") === 0) {
    chrome.tabs.create({ url: msg.url, active: true });
  }
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

const content = `// --- Security helpers (shared by every auth bridge below) ---
// A real session token is a signed JWT (header.payload.signature). Only such
// values are ever mirrored into chrome.storage or page localStorage, so junk
// dispatched by a page (forged events, XSS output) is rejected on sight.
function isValidToken(t) {
  return typeof t === "string" && t.split(".").length === 3;
}
function isResumariSite() {
  var host = location.hostname;
  return host.indexOf("resumari") !== -1 || host === "localhost" || host === "127.0.0.1";
}

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  // Only the extension itself may drive the content script. A page cannot
  // send runtime messages, but this check keeps any stray caller out.
  if (!sender || sender.id !== chrome.runtime.id) return;
  if (msg.type === "GET_VIDEO_ID") {
    sendResponse({ videoId: getVideoId() });
    return;
  }
  if (msg.type === "AUTH_SYNC" && isValidToken(msg.token) && msg.user) {
    // Token is only ever written to the page localStorage on the Resumari
    // site itself — never on YouTube or any third-party origin.
    if (isResumariSite()) {
      localStorage.setItem("token", msg.token);
      localStorage.setItem("user", JSON.stringify(msg.user));
      window.dispatchEvent(new CustomEvent("resumari-auth-changed", { detail: { token: msg.token, user: msg.user } }));
    }
    try { chrome.storage.local.set({ resumariAuth: { token: msg.token, user: msg.user } }); } catch (e) {}
    sendResponse({ success: true });
    return;
  }
  if (msg.type === "AUTH_LOGOUT") {
    if (isResumariSite()) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new CustomEvent("resumari-auth-changed", { detail: null }));
    }
    try { chrome.storage.local.remove("resumariAuth"); } catch (e) {}
    sendResponse({ success: true });
    return;
  }
});

// --- Shared auth bridge (site <-> side panel) via chrome.storage.local ---
// One login anywhere (site or panel) is reflected everywhere.
// Site -> extension: the site dispatches this event on login/logout.
// Hardened: (1) only trusted on the Resumari site itself — a hostile page on
// YouTube must not be able to inject or clear the shared auth; (2) only JWT
// tokens are accepted; (3) a sticky panel logout (resumariLoggedOut) is
// honoured, so a still-open site session cannot log the panel back in.
window.addEventListener("resumari-auth-change", function (e) {
  if (!isResumariSite()) return;
  var d = e && e.detail;
  if (d && isValidToken(d.token) && d.user) {
    chrome.storage.local.get("resumariLoggedOut", function (res) {
      if (res && res.resumariLoggedOut) return; // user explicitly logged out
      try { chrome.storage.local.set({ resumariAuth: { token: d.token, user: d.user } }); } catch (ex) {}
    });
  } else {
    try { chrome.storage.local.remove("resumariAuth"); } catch (ex) {}
  }
});
// Extension -> site: keep the site's localStorage in sync when the panel logs
// in/out. Only on the Resumari site — never on YouTube or other origins.
chrome.storage.onChanged.addListener(function (changes, area) {
  if (area !== "local" || !changes.resumariAuth || !isResumariSite()) return;
  var next = changes.resumariAuth.newValue;
  if (next && isValidToken(next.token) && next.user) {
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
    ".resumari-chip { display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 14px;border-radius:18px;border:1px solid rgba(167,139,250,0.6);background:rgba(147,51,234,0.55);color:#fff;font-family:Roboto,Arial,sans-serif;font-size:14px;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,0.35);cursor:pointer;margin-left:8px;backdrop-filter:blur(10px) saturate(140%);-webkit-backdrop-filter:blur(10px) saturate(140%);box-shadow:0 4px 20px rgba(147,51,234,0.45),0 0 0 1px rgba(147,51,234,0.25),inset 0 1px 0 rgba(255,255,255,0.2);transition:background 0.2s cubic-bezier(0.4,0,0.2,1),transform 0.2s cubic-bezier(0.4,0,0.2,1),box-shadow 0.2s ease,border-color 0.2s ease;flex-shrink:0;align-self:center;white-space:nowrap}" +
    ".resumari-chip:hover { background:rgba(147,51,234,0.72) !important;border-color:rgba(167,139,250,0.9) !important;transform:scale(1.04) !important;box-shadow:0 6px 26px rgba(147,51,234,0.55),0 0 0 1px rgba(167,139,250,0.35),inset 0 1px 0 rgba(255,255,255,0.25) !important }" +
    ".resumari-chip:active { transform:scale(0.97) !important;transition-duration:0.08s !important }" +
    "html[dark] .resumari-chip { background:rgba(147,51,234,0.4);color:#fff }" +
    "html[dark] .resumari-chip:hover { background:rgba(147,51,234,0.62) !important }" +
    "@media (prefers-reduced-motion:reduce){.resumari-chip{transition:none !important;transform:none !important}}" +
    ".resumari-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(16px);z-index:999999;padding:10px 18px;border-radius:999px;background:rgba(15,15,15,0.92);color:#fff;font-family:Roboto,Arial,sans-serif;font-size:13px;font-weight:500;box-shadow:0 8px 30px rgba(0,0,0,0.35);opacity:0;pointer-events:none;transition:opacity 0.2s ease,transform 0.2s ease;backdrop-filter:blur(8px);max-width:80vw;text-align:center}" +
    ".resumari-toast.resumari-toast-show{opacity:1;transform:translateX(-50%) translateY(0)}" +
    "@media (prefers-reduced-motion:reduce){.resumari-toast{transition:none}}" +
    ".resumari-thumb-btn { position:absolute !important;top:6px !important;right:6px !important;width:32px !important;height:32px !important;padding:0 !important;border-radius:50% !important;border:1px solid rgba(255,255,255,0.15) !important;background:rgba(0,0,0,0.65) !important;cursor:pointer !important;display:flex !important;align-items:center !important;justify-content:center !important;z-index:200 !important;opacity:0 !important;transition:opacity 0.2s ease,transform 0.2s ease,background 0.2s ease !important;backdrop-filter:blur(6px) !important;pointer-events:auto !important;box-shadow:0 2px 8px rgba(0,0,0,0.5) !important;transform:scale(0.9) !important}" +
    ".resumari-thumb-btn:hover { background:rgba(147,51,234,0.55) !important;border-color:rgba(147,51,234,0.5) !important;backdrop-filter:blur(10px) !important;transform:scale(1.15) !important;box-shadow:0 4px 20px rgba(147,51,234,0.45),0 0 0 1px rgba(147,51,234,0.2) !important }" +
    ".resumari-thumb-btn img { width:22px !important;height:22px !important;border-radius:50% !important;display:block !important }" +
    ".resumari-thumb-container { overflow:visible !important }" +
    ".resumari-thumb-container:hover .resumari-thumb-btn,a#thumbnail:hover .resumari-thumb-btn," +
    "ytd-rich-item-renderer:hover .resumari-thumb-btn,ytd-video-renderer:hover .resumari-thumb-btn,ytd-grid-video-renderer:hover .resumari-thumb-btn,ytd-compact-video-renderer:hover .resumari-thumb-btn,ytd-compact-autoplay-renderer:hover .resumari-thumb-btn,ytd-playlist-video-renderer:hover .resumari-thumb-btn,ytd-playlist-panel-video-renderer:hover .resumari-thumb-btn,ytd-reel-item-renderer:hover .resumari-thumb-btn," +
    "yt-lockup-view-model:hover .resumari-thumb-btn," +
    ".resumari-thumb-active .resumari-thumb-btn { opacity:1 !important;transform:scale(1) !important }";
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
    injectChannelPageButton();
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
function addButtonToLink(link) {
  if (!link || link.querySelector(".resumari-thumb-btn")) return;
  var videoId = getVideoIdFromUrl(link.href);
  if (!videoId) return;
  var btn = document.createElement("button");
  btn.className = "resumari-thumb-btn";
  btn.setAttribute("aria-label", "Trascrivi con Resumari");
  btn.innerHTML = '<img src="' + ICON_URL + '" alt="">';
  btn.addEventListener("click", function(e) {
    e.stopPropagation();
    e.preventDefault();
    showToast("Apertura Resumari…");
    try { openSidePanel(videoId, "youtube"); } catch(ex) {}
  });
  // Anchor the button to the wrapping link, NOT to the thumbnail: when the
  // hover preview starts playing, YouTube re-renders the thumbnail's inner
  // content (image -> video player), which deletes a button appended inside
  // the thumbnail. The link wrapper survives the preview, so the button
  // stays in place while the preview plays.
  var pos = getComputedStyle(link).position;
  if (pos !== "relative" && pos !== "absolute" && pos !== "fixed") {
    link.style.position = "relative";
  }
  link.appendChild(btn);
  link.classList.add("resumari-thumb-container");
  // If the pointer is already over the link (e.g. re-injection while the
  // hover preview plays), show the button immediately instead of waiting for
  // another mouseover.
  if (link.matches && link.matches(":hover")) {
    link.classList.add("resumari-thumb-active");
  }
}
function addThumbnailButton(thumb) {
  var link = findThumbLink(thumb);
  if (!link) return;
  addButtonToLink(link);
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

// --- Channel pages: "Trascrivi canale" next to the Subscribe button ---
// On every youtube.com/@handle (and /channel/…) page the extension adds a chip
// right after the Subscribe button that queues the whole channel on the
// Resumari site (/videos?channel=…), reusing the site's "Intero Canale" flow.
function isChannelPage() {
  if (getPlatform() !== "youtube") return false;
  var p = location.pathname;
  return p.indexOf("/@") === 0 || p.indexOf("/channel/") === 0 || p.indexOf("/user/") === 0 || p.indexOf("/c/") === 0;
}
function getChannelUrl() {
  var parts = location.pathname.split("/").filter(Boolean);
  var first = parts[0] || "";
  var second = parts[1] || "";
  // /@handle (optionally /@handle/videos) -> the bare handle is enough.
  if (first.charAt(0) === "@") return location.origin + "/" + first;
  // /channel/ID, /user/name, /c/name
  if ((first === "channel" || first === "user" || first === "c") && second) {
    return location.origin + "/" + first + "/" + second;
  }
  return location.origin + location.pathname;
}
function openChannelTranscription(channelUrl) {
  if (!channelUrl) return;
  var base = "__RESUMARI_API_BASE__";
  if (base.indexOf("__RESUMARI") === 0) base = "http://localhost:3000";
  var target = base + "/videos?channel=" + encodeURIComponent(channelUrl);
  try { chrome.runtime.sendMessage({ type: "openChannelTab", url: target }); } catch (e) {}
}
function injectChannelPageButton() {
  var existing = document.getElementById("resumari-channel-btn");
  if (!isChannelPage()) {
    if (existing) existing.remove();
    return;
  }
  var sub = document.querySelector("#subscribe-button, ytd-subscribe-button-renderer, yt-subscribe-button-view-model");
  if (!sub) return;
  if (existing) {
    // Already sitting next to this subscribe button (SPA navigation check).
    var anchorCheck = (sub.closest && sub.closest("#subscribe-button")) || sub;
    var cur = existing.parentElement;
    if (cur && anchorCheck.parentElement && cur === anchorCheck.parentElement) return;
    existing.remove();
  }
  var b = document.createElement("button");
  b.className = "resumari-chip";
  b.id = "resumari-channel-btn";
  b.innerHTML = '<img src="' + ICON_URL + '" style="width:18px;height:18px;border-radius:50%"> <span>Trascrivi canale</span>';
  b.onclick = function () {
    showToast("Apertura Resumari…");
    openChannelTranscription(getChannelUrl());
  };
  // Insert right after the subscribe button wrapper so the chip sits in the
  // header action row, next to "Iscriviti".
  var anchor = (sub.closest && sub.closest("#subscribe-button")) || sub;
  var host = anchor.parentElement;
  if (host && host.insertBefore) {
    host.insertBefore(b, anchor.nextSibling || null);
  }
}
// Keep the side panel's theme in sync with YouTube's own light/dark theme
// (YouTube sets html[dark]): the panel reads resumariYoutubeTheme from
// chrome.storage and switches automatically in Auto mode.
function getYoutubeTheme() {
  return document.documentElement && document.documentElement.hasAttribute("dark") ? "dark" : "light";
}
function syncYoutubeTheme() {
  // Only sync from real YouTube pages: on the Resumari site html has no
  // "dark" attribute, and writing "light" there would clobber the value the
  // panel needs while the user is on YouTube.
  if (getPlatform() !== "youtube") return;
  try { chrome.storage.local.set({ resumariYoutubeTheme: getYoutubeTheme() }); } catch (e) {}
}
// If YouTube swaps in a fresh thumbnail element for the hover preview, the
// pointer lands on a thumbnail that has no button yet: inject immediately on
// pointerover (leading edge) instead of waiting for the debounced observer.
function findThumbForTarget(target) {
  var node = target;
  while (node && node !== document.body) {
    if (node.matches && node.matches("ytd-thumbnail, yt-thumbnail-view-model")) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}
function ensureThumbnailButtonNear(target) {
  var thumb = findThumbForTarget(target);
  if (thumb) addThumbnailButton(thumb);
}
// Keep the button visible while the pointer is anywhere inside the thumbnail,
// even while the hover preview plays. Pure CSS :hover loses the pointer the
// moment it lands on the preview player (which is not always a descendant of
// the wrapping link), so we track hover in JS against the thumbnail boundary
// and toggle an explicit visibility class on the link.
function handleThumbHover(e) {
  var thumb = findThumbForTarget(e.target);
  if (!thumb) return;
  var link = findThumbLink(thumb);
  if (!link) return;
  if (e.type === "mouseover") {
    addButtonToLink(link);
    link.classList.add("resumari-thumb-active");
  } else if (e.type === "mouseout") {
    var to = e.relatedTarget;
    if (to && thumb.contains && thumb.contains(to)) return; // still inside
    link.classList.remove("resumari-thumb-active");
  }
}
function init() {
  injectStyles();
  injectVideoPageButton();
  injectThumbnailButtons();
  injectChannelPageButton();
  syncYoutubeTheme();
  let lastUrl = location.href;
  new MutationObserver(function() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
    }
    scheduleInjection();
  }).observe(document.body, { childList: true, subtree: true });
  // Lead-edge recovery: while the hover preview is active YouTube keeps
  // re-rendering thumbnails, so inject the button immediately whenever the
  // pointer rests on a thumbnail element.
  document.addEventListener("pointerover", function(e) {
    ensureThumbnailButtonNear(e.target);
  }, true);
  // Track hover in JS so the button stays visible while the inline preview
  // plays: mouseover/mouseout bubble and let us scope the "hovered" state to
  // the whole thumbnail, not just the link (whose :hover can be lost to the
  // preview player overlay).
  document.addEventListener("mouseover", handleThumbHover, true);
  document.addEventListener("mouseout", handleThumbHover, true);
  // Watch YouTube's own theme attribute so theme switches propagate live.
  if (document.documentElement) {
    new MutationObserver(function() { syncYoutubeTheme(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ["dark"] });
  }
  setTimeout(injectThumbnailButtons, 1500);
  setTimeout(injectThumbnailButtons, 3000);
  // YouTube's channel header can render after the initial mutations settle,
  // so retry the subscribe-button placement like the thumbnail scans.
  setTimeout(injectChannelPageButton, 1500);
  setTimeout(injectChannelPageButton, 3000);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();`;

// Injects the backend base URL into the standalone panel JS. Falls back to the
// local dev server (localhost:3000). The panel talks to the backend directly
// (CORS is handled by src/proxy.ts on the server), so it works both in local
// development and in production when NEXT_PUBLIC_APP_URL is set on the host
// (e.g. https://resumari.com on Vercel).
function panelJsWithBase() {
  const apiBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const src = fs.readFileSync(path.join(panelDir, 'panel.js'), 'utf-8');
  return src.split('__RESUMARI_API_BASE__').join(apiBase);
}

// Same base-URL injection for the content script: the channel-page button opens
// the Resumari site at {base}/videos?channel=…, so the baked URL must point at
// the real host (resumari.com in production, localhost:3000 in dev).
function contentJsWithBase() {
  const apiBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return content.split('__RESUMARI_API_BASE__').join(apiBase);
}

// The background's openChannelTab allow-list needs the same baked base: the
// listener only opens tabs whose URL starts with {base}/videos?channel=.
function backgroundJsWithBase() {
  const apiBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return background.split('__RESUMARI_APP_BASE__').join(apiBase);
}

// Every JS file the manifest references must be written and parse as a classic
// script before the build is swapped in. If one were missing or malformed,
// Chrome would fail the service-worker registration with a cryptic
// "An unknown error occurred when fetching the script" at load time.
function validateOutput(outputDir) {
  const jsFiles = ['background.js', 'content.js', 'panel.js'];
  for (const f of jsFiles) {
    const p = path.join(outputDir, f);
    if (!fs.existsSync(p)) {
      throw new Error(`Extension build validation failed: missing script ${f}`);
    }
    const src = fs.readFileSync(p, 'utf-8');
    try {
      new Function(src);
    } catch (e) {
      throw new Error(`Extension build validation failed: ${f} is not valid JS (${e.message})`);
    }
  }
}

// Builds into a temp staging dir and then atomically swaps it over the output
// dir. Loading unpacked means Chrome reads dist-extension/ live: wiping files
// in place while Chrome has the extension loaded can make the service worker
// fetch a half-written script and fail with "unknown error occurred when
// fetching the script". A same-filesystem rename swap never exposes a partial
// build to Chrome.
function buildExtension(outputDir = distDir) {
  const parent = path.dirname(outputDir);
  const stagingDir = fs.mkdtempSync(path.join(parent, '.extension-staging-'));

  const buildInto = (dir) => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    const publicIcon = path.join(__dirname, '../public/resumari.png');
    const distIcon = path.join(dir, 'icon.png');
    if (fs.existsSync(publicIcon)) fs.copyFileSync(publicIcon, distIcon);

    const distResumariImg = path.join(dir, 'resumari.png');
    if (fs.existsSync(publicIcon)) fs.copyFileSync(publicIcon, distResumariImg);

    fs.writeFileSync(path.join(dir, 'background.js'), backgroundJsWithBase());
    fs.writeFileSync(path.join(dir, 'content.js'), contentJsWithBase());

    // Standalone side panel: panel.html + panel.css + panel.js.
    fs.copyFileSync(path.join(panelDir, 'panel.html'), path.join(dir, 'panel.html'));
    fs.copyFileSync(path.join(panelDir, 'panel.css'), path.join(dir, 'panel.css'));
    fs.writeFileSync(path.join(dir, 'panel.js'), panelJsWithBase());
  };

  try {
    buildInto(stagingDir);
    // Throw BEFORE touching the real output dir if anything is broken, so a
    // bad build never leaves Chrome with a half-updated extension.
    validateOutput(stagingDir);

    // Swap: rename old output aside, move staging in, then delete the old one.
    // If the swap itself fails, try to roll the previous build back.
    const backupDir = path.join(parent, '.extension-backup');
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
    if (fs.existsSync(outputDir)) {
      fs.renameSync(outputDir, backupDir);
    }
    try {
      fs.renameSync(stagingDir, outputDir);
    } catch (err) {
      if (fs.existsSync(backupDir) && !fs.existsSync(outputDir)) {
        fs.renameSync(backupDir, outputDir);
      }
      throw err;
    }
    if (fs.existsSync(backupDir)) {
      fs.rmSync(backupDir, { recursive: true, force: true });
    }
  } finally {
    if (fs.existsSync(stagingDir)) {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    }
  }

  console.log(`Extension version ${VERSION} created (standalone panel)`);
}

if (require.main === module) {
  buildExtension();
}

module.exports = { manifest, background, content, contentJsWithBase, backgroundJsWithBase, panelJsWithBase, buildExtension, validateOutput, distDir };
