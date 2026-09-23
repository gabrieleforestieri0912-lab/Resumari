"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Zap, Shield, Sparkles } from "lucide-react";
import { useRef } from "react";
import Link from "next/link";
import AddToChromeButton from "./AddToChromeButton";

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

  // Solo canali ufficiali richiesti: programmazione, Y Combinator, Dr. Huberman, produttività/podcast — tutti diversi
  const ytThumbs = [
    // Programmazione ufficiale
    "DHjqpvDnNGE", "PkZNo7MFNFg", "R2A9WYBl2SI", "eIrMbAQSU34", "b0EF0X4dYA8", "gmnBfG_cJVM",
    // Y Combinator
    "QOOKin2F230", "0lJKucu6lBE", "nma8FBjVz9o", "CBYhVcO4WgI", "H9M02vSO0W0", "3Jv1m5yR8B0",
    // Dr. Huberman
    "QmOF0crdyRU", "H51Hta5a3GY", "9LSY8qHPE1Y", "aWGLpLR6q4o", "7b5X2u0d9yg", "oKQz7s2r0p1",
    // Produttività / Podcast vari
    "gEYQFJkhg1o", "DUn6luQjewA", "L_Guz73e6fw", "5qap5aO4i9A", "iWWoQlJ0G0k", "VpI-yyqJ7Yg",
    "Rb0UmrCXxVA", "U8smiWOT530", "hT_nvWreIhg", "fRh_vgS2dFE", "airkSzvY9zc", "ZXsQAXx_ao0",
    "2Xc9gXyf2G4", "jNQXAC9IVRw", "9bZkp7q19f0", "k85mRPqvMbE", "5MgBikgcWnY", "L0MK7qz13bU",
    "LXb3EKWsInQ", "dQw4w9WgXcQ", "9U4Aj1j0n1A", "o5Y7J0j9AB0",
  ];
  const rows = [
    ytThumbs.slice(0, 6),
    ytThumbs.slice(6, 12),
    ytThumbs.slice(12, 18),
    ytThumbs.slice(18, 24),
    ytThumbs.slice(24, 30),
    ytThumbs.slice(30, 36),
    ytThumbs.slice(36, 42),
  ];

  return (
    <section ref={sectionRef} className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-28 pb-16 md:pt-44 md:pb-20 overflow-hidden bg-white dark:bg-zinc-950" style={{ position: 'relative' }}>
      {/* Pannello a griglia con copertine YT — copre TUTTA la hero, brick-wall, scroll orizzontale */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none" aria-hidden>
        <div className="absolute inset-0 flex flex-col justify-center gap-2 md:gap-3 py-4 opacity-100">
          {rows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className="flex gap-3 md:gap-4 w-max will-change-transform"
              style={{
                marginLeft: rowIdx % 2 === 1 ? "-86px" : "0px",
                animation: `hero-scroll 22s linear infinite`,
                animationDelay: `${rowIdx * -3.2}s`,
              }}
            >
              {[...row, ...row].map((vid, i) => (
                <div
                  key={`${rowIdx}-${i}-${vid}`}
                  className="shrink-0 w-[132px] md:w-[156px] lg:w-[172px] aspect-video rounded-lg overflow-hidden bg-white dark:bg-zinc-800 shadow-md ring-1 ring-black/10 dark:ring-white/10 opacity-95"
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
          ))}
        </div>
        {/* Velo leggero per leggibilità — griglia mantenuta ben visibile e in scorrimento orizzontale */}
        <div className="absolute inset-0 bg-white/55 dark:bg-zinc-950/45 backdrop-blur-[0.5px]" />
      </div>

      <style>{`@keyframes hero-scroll { from { transform: translate3d(0,0,0); } to { transform: translate3d(-50%,0,0); } } @media (prefers-reduced-motion: reduce) { [style*="hero-scroll"] { animation: none !important; } }`}</style>

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
          <AddToChromeButton variant="hero" />
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          variants={itemVariants}
          className="mt-16 flex flex-wrap justify-center gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-500"
        >
          <div className="flex items-center gap-2 font-bold text-sm tracking-tighter uppercase">
            <Zap size={18} fill="currentColor" /> Turbo Processing
          </div>
          <div className="flex items-center gap-2 font-bold text-sm tracking-tighter uppercase">
            <Shield size={18} fill="currentColor" /> Secure Data
          </div>
          <div className="flex items-center gap-2 font-bold text-sm tracking-tighter uppercase">
            <Sparkles size={18} fill="currentColor" /> AI Powered
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
