"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { getPostLoginDashboardUrl } from "@/lib/postLoginRedirect";
import { BrandSplash } from "@/components/shared/BrandSplash";

/**
 * Redeems the one-time ticket the native shell put in the URL.
 *
 * Only relative, single-slash paths are honoured as a post-login destination:
 * the ticket arrives from a deep link, so an attacker who could influence it
 * must not be able to bounce a freshly-authenticated session to another origin
 * (`//evil.com` is a protocol-relative URL, which is why the second character
 * is checked too).
 *
 * The fallback is the SAME variant-aware destination the password and social
 * logins use. A bare `/dashboard` is not a valid landing page for either app:
 * Team belongs on `/dashboard/team` and Pro on `/dashboard/pro`, and sending
 * both to the generic route makes a biometric login land somewhere no other
 * login route ever produces.
 */
function safeRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) {
    return getPostLoginDashboardUrl();
  }
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
          // Align the per-tab app context with the landing dashboard BEFORE
          // navigating, exactly as LoginForm#redirectToDashboard does. logout()
          // clears vc_app_context, and a biometric unlock is a FRESH login, so
          // it is empty here — leaving DashboardLayout's reconcile to no-op and
          // the app stuck on whatever stale value the DB last held.
          try {
            sessionStorage.setItem(
              "vc_app_context",
              next.startsWith("/dashboard/pro") ? "pro" : "team",
            );
          } catch {
            // sessionStorage may be blocked in restricted WebViews
          }
          // Full navigation rather than router.replace: the session cookie was
          // just minted, and the dashboard must be rendered against it from
          // scratch rather than reusing this route's client-side tree.
          window.location.href = next;
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

  // The app's own splash, not a bespoke spinner. This route is only ever seen
  // inside the native shell, immediately after the shell's OWN loading screen
  // (_LoadingScreen in webview_native.dart) — which is a Dart rendering of this
  // same design. Anything else here reads as a third, unrelated app flashing up
  // mid-login.
  //
  // Pinned over the viewport because the (auth) layout does not treat /native
  // as a hero route, so it would otherwise wrap this in the centered card and
  // logo used by reset-password / verify-otp.
  return (
    <div
      className="tw"
      data-testid="native-auth-splash"
      style={{ position: "fixed", inset: 0, zIndex: 9999 }}
    >
      <BrandSplash
        caption={failed ? "Taking you to sign in…" : "Signing you in…"}
      />
    </div>
  );
}
