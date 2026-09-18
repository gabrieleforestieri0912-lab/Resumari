"use client";

/**
 * Gestisce la sincronizzazione dello stato di autenticazione tra il sito web e l'estensione Chrome.
 * Quando l'utente effettua il login o il logout sul sito, viene inviato un evento personalizzato
 * che lo script dell'estensione (content script) intercetta per aggiornare lo storage dell'estensione.
 * In assenza dell'estensione, queste funzioni non hanno alcun effetto.
 */

// Nome dell'evento utilizzato per comunicare con l'estensione
const EVENT_NAME = "resumari-auth-change";

/**
 * Sincronizza il token e i dati dell'utente con l'estensione Chrome.
 *
 * @param token Il token di autenticazione dell'utente.
 * @param user I dati del profilo utente.
 */
export function syncAuthToExtension(token: string, user: unknown) {
  if (!token || !user) return;
  try {
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, { detail: { token, user } }),
    );
  } catch {
    // Non siamo in un contesto browser o CustomEvent non disponibile — nessuna sincronizzazione.
  }
}

/**
 * Notifica l'estensione Chrome che l'utente ha effettuato il logout.
 */
export function syncLogoutToExtension() {
  try {
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: null }));
  } catch {
    // Non siamo in un contesto browser — nessuna sincronizzazione.
  }
}
