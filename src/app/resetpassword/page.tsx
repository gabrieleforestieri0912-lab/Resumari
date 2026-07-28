'use client'

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/LanguageContext";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  KeyRound,
} from "lucide-react";

function ResetPasswordForm() {
  const { locale, t } = useLanguage();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [systemMessage, setSystemMessage] = useState<{ text: string; type: string }>({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setIsValidToken(false);
    } else {
      setIsValidToken(true);
    }
  }, [token]);

  useEffect(() => {
    document.title = "Reimposta Password | Resumari";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      setSystemMessage({ 
        text: locale === 'it' ? "Compila tutti i campi." : "Please fill in all fields.", 
        type: "error" 
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setSystemMessage({ 
        text: locale === 'it' ? "Le password non coincidono." : "Passwords do not match.", 
        type: "error" 
      });
      return;
    }

    if (newPassword.length < 6) {
      setSystemMessage({ 
        text: locale === 'it' ? "La password deve avere almeno 6 caratteri." : "Password must be at least 6 characters.", 
        type: "error" 
      });
      return;
    }

    setIsLoading(true);
    setSystemMessage({ 
      text: locale === 'it' ? "Aggiornamento password..." : "Updating password...", 
      type: "info" 
    });

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setIsSuccess(true);
        setSystemMessage({ text: data.message, type: "success" });
        setTimeout(() => router.push("/login"), 3000);
      } else {
        setSystemMessage({ text: data.message, type: "error" });
      }
    } catch (err) {
      setSystemMessage({ 
        text: locale === 'it' ? "Errore. Riprova più tardi." : "Error. Please try again later.", 
        type: "error" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse">{locale === 'it' ? 'Caricamento...' : 'Loading...'}</div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">{locale === 'it' ? 'Link non valido' : 'Invalid link'}</h1>
          <p className="text-gray-500 mb-6">{locale === 'it' ? 'Il link di recupero password non è valido o è scaduto.' : 'The password recovery link is invalid or has expired.'}</p>
          <Link href="/login" className="text-purple-600 font-bold hover:underline">
            {locale === 'it' ? 'Torna al login' : 'Back to login'}
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center p-8"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">{locale === 'it' ? 'Password aggiornata!' : 'Password updated!'}</h1>
          <p className="text-gray-500 mb-6">{locale === 'it' ? 'Ora puoi accedere con la tua nuova password.' : 'Now you can log in with your new password.'}</p>
          <Link href="/login" className="text-purple-600 font-bold hover:underline">
            {locale === 'it' ? 'Accedi ora' : 'Login now'}
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-8 lg:p-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 text-purple-600">
              <KeyRound size={24} />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
              {locale === 'it' ? 'Nuova password' : 'New password'}
            </h2>
            <p className="text-gray-500 font-medium text-sm">
              {locale === 'it' ? 'Inserisci la tua nuova password.' : 'Enter your new password.'}
            </p>
          </div>

          {systemMessage.text && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`mb-5 p-3 rounded-xl flex items-center gap-2 text-xs font-bold ${
                systemMessage.type === "error"
                  ? "bg-red-50 text-red-600"
                  : "bg-green-50 text-green-600"
              }`}
            >
              {systemMessage.type === "error" ? (
                <AlertCircle size={14} />
              ) : (
                <CheckCircle2 size={14} />
              )}
              {systemMessage.text}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                {locale === 'it' ? 'Nuova password' : 'New password'}
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors"
                  size={18}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={locale === 'it' ? "Minimo 6 caratteri" : "Min 6 characters"}
                  className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/5 focus:border-purple-200 transition-all text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                {locale === 'it' ? 'Conferma password' : 'Confirm password'}
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors"
                  size={18}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={locale === 'it' ? "Conferma la password" : "Confirm the password"}
                  className="w-full pl-11 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/5 focus:border-purple-200 transition-all text-sm font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-purple-600 transition-all shadow-lg shadow-gray-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (locale === 'it' ? "Aggiornamento..." : "Updating...") : (locale === 'it' ? "Salva nuova password" : "Save new password")}
              {!isLoading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="mt-6 text-center text-xs font-bold text-gray-400">
            <Link href="/login" className="text-purple-600 hover:text-purple-700 transition-colors">
              {locale === 'it' ? 'Torna al login' : 'Back to login'}
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-gray-50 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-red-600/10 z-0" />
        <div className="relative z-10 flex flex-col items-center justify-center px-12 py-16 text-center">
          <div className="w-20 h-20 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center mb-8 text-purple-600">
            <KeyRound size={40} />
          </div>
          <h3 className="text-3xl font-black text-gray-900 mb-5 leading-tight">
            {locale === 'it' ? 'Reimposta la tua\npassword in sicurezza.' : 'Reset your\npassword securely.'}
          </h3>
          <p className="text-gray-500 font-medium max-w-sm leading-relaxed text-sm">
            {locale === 'it' ? 'Scegli una password sicura che ricorderai facilmente.' : 'Choose a secure password you will easily remember.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function Loading() {
  const { locale } = useLanguage();
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-pulse">{locale === 'it' ? 'Caricamento...' : 'Loading...'}</div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
