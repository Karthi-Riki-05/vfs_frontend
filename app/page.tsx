"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Capture ?app= before any redirect swallows it.
    // localStorage persists through same-origin redirects in the same tab,
    // so writing it here survives the /dashboard → /login middleware redirect.
    try {
      const params = new URLSearchParams(window.location.search);
      const app = params.get("app");
      // Default context is 'team'. Only upgrade to 'pro' on explicit ?app=pro.
      const appContext = app === "pro" ? "pro" : "team";
      localStorage.setItem("vc_app_context", appContext);
    } catch {
      // localStorage may be blocked in restricted WebViews
    }

    // Always redirect to /dashboard. If unauthenticated, middleware redirects
    // to /login — localStorage is already written by then.
    router.replace("/dashboard");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Return an empty fragment — NOT null.
  // Next.js App Router treats return null as "no page" and serves the
  // notFound slot instead, which prevents the JS bundle from loading
  // and kills the useEffect redirect entirely.
  return <></>;
}
