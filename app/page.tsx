"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Capture ?app= before any redirect swallows it.
    // sessionStorage persists through same-origin redirects in the same tab,
    // so writing it here survives the /dashboard → /login middleware redirect.
    try {
      const params = new URLSearchParams(window.location.search);
      const app = params.get("app");
      if (app === "team" || app === "pro") {
        sessionStorage.setItem("vc_forced_app_mode", app);
      }
    } catch {
      // sessionStorage may be blocked in restricted WebViews
    }

    // Always redirect to /dashboard. If unauthenticated, middleware redirects
    // to /login — sessionStorage is already written by then.
    router.replace("/dashboard");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
