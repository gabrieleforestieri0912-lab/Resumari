'use client'
 
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/components/LanguageContext";
import { clearSession, useSessionRestored } from "@/lib/session";
import { getCreditsUsage, isPaidPlan } from "@/lib/plans";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Home,
  User,
  Mail,
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
  Folder,
  FileDown,
  Save,
  Sun,
  Moon,
  Camera,
  Palette,
} from "lucide-react";

export default function Settings() {
  const { locale, changeLanguage, t } = useLanguage();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileMessage, setProfileMessage] = useState<{ text: string; type: string }>({ text: "", type: "" });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
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

  // Manual language mode + export path state
  const [localeMode, setLocaleMode] = useState<'manual' | 'auto'>('manual');
  const [exportPath, setExportPath] = useState<string>('');
  const [exportFormat, setExportFormat] = useState<'txt' | 'json' | 'md'>('txt');

  const router = useRouter();

  // Attende il ripristino della sessione (LocalStorage o cookie NextAuth) prima di
  // decidere se l'utente debba essere rimandato al login.
  const sessionRestored = useSessionRestored();

  // Limiti del piano applicati dal server: pool mensile, crediti usati e stato di blocco.
  const planUsage = getCreditsUsage(user);

  const handleLocaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'it' | 'en';
    changeLanguage(val);
    setLocaleMode('manual');
    localStorage.setItem('resumari_locale_mode', 'manual');
  };

  const handleLocaleModeChange = (mode: 'manual' | 'auto') => {
    setLocaleMode(mode);
    localStorage.setItem('resumari_locale_mode', mode);
    if (mode === 'auto') {
      const browserLang = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'it';
      const autoLocale: 'it' | 'en' = browserLang === 'it' ? 'it' : 'en';
      changeLanguage(autoLocale);
    }
  };

  const handlePickExportFolder = async () => {
    // File System Access API (Chrome/Edge) — se non disponibile fallback a input testuale
    try {
      const anyWindow = window as any;
      if (anyWindow.showDirectoryPicker) {
        const dirHandle = await anyWindow.showDirectoryPicker({ mode: 'readwrite' });
        const name = dirHandle.name || 'Cartella selezionata';
        setExportPath(name);
        localStorage.setItem('resumari_export_path', name);
        // handle non serializzabile: salviamo nome, l'handle verrà richiesto di nuovo al momento dell'export se necessario
        (window as any).__resumariDirHandle = dirHandle;
      } else {
        // fallback: prompt manuale
        const manual = window.prompt(locale === 'it' ? 'Inserisci il percorso dove salvare le chat esportate (es. /Documenti/Resumari)' : 'Enter export folder path (e.g. /Documents/Resumari)', exportPath);
        if (manual !== null) {
          setExportPath(manual);
          localStorage.setItem('resumari_export_path', manual);
        }
      }
    } catch {}
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
    if (!sessionRestored) return;

    const stored = localStorage.getItem("user");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      setProfileName(parsed.name || "");
      setProfileEmail(parsed.email || "");
    }

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
        if (data?.email) {
          setUser(data);
          setProfileName(data.name || "");
          setProfileEmail(data.email || "");
        }
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

    const savedMode = localStorage.getItem('resumari_locale_mode') as 'manual' | 'auto' | null;
    if (savedMode) setLocaleMode(savedMode);
    const savedPath = localStorage.getItem('resumari_export_path');
    if (savedPath) setExportPath(savedPath);
    const savedFmt = localStorage.getItem('resumari_export_format') as 'txt' | 'json' | 'md' | null;
    if (savedFmt) setExportFormat(savedFmt);
  }, [sessionRestored, router]);

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
    clearSession();
    router.push("/");
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const updated = { ...user, picture: dataUrl };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      const token = localStorage.getItem("token");
      fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ picture: dataUrl }),
      }).catch(() => {});
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: profileName, picture: user?.picture }),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = { ...user, name: profileName };
        setUser(updated);
        localStorage.setItem("user", JSON.stringify(updated));
        setProfileMessage({ text: locale === 'it' ? "Profilo aggiornato." : "Profile updated.", type: "success" });
      } else {
        setProfileMessage({ text: data.message || (locale === 'it' ? "Errore salvataggio." : "Error saving."), type: "error" });
      }
    } catch {
      setProfileMessage({ text: locale === 'it' ? "Errore di rete." : "Network error.", type: "error" });
    } finally {
      setIsSavingProfile(false);
    }
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
        clearSession();
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
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col font-sans">
      <div className="border-b border-gray-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-all"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-black text-gray-900 dark:text-zinc-100 text-lg">{t('settings')}</h1>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {locale === 'it' ? 'Gestisci le preferenze del tuo account' : 'Manage your account preferences'}
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
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
            {t('account')}
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800">
            <div className="px-5 py-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  {user?.picture ? (
                    <Image src={user.picture} alt="Profilo" width={56} height={56} unoptimized className="w-14 h-14 rounded-2xl object-cover shadow" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-red-500 text-white flex items-center justify-center font-black text-lg">
                      {(profileName || user?.email || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex items-center justify-center text-gray-500 hover:text-purple-600 cursor-pointer shadow-sm">
                    <Camera size={12} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </label>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-zinc-100 text-sm">{profileName || (locale === 'it' ? 'Utente' : 'User')}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">{profileEmail}</p>
                </div>
              </div>
              {profileMessage.text && (
                <div className={`mb-3 p-3 rounded-xl text-xs font-bold ${profileMessage.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400' : 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400'}`}>{profileMessage.text}</div>
              )}
              <form onSubmit={handleSaveProfile} className="space-y-3">
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder={locale === 'it' ? 'Il tuo nome' : 'Your name'} className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200" />
                </div>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={profileEmail} readOnly className="w-full pl-9 pr-3 py-2.5 bg-gray-100 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl text-sm text-gray-500 cursor-not-allowed" />
                </div>
                <button type="submit" disabled={isSavingProfile} className="w-full py-2.5 bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-bold rounded-xl hover:bg-purple-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  <Save size={14} />{isSavingProfile ? (locale === 'it' ? 'Salvataggio...' : 'Saving...') : (locale === 'it' ? 'Salva profilo' : 'Save profile')}
                </button>
              </form>
            </div>

            <button
              onClick={() => setShowChangePassword(!showChangePassword)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                <Shield size={20} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-bold text-gray-900 dark:text-zinc-100 text-sm">{locale === 'it' ? 'Sicurezza' : 'Security'}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  {locale === 'it' ? 'Cambia la tua password' : 'Change your password'}
                </p>
              </div>
              <ChevronRight
                size={18}
                className={`text-gray-300 dark:text-zinc-600 group-hover:text-gray-400 dark:group-hover:text-zinc-400 transition-all shrink-0 ${showChangePassword ? 'rotate-90' : ''}`}
              />
            </button>

            {showChangePassword && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="px-5 py-6 bg-gray-50/50 dark:bg-zinc-900/50"
              >
                <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm">
                  {passwordMessage.text && (
                    <div className={`p-3 rounded-xl text-xs font-bold ${passwordMessage.type === 'error' ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400' : 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400'}`}>
                      {passwordMessage.text}
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider ml-1">{locale === 'it' ? 'Password attuale' : 'Current password'}</label>
                    <input 
                      type="password" 
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider ml-1">{locale === 'it' ? 'Nuova password' : 'New password'}</label>
                    <input 
                      type="password" 
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider ml-1">{locale === 'it' ? 'Conferma nuova password' : 'Confirm new password'}</label>
                    <input 
                      type="password" 
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="w-full py-2.5 bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-bold rounded-xl hover:bg-purple-600 transition-all disabled:opacity-50"
                  >
                    {isUpdatingPassword ? (locale === 'it' ? "Aggiornamento..." : "Updating...") : (locale === 'it' ? "Aggiorna password" : "Update password")}
                  </button>
                </form>
              </motion.div>
            )}

            <div className="px-5 py-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <Bell size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-zinc-100 text-sm">
                    {locale === 'it' ? 'Notifiche' : 'Notifications'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    {locale === 'it' ? 'Preferenze di notifica' : 'Notification preferences'}
                  </p>
                </div>
              </div>
              <div className="ml-14 space-y-3">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2.5">
                    <Bell size={15} className="text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-400 transition-colors shrink-0" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-zinc-100 transition-colors">
                      {locale === 'it' ? 'Notifiche email' : 'Email notifications'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setNotifyEmail(!notifyEmail);
                      const next = { email: !notifyEmail, summary: notifySummary, marketing: notifyMarketing };
                      localStorage.setItem("resumari_notifications", JSON.stringify(next));
                    }}
                    className={`relative w-10 h-5 rounded-full transition-all ${notifyEmail ? "bg-purple-600" : "bg-gray-200 dark:bg-zinc-700"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${notifyEmail ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </label>
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2.5">
                    <MessageSquare size={15} className="text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-400 transition-colors shrink-0" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-zinc-100 transition-colors">
                      {locale === 'it' ? 'Riassunti completati' : 'Summaries completed'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setNotifySummary(!notifySummary);
                      const next = { email: notifyEmail, summary: !notifySummary, marketing: notifyMarketing };
                      localStorage.setItem("resumari_notifications", JSON.stringify(next));
                    }}
                    className={`relative w-10 h-5 rounded-full transition-all ${notifySummary ? "bg-purple-600" : "bg-gray-200 dark:bg-zinc-700"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${notifySummary ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </label>
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2.5">
                    <BellOff size={15} className="text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-400 transition-colors shrink-0" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-zinc-100 transition-colors">
                      {locale === 'it' ? 'Offerte e novità' : 'Offers & updates'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setNotifyMarketing(!notifyMarketing);
                      const next = { email: notifyEmail, summary: notifySummary, marketing: !notifyMarketing };
                      localStorage.setItem("resumari_notifications", JSON.stringify(next));
                    }}
                    className={`relative w-10 h-5 rounded-full transition-all ${notifyMarketing ? "bg-purple-600" : "bg-gray-200 dark:bg-zinc-700"}`}
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
          <h2 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
            {t('preferences')}
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800">
            <div className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/40 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                  <Globe size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-zinc-100 text-sm">{t('language')} — {locale === 'it' ? 'Configurazione manuale' : 'Manual configuration'}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    {localeMode === 'manual'
                      ? (locale === 'it' ? 'Lingua scelta manualmente, priorità su rilevamento browser' : 'Manually selected, overrides browser detection')
                      : (locale === 'it' ? 'Automatica dal browser' : 'Automatic from browser')}
                  </p>
                </div>
                <select
                  value={locale}
                  onChange={handleLocaleChange}
                  disabled={localeMode === 'auto'}
                  className="px-3 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-gray-700 dark:text-zinc-300 hover:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="it">{t('italian')}</option>
                  <option value="en">{t('english')}</option>
                </select>
              </div>
              <div className="ml-14 mt-3 flex items-center gap-2">
                <button
                  onClick={() => handleLocaleModeChange('manual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${localeMode === 'manual' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white dark:bg-zinc-800 text-gray-500 border-gray-200 dark:border-zinc-700'}`}
                >
                  {locale === 'it' ? 'Manuale' : 'Manual'}
                </button>
                <button
                  onClick={() => handleLocaleModeChange('auto')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${localeMode === 'auto' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white dark:bg-zinc-800 text-gray-500 border-gray-200 dark:border-zinc-700'}`}
                >
                  Auto
                </button>
                <span className="text-[11px] text-gray-400 ml-2">{locale === 'it' ? 'Manuale = la tua scelta viene salvata' : 'Manual = your choice is persisted'}</span>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Folder size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-zinc-100 text-sm">{locale === 'it' ? 'Percorso esportazione chat' : 'Chat export path'}</p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                    {exportPath || (locale === 'it' ? 'Nessuna cartella — userà Download di sistema' : 'No folder — will use system Downloads')}
                  </p>
                </div>
                <button
                  onClick={handlePickExportFolder}
                  className="px-3 py-2 bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold rounded-xl hover:bg-purple-600 transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Folder size={14} /> {locale === 'it' ? 'Sfoglia' : 'Browse'}
                </button>
              </div>
              <div className="ml-14 mt-3 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <FileDown size={14} className="text-gray-400" />
                  <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">{locale === 'it' ? 'Formato' : 'Format'}</span>
                </div>
                <select
                  value={exportFormat}
                  onChange={(e) => {
                    const v = e.target.value as 'txt' | 'json' | 'md';
                    setExportFormat(v);
                    localStorage.setItem('resumari_export_format', v);
                  }}
                  className="px-2.5 py-1.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-gray-700 dark:text-zinc-300 cursor-pointer"
                >
                  <option value="txt">TXT</option>
                  <option value="json">JSON</option>
                  <option value="md">Markdown</option>
                </select>
                <span className="text-[11px] text-gray-400">{locale === 'it' ? 'Salvato in locale, usato al prossimo export' : 'Saved locally, used on next export'}</span>
              </div>
              {exportPath && (
                <div className="ml-14 mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <Save size={12} /> {exportPath}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.09 }}
        >
          <h2 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
            {locale === 'it' ? 'Aspetto' : 'Appearance'}
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                <Palette size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-zinc-100 text-sm">{locale === 'it' ? 'Tema' : 'Theme'}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">{locale === 'it' ? 'Chiaro / Scuro — segue sistema se non scelto' : 'Light / Dark — follows system if not set'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTheme("light")}
                  className={`p-2.5 rounded-xl border transition-all ${theme === 'light' ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-50 dark:bg-zinc-800 text-gray-500 border-gray-200 dark:border-zinc-700'}`}
                  title="Light"
                >
                  <Sun size={16} />
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={`p-2.5 rounded-xl border transition-all ${theme === 'dark' ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-50 dark:bg-zinc-800 text-gray-500 border-gray-200 dark:border-zinc-700'}`}
                  title="Dark"
                >
                  <Moon size={16} />
                </button>
              </div>
            </div>
            <div className="ml-14 mt-3 flex items-center gap-2">
              <button onClick={() => setTheme("light")} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${theme === 'light' ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-zinc-900' : 'bg-white dark:bg-zinc-800 text-gray-500 border-gray-200 dark:border-zinc-700'}`}>Light</button>
              <button onClick={() => setTheme("dark")} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${theme === 'dark' ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-zinc-900' : 'bg-white dark:bg-zinc-800 text-gray-500 border-gray-200 dark:border-zinc-700'}`}>Dark</button>
              <button onClick={() => setTheme("system")} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${theme === 'system' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white dark:bg-zinc-800 text-gray-500 border-gray-200 dark:border-zinc-700'}`}>Auto</button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
            Abbonamento
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <CreditCard size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-zinc-100 text-sm">
                  Piano {planUsage.planName}
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  {locale === 'it'
                    ? `${planUsage.remaining} crediti rimasti su ${planUsage.limit} al mese`
                    : `${planUsage.remaining} credits left out of ${planUsage.limit} per month`}
                </p>
              </div>
              {!isPaidPlan(planUsage.plan) && (
                <Link
                  href="/#pricing"
                  className="px-4 py-2 bg-purple-600 text-white text-xs font-black rounded-xl hover:bg-purple-700 transition-all flex items-center gap-1.5"
                >
                  {locale === 'it' ? 'Aggiorna' : 'Upgrade'} <ExternalLink size={12} />
                </Link>
              )}
            </div>
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4">
              <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-zinc-400 mb-2">
                <span>{locale === 'it' ? 'Crediti utilizzati questo mese' : 'Credits used this month'}</span>
                <span>{planUsage.used} / {planUsage.limit}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${planUsage.exhausted ? "bg-red-500" : "bg-purple-600"}`}
                  style={{ width: `${Math.min(100, (planUsage.used / planUsage.limit) * 100)}%` }}
                />
              </div>
              {planUsage.exhausted && (
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 dark:text-red-400 mt-2">
                  <AlertCircle size={12} />
                  {locale === 'it'
                    ? 'Crediti esauriti: chat e trascrizioni sono bloccate fino al rinnovo.'
                    : 'Credits exhausted: chat and transcriptions are blocked until renewal.'}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xs font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
            Sessione
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 divide-y divide-gray-100 dark:divide-zinc-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors group"
            >
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-500 dark:text-red-400 shrink-0 group-hover:bg-red-100 dark:group-hover:bg-red-900/40">
                <LogOut size={20} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-red-500 dark:text-red-400 text-sm">{locale === 'it' ? 'Esci' : 'Logout'}</p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
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
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-red-100 dark:border-red-900/50 p-5">
            {deleteMessage.text && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`mb-4 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${
                  deleteMessage.type === "error"
                    ?"bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50" : "bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900/50"
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
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl border border-red-100 dark:border-red-900/50 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                <Trash2 size={18} />
                <span className="font-bold text-sm">Elimina account</span>
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-bold text-red-600 dark:text-red-400">
                  Sei sicuro? Questa azione è irreversibile.
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Verranno eliminati tutti i tuoi dati, chat e contenuti
                  associati al tuo account.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-3 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-black rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all text-sm"
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
