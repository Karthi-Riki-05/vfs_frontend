"use client";

import { useCallback, useEffect, useState } from "react";
import { Fingerprint, ScanFace } from "lucide-react";
import { toast } from "sonner";
import {
  biometricAvailable,
  biometricEnrolled,
  getBiometricStatus,
  startBiometricUnlock,
} from "@/lib/biometricBridge";

/**
 * "Sign in with Face ID / fingerprint" on the login page.
 *
 * WHY A BUTTON AND NOT AN AUTOMATIC PROMPT
 *   The shell used to raise the OS prompt the instant the app opened. A scanner
 *   appearing unasked is startling, it fired at people who were already signed
 *   in, and dismissing it left no way back except the password. Sign-in is a
 *   choice, so it gets a control the user presses — the same shape as
 *   "Continue with Google" beside it.
 *
 * WHEN IT APPEARS
 *   Only inside the native shell, only when this phone actually holds a
 *   credential. A button that cannot work is worse than no button: the user
 *   presses it, nothing happens, and the feature reads as broken.
 *
 * WHAT SUCCESS LOOKS LIKE
 *   Nothing, here. On success the shell navigates the WebView to the hand-off
 *   page and this component is destroyed mid-press — which is why the busy
 *   state is never cleared on the happy path, and why only failure is handled.
 */
export default function BiometricSignInButton() {
  const [show, setShow] = useState(false);
  const [kind, setKind] = useState<"face" | "fingerprint" | "none">(
    "fingerprint",
  );
  const [platform, setPlatform] = useState<"ios" | "android">("android");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!biometricAvailable()) return;
    // The synchronous flag decides whether to render at all, so the button is
    // present on the first paint rather than popping in a moment later.
    if (!biometricEnrolled()) return;
    setShow(true);
    // Then fill in the wording, which can afford a round trip.
    const status = await getBiometricStatus();
    if (!status.enrolled) {
      setShow(false);
      return;
    }
    if (status.kind) setKind(status.kind);
    if (status.platform) setPlatform(status.platform);
  }, []);

  useEffect(() => {
    void refresh();
    // The shell publishes the flag on every settled load, which may land after
    // this component mounts. Without the listener the button would be missing
    // on exactly the launch it is most wanted.
    const onEnrolled = () => void refresh();
    window.addEventListener("flutterBiometricEnrolled", onEnrolled);
    return () =>
      window.removeEventListener("flutterBiometricEnrolled", onEnrolled);
  }, [refresh]);

  if (!show) return null;

  // Apple brands its sensors; Android does not. Matching what the user's own
  // Settings app calls the thing is the difference between a familiar control
  // and an unexplained one.
  const label =
    platform === "ios"
      ? kind === "face"
        ? "Sign in with Face ID"
        : "Sign in with Touch ID"
      : kind === "face"
        ? "Sign in with face unlock"
        : "Sign in with fingerprint";
  const Icon = kind === "face" ? ScanFace : Fingerprint;

  async function onClick() {
    if (busy) return;
    setBusy(true);
    const ok = await startBiometricUnlock();
    if (ok) return; // navigating away; leaving it busy avoids a flash of "ready"
    setBusy(false);
    // Deliberately quiet about WHY. A cancelled prompt is the common case and
    // needs no explanation, and the password field is right there either way.
    toast.error("Could not sign you in. Use your password.");
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
    >
      <Icon className="h-5 w-5 text-primary" aria-hidden />
      {busy ? "Waiting for you…" : label}
    </button>
  );
}
