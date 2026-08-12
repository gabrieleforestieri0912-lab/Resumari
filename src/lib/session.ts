"use client";

import { signOut } from "next-auth/react";
import { syncAuthToExtension, syncLogoutToExtension } from "./auth-sync";

// Central helpers for persisting the site's session (localStorage) and
// propagating it to the Chrome extension side panel. Every login/logout flow
// on the site goes through these so the behaviour stays consistent.

export const TOKEN_KEY = "token";
export const USER_KEY = "user";

export function saveSession(token: string, user: unknown) {
  if (!token || !user) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  syncAuthToExtension(token, user);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  syncLogoutToExtension();
  // NOTE: this helper performs a FULL logout — it also invalidates the
  // NextAuth session cookie via a network call. A page reload would otherwise
  // re-create the session (and re-sync it back to the extension side panel).
  // Don't use it for pure localStorage cleanup.
  signOut({ redirect: false }).catch(() => {});
}
