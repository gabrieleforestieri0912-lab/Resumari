/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, Suspense } from "react";
import HomePage from "../components/HomePage";
import ExtensionDashboard from "./ExtensionDashboard";

function HomeContent() {
  const [isExtension, setIsExtension] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      // Check if running in Chrome extension side panel
      const urlParams = new URLSearchParams(window.location.search);
      const inExtension =
        urlParams.get("mode") === "extension" ||
        window.name === "resumari-extension" ||
        (typeof window !== "undefined" &&
          "chrome" in window &&
          (window as any).chrome &&
          "runtime" in (window as any).chrome);

      setIsExtension(inExtension);
    } catch (e) {
      console.error("Extension check error:", e);
    }
    setLoading(false);
  }, []);

  // removed global loading spinner fallback

  if (isExtension) {
    return <ExtensionDashboard />;
  }

  return <HomePage />;
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
