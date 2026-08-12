"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";

// Returns false on the server and during hydration, then flips to true on
// the client. Reading the theme before hydration would cause a mismatch.
const emptySubscribe = () => () => {};
const getServerSnapshot = () => false;
const getClientSnapshot = () => true;

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Passa al tema chiaro" : "Passa al tema scuro"}
      title={isDark ? "Tema chiaro" : "Tema scuro"}
      className="p-2.5 rounded-xl bg-transparent text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-white/10 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
    >
      {mounted ? (
        isDark ? <Sun size={20} /> : <Moon size={20} />
      ) : (
        <span className="w-5 h-5 block" />
      )}
    </button>
  );
}
