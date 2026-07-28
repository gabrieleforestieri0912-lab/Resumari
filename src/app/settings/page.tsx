'use client'
 
/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/LanguageContext";
import {
  ArrowLeft,
  Home,
  User,
  Bell,
  BellOff,
  Shield,
  CreditCard,
  Trash2,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ExternalLink,
  Globe,
  Lock,
  ArrowRight,
  MessageSquare,
} from "lucide-react";

export default function Settings() {
  const { locale, changeLanguage, t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ text: string; type: string }>({
    text: "",
    type: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: string }>({ text: "", type: "" });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Notifications state
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySummary, setNotifySummary] = useState(true);
  const [notifyMarketing, setNotifyMarketing] = useState(false);

  // Usage stats
  const [chatCount, setChatCount] = useState(0);

  const router = useRouter();

  const handleLocaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    changeLanguage(e.target.value as 'it' | 'en');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: locale === 'it' ? "Le password non coincidono" : "Passwords do not match", type: "error" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ text: locale === 'it' ? "La password deve avere almeno 6 caratteri" : "Password must be at least 6 characters", type: "error" });
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordMessage({ text: "", type: "" });

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setPasswordMessage({ text: locale === 'it' ? "Password aggiornata con successo" : "Password updated successfully", type: "success" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setShowChangePassword(false), 2000);
      } else {
        setPasswordMessage({ text: data.message || (locale === 'it' ? "Errore nell'aggiornamento" : "Error updating password"), type: "error" });
      }
    } catch {
      setPasswordMessage({ text: locale === 'it' ? "Errore di rete" : "Network error", type: "error" });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetch("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.email) setUser(data);
      })
      .catch(() => {});

    fetch("/api/chats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setChatCount(data.length);
      })
      .catch(() => {});

    const savedNotifs = localStorage.getItem("resumari_notifications");
    if (savedNotifs) {
      try {
        const n = JSON.parse(savedNotifs);
        if (typeof n.email === "boolean") setNotifyEmail(n.email);
        if (typeof n.summary === "boolean") setNotifySummary(n.summary);
        if (typeof n.marketing === "boolean") setNotifyMarketing(n.marketing);
      } catch {}
    }
  }, []);

  useEffect(() => {
    document.title = "Impostazioni | Resumari";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'Gestisci le impostazioni del tuo account');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteMessage({ text: "", type: "" });
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/profile", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/");
      } else {
        const data = await res.json();
        setDeleteMessage({
          text: data.message || "Errore nell'eliminazione.",
          type: "error",
        });
      }
    } catch {
      setDeleteMessage({
        text: "Errore di rete. Riprova.",
        type: "error",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <div className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-all"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-black text-gray-900 text-lg">{t('settings')}</h1>
              <p className="text-xs text-gray-500">
                {locale === 'it' ? 'Gestisci le preferenze del tuo account' : 'Manage your account preferences'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-all"
              title="Home"
            >
              <Home size={18} />
            </Link>
            <Link
              href="/profile"
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-all"
              title={t('profile')}
            >
              <User size={18} />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
            {t('account')}
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
            <Link
              href="/profile"
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                <User size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">{t('profile')}</p>
                <p className="text-xs text-gray-500">
                  {locale === 'it' ? 'Nome, email, avatar' : 'Name, email, avatar'}
                </p>
              </div>
              <ChevronRight
                size={18}
                className="text-gray-300 group-hover:text-gray-400 transition-colors shrink-0"
              />
            </Link>

            <button
              onClick={() => setShowChangePassword(!showChangePassword)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                <Shield size={20} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-bold text-gray-900 text-sm">{locale === 'it' ? 'Sicurezza' : 'Security'}</p>
                <p className="text-xs text-gray-500">
                  {locale === 'it' ? 'Cambia la tua password' : 'Change your password'}
                </p>
              </div>
              <ChevronRight
                size={18}
                className={`text-gray-300 group-hover:text-gray-400 transition-all shrink-0 ${showChangePassword ? 'rotate-90' : ''}`}
              />
            </button>

            {showChangePassword && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="px-5 py-6 bg-gray-50/50"
              >
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
                  {passwordMessage.text && (
                    <div className={`p-3 rounded-xl text-xs font-bold ${passwordMessage.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                      {passwordMessage.text}
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{locale === 'it' ? 'Password attuale' : 'Current password'}</label>
                    <input 
                      type="password" 
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{locale === 'it' ? 'Nuova password' : 'New password'}</label>
                    <input 
                      type="password" 
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{locale === 'it' ? 'Conferma nuova password' : 'Confirm new password'}</label>
                    <input 
                      type="password" 
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="w-full py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-purple-600 transition-all disabled:opacity-50"
                  >
                    {isUpdatingPassword ? (locale === 'it' ? "Aggiornamento..." : "Updating...") : (locale === 'it' ? "Aggiorna password" : "Update password")}
                  </button>
                </form>
              </motion.div>
            )}

            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <Bell size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">
                    {locale === 'it' ? 'Notifiche' : 'Notifications'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {locale === 'it' ? 'Preferenze di notifica' : 'Notification preferences'}
                  </p>
                </div>
              </div>
              <div className="ml-14 space-y-3">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2.5">
                    <Bell size={15} className="text-gray-400 group-hover:text-gray-600 transition-colors shrink-0" />
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
                      {locale === 'it' ? 'Notifiche email' : 'Email notifications'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setNotifyEmail(!notifyEmail);
                      const next = { email: !notifyEmail, summary: notifySummary, marketing: notifyMarketing };
                      localStorage.setItem("resumari_notifications", JSON.stringify(next));
                    }}
                    className={`relative w-10 h-5 rounded-full transition-all ${notifyEmail ? "bg-purple-600" : "bg-gray-200"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${notifyEmail ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </label>
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare size={15} className="text-gray-400 group-hover:text-gray-600 transition-colors shrink-0" />
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
                      {locale === 'it' ? 'Riassunti completati' : 'Summaries completed'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setNotifySummary(!notifySummary);
                      const next = { email: notifyEmail, summary: !notifySummary, marketing: notifyMarketing };
                      localStorage.setItem("resumari_notifications", JSON.stringify(next));
                    }}
                    className={`relative w-10 h-5 rounded-full transition-all ${notifySummary ? "bg-purple-600" : "bg-gray-200"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${notifySummary ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </label>
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2.5">
                    <BellOff size={15} className="text-gray-400 group-hover:text-gray-600 transition-colors shrink-0" />
                    <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
                      {locale === 'it' ? 'Offerte e novità' : 'Offers & updates'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setNotifyMarketing(!notifyMarketing);
                      const next = { email: notifyEmail, summary: notifySummary, marketing: !notifyMarketing };
                      localStorage.setItem("resumari_notifications", JSON.stringify(next));
                    }}
                    className={`relative w-10 h-5 rounded-full transition-all ${notifyMarketing ? "bg-purple-600" : "bg-gray-200"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${notifyMarketing ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </label>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
            {t('preferences')}
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
                <Globe size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">{t('language')}</p>
                <p className="text-xs text-gray-500">
                  Italiano / English
                </p>
              </div>
              <select
                value={locale}
                onChange={handleLocaleChange}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all cursor-pointer"
              >
                <option value="it">{t('italian')}</option>
                <option value="en">{t('english')}</option>
              </select>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
            Abbonamento
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                <CreditCard size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm capitalize">
                  {user?.plan === "pro" ? "Piano Pro" : user?.plan === "premium" ? "Piano Premium" : "Piano Free"}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.plan === "pro" || user?.plan === "premium"
                    ? (locale === 'it' ? 'Riassunti illimitati' : 'Unlimited summaries')
                    : (locale === 'it' ? `${user?.credits ?? 10} riassunti disponibili` : `${user?.credits ?? 10} summaries available`)}
                </p>
              </div>
              {user?.plan !== "pro" && user?.plan !== "premium" && (
                <Link
                  href="/#pricing"
                  className="px-4 py-2 bg-purple-600 text-white text-xs font-black rounded-xl hover:bg-purple-700 transition-all flex items-center gap-1.5"
                >
                  {locale === 'it' ? 'Aggiorna' : 'Upgrade'} <ExternalLink size={12} />
                </Link>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                <span>{locale === 'it' ? 'Riassunti utilizzati' : 'Summaries used'}</span>
                <span>{chatCount} / {user?.credits ?? 10}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (chatCount / (user?.credits ?? 10)) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
            Sessione
          </h2>
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shrink-0 group-hover:bg-red-100">
                <LogOut size={20} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-red-500 text-sm">{locale === 'it' ? 'Esci' : 'Logout'}</p>
                <p className="text-xs text-gray-500">
                  {locale === 'it' ? 'Disconnetti dal tuo account' : 'Logout from your account'}
                </p>
              </div>
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xs font-black text-red-400 uppercase tracking-widest mb-4">
            Zona pericolosa
          </h2>
          <div className="bg-white rounded-2xl border border-red-100 p-5">
            {deleteMessage.text && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`mb-4 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${
                  deleteMessage.type === "error"
                    ? "bg-red-50 text-red-600 border border-red-100"
                    : "bg-green-50 text-green-600 border border-green-100"
                }`}
              >
                {deleteMessage.type === "error" ? (
                  <AlertCircle size={18} />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                {deleteMessage.text}
              </motion.div>
            )}

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={18} />
                <span className="font-bold text-sm">Elimina account</span>
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-bold text-red-600">
                  Sei sicuro? Questa azione è irreversibile.
                </p>
                <p className="text-xs text-gray-500">
                  Verranno eliminati tutti i tuoi dati, chat e contenuti
                  associati al tuo account.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-black rounded-xl hover:bg-gray-200 transition-all text-sm"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex-1 py-3 bg-red-500 text-white font-black rounded-xl hover:bg-red-600 transition-all text-sm disabled:opacity-50"
                  >
                    {isDeleting ? "Eliminazione..." : "Conferma eliminazione"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
