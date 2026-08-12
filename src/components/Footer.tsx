/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import React, { SVGProps } from "react";

const Facebook = ({ size = 24, className = "", ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Twitter = ({ size = 24, className = "", ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const Instagram = ({ size = 24, className = "", ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
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

const Linkedin = ({ size = 24, className = "", ...props }: SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    {...props}
  >
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

interface SocialLink {
  name: string;
  icon: React.ReactNode;
  href: string;
}

export default function Footer() {
  const year = new Date().getFullYear();

  const socialLinks: SocialLink[] = [
    { name: "Facebook", icon: <Facebook size={20} />, href: "#" },
    { name: "Twitter", icon: <Twitter size={20} />, href: "#" },
    { name: "Instagram", icon: <Instagram size={20} />, href: "#" },
    { name: "Linkedin", icon: <Linkedin size={20} />, href: "#" },
  ];

  return (
    <footer className="bg-black dark:bg-zinc-950 border-t border-white/5 pt-20 pb-10 px-6">
      <div className="max-w-6xl mx-auto grid gap-12 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div>
          <Link href="/" className="inline-block mb-5">
            <img src="/resumari.png" alt="Resumari" className="w-11 h-11" />
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
                href="/supporto"
                className="transition-all hover:text-[#7b2ff7] hover:pl-1"
              >
                Supporto
              </Link>
            </li>
            <li>
              <Link
                href="/contattaci"
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
      <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-white/5 text-sm text-gray-500">
        © {year} Resumari. All rights reserved.
      </div>
    </footer>
  );
}
