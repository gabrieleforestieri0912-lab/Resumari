import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free YouTube Tools - Strumenti Gratuiti per Creator",
  description:
    "Strumenti gratuiti per creator YouTube: scarica thumbnail, converti sottotitoli, conta caratteri, genera tag e capitoli, calcola i guadagni e molto altro. Tutto 100% lato client, senza registrazione.",
  openGraph: {
    title: "Free YouTube Tools - Strumenti Gratuiti per Creator",
    description:
      "Strumenti gratuiti per creator YouTube, 100% lato client, senza registrazione.",
    url: "https://resumari.vercel.app/tools",
    siteName: "Resumari",
  },
  alternates: { canonical: "https://resumari.vercel.app/tools" },
};

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
