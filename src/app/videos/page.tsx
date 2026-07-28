/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Sparkles,
  FileText,
  LogOut,
  LayoutDashboard,
  Video,
  Home,
  PanelLeftClose,
} from "lucide-react";

export default function Videos() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<any>(null);

  useEffect(() => {
    console.log("Videos page useEffect running");
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    const pendingVideo = localStorage.getItem("resumari_pending_video");
    const pendingChannel = localStorage.getItem("resumari_pending_channel");

    console.log("Token exists:", !!token);
    console.log("Pending video:", pendingVideo);
    console.log("Pending channel:", pendingChannel);

    if (!token || !storedUser) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(storedUser));

    console.log("Pending video:", pendingVideo);
    if (pendingVideo) {
      const pending = JSON.parse(pendingVideo);
      console.log("Pending action:", pending.action);
      if (pending.action === "transcribe_full") {
        setLoading(true);
        setLoadingText("Caricamento trascrizione...");
        fetch("/api/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoUrl: `https://youtube.com/watch?v=${pending.videoId}`,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            console.log("API response:", data);
            if (data.videoId) {
              console.log("Transcript available:", data.transcript?.length);

              const hasTranscript =
                data.transcript && data.transcript.length > 0;
              const isGenerated = data.transcriptLanguage === "generated";

              const videoData = {
                videoId: data.videoId,
                title: data.title || "Video",
                channel: data.channelTitle || "Canale",
                description: data.description || "",
                transcript: data.transcript || [],
                transcriptAvailable: hasTranscript,
                isGenerated: isGenerated,
              };

              setSelectedVideo(videoData);
              setVideos((prev: any[]) => [
                ...prev.filter((v: any) => v.videoId !== videoData.videoId),
                videoData,
              ]);
              localStorage.removeItem("resumari_pending_video");

              if (
                !hasTranscript &&
                data.transcript &&
                data.transcript.length > 0
              ) {
                setLoadingText("Trascrizione generata con AI");
              }
            } else {
              console.log("No video ID in response, message:", data.message);
              setLoadingText(
                "Errore: " + (data.message || "Video non trovato"),
              );
            }
          })
          .catch((err) => {
            console.error("Fetch error:", err);
            setLoadingText("Errore di connessione");
          })
          .finally(() => setLoading(false));
      }
    }

    console.log("Pending channel:", pendingChannel);
    if (pendingChannel) {
      const pending = JSON.parse(pendingChannel);
      if (pending.action === "transcribe_all") {
        setLoading(true);
        setLoadingText("Raccolta video dal canale...");

        fetch("/api/channel-videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelUrl: pending.url }),
        })
          .then((res) => res.json())
          .then(async (data) => {
            if (data.videos && data.videos.length > 0) {
              const channelVideos: any[] = [];

              for (let i = 0; i < Math.min(data.videos.length, 10); i++) {
                const video = data.videos[i];
                setLoadingText(
                  `Trascrizione ${i + 1} di ${Math.min(data.videos.length, 10)}...`,
                );

                try {
                  const res = await fetch("/api/video", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      videoUrl: `https://youtube.com/watch?v=${video.videoId}`,
                    }),
                  });
                  const videoData = await res.json();

                  if (videoData.transcript && videoData.transcript.length > 0) {
                    channelVideos.push({
                      videoId: video.videoId,
                      title: video.title,
                      channel: data.channelTitle,
                      transcript: videoData.transcript,
                      publishedAt: video.publishedAt,
                    });
                  }
                } catch (e) {
                  console.error("Error transcribing video:", video.videoId);
                }
              }

              setVideos(channelVideos);
              localStorage.removeItem("resumari_pending_channel");
            }
          })
          .finally(() => setLoading(false));
      }
    }

    const storedChats = localStorage.getItem("resumari_chats");
    if (storedChats && videos.length === 0 && !loading) {
      const videosWithTranscript: any[] = [];

      const storedMsgs = localStorage.getItem("resumari_chat_messages");
      if (storedMsgs) {
        const msgs = JSON.parse(storedMsgs);
        Object.values(msgs).forEach((chatMsgs: any) => {
          chatMsgs.forEach((msg: any) => {
            if (msg.videoId && msg.transcript && msg.transcript.length > 0) {
              const exists = videosWithTranscript.find(
                (v: any) => v.videoId === msg.videoId,
              );
              if (!exists) {
                videosWithTranscript.push({
                  videoId: msg.videoId,
                  title: msg.videoTitle || "Video senza titolo",
                  channel: msg.videoChannel || "Canale sconosciuto",
                  transcript: msg.transcript,
                  date: msg.time,
                });
              }
            }
          });
        });
      }

      if (!selectedVideo) {
        setVideos(videosWithTranscript);
      }
    }
  }, [loading, selectedVideo, videos.length]);

  useEffect(() => {
    document.title = "Trascrizioni | Resumari";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'Gestisci le tue trascrizioni video');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "?";

  const displayName = user?.name || user?.email?.split("@")[0] || "Utente";

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/chat", icon: MessageSquare, label: "Chat" },
    { href: "/videos", icon: Video, label: "Trascrizioni", active: true },
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
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
                const isActive = item.active || pathname === item.href;
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
                <div className="w-9 h-9 rounded-xl bg-linear-to-br from-purple-600 to-red-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {displayName}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 truncate">
                    {user?.email}
                  </p>
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

      <main className="flex-1 overflow-auto">
        <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-gray-100 flex items-center justify-between px-8">
          <div>
            <h1 className="text-xl font-black text-gray-900">Trascrizioni</h1>
            <p className="text-xs text-gray-500">
              Visualizza tutte le trascrizioni dei video analizzati
            </p>
          </div>
        </header>
        <div className="p-8">
          {loading ? (
            <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-lg shadow-gray-100/50 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-100 flex items-center justify-center animate-pulse">
                <FileText size={32} className="text-purple-600" />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">
                Caricamento...
              </h3>
              <p className="text-gray-500 text-sm">
                {loadingText || "Sto elaborando la richiesta"}
              </p>
            </div>
          ) : selectedVideo ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg">
              <div className="p-6 border-b border-gray-100">
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="text-purple-600 font-bold text-sm hover:underline mb-4"
                >
                  ← Torna alla lista
                </button>
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-100 mb-4">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${selectedVideo.videoId}`}
                    title={selectedVideo.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-1">
                  {selectedVideo.title}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  {selectedVideo.channel}
                </p>
                {selectedVideo.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {selectedVideo.description}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {selectedVideo.transcript &&
                  selectedVideo.transcript.length > 0 ? (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-md">
                      {selectedVideo.transcript.length} parole
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-md">
                      Nessuna trascrizione disponibile
                    </span>
                  )}
                  {selectedVideo.isGenerated && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-md">
                      AI Generata
                    </span>
                  )}
                </div>
              </div>
              {selectedVideo.transcript &&
              selectedVideo.transcript.length > 0 ? (
                <div className="p-6 max-h-[600px] overflow-y-auto">
                  <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">
                    Trascrizione completa
                  </h4>
                  <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                    {selectedVideo.transcript.map((segment: any, idx: number) => (
                      <p key={idx}>
                        <span className="text-purple-600 font-bold mr-2">
                          [{Math.floor(segment.time / 60)}:
                          {(segment.time % 60).toString().padStart(2, "0")}]
                        </span>
                        {segment.text}
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-gray-500 font-medium">
                    Questo video non ha sottotitoli automatici disponibili su
                    YouTube.
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Prova con un altro video che ha i sottotitoli abilitati.
                  </p>
                </div>
              )}
            </div>
          ) : videos.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-lg shadow-gray-100/50 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <FileText size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2">
                Nessuna trascrizione
              </h3>
              <p className="text-gray-500 mb-4">
                Analizza dei video nella chat per vedere le trascrizioni qui.
              </p>
              <Link
                href="/chat"
                className="px-5 py-2.5 bg-linear-to-r from-purple-600 to-red-500 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-purple-200 inline-block"
              >
                Vai alla Chat
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {videos.map((video: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-6 border border-gray-100 shadow-lg shadow-gray-100/50 hover:shadow-xl hover:shadow-purple-500/5 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-48 h-28 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                      <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${video.videoId}`}
                        title={video.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-900 mb-1 line-clamp-2">
                        {video.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-3">
                        {video.channel}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-md">
                          {video.transcript.length} segmenti
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
