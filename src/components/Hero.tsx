"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Zap, Shield, Sparkles } from "lucide-react";
import { useRef } from "react";
import Link from "next/link";
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
        className="max-w-7xl min-[1920px]:max-w-[1680px] min-[2560px]:max-w-[1920px] w-full flex flex-col items-center relative z-10"
      >
        {/* Title */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl md:text-7xl font-black leading-[1.1] text-gray-900 dark:text-gray-100 tracking-tight"
        >
          Smettila di rincorrere il tempo.{" "}
          <span className="relative inline-block">
            <span className="bg-clip-text text-transparent bg-linear-to-r from-purple-600 via-red-500 to-red-600">
              Trascrivi ore di video
            </span>

          </span>
          <br />
          <span className="text-gray-900 dark:text-gray-100">
            in pochi{" "}
            <span className="inline-block px-4 -mx-2 italic text-glow-pulse py-1">
              semplici secondi
            </span>
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="mt-8 text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-3xl leading-relaxed font-semibold tracking-tight"
        >
          Basta subire il sovraccarico di informazioni. La nostra IA distilla i
          concetti chiave da video YouTube e documenti infiniti, consegnandoti
          solo la conoscenza che conta per il tuo successo.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="mt-10 flex flex-col sm:flex-row flex-wrap gap-4 w-full max-w-2xl justify-center items-center"
        >
          <Link
            href="/chat"
            aria-label="Inizia ora a riassumere i tuoi video gratuitamente"
            className="group flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-white font-black text-base bg-linear-to-r from-purple-600 to-red-600 hover:from-purple-700 hover:to-red-700 transition-all transform hover:-translate-y-1 hover:shadow-2xl active:scale-95 shadow-xl shadow-purple-500/25"
          >
            Prova Gratis
            <ArrowRight
              size={18}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
        </motion.div>

        {/* Badge rimossi in Fase 1 — sostituiti da fatti verificabili in hero subtitle se necessario */}
      </motion.div>
    </section>
  );
}
