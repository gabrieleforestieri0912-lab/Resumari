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

        {/* Esempio reale prima/dopo */}
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800"
          >
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Prima — 12 minuti di video</p>
            <div className="h-64 overflow-y-auto text-xs text-gray-600 dark:text-zinc-400 leading-relaxed bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 font-mono">
              [00:00] Ciao oggi parliamo di come funziona il cervello e perché la luce del mattino è fondamentale... [02:34] Il protocollo prevede esposizione 5-10 minuti... [05:12] Dati da studi su 2000 soggetti mostrano miglioramento del sonno... [09:40] Conclusioni e takeaway pratici...
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Trascrizione completa estratta dal video</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-purple-600 to-red-600 rounded-2xl p-6 text-white"
          >
            <p className="text-xs font-black text-white/70 uppercase tracking-widest mb-3">Dopo — riassunto + chat</p>
            <h4 className="font-black mb-2">Riassunto (3 punti)</h4>
            <ul className="text-sm leading-relaxed space-y-1 mb-4">
              <li>• Luce mattutina 5-10 min migliora sonno e focus</li>
              <li>• Evidenza su 2000 soggetti</li>
              <li>• Protocollo pratico giornaliero</li>
            </ul>
            <div className="bg-white/10 rounded-xl p-3 text-xs">Chat: &quot;Quando fare l&apos;esposizione?&quot; → Risposta con <span className="underline">00:12</span> timestamp cliccabile</div>
          </motion.div>
        </div>

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
            <span className="block px-8 py-3 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white text-sm font-bold rounded-[1.8rem] transition-colors group-hover:bg-gray-50 dark:group-hover:bg-zinc-900">
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
