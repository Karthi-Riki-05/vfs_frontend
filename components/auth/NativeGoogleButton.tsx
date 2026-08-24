"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  nativeGoogleAvailable,
  startNativeGoogleSignIn,
} from "@/lib/nativeGoogleBridge";

/**
 * "Continue with Google" that actually works inside the app.
 *
 * WHY THIS EXISTS ALONGSIDE THE SOCIAL ROW
 *   The Google pill in `SocialRow` runs web OAuth, which Google blocks in an
 *   embedded WebView — that is what the orange "open this in Chrome" banner on
 *   this page is apologising for. This button asks the SHELL instead, which
 *   asks the OS, which shows the account picker the user expects.
 *
 * WHEN IT APPEARS
 *   Only inside a shell that reports the capability. In a plain browser, and
 *   in any shell built before this feature, it renders nothing and the existing
 *   web button (plus its banner) is unchanged.
 *
 * WHAT SUCCESS LOOKS LIKE
 *   Nothing, here. On success the shell navigates the WebView to the hand-off
 *   page and this component is destroyed mid-press — which is why the busy
 *   state is never cleared on the happy path, and why only failure is handled.
 */
export default function NativeGoogleButton() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    setShow(nativeGoogleAvailable());
  }, []);

  useEffect(() => {
    refresh();
    // The shell publishes the flag on every settled load, which may land after
    // this component mounts. Without the listener the button would be missing
    // on exactly the launch it is most wanted.
    const onFlag = () => refresh();
    window.addEventListener("flutterGoogleSignInAvailable", onFlag);
    return () =>
      window.removeEventListener("flutterGoogleSignInAvailable", onFlag);
  }, [refresh]);

  if (!show) return null;

  async function onClick() {
    if (busy) return;
    setBusy(true);
    const ok = await startNativeGoogleSignIn();
    if (ok) return; // navigating away; leaving it busy avoids a flash of "ready"
    setBusy(false);
    // Deliberately quiet about WHY. A dismissed account sheet is the common
    // case and needs no explanation, and the password field is right there.
    toast.error("Could not sign you in with Google. Use your password.");
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label="Continue with Google"
      className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
    >
      {/* Google's mark, inlined: the shell must render it with no network
          round trip, and this button is shown on a cold launch. */}
      <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
      {busy ? "Waiting for you…" : "Continue with Google"}
    </button>
  );
}
