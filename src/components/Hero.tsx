"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function HeroInput() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const ytRegex = /(youtube\.com|youtu\.be)/i;
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    if (ytRegex.test(v)) router.push(`/chat?video=${encodeURIComponent(v)}`);
    else router.push("/chat");
  };
  return (
    <form onSubmit={onSubmit} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) router.push("/chat"); }}
      className={`flex items-center gap-2 p-2 rounded-2xl border bg-white dark:bg-zinc-900 shadow-lg ${dragOver ? "border-purple-400 ring-2 ring-purple-200" : "border-gray-200 dark:border-zinc-800"}`}>
      <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Incolla un link YouTube (video o canale) o trascina qui un PDF/TXT" className="flex-1 px-4 py-3 bg-transparent outline-none text-sm font-medium" />
      <button type="submit" className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-black text-sm hover:bg-purple-700 transition-colors">Analizza</button>
    </form>
  );
}
// D1: estensione non pubblicata → CTA Chrome nascosta in hero (verrà gestita in pricing)

export default function Hero() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" as const },
    },
  };

  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const blob1Y = useTransform(scrollYProgress, [0, 1], ["-5%", "5%"]);
  const blob2Y = useTransform(scrollYProgress, [0, 1], ["5%", "-5%"]);
  const blob3Y = useTransform(scrollYProgress, [0, 1], ["0%", "8%"]);

  // Fase 1: max 6 in vista, solo video reali pertinenti verificati, no duplicati — 6 unici YT educativi
  const ytThumbs = [
    "DHjqpvDnNGE", // Fireship - 100s
    "PkZNo7MFNFg", // freeCodeCamp
    "QOOKin2F230", // Y Combinator
    "QmOF0crdyRU", // Huberman Lab
    "gEYQFJkhg1o", // Lex Fridman
    "LXb3EKWsInQ", // Veritasium
  ];

  return (
    <section ref={sectionRef} className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-28 pb-16 md:pt-44 md:pb-20 overflow-hidden bg-white dark:bg-zinc-950" style={{ position: 'relative' }}>
      {/* Pannello a griglia — Fase 1: 6 miniature reali pertinenti, no duplicati, lazy, max 6 in vista */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none" aria-hidden>
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.18] dark:opacity-[0.14]">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4 max-w-3xl px-6">
            {ytThumbs.map((vid) => (
              <div
                key={vid}
                className="shrink-0 w-full aspect-video rounded-lg overflow-hidden bg-white dark:bg-zinc-800 shadow-sm ring-1 ring-black/5 dark:ring-white/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                  draggable={false}
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${vid}/mqdefault.jpg`; }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 bg-white/75 dark:bg-zinc-950/70 backdrop-blur-[0.5px]" />
      </div>

      {/* Blobs decorativi dietro la griglia */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none opacity-40">
        <motion.div style={{ y: blob1Y }} className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-100/40 dark:bg-purple-900/18 rounded-full blur-[140px] animate-pulse" />
        <motion.div style={{ y: blob2Y }} className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-50/40 dark:bg-red-900/16 rounded-full blur-[120px]" />
        <motion.div style={{ y: blob3Y }} className="absolute top-[20%] right-[15%] w-[30%] h-[30%] bg-blue-50/30 dark:bg-blue-900/14 rounded-full blur-[100px]" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-3xl w-full flex flex-col items-center relative z-10"
      >
        <motion.h1
          variants={itemVariants}
          className="text-4xl md:text-5xl font-black leading-tight text-gray-900 dark:text-gray-100 tracking-tight"
        >
          Video, documenti e canali YouTube: <span className="bg-clip-text text-transparent bg-linear-to-r from-purple-600 via-red-500 to-red-600">riassumi, trascrivi e chatta</span> con qualsiasi contenuto.
        </motion.h1>
        <motion.p
          variants={itemVariants}
          className="mt-4 text-base md:text-lg text-gray-500 dark:text-gray-400 max-w-2xl leading-relaxed font-medium"
        >
          Incolla un link o trascina un file — l&apos;IA estrae riassunto, trascrizione (video) e chat contestuale.
        </motion.p>

        {/* D8: unico campo link + drag&drop file */}
        <motion.div variants={itemVariants} className="mt-8 w-full">
          <HeroInput />
          <div className="mt-3 flex justify-center gap-2">
            <span className="px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs font-bold text-purple-700 dark:text-purple-300">Video</span>
            <span className="px-3 py-1 rounded-full bg-gray-50 dark:bg-zinc-800 border text-xs font-bold text-gray-600 dark:text-zinc-300">Documento</span>
            <span className="px-3 py-1 rounded-full bg-gray-50 dark:bg-zinc-800 border text-xs font-bold text-gray-600 dark:text-zinc-300">Canale</span>
          </div>
          <p className="mt-3 text-xs text-gray-400 dark:text-zinc-500 font-medium">10 crediti gratis con account — accedi per iniziare. Nessun costo finché non usi i crediti.</p>
        </motion.div>

        <motion.div variants={itemVariants} className="mt-6">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-zinc-900 font-black text-sm hover:opacity-90 transition-opacity"
          >
            Vai alla chat <ArrowRight size={16} />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
