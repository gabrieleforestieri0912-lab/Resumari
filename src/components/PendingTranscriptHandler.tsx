"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// Redirects the site to /videos when a pending video was stored by the site's
// own flows (e.g. transcribe actions on the landing page). The Chrome
// extension side panel is a standalone app and never reaches this component,
// so no extension-context check is needed here.
export default function PendingTranscriptHandler() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    try {
      const pendingVideo = localStorage.getItem("resumari_pending_video");
      if (pendingVideo && pathname !== "/videos") {
        router.push("/videos");
      }
    } catch {}
  }, [pathname, router]);

  return null;
}
