"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function ExtensionCTA() {
  return (
    <section className="py-16 px-6 relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-50/30 to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold uppercase tracking-wider">
            Estensione Browser
          </span>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-3xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
              Usa Resumari direttamente da{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-red-600">
                YouTube
              </span>
            </h2>

            <p className="text-lg text-gray-600 font-medium leading-relaxed">
              Scarica la nostra estensione Chrome e trascrivi video YouTube con un
              solo click, direttamente nel tuo browser, senza cambiare scheda.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="/downloads/resumari-extension.zip"
                download
                className="inline-flex items-center gap-3 px-7 py-3.5 bg-gradient-to-r from-purple-600 to-red-600 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-purple-500/25 hover:-translate-y-0.5 transition-all duration-300 group"
              >
                Aggiungi a Chrome
                <svg width="20" height="20" viewBox="0 0 512 512" fill="white" className="group-hover:scale-110 transition-transform shrink-0">
                  <path d="M0 256C0 209.4 12.47 165.6 34.27 127.1L144.1 318.3C166 357.5 207.9 384 256 384C270.3 384 283.1 381.7 296.8 377.4L220.5 509.6C95.9 492.3 0 385.3 0 256zM365.1 321.6C377.4 302.4 384 279.1 384 256C384 217.8 367.2 183.5 340.7 160H493.4C505.4 189.6 512 222.1 512 256C512 397.4 397.4 511.1 256 512L365.1 321.6zM477.8 128H256C193.1 128 142.3 172.1 130.5 230.7L54.19 98.47C101 38.53 174 0 256 0C350.8 0 433.5 51.48 477.8 128V128zM168 256C168 207.4 207.4 168 256 168C304.6 168 344 207.4 344 256C344 304.6 304.6 344 256 344C207.4 344 168 304.6 168 256z"/>
                </svg>
              </a>
            </div>

            <p className="text-sm text-gray-400 font-medium pt-1">
              Compatibile con Google Chrome e browser basati su Chromium
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className=""
          >
            <div className="relative aspect-square max-w-xs mx-auto lg:mx-0 lg:ml-auto rounded-3xl overflow-hidden bg-gradient-to-br from-purple-100 via-white to-red-50 border border-purple-100/60 shadow-xl shadow-purple-500/5 group cursor-pointer">
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-white/90 shadow-lg flex items-center justify-center group-hover:scale-110 group-hover:bg-white transition-all duration-300">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600 ml-0.5">
                    <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
                  </svg>
                </div>
                <p className="text-sm font-bold text-gray-500 mt-4">
                  Video dimostrativo
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Presto disponibile
                </p>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-purple-50/50 to-transparent pointer-events-none" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
