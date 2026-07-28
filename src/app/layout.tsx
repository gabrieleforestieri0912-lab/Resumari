import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import PageTransition from "@/components/PageTransition";
import PendingTranscriptHandler from "@/components/PendingTranscriptHandler";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  metadataBase: new URL('https://resumari.it'),
  title: {
    default: "Resumari - AI Video & YouTube Summarizer | Trascrizione Video Automatica",
    template: "%s | Resumari",
  },
  description: "Trasforma video YouTube, PDF e documenti in riassunti intelligenti con l'IA. La soluzione professionale per trascrizioni video, analisi contenuti e produttività accelerata. Risparmia ore di visione con riassunti precisi.",
  keywords: ["riassunto video AI", "trascrizione automatica", "youtube summarizer", "AI video analysis", "resumari", "riassunto intelligente", "trascrizione video", "analisi contenuti AI"],
  authors: [{ name: "Resumari" }],
  creator: "Resumari",
  publisher: "Resumari",
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
    url: "https://resumari.it",
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
    canonical: "https://resumari.it",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {};

  return (
    <html lang="it" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="preload" href="/resumari.png" as="image" />
        <link rel="icon" href="/resumari.png" type="image/png" />
        <link rel="apple-touch-icon" href="/resumari.png" />
      </head>
      <body className="min-h-screen flex flex-col font-sans">
        <Providers>
          <PendingTranscriptHandler />
          <PageTransition>{children}</PageTransition>
        </Providers>
      </body>
    </html>
  );
}
