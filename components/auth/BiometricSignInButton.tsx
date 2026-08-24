"use client";

import { useCallback, useEffect, useState } from "react";
import { Fingerprint, ScanFace } from "lucide-react";
import { toast } from "sonner";
import {
  biometricAvailable,
  biometricEnrolled,
  getBiometricStatus,
  startBiometricUnlock,
  type BiometricAccount,
} from "@/lib/biometricBridge";

/**
 * Biometric sign-in on the login page — one row per enrolled account.
 *
 * WHY A BUTTON AND NOT AN AUTOMATIC PROMPT
 *   The shell used to raise the OS prompt the instant the app opened. A scanner
 *   appearing unasked is startling, it fired at people who were already signed
 *   in, and dismissing it left no way back except the password. Sign-in is a
 *   choice, so it gets a control the user presses.
 *
 * WHY A LIST AND NOT ONE BUTTON
 *   A phone can hold credentials for several people. Showing a single unlabelled
 *   button meant the user could not tell WHOSE account a tap would open — and on
 *   a shared phone it would silently be whoever enrolled most recently. Naming
 *   each account makes that visible before the sensor is touched, the same way
 *   Google's account picker does.
 *
 * WHAT SUCCESS LOOKS LIKE
 *   Nothing, here. On success the shell navigates the WebView to the hand-off
 *   page and this component is destroyed mid-press — which is why the busy state
 *   is never cleared on the happy path, and why only failure is handled.
 */
export default function BiometricSignInButton() {
  const [accounts, setAccounts] = useState<BiometricAccount[]>([]);
  const [kind, setKind] = useState<"face" | "fingerprint" | "none">(
    "fingerprint",
  );
  const [platform, setPlatform] = useState<"ios" | "android">("android");
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!biometricAvailable()) return;
    // The synchronous flag decides whether to ask at all, so the rows are
    // present on the first paint rather than popping in a moment later.
    if (!biometricEnrolled()) return;
    const status = await getBiometricStatus();
    setAccounts(status.accounts);
    if (status.kind) setKind(status.kind);
    if (status.platform) setPlatform(status.platform);
  }, []);

  useEffect(() => {
    void refresh();
    // Both events, because either flag can be the last to arrive: the shell
    // fires two independent async injections and awaits neither. Without these
    // the single check above would have already run, found nothing, and left
    // the list hidden for the rest of the page's life.
    const onFlag = () => void refresh();
    window.addEventListener("flutterBiometricEnrolled", onFlag);
    window.addEventListener("flutterBiometricAvailable", onFlag);
    return () => {
      window.removeEventListener("flutterBiometricEnrolled", onFlag);
      window.removeEventListener("flutterBiometricAvailable", onFlag);
    };
  }, [refresh]);

  if (accounts.length === 0) return null;

  // Apple brands its sensors; Android does not. Matching what the user's own
  // Settings app calls the thing is the difference between a familiar control
  // and an unexplained one.
  const sensor =
    platform === "ios"
      ? kind === "face"
        ? "Face ID"
        : "Touch ID"
      : kind === "face"
        ? "face unlock"
        : "fingerprint";
  const Icon = kind === "face" ? ScanFace : Fingerprint;

  async function onPick(account: BiometricAccount) {
    if (busyId) return;
    setBusyId(account.id);
    const ok = await startBiometricUnlock(account.id);
    if (ok) return; // navigating away; leaving it busy avoids a flash of "ready"
    setBusyId(null);
    // Deliberately quiet about WHY. A cancelled prompt is the common case and
    // needs no explanation, and the password field is right there either way.
    toast.error("Could not sign you in. Use your password.");
  }

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Sign in with {sensor}
      </div>
      {accounts.map((account) => (
        <button
          key={account.id}
          type="button"
          onClick={() => onPick(account)}
          disabled={busyId !== null}
          aria-label={`Sign in as ${account.label} with ${sensor}`}
          className="flex w-full items-center gap-3 rounded-full border border-border bg-background px-4 py-3 text-left transition hover:bg-muted disabled:opacity-60"
        >
          <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {account.label || "Saved account"}
          </span>
          {busyId === account.id && (
            <span className="shrink-0 text-xs text-muted-foreground">
              Waiting…
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
