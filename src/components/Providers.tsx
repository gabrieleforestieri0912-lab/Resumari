"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "./LanguageContext";
import { ToastProvider } from "./ToastProvider";
import { saveSession } from "@/lib/session";
import { ReactNode, useEffect } from "react";

function SessionSync() {
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((session) => {
        if (session?.user) {
          const sessionUser = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            picture: session.user.image,
            credits: session.user.credits ?? 10,
            plan: session.user.plan ?? "free",
          };
          if (session.customToken) {
            saveSession(session.customToken, sessionUser);
          } else {
            localStorage.setItem("user", JSON.stringify(sessionUser));
          }
        }
      })
      .catch(() => {});
  }, []);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionSync />
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
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
