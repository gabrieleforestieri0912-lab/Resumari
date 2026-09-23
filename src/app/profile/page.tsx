'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Profilo unificato con Impostazioni — redirect a /settings
export default function Profile() {
  const router = useRouter();
  useEffect(() => { router.replace("/settings"); }, [router]);
  return null;
}
