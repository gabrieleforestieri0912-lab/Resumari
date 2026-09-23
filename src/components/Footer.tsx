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
    <path d="M18.33 10.32c-.46-.02-1.02-.05-1.74-.05-3.31 0-6 2.69-6 6v4.5c0 1.86-1.51 3.36-3.36 3.36-1.86 0-3.36-1.51-3.36-3.36V11.5C3.87 9.43 5.55 7.5 7.83 7.34c.03.93.05 1.84.05 2.74 0 4.68-1.03 8.48-2.63 11.32A6.01 6.01 0 0 0 7.83 21c3.59 0 6.73-2.88 6.73-6.44v-2.3c1.57.82 3.2 1.27 4.89 1.27 4.41 0 8-3.59 8-8s-3.59-8-8-8c-.24 0-.48.01-2 .01" />
    <path d="M9.5 18.81a4.19 4.19 0 0 1 0-8.38 4.19 4.19 0 0 1 4.19 4.19 4.19 4.19 0 0 1-4.19 4.19z" />
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
