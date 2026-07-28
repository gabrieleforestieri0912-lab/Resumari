"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Accesso in corso | Resumari";
  }, []);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");

      if (!code) {
        setError("Nessun codice ricevuto da Google.");
        return;
      }

      try {
        const supabase = getSupabaseClient();

        // Supabase auto-handles the PKCE exchange during client initialization.
        // We just need to wait for it to complete, then get the session.
        await supabase.auth.initialize();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          throw new Error(sessionError?.message || "Errore durante l'autenticazione");
        }

        const { email, user_metadata } = session.user;

        const res = await fetch("/api/auth/supabase-callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name: user_metadata?.full_name || user_metadata?.name || null,
            picture: user_metadata?.avatar_url || user_metadata?.picture || null,
            id: session.user.id,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || "Errore creazione account");
        }

        const data = await res.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));

        window.location.href = "/";
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setError(err.message || "Errore durante l'accesso");
      }
    };

    if (searchParams.has("code")) {
      handleCallback();
    }
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">Accesso fallito</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all"
          >
            Torna al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm font-medium">Accesso in corso...</p>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
