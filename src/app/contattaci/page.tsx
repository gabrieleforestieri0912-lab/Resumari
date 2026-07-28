"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Mail, MessageSquare, Send, CheckCircle, Loader2 } from "lucide-react";

const Navbar = dynamic(() => import("../../components/Navbar"), { ssr: false });
const Footer = dynamic(() => import("../../components/Footer"), { ssr: false });

export default function Contattaci() {
  useEffect(() => {
    document.title = "Contattaci | Resumari";
  }, []);

  const [form, setForm] = useState({ nome: "", email: "", messaggio: "" });
  const [stato, setStato] = useState("idle");

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    setStato("sending");

    try {
      const res = await fetch("/api/supporto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setStato("success");
        setForm({ nome: "", email: "", messaggio: "" });
      } else {
        setStato("error");
      }
    } catch {
      setStato("error");
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 pt-28 pb-20">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-purple-600 to-red-500 text-white mb-6">
            <MessageSquare size={32} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Contattaci
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Hai una domanda o vuoi lavorare con noi? Scrivici, rispondiamo entro
            24 ore.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <div className="bg-gray-50 rounded-3xl p-8 md:p-10">
              <h2 className="text-xl font-black mb-6">Inviaci un messaggio</h2>

              {stato === "success" ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Messaggio inviato!
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Grazie per averci contattato. Risponderemo entro 24 ore.
                  </p>
                  <button
                    onClick={() => setStato("idle")}
                    className="text-sm font-semibold text-purple-600 hover:text-purple-700"
                  >
                    Invia un altro messaggio
                  </button>
                </div>
              ) : (
                <form onSubmit={invia} className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Nome
                    </label>
                    <input
                      type="text"
                      required
                      value={form.nome}
                      onChange={(e) =>
                        setForm({ ...form, nome: e.target.value })
                      }
                      className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                      placeholder="Il tuo nome"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                      placeholder="tua@email.it"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Messaggio
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={form.messaggio}
                      onChange={(e) =>
                        setForm({ ...form, messaggio: e.target.value })
                      }
                      className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all resize-none"
                      placeholder="Come possiamo aiutarti?"
                    />
                  </div>

                  {stato === "error" && (
                    <p className="text-sm text-red-500">
                      Errore nell&apos;invio. Riprova più tardi.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={stato === "sending"}
                    className="w-full py-4 bg-linear-to-r from-purple-600 to-red-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-all hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {stato === "sending" ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Invio in corso...
                      </>
                    ) : (
                      <>
                        <Send size={20} />
                        Invia messaggio
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-linear-to-br from-purple-50 to-red-50 rounded-3xl p-8 md:p-10">
              <h2 className="text-xl font-black mb-6">
                Altri modi per contattarci
              </h2>

              <div className="space-y-6">
                <a
                  href="mailto:support@resumari.it"
                  className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-purple-200 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Email</h3>
                    <p className="text-sm text-gray-500">support@resumari.it</p>
                  </div>
                </a>

                <a
                  href="https://discord.gg/resumari"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-purple-200 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Discord</h3>
                    <p className="text-sm text-gray-500">
                      Entra nella community
                    </p>
                  </div>
                </a>
              </div>

              <div className="mt-8 p-5 bg-white rounded-2xl border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2">
                  Orari di risposta
                </h3>
                <p className="text-sm text-gray-500">
                  Rispondiamo Lun-Ven dalle 9:00 alle 18:00. Per questioni
                  urgenti, scrivici su Discord.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
