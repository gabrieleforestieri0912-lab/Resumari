'use client'

import { Suspense } from "react";
import AuthPage from "@/components/auth/AuthPage";

export default function AuthPageRoute() {
  return (
    <Suspense fallback={null}>
      <AuthPage />
    </Suspense>
  );
}
