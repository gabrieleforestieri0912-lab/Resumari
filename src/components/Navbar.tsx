/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  LayoutDashboard,
  User,
  Settings,
  ChevronDown,
  Menu,
  X,
  Key,
  Server,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { clearSession } from "@/lib/session";

interface UserData {
  name?: string;
  email?: string;
  picture?: string;
}

interface NavLink {
  href: string;
  label: string;
}

interface UserMenuItem {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
}

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    setUser(storedUser ? JSON.parse(storedUser) : null);
  }, []);

  useEffect(() => {
    function handleAuthChange(e: CustomEvent) {
      if (e.detail) {
        setUser(e.detail.user);
      } else {
        setUser(null);
      }
    }
    window.addEventListener("resumari-auth-changed", handleAuthChange as EventListener);
    return () => window.removeEventListener("resumari-auth-changed", handleAuthChange as EventListener);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearSession();
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    setUser(null);
    setIsOpen(false);
    router.push("/login");
  };

  const userInitial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "?";

  const displayName = user?.name || user?.email?.split("@")[0] || "Utente";

  const navLinks: NavLink[] = [
    { href: "/tools", label: "Free Tools" },
    { href: "/#steps", label: "Come funziona" },
    { href: "/#features", label: "Funzionalità" },
    { href: "/#pricing", label: "Prezzi" },
    { href: "/#faq", label: "FAQ" },
  ];

  const userMenuItems: UserMenuItem[] = [
    { href: "/chat", icon: LayoutDashboard, label: "Chat" },
    { href: "/api-keys", icon: Key, label: "API Keys" },
    { href: "/mcp", icon: Server, label: "MCP Server" },
    { href: "/profile", icon: User, label: "Profilo" },
    { href: "/settings", icon: Settings, label: "Impostazioni" },
  ];

  return (
    <nav className="fixed top-3 left-3 right-3 md:top-4 md:left-6 md:right-6 h-16 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl z-50 flex items-center justify-between px-5 md:px-8 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg shadow-black/5">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2 cursor-pointer group">
          <img
            src="/resumari.png"
            alt="Resumari"
            className="w-10 h-10 rounded-xl group-hover:scale-105 transition-transform"
          />
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50/80 dark:hover:bg-white/10 rounded-xl transition-all"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        {user ? (
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="hidden md:flex items-center gap-2 px-1 py-1 rounded-4xl bg-linear-to-r from-purple-600 to-red-600 hover:scale-[1.02] transition-all shadow-lg shadow-purple-500/25"
            >
              <span className="block px-7 py-2 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white text-sm font-bold rounded-[1.8rem] hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">
                Chat AI
              </span>
            </Link>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-purple-50 dark:hover:bg-white/10 transition-colors"
              >
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt="Profilo"
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-100"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-linear-to-br from-purple-600 to-red-500 text-white flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-purple-100">
                    {userInitial}
                  </div>
                )}
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-3 w-64 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 overflow-hidden z-50"
                  >
                    <div className="px-5 py-4 border-b border-gray-50 dark:border-zinc-800">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                        Account
                      </p>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>

                    <div className="py-2 px-3">
                      {userMenuItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 rounded-xl hover:bg-purple-50 dark:hover:bg-white/10 hover:text-purple-600 dark:hover:text-purple-400 transition-all"
                        >
                          <item.icon size={18} />
                          {item.label}
                        </Link>
                      ))}
                    </div>

                    <div className="py-2 px-3 border-t border-gray-50 dark:border-zinc-800">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-all text-left"
                      >
                        <LogOut size={18} />
                        Esci
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              Accedi
            </Link>
            <Link
              href="/signup"
              className="hidden md:flex items-center px-1 py-1 bg-linear-to-r from-purple-600 to-red-600 rounded-4xl hover:scale-[1.02] transition-all shadow-lg shadow-purple-500/25"
            >
              <span className="block px-6 py-2 bg-white dark:bg-zinc-950 text-gray-900 dark:text-white text-sm font-bold rounded-[1.8rem] hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors">Inizia</span>
            </Link>
          </div>
        )}

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden absolute top-16 left-0 right-0 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 shadow-xl p-4 space-y-2"
            ref={mobileMenuRef}
          >
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-5 py-3.5 text-base font-semibold text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-white/10 rounded-xl transition-all"
              >
                {item.label}
              </Link>
            ))}
            {!user && (
              <div className="pt-2 mt-2 border-t border-gray-100 dark:border-zinc-800 flex gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 px-5 py-3 text-center text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl transition-colors"
                >
                  Accedi
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 px-5 py-3 text-center bg-linear-to-r from-purple-600 to-red-600 text-white text-sm font-bold rounded-xl"
                >
                  Inizia
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
