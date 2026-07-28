"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

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
