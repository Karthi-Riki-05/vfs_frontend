"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Fingerprint, ScanFace } from "lucide-react";
import { toast } from "sonner";
import {
  biometricAvailable,
  disableBiometric,
  enrolBiometric,
  getBiometricStatus,
} from "@/lib/biometricBridge";

/**
 * "Sign in with Fingerprint / Face ID" — the on-ramp for biometric login.
 *
 * Renders NOTHING outside the native shell, and nothing on a phone with no
 * enrolled biometrics. A switch that cannot work is worse than no switch: the
 * user toggles it, nothing happens, and they conclude the feature is broken.
 * `biometricAvailable()` already folds both conditions together.
 *
 * Enrolment is a two-party handshake — the server mints a credential and the
 * PHONE must confirm it stored it behind the OS gate — so the switch reflects
 * the phone's answer, never optimism. On any failure it returns to off and the
 * server-side record is revoked (see enrolBiometric), leaving no half-enrolled
 * state where a credential is live on the server but absent from the device.
 */
export default function BiometricLoginToggle() {
  // The signed-in user's own id. Enrolment is filed against it, and the switch
  // reflects THIS account rather than "somebody enrolled on this phone" — which
  // is what it used to say, misleading anyone sharing the device.
  const { data: session } = useSession();
  const accountId = (session?.user as { id?: string } | undefined)?.id ?? "";
  const accountLabel = session?.user?.email ?? "";

  const [show, setShow] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [kind, setKind] = useState<"face" | "fingerprint" | "none">(
    "fingerprint",
  );
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<"ios" | "android">("android");
  const [busy, setBusy] = useState(false);

  // Ask the shell what this phone can do. The bridge answers asynchronously
  // over an event, so this cannot be derived during render.
  const refresh = useCallback(async () => {
    if (!biometricAvailable()) {
      setShow(false);
      return;
    }
    const status = await getBiometricStatus();
    setShow(status.available);
    // Only THIS user's entry counts. A phone can hold several accounts, and
    // reporting "on" because a colleague enrolled here told the user their own
    // fingerprint login worked when it would have opened someone else's
    // account.
    setEnrolled(status.accounts.some((a) => a.id === accountId));
    if (status.kind) setKind(status.kind);
    if (status.deviceId) setDeviceId(status.deviceId);
    if (status.platform) setPlatform(status.platform);
  }, [accountId]);

  useEffect(() => {
    void refresh();
    // The shell injects flutterBiometricAvailable and flutterBiometricEnrolled
    // from two independent async calls on every settled load, and awaits
    // neither. Either can land AFTER this component mounts — and without these
    // listeners the single check above would have already run, found nothing,
    // and left the switch hidden for the rest of the page's life. Which side
    // wins is timing, so the toggle appeared on one variant and not the other
    // with identical code (observed 2026-08-18).
    const onFlag = () => void refresh();
    window.addEventListener("flutterBiometricAvailable", onFlag);
    window.addEventListener("flutterBiometricEnrolled", onFlag);
    return () => {
      window.removeEventListener("flutterBiometricAvailable", onFlag);
      window.removeEventListener("flutterBiometricEnrolled", onFlag);
    };
  }, [refresh]);

  // Label the hardware the user actually has. "Biometric login" reads as
  // jargon; "Face ID" reads as the thing on their phone.
  // Apple names its sensors; Android does not. An iPhone SE user reads
  // "Fingerprint" as some other feature — the thing on their phone is called
  // Touch ID, and the Settings app they just came from calls it that too.
  const label =
    platform === "ios"
      ? kind === "face"
        ? "Sign in with Face ID"
        : "Sign in with Touch ID"
      : kind === "face"
        ? "Sign in with face unlock"
        : "Sign in with fingerprint";
  const Icon = kind === "face" ? ScanFace : Fingerprint;

  async function onToggle() {
    if (busy) return;
    if (!accountId) {
      toast.error("Still loading your account. Try again in a moment.");
      return;
    }
    // A missing deviceId means the shell never answered the status request —
    // the switch would otherwise be a dead control that silently does nothing,
    // which is indistinguishable from the feature being broken.
    if (!deviceId) {
      toast.error("Could not reach the app. Try reopening it.");
      void refresh();
      return;
    }
    setBusy(true);
    try {
      if (enrolled) {
        await disableBiometric(deviceId, accountId);
        setEnrolled(false);
        toast.success(`${label} turned off`);
      } else {
        // Resolves only once the phone has prompted for the fingerprint and
        // confirmed the credential is stored.
        // `platform` comes from the shell, not the User-Agent — the shell's
        // custom UA is identical on iOS and Android by design.
        const ok = await enrolBiometric(
          deviceId,
          platform,
          accountId,
          accountLabel,
        );
        setEnrolled(ok);
        if (ok) {
          toast.success(`${label} is on`);
        } else {
          // Cancelled prompt, biometrics switched off mid-flow, or the shell
          // could not write to secure storage. enrolBiometric has already
          // revoked the server record.
          toast.error("Could not turn that on. Please try again.");
        }
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      // Re-read rather than guess: the phone is the source of truth for whether
      // a credential is actually stored.
      void refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!show) return null;

  return (
    /* items-start on phones: the description wraps to 3 lines there, and
       centre-aligning left the switch floating against the middle of the
       paragraph instead of sitting beside the title. */
    <div className="flex items-start sm:items-center gap-3 p-4">
      <Icon className="w-4 h-4 text-foreground shrink-0 mt-0.5 sm:mt-0" />
      <div className="flex-1 min-w-0 pr-1">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Unlock ValueFlow without typing your password
        </div>
        {/* Says the quiet part out loud. The credential is gated on THIS
            PHONE's biometrics, so enrolling on a phone that is not yours hands
            its owner access to your account — which the user cannot infer from
            "unlock without a password". */}
        <div className="text-[11px] text-muted-foreground/80 mt-1">
          Anyone who can unlock this phone will be able to sign in to this
          account.
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enrolled}
        aria-label={label}
        disabled={busy}
        onClick={onToggle}
        className={`appearance-none cursor-pointer relative w-9 h-5 rounded-full border-0 transition-colors shrink-0 ${
          enrolled ? "bg-primary" : "bg-secondary"
        } ${busy ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            enrolled ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
