"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function SignupPage() {
  useEffect(() => {
    document.title = "Registrati | Resumari";
  }, []);

  redirect("/login?mode=signup");
}
