"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "./LanguageContext";
import { ToastProvider } from "./ToastProvider";
import { restoreSession } from "@/lib/session";
import { ReactNode, useEffect } from "react";

function SessionSync() {
  // Ripristina la sessione dal cookie NextAuth quando il LocalStorage è vuoto
  // (nuova scheda, refresh, rientro dal login Google): la navbar e le pagine
  // protette vengono notificate tramite gli eventi di auth.
  useEffect(() => {
    restoreSession().catch(() => {});
  }, []);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionSync />
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        <LanguageProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
