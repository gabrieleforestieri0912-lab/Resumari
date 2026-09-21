"use client";

/**
 * Gestisce la sincronizzazione dello stato di autenticazione tra il sito web,
 * i componenti React e l'estensione Chrome.
 *
 * Vengono utilizzati due eventi distinti:
 * - EXTENSION_EVENT_NAME: intercettato dal content script dell'estensione per
 *   aggiornare lo storage dell'estensione.
 * - AUTH_STATE_EVENT_NAME: ascoltato dai componenti del sito (Navbar, Demo, ...)
 *   per riflettere login e logout immediatamente, senza richiedere un refresh.
 *
 * In assenza dell'estensione, queste funzioni non hanno alcun effetto.
 */

// Evento consumato dal content script dell'estensione Chrome (detail: { token, user }).
export const EXTENSION_EVENT_NAME = "resumari-auth-change";

// Evento consumato dai componenti del sito per aggiornare la UI in tempo reale.
export const AUTH_STATE_EVENT_NAME = "resumari-auth-changed";

// Payload dell'evento di stato: token e profilo utente, oppure null dopo il logout.
export interface AuthStateDetail {
  token: string | null;
  user: unknown;
}

/**
 * Invia un CustomEvent sulla window, ignorando i contesti in cui non è disponibile.
 */
function emit(name: string, detail: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
    // Contesto non browser o CustomEvent non disponibile — nessuna sincronizzazione.
  }
}

/**
 * Sincronizza il token e i dati dell'utente con l'estensione Chrome.
 *
 * @param token Il token di autenticazione dell'utente.
 * @param user I dati del profilo utente.
 */
export function syncAuthToExtension(token: string, user: unknown) {
  if (!token || !user) return;
  emit(EXTENSION_EVENT_NAME, { token, user });
}

/**
 * Notifica l'estensione Chrome che l'utente ha effettuato il logout.
 */
export function syncLogoutToExtension() {
  emit(EXTENSION_EVENT_NAME, null);
}

/**
 * Notifica i componenti del sito che l'utente ha effettuato l'accesso,
 * così che la UI (es. avatar nella navbar) si aggiorni senza refresh.
 *
 * @param user I dati del profilo utente.
 * @param token Il token di autenticazione, se disponibile.
 */
export function notifyAuthStateChange(user: unknown, token: string | null = null) {
  if (!user) return;
  emit(AUTH_STATE_EVENT_NAME, { token, user } as AuthStateDetail);
}

/**
 * Notifica i componenti del sito che l'utente ha effettuato il logout.
 */
export function notifyAuthStateLogout() {
  emit(AUTH_STATE_EVENT_NAME, null);
}
