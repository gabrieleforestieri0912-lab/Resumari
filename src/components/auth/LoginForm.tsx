'use client'

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  X,
} from "lucide-react";

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
            className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-gray-900">{locale === 'it' ? 'Password dimenticata?' : 'Forgot password?'}</h3>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {locale === 'it' ? 'Inserisci la tua email e ti invieremo un link per reimpostare la password.' : 'Enter your email and we will send you a link to reset your password.'}
            </p>
            {message.text && (
              <div className={`mb-4 p-3 rounded-xl text-xs font-bold ${message.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
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
                    className="w-full pl-11 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/5 focus:border-purple-200 text-sm font-medium"
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

export default function LoginForm({ locale, onSwitch }: { locale: string; onSwitch: () => void }) {
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
        if (sessionData?.customToken) localStorage.setItem("token", sessionData.customToken);
        if (sessionData?.user) {
          localStorage.setItem("user", JSON.stringify({
            id: sessionData.user.id, email: sessionData.user.email, name: sessionData.user.name,
            credits: sessionData.user.credits ?? 10, plan: sessionData.user.plan || 'free',
          }));
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
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={18} />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.it"
              className="w-full pl-11 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/5 focus:border-purple-200 transition-all text-sm font-medium" />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center ml-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Password</label>
            <button type="button" onClick={() => setShowForgot(true)} className="text-xs font-bold text-purple-600 hover:text-purple-700">
              {locale === 'it' ? 'Dimenticata?' : 'Forgot?'}
            </button>
          </div>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors" size={18} />
            <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/5 focus:border-purple-200 transition-all text-sm font-medium" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-purple-600 transition-all shadow-lg shadow-gray-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
          {loading ? (locale === 'it' ? "Accesso..." : "Logging in...") : (locale === 'it' ? "Accedi" : "Login")}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-3 text-gray-400 font-bold">{locale === 'it' ? 'oppure' : 'or'}</span>
        </div>
      </div>

      <button type="button" onClick={handleGoogleLogin}
        className="w-full py-3 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-3">
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {locale === 'it' ? 'Continua con Google' : 'Continue with Google'}
      </button>

      <div className="mt-6 text-center text-xs font-bold text-gray-400">
        {locale === 'it' ? 'Non hai ancora un account?' : 'Don\'t have an account yet?'}{" "}
        <button type="button" onClick={onSwitch} className="text-purple-600 hover:text-purple-700 transition-colors font-bold">
          {locale === 'it' ? 'Registrati gratuitamente' : 'Sign up for free'}
        </button>
      </div>

      <ForgotPasswordModal show={showForgot} onClose={() => setShowForgot(false)} locale={locale} />
    </>
  );
}
