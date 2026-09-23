"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const NO_PAGE_TRANSITION = ["/", "/auth", "/login", "/signup"];

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Landing e pagine di accesso usano solo le loro animazioni framer-motion interne:
  // evitare il fade globale che crea doppia animazione.
  const skipTransition = NO_PAGE_TRANSITION.some(
    (p) => pathname === p || pathname.startsWith(`${p}?`) || pathname.startsWith(`${p}/`)
  );
  if (skipTransition) return <>{children}</>;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.15, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
