"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "./ToastProvider";
import { AUTH_STATE_EVENT_NAME, type AuthStateDetail } from "@/lib/auth-sync";
import { extractYouTubeVideoId } from "@/lib/youtube-ids";
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
  // Match [MM:SS Title] or [HH:MM:SS Title] (bracketed with optional title)
  const bracketedRegex = /\[(\d{1,2}:\d{2}(?::\d{2})?)([^\]]*?)\]/g;
  let result = text.replace(bracketedRegex, (_, time, labelRaw) => {
    const seconds = parseTimeToSeconds(time);
    const label = labelRaw.trim();
    return `<button type="button" class="timestamp-link inline-flex items-center gap-1.5 px-2 py-1 my-0.5 rounded-lg bg-red-50 border border-red-200 text-red-700 font-bold text-xs hover:bg-red-100 transition-colors cursor-pointer align-middle" data-seconds="${seconds}" data-videoid="${videoId}" title="Vai a ${time}${label ? ' — ' + label : ''}"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" class="text-red-500 shrink-0"><path d="m7 4 12 8-12 8V4z"/></svg><span class="font-mono">${time}</span>${label ? `<span class="text-red-600 font-semibold">${label}</span>` : ''}</button>`;
  });
  // Fallback: plain MM:SS not already inside a bracket or button
  const plainRegex = /(?<!\[)(\d{1,2}:\d{2}(?::\d{2})?)(?!\]|[^<]*>)/g;
  result = result.replace(plainRegex, (match) => {
    const seconds = parseTimeToSeconds(match);
    return `<button type="button" class="timestamp-link inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-700 font-mono font-bold text-xs hover:bg-red-100 transition-colors cursor-pointer" data-seconds="${seconds}" data-videoid="${videoId}" title="Vai a ${match}"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" class="text-red-500 shrink-0"><path d="m7 4 12 8-12 8V4z"/></svg>${match}</button>`;
  });
  return result;
}

function formatYouTubeLinks(text: string): string {
  if (!text) return text;
  const urlRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11}))/g;
  return text.replace(urlRegex, (match, url, videoId) => {
    return `<button type="button" class="video-link inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-700 font-bold text-xs hover:bg-purple-100 transition-colors cursor-pointer" data-videoid="${videoId}"><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" class="shrink-0"><path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/></svg>Guarda il video</button>`;
  });
}

