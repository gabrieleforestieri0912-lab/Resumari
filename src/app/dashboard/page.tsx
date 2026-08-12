/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { clearSession } from "@/lib/session";
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
} from "lucide-react";

function groupByDate(msgsMap: Record<string, any>) {
  const days: Record<string, number> = {};
  Object.values(msgsMap).forEach((chatMsgs: any) => {
    chatMsgs.forEach((msg: any) => {
      const d = msg.time ? new Date(msg.time) : new Date();
      const key = d.toISOString().split("T")[0];
      days[key] = (days[key] || 0) + 1;
    });
  });
  return days;
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

export default function Dashboard() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));

    const storedChats = localStorage.getItem("resumari_chats");
    const storedMsgs = localStorage.getItem("resumari_chat_messages");

    const chats = storedChats ? JSON.parse(storedChats) : [];
    const msgsMap = storedMsgs ? JSON.parse(storedMsgs) : {};

    let totalMessages = 0;
    let videoCount = 0;

    Object.values(msgsMap).forEach((chatMsgs: any) => {
      chatMsgs.forEach((msg: any) => {
        totalMessages++;
        if (msg.videoId) videoCount++;
      });
    });

    const dayCounts = groupByDate(msgsMap);
    const last7Days = getLast7Days();
    const activity = last7Days.map((d) => ({
      ...d,
      count: dayCounts[d.date] || 0,
    }));

    const maxCount = Math.max(...activity.map((d) => d.count), 1);

    const totalDays = Object.keys(dayCounts).length;
    const avgPerDay = totalDays > 0 ? (totalMessages / totalDays).toFixed(1) : 0;
    const avgPerChat = chats.length > 0 ? (totalMessages / chats.length).toFixed(1) : 0;

    setData({
      totalChats: chats.length,
      totalMessages,
      videoCount,
      documents: 0,
      activity,
      maxCount,
      avgPerDay,
      avgPerChat,
      recentChats: chats.slice(0, 8),
      hasActivity: totalMessages > 0,
    });
  }, []);

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

  const statsCards = [
    {
      key: "conversations",
      icon: MessageSquare,
      value: data?.totalChats ?? 0,
      label: "Conversazioni",
      gradient: "from-purple-100 to-purple-200",
      color: "text-purple-600",
    },
    {
      key: "messages",
      icon: BarChart3,
      value: data?.totalMessages ?? 0,
      label: "Messaggi Totali",
      gradient: "from-amber-100 to-amber-200",
      color: "text-amber-600",
    },
    {
      key: "videos",
      icon: Video,
      value: data?.videoCount ?? 0,
      label: "Video Analizzati",
      gradient: "from-green-100 to-green-200",
      color: "text-green-600",
    },
    {
      key: "avg",
      icon: TrendingUp,
      value: data?.avgPerChat ?? 0,
      label: "Media msg / chat",
      gradient: "from-blue-100 to-blue-200",
      color: "text-blue-600",
    },
  ];

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <AnimatePresence mode="wait">
        {isLeftSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-gray-100 flex flex-col bg-gray-50/50"
          >
            <div className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">
                  Menu
                </span>
                <button
                  onClick={() => setIsLeftSidebarOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-all"
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
                        ? "bg-purple-50 border border-purple-200 text-purple-700"
                        : "bg-white border border-gray-200 text-gray-700 hover:border-purple-300 hover:bg-purple-50"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={isActive ? "text-purple-600" : "text-gray-500"}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="mt-auto p-4 border-t border-gray-100">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all group">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-linear-to-br from-purple-600 to-red-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                    {userInitial}
                  </div>
                )}
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                  <p className="text-[10px] font-bold text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all mt-2"
              >
                <LogOut size={16} />
                <span className="font-bold text-sm">Esci</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {!isLeftSidebarOpen && (
        <button
          onClick={() => setIsLeftSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-all"
        >
          <PanelLeftClose size={18} className="text-gray-500" />
        </button>
      )}

      <main className="flex-1 overflow-auto scale-95 origin-top">
        <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-gray-100 flex items-center justify-between px-8">
          <div>
            <h1 className="text-xl font-black text-gray-900">
              Dashboard
            </h1>
            <p className="text-xs text-gray-500">
              Panoramica della tua attività su Resumari
            </p>
          </div>
          <Link
            href="/chat"
            className="px-5 py-2.5 bg-linear-to-r from-purple-600 to-red-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-purple-200"
          >
            Nuova Chat
          </Link>
        </header>

        <div className="p-8 space-y-8">
          {data && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {statsCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <motion.div
                      key={card.key}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-lg shadow-gray-100/50 hover:shadow-xl hover:shadow-purple-500/5 transition-all"
                    >
                      <div
                        className={`w-11 h-11 rounded-xl bg-linear-to-br ${card.gradient} flex items-center justify-center mb-3`}
                      >
                        <Icon size={22} className={card.color} />
                      </div>
                      <p className="text-2xl font-black text-gray-900">
                        {card.value}
                      </p>
                      <p className="text-xs font-medium text-gray-500 mt-0.5">
                        {card.label}
                      </p>
                    </motion.div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-6 border border-gray-100 shadow-lg shadow-gray-100/50"
                >
                  <h3 className="text-base font-black text-gray-900 mb-5 flex items-center gap-2">
                    <BarChart3 size={18} className="text-purple-600" />
                    Attivit&agrave; ultimi 7 giorni
                  </h3>
                  {data.hasActivity ? (
                    <div className="flex items-end gap-2 h-40">
                      {data.activity.map((day: any, i: number) => {
                        const height =
                          day.count > 0
                            ? Math.max((day.count / data.maxCount) * 100, 8)
                            : 4;
                        return (
                          <div
                            key={day.date}
                            className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                          >
                            <span className="text-[10px] font-bold text-gray-400">
                              {day.count}
                            </span>
                            <div
                              className="w-full rounded-md transition-all duration-500"
                              style={{
                                height: `${height}%`,
                                backgroundColor:
                                  day.count > 0 ? "#7c3aed" : "#e5e7eb",
                                opacity: day.count > 0 ? 0.8 : 0.5,
                              }}
                            />
                            <span className="text-[9px] font-medium text-gray-400 uppercase">
                              {day.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-40 flex flex-col items-center justify-center text-gray-400">
                      <BarChart3 size={32} className="mb-2 opacity-50" />
                      <p className="text-sm font-medium">
                        Nessuna attivit&agrave; nei ultimi 7 giorni
                      </p>
                      <Link
                        href="/chat"
                        className="text-xs text-purple-600 hover:underline font-bold mt-1"
                      >
                        Inizia una conversazione
                      </Link>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                    <span>
                      Media giornaliera:{" "}
                      <strong className="text-gray-900">{data.avgPerDay}</strong>
                    </span>
                    <span>
                      Media per chat:{" "}
                      <strong className="text-gray-900">{data.avgPerChat}</strong>
                    </span>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-6 border border-gray-100 shadow-lg shadow-gray-100/50"
                >
                  <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
                    <Sparkles size={18} className="text-purple-600" />
                    Riepilogo Rapido
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        label: "Totale conversazioni",
                        value: data.totalChats,
                        icon: MessageSquare,
                        color: "text-purple-600",
                        bg: "bg-purple-100",
                      },
                      {
                        label: "Messaggi scambiati",
                        value: data.totalMessages,
                        icon: BarChart3,
                        color: "text-amber-600",
                        bg: "bg-amber-100",
                      },
                      {
                        label: "Video analizzati",
                        value: data.videoCount,
                        icon: Video,
                        color: "text-green-600",
                        bg: "bg-green-100",
                      },
                      {
                        label: "Giorni con attivit&agrave;",
                        value: Object.keys(
                          data.activity.reduce((acc: Record<string, boolean>, d: any) => {
                            if (d.count > 0) acc[d.date] = true;
                            return acc;
                          }, {}),
                        ).length,
                        icon: TrendingUp,
                        color: "text-blue-600",
                        bg: "bg-blue-100",
                      },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.label}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50"
                        >
                          <div
                            className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}
                          >
                            <Icon size={15} className={item.color} />
                          </div>
                          <span className="flex-1 text-sm font-medium text-gray-600">
                            {item.label}
                          </span>
                          <span className="text-sm font-black text-gray-900">
                            {item.value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-lg shadow-gray-100/50"
              >
                <h3 className="text-base font-black text-gray-900 mb-4 flex items-center gap-2">
                  <MessageSquare size={18} className="text-purple-600" />
                  Conversazioni Recenti
                </h3>
                {data.recentChats.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {data.recentChats.map((chat: any) => (
                      <Link
                        key={chat.id}
                        href="/chat"
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                      >
                        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                          <MessageSquare size={14} className="text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {chat.title}
                          </p>
                          <p className="text-xs text-gray-400">
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
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <MessageSquare size={32} className="mb-2 opacity-50" />
                    <p className="text-sm font-medium">
                      Nessuna conversazione recente
                    </p>
                    <Link
                      href="/chat"
                      className="text-xs text-purple-600 hover:underline font-bold mt-1"
                    >
                      Inizia ora
                    </Link>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
