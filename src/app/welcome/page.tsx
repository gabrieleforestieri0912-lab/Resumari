"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Globe, CheckCircle2, Zap, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function WelcomePage() {
  useEffect(() => {
    document.title = "Benvenuto | Resumari";
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8"
          >
            <CheckCircle2 size={40} />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-gray-900 mb-6"
          >
            Resumari è pronta! 🚀
          </motion.h1>

          <p className="text-xl text-gray-600 mb-12">
            L'estensione è stata installata correttamente. Ecco come iniziare a risparmiare ore di tempo.
          </p>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {[
              {
                title: "Apri YouTube",
                desc: "Vai su un video che ti interessa.",
                icon: <Globe className="text-blue-500" />,
              },
              {
                title: "Clicca 'Trascrivi'",
                desc: "Trovi il pulsante Resumari sotto il video.",
                icon: <Zap className="text-yellow-500" />,
              },
              {
                title: "Ottieni il Riassunto",
                desc: "Il pannello laterale farà tutto il lavoro per te.",
                icon: <CheckCircle2 className="text-green-500" />,
              },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="p-6 rounded-3xl bg-gray-50 border border-gray-100"
              >
                <div className="mb-4 flex justify-center">{step.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-500">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <Link
            href="/chat"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gray-900 text-white font-black rounded-2xl hover:scale-105 transition-transform"
          >
            Vai alla Dashboard
            <ArrowRight size={20} />
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
