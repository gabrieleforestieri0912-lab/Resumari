'use client'

/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/LanguageContext";
import { clearSession } from "@/lib/session";
import {
  User,
  Mail,
  Lock,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Camera,
  Home,
  Settings,
  Calendar,
  CreditCard,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";

export default function Profile() {
  const { locale, t } = useLanguage();
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; type: string }>({
    text: "",
    type: "",
  });
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: string }>({
    text: "",
    type: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      setName(parsed.name || "");
      setEmail(parsed.email || "");
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetch("/api/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          clearSession();
          router.push("/login");
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.email) {
          setUser(data);
          setName(data.name || "");
          setEmail(data.email);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.title = "Profilo | Resumari";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'Il tuo profilo Resumari');
  }, []);

  const [chatCount, setChatCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("/api/chats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setChatCount(data.length);
      })
      .catch(() => {});
  }, []);

  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "?";

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const updated = { ...user, picture: dataUrl };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage({ text: "", type: "" });
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = { ...user, name };
        setUser(updated);
        localStorage.setItem("user", JSON.stringify(updated));
        setProfileMessage({
          text: locale === 'it' ? "Profilo aggiornato con successo." : "Profile updated successfully.",
          type: "success",
        });
      } else {
        setProfileMessage({
          text: data.message || (locale === 'it' ? "Errore nel salvataggio." : "Error saving profile."),
          type: "error",
        });
      }
    } catch {
      setProfileMessage({
        text: locale === 'it' ? "Errore di rete. Riprova." : "Network error. Please try again.",
        type: "error",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPasswordMessage({
        text: locale === 'it' ? "La nuova password deve avere almeno 6 caratteri." : "New password must be at least 6 characters.",
        type: "error",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        text: locale === 'it' ? "Le password non coincidono." : "Passwords do not match.",
        type: "error",
      });
      return;
    }
    setIsSavingPassword(true);
    setPasswordMessage({ text: "", type: "" });
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordMessage({
          text: locale === 'it' ? "Password aggiornata con successo." : "Password updated successfully.",
          type: "success",
        });
      } else {
        setPasswordMessage({
          text: data.message || (locale === 'it' ? "Errore nel cambio password." : "Error changing password."),
          type: "error",
        });
      }
    } catch {
      setPasswordMessage({
        text: locale === 'it' ? "Errore di rete. Riprova." : "Network error. Please try again.",
        type: "error",
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col font-sans">
      <div className="border-b border-gray-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-all"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-black text-gray-900 dark:text-zinc-100 text-lg">
                {t('profile')}
              </h1>
              <p className="text-xs text-gray-500 dark:text-zinc-500">
                {locale === 'it' ? 'Gestisci le informazioni del tuo account' : 'Manage your account information'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-all"
              title="Home"
            >
              <Home size={18} />
            </Link>
            <Link
              href="/settings"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-all"
              title={t('settings')}
            >
              <Settings size={18} />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-6 p-6 bg-gray-50 dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800"
        >
          <div className="relative">
            {user?.picture ? (
              <img src={user.picture} alt="Profilo" className="w-20 h-20 rounded-2xl object-cover shadow-lg" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-red-500 text-white flex items-center justify-center font-black text-2xl shadow-lg">
                {userInitial}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex items-center justify-center text-gray-500 dark:text-zinc-400 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-700 transition-all shadow-sm cursor-pointer">
              <Camera size={14} />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
          <div>
            <p className="font-black text-gray-900 dark:text-zinc-100 text-lg">
              {user?.name || (locale === 'it' ? "Utente" : "User")}
            </p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-5"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <CreditCard size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-zinc-100 text-sm capitalize">
                {user?.plan === "pro" ? "Piano Pro" : user?.plan === "premium" ? "Piano Premium" : "Piano Free"}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-500">
                {user?.plan === "pro" || user?.plan === "premium"
                  ? (locale === 'it' ? 'Riassunti illimitati' : 'Unlimited summaries')
                  : (locale === 'it' ? `${user?.credits ?? 10} riassunti disponibili` : `${user?.credits ?? 10} summaries available`)}
              </p>
            </div>
          </div>
          {user?.plan !== "pro" && user?.plan !== "premium" && (
            <Link
              href="/#pricing"
              className="block w-full py-2.5 bg-purple-600 text-white text-xs font-black rounded-xl hover:bg-purple-700 transition-all text-center"
            >
              {locale === 'it' ? 'Aggiorna piano' : 'Upgrade plan'}
            </Link>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <h2 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
            {locale === 'it' ? 'Informazioni account' : 'Account info'}
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-950 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-zinc-100 text-sm">
                  {locale === 'it' ? 'Tipo account' : 'Account type'}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.provider === "google"
                    ? "Google"
                    : user?.provider === "credentials"
                      ? (locale === 'it' ? 'Email e password' : 'Email & password')
                      : (locale === 'it' ? 'Standard' : 'Standard')}
                </p>
              </div>
            </div>
            {user?.created_at && (
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Calendar size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-zinc-100 text-sm">
                    {locale === 'it' ? 'Membro dal' : 'Member since'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-500">
                    {new Date(user.created_at).toLocaleDateString(locale === 'it' ? 'it-IT' : 'en-US', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                <MessageSquare size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-zinc-100 text-sm">
                  {locale === 'it' ? 'Riassunti creati' : 'Summaries created'}
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-500">
                  {chatCount}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
            {locale === 'it' ? 'Informazioni personali' : 'Personal information'}
          </h2>

          {profileMessage.text && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`mb-4 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${
                profileMessage.type === "error"
                  ? "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900"
                  : "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900"
              }`}
            >
              {profileMessage.type === "error" ? (
                <AlertCircle size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}
              {profileMessage.text}
            </motion.div>
          )}

          <form
            onSubmit={handleSaveProfile}
            className="space-y-5 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800"
          >
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                {locale === 'it' ? 'Nome' : 'Name'}
              </label>
              <div className="relative group">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400 transition-colors"
                  size={20}
                />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={locale === 'it' ? "Il tuo nome" : "Your name"}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/5 focus:border-purple-200 dark:focus:border-purple-700 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                Email
              </label>
              <div className="relative group">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500"
                  size={20}
                />
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full pl-12 pr-4 py-4 bg-gray-100 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl text-gray-500 dark:text-zinc-500 font-medium cursor-not-allowed"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingProfile}
              className="w-full py-3.5 bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black rounded-2xl hover:bg-purple-600 dark:hover:bg-purple-600 dark:hover:text-white transition-all shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              <Save size={16} />
              {isSavingProfile ? (locale === 'it' ? "Salvataggio..." : "Saving...") : (locale === 'it' ? "Salva modifiche" : "Save changes")}
            </button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
            {locale === 'it' ? 'Cambio password' : 'Change password'}
          </h2>

          {passwordMessage.text && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`mb-4 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${
                passwordMessage.type === "error"
                  ? "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900"
                  : "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900"
              }`}
            >
              {passwordMessage.type === "error" ? (
                <AlertCircle size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}
              {passwordMessage.text}
            </motion.div>
          )}

          <form
            onSubmit={handleChangePassword}
            className="space-y-5 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800"
          >
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                {locale === 'it' ? 'Password attuale' : 'Current password'}
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400 transition-colors"
                  size={20}
                />
                <input
                  type={showCurrentPw ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-4 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/5 focus:border-purple-200 dark:focus:border-purple-700 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  {showCurrentPw ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                {locale === 'it' ? 'Nuova password' : 'New password'}
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400 transition-colors"
                  size={20}
                />
                <input
                  type={showNewPw ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={locale === 'it' ? "Minimo 6 caratteri" : "Min 6 characters"}
                  className="w-full pl-12 pr-12 py-4 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/5 focus:border-purple-200 dark:focus:border-purple-700 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  {showNewPw ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                {locale === 'it' ? 'Conferma nuova password' : 'Confirm new password'}
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400 transition-colors"
                  size={20}
                />
                <input
                  type={showConfirmPw ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={locale === 'it' ? "Ripeti la nuova password" : "Repeat the new password"}
                  className="w-full pl-12 pr-12 py-4 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/5 focus:border-purple-200 dark:focus:border-purple-700 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  {showConfirmPw ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingPassword}
              className="w-full py-3.5 bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black rounded-2xl hover:bg-purple-600 dark:hover:bg-purple-600 dark:hover:text-white transition-all shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              <Lock size={16} />
              {isSavingPassword
                ? (locale === 'it' ? "Aggiornamento..." : "Updating...")
                : (locale === 'it' ? "Aggiorna password" : "Update password")}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
