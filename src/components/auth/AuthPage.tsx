'use client'

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageContext";
import FormPanel from "@/components/auth/FormPanel";
import DescriptionPanel from "@/components/auth/DescriptionPanel";

type AuthView = 'login' | 'register';
type AnimationState = 'idle' | 'leaving' | 'entering';

export default function AuthPage() {
  const { locale } = useLanguage();
  const searchParams = useSearchParams();
  const [view, setView] = useState<AuthView>('login');
  const [animationState, setAnimationState] = useState<AnimationState>('idle');
  const pendingViewRef = useRef<AuthView | null>(null);

  // Sync the initial view from the URL by adjusting state during render
  // (avoids calling setState synchronously inside an effect).
  const urlMode = searchParams.get('mode');
  const [prevMode, setPrevMode] = useState<string | null>(urlMode);
  if (prevMode !== urlMode) {
    setPrevMode(urlMode);
    if (urlMode === 'signup') setView('register');
  }

  useEffect(() => {
    document.title = "Accedi | Resumari";
  }, []);

  const switchView = useCallback(() => {
    if (animationState !== 'idle') return;
    pendingViewRef.current = view === 'login' ? 'register' : 'login';
    setAnimationState('leaving');
  }, [animationState, view]);

  useEffect(() => {
    if (animationState === 'leaving') {
      const timer = setTimeout(() => {
        if (pendingViewRef.current) {
          setView(pendingViewRef.current);
          pendingViewRef.current = null;
        }
        setAnimationState('entering');
      }, 400);
      return () => clearTimeout(timer);
    }
    if (animationState === 'entering') {
      const timer = setTimeout(() => {
        setAnimationState('idle');
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [animationState]);

  const isLogin = view === 'login';
  const formSide = isLogin ? 'left' : 'right';
  const descSide = isLogin ? 'right' : 'left';

  return (
    <div className={`min-h-screen bg-white dark:bg-zinc-950 flex overflow-hidden auth-container`} aria-live="polite" aria-label={isLogin ? "Pagina di login" : "Pagina di registrazione"}>
      <Link
        href="/"
        className="absolute top-6 left-6 z-20 flex items-center gap-2 font-black text-xl text-purple-600 hover:scale-105 transition-transform"
      >
        <img src="/resumari.png" alt="Logo" className="w-8 h-8" />
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-red-600">
          Resumari
        </span>
      </Link>

      <div className={`auth-wrapper ${!isLogin ? 'auth-wrapper-register' : ''}`}>
        <FormPanel
          view={view}
          animationState={animationState}
          side={formSide}
          onSwitch={switchView}
          locale={locale}
        />
        <DescriptionPanel
          view={view}
          animationState={animationState}
          side={descSide}
          locale={locale}
        />
      </div>
    </div>
  );
}
