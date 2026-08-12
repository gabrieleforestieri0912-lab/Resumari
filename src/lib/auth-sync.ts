"use client";

// Bridges the site's auth to the Chrome extension. On login/logout the site
// dispatches a window event that the extension content script listens for and
// mirrors into chrome.storage, so the side panel is logged in too. In a plain
// browser tab (no extension) this is a harmless no-op.

const EVENT_NAME = "resumari-auth-change";

export function syncAuthToExtension(token: string, user: unknown) {
  if (!token || !user) return;
  try {
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, { detail: { token, user } }),
    );
  } catch {
    // Not in a browser context or CustomEvent unavailable — nothing to sync.
  }
}

export function syncLogoutToExtension() {
  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: null }));
  } catch {
    // Not in a browser context — nothing to sync.
  }
}
