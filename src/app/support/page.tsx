'use client'

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MessageSquare, Send, CheckCircle, Loader2 } from 'lucide-react';
import Breadcrumb from '../../components/Breadcrumb';

const Navbar = dynamic(() => import('../../components/Navbar'), { ssr: false });
const Footer = dynamic(() => import('../../components/Footer'), { ssr: false });

export default function SupportPage() {
  useEffect(() => {
    document.title = "Feedback | Resumari";
  }, []);

  const [form, setForm] = useState({ nome: '', email: '', feedback: '' });
  const [stato, setStato] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    setStato('sending');
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome,
          email: form.email,
          messaggio: form.feedback,
        }),
      });
      if (res.ok) {
        setStato('success');
        setForm({ nome: '', email: '', feedback: '' });
      } else {
        setStato('error');
      }
    } catch {
      setStato('error');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-gray-100">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-24 md:pt-28 pb-14 md:pb-20">
        <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Supporto' }]} className="mb-6" />

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-purple-600 to-red-500 text-white mb-6">
            <MessageSquare size={32} />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4">
            Scrivici un{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-red-600">
              feedback
            </span>
          </h1>
          <p className="text-base sm:text-lg text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Raccontaci com&apos;è andata con Resumari: segnalazioni, idee e
            suggerimenti ci aiutano a migliorare. Leggiamo ogni messaggio.
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 border border-gray-100 dark:border-zinc-800">
          {stato === 'success' ? (
            <div className="text-center py-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 mb-4">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Grazie per il tuo feedback!
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Lo abbiamo ricevuto e lo leggeremo a breve.
              </p>
              <button
                onClick={() => setStato('idle')}
                className="text-sm font-semibold text-purple-600 hover:text-purple-700"
              >
                Invia un altro feedback
              </button>
            </div>
          ) : (
            <form onSubmit={invia} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Nome{' '}
                  <span className="font-normal text-gray-400 dark:text-zinc-500">
                    (opzionale)
                  </span>
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Il tuo nome"
                  className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-gray-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/40 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Email{' '}
                  <span className="font-normal text-gray-400 dark:text-zinc-500">
                    (opzionale)
                  </span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="tua@email.it"
                  className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-gray-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/40 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Feedback
                </label>
                <textarea
                  required
                  rows={6}
                  value={form.feedback}
                  onChange={(e) => setForm({ ...form, feedback: e.target.value })}
                  placeholder="Raccontaci la tua esperienza, un problema o un'idea..."
                  className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-gray-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/40 outline-none transition-all resize-none"
                />
              </div>

              {stato === 'error' && (
                <p className="text-sm text-red-500">
                  Errore nell&apos;invio. Riprova più tardi.
                </p>
              )}

              <button
                type="submit"
                disabled={stato === 'sending'}
                className="w-full py-4 bg-linear-to-r from-purple-600 to-red-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-all hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {stato === 'sending' ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Invia feedback
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
