/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { clearSession, useSessionRestored } from "@/lib/session";
import {
  MessageSquare,
  Sparkles,
  FileText,
  LogOut,
  LayoutDashboard,
  Video,
  Home,
  PanelLeftClose,
  BarChart3,
  TrendingUp,
  Clock,
  Layers,
  Flame,
  FileSearch,
  PlayCircle,
  CalendarDays,
  ArrowUpRight,
  Settings,
  CreditCard,
  ChevronDown,
} from "lucide-react";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function toTimestamp(value: any): number {
  if (value == null || value === "") return Date.now();
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? Date.now() : t;
}

function msgVideoId(msg: any): string | null {
  const v = msg?.videoId || msg?.video_id;
  return v ? String(v) : null;
}

function getLast7Days() {
  const result: { date: string; label: string; day: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push({
      date: d.toISOString().split("T")[0],
      label: d.toLocaleDateString("it-IT", { weekday: "short" }).slice(0, 3),
      day: d.getDate(),
    });
  }
  return result;
}

function computeStats(chats: any[], msgsMap: Record<string, any>) {
  let totalMessages = 0;
  const videoIds = new Set<string>();
  const dayCounts: Record<string, number> = {};
  let longestChat: any = null;
  let maxMsgs = 0;

  chats.forEach((chat) => {
    const msgs = Array.isArray(msgsMap[chat.id]) ? msgsMap[chat.id] : [];
    const dayKey = new Date(toTimestamp(chat.createdAt)).toISOString().split("T")[0];
    totalMessages += msgs.length;
    if (msgs.length > maxMsgs) {
      maxMsgs = msgs.length;
      longestChat = chat;
    }
    msgs.forEach((msg: any) => {
      const vid = msgVideoId(msg) || (chat.videoId ? String(chat.videoId) : null);
      if (vid) videoIds.add(vid);
      dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
    });
  });

  const last7Days = getLast7Days();
  const activity = last7Days.map((d) => ({
    ...d,
    count: dayCounts[d.date] || 0,
  }));
  const maxCount = Math.max(...activity.map((d) => d.count), 1);
  const totalDays = Object.keys(dayCounts).length;
  const avgPerDay = totalDays > 0 ? (totalMessages / totalDays).toFixed(1) : "0";
  const avgPerChat = chats.length > 0 ? (totalMessages / chats.length).toFixed(1) : "0";
  const activeDays = Object.values(dayCounts).filter((c) => c > 0).length;

  // streak: consecutive days with activity ending today
  let streak = 0;
  for (let i = last7Days.length - 1; i >= 0; i--) {
    if ((dayCounts[last7Days[i].date] || 0) > 0) streak++;
    else break;
  }

  const recentChats = [...chats]
    .sort((a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt))
    .slice(0, 6);

  const busiestDay = activity.reduce((best, d) => (d.count > best.count ? d : best), activity[0]);

  return {
    totalChats: chats.length,
    totalMessages,
    videoCount: videoIds.size,
    activity,
    maxCount,
    avgPerDay,
    avgPerChat,
    recentChats,
    hasActivity: totalMessages > 0,
    activeDays,
    streak,
    longestChat,
    longestChatSize: maxMsgs,
    busiestDay,
  };
}

