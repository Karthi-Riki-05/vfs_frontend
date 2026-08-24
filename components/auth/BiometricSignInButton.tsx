"use client";

import { useCallback, useEffect, useState } from "react";
import { Fingerprint, ScanFace, X } from "lucide-react";
import { toast } from "sonner";
import {
  biometricAvailable,
  biometricEnrolled,
  getBiometricStatus,
  startBiometricUnlock,
  type BiometricAccount,
} from "@/lib/biometricBridge";

/**
 * Biometric sign-in on the login page: one button, then an account picker.
 *
 * WHY A BUTTON AND NOT AN AUTOMATIC PROMPT
 *   The shell used to raise the OS prompt the instant the app opened. A scanner
 *   appearing unasked is startling, it fired at people who were already signed
 *   in, and dismissing it left no way back except the password. Sign-in is a
 *   choice, so it gets a control the user presses.
 *
 * WHY THE ACCOUNTS HIDE BEHIND THE BUTTON
 *   A phone can hold credentials for several people, and the user must see
 *   WHOSE account a tap will open. But listing the emails on the login page
 *   shows them to anyone who merely opens the app — and it makes the page look
 *   different depending on who has used the phone. They belong in a picker that
 *   appears on tap, the way "Continue with Google" opens a chooser.
 *
 * WHAT SUCCESS LOOKS LIKE
 *   Nothing, here. On success the shell navigates the WebView to the hand-off
 *   page and this component is destroyed mid-press — which is why the busy
 *   state is never cleared on the happy path, and why only failure is handled.
 */
export default function BiometricSignInButton() {
  const [accounts, setAccounts] = useState<BiometricAccount[]>([]);
  const [kind, setKind] = useState<"face" | "fingerprint" | "none">(
    "fingerprint",
  );
  const [platform, setPlatform] = useState<"ios" | "android">("android");
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!biometricAvailable()) return;
    // The synchronous flag decides whether to ask at all, so the button is
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
    // the button hidden for the rest of the page's life.
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

  async function unlock(account: BiometricAccount) {
    setPicking(false);
    setBusy(true);
    const ok = await startBiometricUnlock(account.id);
    if (ok) return; // navigating away; leaving it busy avoids a flash of "ready"
    setBusy(false);
    // Deliberately quiet about WHY. A cancelled prompt is the common case and
    // needs no explanation, and the password field is right there either way.
    toast.error("Could not sign you in. Use your password.");
  }

  function onPress() {
    if (busy) return;
    // One account needs no choosing — going straight to the sensor saves a tap
    // that asks nothing. The picker exists to disambiguate, not to ceremonially
    // confirm.
    if (accounts.length === 1) {
      void unlock(accounts[0]);
      return;
    }
    setPicking(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={onPress}
        disabled={busy}
        aria-label={`Sign in with ${sensor}`}
        aria-haspopup={accounts.length > 1 ? "dialog" : undefined}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
      >
        <Icon className="h-5 w-5 text-primary" aria-hidden />
        {busy ? "Waiting for you…" : `Sign in with ${sensor}`}
      </button>

      {picking && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Choose an account"
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={() => setPicking(false)}
        >
          {/* Stop propagation so a tap inside the sheet does not dismiss it. */}
          <div
            className="w-full max-w-sm rounded-t-2xl bg-background p-4 shadow-xl sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">
                Choose an account
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setPicking(false)}
                className="rounded-full p-1 text-muted-foreground transition hover:bg-muted"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="space-y-2">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => void unlock(account)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border px-3 py-3 text-left transition hover:bg-muted"
                >
                  <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {account.label || "Saved account"}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-3 text-center text-[11px] text-muted-foreground">
              You will be asked for {sensor} next.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
