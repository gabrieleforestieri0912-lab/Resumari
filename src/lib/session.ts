"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import {
  syncAuthToExtension,
  syncLogoutToExtension,
  notifyAuthStateChange,
  notifyAuthStateLogout,
} from "./auth-sync";

/**
 * Helper centralizzati per la gestione della sessione utente.
 * Si occupano della persistenza locale tramite LocalStorage, della propagazione
 * dello stato di autenticazione verso l'estensione Chrome e verso i componenti
 * del sito, e del ripristino della sessione dal cookie NextAuth.
 */

// Chiavi utilizzate per il salvataggio dei dati di sessione nel LocalStorage
export const TOKEN_KEY = "token";
export const USER_KEY = "user";

// Profilo utente persistito nel LocalStorage
export interface StoredUser {
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
  credits?: number;
  plan?: string;
}

// Risultato del ripristino della sessione
export interface RestoredSession {
  token: string | null;
  user: StoredUser | null;
}

/**
 * Legge il profilo utente salvato nel LocalStorage, ignorando eventuali valori corrotti.
 */
export function readStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? (JSON.parse(stored) as StoredUser) : null;
  } catch {
    return null;
  }
}

/**
 * Legge il token applicativo salvato nel LocalStorage.
 */
export function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

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
  notifyAuthStateChange(user, token);
}

/**
 * Salva (o aggiorna) solo il profilo utente, per le sessioni che non espongono un token
 * applicativo (es. login Google gestito interamente da NextAuth).
 * Notifica comunque la UI, altrimenti la navbar resterebbe "sloggata" fino al refresh.
 *
 * @param user I dati dell'utente.
 */
export function saveUser(user: unknown) {
  if (!user) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyAuthStateChange(user, localStorage.getItem(TOKEN_KEY));
}

/**
 * Effettua il logout completo dell'utente.
 * Rimuove i dati dal LocalStorage, notifica l'estensione e invalida il cookie di sessione NextAuth.
 */
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  syncLogoutToExtension();
  notifyAuthStateLogout();

  // Nota: questa funzione esegue un logout completo, invalidando anche la sessione lato server
  // tramite NextAuth. Senza questo passaggio, un ricaricamento della pagina potrebbe
  // ripristinare la sessione dal cookie.
  signOut({ redirect: false }).catch(() => {});
}

// Ripristino in corso: evita chiamate duplicate a /api/auth/session nello stesso momento.
let pendingRestore: Promise<RestoredSession> | null = null;

/**
 * Recupera la sessione dal server (cookie NextAuth) e la riporta nel LocalStorage.
 */
async function fetchSessionFromServer(): Promise<RestoredSession> {
  const res = await fetch("/api/auth/session", { cache: "no-store" });
  if (!res.ok) return { token: readStoredToken(), user: null };

  const session = await res.json();
  if (!session?.user) return { token: readStoredToken(), user: null };

  const sessionUser: StoredUser = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? undefined,
    picture: session.user.image ?? undefined,
    credits: session.user.credits ?? 10,
    plan: session.user.plan ?? "free",
  };

  if (session.customToken) {
    saveSession(session.customToken, sessionUser);
  } else {
    saveUser(sessionUser);
  }

  return { token: session.customToken ?? readStoredToken(), user: sessionUser };
}

/**
 * Restituisce la sessione corrente, ripristinandola dal cookie NextAuth quando il
 * LocalStorage è vuoto (es. prima visita dopo il login, nuova scheda o refresh).
 *
 * Le pagine protette devono usare questa funzione (o l'hook `useSessionRestored`)
 * prima di rimandare l'utente al login: altrimenti un utente già autenticato,
 * ma con il LocalStorage non ancora popolato, viene espulso al primo render.
 */
export function restoreSession(): Promise<RestoredSession> {
  const stored: RestoredSession = {
    token: readStoredToken(),
    user: readStoredUser(),
  };

  // Sessione già disponibile localmente: nessuna richiesta al server.
  if (stored.user) return Promise.resolve(stored);

  if (!pendingRestore) {
    pendingRestore = fetchSessionFromServer()
      .catch(() => ({ token: readStoredToken(), user: null }) as RestoredSession)
      .finally(() => {
        pendingRestore = null;
      });
  }

  return pendingRestore;
}

/**
 * Indica quando la sessione è stata ripristinata (dal LocalStorage o dal cookie NextAuth).
 * I componenti protetti devono attendere `true` prima di decidere di reindirizzare al login.
 */
export function useSessionRestored(): boolean {
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let active = true;
    restoreSession()
      .catch(() => {})
      .finally(() => {
        if (active) setRestored(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return restored;
}
