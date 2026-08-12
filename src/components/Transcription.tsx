import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Sparkles, Users } from "lucide-react";
import { SVGProps } from "react";

const Youtube = ({
  size = 24,
  className = "",
  ...props
}: SVGProps<SVGSVGElement> & { size?: number }) => (
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

function getYouTubeVideoId(url: string): string | null {
  const regExp =
    /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }
  return null;
}

function isYouTubeChannel(url: string): boolean {
  return (
    url.includes("/@") || url.includes("/channel/") || url.includes("/user/")
  );
}

export default function TranscriptionSection() {
  const [url, setUrl] = useState("");
  const [mode, setRouteMode] = useState<"video" | "channel">("video");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const videoId = getYouTubeVideoId(url);
    console.log("URL:", url, "Video ID:", videoId);
    const isChannel = isYouTubeChannel(url);

    if (mode === "video") {
      if (isChannel) {
        setError(
          "Hai inserito un link di canale. Per trascrivere un singolo video, seleziona 'Singolo Video' e inserisci un link di video.",
        );
        return;
      }
      if (videoId) {
        console.log("Saving to localStorage with videoId:", videoId);
        localStorage.setItem(
          "resumari_pending_video",
          JSON.stringify({
            videoId,
            action: "transcribe_full",
          }),
        );
        router.push("/videos");
      } else {
        setError("Inserisci un link YouTube valido.");
      }
    } else {
      if (!isChannel) {
        setError(
          "Hai inserito un link di video. Per trascrivere un intero canale, seleziona 'Intero Canale' e inserisci un link di canale (es. @nomecanale).",
        );
        return;
      }
      if (isChannel) {
        setError("");
        localStorage.setItem(
          "resumari_pending_channel",
          JSON.stringify({
            url,
            action: "transcribe_all",
          }),
        );
        router.push("/videos");
      }
    }
  };

  return (
    <section
      id="transcription"
      className="w-full px-6 py-16 bg-gradient-to-b from-white via-[#f5f0ff]/20 to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950 relative overflow-hidden"
    >
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-125 h-125 bg-purple-500/10 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-0 left-0 w-125 h-125 bg-red-500/10 rounded-full blur-[100px] -z-10" />

      <div className="max-w-4xl mx-auto">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="w-16 h-1 bg-gradient-to-r from-purple-600 to-red-500 rounded-full mb-4 mx-auto" />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-sm text-purple-600 text-xs font-bold uppercase tracking-wider mb-6">
            <Youtube size={14} fill="currentColor" />
            Prova Gratuita
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
            Trascrivi contenuti <br />
            <span className="text-purple-600 italic">in pochi secondi</span>
          </h2>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-10 md:p-16 shadow-2xl shadow-purple-500/5 border border-white dark:border-zinc-800"
        >
          <div className="max-w-2xl mx-auto text-center">
            {/* Mode Switcher */}
            <div className="flex justify-center mb-10">
              <div className="bg-gray-100 dark:bg-zinc-800 p-1 rounded-2xl flex gap-1">
                <button
                  onClick={() => setRouteMode("video")}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === "video" ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
                >
                  Singolo Video
                </button>
                <button
                  onClick={() => setRouteMode("channel")}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === "channel" ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 shadow-sm" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
                >
                  Intero Canale
                </button>
              </div>
            </div>

            <h3 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-4">
              {mode === "video" ? "Analizza un Video" : "Analizza un Canale"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 font-medium mb-12">
              {mode === "video"
                ? "Incolla il link di un video YouTube per ottenere la trascrizione."
                : "Incolla il link di un canale (es. @hubermanlab) per trascrivere tutti i video."}
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-purple-600 transition-colors">
                  {mode === "video" ? (
                    <Youtube size={20} />
                  ) : (
                    <Users size={20} />
                  )}
                </div>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError("");
                  }}
                  placeholder={
                    mode === "video"
                      ? "https://youtube.com/watch?v=..."
                      : "https://youtube.com/@nomecanale"
                  }
                  className="w-full pl-14 pr-6 py-5 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded-2xl text-sm font-medium text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-4 focus:ring-purple-500/5 focus:border-purple-200 dark:focus:border-purple-700 transition-all"
                />
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gray-900 dark:bg-purple-600 dark:hover:bg-purple-500 text-white rounded-2xl font-black text-base hover:bg-black transition-all transform hover:-translate-y-1 shadow-xl shadow-gray-200 dark:shadow-none active:scale-95"
              >
                <Search size={20} />
                {mode === "video" ? "Trascrivi Video" : "Trascrivi Canale"}
              </button>
            </form>

            <div className="mt-8 flex items-center justify-center gap-6 opacity-40">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-900 dark:text-gray-300">
                <Sparkles size={12} /> No Account Req.
              </div>
              <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-zinc-600" />
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-900 dark:text-gray-300">
                <Sparkles size={12} /> IA Unlimited
              </div>
            </div>
          </div>
        </motion.div>

        {/* Mini CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-16 flex flex-col items-center text-center"
        >
          <Link
            href="/videos"
            className="group relative px-1 py-1 rounded-4xl bg-linear-to-r from-purple-600 to-red-600 transition-all hover:scale-[1.02] shadow-lg shadow-purple-500/25 cursor-pointer"
          >
            <span className="block px-8 py-3 bg-white text-gray-900 text-sm font-bold rounded-[1.8rem] transition-colors group-hover:bg-gray-50">
              Vedi le Tue Trascrizioni
            </span>
          </Link>
          <p className="mt-6 text-gray-500 dark:text-gray-400 font-bold text-xs tracking-tight">
            Tutte le tue trascrizioni salvate in un unico posto
          </p>
        </motion.div>
      </div>
    </section>
  );
}