export default function Dashboard() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  const sessionRestored = useSessionRestored();

  useEffect(() => {
    if (!sessionRestored) return;

    let cancelled = false;

    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {}
    }

    const token = localStorage.getItem("token");
    const localChats: any[] = safeParse(localStorage.getItem("resumari_chats"), []);
    const localMsgs: Record<string, any> = safeParse(
      localStorage.getItem("resumari_chat_messages"),
      {},
    );

    const apply = (chats: any[], msgsMap: Record<string, any>) => {
      if (cancelled) return;
      setData(computeStats(chats, msgsMap));

      // trascrizioni locali come fallback per la sezione Trascrizioni Recenti
      const localTranscripts: any[] = [];
      Object.values(msgsMap).forEach((list: any) => {
        (Array.isArray(list) ? list : []).forEach((m: any) => {
          if (m.transcript && Array.isArray(m.transcript) && m.transcript.length > 0 && m.videoId) {
            if (!localTranscripts.find((t) => t.videoId === m.videoId)) {
              localTranscripts.push({
                videoId: m.videoId,
                title: m.videoTitle || "Video senza titolo",
                channel: m.videoChannel || "Canale sconosciuto",
                transcriptLen: m.transcript.length,
                createdAt: m.time || Date.now(),
              });
            }
          }
        });
      });
      if (localTranscripts.length > 0) setTranscripts((prev) => (prev.length ? prev : localTranscripts.slice(0, 6)));
      // documenti analizzati: da localStorage chat (immagini/file) + stima
      const docCount = localTranscripts.length;
      setDocuments((prev) => (prev.length ? prev : localTranscripts.slice(0, 5).map((t: any) => ({ ...t, type: "Trascrizione" }))));
    };

    const applyLocal = () => apply(localChats, localMsgs);

    if (!token) {
      applyLocal();
      return;
    }

    // merge server chats
    fetch("/api/chats", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((serverChats: any) => {
        if (cancelled) return;
        if (!Array.isArray(serverChats) || serverChats.length === 0) {
          applyLocal();
          return;
        }
        const chats: any[] = [];
        const msgsMap: Record<string, any> = {};
        const seen = new Set<string>();
        localChats.forEach((c: any) => {
          const id = String(c.id);
          if (!id) return;
          seen.add(id);
          chats.push(c);
          msgsMap[id] = Array.isArray(localMsgs[id]) ? localMsgs[id] : [];
        });
        serverChats.forEach((c: any) => {
          const id = String(c.chatId ?? c.chat_id ?? c.id ?? "");
          if (!id || seen.has(id)) return;
          seen.add(id);
          chats.push({
            id,
            title: c.title || "Nuova Conversazione",
            createdAt: c.createdAt ?? c.created_at ?? Date.now(),
            videoId: c.videoId ?? c.video_id ?? null,
          });
          msgsMap[id] = Array.isArray(c.messages) ? c.messages : [];
        });
        apply(chats, msgsMap);
      })
      .catch(applyLocal);

    // trascrizioni dal server
    fetch("/api/transcripts", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((list: any[]) => {
        if (cancelled || !Array.isArray(list)) return;
        const mapped = list.slice(0, 6).map((t: any) => ({
          videoId: t.video_id || t.videoId,
          title: t.title || "Video",
          channel: t.channel || "Canale",
          transcriptLen: Array.isArray(t.transcript) ? t.transcript.length : 0,
          createdAt: t.created_at || t.createdAt,
          isGenerated: !!t.is_generated,
          thumbnail: t.thumbnail,
        }));
        if (mapped.length) setTranscripts(mapped);
        // documenti: usa le trascrizioni come proxy documenti analizzati
        if (mapped.length) setDocuments(mapped.slice(0, 5).map((m: any) => ({ ...m, type: "Trascrizione YouTube" })));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [sessionRestored]);

  useEffect(() => {
    document.title = "Dashboard | Resumari";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'Panoramica della tua attività su Resumari');
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearSession();
    router.push("/");
  };

  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "?";

  const displayName = user?.name || user?.email?.split("@")[0] || "Utente";

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/chat", icon: MessageSquare, label: "Chat" },
    { href: "/videos", icon: Video, label: "Trascrizioni" },
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  ];

  // stat cards senza counter messaggi
  const statsCards = [
    {
      key: "conversations",
      icon: MessageSquare,
      value: data?.totalChats ?? 0,
      label: "Conversazioni",
      sub: data?.streak ? `${data.streak} giorni consecutivi` : "Inizia a chattare",
      gradient: "from-purple-100 to-purple-200",
      color: "text-purple-600",
    },
    {
      key: "videos",
      icon: Video,
      value: data?.videoCount ?? 0,
      label: "Video Analizzati",
      sub: transcripts.length ? `${transcripts.length} trascrizioni` : "Nessuna trascrizione",
      gradient: "from-green-100 to-green-200",
      color: "text-green-600",
    },
    {
      key: "transcripts",
      icon: FileText,
      value: transcripts.length ?? 0,
      label: "Trascrizioni Salvate",
      sub: data?.busiestDay?.count ? `Picco: ${data.busiestDay.label}` : "Archivio vuoto",
      gradient: "from-amber-100 to-amber-200",
      color: "text-amber-600",
    },
    {
      key: "documents",
      icon: Layers,
      value: documents.length ?? 0,
      label: "Documenti Analizzati",
      sub: documents.length ? "PDF / TXT / YouTube" : "Carica un documento",
      gradient: "from-blue-100 to-blue-200",
      color: "text-blue-600",
    },
  ];

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 overflow-hidden">
      <AnimatePresence mode="wait">
        {isLeftSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-gray-100 dark:border-zinc-800 flex flex-col bg-gray-50/50 dark:bg-zinc-900/50 shrink-0"
          >
            <div className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest px-2">
                  Menu
                </span>
                <button
                  onClick={() => setIsLeftSidebarOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-all"
                  title="Chiudi sidebar"
                >
                  <PanelLeftClose size={16} />
                </button>
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm shadow-sm transition-all ${
                      isActive
                        ? "bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-300"
                        : "bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={isActive ? "text-purple-600 dark:text-purple-400" : "text-gray-500 dark:text-zinc-400"}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="mt-auto p-4 border-t border-gray-100 dark:border-zinc-800" ref={accountMenuRef}>
              <div className="relative">
                <button
                  onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 hover:border-purple-200 dark:hover:border-purple-800 hover:bg-purple-50/30 dark:hover:bg-purple-950/30 transition-all group"
                >
                  {user?.picture ? (
                    <Image
                      src={user.picture}
                      alt=""
                      width={36}
                      height={36}
                      unoptimized
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-linear-to-br from-purple-600 to-red-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                      {userInitial}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate">{displayName}</p>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 truncate">{user?.email}</p>
                  </div>
                  <ChevronDown size={16} className={`text-gray-400 dark:text-zinc-500 shrink-0 transition-transform ${isAccountMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {isAccountMenuOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-lg overflow-hidden z-50">
                    <Link
                      href="/settings"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <Settings size={16} className="text-gray-500 dark:text-zinc-400" />
                      Impostazioni
                    </Link>
                    <Link
                      href="/#pricing"
                      onClick={() => setIsAccountMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <CreditCard size={16} className="text-gray-500 dark:text-zinc-400" />
                      Pricing
                    </Link>
                    <button
                      onClick={() => { handleLogout(); setIsAccountMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                    >
                      <LogOut size={16} />
                      Esci
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {!isLeftSidebarOpen && (
        <button
          onClick={() => setIsLeftSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all"
        >
          <PanelLeftClose size={18} className="text-gray-500" />
        </button>
      )}

      <main className="flex-1 overflow-auto">
        <header className="h-16 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between px-6 min-[1920px]:px-10 min-[2560px]:px-12">
          <div>
            <h1 className="text-xl min-[1920px]:text-2xl font-black text-gray-900 dark:text-zinc-100">
              Dashboard
            </h1>
            <p className="text-xs min-[1920px]:text-sm text-gray-500 dark:text-zinc-500">
              Panoramica ultrawide della tua attività su Resumari
            </p>
          </div>
          <Link
            href="/chat"
            className="px-5 py-2.5 bg-linear-to-r from-purple-600 to-red-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-purple-200 dark:shadow-purple-900/30"
          >
            Nuova Chat
          </Link>
        </header>

        <div className="p-6 min-[1920px]:p-8 min-[2560px]:p-10 space-y-6 min-[1920px]:space-y-8 max-w-[1600px] min-[1920px]:max-w-[1680px] min-[2560px]:max-w-[1920px] mx-auto w-full">
          {data && (
            <>
              {/* Stat cards - ultrawide 4 col più respiro */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 min-[1920px]:gap-6">
                {statsCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <motion.div
                      key={card.key}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white dark:bg-zinc-900 rounded-2xl min-[1920px]:rounded-3xl p-5 min-[1920px]:p-6 border border-gray-100 dark:border-zinc-800 shadow-lg shadow-gray-100/50 dark:shadow-none hover:shadow-xl hover:shadow-purple-500/5 transition-all"
                    >
                      <div
                        className={`w-11 h-11 min-[1920px]:w-12 min-[1920px]:h-12 rounded-xl bg-linear-to-br ${card.gradient} dark:from-purple-900/40 dark:to-purple-900/10 flex items-center justify-center mb-3`}
                      >
                        <Icon size={22} className={`${card.color} dark:text-purple-300`} />
                      </div>
                      <p className="text-2xl min-[1920px]:text-3xl font-black text-gray-900 dark:text-zinc-100">
                        {card.value}
                      </p>
                      <p className="text-xs font-bold text-gray-900 dark:text-zinc-200 mt-0.5">
                        {card.label}
                      </p>
                      <p className="text-[11px] font-medium text-gray-400 dark:text-zinc-500 mt-1">
                        {card.sub}
                      </p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Grafico attività + Insight chat */}
              <div className="grid grid-cols-1 lg:grid-cols-3 min-[1920px]:grid-cols-5 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="lg:col-span-2 min-[1920px]:col-span-3 bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800 shadow-lg shadow-gray-100/50 dark:shadow-none"
                >
                  <h3 className="text-base font-black text-gray-900 dark:text-zinc-100 mb-5 flex items-center gap-2">
                    <BarChart3 size={18} className="text-purple-600" />
                    Attività ultimi 7 giorni
                    <span className="ml-auto text-[11px] font-bold text-gray-400 flex items-center gap-1">
                      <TrendingUp size={12} /> {data.activeDays} giorni attivi
                    </span>
                  </h3>
                  {data.hasActivity ? (
                    <div className="flex items-end gap-2 min-[1920px]:gap-3 h-44 min-[1920px]:h-52">
                      {data.activity.map((day: any) => {
                        const height =
                          day.count > 0
                            ? Math.max((day.count / data.maxCount) * 100, 10)
                            : 4;
                        return (
                          <div
                            key={day.date}
                            className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                          >
                            <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400">
                              {day.count}
                            </span>
                            <div
                              className="w-full rounded-lg transition-all duration-500 hover:opacity-90"
                              style={{
                                height: `${height}%`,
                                background:
                                  day.count > 0
                                    ? "linear-gradient(180deg,#7c3aed 0%,#a78bfa 100%)"
                                    : "#e5e7eb",
                                opacity: day.count > 0 ? 1 : 0.6,
                              }}
                            />
                            <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase">
                              {day.label}
                            </span>
                            <span className="text-[9px] text-gray-300 dark:text-zinc-600">{day.day}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-44 flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500">
                      <BarChart3 size={32} className="mb-2 opacity-50" />
                      <p className="text-sm font-medium">Nessuna attività nei ultimi 7 giorni</p>
                      <Link href="/chat" className="text-xs text-purple-600 hover:underline font-bold mt-1">
                        Inizia una conversazione
                      </Link>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 text-xs text-gray-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1.5"><Flame size={14} className="text-orange-500" /> Streak: <strong className="text-gray-900 dark:text-zinc-100">{data.streak} giorni</strong></span>
                    <span className="flex items-center gap-1.5"><CalendarDays size={14} className="text-purple-500" /> Picco: <strong className="text-gray-900 dark:text-zinc-100">{data.busiestDay.label} ({data.busiestDay.count})</strong></span>
                    <span className="hidden min-[1920px]:inline-flex items-center gap-1.5"><Clock size={14} /> Media giornaliera: <strong className="text-gray-900 dark:text-zinc-100">{data.avgPerDay}</strong></span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="lg:col-span-1 min-[1920px]:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800 shadow-lg shadow-gray-100/50 dark:shadow-none flex flex-col"
                >
                  <h3 className="text-base font-black text-gray-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                    <Sparkles size={18} className="text-purple-600 dark:text-purple-400" />
                    Insight Chat
                  </h3>
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900">
                      <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                        <MessageSquare size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-500 dark:text-zinc-400">Conversazione più lunga</p>
                        <p className="text-sm font-black text-gray-900 dark:text-zinc-100 truncate">{data.longestChat?.title || "—"}</p>
                      </div>
                      <span className="text-xs font-black text-purple-700 dark:text-purple-300">{data.longestChatSize} msg</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="px-3 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-800">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Conversazioni</p>
                        <p className="text-xl font-black text-gray-900 dark:text-zinc-100">{data.totalChats}</p>
                        <p className="text-[11px] text-gray-500">totale create</p>
                      </div>
                      <div className="px-3 py-3 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-800">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Giorni attivi</p>
                        <p className="text-xl font-black text-gray-900 dark:text-zinc-100">{data.activeDays}</p>
                        <p className="text-[11px] text-gray-500">su 7 giorni</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-bold text-gray-600 dark:text-zinc-300 flex items-center gap-1.5">
                        <FileSearch size={14} className="text-gray-400" /> Distribuzione attività
                      </p>
                      <div className="flex gap-1.5">
                        {data.activity.map((d: any) => (
                          <div key={d.date} className="flex-1 h-2 rounded-full" style={{ background: d.count > 0 ? `rgba(124,58,237,${0.3 + (d.count / Math.max(data.maxCount,1))*0.7})` : "#f3f4f6" }} title={`${d.label}: ${d.count}`} />
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-400">Intensità giornaliera · più scuro = più attività</p>
                    </div>
                  </div>
                  <Link href="/chat" className="mt-4 inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold hover:opacity-90 transition-opacity">
                    Apri Chat <ArrowUpRight size={14} />
                  </Link>
                </motion.div>
              </div>

              {/* Trascrizioni recenti + Documenti + Conversazioni recenti */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800 shadow-lg shadow-gray-100/50 dark:shadow-none"
                >
                  <h3 className="text-sm font-black text-gray-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                    <PlayCircle size={16} className="text-red-500" />
                    Trascrizioni Recenti
                    <Link href="/videos" className="ml-auto text-[11px] font-bold text-purple-600 hover:underline">Vedi tutte</Link>
                  </h3>
                  {transcripts.length > 0 ? (
                    <div className="space-y-2.5">
                      {transcripts.slice(0,5).map((t: any) => (
                        <Link key={t.videoId} href="/videos" className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/60 border border-transparent hover:border-gray-100 dark:hover:border-zinc-700 transition-all group">
                          <div className="w-14 h-10 rounded-lg bg-gray-100 dark:bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                            {t.thumbnail ? (
                              <img src={t.thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Video size={14} className="text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900 dark:text-zinc-100 truncate group-hover:text-purple-600">{t.title}</p>
                            <p className="text-[11px] text-gray-400 truncate">{t.channel} · {t.transcriptLen} segmenti</p>
                          </div>
                          <ArrowUpRight size={14} className="text-gray-300 group-hover:text-purple-500 shrink-0" />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-400">
                      <FileText size={28} className="mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-medium">Nessuna trascrizione recente</p>
                      <Link href="/chat" className="text-xs text-purple-600 font-bold hover:underline">Trascrivi un video</Link>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800 shadow-lg shadow-gray-100/50 dark:shadow-none"
                >
                  <h3 className="text-sm font-black text-gray-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                    <Layers size={16} className="text-blue-600" />
                    Documenti Analizzati
                  </h3>
                  {documents.length > 0 ? (
                    <div className="space-y-2.5">
                      {documents.slice(0,5).map((d: any, i: number) => (
                        <div key={`${d.videoId}-${i}`} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-700">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                            <FileText size={14} className="text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900 dark:text-zinc-100 truncate">{d.title}</p>
                            <p className="text-[11px] text-gray-400 truncate">{d.type || "Documento"} · {d.transcriptLen || d.transcript?.length || 0} blocchi</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-400">
                      <Layers size={28} className="mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-medium">Nessun documento</p>
                      <p className="text-[11px]">Carica PDF/TXT dalla chat</p>
                    </div>
                  )}
                  <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Totale documenti</span>
                    <span className="text-sm font-black text-blue-700 dark:text-blue-300">{documents.length}</span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800 shadow-lg shadow-gray-100/50 dark:shadow-none"
                >
                  <h3 className="text-sm font-black text-gray-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                    <MessageSquare size={16} className="text-purple-600" />
                    Conversazioni Recenti
                  </h3>
                  {data.recentChats.length > 0 ? (
                    <div className="space-y-1.5">
                      {data.recentChats.map((chat: any) => (
                        <Link
                          key={chat.id}
                          href="/chat"
                          className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/60 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-zinc-700"
                        >
                          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center shrink-0">
                            <MessageSquare size={14} className="text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900 dark:text-zinc-100 truncate">
                              {chat.title}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                              {new Date(chat.createdAt).toLocaleDateString("it-IT", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-zinc-500">
                      <MessageSquare size={28} className="mb-2 opacity-50" />
                      <p className="text-xs font-medium">Nessuna conversazione recente</p>
                      <Link href="/chat" className="text-xs text-purple-600 hover:underline font-bold mt-1">
                        Inizia ora
                      </Link>
                    </div>
                  )}
                </motion.div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
