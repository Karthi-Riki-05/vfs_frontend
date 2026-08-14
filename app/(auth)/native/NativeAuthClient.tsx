"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

/**
 * Redeems the one-time ticket the native shell put in the URL.
 *
 * Only relative, single-slash paths are honoured as a post-login destination:
 * the ticket arrives from a deep link, so an attacker who could influence it
 * must not be able to bounce a freshly-authenticated session to another origin
 * (`//evil.com` is a protocol-relative URL, which is why the second character
 * is checked too).
 */
function safeRedirect(raw: string | null): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export default function NativeAuthClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [failed, setFailed] = useState(false);

  // React 18 StrictMode mounts effects twice in development. The ticket is
  // single-use, so a second redemption would always fail and bounce a user who
  // had in fact just logged in successfully.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // useSearchParams() is typed as nullable in this config.
    const ott = params?.get("ott") ?? null;
    const next = safeRedirect(params?.get("redirect") ?? null);

    // Drop the ticket from the address bar before anything else. It is
    // single-use and short-lived, but there is no reason for it to sit in the
    // WebView's history or be readable from document.location afterwards.
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/native");
    }

    if (!ott) {
      router.replace("/login");
      return;
    }

    (async () => {
      try {
        const result = await signIn("biometric", { redirect: false, ott });
        if (result?.ok && !result.error) {
          router.replace(next);
          return;
        }
        // Expired, already spent, or the account is no longer loginable. The
        // password screen is always a valid fallback.
        setFailed(true);
        router.replace("/login?error=BiometricFailed");
      } catch {
        setFailed(true);
        router.replace("/login?error=BiometricFailed");
      }
    })();
  }, [params, router]);

  return (
    <div style={{ textAlign: "center", padding: "24px 0" }}>
      <div
        aria-hidden
        style={{
          width: 36,
          height: 36,
          margin: "0 auto 20px",
          border: "3px solid #E3E8E5",
          borderTopColor: "#3CB371",
          borderRadius: "50%",
          animation: "vc-native-spin 0.8s linear infinite",
        }}
      />
      <p style={{ margin: 0, color: "#4A5568", fontSize: 15 }}>
        {failed ? "Taking you to sign in…" : "Signing you in…"}
      </p>
      <style>{`
        @keyframes vc-native-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
