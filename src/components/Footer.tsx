import Image from "next/image";
import Link from "next/link";
import React from "react";

// Social icons: Instagram + TikTok (mantenuti); Facebook/Twitter/LinkedIn rimossi.


const Instagram = ({ size = 24, className = "", ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const TikTok = ({ size = 24, className = "", ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1.01.03-1.51.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

interface SocialLink {
  name: string;
  icon: React.ReactNode;
  href: string;
}

// Handles social (TikTok + Instagram) e email di contatto.
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "gabriele.forestieri0912@gmail.com";

export default function Footer() {
  const year = new Date().getFullYear();

  const socialLinks: SocialLink[] = [
    { name: "Instagram", icon: <Instagram size={20} />, href: "https://instagram.com/resumari" },
    { name: "TikTok", icon: <TikTok size={20} />, href: "https://tiktok.com/@resumari" },
  ];

  return (
    <footer className="bg-black dark:bg-zinc-950 border-t border-white/5 pt-20 pb-10 px-6 relative overflow-hidden">
      {/* Gradienti attorno al componente demo: sfondo sull'area centrale */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 via-orange-400 to-pink-400 opacity-90 blur-3xl [mask-image:radial-gradient(ellipse_at_center,transparent_45%,#000_110%)] dark:[mask-image:radial-gradient(ellipse_at_center,#000_50%,transparent_130%)] pointer-events-none -z-10" />
      <div className="max-w-6xl min-[1920px]:max-w-[1680px] min-[2560px]:max-w-[1920px] mx-auto grid gap-12 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div>
          <Link href="/" className="inline-block mb-5">
            <Image
              src="/resumari.png"
              alt="Resumari"
              width={44}
              height={44}
              className="w-11 h-11"
            />
          </Link>

          <p className="text-gray-400 leading-relaxed">
            Analizza, riassume e impara più velocemente grazie alla potenza
            dell&apos;IA applicata ai tuoi contenuti.
          </p>
        </div>

        {/* Navigazione */}
        <div>
          <h3 className="font-bold text-white mb-5">Navigazione</h3>
          <ul className="space-y-3 text-gray-400 font-medium">
            <li>
              <Link
                href="/#steps"
                className="transition-all hover:text-[#7b2ff7] hover:pl-1"
              >
                Come funziona
              </Link>
            </li>
            <li>
              <Link
                href="/#features"
                className="transition-all hover:text-[#7b2ff7] hover:pl-1"
              >
                Funzionalità
              </Link>
            </li>
            <li>
              <Link
                href="/#pricing"
                className="transition-all hover:text-[#7b2ff7] hover:pl-1"
              >
                Prezzi
              </Link>
            </li>
            <li>
              <Link
                href="/#faq"
                className="transition-all hover:text-[#7b2ff7] hover:pl-1"
              >
                FAQ
              </Link>
            </li>
            <li>
              <Link
                href="/api-keys"
                className="transition-all hover:text-[#7b2ff7] hover:pl-1"
              >
                API Keys
              </Link>
            </li>
            <li>
              <Link
                href="/mcp"
                className="transition-all hover:text-[#7b2ff7] hover:pl-1"
              >
                MCP Server
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h3 className="font-bold text-white mb-5">Legal</h3>
          <ul className="space-y-3 text-gray-400 font-medium">
            <li>
              <Link
                href="/privacy"
                className="transition-all hover:text-[#7b2ff7] hover:pl-1"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="transition-all hover:text-[#7b2ff7] hover:pl-1"
              >
                Terms of Service
              </Link>
            </li>
          </ul>
        </div>

        {/* Contatti */}
        <div>
          <h3 className="font-bold text-white mb-5">Contatti</h3>

          <ul className="space-y-3 text-gray-400 font-medium">
            <li>
              <Link
                href="/support"
                className="transition-all hover:text-[#7b2ff7] hover:pl-1"
              >
                Supporto
              </Link>
            </li>
            <li>
              <Link
                href="/contact"
                className="transition-all hover:text-[#7b2ff7] hover:pl-1"
              >
                Contattaci
              </Link>
            </li>
          </ul>

          {/* Social Icons */}
          <div className="flex gap-3 mt-8">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                className="w-10 h-10 rounded-xl bg-[#0a0a0a] flex items-center justify-center text-gray-500 border border-white/5 transition-all duration-300 hover:-translate-y-1.5 hover:text-[#7b2ff7] hover:border-purple-500/20 hover:shadow-lg hover:shadow-purple-500/10"
                aria-label={social.name}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="max-w-6xl min-[1920px]:max-w-[1680px] min-[2560px]:max-w-[1920px] mx-auto mt-16 pt-8 border-t border-white/5 text-sm text-gray-500">
        {year} Resumari. All rights reserved.
      </div>
    </footer>
  );
}
