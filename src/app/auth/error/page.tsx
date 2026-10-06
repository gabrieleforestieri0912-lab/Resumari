"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";

/**
 * Destinazione di tutti gli errori NextAuth (`pages.error` in
 * `[...nextauth]/route.ts`). Prima questa pagina non esisteva: qualsiasi
 * fallimento del login (es. Google OAuth) finiva su un 404 senza spiegazioni.
 * Il codice errore arriva come `?error=...` e viene tradotto in un messaggio
 * leggibile, con il dettaglio tecnico per il debug.
 */
const ERROR_MESSAGES: Record<string, { title: string; hint: string }> = {
  Configuration: {
    title: "Errore di configurazione del login",
    hint: "Il server non è configurato correttamente (variabili NEXTAUTH_* o provider OAuth).",
  },
  AccessDenied: {
    title: "Accesso negato",
    hint: "Hai negato il consenso o il tuo account non è autorizzato.",
  },
  Verification: {
    title: "Link di verifica non valido",
    hint: "Il link è scaduto o è già stato utilizzato. Richiedine uno nuovo.",
  },
  OAuthSignin: {
    title: "Impossibile avviare il login con Google",
    hint: "Controlla la configurazione OAuth (client ID e redirect URI).",
  },
  OAuthCallback: {
    title: "Errore nella risposta di Google",
    hint: "La callback OAuth non è andata a buon fine: redirect URI o database non raggiungibile.",
  },
  OAuthCreateAccount: {
    title: "Impossibile creare l'account",
    hint: "Il database utenti non ha accettato la creazione del profilo.",
  },
  OAuthAccountNotLinked: {
    title: "Account già registrato con un altro metodo",
    hint: "Questa email è già registrata con email/password: accedi così e collega Google dalle impostazioni.",
  },
  EmailCreateAccount: {
    title: "Impossibile creare l'account",
    hint: "Il database utenti non ha accettato la creazione del profilo.",
  },
  Callback: {
    title: "Errore durante il callback di accesso",
    hint: "Qualcosa è andato storto nella fase finale del login.",
  },
  CredentialsSignin: {
    title: "Email o password errati",
    hint: "Controlla le credenziali e riprova.",
  },
  SessionRequired: {
    title: "Devi effettuare l'accesso",
    hint: "Questa pagina richiede l'autenticazione.",
  },
};

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("error") || "Default";
  const info = ERROR_MESSAGES[code] || {
    title: "Accesso non riuscito",
    hint: "Si è verificato un errore imprevisto durante l'accesso.",
  };

  useEffect(() => {
    document.title = "Errore di accesso | Resumari";
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950 px-4">
      <div className="text-center max-w-md mx-auto w-full">
        <Link href="/" className="inline-flex items-center gap-2 font-black text-xl text-purple-600 mb-8 hover:scale-105 transition-transform">
          <Image src="/resumari.png" alt="Logo" width={32} height={32} className="w-8 h-8" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-red-600">
            Resumari
          </span>
        </Link>
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
          <AlertTriangle size={32} className="text-red-500" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2">
          {info.title}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">{info.hint}</p>
        <p className="text-xs font-mono text-gray-400 dark:text-gray-600 mb-8">
          Codice errore: {code}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all"
          >
            <RefreshCw size={16} />
            Riprova il login
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all"
          >
            <ArrowLeft size={16} />
            Torna alla home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  );
}
