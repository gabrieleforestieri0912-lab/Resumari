"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Zap, Shield, Sparkles } from "lucide-react";
import { useRef } from "react";
import Link from "next/link";

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

  return (
    <section ref={sectionRef} className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-32 pb-24 overflow-hidden bg-white" style={{ position: 'relative' }}>
      {/* Background Decorative Blobs with Parallax */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <motion.div style={{ y: blob1Y }} className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-100/50 rounded-full blur-[140px] animate-pulse" />
        <motion.div style={{ y: blob2Y }} className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-50/60 rounded-full blur-[120px]" />
        <motion.div style={{ y: blob3Y }} className="absolute top-[20%] right-[15%] w-[30%] h-[30%] bg-blue-50/40 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] bg-size-[32px_32px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl w-full flex flex-col items-center relative z-10"
      >
        {/* Title */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl md:text-7xl font-black leading-[1.1] text-gray-900 tracking-tight"
        >
          Smettila di rincorrere il tempo.{" "}
          <span className="relative inline-block">
            <span className="bg-clip-text text-transparent bg-linear-to-r from-purple-600 via-red-500 to-red-600">
              Trascrivi ore di video
            </span>

          </span>
          <br />
          <span className="text-gray-900">
            in pochi{" "}
            <span className="inline-block px-4 -mx-2 italic bg-clip-text text-transparent bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 py-1">
              semplici secondi
            </span>
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="mt-8 text-lg md:text-xl text-gray-500 max-w-3xl leading-relaxed font-semibold tracking-tight"
        >
          Basta subire il sovraccarico di informazioni. La nostra IA distilla i
          concetti chiave da video YouTube e documenti infiniti, consegnandoti
          solo la conoscenza che conta per il tuo successo.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="mt-10 flex flex-col sm:flex-row gap-4 w-full max-w-lg justify-center"
        >
          <Link
            href="/chat"
            aria-label="Inizia ora a riassumere i tuoi video gratuitamente"
            className="group flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-white font-black text-base bg-gray-900 hover:bg-black transition-all transform hover:-translate-y-1 hover:shadow-2xl active:scale-95 shadow-xl shadow-gray-200"
          >
            Prova Gratis
            <ArrowRight
              size={18}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Link>
          <a
            href="#demo"
            className="group flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-gray-700 font-black text-base bg-white border-2 border-gray-200 hover:border-purple-300 hover:text-purple-700 transition-all transform hover:-translate-y-1 hover:shadow-xl active:scale-95"
          >
            Scopri la demo
          </a>
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
