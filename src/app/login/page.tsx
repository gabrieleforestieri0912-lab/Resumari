'use client'

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import { saveSession } from "@/lib/session";
import { useLanguage } from "@/components/LanguageContext";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  X,
} from "lucide-react";

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 120 : -120,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -120 : 120,
    opacity: 0,
  }),
};

const panelVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? -120 : 120,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? 120 : -120,
    opacity: 0,
  }),
};

function ForgotPasswordModal({ show, onClose, locale }: { show: boolean; onClose: () => void; locale: string }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage({ text: locale === 'it' ? "Inserisci la tua email." : "Please enter your email.", type: "error" });
      return;
    }
    setSending(true);
    setMessage({ text: locale === 'it' ? "Invio link..." : "Sending link...", type: "info" });
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage({ text: data.message, type: res.ok ? "success" : "error" });
      if (res.ok) setTimeout(() => { onClose(); setEmail(""); setMessage({ text: "", type: "" }); }, 3000);
    } catch {
      setMessage({ text: locale === 'it' ? "Errore. Riprova più tardi." : "Error. Please try again later.", type: "error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-gray-900 dark:text-gray-100">{locale === 'it' ? 'Password dimenticata?' : 'Forgot password?'}</h3>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {locale === 'it' ? 'Inserisci la tua email e ti invieremo un link per reimpostare la password.' : 'Enter your email and we will send you a link to reset your password.'}
            </p>
            {message.text && (
              <div className={`mb-4 p-3 rounded-xl text-xs font-bold ${message.type === "error" ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400" : "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400"}`}>
                {message.text}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={locale === 'it' ? "La tua email" : "Your email"}
                    className="w-full pl-11 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/5 focus:border-purple-200 dark:focus:border-purple-500 text-sm font-medium dark:text-gray-100"
                  />
                </div>
                <button type="submit" disabled={sending} className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50">
                  {sending ? (locale === 'it' ? "Invio in corso..." : "Sending...") : (locale === 'it' ? "Invia link di recupero" : "Send recovery link")}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LoginForm({ locale, onSwitch }: { locale: string; onSwitch: (delta: number) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setMessage({ text: locale === 'it' ? "Compila tutti i campi." : "Please fill in all fields.", type: "error" });
      return;
    }
    setLoading(true);
    setMessage({ text: locale === 'it' ? "Accesso in corso..." : "Logging in...", type: "info" });
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setMessage({
          text: result.error === "CredentialsSignin" ? (locale === 'it' ? "Email o password errati" : "Invalid email or password") : result.error,
          type: "error",
        });
        setLoading(false);
        return;
      }
      const sessionResponse = await fetch("/api/auth/session");
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        if (sessionData?.user) {
          const sessionUser = {
            id: sessionData.user.id, email: sessionData.user.email, name: sessionData.user.name,
            credits: sessionData.user.credits ?? 10, plan: sessionData.user.plan || 'free',
          };
          if (sessionData?.customToken) {
            saveSession(sessionData.customToken, sessionUser);
          } else {
            localStorage.setItem("user", JSON.stringify(sessionUser));
          }
        }
      }
      setMessage({ text: locale === 'it' ? "Bentornato! Reindirizzamento..." : "Welcome back! Redirecting...", type: "success" });
      setTimeout(() => router.push("/"), 1500);
    } catch {
      setMessage({ text: locale === 'it' ? "Errore di rete. Riprova più tardi." : "Network error. Please try again later.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Email</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={18} />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.it"
              className="w-full pl-11 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/5 focus:border-purple-200 dark:focus:border-purple-500 transition-all text-sm font-medium dark:text-gray-100" />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center ml-1">
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Password</label>
            <button type="button" onClick={() => setShowForgot(true)} className="text-xs font-bold text-purple-600 hover:text-purple-700">
              {locale === 'it' ? 'Dimenticata?' : 'Forgot?'}
            </button>
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={18} />
            <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full pl-11 pr-11 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/5 focus:border-purple-200 dark:focus:border-purple-500 transition-all text-sm font-medium dark:text-gray-100" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-gray-900 dark:bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-600 transition-all shadow-lg shadow-gray-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
          {loading ? (locale === 'it' ? "Accesso..." : "Logging in...") : (locale === 'it' ? "Accedi" : "Login")}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-zinc-700" /></div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white dark:bg-zinc-900 px-3 text-gray-400 dark:text-gray-500 font-bold">{locale === 'it' ? 'oppure' : 'or'}</span>
        </div>
      </div>

      <button type="button" onClick={handleGoogleLogin}
        className="w-full py-3 bg-white dark:bg-zinc-800 border-2 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 transition-all flex items-center justify-center gap-3">
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {locale === 'it' ? 'Continua con Google' : 'Continue with Google'}
      </button>

      <div className="mt-6 text-center text-xs font-bold text-gray-400 dark:text-gray-500">
        {locale === 'it' ? 'Non hai ancora un account?' : 'Don\'t have an account yet?'}{" "}
        <button type="button" onClick={() => onSwitch(1)} className="text-purple-600 hover:text-purple-700 transition-colors font-bold">
          {locale === 'it' ? 'Registrati gratuitamente' : 'Sign up for free'}
        </button>
      </div>

      <ForgotPasswordModal show={showForgot} onClose={() => setShowForgot(false)} locale={locale} />
    </>
  );
}

function SignupForm({ locale, onSwitch }: { locale: string; onSwitch: (delta: number) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setMessage({ text: locale === 'it' ? "Compila tutti i campi." : "Please fill in all fields.", type: "error" });
      return;
    }
    if (password.length < 6) {
      setMessage({ text: locale === 'it' ? "La password deve avere almeno 6 caratteri." : "Password must be at least 6 characters.", type: "error" });
      return;
    }
    setLoading(true);
    setMessage({ text: locale === 'it' ? "Registrazione in corso..." : "Signing up...", type: "info" });
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await response.json();
      if (response.ok) {
        saveSession(data.token, data.user);
        setMessage({ text: locale === 'it' ? "Account creato! Reindirizzamento..." : "Account created! Redirecting...", type: "success" });
        setTimeout(() => router.push("/"), 1500);
      } else {
        setMessage({ text: data.message || (locale === 'it' ? "Errore durante la registrazione" : "Error during signup"), type: "error" });
      }
    } catch {
      setMessage({ text: locale === 'it' ? "Errore di rete. Riprova più tardi." : "Network error. Please try again later.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    await signIn("google", { callbackUrl: "/" });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{locale === 'it' ? 'Nome' : 'Name'}</label>
          <div className="relative group">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={18} />
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              placeholder={locale === 'it' ? "Il tuo nome" : "Your name"}
              className="w-full pl-11 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/5 focus:border-purple-200 dark:focus:border-purple-500 transition-all text-sm font-medium dark:text-gray-100" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Email</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={18} />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.it"
              className="w-full pl-11 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/5 focus:border-purple-200 dark:focus:border-purple-500 transition-all text-sm font-medium dark:text-gray-100" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Password</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={18} />
            <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={locale === 'it' ? "Minimo 6 caratteri" : "Min 6 characters"}
              className="w-full pl-11 pr-11 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/5 focus:border-purple-200 dark:focus:border-purple-500 transition-all text-sm font-medium dark:text-gray-100" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-gray-900 dark:bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-600 transition-all shadow-lg shadow-gray-200 dark:shadow-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
          {loading ? (locale === 'it' ? "Registrazione..." : "Signing up...") : (locale === 'it' ? "Registrati" : "Sign up")}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-zinc-700" /></div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white dark:bg-zinc-900 px-3 text-gray-400 dark:text-gray-500 font-bold">{locale === 'it' ? 'oppure' : 'or'}</span>
        </div>
      </div>

      <button type="button" onClick={handleGoogleLogin}
        className="w-full py-3 bg-white dark:bg-zinc-800 border-2 border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 transition-all flex items-center justify-center gap-3">
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {locale === 'it' ? 'Continua con Google' : 'Continue with Google'}
      </button>

      <div className="mt-6 text-center text-xs font-bold text-gray-400 dark:text-gray-500">
        {locale === 'it' ? 'Hai già un account?' : 'Already have an account?'}{" "}
        <button type="button" onClick={() => onSwitch(-1)} className="text-purple-600 hover:text-purple-700 transition-colors font-bold">
          {locale === 'it' ? 'Accedi' : 'Login'}
        </button>
      </div>
    </>
  );
}

function AuthPageContent() {
  const { locale } = useLanguage();
  const searchParams = useSearchParams();
  const urlMode = searchParams.get("mode");
  const [prevMode, setPrevMode] = useState(urlMode);
  const [mode, setMode] = useState(0);
  const [[activeIndex, direction], setActiveIndex] = useState([0, 0]);

  // Adjust state during render when the ?mode= URL changes (signup link),
  // instead of calling setState inside an effect.
  if (prevMode !== urlMode) {
    setPrevMode(urlMode);
    if (urlMode === "signup") {
      setMode(1);
      setActiveIndex([1, 1]);
    }
  }

  useEffect(() => {
    document.title = "Accedi | Resumari";
  }, []);

  const switchMode = (delta: number) => {
    const next = activeIndex + delta;
    if (next < 0 || next > 1) return;
    setActiveIndex([next, delta]);
    setMode(next);
  };

  const content = [
    {
      title: locale === 'it' ? 'Bentornato.' : 'Welcome back.',
      desc: locale === 'it' ? 'Inserisci le tue credenziali per accedere.' : 'Enter your credentials to access your account.',
      panelTitle: locale === 'it' ? "L'intelligenza artificiale al servizio del tuo tempo." : "AI at the service of your time.",
      panelDesc: locale === 'it' ? 'Unisciti a migliaia di professionisti che utilizzano Resumari per analizzare video, documenti e testi in pochi secondi.' : 'Join thousands of professionals using Resumari to analyze videos, documents and texts in seconds.',
      form: <LoginForm locale={locale} onSwitch={switchMode} />,
    },
    {
      title: locale === 'it' ? 'Crea il tuo account.' : 'Create your account.',
      desc: locale === 'it' ? 'Inizia a usare Resumari per riassumere i tuoi contenuti.' : 'Start using Resumari to summarize your content.',
      panelTitle: locale === 'it' ? 'Crea riassunti in secondi, non in ore.' : 'Create summaries in seconds, not hours.',
      panelDesc: locale === 'it' ? 'Nessuna carta di credito richiesta. Inizia subito a trasformare video e documenti in riassunti pronti all\'uso.' : 'No credit card required. Start turning videos and documents into ready-to-use summaries right now.',
      form: <SignupForm locale={locale} onSwitch={switchMode} />,
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex overflow-hidden">
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 font-black text-xl text-purple-600 hover:scale-105 transition-transform"
      >
        <img src="/resumari.png" alt="Logo" className="w-8 h-8" />
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-red-600">
          Resumari
        </span>
      </Link>

      <div className={`flex w-full ${activeIndex === 1 ? "flex-row-reverse" : ""}`}>
        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={`form-${activeIndex}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-8 lg:p-10 min-h-screen"
          >
            <div className="w-full max-w-md">
              <div className="mb-8">
                <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-2 tracking-tight">
                  {content[activeIndex].title}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium text-sm">
                  {content[activeIndex].desc}
                </p>
              </div>
              {content[activeIndex].form}
            </div>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="popLayout" custom={direction}>
          <motion.div
            key={`panel-${activeIndex}`}
            custom={direction}
            variants={panelVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="hidden lg:flex lg:w-1/2 bg-gray-50 dark:bg-zinc-900 relative overflow-hidden items-center justify-center min-h-screen"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-red-600/10 z-0" />
            <div className="relative z-10 flex flex-col items-center justify-center px-12 py-16 text-center">
              <div className="w-20 h-20 bg-white dark:bg-zinc-800 rounded-[2rem] shadow-2xl flex items-center justify-center mb-8 text-purple-600 rotate-12">
                <Sparkles size={40} />
              </div>
              <h3 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-5 leading-tight">
                {content[activeIndex].panelTitle}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm leading-relaxed text-sm">
                {content[activeIndex].panelDesc}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageContent />
    </Suspense>
  );
}
