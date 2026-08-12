"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "./ToastProvider";
import {
  Send,
  Sparkles,
  X,
  ExternalLink,
  Square,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
} from "lucide-react";

const DEMO_MESSAGE_LIMIT = 10;

interface Channel {
  name: string;
  id: string;
  desc: string;
}

interface ChannelData {
  channelId: string;
  channelTitle?: string;
  channelDescription?: string;
  channelThumbnail?: string;
}

interface Message {
  id: number;
  text: string;
  sender: "user" | "system";
  time: string;
  cancelled?: boolean;
  videoId?: string | null;
  transcript?: TranscriptLine[];
}

interface TranscriptLine {
  time: number;
  text: string;
  isKeyPoint: boolean;
}

const channels: Channel[] = [
  { name: "Andrew Huberman", id: "UC2D2CMWXMOVWx7giW1n3LIg", desc: "Neuroscienze e salute" },
  { name: "Hamza Ahmed", id: "UCWsslCoN3b_wBaFVWK_ye_A", desc: "Self improvement" },
  { name: "Dan Zakaria", id: "UCX3R4xuKXIhoaxj44HGmhlw", desc: "Crescita personale e business" },
  { name: "Y Combinator", id: "UCcefcZRL2oaA_uBNeo5UOWg", desc: "Startup e innovazione" },
];

const premiumChannels: Channel[] = [
  { name: "Lex Fridman", id: "UC7_YxT-KIDQl7z3Gk3bH4xw", desc: "Podcast e AI" },
  { name: "Fireship", id: "UCsBjURrPoezykLs9EqgamOA", desc: "Programmazione e tech" },
  { name: "freeCodeCamp", id: "UC8butISFwT-Wl7EV0hUK0BQ", desc: "Imparare a programmare" },
  { name: "Veritasium", id: "UCvqRdlKsE5Q8mf8kxA1Q7wA", desc: "Scienza e curiosità" },
  { name: "Jeff Su", id: "UCJ0-OtVpF0wOKEqT2Z1Zt_A", desc: "Produttività e carriera" },
];

const FALLBACK_SUGGESTIONS = [
  "Cosa rende unico questo canale?",
  "Quali sono i video più importanti?",
  "Che stile di comunicazione usa?",
  "Quali argomenti tratta principalmente?",
  "Consigliami da dove iniziare",
];

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function formatTimestampLinks(text: string, videoId?: string | null): string {
  if (!videoId || !text) return text;
  const timestampRegex = /(\d{1,2}:\d{2}(?::\d{2})?)/g;
  return text.replace(timestampRegex, (match) => {
    const seconds = parseTimeToSeconds(match);
    return `<button type="button" class="timestamp-link inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-700 font-mono font-bold text-[11px] hover:bg-red-100 transition-colors cursor-pointer" data-seconds="${seconds}" data-videoid="${videoId}" title="Vai a ${match}"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" class="text-red-500 shrink-0"><path d="m7 4 12 8-12 8V4z"/></svg>${match}</button>`;
  });
}

function formatYouTubeLinks(text: string): string {
  if (!text) return text;
  const urlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11}))/g;
  return text.replace(urlRegex, (match, url, videoId) => {
    return `<button type="button" class="video-link inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[11px] hover:bg-purple-100 transition-colors cursor-pointer" data-videoid="${videoId}"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="shrink-0"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/></svg>Guarda il video</button>`;
  });
}