function inlineFormatting(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

const HEADING_TAGS: Record<number, string> = { 1: "h2", 2: "h3", 3: "h4" };
const HEADING_CLASSES: Record<number, string> = {
  1: "text-xl md:text-2xl font-black text-gray-900 dark:text-gray-100 mt-4 mb-2.5 leading-tight",
  2: "text-lg md:text-xl font-black text-gray-900 dark:text-gray-100 mt-4 mb-2 leading-snug",
  3: "text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 mt-3 mb-1.5 leading-snug",
};

/**
 * Converte il markdown semplice dell'AI in HTML strutturato: titoli di varie
 * grandezze (#, ##, ###), paragrafi separati, elenchi puntati/numerati,
 * grassetto e italic. I bottoni timestamp/YouTube iniettati prima passano
 * invariati (nessun asterisco nei loro attributi).
 */
function cleanResponse(text: string): string {
  const html: string[] = [];

  const flushParagraph = (lines: string[]) => {
    if (lines.length === 0) return;
    html.push(
      `<p class='mb-3 leading-relaxed text-gray-800 dark:text-gray-200'>${inlineFormatting(lines.join("<br/>"))}</p>`,
    );
  };

  for (const rawBlock of text.split(/\n{2,}/)) {
    const lines = rawBlock.split("\n");
    let para: string[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) {
        i++;
        continue;
      }
      // Titoli markdown: # / ## / ###
      const hMatch = line.match(/^(#{1,3})\s+(.+)$/);
      if (hMatch) {
        flushParagraph(para);
        para = [];
        const level = hMatch[1].length;
        html.push(
          `<${HEADING_TAGS[level]} class='${HEADING_CLASSES[level]}'>${inlineFormatting(hMatch[2].trim())}</${HEADING_TAGS[level]}>`,
        );
        i++;
        continue;
      }
      // Elenchi: raggruppa le righe consecutive dello stesso tipo
      const ordered = /^\s*\d+\.\s+/.test(line);
      const unordered = /^\s*[-*]\s+/.test(line);
      if (ordered || unordered) {
        flushParagraph(para);
        para = [];
        const items: string[] = [];
        while (i < lines.length) {
          const li = lines[i].trim();
          const liOrdered = /^\s*\d+\.\s+/.test(li);
          const liUnordered = /^\s*[-*]\s+/.test(li);
          if ((ordered && !liOrdered) || (!ordered && !liUnordered)) break;
          items.push(
            `<li class='ml-3 ${ordered ? "list-decimal" : "list-disc"} text-gray-800 dark:text-gray-200 leading-relaxed'>${inlineFormatting(li.replace(/^\s*(?:[-*]|\d+\.)\s+/, ""))}</li>`,
          );
          i++;
        }
        html.push(
          `<${ordered ? "ol" : "ul"} class='my-2 space-y-1'>${items.join("")}</${ordered ? "ol" : "ul"}>`,
        );
        continue;
      }
      para.push(line);
      i++;
    }
    flushParagraph(para);
    para = [];
  }

  return html.join("");
}

function YoutubeEmbed({ videoId, startTime }: { videoId: string; startTime?: number | null; onClose?: () => void }) {
  const src = startTime
    ? `https://www.youtube.com/embed/${videoId}?start=${startTime}&autoplay=1`
    : `https://www.youtube.com/embed/${videoId}?autoplay=1`;

  return (
    <div className="relative bg-black rounded-2xl overflow-hidden shadow-xl">
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

const DEMO_EXAMPLE_VIDEO = "DHjqpvDnNGE";
// Messaggio di benvenuto reale: niente riassunti inventati. La demo parte con
// il video di esempio già nel player e invita a incollare un link o a
// scegliere un canale: le analisi vere arrivano dall'AI via /api/ai/demo.
const DEMO_EXAMPLE_MESSAGES: Message[] = [
  {
    id: 1,
    text: `Ciao! Sono <strong>Resumari</strong>, il tuo assistente AI per YouTube.<br/><br/><strong>Cosa puoi provare qui:</strong><br/>- Incolla il link di un video per riassumerlo e fargli domande<br/>- Scegli un canale dalla lista e chatta con i suoi contenuti<br/>- Clicca un timestamp nei miei messaggi per saltare al momento nel video`,
    sender: "system",
    time: new Date().toISOString(),
    videoId: null,
  },
];

export default function DemoSection() {
  const [messages, setMessages] = useState<Message[]>(DEMO_EXAMPLE_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [channelData, setChannelData] = useState<Record<string, ChannelData>>({});
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [currentVideo, setCurrentVideo] = useState<string | null>(DEMO_EXAMPLE_VIDEO);
  const [videoStartTime, setVideoStartTime] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [messageQueue, setMessageQueue] = useState<{ text: string; context: string; videoId?: string | null }[]>([]);
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

  const stickToBottomRef = useRef(true);
  const BOTTOM_THRESHOLD_PX = 80;

  const isNearBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD_PX;
  };

  const onMessagesWheel = (e: { deltaY: number }) => {
    if (e.deltaY < 0) stickToBottomRef.current = false;
  };

  const onMessagesTouchMove = () => {
    if (!isNearBottom()) stickToBottomRef.current = false;
  };

  const handleMessagesScroll = () => {
    stickToBottomRef.current = isNearBottom();
  };

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    // Solo la lista messaggi: scrollIntoView sposterebbe tutta la sezione demo.
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: loading ? "auto" : "smooth",
    });
  }, [messages, loading]);

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
    function handleAuthChange(e: Event) {
      const detail = (e as CustomEvent<AuthStateDetail | null>).detail;
      if (detail) {
        fetchChannels(detail.token ?? localStorage.getItem("token"));
      } else {
        fetchChannels(null);
      }
    }
    window.addEventListener(AUTH_STATE_EVENT_NAME, handleAuthChange);
    return () => window.removeEventListener(AUTH_STATE_EVENT_NAME, handleAuthChange);
  }, [fetchChannels]);

  const addMessage = useCallback((text: string, sender: "user" | "system", extra: Partial<Message> = {}) => {
    setMessages((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), text, sender, time: new Date().toISOString(), ...extra },
    ]);
  }, []);

  const processQueueItem = useCallback(async (item: { text: string; context: string; videoId?: string | null }) => {
    setIsProcessingQueue(true);
    setLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    let startedTyping = false;
    // Il video incollato nel messaggio ha priorità su quello già in riproduzione.
    const activeVideoId = item.videoId || currentVideo || undefined;

    try {
      const response = await fetch("/api/ai/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: item.text,
          context: item.context,
          videoId: activeVideoId,
        }),
        signal: controller.signal,
      });

      const data = await response.json();
      // Il backend conferma il video analizzato: lo si mostra nel player.
      if (data.videoId) {
        setCurrentVideo(data.videoId);
        setVideoStartTime(null);
      }
      if (response.ok) {
        let raw = data.response || data.message || "";
        raw = formatYouTubeLinks(raw);
        raw = formatTimestampLinks(raw, data.videoId || activeVideoId || null);
        raw = cleanResponse(raw);
        const fullText = String(raw).replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "");
        const msgId = Date.now() + Math.random();
        const now = new Date().toISOString();
        setMessages((prev) => [...prev, { id: msgId, text: "", sender: "system" as const, time: now, videoId: data.videoId || activeVideoId || null }]);
        startedTyping = true;
        setLoading(false);
        const words = fullText.match(/\S+\s*/g) || [fullText];
        let i = 0;
        const speed = 40;
        const typeInterval = setInterval(() => {
          if (i < words.length) {
            const partial = words.slice(0, i + 1).join("");
            setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, text: partial } : m)));
            i++;
          } else {
            clearInterval(typeInterval);
            setIsProcessingQueue(false);
            setLoading(false);
            abortControllerRef.current = null;
            setMessageQueue((prev) => prev.slice(1));
          }
        }, speed);
      } else {
        addMessage((data.message || "Errore durante l'elaborazione."), "system");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === prev.length - 1 && m.sender === "user" ? { ...m, cancelled: true } : m,
          ),
        );
      } else {
        addMessage("Errore di rete. Assicurati che il server sia in esecuzione.", "system");
      }
    } finally {
      if (!startedTyping) {
        setIsProcessingQueue(false);
        setLoading(false);
        abortControllerRef.current = null;
        setMessageQueue((prev) => prev.slice(1));
      }
    }
  }, [currentVideo, addMessage]);

  useEffect(() => {
    if (messageQueue.length > 0 && !isProcessingQueue) {
      processQueueItem(messageQueue[0]);
    }
  }, [messageQueue, isProcessingQueue, processQueueItem]);

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

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    if (userMsgCount >= DEMO_MESSAGE_LIMIT) {
      setShowLimitPopup(true);
      return;
    }

    setInput("");

    // Se l'utente incolla un link YouTube, il video va in riproduzione e il
    // suo ID viene passato al backend, che ne scarica trascrizione/dettagli:
    // senza questo l'AI non aveva alcun contenuto da analizzare.
    const pastedVideoId = extractYouTubeVideoId(text);
    if (pastedVideoId) {
      setCurrentVideo(pastedVideoId);
      setVideoStartTime(null);
    }

    const ch = selectedChannel ? channelData[selectedChannel.id] : null;
    const context = ch
      ? `Stai chattando con il canale YouTube "${ch.channelTitle}". Descrizione: "${(ch.channelDescription || "").slice(0, 1000)}". Rispondi SEMPRE in italiano come se fossi il canale stesso. Parla del tuo stile, dei tuoi video più popolari, degli argomenti che tratti. Includi link ai video YouTube (formato: https://youtube.com/watch?v=VIDEOID) quando parli di un video specifico e timestamp (formato minuti:secondi) per i momenti chiave.`
      : "Fornisci una risposta chiara e concisa in italiano.";

    stickToBottomRef.current = true;
    addMessage(text, "user", pastedVideoId ? { videoId: pastedVideoId } : {});
    setMessageQueue((prev) => [...prev, { text, context, videoId: pastedVideoId }]);
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

    fetchSuggestions(channel.name);
    inputRef.current?.focus({ preventScroll: true });
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <section className="w-full px-4 md:px-6 min-[1920px]:px-10 min-[2560px]:px-16 py-12 md:py-16 min-[1920px]:py-20 relative" id="demo">
      <div className="max-w-[1100px] lg:max-w-[1200px] xl:max-w-[1480px] min-[1920px]:max-w-[1680px] min-[2560px]:max-w-[1920px] mx-auto relative">
        <div className="text-center mb-8 min-[1920px]:mb-10">
          <div className="w-16 h-1 bg-gradient-to-r from-purple-600 to-red-500 rounded-full mb-4 mx-auto" />
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} />
            Prova Gratuita
          </span>
          <h2 className="text-3xl md:text-4xl min-[1920px]:text-5xl font-black text-gray-900 dark:text-gray-100 mt-4 mb-2 tracking-tight">
            Chat con un canale YouTube
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm md:text-base min-[1920px]:text-lg max-w-xl min-[1920px]:max-w-2xl mx-auto">
            Scegli un canale educativo e chatta con i suoi contenuti via AI.
          </p>
        </div>

        <div className="flex gap-4 min-[1920px]:gap-6 min-[2560px]:gap-8 items-start">
          <div className="flex-1 min-w-0 relative">
            <div className="absolute -top-3.5 left-4 md:left-6 z-20 bg-gradient-to-r from-purple-600 to-red-600 text-white text-[11px] font-black tracking-wider uppercase px-4 py-1 shadow-lg shadow-purple-500/25 rounded-full -rotate-6 pointer-events-none select-none">
              Prova la demo
            </div>
            <div className={`bg-white dark:bg-zinc-900 rounded-2xl min-[1920px]:rounded-3xl border shadow-xl overflow-hidden transition-all duration-500 ${selectedChannel ? "border-purple-200 dark:border-purple-800 shadow-purple-500/15 shadow-2xl" : "border-gray-200 dark:border-zinc-800 shadow-purple-500/5"}`}>
              <div className="flex h-[550px] md:h-[620px] lg:h-[640px] xl:h-[660px] min-[1920px]:h-[680px] min-[2560px]:h-[740px] max-h-[78vh] min-[1920px]:max-h-[720px] relative">
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.aside
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 200, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="hidden md:flex flex-col shrink-0 border-r border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/60 overflow-hidden relative md:!w-[200px] lg:!w-[220px] xl:!w-[240px] min-[1920px]:!w-[260px]"
                    >
                      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-purple-400/30 via-purple-600/40 to-red-400/30 pointer-events-none" />
                      <div className="p-2 border-b border-gray-100 dark:border-zinc-800">
                        <div className="flex items-center">
                          <span className="text-[10px] font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                            Canali
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                        {channels.map((ch) => {
                          const cd = channelData[ch.id];
                          return (
                            <button
                              key={ch.id}
                              onClick={() => handleChannelClick(ch)}
                              className={`w-full flex items-center gap-2 p-2 rounded-xl text-left transition-all duration-200 ${
                                selectedChannel?.id === ch.id
                                  ? "bg-white dark:bg-zinc-800 shadow-sm border border-purple-200 dark:border-purple-700"
                                  : "hover:bg-white dark:hover:bg-zinc-800 hover:shadow-sm border border-transparent"
                              }`}
                            >
                              {cd?.channelThumbnail ? (
                                <Image
                                  src={cd.channelThumbnail}
                                  alt={ch.name}
                                  width={32}
                                  height={32}
                                  unoptimized
                                  className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex items-center justify-center text-gray-500 dark:text-zinc-400 text-xs font-bold shrink-0">
                                  {ch.name[0]}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-[12px] font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
                                  {ch.name}
                                </p>
                                <p className="text-[10px] font-semibold text-gray-600 dark:text-zinc-300 truncate leading-tight">
                                  {ch.desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                        {premiumChannels.length > 0 && (
                          <>
                            {premiumChannels.map((ch) => {
                              const cd = channelData[ch.id];
                              return (
                                <button
                                  key={ch.id}
                                  onClick={() => handleChannelClick(ch)}
                                  className={`w-full flex items-center gap-2 p-2 rounded-xl text-left transition-all duration-200 ${
                                    selectedChannel?.id === ch.id
                                      ? "bg-white dark:bg-zinc-800 shadow-sm border border-purple-200 dark:border-purple-700"
                                      : "hover:bg-white dark:hover:bg-zinc-800 hover:shadow-sm border border-transparent"
                                  }`}
                                >
                                  {cd?.channelThumbnail ? (
                                    <Image
                                      src={cd.channelThumbnail}
                                      alt={ch.name}
                                      width={32}
                                      height={32}
                                      unoptimized
                                      className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-white shadow-sm"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex items-center justify-center text-gray-500 dark:text-zinc-400 text-xs font-bold shrink-0">
                                      {ch.name[0]}
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-[12px] font-bold text-gray-900 dark:text-gray-100 truncate leading-tight">
                                      {ch.name}
                                    </p>
                                    <p className="text-[10px] font-semibold text-gray-600 dark:text-zinc-300 truncate leading-tight">
                                      {ch.desc}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </motion.aside>
                  )}
                </AnimatePresence>

                <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-zinc-900 w-full max-w-full">
                  {messages.length === 0 && !selectedChannel ? (
                    <div className="flex-1" />
                  ) : (
                    <div className="flex-1 flex flex-col overflow-hidden relative">
                      {selectedChannel && channelData[selectedChannel.id]?.channelThumbnail && (
                        <div className="px-4 py-2.5 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/30 dark:bg-zinc-950/60 flex items-center gap-3 shrink-0">
                          <Image
                            src={channelData[selectedChannel.id].channelThumbnail!}
                            alt=""
                            width={36}
                            height={36}
                            unoptimized
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
                            className="shrink-0 p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      )}

                      <div
                        ref={messagesContainerRef}
                        onScroll={handleMessagesScroll}
                        onWheel={onMessagesWheel}
                        onTouchMove={onMessagesTouchMove}
                        className="flex-1 overflow-y-auto p-4 space-y-3 relative"
                      >
                        {messages.map((msg) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-2.5 max-w-3xl ${msg.sender === "user" ? "flex-row-reverse ml-auto" : "flex-row"}`}
                          >
                            {msg.sender === "system" && !msg.cancelled && (
                              <Image
                                src="/resumari.png"
                                alt="Resumari"
                                width={24}
                                height={24}
                                className="w-6 h-6 shrink-0 rounded-full object-cover bg-transparent mt-0.5"
                                style={{ background: "transparent" }}
                              />
                            )}
                            <div className="flex flex-col gap-1.5 max-w-[90%]">
                              <div
                                className={`px-4 py-3 rounded-2xl text-sm md:text-[15px] leading-relaxed ${
                                  msg.sender === "user"
                                    ? msg.cancelled
                                      ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-br-sm border border-red-100 dark:border-red-900"
                                      : "bg-gray-900 dark:bg-purple-600 text-white rounded-br-sm"
                                    : msg.cancelled
                                      ? "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-bl-sm border border-orange-100 dark:border-orange-900"
                                      : "bg-gray-50/50 dark:bg-zinc-950/60 text-gray-800 dark:text-gray-200 rounded-bl-sm border border-gray-100 dark:border-zinc-800"
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
                                    className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
                                    title="Copia"
                                  >
                                    <Copy size={11} />
                                  </button>
                                  <button
                                    onClick={() => handleLike(msg.id)}
                                    className={`p-1 rounded-md transition-all ${likedMessages.has(msg.id) ? "text-blue-500 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-zinc-700"}`}
                                    title="Mi piace"
                                  >
                                    <ThumbsUp size={11} />
                                  </button>
                                  <button
                                    onClick={() => handleDislike(msg.id)}
                                    className={`p-1 rounded-md transition-all ${dislikedMessages.has(msg.id) ? "text-red-500 bg-red-50 dark:bg-red-950/40 dark:text-red-400" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-zinc-700"}`}
                                    title="Non mi piace"
                                  >
                                    <ThumbsDown size={11} />
                                  </button>
                                  <button
                                    onClick={() => handleRetry(msg)}
                                    className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
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
                            <Image
                              src="/resumari.png"
                              alt="Resumari"
                              width={24}
                              height={24}
                              className="w-6 h-6 shrink-0 rounded-full object-cover bg-transparent"
                              style={{ background: "transparent" }}
                            />
                            <div className="bg-gray-50/50 dark:bg-zinc-950/60 px-3.5 py-2.5 rounded-2xl rounded-bl-sm border border-gray-100 dark:border-zinc-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="p-4 border-t border-gray-100 dark:border-zinc-800">
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
                            : "Chiedi qualcosa o incolla un link video YouTube..."
                        }
                        disabled={userMsgCount >= DEMO_MESSAGE_LIMIT}
                        className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl pl-5 pr-14 py-3.5 text-sm font-medium text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/15 focus:border-purple-300 dark:focus:border-purple-700 transition-all disabled:opacity-50"
                      />
                      <button
                        onClick={loading ? handleCancel : handleSend}
                        disabled={!input.trim() || userMsgCount >= DEMO_MESSAGE_LIMIT}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                          input.trim() && userMsgCount < DEMO_MESSAGE_LIMIT
                            ? loading
                              ? "bg-red-500 text-white shadow-lg animate-pulse"
                              : "bg-gray-900 text-white hover:scale-105 active:scale-95 shadow-lg"
                            : "bg-gray-200 text-gray-400"
                        }`}
                      >
                        {loading ? <Square size={13} className="fill-current" /> : <Send size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden 2xl:block w-[520px] min-[1920px]:w-[600px] min-[2560px]:w-[680px] shrink-0 self-start">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-xl shadow-purple-500/5 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Video in riproduzione
                </span>
              </div>
              <div className="p-4">
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
            <span className="block px-8 py-3 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white text-sm font-bold rounded-[1.8rem] transition-colors group-hover:bg-gray-50 dark:group-hover:bg-zinc-900">
              Inizia a Usare Resumari
            </span>
          </Link>
          <p className="mt-4 text-gray-400 font-bold text-xs tracking-tight">
            Accesso istantaneo
          </p>
          <p className="mt-2 text-gray-500 font-bold text-xs tracking-tight">
            10 messaggi gratuiti nella chat
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
              <Image
                src="/resumari.png"
                alt="Resumari"
                width={56}
                height={56}
                className="w-14 h-14 rounded-2xl object-cover mx-auto mb-5 shadow-lg shadow-purple-500/20"
              />
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
                  className="block w-full py-3 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all"
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
