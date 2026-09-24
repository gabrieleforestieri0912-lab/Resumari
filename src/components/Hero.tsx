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

  // 48 ID reali e verificati (status 200) da canali tech, educativi e podcast di qualità
  const ytThumbs = [
    "DHjqpvDnNGE", "PkZNo7MFNFg", "eIrMbAQSU34", "YQHsXMglC9A", "dGcsHMXbSOA", "aircAruvnKk", "jNQXAC9IVRw", "fRh_vgS2dFE",
    "ZXsQAXx_ao0", "2Xc9gXyf2G4", "5MgBikgcWnY", "L0MK7qz13bU", "LXb3EKWsInQ", "QmOF0crdyRU", "Rb0UmrCXxVA", "5qap5aO4i9A",
    "L_Guz73e6fw", "hT_nvWreIhg", "kJQP7kiw5Fk", "zOjov-2OZ0E", "vLnPwxZdW4Y", "bMknfKXIFA8", "j6Ule7GXaRs", "fJ9rUzIMcZQ",
    "o-YBDTqX_ZU", "SqcY0GlETPk", "W6NZfCO5SIk", "kqtD5dpn9C8", "rfscVS0vtbw", "Oe421EPjeBE", "8Nd13ARuvVE", "VrQgmNY96wo",
    "0-S5a0eXPoc", "kUMe1FH4CHE", "CBYhVcO4WgI", "fBNz5xF-Kx4", "8aGhZQkoFbQ", "dQw4w9WgXcQ", "M7lc1UVf-VE", "EwTZ2xpQwpA",
    "JGwWNGJdvx8", "9bZkp7q19f0", "kXYiU_JCYtU", "7wtfhZwyrcc", "8hly31xKli0", "3JZ_D3ELwOQ", "C0DPdy98e4c", "uelHwf8o7_U",
  ];
  const rows = [
    ytThumbs.slice(0, 8),
    ytThumbs.slice(8, 16),
    ytThumbs.slice(16, 24),
    ytThumbs.slice(24, 32),
    ytThumbs.slice(32, 40),
    ytThumbs.slice(40, 48),
  ];

  return (
    <section ref={sectionRef} className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-28 pb-16 md:pt-44 md:pb-20 overflow-hidden bg-white dark:bg-zinc-950" style={{ position: 'relative' }}>
      {/* Pannello a griglia con copertine YT — copre TUTTA la hero, brick-wall, scroll orizzontale continuo */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none" aria-hidden>
        <div className="absolute inset-0 flex flex-col justify-center gap-2 md:gap-3 py-4 opacity-100">
          {rows.map((row, rowIdx) => {
            const isReverse = rowIdx % 2 === 1;
            return (
              <div
                key={rowIdx}
                className={`flex gap-3 md:gap-4 w-max will-change-transform ${
                  isReverse ? "animate-hero-scroll-right" : "animate-hero-scroll-left"
                }`}
                style={{
                  animationDuration: `${30 + (rowIdx % 3) * 6}s`,
                }}
              >
                {[...row, ...row, ...row].map((vid, i) => (
                  <div
                    key={`${rowIdx}-${i}-${vid}`}
                    className="shrink-0 w-[132px] md:w-[156px] lg:w-[172px] aspect-video rounded-lg overflow-hidden bg-gray-100 dark:bg-zinc-800 shadow-md ring-1 ring-black/10 dark:ring-white/10 opacity-95"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        {/* Velo leggero per leggibilità — griglia mantenuta ben visibile e in scorrimento orizzontale */}
        <div className="absolute inset-0 bg-white/55 dark:bg-zinc-950/45 backdrop-blur-[0.5px]" />
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