function cleanResponse(text: string): string {
  return text
    .replace(/\n/g, "<br/>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/^\s*[-]\s+(.+)$/gm, "<li class='ml-3 list-disc'>$1</li>")
    .replace(/^\s*(\d+)\.\s+(.+)$/gm, "<li class='ml-3 list-decimal'>$2</li>")
    .replace(/((?:<li[^>]*>.*<\/li>\s*)+)/g, "<ul class='my-1.5 space-y-0.5'>$1</ul>");
}

function YoutubeEmbed({ videoId, startTime, onClose }: { videoId: string; startTime?: number | null; onClose: () => void }) {
  const src = startTime
    ? `https://www.youtube.com/embed/${videoId}?start=${startTime}&autoplay=1`
    : `https://www.youtube.com/embed/${videoId}?autoplay=1`;

  return (
    <div className="relative bg-black rounded-2xl overflow-hidden shadow-xl">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all"
      >
        <X size={13} />
      </button>
      <div className="relative aspect-video">
        <iframe
          src={src}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

export default function DemoSection() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [channelData, setChannelData] = useState<Record<string, ChannelData>>({});
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const [videoStartTime, setVideoStartTime] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [messageQueue, setMessageQueue] = useState<{ text: string; context: string }[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [likedMessages, setLikedMessages] = useState<Set<number>>(new Set());
  const [dislikedMessages, setDislikedMessages] = useState<Set<number>>(new Set());
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const addToast = useToast();

  const fetchSuggestions = useCallback(async (channelName?: string) => {
    try {
      const res = await fetch("/api/ai/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "demo",
          channelTitle: channelName || "",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiSuggestions(data.suggestions || FALLBACK_SUGGESTIONS);
      } else {
        setAiSuggestions(FALLBACK_SUGGESTIONS);
      }
    } catch {
      setAiSuggestions(FALLBACK_SUGGESTIONS);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchChannels = useCallback((token: string | null) => {
    setIsLoggedIn(!!token);

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    fetch("/api/channels", { headers })
      .then((r) => r.json())
      .then((list: ChannelData[]) => {
        const map: Record<string, ChannelData> = {};
        list.forEach((ch) => {
          map[ch.channelId] = ch;
        });
        setChannelData(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchChannels(localStorage.getItem("token"));
  }, [fetchChannels]);

  useEffect(() => {
    function handleAuthChange(e: CustomEvent) {
      if (e.detail) {
        fetchChannels(e.detail.token);
      } else {
        fetchChannels(null);
      }
    }
    window.addEventListener("resumari-auth-changed", handleAuthChange as EventListener);
    return () => window.removeEventListener("resumari-auth-changed", handleAuthChange as EventListener);
  }, [fetchChannels]);

  useEffect(() => {
    if (messageQueue.length > 0 && !isProcessingQueue) {
      processQueueItem(messageQueue[0]);
    }
  }, [messageQueue, isProcessingQueue]);

  const processQueueItem = async (item: { text: string; context: string }) => {
    setIsProcessingQueue(true);
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/ai/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: item.text,
          context: item.context,
          videoId: currentVideo || undefined,
        }),
        signal: controller.signal,
      });

      const data = await response.json();
      if (response.ok) {
        let raw = data.response || data.message || "";
        raw = formatYouTubeLinks(raw);
        raw = formatTimestampLinks(raw, currentVideo);
        raw = cleanResponse(raw);
        addMessage(raw, "system", { videoId: currentVideo });
      } else {
        addMessage("❌ " + (data.message || "Errore durante l'elaborazione."), "system");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1 && m.sender === "user" ? { ...m, cancelled: true } : m,
          ),
        );
      } else {
        addMessage("❌ Errore di rete. Assicurati che il server sia in esecuzione.", "system");
      }
    } finally {
      setIsProcessingQueue(false);
      setLoading(false);
      abortControllerRef.current = null;
      setMessageQueue((prev) => prev.slice(1));
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest(".timestamp-link") as HTMLElement | null;
      if (btn) {
        const seconds = parseInt(btn.dataset.seconds || "0", 10);
        const vid = btn.dataset.videoid;
        if (vid) {
          setCurrentVideo(vid);
          setVideoStartTime(seconds);
        }
        return;
      }
      const videoBtn = (e.target as HTMLElement).closest(".video-link") as HTMLElement | null;
      if (videoBtn) {
        const vid = videoBtn.dataset.videoid;
        if (vid) {
          setCurrentVideo(vid);
          setVideoStartTime(null);
        }
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const userMsgCount = messages.filter((m) => m.sender === "user").length;

  const addMessage = (text: string, sender: "user" | "system", extra: Partial<Message> = {}) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), text, sender, time: new Date().toISOString(), ...extra },
    ]);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    if (userMsgCount >= DEMO_MESSAGE_LIMIT) {
      setShowLimitPopup(true);
      return;
    }

    setInput("");

    const ch = selectedChannel ? channelData[selectedChannel.id] : null;
    const context = ch
      ? `Stai chattando con il canale YouTube "${ch.channelTitle}". Descrizione: "${(ch.channelDescription || "").slice(0, 1000)}". Rispondi SEMPRE in italiano come se fossi il canale stesso. Parla del tuo stile, dei tuoi video più popolari, degli argomenti che tratti. Includi link ai video YouTube (formato: https://youtube.com/watch?v=VIDEOID) quando parli di un video specifico e timestamp (formato minuti:secondi) per i momenti chiave.`
      : "Fornisci una risposta chiara e concisa in italiano.";

    addMessage(text, "user");
    setMessageQueue((prev) => [...prev, { text, context }]);
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setMessageQueue([]);
    setIsProcessingQueue(false);
    setLoading(false);
    setMessages((prev) =>
      prev.map((m, i) =>
        i === prev.length - 1 && m.sender === "user" ? { ...m, cancelled: true } : m,
      ),
    );
  };

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent || "";
  };

  const handleCopy = async (text: string) => {
    const clean = stripHtml(text);
    try {
      await navigator.clipboard.writeText(clean);
      addToast?.("Testo copiato", "success");
    } catch {
      addToast?.("Errore durante la copia", "error");
    }
  };

  const handleLike = (msgId: number) => {
    const wasLiked = likedMessages.has(msgId);
    setLikedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
    setDislikedMessages((prev) => {
      const next = new Set(prev);
      next.delete(msgId);
      return next;
    });
    addToast?.(wasLiked ? "Mi piace rimosso" : "Mi piace", "success");
  };

  const handleDislike = (msgId: number) => {
    const wasDisliked = dislikedMessages.has(msgId);
    setDislikedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
    setLikedMessages((prev) => {
      const next = new Set(prev);
      next.delete(msgId);
      return next;
    });
    addToast?.(wasDisliked ? "Non mi piace rimosso" : "Non mi piace", "error");
  };

  const handleRetry = (msg: Message) => {
    const msgIdx = messages.findIndex((m) => m.id === msg.id);
    if (msgIdx <= 0) return;
    for (let i = msgIdx - 1; i >= 0; i--) {
      if (messages[i].sender === "user") {
        setInput(messages[i].text);
        inputRef.current?.focus();
        return;
      }
    }
  };

  const handleChannelClick = async (channel: Channel) => {
    if (selectedChannel?.id === channel.id) return;
    setSelectedChannel(channel);
    setMessages([]);
    setCurrentVideo(null);
    setVideoStartTime(null);

    const ch = channelData[channel.id];
    if (ch?.channelDescription) {
      const intro = `👋 Ciao! Sono **${ch.channelTitle}**.${ch.channelDescription ? `\n\n${ch.channelDescription.slice(0, 800)}` : ""}\n\nFammi qualsiasi domanda sui miei contenuti, video o argomenti!`;
      addMessage(cleanResponse(intro), "system");
    } else {
      addMessage(cleanResponse(`👋 Ciao! Sono **${channel.name}**. Chiedimi tutto sui miei video e contenuti!`), "system");
    }

    fetchSuggestions(channel.name);
    inputRef.current?.focus();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  return (
    <section className="w-full px-4 md:px-6 py-12 md:py-16 bg-gradient-to-b from-white via-purple-50/20 to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950 relative overflow-hidden" id="demo">
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-1 bg-gradient-to-r from-purple-600 to-red-500 rounded-full mb-4 mx-auto" />
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} />
            Prova Gratuita
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-gray-100 mt-4 mb-2 tracking-tight">
            Chat con un canale YouTube
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base max-w-xl mx-auto">
            Scegli un canale educativo e chatta con i suoi contenuti via AI.
            {userMsgCount > 0 && ` (${userMsgCount}/${DEMO_MESSAGE_LIMIT})`}
          </p>
        </div>

        <div className="flex gap-4 items-start">
          <div className="flex-1 min-w-0">
            <div className={`bg-white dark:bg-zinc-900 rounded-2xl border shadow-xl overflow-hidden transition-all duration-500 ${selectedChannel ? "border-purple-200 dark:border-purple-800 shadow-purple-500/15 shadow-2xl" : "border-gray-200 dark:border-zinc-800 shadow-purple-500/5"}`}>
              <div className="flex h-[520px] max-h-[75vh] relative">
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.aside
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 230, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="hidden md:flex flex-col shrink-0 border-r border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/60 overflow-hidden relative"
                    >
                      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-purple-400/30 via-purple-600/40 to-red-400/30 pointer-events-none" />
                      <div className="p-3 border-b border-gray-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                            Canali
                          </span>
                          <button
                            onClick={() => setSidebarOpen(false)}
                            className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                        {channels.map((ch) => {
                          const cd = channelData[ch.id];
                          return (
                            <button
                              key={ch.id}
                              onClick={() => handleChannelClick(ch)}
                              className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all duration-200 ${
                                selectedChannel?.id === ch.id
                                  ? "bg-white dark:bg-zinc-800 shadow-sm border border-purple-200 dark:border-purple-700"
                                  : "hover:bg-white dark:hover:bg-zinc-800 hover:shadow-sm border border-transparent"
                              }`}
                            >
                              {cd?.channelThumbnail ? (
                                <img
                                  src={cd.channelThumbnail}
                                  alt={ch.name}
                                  className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-red-500 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
                                  {ch.name[0]}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
                                  {ch.name}
                                </p>
                                <p className="text-[10px] text-gray-400 truncate leading-tight">
                                  {ch.desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                        {isLoggedIn && premiumChannels.length > 0 && (
                          <>
                            <div className="pt-2 pb-1 px-1">
                              <div className="h-px bg-gradient-to-r from-purple-400/20 via-purple-600/30 to-red-400/20" />
                              <p className="text-[9px] font-bold text-purple-600 uppercase tracking-wider mt-2 mb-1 px-1">
                                Premium
                              </p>
                            </div>
                            {premiumChannels.map((ch) => {
                              const cd = channelData[ch.id];
                              return (
                                <button
                                  key={ch.id}
                                  onClick={() => handleChannelClick(ch)}
                                  className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all duration-200 ${
                                    selectedChannel?.id === ch.id
                                      ? "bg-white dark:bg-zinc-800 shadow-sm border border-purple-200 dark:border-purple-700"
                                      : "hover:bg-white dark:hover:bg-zinc-800 hover:shadow-sm border border-transparent"
                                  }`}
                                >
                                  {cd?.channelThumbnail ? (
                                    <img
                                      src={cd.channelThumbnail}
                                      alt={ch.name}
                                      className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-red-500 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm ring-2 ring-purple-200/50">
                                      {ch.name[0]}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
                                      {ch.name}
                                    </p>
                                    <p className="text-[10px] text-gray-400 truncate leading-tight">
                                      {ch.desc}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </>
                        )}
                      </div>
                      {!isLoggedIn && (
                        <div className="p-3 border-t border-gray-100">
                          <Link
                            href="/login?mode=signup"
                            className="block w-full py-2 text-center text-[10px] font-bold text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          >
                            Sblocca tutti i canali →
                          </Link>
                        </div>
                      )}
                    </motion.aside>
                  )}
                </AnimatePresence>

                <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-900">
                  {!sidebarOpen && (
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 border-b border-gray-100">
                      <button
                        onClick={() => setSidebarOpen(true)}
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z" /></svg>
                        Canali
                      </button>
                      {selectedChannel && (
                        <span className="text-[11px] text-gray-400 font-medium">
                          / {selectedChannel.name}
                        </span>
                      )}
                    </div>
                  )}

                  {messages.length === 0 && !selectedChannel ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-red-500 flex items-center justify-center mb-3 shadow-lg shadow-purple-500/20">
                        <Sparkles size={24} className="text-white" />
                      </div>
                      <h3 className="text-base font-black text-gray-900 dark:text-gray-100 mb-1">
                        Scegli un canale
                      </h3>
                      <p               className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
                        Seleziona un canale dalla sidebar per iniziare a chattare con i suoi contenuti.
                      </p>
                      <div className="flex flex-wrap justify-center gap-1.5 max-w-lg">
                        {(aiSuggestions.length > 0 ? aiSuggestions : FALLBACK_SUGGESTIONS).slice(0, 4).map((s) => (
                          <button
                            key={s}
                            onClick={() => handleSuggestionClick(s)}
                            className="px-2.5 py-1.5 bg-gray-50 dark:bg-zinc-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-700 dark:hover:text-purple-400 border border-gray-100 dark:border-zinc-700 hover:border-purple-200 dark:hover:border-purple-700 rounded-xl text-[11px] font-semibold text-gray-600 dark:text-gray-300 transition-all"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col overflow-hidden relative">
                      {selectedChannel && channelData[selectedChannel.id]?.channelThumbnail && (
                        <div className="px-4 py-2.5 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-950/60 flex items-center gap-3 shrink-0">
                          <img
                            src={channelData[selectedChannel.id].channelThumbnail}
                            alt=""
                            className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
                              {channelData[selectedChannel.id]?.channelTitle || selectedChannel.name}
                            </p>
                          </div>
                          <a
                            href={`https://youtube.com/channel/${selectedChannel.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-all"
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      )}

                      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
                        {messages.map((msg) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-2.5 max-w-3xl ${msg.sender === "user" ? "flex-row-reverse ml-auto" : "flex-row"}`}
                          >
                            {msg.sender === "system" && !msg.cancelled && (
                              <div className="w-6 h-6 shrink-0 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-md mt-0.5">
                                <Sparkles size={10} className="text-white" />
                              </div>
                            )}
                            <div className="flex flex-col gap-1 max-w-[88%]">
                              <div
                                className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                                  msg.sender === "user"
                                    ? msg.cancelled
                                      ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-br-sm border border-red-100 dark:border-red-900"
                                      : "bg-gray-900 dark:bg-purple-600 text-white rounded-br-sm"
                                    : msg.cancelled
                                      ? "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-bl-sm border border-orange-100 dark:border-orange-900"
                                      : "bg-purple-50 dark:bg-purple-950/50 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-purple-100 dark:border-purple-900"
                                }`}
                              >
                                {msg.sender === "user" ? (
                                  <div>
                                    {msg.text}
                                    {msg.cancelled && (
                                      <div className="text-[10px] text-red-400 font-medium mt-1.5 pt-1.5 border-t border-red-200/50 flex items-center gap-1">
                                        <Square size={8} className="fill-current shrink-0" />
                                        Messaggio annullato
                                      </div>
                                    )}
                                  </div>
                                ) : msg.cancelled ? (
                                  <div className="flex items-center gap-1.5">
                                    <Square size={10} className="fill-current shrink-0" />
                                    <span className="font-medium">Messaggio annullato</span>
                                  </div>
                                ) : (
                                  <div dangerouslySetInnerHTML={{ __html: msg.text }} />
                                )}
                              </div>
                              {msg.sender === "system" && !msg.cancelled && msg.text && (
                                <div className="flex items-center gap-0.5 ml-0.5">
                                  <button
                                    onClick={() => handleCopy(msg.text)}
                                    className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                                    title="Copia"
                                  >
                                    <Copy size={11} />
                                  </button>
                                  <button
                                    onClick={() => handleLike(msg.id)}
                                    className={`p-1 rounded-md transition-all ${likedMessages.has(msg.id) ? "text-blue-500 bg-blue-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                                    title="Mi piace"
                                  >
                                    <ThumbsUp size={11} />
                                  </button>
                                  <button
                                    onClick={() => handleDislike(msg.id)}
                                    className={`p-1 rounded-md transition-all ${dislikedMessages.has(msg.id) ? "text-red-500 bg-red-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
                                    title="Non mi piace"
                                  >
                                    <ThumbsDown size={11} />
                                  </button>
                                  <button
                                    onClick={() => handleRetry(msg)}
                                    className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                                    title="Riprova"
                                  >
                                    <RefreshCw size={11} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}

                        {loading && (
                          <div className="flex gap-2.5 max-w-3xl">
                            <div className="w-6 h-6 shrink-0 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-md">
                              <Sparkles size={10} className="text-white" />
                            </div>
                            <div className="bg-purple-50 px-3.5 py-2.5 rounded-2xl rounded-bl-sm border border-purple-100 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" />
                            </div>
                          </div>
                        )}

                        <div ref={messagesEndRef} />
                      </div>
                    </div>
                  )}

                  <div className="p-4 pt-3 border-t border-gray-100 dark:border-zinc-800">
                    {userMsgCount > 0 && userMsgCount < DEMO_MESSAGE_LIMIT && messages.length > 0 && (
                      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                        {(aiSuggestions.length > 0 ? aiSuggestions : FALLBACK_SUGGESTIONS).map((s) => (
                          <button
                            key={s}
                            onClick={() => handleSuggestionClick(s)}
                            className="shrink-0 px-2.5 py-1.5 bg-gray-50 dark:bg-zinc-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-700 dark:hover:text-purple-400 border border-gray-100 dark:border-zinc-700 hover:border-purple-200 dark:hover:border-purple-700 rounded-xl text-[11px] font-semibold text-gray-600 dark:text-gray-300 transition-all whitespace-nowrap"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="relative group">
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                        placeholder={
                          userMsgCount >= DEMO_MESSAGE_LIMIT
                            ? "Limite raggiunto — registrati per continuare"
                            : "Chiedi qualcosa sul canale..."
                        }
                        disabled={userMsgCount >= DEMO_MESSAGE_LIMIT}
                        className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl pl-4 pr-12 py-2.5 text-xs font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-200 dark:focus:border-purple-700 transition-all disabled:opacity-50"
                      />
                      <button
                        onClick={loading ? handleCancel : handleSend}
                        disabled={!input.trim() || userMsgCount >= DEMO_MESSAGE_LIMIT}
                        className={`absolute right-1.5 top-1.5 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                          input.trim() && userMsgCount < DEMO_MESSAGE_LIMIT
                            ? loading
                              ? "bg-red-500 text-white shadow-lg animate-pulse"
                              : "bg-gray-900 text-white hover:scale-105 active:scale-95 shadow-lg"
                            : "bg-gray-200 text-gray-400"
                        }`}
                      >
                        {loading ? <Square size={11} className="fill-current" /> : <Send size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden xl:block w-80 shrink-0">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-xl shadow-purple-500/5 overflow-hidden">
              <div className="p-3 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Video in riproduzione
                </span>
              </div>
              <div className="p-3">
                {currentVideo ? (
                  <YoutubeEmbed
                    videoId={currentVideo}
                    startTime={videoStartTime}
                    onClose={() => { setCurrentVideo(null); setVideoStartTime(null); }}
                  />
                ) : (
                  <div className="aspect-video rounded-2xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 flex flex-col items-center justify-center text-center p-6">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="text-gray-300 mb-2">
                      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z" />
                    </svg>
                    <p className="text-[11px] font-semibold text-gray-400">
                      Nessun video selezionato
                    </p>
                    <p className="text-[9px] text-gray-300 mt-1">
                      Clicca timestamp o link nei messaggi AI
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-16 flex flex-col items-center text-center"
        >
          <Link
            href="/signup"
            className="group relative px-1 py-1 rounded-4xl bg-linear-to-r from-purple-600 to-red-600 transition-all hover:scale-[1.02] shadow-lg shadow-purple-500/25 cursor-pointer"
          >
            <span className="block px-8 py-3 bg-white text-gray-900 text-sm font-bold rounded-[1.8rem] transition-colors group-hover:bg-gray-50">
              Inizia a Usare Resumari
            </span>
          </Link>
          <p className="mt-6 text-gray-500 font-bold text-xs tracking-tight">
            Nessuna carta di credito richiesta. Iscriviti gratis.
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {showLimitPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowLimitPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-red-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-purple-500/20">
                <Sparkles size={26} className="text-white" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-2">
                Limite di prova raggiunto
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                Hai utilizzato tutti i {DEMO_MESSAGE_LIMIT} messaggi gratuiti.
                Registrati per continuare a usare Resumari senza limiti.
              </p>
              <div className="space-y-3">
                <Link
                  href="/signup"
                  className="block w-full py-3 bg-gradient-to-r from-purple-600 to-red-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/25 transition-all"
                >
                  Registrati gratuitamente
                </Link>
                <button
                  onClick={() => setShowLimitPopup(false)}
                  className="block w-full py-3 text-sm font-bold text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
                >
                  Più tardi
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
