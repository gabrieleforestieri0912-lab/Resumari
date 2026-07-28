"use client";

import Navbar from "./Navbar";
import Hero from "./Hero";
import StatsBar from "./StatsBar";
import DemoSection from "./DemoSection";
import StepsSection from "./Step";
import TranscriptionSection from "./Transcription";
import FeaturesSection from "./Features";
import Pricing from "./Pricing";
import Faq from "./Faq";
import Footer from "./Footer";
import ExtensionCTA from "./ExtensionCTA";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(#e5e7eb_0.5px,transparent_0.5px)] bg-[length:24px_24px]">
      <Navbar />
      <main>
        <Hero />
        <StatsBar />
        <DemoSection />
        <StepsSection />
        <FeaturesSection />
        <TranscriptionSection />
        <ExtensionCTA />
        <Pricing />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
