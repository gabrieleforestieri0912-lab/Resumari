"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1500;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [isInView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

interface Stats {
  videos: number;
  users: number;
  chats: number;
}

interface StatItem {
  value: number;
  label: string;
  suffix: string;
}

export default function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data: Stats) => setStats(data))
      .catch(() => {});
  }, []);

  const items: StatItem[] = stats
    ? [
        { value: stats.videos, label: "Video Trascritti", suffix: "+" },
        { value: stats.users, label: "Utenti Registrati", suffix: "+" },
        { value: stats.chats, label: "Conversazioni", suffix: "+" },
        { value: 4.9, label: "Valutazione Media", suffix: "/5" },
      ]
    : [];

  if (!stats) return null;

  return (
    <section className="w-full py-12 bg-white border-y border-gray-100 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(123,47,247,0.03)_0%,transparent_60%)] pointer-events-none" />
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {items.map((item, index) => {
            const isDecimal = item.value % 1 !== 0;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                  {isDecimal ? (
                    <span>4,9</span>
                  ) : (
                    <AnimatedCounter target={item.value} suffix={item.suffix} />
                  )}
                </div>
                <div className="text-sm text-gray-500 font-semibold mt-1.5">
                  {item.label}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
