"use client";

import { useState, useEffect } from "react";
import { LogOut, Mail, Key, ArrowRight } from "lucide-react";

export default function ExtensionDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await fetch("/api/profile", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const userData = await response.json();
            setUser({ ...userData, token });
          }
        } catch (e) {}
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSending(true);
    setMessage({ text: "", type: "" });
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep("code");
        setMessage({ text: "Codice inviato alla tua email.", type: "success" });
      } else {
        setMessage({ text: data.message || "Errore", type: "error" });
      }
    } catch {
      setMessage({ text: "Errore di rete", type: "error" });
    }
    setSending(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setVerifying(true);
    setMessage({ text: "", type: "" });
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser({ ...data.user, token: data.token });
      } else {
        setMessage({ text: data.message || "Codice non valido", type: "error" });
      }
    } catch {
      setMessage({ text: "Errore di rete", type: "error" });
    }
    setVerifying(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setStep("email");
    setEmail("");
    setCode("");
    setMessage({ text: "", type: "" });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Caricamento...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-purple-100 flex items-center justify-center">
              <Mail className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Accedi a Resumari</h2>
            <p className="text-sm text-gray-500 mt-1">Inserisci la tua email per ricevere un codice</p>
          </div>

          {message.text && (
            <div className={`text-sm font-medium text-center mb-4 p-3 rounded-xl ${message.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
              {message.text}
            </div>
          )}

          {step === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@esempio.it"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
                />
              </div>
              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sending ? "Invio..." : "Invia codice"}
                {!sending && <ArrowRight size={16} />}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-3">
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Codice a 6 cifre"
                  maxLength={6}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
                />
              </div>
              <button
                type="submit"
                disabled={verifying || code.length !== 6}
                className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {verifying ? "Verifica..." : "Accedi"}
                {!verifying && <ArrowRight size={16} />}
              </button>
              <button
                type="button"
                onClick={() => { setStep("email"); setMessage({ text: "", type: "" }); }}
                className="w-full text-xs font-bold text-purple-600 hover:text-purple-700 text-center"
              >
                Cambia email
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="p-4 border-b border-gray-100 flex items-center gap-3">
        {user?.picture ? (
          <img src={user.picture} alt="" className="w-10 h-10 rounded-xl object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
            {user.name?.[0]?.toUpperCase() || "U"}
          </div>
        )}
        <div className="flex-1">
          <p className="font-bold text-sm">{user.name}</p>
          <p className="text-xs text-purple-600 font-bold">{user.credits || 10} Crediti rimasti</p>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-500 font-bold hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} /> Esci
        </button>
      </div>
    </div>
  );
}
