"use client";

import { SessionProvider } from "next-auth/react";
import { LanguageProvider } from "./LanguageContext";
import { ToastProvider } from "./ToastProvider";
import { ReactNode, useEffect } from "react";

function SessionSync() {
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((session) => {
        if (session?.user) {
          localStorage.setItem("token", session.customToken || "");
          localStorage.setItem("user", JSON.stringify({
            id: session.user.id,
            email: session.user.email,
            name: session.user.name,
            picture: session.user.image,
            credits: session.user.credits ?? 10,
            plan: session.user.plan ?? "free",
          }));
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
      <LanguageProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
