"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  Key,
  Loader2,
  MessageSquare,
  Server,
  Sparkles,
  Video,
  Wrench,
} from "lucide-react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import Breadcrumb from "./Breadcrumb";
import ChromeIcon from "./ChromeIcon";

const LAUNCH_AT = new Date(
  process.env.NEXT_PUBLIC_WAITLIST_LAUNCH_AT || "2026-10-15T09:00:00+02:00",
);

type TimeLeft = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getTimeLeft(target: Date): TimeLeft {
  const diff = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const highlights = [
  {
    title: "Riassunti video",
    description:
      "Incolla un link YouTube e ottieni i concetti chiave in pochi secondi, senza rivedere ore di contenuto.",
    icon: Video,
  },
  {
    title: "File, PDF e foto",
    description:
      "Carica documenti, presentazioni o immagini: Resumari estrae il testo e distilla solo ciò che conta.",
    icon: FileText,
  },
  {
    title: "Agente AI in chat",
    description:
      "Chiedi dettagli, cambia tono, crea elenchi operativi. Il riassunto diventa una conversazione.",
    icon: MessageSquare,
  },
  {
    title: "Estensione Chrome",
    description:
      "Trascrivi e riassumi direttamente da YouTube, senza lasciare la pagina del video.",
    icon: ChromeIcon,
  },
  {
    title: "API e MCP",
    description:
      "Integra trascrizioni e riassunti nei tuoi strumenti, da script personalizzati agli agenti AI.",
    icon: Server,
  },
  {
    title: "Strumenti gratuiti",
    description:
      "Thumbnail, timestamp, tag, show notes e altri tool YouTube, 100% nel browser e senza registrazione.",
    icon: Wrench,
  },
];

const extras = [
  {
    title: "50+ lingue",
    description: "Trascrivi e riassumi contenuti superando le barriere linguistiche.",
    icon: Globe,
  },
  {
    title: "Chiavi API",
    description: "Accesso programmatico alle trascrizioni per workflow e automazioni.",
    icon: Key,
  },
  {
    title: "Crediti flessibili",
    description: "Parti gratis e scala quando usi Resumari ogni giorno.",
    icon: Sparkles,
  },
];

export default function WaitlistPage() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [step, setStep] = useState<"email" | "name">("email");
  const [form, setForm] = useState({ nome: "", email: "" });
  const [stato, setStato] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const { data: session } = useSession();

  const launched = Boolean(
    timeLeft &&
      timeLeft.days + timeLeft.hours + timeLeft.minutes + timeLeft.seconds === 0,
  );

  useEffect(() => {
    const tick = () => setTimeLeft(getTimeLeft(LAUNCH_AT));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const user = session?.user;
    if (!user?.email) return;
    setForm((current) => ({
      email: current.email || user.email || "",
      nome: current.nome || user.name || "",
    }));
    setStep("name");
    setFormOpen(true);
  }, [session]);

  const continuaConEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) return;
    setStato("idle");
    setStep("name");
  };

  const continuaConGoogle = async () => {
    await signIn("google", { callbackUrl: "/waitlist" });
  };

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      setStato("error");
      return;
    }
    setStato("sending");
    setAlreadyJoined(false);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const body = await res.json();
        setAlreadyJoined(Boolean(body.alreadyJoined));
        setStato("success");
        setStep("email");
        setForm({ nome: "", email: "" });
      } else {
        setStato("error");
      }
    } catch {
      setStato("error");
    }
  };

  const units: { label: string; value: number }[] = [
    { label: "Giorni", value: timeLeft?.days ?? 0 },
    { label: "Ore", value: timeLeft?.hours ?? 0 },
    { label: "Minuti", value: timeLeft?.minutes ?? 0 },
    { label: "Secondi", value: timeLeft?.seconds ?? 0 },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 bg-[radial-gradient(#e5e7eb_0.5px,transparent_0.5px)] dark:bg-[radial-gradient(#27272a_0.5px,transparent_0.5px)] bg-[length:24px_24px]">
      <Navbar />
      <main>
        <section className="relative overflow-hidden flex flex-col items-center text-center px-6 pt-28 pb-16 md:pt-40 md:pb-24">
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-100/50 dark:bg-purple-900/20 rounded-full blur-[140px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-50/60 dark:bg-red-900/20 rounded-full blur-[120px]" />
            <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[32px_32px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
          </div>

          <div className="max-w-4xl w-full mx-auto">
            <Breadcrumb
              items={[{ label: "Home", href: "/" }, { label: "Lista d'attesa" }]}
              className="mb-8 text-left"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-linear-to-r from-purple-600 to-red-600 text-white text-xs font-bold uppercase tracking-wider mb-6 shadow-md"
            >
              <Clock size={14} />
              Accesso anticipato
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl lg:text-7xl font-black leading-[1.1] text-gray-900 dark:text-gray-100 tracking-tight"
            >
              Entra in lista.{" "}
              <span className="bg-clip-text text-transparent bg-linear-to-r from-purple-600 via-red-500 to-red-600">
                Arriva Resumari.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6 text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed font-semibold tracking-tight"
            >
              Smetti di rincorrere il tempo. Iscriviti per essere tra i primi a
              trasformare video, PDF e documenti in conoscenza che conta.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-xl mx-auto"
              aria-live="polite"
              aria-label="Countdown al lancio"
            >
              {units.map((unit) => (
                <div
                  key={unit.label}
                  className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-5 shadow-xl shadow-gray-200/50 dark:shadow-none"
                >
                  <div className="text-3xl md:text-4xl font-black tabular-nums bg-clip-text text-transparent bg-linear-to-r from-purple-600 to-red-600">
                    {pad(unit.value)}
                  </div>
                  <div className="mt-1 text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-400">
                    {unit.label}
                  </div>
                </div>
              ))}
            </motion.div>

            {launched && (
              <p className="mt-4 text-sm font-semibold text-purple-600 dark:text-purple-400">
                Il countdown è scaduto: iscriviti comunque, ti avvisiamo non appena apriamo.
              </p>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-10"
            >
              {!formOpen && stato !== "success" && (
                <button
                  type="button"
                  onClick={() => setFormOpen(true)}
                  className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-white font-black text-base bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-200 transition-all transform hover:-translate-y-1 hover:shadow-2xl active:scale-95 shadow-xl shadow-gray-200 dark:shadow-none scroll-mt-28"
                >
                  Iscriviti alla lista
                  <ArrowRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </button>
              )}

              <AnimatePresence>
                {formOpen && stato !== "success" && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={step === "email" ? continuaConEmail : invia}
                    className="max-w-md mx-auto text-left overflow-hidden"
                  >
                    <div className="rounded-3xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 md:p-8 shadow-xl shadow-gray-200/50 dark:shadow-none space-y-5">
                      {step === "email" ? (
                        <>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                              Email
                            </label>
                            <input
                              type="email"
                              required
                              autoFocus
                              value={form.email}
                              onChange={(e) => setForm({ ...form, email: e.target.value })}
                              className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-gray-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/40 outline-none transition-all"
                              placeholder="tua@email.it"
                              autoComplete="email"
                            />
                          </div>
                          <button
                            type="submit"
                            className="w-full py-4 bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-bold rounded-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                          >
                            Continua
                            <ArrowRight size={18} />
                          </button>
                          <div className="relative py-1">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-zinc-700" /></div>
                            <div className="relative flex justify-center"><span className="bg-white dark:bg-zinc-900 px-3 text-xs font-bold text-gray-400">oppure</span></div>
                          </div>
                          <button
                            type="button"
                            onClick={continuaConGoogle}
                            className="w-full py-3 bg-white dark:bg-zinc-800 border-2 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-3"
                          >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Continua con Google
                          </button>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                              Email
                            </label>
                            <input
                              type="email"
                              readOnly
                              value={form.email}
                              className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 dark:text-gray-100 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                              Nome
                            </label>
                            <input
                              type="text"
                              required
                              autoFocus
                              value={form.nome}
                              onChange={(e) => setForm({ ...form, nome: e.target.value })}
                              className="w-full px-5 py-3 rounded-xl border border-gray-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-gray-100 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/40 outline-none transition-all"
                              placeholder="Come ti chiami?"
                              autoComplete="name"
                            />
                          </div>
                          {stato === "error" && (
                            <p className="text-sm text-red-500">
                              Inserisci il tuo nome oppure riprova tra poco.
                            </p>
                          )}
                          <button
                            type="submit"
                            disabled={stato === "sending"}
                            className="w-full py-4 bg-linear-to-r from-purple-600 to-red-600 text-white font-bold rounded-xl hover:scale-[1.02] transition-all hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                          >
                            {stato === "sending" ? (
                              <><Loader2 size={20} className="animate-spin" /> Iscrizione in corso...</>
                            ) : (
                              <>Prenota il tuo posto <ArrowRight size={18} /></>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setStep("email")}
                            className="w-full text-xs font-bold text-gray-400 hover:text-purple-600"
                          >
                            Modifica email
                          </button>
                        </>
                      )}
                      <p className="text-xs text-center text-gray-400">
                        Niente spam. Ti scriviamo solo per l&apos;apertura.
                      </p>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {stato === "success" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-md mx-auto rounded-3xl border border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-xl"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 mb-4">
                    <CheckCircle2 size={32} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-2">
                    {alreadyJoined ? "Sei già in lista" : "Posto prenotato"}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                    {alreadyJoined
                      ? "Questa email è già registrata. Ti avvisiamo non appena apriamo l’accesso."
                      : "Grazie. Ti avvisiamo appena Resumari apre l’accesso anticipato."}
                  </p>
                </motion.div>
              )}
            </motion.div>
          </div>
        </section>

        <section className="relative w-full px-6 py-16 overflow-hidden">
          <div className="absolute top-1/4 left-0 w-96 h-96 bg-purple-50 dark:bg-purple-950/40 rounded-full blur-3xl opacity-50 -z-10 pointer-events-none" />
          <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-red-50 dark:bg-red-950/40 rounded-full blur-3xl opacity-50 -z-10 pointer-events-none" />

          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <div className="w-16 h-1 bg-linear-to-r from-purple-600 to-red-500 rounded-full mb-4 mx-auto" />
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-linear-to-r from-purple-600 to-red-600 text-white text-xs font-bold uppercase tracking-wider mb-6 shadow-md">
                <Sparkles size={14} />
                Cosa troverai
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-gray-100 tracking-tight">
                Tutto quello che arriverà in Resumari
              </h2>
              <p className="mt-4 text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-medium">
                Una piattaforma per distillare video, documenti e conversazioni in
                conoscenza pronta da usare.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {highlights.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                    whileHover={{ y: -8 }}
                    className="group relative bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-8 text-left shadow-xl shadow-gray-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-purple-500/10 hover:border-purple-200 dark:hover:border-purple-700 transition-all duration-300"
                  >
                    <div className="mb-6 flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-br from-purple-600 to-red-600 text-white shadow-lg shadow-purple-500/20 transition-all duration-500 group-hover:rotate-6 group-hover:scale-105">
                      <Icon size={24} />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-3">
                      {item.title}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium text-sm">
                      {item.description}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-3">
            {extras.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-3xl bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-6 text-center"
                >
                  <div className="mb-4 flex justify-center text-purple-600 dark:text-purple-400">
                    <Icon size={28} />
                  </div>
                  <h3 className="font-black text-gray-900 dark:text-gray-100 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {item.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
