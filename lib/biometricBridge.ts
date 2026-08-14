/**
 * Biometric login — web side of the NativeBridge protocol.
 *
 * WHY THE WEB SIDE ENROLS
 *   The shell has no login screen; the session lives here, in the WebView. So
 *   only this side can prove the user just authenticated, which is exactly what
 *   enrolment must be gated on. The page mints a device token with its own
 *   session and hands it to the shell, which locks it behind the OS biometric
 *   gate. From then on the shell drives login on its own.
 *
 * WHAT THE WEB SIDE NEVER DOES
 *   It never stores the device token and never sees it again. `enrolBiometric`
 *   passes it straight to the bridge and drops it. Persisting it in
 *   localStorage would undo the entire point — the credential must live in
 *   hardware-backed storage the OS gates on a fingerprint, not in a place any
 *   script on the origin can read.
 *
 * Backend contract: docs/be-auth-biometric.md
 */

import api from "@/lib/axios";
import { getClientAppType, isNativeAppWebView } from "./detectWebView";

/** Messages this module sends over NativeBridge. */
const MSG_ENROL = "biometric-enrol:";
const MSG_DISABLE = "biometric-disable";
/** Shell answers on this event, mirroring the `flutterIap` pattern. */
const EVENT = "flutterBiometric";

export interface BiometricStatus {
  /** The shell is present AND the device has usable biometric hardware. */
  available: boolean;
  /** A device token is currently stored on this phone. */
  enrolled: boolean;
  /** 'face' | 'fingerprint' | 'none' — drives the button label and icon. */
  kind?: "face" | "fingerprint" | "none";
}

function post(message: string): boolean {
  try {
    const bridge = (window as any).NativeBridge;
    if (!bridge?.postMessage) return false;
    bridge.postMessage(message);
    return true;
  } catch {
    return false;
  }
}

/** Resolves with the next flutterBiometric result matching [action]. */
function waitForResult(action: string, timeoutMs: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener(EVENT, handler);
      reject(new Error(`Biometric ${action} timed out`));
    }, timeoutMs);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.action !== action) return;
      clearTimeout(timer);
      window.removeEventListener(EVENT, handler);
      resolve(detail);
    };
    window.addEventListener(EVENT, handler);
  });
}

/**
 * Whether to offer the biometric toggle at all.
 *
 * The shell publishes `window.flutterBiometricAvailable` on every page load,
 * the same way it publishes `flutterIapAvailable`. Absent means either a plain
 * browser or an older shell build — both must hide the UI rather than offer a
 * control that silently does nothing.
 */
export function biometricAvailable(): boolean {
  if (typeof window === "undefined") return false;
  if (!isNativeAppWebView()) return false;
  return (window as any).flutterBiometricAvailable === true;
}

/** Current enrolment state as reported by the shell. */
export async function getBiometricStatus(): Promise<BiometricStatus> {
  if (!biometricAvailable()) return { available: false, enrolled: false };
  try {
    post("biometric-status");
    const result = await waitForResult("status", 5000);
    return {
      available: true,
      enrolled: result.enrolled === true,
      kind: result.kind,
    };
  } catch {
    return { available: true, enrolled: false };
  }
}

/**
 * Turns biometric login on for this phone.
 *
 * Rides the caller's live session: the backend authenticates the request and
 * binds the new token to that user, so enrolment is impossible without a real,
 * current login.
 *
 * The shell answers with `{action: 'enrol', stored: true}` once the token is
 * safely in the Keychain / Keystore. If it cannot store it — biometrics turned
 * off at the OS level, user cancelled the prompt — the token is discarded on
 * both sides and the toggle must stay off.
 */
export async function enrolBiometric(
  deviceId: string,
  platform: "ios" | "android",
  label?: string,
): Promise<boolean> {
  if (!biometricAvailable()) return false;

  const appVariant = getClientAppType();
  const res = await api.post("/auth/biometric/enroll", {
    deviceId,
    platform,
    appVariant: appVariant === "pro" ? "pro" : "team",
    label,
  });

  const deviceToken = res?.data?.data?.deviceToken;
  if (!deviceToken) return false;

  // Hand off and forget. Nothing below this line may retain the token.
  if (!post(`${MSG_ENROL}${deviceToken}`)) return false;

  try {
    const result = await waitForResult("enrol", 30000);
    if (result.stored === true) return true;
  } catch {
    // Fall through: the shell never confirmed, so we must not leave a live
    // credential bound to a phone that may not be holding it.
  }

  // Best-effort cleanup so a half-finished enrolment doesn't leave a usable
  // token on the server with no matching phone.
  try {
    await api.post("/auth/biometric/revoke", { deviceId });
  } catch {
    /* the token expires on its own; nothing further to do here */
  }
  return false;
}

/**
 * Turns biometric login off: clears the phone's copy AND revokes the server
 * record. Both halves matter — revoking alone would leave a dead token in
 * secure storage, and clearing alone would leave a live credential on the
 * server.
 */
export async function disableBiometric(deviceId: string): Promise<void> {
  post(MSG_DISABLE);
  await api.post("/auth/biometric/revoke", { deviceId });
}

/**
 * Called from the logout path. Biometric access must not survive a sign-out:
 * otherwise the next person to open the app unlocks the previous user's
 * account with their own fingerprint.
 */
export function clearBiometricOnLogout(): void {
  if (typeof window === "undefined") return;
  post(MSG_DISABLE);
}
