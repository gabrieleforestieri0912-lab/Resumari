/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @next/next/no-html-link-for-pages */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/components/LanguageContext";
import { useToast } from "@/components/ToastProvider";
import { clearSession } from "@/lib/session";
import ConfirmDialog from "@/components/ConfirmDialog";
import ChatSidebar from "@/components/chat/ChatSidebar";
import MediaPanel from "@/components/chat/MediaPanel";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import {
  Send,
  Trash2,
  Upload,
  MessageSquare,
  Sparkles,
  Bot,
  ChevronRight,
  Plus,
  History,
  Settings,
  LogOut,
  Clock,
  MoreVertical,
  Search,
  FileText,
  Check,
  X,
  ChevronDown,
  Home,
  FileAudio,
  Wand2,
  PanelLeftClose,
  LayoutDashboard,
  Video,
  Square,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Pencil,
  RotateCw,
  Download,
  Image as ImageIcon,
} from "lucide-react";

const Youtube = ({ size = 24, className = "", ...props }: { size?: number; className?: string; [key: string]: any }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

const CHATS_STORAGE_KEY = "resumari_chats";
const MESSAGES_STORAGE_KEY = "resumari_chat_messages";

function formatTimestamp(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatChatDate(timestamp: string | number) {
  if (timestamp == null || isNaN(new Date(timestamp).getTime())) return "—";
  const d = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Oggi";
  if (diffDays === 1) return "Ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} settimane fa`;
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

const DEFAULT_CHATS: any[] = [];

function parseTimeToSeconds(timeStr: string) {
  const parts = timeStr.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

function FormatTimestampLinks({ text, videoId }: { text: string; videoId?: string }) {
  if (!videoId || !text) return <>{text}</>;

  const timestampRegex = /(\d{1,2}:\d{2}(?::\d{2})?)/g;
  const parts = text.split(timestampRegex);

  return (
    <>
      {parts.map((part, i) => {
        if (timestampRegex.test(part)) {
          const seconds = parseTimeToSeconds(part);
          return (
            <button
              key={i}
              type="button"
              data-seconds={seconds}
              title={`Vai a ${part}`}
              className="timestamp-link bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded-md font-mono font-bold hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-red-500 dark:text-red-400 shrink-0"><path d="m7 4 12 8-12 8V4z" /></svg>
              {part}
            </button>
          );
        }
        return part;
      })}
    </>
  );
}

function groupTranscriptByInterval(lines: any[], intervalSeconds = 30) {
  if (!lines || lines.length === 0) return [];
  const buckets: any[] = [];
  lines.forEach((line) => {
    const time = line.time || line.offset / 1000 || 0;
    const bucketIdx = Math.floor(time / intervalSeconds);
    if (!buckets[bucketIdx]) {
      buckets[bucketIdx] = { start: bucketIdx * intervalSeconds, words: [] };
    }
    buckets[bucketIdx].words.push(line.text);
  });
  return buckets.filter(Boolean);
}

export default function Chat() {
  const { locale, t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState(DEFAULT_CHATS);
  const [chatMessagesMap, setChatMessagesMap] = useState<Record<string, any>>({});
  const [activeChatId, setActiveChatId] = useState<any>(null);
  const [copiedIdx, setCopiedIdx] = useState<any>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [currentFileContext, setCurrentFileContext] = useState("");
  const [currentVideoId, setCurrentVideoId] = useState<any>(null);
  const [currentVideoStartTime, setCurrentVideoStartTime] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const [currentAIMessageIndex, setCurrentAIMessageIndex] = useState<any>(null);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  const [videoUrl, setVideoUrl] = useState("");
  const [videoInputMode, setVideoInputMode] = useState("video");
  const [videoInputError, setVideoInputError] = useState("");
  const [videoInputLoading, setVideoInputLoading] = useState(false);
  const [videoInputInfo, setVideoInputInfo] = useState<any>(null);
  const [hasStartedChat, setHasStartedChat] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [messageQueue, setMessageQueue] = useState<any[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [likedMessages, setLikedMessages] = useState<Set<any>>(new Set());
  const [dislikedMessages, setDislikedMessages] = useState<Set<any>>(new Set());
  const [editingMessageId, setEditingMessageId] = useState<any>(null);
  const addToast: any = useToast();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      router.push("/login");
      return;
    }

    try {
      setUser(JSON.parse(storedUser));
    } catch (e) {
      console.error("Error parsing user", e);
    }

    const loadFromServer = async () => {
      try {
        const res = await fetch("/api/chats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          loadFromLocalStorage();
          return;
        }
        const serverChats: any[] = await res.json();
        
        if (!Array.isArray(serverChats) || serverChats.length === 0) {
          loadFromLocalStorage();
          return;
        }

        const active: any[] = [];
        const msgMap: Record<string, any> = {};
        for (const c of serverChats) {
          const chatObj = {
            id: c.chatId,
            title: c.title,
            createdAt: c.createdAt,
          };
          msgMap[c.chatId] = c.messages || [];
          active.push(chatObj);
        }
        if (active.length > 0) {
          setChats(active);
          setActiveChatId(active[0].id);
          localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(active));

          const firstChatMsgs = msgMap[active[0].id] || [];
          const videoMsg = firstChatMsgs.find((m: any) => m.videoId);
          if (videoMsg?.videoId) {
            setCurrentVideoId(videoMsg.videoId);
            setCurrentVideoStartTime(0);
          }
        }
        setChatMessagesMap(msgMap);
        localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(msgMap));
        setInitialLoadComplete(true);
      } catch {
        loadFromLocalStorage();
      }
    };

    const loadFromLocalStorage = () => {
      const localChats = localStorage.getItem(CHATS_STORAGE_KEY);
      if (localChats) {
        try {
          const parsed = JSON.parse(localChats);
          if (parsed.length > 0) {
            setChats(parsed);
            setActiveChatId(parsed[0].id);
            const localMsgs = localStorage.getItem(MESSAGES_STORAGE_KEY);
            if (localMsgs) {
              const msgMap = JSON.parse(localMsgs);
              setChatMessagesMap(msgMap);
              const firstChatMsgs = msgMap[parsed[0].id] || [];
              const videoMsg = firstChatMsgs.find((m: any) => m.videoId);
              if (videoMsg?.videoId) {
                setCurrentVideoId(videoMsg.videoId);
                setCurrentVideoStartTime(0);
              }
            }
          }
        } catch { /* ignore parse errors */ }
      }
      setInitialLoadComplete(true);
    };

    loadFromServer();
  }, []);

  const navigate =
    typeof window !== "undefined" ? window.location.pathname : "";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "?";

  const displayName = user?.name || user?.email?.split("@")[0] || "Utente";

  const handleLogout = () => {
    clearSession();
    localStorage.removeItem(CHATS_STORAGE_KEY);
    localStorage.removeItem(MESSAGES_STORAGE_KEY);
    router.push("/");
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 100;
    setShouldAutoScroll(isAtBottom);
  };

  const scrollToBottom = () => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    if (!initialLoadComplete) return;
    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
  }, [chats, initialLoadComplete]);

  useEffect(() => {
    if (!initialLoadComplete) return;
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(chatMessagesMap));
  }, [chatMessagesMap, initialLoadComplete]);

  useEffect(() => {
    const handleTimestampClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("timestamp-link")) {
        const seconds = parseInt(target.dataset.seconds || "0", 10);
        if (!isNaN(seconds)) {
          setCurrentVideoStartTime(seconds);
        }
      }
    };

    document.addEventListener("click", handleTimestampClick);
    return () => document.removeEventListener("click", handleTimestampClick);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const timer = setTimeout(() => {
      const sync = async () => {
        for (const chat of chats) {
          try {
            await fetch("/api/chats", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                chatId: chat.id,
                title: chat.title,
                messages: chatMessagesMap[chat.id] || [],
              }),
            });
          } catch {
            /* sync failure — will retry on next change */
          }
        }
      };
      sync();
    }, 1000);
    return () => clearTimeout(timer);
  }, [chats, chatMessagesMap]);

  const getDefaultMessagesForChat = () => {
    const now = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return [
      {
        text: locale === 'it' 
          ? "Benvenuto nella chat di riassunto video! Incolla un link YouTube o chiedimi qualcosa." 
          : "Welcome to the video summary chat! Paste a YouTube link or ask me something.",
        sender: "system",
        time: now,
      },
    ];
  };

  useEffect(() => {
    const loadMessages = () => {
      if (!activeChatId) {
        setMessages([]);
        return;
      }
      const saved = chatMessagesMap[activeChatId];
      setMessages(
        saved?.length ? saved : getDefaultMessagesForChat(),
      );
    };
    loadMessages();
  }, [activeChatId, chatMessagesMap]);

  const updateChatMessagesMap = (chatId: any, newMessages: any[]) => {
    if (!chatId || newMessages.length === 0) return;
    setChatMessagesMap((prev) => ({
      ...prev,
      [chatId]: newMessages,
    }));
  };

  const addMessage = (messageData: any, sender = "system") => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    setMessages((prev) => {
      const next = [...prev, { ...messageData, sender, time: timeStr }];
      updateChatMessagesMap(activeChatId, next);
      return next;
    });
  };

  const getYouTubeVideoId = (url: string) => {
    const regExp =
      /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return match[2];
    }
    return null;
  };

  const isYouTubeChannel = (url: string) => {
    return (
      url.includes("/@") || url.includes("/channel/") || url.includes("/user/")
    );
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const API_BASE = "/api/ai";

  const syncToServer = async (chatId: any, title: string, messages: any[]) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatId,
          title,
          messages,
        }),
      });
    } catch (e) {
      console.error("Sync error:", e);
    }
  };

  const handleVideoInputSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVideoInputError("");

    const videoId = getYouTubeVideoId(videoUrl);
    const isChannel = isYouTubeChannel(videoUrl);

    if (videoInputMode === "video") {
      if (isChannel) {
        setVideoInputError(
          "Hai inserito un link di canale. Per analizzare un singolo video, seleziona 'Singolo Video' e inserisci un link di video.",
        );
        return;
      }
      if (!videoId) {
        setVideoInputError("Inserisci un link YouTube valido.");
        return;
      }

      if (videoInputInfo?.videoId === videoId) {
        return;
      }

      setVideoInputLoading(true);
      try {
        const response = await fetch("/api/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrl }),
        });
        if (response.ok) {
          const data = await response.json();
          setVideoInputInfo({
            videoId: data.videoId || videoId,
            title: data.title || "Video",
            channelTitle: data.channelTitle || "Canale sconosciuto",
            thumbnail: data.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            viewCount: data.viewCount || 0,
            likeCount: data.likeCount || 0,
            publishedAt: data.publishedAt || "",
          });
        } else {
          setVideoInputInfo({
            videoId,
            title: "Video",
            channelTitle: "Canale sconosciuto",
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            viewCount: 0,
            likeCount: 0,
            publishedAt: "",
          });
        }
      } catch (err) {
        setVideoInputInfo({
          videoId,
          title: "Video",
          channelTitle: "Canale sconosciuto",
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          viewCount: 0,
          likeCount: 0,
          publishedAt: "",
        });
      }
      setVideoInputLoading(false);
    } else {
      if (!isChannel) {
        setVideoInputError(
          "Hai inserito un link di video. Per analizzare un intero canale, seleziona 'Intero Canale' e inserisci un link di canale (es. @nomecanale).",
        );
        return;
      }
      setVideoInputError("L'analisi di interi canali non è ancora supportata nella chat.");
    }
  };

  const startChatWithVideo = () => {
    if (!videoInputInfo) return;
    setIsAnalyzing(true);
    setCurrentVideoId(videoInputInfo.videoId);
    setCurrentVideoStartTime(0);
    setHasStartedChat(true);
    createNewChatWithVideo(videoInputInfo);
  };

  const cancelAnalysis = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAnalyzing(false);
  };

  const handleAutoDetectVideo = async (url: string) => {
    const videoId = getYouTubeVideoId(url);
    const isChannel = isYouTubeChannel(url);

    if (!videoId || isChannel) {
      return;
    }

    setVideoUrl(url);
    setVideoInputLoading(true);
    setVideoInputInfo(null);
    setVideoInputError("");

    try {
      const response = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: url }),
      });
      if (response.ok) {
        const data = await response.json();
        setVideoInputInfo({
          videoId: data.videoId || videoId,
          title: data.title || "Video",
          channelTitle: data.channelTitle || "Canale sconosciuto",
          thumbnail: data.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          viewCount: data.viewCount || 0,
          likeCount: data.likeCount || 0,
          publishedAt: data.publishedAt || "",
          detected: true,
        });
      } else {
        setVideoInputInfo({
          videoId,
          title: "Video",
          channelTitle: "Canale sconosciuto",
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          viewCount: 0,
          likeCount: 0,
          publishedAt: "",
          detected: true,
        });
      }
    } catch (err) {
      setVideoInputInfo({
        videoId,
        title: "Video",
        channelTitle: "Canale sconosciuto",
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        viewCount: 0,
        likeCount: 0,
        publishedAt: "",
        detected: true,
      });
    }
    setVideoInputLoading(false);
  };

  const createNewChatWithVideo = async (videoInfo: any) => {
    const newId = Date.now();
    const newChat = {
      id: newId,
      title: videoInfo.title.length > 40
        ? videoInfo.title.slice(0, 37) + "..."
        : videoInfo.title,
      createdAt: new Date().toISOString(),
    };

    setChats((prev: any[]) => [newChat, ...prev]);
    setActiveChatId(newId);
    setChatMessagesMap((prev) => ({ ...prev, [newId]: [] }));

    let videoData = null;
    try {
      const res = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl }),
      });
      if (res.ok) {
        videoData = await res.json();
      }
    } catch (e) {
      console.error("Error fetching video data:", e);
    }

    const initialMessage = {
      text: "Video caricato. Come posso aiutarti con l'analisi?",
      videoId: videoInfo.videoId,
      videoTitle: videoInfo.title,
      videoChannel: videoInfo.channelTitle,
      transcript: videoData?.transcript || null,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      sender: "system",
    };

    setMessages([initialMessage]);
    updateChatMessagesMap(newId, [initialMessage]);
    setIsAnalyzing(false);

    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch("/api/chats", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            chatId: newId,
            title: newChat.title,
            messages: [initialMessage],
          }),
        });
      } catch (e) {
        console.error("Error syncing chat:", e);
      }
    }
  };

  useEffect(() => {
    if (messageQueue.length > 0 && !isProcessingQueue) {
      processAIResponse(messageQueue[0]);
    }
  }, [messageQueue, isProcessingQueue]);

  const processAIResponse = async (item: any) => {
    setIsProcessingQueue(true);
    setIsTyping(true);
    const { userMsgText, currentChatId, videoId, transcript, chatTitle, signal } = item;

    try {
      const token = localStorage.getItem("token");
      const context = currentVideoId
        ? `Video YouTube attivo (ID: ${currentVideoId}). L'utente sta lavorando su questo video.`
        : currentFileContext || "Nessun file o video caricato";

      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          message: userMsgText,
          context,
          videoId: videoId || currentVideoId,
          documentContext: currentFileContext,
          transcript: transcript,
        }),
        signal,
      });

      if (!response.ok) {
        setIsTyping(false);
        setMessages((prev: any[]) => {
          const next = [...prev, { text: "Errore nella risposta dell'IA. Riprova.", sender: "system", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }];
          updateChatMessagesMap(currentChatId, next);
          return next;
        });
        setIsProcessingQueue(false);
        setMessageQueue((prev) => prev.slice(1));
        return;
      }

      const data = await response.json();

      if (data.videoId && !currentVideoId) {
        setCurrentVideoId(data.videoId);
        setCurrentVideoStartTime(0);
      }

      if (data.response) {
        const newMsgId = `ai-${Date.now()}`;

        const fullText = data.response;

        const aiMessage = {
          id: newMsgId,
          text: "",
          videoId: videoId || currentVideoId,
          sender: "system",
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        setMessages((prev: any[]) => {
          const next = [...prev, aiMessage];
          return next;
        });

        setCurrentAIMessageIndex(newMsgId);
        setDisplayedText("");

        let i = 0;
        const speed = 5;
        const typeInterval = setInterval(() => {
          if (i < fullText.length) {
            const partialText = fullText.slice(0, i + 1);
            setDisplayedText(partialText);
            setMessages((prev: any[]) =>
              prev.map((m: any) =>
                m.id === newMsgId ? { ...m, text: partialText } : m,
              ),
            );
            i++;
          } else {
            clearInterval(typeInterval);
            setCurrentAIMessageIndex(null);
            setDisplayedText("");

            setMessages((prev: any[]) => {
              const finalMessages = prev.map((m: any) =>
                m.id === newMsgId ? { ...m, text: fullText } : m,
              );
              updateChatMessagesMap(currentChatId, finalMessages);
              syncToServer(currentChatId, chatTitle, finalMessages);
              return finalMessages;
            });
            setIsProcessingQueue(false);
            setMessageQueue((prev) => prev.slice(1));
          }
        }, speed);
      } else if (data.message) {
        setIsTyping(false);
        const sysMsg = { text: data.message, sender: "system", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
        setMessages((prev: any[]) => {
          const next = [...prev, sysMsg];
          updateChatMessagesMap(currentChatId, next);
          return next;
        });
        setIsProcessingQueue(false);
        setMessageQueue((prev) => prev.slice(1));
      } else {
        setIsTyping(false);
        const sysMsg = { text: "Errore nella risposta dell'IA. Riprova.", sender: "system", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
        setMessages((prev: any[]) => {
          const next = [...prev, sysMsg];
          updateChatMessagesMap(currentChatId, next);
          return next;
        });
        setIsProcessingQueue(false);
        setMessageQueue((prev) => prev.slice(1));
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages((prev: any[]) =>
          prev.map((m: any, i: number) =>
            i === prev.length - 1 && m.sender === "user" ? { ...m, cancelled: true } : m,
          ),
        );
      } else {
        const sysMsg = { text: "Errore di rete. Assicurati che il server sia attivo.", sender: "system", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
        setMessages((prev: any[]) => {
          const next = [...prev, sysMsg];
          updateChatMessagesMap(currentChatId, next);
          return next;
        });
      }
      setIsTyping(false);
      setIsProcessingQueue(false);
      setMessageQueue((prev) => prev.slice(1));
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setMessages((prev: any[]) =>
        prev.map((m: any, i: number) =>
          i === prev.length - 1 && m.sender === "user" ? { ...m, cancelled: true } : m,
        ),
      );
      setIsTyping(false);
      setIsProcessingQueue(false);
      setMessageQueue([]);
    }
  };

  const stripHtml = (html: string) => {
    if (!html) return "";
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

  const handleLike = (msgId: any) => {
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

  const handleDislike = (msgId: any) => {
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

  const handleEdit = (msg: any) => {
    setInput(msg.text);
    setEditingMessageId(msg.id);
    textareaRef.current?.focus();
  };

  const handleRegenerate = (msg: any) => {
    const msgIdx = messages.findIndex((m: any) => m.id === msg.id);
    if (msgIdx <= 0) return;
    for (let i = msgIdx - 1; i >= 0; i--) {
      if (messages[i].sender === "user") {
        setMessages((prev) => prev.filter((m: any) => m.id !== msg.id));
        setInput(messages[i].text);
        handleSendWithText(messages[i].text);
        return;
      }
    }
  };

  const handleRetry = (msg: any) => {
    const msgIdx = messages.findIndex((m: any) => m.id === msg.id);
    if (msgIdx <= 0) return;
    for (let i = msgIdx - 1; i >= 0; i--) {
      if (messages[i].sender === "user") {
        setInput(messages[i].text);
        return;
      }
    }
  };

  const handleSendWithText = async (text: string) => {
    const userMsgText = text;
    const videoId = getYouTubeVideoId(userMsgText);

    let videoInfo: any = null;
    if (videoId) {
      try {
        const videoRes = await fetch("/api/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrl: userMsgText }),
        });
        if (videoRes.ok) {
          videoInfo = await videoRes.json();
        }
      } catch { /* ignore */ }
    }

    let currentChatId = activeChatId;
    let currentChats = [...chats];
    let activeChat = currentChats.find((c: any) => c.id === currentChatId);

    if (!activeChat) {
      const newId = Date.now();
      activeChat = {
        id: newId,
        title: "Nuova Conversazione",
        createdAt: new Date().toISOString(),
      };
      currentChats = [activeChat, ...currentChats];
      setChats(currentChats);
      setActiveChatId(newId);
      currentChatId = newId;
    }

    if (activeChat?.title === "Nuova Conversazione") {
      const newTitle = videoInfo?.title
        ? videoInfo.title.length > 40 ? videoInfo.title.slice(0, 37) + "..." : videoInfo.title
        : userMsgText.length > 40 ? userMsgText.slice(0, 37) + "..." : userMsgText;
      activeChat.title = newTitle;
      setChats(currentChats.map((c: any) => c.id === currentChatId ? { ...c, title: newTitle } : c));
    }

    const messageData = {
      text: userMsgText,
      videoId: videoId || null,
      videoTitle: videoInfo?.title,
      videoChannel: videoInfo?.channelTitle,
      transcript: videoInfo?.transcript,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender: "user",
    };

    const newMessages = [...messages, messageData];
    setMessages(newMessages);
    updateChatMessagesMap(currentChatId, newMessages);
    syncToServer(currentChatId, activeChat.title, newMessages);

    if (videoInfo?.videoId) {
      setCurrentVideoId(videoInfo.videoId);
      setCurrentVideoStartTime(0);
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setMessageQueue((prev) => [
      ...prev,
      {
        userMsgText,
        currentChatId,
        videoId: videoId || currentVideoId,
        transcript: videoInfo?.transcript || messages.find((m: any) => m.videoId === (videoId || currentVideoId))?.transcript,
        chatTitle: activeChat.title,
        signal: controller.signal,
      },
    ]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsgText = input;

    if (editingMessageId) {
      setMessages((prev) => {
        const next = prev.map((m: any) =>
          m.id === editingMessageId ? { ...m, text: userMsgText } : m,
        );
        updateChatMessagesMap(activeChatId, next);
        return next;
      });
      setInput("");
      setEditingMessageId(null);
      textareaRef.current?.style && (textareaRef.current.style.height = "auto");
      return;
    }

    const videoId = getYouTubeVideoId(userMsgText);

    let videoInfo: any = null;
    if (videoId) {
      try {
        const videoRes = await fetch("/api/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrl: userMsgText }),
        });
        if (videoRes.ok) {
          videoInfo = await videoRes.json();
        }
      } catch (e) {
        console.error("Error fetching video info:", e);
      }
    }

    let currentChatId = activeChatId;
    let currentChats = [...chats];
    let activeChat = currentChats.find((c: any) => c.id === currentChatId);

    if (!activeChat) {
      const newId = Date.now();
      activeChat = {
        id: newId,
        title: "Nuova Conversazione",
        createdAt: new Date().toISOString(),
      };
      currentChats = [activeChat, ...currentChats];
      setChats(currentChats);
      setActiveChatId(newId);
      currentChatId = newId;
    }

    if (activeChat?.title === "Nuova Conversazione") {
      const newTitle = videoInfo?.title
        ? videoInfo.title.length > 40
          ? videoInfo.title.slice(0, 37) + "..."
          : videoInfo.title
        : userMsgText.length > 40
          ? userMsgText.slice(0, 37) + "..."
          : userMsgText;

      activeChat.title = newTitle;
      setChats(
        currentChats.map((c: any) =>
          c.id === currentChatId ? { ...c, title: newTitle } : c,
        ),
      );
    }

    const messageData = {
      text: userMsgText,
      videoId: videoId || null,
      videoTitle: videoInfo?.title,
      videoChannel: videoInfo?.channelTitle,
      transcript: videoInfo?.transcript,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      sender: "user",
    };

    const newMessages = [...messages, messageData];
    setMessages(newMessages);
    updateChatMessagesMap(currentChatId, newMessages);

    syncToServer(currentChatId, activeChat.title, newMessages);

    setInput("");

    if (videoInfo?.videoId) {
      setCurrentVideoId(videoInfo.videoId);
      setCurrentVideoStartTime(0);
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setMessageQueue((prev) => [
      ...prev,
      {
        userMsgText,
        currentChatId,
        videoId: videoId || currentVideoId,
        transcript:
          videoInfo?.transcript ||
          messages.find((m: any) => m.videoId === (videoId || currentVideoId))?.transcript,
        chatTitle: activeChat.title,
        signal: controller.signal,
      },
    ]);
  };

  const createNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: "Nuova Conversazione",
      createdAt: Date.now(),
    };
    setChats([newChat, ...chats]);
    setActiveChatId(newChat.id);
    setMessages([]);
    setChatMessagesMap((prev) => ({ ...prev, [newChat.id]: [] }));
    setCurrentVideoId(null);
    setHasStartedChat(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsTyping(true);
    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("token");

    try {
      const response = await fetch("/api/document", {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentFileContext(data.text);
        
        addMessage(
          {
            text: `File **${data.fileName}** caricato e analizzato correttamente (${data.wordCount} parole). Ora puoi chiedermi qualsiasi cosa su questo documento!`,
          },
          "system",
        );
      } else {
        const err = await response.json();
        addMessage(
          {
            text: `Errore durante l'analisi del file: ${err.message || "riprova con un altro file."}`,
          },
          "system",
        );
      }
    } catch (err) {
      console.error("File upload error:", err);
      addMessage(
        {
          text: "Errore di connessione durante il caricamento del file.",
        },
        "system",
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleChatSelect = (chatId: any) => {
    setActiveChatId(chatId);
    setInput("");
    setIsHistoryPanelOpen(false);
    setHasStartedChat(true);

    const chatMsgs = chatMessagesMap[chatId] || [];
    const videoMsg = chatMsgs.find((m: any) => m.videoId);
    if (videoMsg?.videoId) {
      setCurrentVideoId(videoMsg.videoId);
      setCurrentVideoStartTime(0);
    } else {
      setCurrentVideoId(null);
      setCurrentVideoStartTime(0);
    }
  };

  const handleSeekTo = (seconds: number) => {
    setCurrentVideoStartTime(seconds);
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: any) => {
    e.stopPropagation();
    setDeleteConfirmChatId(chatId);
  };

  const confirmDeleteChat = async () => {
    const chatId = deleteConfirmChatId;
    if (!chatId) return;
    setDeleteConfirmChatId(null);

    const chatToDelete = chats.find((c: any) => c.id === chatId);
    if (chatToDelete) {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          await fetch(`/api/chats/${chatId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch {
          /* sync failure */
        }
      }
    }
    const remaining = chats.filter((c: any) => c.id !== chatId);
    setChats(remaining);

    localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(remaining));

    const storedMsgs = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (storedMsgs) {
      const msgsMap = JSON.parse(storedMsgs);
      delete msgsMap[chatId];
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(msgsMap));
    }

    setChatMessagesMap((prev) => {
      const next = { ...prev };
      delete next[chatId];
      return next;
    });
    if (activeChatId === chatId) {
      const nextChat = remaining[0];
      setActiveChatId(nextChat?.id ?? null);
      setCurrentVideoId(null);
      if (!nextChat) {
        setMessages([]);
        setHasStartedChat(false);
      }
    }
  };

  const [isAskMenuOpen, setIsAskMenuOpen] = useState(false);
  const askMenuRef = useRef<HTMLDivElement>(null);
  const [deleteConfirmChatId, setDeleteConfirmChatId] = useState<any>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

  const fetchSuggestions = useCallback(async (type: "chat" | "demo" = "chat", extra?: { videoTitle?: string; channelTitle?: string }) => {
    try {
      const res = await fetch("/api/ai/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          videoId: currentVideoId,
          videoTitle: extra?.videoTitle || "",
          channelTitle: extra?.channelTitle || "",
          context: currentFileContext || "",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestedQuestions(data.suggestions || []);
      }
    } catch { /* fallback to empty */ }
  }, [currentVideoId, currentFileContext]);

  useEffect(() => {
    if (currentVideoId) {
      fetchSuggestions("chat");
    }
  }, [currentVideoId, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (askMenuRef.current && !askMenuRef.current.contains(e.target as Node)) {
        setIsAskMenuOpen(false);
      }
    };
    if (isAskMenuOpen)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAskMenuOpen]);

  useEffect(() => {
    document.title = "Chat | Resumari";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'Chatta con l\'AI per analizzare video e documenti');
  }, []);

  const formatSeparatorDate = (date: Date) => {
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Oggi";
    if (diffDays === 1) return "Ieri";
    return date.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  };

  const getMessageDate = (msg: any) => {
    const d = new Date();
    if (msg.time) {
      const [h, m] = msg.time.split(":").map(Number);
      d.setHours(h, m, 0, 0);
    }
    return d.toDateString();
  };

  const handleExportConversation = () => {
    const chat = chats.find((c: any) => c.id === activeChatId);
    const title = chat?.title || "conversazione";
    const lines = messages.map((msg: any) => {
      const role = msg.sender === "user" ? "Tu" : "Resumari";
      return `[${msg.time || "--:--"}] ${role}:\n${msg.text || ""}`;
    });
    const content = `Resumari Chat — ${title}\n${new Date().toLocaleDateString("it-IT")}\n${"=".repeat(40)}\n\n${lines.join("\n\n")}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast?.("Conversazione esportata", "success");
  };

  const markdownComponents: Components = {
    code: ({ className, children, ...props }: any) => {
      const isInline = !className;
      if (isInline) {
        return <code className="bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 px-1.5 py-0.5 rounded-md text-xs font-mono" {...props}>{children}</code>;
      }
      return (
        <pre className="bg-gray-900 dark:bg-zinc-900 dark:border dark:border-zinc-700/50 text-gray-100 rounded-xl p-4 my-3 overflow-x-auto text-sm font-mono leading-relaxed">
          <code className={className} {...props}>{children}</code>
        </pre>
      );
    },
    a: ({ href, children, ...props }: any) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 underline hover:text-purple-800 dark:hover:text-purple-300" {...props}>{children}</a>
    ),
    ul: ({ children, ...props }: any) => <ul className="list-disc pl-5 my-2 space-y-1" {...props}>{children}</ul>,
    ol: ({ children, ...props }: any) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props}>{children}</ol>,
    li: ({ children, ...props }: any) => <li className="text-gray-800 dark:text-zinc-200 leading-relaxed" {...props}>{children}</li>,
    p: ({ children, ...props }: any) => <p className="mb-2 last:mb-0" {...props}>{children}</p>,
    h1: ({ children, ...props }: any) => <h1 className="text-lg font-bold mt-4 mb-2" {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 className="text-base font-bold mt-3 mb-2" {...props}>{children}</h2>,
    h3: ({ children, ...props }: any) => <h3 className="text-sm font-bold mt-3 mb-1" {...props}>{children}</h3>,
    strong: ({ children, ...props }: any) => <strong className="font-bold text-gray-900 dark:text-zinc-100" {...props}>{children}</strong>,
    em: ({ children, ...props }: any) => <em className="italic" {...props}>{children}</em>,
  };

  const handleSuggestedQuestion = (q: string) => {
    setInput(q);
    setIsAskMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 overflow-hidden">
      <AnimatePresence mode="wait">
        {isLeftSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="overflow-hidden h-full shrink-0"
          >
            <ChatSidebar
              setIsLeftSidebarOpen={setIsLeftSidebarOpen}
              chats={chats}
              activeChatId={activeChatId}
              handleChatSelect={handleChatSelect}
              handleDeleteChat={handleDeleteChat}
              formatChatDate={formatChatDate}
              userInitial={userInitial}
              displayName={displayName}
              user={user}
              isAccountMenuOpen={isAccountMenuOpen}
              setIsAccountMenuOpen={setIsAccountMenuOpen}
              accountMenuRef={accountMenuRef}
              handleLogout={handleLogout}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {!isLeftSidebarOpen && (
        <button
          onClick={() => setIsLeftSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all"
          title="Apri menu"
        >
          <PanelLeftClose size={18} className="text-gray-500 dark:text-zinc-400" />
        </button>
      )}

      <main className="flex-1 flex flex-col relative min-w-0 bg-white dark:bg-zinc-950">
        {!hasStartedChat ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-xl scale-90 origin-center">
              <div className="bg-white dark:bg-zinc-900 rounded-[3rem] p-6 md:p-8 shadow-2xl shadow-purple-500/5 border border-gray-100 dark:border-zinc-800">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950 border border-purple-100 dark:border-purple-900 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider mb-3">
                    <Video size={14} />
                    Chat con Video
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-zinc-100 tracking-tight">
                    Analizza un <span className="text-purple-600 italic">Video</span>
                  </h2>
                  <p className="text-gray-500 dark:text-zinc-400 font-medium mt-2 text-sm">
                    Incolla il link di un video YouTube per iniziare a chattare
                  </p>
                </div>

                <div className="flex justify-center mb-4">
                  <div className="bg-gray-100 dark:bg-zinc-800 p-1 rounded-2xl flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setVideoInputMode("video");
                        setVideoInputError("");
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${videoInputMode === "video" ? "bg-white dark:bg-zinc-900 dark:text-zinc-100 shadow-sm" : "text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300"}`}
                    >
                      Singolo Video
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoInputMode("channel");
                        setVideoInputError("");
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${videoInputMode === "channel" ? "bg-white dark:bg-zinc-900 dark:text-zinc-100 shadow-sm" : "text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300"}`}
                    >
                      Intero Canale
                    </button>
                  </div>
                </div>

                <form onSubmit={handleVideoInputSubmit} className="flex flex-col gap-3">
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400 transition-colors">
                      <Youtube size={18} />
                    </div>
                    <input
                      type="url"
                      required
                      value={videoUrl}
                      onChange={(e) => {
                        setVideoUrl(e.target.value);
                        setVideoInputError("");
                        setVideoInputInfo(null);
                        handleAutoDetectVideo(e.target.value);
                      }}
                      onPaste={(e) => {
                        const pastedText = e.clipboardData.getData('text');
                        handleAutoDetectVideo(pastedText);
                      }}
                      placeholder={
                        videoInputMode === "video"
                          ? "https://youtube.com/watch?v=..."
                          : "https://youtube.com/@nomecanale"
                      }
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-purple-500/5 focus:border-purple-200 dark:focus:border-purple-700 transition-all"
                    />
                  </div>

                  {videoInputError && (
                    <div className="px-3 py-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg text-red-600 dark:text-red-400 text-xs font-medium text-center">
                      {videoInputError}
                    </div>
                  )}

                  {videoInputLoading && (
                    <div className="flex items-center justify-center gap-2 py-3">
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">Caricamento...</span>
                    </div>
                  )}

                  {videoInputInfo && !videoInputLoading && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800">
                      <div className="flex gap-3">
                        <div className="w-56 shrink-0 aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-zinc-800 relative group">
                          <img
                            src={videoInputInfo.thumbnail}
                            alt={videoInputInfo.title}
                            className="w-full h-full object-cover"
                            onError={(e: any) => {
                              e.target.src = `https://img.youtube.com/vi/${videoInputInfo.videoId}/hqdefault.jpg`;
                            }}
                          />
                          {videoInputInfo.detected && (
                            <div className="absolute top-2 left-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow-md z-10">
                              <Check size={12} className="text-white" />
                            </div>
                          )}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                            <div className="absolute inset-0 bg-black/30 rounded-lg" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={startChatWithVideo}
                                id="start-chat-btn"
                                disabled={isAnalyzing}
                                className="w-14 h-14 rounded-full bg-white/25 backdrop-blur-md border border-white/40 shadow-lg shadow-black/30 flex items-center justify-center text-white hover:bg-white/40 hover:scale-110 active:scale-95 transition-all duration-200"
                              >
                                {isAnalyzing ? (
                                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                ) : (
                                  <Sparkles size={24} />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-1">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-zinc-100 line-clamp-2">
                              {videoInputInfo.title}
                            </h4>
                            {videoInputInfo.detected && (
                              <span className="text-[9px] text-green-600 dark:text-green-400 font-medium">Identificato</span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 dark:text-zinc-400 mb-1">
                            {videoInputInfo.channelTitle}
                          </p>
                          <div className="flex items-center gap-2 text-[9px] text-gray-400 dark:text-zinc-500">
                            <span>{formatNumber(videoInputInfo.viewCount)} visualizzazioni</span>
                            <span>•</span>
                            <span>{formatNumber(videoInputInfo.likeCount)} mi piace</span>
                            {videoInputInfo.publishedAt && (
                              <>
                                <span>•</span>
                                <span>{new Date(videoInputInfo.publishedAt).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {isAnalyzing && (
                        <button
                          type="button"
                          onClick={cancelAnalysis}
                          className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-lg font-bold text-xs hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors"
                        >
                          <X size={14} />
                          Annulla
                        </button>
                      )}
                    </div>
                  )}

                  {!videoInputInfo && !videoInputLoading && (
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold text-sm hover:bg-black dark:hover:bg-zinc-300 transition-all transform hover:-translate-y-0.5 shadow-lg shadow-gray-200 dark:shadow-none active:scale-95"
                    >
                      <Search size={16} />
                      {videoInputMode === "video" ? "Carica Video" : "Carica Canale"}
                    </button>
                  )}
                </form>

                <div className="mt-6 flex items-center justify-center gap-4 opacity-40">
                  <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-900 dark:text-zinc-200">
                    <Sparkles size={10} /> IA Unlimited
                  </div>
                  <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-700" />
                  <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-gray-900 dark:text-zinc-200">
                    <MessageSquare size={10} /> Chat Intelligente
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="px-8 py-4 border-b border-gray-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <MessageSquare size={20} />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 dark:text-zinc-100">Chat AI</h2>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">
                      {(activeChatId &&
                        chats.find((c: any) => c.id === activeChatId)?.title) ||
                        "Nuova conversazione"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleExportConversation}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-transparent border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all text-xs font-bold shadow-sm group"
                  title="Esporta conversazione"
                >
                  <Download size={14} className="text-gray-900 dark:text-zinc-100 group-hover:scale-110 transition-transform" />
                  Esporta
                </button>
              </div>
            </div>

            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className={`flex-1 ${messages.length === 0 ? "overflow-hidden" : "overflow-y-auto"} px-8 py-6 space-y-6 scroll-smooth custom-scrollbar relative`}
            >
              <AnimatePresence>
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-400 dark:text-zinc-500 font-medium">Inizia una conversazione</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(() => {
                      let lastDate = "";
                      return messages.map((msg: any, idx: number) => {
                        const msgDate = getMessageDate(msg);
                        const showDateSep = msgDate !== lastDate;
                        lastDate = msgDate;
                        return (
                          <div key={msg.id || `msg-${idx}`}>
                            {showDateSep && (
                              <div className="flex items-center gap-3 my-6 max-w-3xl mx-auto">
                                <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-800" />
                                <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest shrink-0">
                                  {formatSeparatorDate(new Date())}
                                </span>
                                <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-800" />
                              </div>
                            )}
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex gap-4 max-w-3xl mx-auto ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}
                            >
                              {msg.sender === "system" && !msg.cancelled && (
                                <div className="w-8 h-8 shrink-0">
                                  <div className="w-full h-full rounded-full bg-linear-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                                    <Sparkles size={14} className="text-white" />
                                  </div>
                                </div>
                              )}
                              <div
                                className={`flex flex-col gap-1 ${msg.sender === "user" ? "items-end" : "items-start"}`}
                              >
                                {msg.videoId && (
                                  <div className="mb-3 space-y-2 w-full max-w-md">
                                    <div className="aspect-video w-full rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-zinc-800">
                                      <iframe
                                        width="100%"
                                        height="100%"
                                        src={`https://www.youtube.com/embed/${msg.videoId}`}
                                        title="YouTube video player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                        allowFullScreen
                                      ></iframe>
                                    </div>
                                    {msg.videoTitle && (
                                      <p className="text-xs font-bold text-gray-500 dark:text-zinc-400">
                                        {msg.videoTitle}
                                        {msg.videoChannel && (
                                          <span className="text-gray-400 dark:text-zinc-500">
                                            {" "}
                                            • {msg.videoChannel}
                                          </span>
                                        )}
                                      </p>
                                    )}

                                    {msg.transcript && msg.transcript.length > 0 && (
                                      <div className="w-full mt-2 rounded-xl bg-gray-50 dark:bg-zinc-900 text-gray-800 dark:text-zinc-200 border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                                        <div className="px-3 py-2 border-b border-gray-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-800/60 flex items-center justify-between">
                                          <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest">
                                            Trascrizione Video
                                          </p>
                                          <button
                                            onClick={() => setCurrentVideoId(msg.videoId)}
                                            className="text-[9px] font-bold text-purple-600 hover:underline"
                                          >
                                            Riproduci
                                          </button>
                                        </div>
                                        <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto text-xs">
                                          {msg.transcript.slice(0, 100).map((line: any, i: number) => (
                                            <div
                                              key={i}
                                              className="flex gap-2 hover:bg-gray-100/50 dark:hover:bg-zinc-800/60 rounded transition-colors cursor-pointer"
                                              onClick={() =>
                                                line.time &&
                                                setCurrentVideoStartTime(line.time)
                                              }
                                            >
                                              <span className="shrink-0 text-purple-600 font-mono font-bold">
                                                {formatTimestamp(line.time)}
                                              </span>
                                              <span className="text-gray-700 dark:text-zinc-300 leading-relaxed">
                                                {line.text}
                                              </span>
                                            </div>
                                          ))}
                                          {msg.transcript.length > 100 && (
                                            <p className="text-[10px] text-gray-400 dark:text-zinc-500 italic text-center pt-2">
                                              ... trascrizione troncata per brevità
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {msg.text ? (
                                  msg.sender === "user" && msg.cancelled ? (
                                    <div className="px-5 py-3.5 rounded-2xl text-sm leading-relaxed bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 rounded-br-sm border border-red-100 dark:border-red-900">
                                      <div>{msg.text}</div>
                                      <div className="text-[10px] text-red-400 dark:text-red-300 font-medium mt-1.5 pt-1.5 border-t border-red-200/50 dark:border-red-800/50 flex items-center gap-1">
                                        <Square size={8} className="fill-current shrink-0" />
                                        Messaggio annullato
                                      </div>
                                    </div>
                                  ) : (
                                    <div
                                      className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${
                                        msg.sender === "user"
                                          ? "bg-gray-900 dark:bg-zinc-800 dark:text-white rounded-br-sm"
                                          : "bg-purple-50 dark:bg-purple-950 dark:text-zinc-200 rounded-bl-sm border border-purple-100 dark:border-purple-900"
                                      }`}
                                    >
                                      {msg.sender === "system" && msg.videoId ? (
                                        <FormatTimestampLinks text={msg.text} videoId={msg.videoId} />
                                      ) : (
                                        <ReactMarkdown
                                          remarkPlugins={[remarkGfm]}
                                          components={markdownComponents}
                                        >
                                          {msg.text}
                                        </ReactMarkdown>
                                      )}
                                    </div>
                                  )
                                ) : null}
                                {msg.sender === "system" && msg.text && !msg.cancelled && (
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      onClick={() => handleCopy(msg.text)}
                                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-all"
                                      title="Copia"
                                    >
                                      <Copy size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleLike(msg.id)}
                                      className={`p-1 rounded-md transition-all ${likedMessages.has(msg.id) ? "text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-950" : "text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"}`}
                                      title="Mi piace"
                                    >
                                      <ThumbsUp size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDislike(msg.id)}
                                      className={`p-1 rounded-md transition-all ${dislikedMessages.has(msg.id) ? "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950" : "text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"}`}
                                      title="Non mi piace"
                                    >
                                      <ThumbsDown size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleRetry(msg)}
                                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-all"
                                      title="Riprova"
                                    >
                                      <RefreshCw size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleRegenerate(msg)}
                                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-all"
                                      title="Rigenera"
                                    >
                                      <RotateCw size={13} />
                                    </button>
                                  </div>
                                )}
                                {msg.sender === "user" && msg.text && !msg.cancelled && (
                                  <div className="flex items-center gap-0.5 mt-0.5">
                                    <button
                                      onClick={() => handleEdit(msg)}
                                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-all"
                                      title="Modifica messaggio"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </AnimatePresence>

              {isTyping && (
                <div className="flex gap-4 max-w-3xl mx-auto">
                  <div className="w-8 h-8 shrink-0">
                    <div className="w-full h-full rounded-full bg-linear-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                      <Sparkles size={14} className="text-white" />
                    </div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950 px-5 py-3.5 rounded-2xl rounded-bl-sm border border-purple-100 dark:border-purple-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="pb-6 px-8 max-w-4xl w-full mx-auto">
              <div className="flex justify-between items-center gap-2 mb-3 relative">
                <button
                  onClick={createNewChat}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-transparent border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-all text-xs font-bold shadow-sm group"
                  title="Inizia una nuova conversazione"
                >
                  <Plus
                    size={14}
                    className="text-gray-900 dark:text-zinc-100 group-hover:scale-110 transition-transform"
                  />
                  Nuova Chat
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInput("Trascrivi questo video")}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-transparent border border-gray-200 dark:border-zinc-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950 transition-all text-xs font-bold shadow-sm"
                    title="Trascrivi"
                  >
                    <FileAudio size={14} />
                    Trascrivi
                  </button>
                  <button
                    onClick={() => setInput("Crea un riassunto")}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-transparent border border-gray-200 dark:border-zinc-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950 transition-all text-xs font-bold shadow-sm"
                    title="Crea riassunto"
                  >
                    <Wand2 size={14} />
                    Riassunto
                  </button>

                  <div className="relative" ref={askMenuRef}>
                    <button
                      onClick={() => setIsAskMenuOpen(!isAskMenuOpen)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-xs font-bold shadow-sm border ${
                        isAskMenuOpen
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-transparent border-gray-200 dark:border-zinc-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950"
                      }`}
                    >
                      <Sparkles size={14} />
                      Chiedi
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${isAskMenuOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    <AnimatePresence>
                      {isAskMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full right-0 mb-2 w-64 bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-xl z-20 py-2 overflow-hidden"
                        >
                          <div className="px-3 py-1.5 border-b border-gray-50 dark:border-zinc-800 mb-1">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                              Suggerimenti rapidi
                            </p>
                          </div>
                          {suggestedQuestions.length > 0 ? (
                            suggestedQuestions.map((q, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSuggestedQuestion(q)}
                                className="w-full text-left px-4 py-2 text-xs text-gray-600 dark:text-zinc-300 hover:bg-purple-50 dark:hover:bg-purple-950 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                              >
                                {q}
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-xs text-gray-400 dark:text-zinc-500 italic text-center">
                              Nessun suggerimento disponibile
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <div
                className="relative group"
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('drag-over'); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('drag-over');
                  const files = Array.from(e.dataTransfer.files);
                  const imgFile = files.find(f => f.type.startsWith('image/'));
                  if (imgFile) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const dataUrl = ev.target?.result as string;
                      setInput(prev => prev + `\n![image](${dataUrl})\n`);
                    };
                    reader.readAsDataURL(imgFile);
                    addToast?.("Immagine aggiunta al messaggio", "success");
                  }
                }}
              >
                {editingMessageId && (
                  <div className="flex items-center gap-2 px-3 py-1.5 mb-1.5 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-900 rounded-lg text-xs">
                    <Pencil size={12} className="text-purple-600 shrink-0" />
                    <span className="text-purple-700 dark:text-purple-300 font-medium flex-1">Modifica messaggio</span>
                    <button
                      onClick={() => { setEditingMessageId(null); setInput(""); textareaRef.current && (textareaRef.current.style.height = "auto"); }}
                      className="text-purple-500 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900 p-1 rounded-md transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  onKeyDown={(e: any) =>
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    (e.preventDefault(), isTyping ? handleCancel() : handleSend())
                  }
                  onPaste={(e) => {
                    const items = Array.from(e.clipboardData.items);
                    const imgItem = items.find(i => i.type.startsWith('image/'));
                    if (imgItem) {
                      e.preventDefault();
                      const file = imgItem.getAsFile();
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const dataUrl = ev.target?.result as string;
                          setInput(prev => prev + `\n![image](${dataUrl})\n`);
                        };
                        reader.readAsDataURL(file);
                        addToast?.("Immagine incollata nel messaggio", "success");
                      }
                    }
                  }}
                  placeholder="Chiedi a Resumari di analizzare qualcosa... (Shift+Invio per andare a capo)"
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-xl pl-4 pr-12 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-200 dark:focus:border-purple-700 transition-all resize-none overflow-hidden shadow-xl shadow-purple-500/5"
                />
                <button
                  onClick={isTyping ? handleCancel : handleSend}
                  disabled={!input.trim()}
                  className={`absolute right-1.5 top-1.5 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                    input.trim()
                      ? isTyping
                        ? "bg-red-500 text-white shadow-lg animate-pulse"
                        : "bg-gray-900 dark:bg-zinc-100 dark:text-zinc-900 hover:scale-105 active:scale-95 shadow-lg"
                      : "bg-gray-200 dark:bg-zinc-800 dark:text-zinc-500"
                  }`}
                >
                  {isTyping ? <Square size={14} className="fill-current" /> : <Send size={16} />}
                </button>
                <div className="absolute left-3 -top-6 text-[9px] text-gray-400 dark:text-zinc-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Trascina immagini qui o incollale con Ctrl+V
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {hasStartedChat && (
        <MediaPanel
          currentVideoId={currentVideoId}
          currentVideoStartTime={currentVideoStartTime}
          fileInputRef={fileInputRef}
          handleFileUpload={handleFileUpload}
          messages={messages}
          handleSeekTo={handleSeekTo}
          formatTimestamp={formatTimestamp}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmChatId !== null}
        title="Elimina conversazione"
        message="Questa azione è irreversibile. La conversazione e tutti i suoi messaggi verranno eliminati definitivamente."
        confirmLabel="Elimina"
        onConfirm={confirmDeleteChat}
        onCancel={() => setDeleteConfirmChatId(null)}
      />

      <AnimatePresence>
        {isHistoryPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setIsHistoryPanelOpen(false);
              setHistorySearch("");
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25 }}
              className="w-full max-w-lg max-h-[80vh] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-gray-900 dark:text-zinc-100 text-lg flex items-center gap-2">
                    <History size={22} className="text-purple-600" />
                    Cronologia completa
                  </h3>
                  <button
                    onClick={() => {
                      setIsHistoryPanelOpen(false);
                      setHistorySearch("");
                    }}
                    className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500"
                  />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Cerca conversazioni..."
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/10 focus:border-purple-200 dark:focus:border-purple-700 transition-all"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
                {(() => {
                  const q = historySearch.toLowerCase();
                  const filteredChats = q
                    ? chats.filter((c: any) => c.title.toLowerCase().includes(q))
                    : chats;

                  if (filteredChats.length === 0) {
                    return (
                      <p className="text-center py-12 text-gray-400 dark:text-zinc-500 font-medium">
                        {q ? "Nessun risultato" : "Nessuna conversazione"}
                      </p>
                    );
                  }
                  return (
                    <>
                      {filteredChats.map((chat: any) => (
                        <div
                          key={chat.id}
                          onClick={() => handleChatSelect(chat.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-left transition-all cursor-pointer group ${
                            activeChatId === chat.id
                              ? "bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-900 text-purple-700 dark:text-purple-300"
                              : "hover:bg-gray-50 dark:hover:bg-zinc-800 border border-transparent"
                          }`}
                        >
                          <MessageSquare
                            size={18}
                            className={
                              activeChatId === chat.id
                                ? "text-purple-600"
                                : "text-gray-400 dark:text-zinc-500 shrink-0"
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate">
                              {chat.title}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-zinc-500">
                              {formatChatDate(chat.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
