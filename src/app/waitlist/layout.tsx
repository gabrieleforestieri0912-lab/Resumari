import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Waitlist",
  description:
    "Join the Resumari waitlist for video summaries, document processing, AI chat, the Chrome extension, and API access.",
  alternates: {
    canonical: "https://resumari.vercel.app/waitlist",
  },
};

export default function WaitlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
