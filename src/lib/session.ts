"use client";

import { signOut } from "next-auth/react";
import { syncAuthToExtension, syncLogoutToExtension } from "./auth-sync";

/**
 * Helper centralizzati per la gestione della sessione utente.
 * Si occupano della persistenza locale tramite LocalStorage e della propagazione
 * dello stato di autenticazione verso l'estensione Chrome.
 */

// Chiavi utilizzate per il salvataggio dei dati di sessione nel LocalStorage
export const TOKEN_KEY = "token";
export const USER_KEY = "user";

/**
 * Salva i dati della sessione localmente e sincronizza l'autenticazione con l'estensione.
 *
 * @param token Il token di autenticazione.
 * @param user I dati dell'utente.
 */
export function saveSession(token: string, user: unknown) {
  if (!token || !user) return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  syncAuthToExtension(token, user);
}

/**
 * Effettua il logout completo dell'utente.
 * Rimuove i dati dal LocalStorage, notifica l'estensione e invalida il cookie di sessione NextAuth.
 */
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  syncLogoutToExtension();

  // Nota: questa funzione esegue un logout completo, invalidando anche la sessione lato server
  // tramite NextAuth. Senza questo passaggio, un ricaricamento della pagina potrebbe
  // ripristinare la sessione dal cookie.
  signOut({ redirect: false }).catch(() => {});
}
