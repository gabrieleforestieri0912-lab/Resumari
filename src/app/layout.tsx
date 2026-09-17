import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import PageTransition from "@/components/PageTransition";
import PendingTranscriptHandler from "@/components/PendingTranscriptHandler";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// Global structured data (JSON-LD) so search engines and AI crawlers can
// understand what Resumari is, who publishes it and what it offers.
const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://resumari.vercel.app/#organization",
    name: "Resumari",
    url: "https://resumari.vercel.app",
    logo: "https://resumari.vercel.app/resumari.png",
    description:
      "Piattaforma AI che riassume video YouTube, PDF e documenti con trascrizioni automatiche, riassunti intelligenti e chat interattiva.",
    knowsAbout: [
      "intelligenza artificiale",
      "riassunti video",
      "trascrizione automatica",
      "YouTube summarizer",
      "analisi documenti",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://resumari.vercel.app/#website",
    url: "https://resumari.vercel.app",
    name: "Resumari",
    description:
      "Riassumi video YouTube, PDF e documenti con l'intelligenza artificiale.",
    inLanguage: "it-IT",
    publisher: { "@id": "https://resumari.vercel.app/#organization" },
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": "https://resumari.vercel.app/#app",
    name: "Resumari",
    url: "https://resumari.vercel.app",
    applicationCategory: "AIApplication",
    operatingSystem: "Web",
    description:
      "Trasforma video YouTube, PDF e documenti in riassunti e trascrizioni con l'IA. Include estensione Chrome, server MCP e API pubblica.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Piano gratuito con 10 crediti omaggio",
    },
    publisher: { "@id": "https://resumari.vercel.app/#organization" },
  },
];

export const metadata = {
  metadataBase: new URL('https://resumari.vercel.app'),
  title: {
    default: "Resumari - AI Video & YouTube Summarizer | Trascrizione Video Automatica",
    template: "%s | Resumari",
  },
  description: "Trasforma video YouTube, PDF e documenti in riassunti intelligenti con l'IA. La soluzione professionale per trascrizioni video, analisi contenuti e produttività accelerata. Risparmia ore di visione con riassunti precisi.",
  keywords: ["riassunto video AI", "trascrizione automatica", "youtube summarizer", "AI video analysis", "resumari", "riassunto intelligente", "trascrizione video", "analisi contenuti AI"],
  authors: [{ name: "Resumari" }],
  creator: "Resumari",
  publisher: "Resumari",
  applicationName: "Resumari",
  category: "productivity",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "it_IT",
    siteName: "Resumari",
    title: "Resumari - AI Video & YouTube Summarizer",
    description: "Trasforma video YouTube, PDF e documenti in riassunti intelligenti con l'IA.",
    url: "https://resumari.vercel.app",
    images: [{
      url: "/resumari.png",
      width: 512,
      height: 512,
      alt: "Resumari",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Resumari - AI Video & YouTube Summarizer",
    description: "Trasforma video YouTube, PDF e documenti in riassunti intelligenti con l'IA.",
    images: ["/resumari.png"],
  },
  alternates: {
    canonical: "https://resumari.vercel.app",
    languages: {
      "it-IT": "https://resumari.vercel.app",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning data-scroll-behavior="smooth" className="">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <link rel="preload" href="/resumari.png" as="image" />
        <link rel="icon" href="/resumari.png" type="image/png" />
        <link rel="apple-touch-icon" href="/resumari.png" />
      </head>
      <body className="min-h-screen flex flex-col font-sans">
        <Providers>
          <PendingTranscriptHandler />
          <PageTransition>{children}</PageTransition>
          <SpeedInsights />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
