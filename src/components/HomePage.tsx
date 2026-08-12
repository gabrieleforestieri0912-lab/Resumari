"use client";

import Navbar from "./Navbar";
import Hero from "./Hero";
import DemoSection from "./DemoSection";
import StepsSection from "./Step";
import TranscriptionSection from "./Transcription";
import FeaturesSection from "./Features";
import Pricing from "./Pricing";
import Faq from "./Faq";
import Footer from "./Footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 bg-[radial-gradient(#e5e7eb_0.5px,transparent_0.5px)] dark:bg-[radial-gradient(#27272a_0.5px,transparent_0.5px)] bg-[length:24px_24px]">
      <Navbar />
      <main>
        <Hero />
        <DemoSection />
        <StepsSection />
        <FeaturesSection />
        <TranscriptionSection />
        <Pricing />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
