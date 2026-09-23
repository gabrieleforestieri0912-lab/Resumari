'use client'

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/components/LanguageContext";
import FormPanel from "@/components/auth/FormPanel";
import DescriptionPanel from "@/components/auth/DescriptionPanel";

type AuthView = 'login' | 'register';

export default function AuthPage() {
  const { locale } = useLanguage();
  const searchParams = useSearchParams();
  const [view, setView] = useState<AuthView>('login');

  const urlMode = searchParams.get('mode');
  const [prevMode, setPrevMode] = useState<string | null>(urlMode);
  if (prevMode !== urlMode) {
    setPrevMode(urlMode);
    if (urlMode === 'signup') setView('register');
  }

  useEffect(() => {
    document.title = view === 'login' ? "Accedi | Resumari" : "Registrati | Resumari";
  }, [view]);

  const isLogin = view === 'login';

  const switchView = () => {
    setView((v) => (v === 'login' ? 'register' : 'login'));
  };

  // Varianti solo framer-motion: slide orizzontale desktop, verticale mobile via CSS media query gestita da motion con custom
  const formVariants = {
    initial: (isLogin: boolean) => ({ x: isLogin ? -24 : 24, opacity: 0 }),
    animate: { x: 0, opacity: 1 },
    exit: (isLogin: boolean) => ({ x: isLogin ? 24 : -24, opacity: 0 }),
  };

  const descVariants = {
    initial: (isLogin: boolean) => ({ x: isLogin ? 24 : -24, opacity: 0 }),
    animate: { x: 0, opacity: 1 },
    exit: (isLogin: boolean) => ({ x: isLogin ? -24 : 24, opacity: 0 }),
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex overflow-hidden" aria-live="polite" aria-label={isLogin ? "Pagina di login" : "Pagina di registrazione"}>
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 font-black text-xl text-purple-600 hover:scale-105 transition-transform"
      >
        <Image src="/resumari.png" alt="Logo" width={32} height={32} className="w-8 h-8" priority />
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-red-600">
          Resumari
        </span>
      </Link>

      <div className={`flex w-full overflow-hidden ${!isLogin ? 'flex-row-reverse md:flex-row-reverse flex-col' : 'flex-row flex-col'} md:flex-row`}>
        <AnimatePresence mode="wait" custom={isLogin}>
          <motion.div
            key={`form-${view}`}
            custom={isLogin}
            variants={formVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.77, 0, 0.175, 1] }}
            className="w-full md:w-1/2 flex items-center justify-center p-6 min-h-[50vh] md:min-h-screen"
          >
            <FormPanel view={view} onSwitch={switchView} locale={locale} />
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait" custom={isLogin}>
          <motion.div
            key={`desc-${view}`}
            custom={isLogin}
            variants={descVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.77, 0, 0.175, 1] }}
            className="w-full md:w-1/2 hidden md:flex md:min-h-screen bg-gray-50 dark:bg-zinc-900 relative overflow-hidden items-center justify-center"
          >
            <DescriptionPanel view={view} locale={locale} />
          </motion.div>
        </AnimatePresence>

        {/* Mobile description: framer-motion verticale */}
        <div className="md:hidden w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={`desc-mobile-${view}`}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-[180px] bg-gray-50 dark:bg-zinc-900 relative overflow-hidden flex items-center justify-center"
            >
              <DescriptionPanel view={view} locale={locale} compact />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
