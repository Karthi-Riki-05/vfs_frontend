"use client";

import { useCallback, useEffect, useState } from "react";
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
    setEnrolled(status.enrolled);
    if (status.kind) setKind(status.kind);
    if (status.deviceId) setDeviceId(status.deviceId);
    if (status.platform) setPlatform(status.platform);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Label the hardware the user actually has. "Biometric login" reads as
  // jargon; "Face ID" reads as the thing on their phone.
  const label = kind === "face" ? "Sign in with Face ID" : "Sign in with Fingerprint";
  const Icon = kind === "face" ? ScanFace : Fingerprint;

  async function onToggle() {
    if (busy || !deviceId) return;
    setBusy(true);
    try {
      if (enrolled) {
        await disableBiometric(deviceId);
        setEnrolled(false);
        toast.success(`${label} turned off`);
      } else {
        // Resolves only once the phone has prompted for the fingerprint and
        // confirmed the credential is stored.
        // `platform` comes from the shell, not the User-Agent — the shell's
        // custom UA is identical on iOS and Android by design.
        const ok = await enrolBiometric(deviceId, platform);
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
    <div className="flex items-center gap-3 p-4">
      <Icon className="w-4 h-4 text-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Unlock ValueFlow without typing your password
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
