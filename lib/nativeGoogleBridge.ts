/**
 * Native Google Sign-In — web side of the NativeBridge protocol.
 *
 * WHY THE SHELL DOES THE SIGNING IN
 *   Google refuses OAuth inside an embedded WebView (`disallowed_useragent`),
 *   which is why the login page carries a "copy this link into Chrome" banner.
 *   The page therefore cannot run this flow at all: it can only ASK the shell
 *   to, and the shell asks the OS, which is where the familiar account-picker
 *   sheet comes from.
 *
 * WHAT THE WEB SIDE NEVER SEES
 *   The Google ID token. The shell trades it for a one-time ticket server-side
 *   and then navigates the WebView to `/native?ott=…`, where the existing
 *   `biometric` NextAuth provider redeems it. Handing the raw ID token to page
 *   JavaScript would put an hour-long bearer credential in reach of anything
 *   running on the origin, for no gain.
 *
 * Backend contract: docs/be-auth-native-google.md
 */

import { isNativeAppWebView } from "./detectWebView";

/** Message this module sends over NativeBridge. */
const MSG_SIGNIN = "google-signin";
/** Shell answers on this event, mirroring the `flutterBiometric` pattern. */
const EVENT = "flutterGoogleSignIn";

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

/**
 * Whether to offer a native Google button.
 *
 * The shell publishes `window.flutterGoogleSignInAvailable` on every settled
 * load, the same way it publishes `flutterBiometricAvailable`. Absent means
 * either a plain browser or a shell built before this feature — both must fall
 * back to the existing web OAuth button rather than offer a control that does
 * nothing.
 */
export function nativeGoogleAvailable(): boolean {
  if (typeof window === "undefined") return false;
  if (!isNativeAppWebView()) return false;
  return (window as any).flutterGoogleSignInAvailable === true;
}

/**
 * Starts a native Google sign-in. Resolves false if it did not happen.
 *
 * On success the SHELL navigates the WebView to the hand-off page, so this
 * never resolves true in practice — the page is already being replaced. The
 * false path is what matters: a dismissed account sheet must leave the button
 * tappable again rather than a spinner that never ends.
 *
 * The timeout is generous because the user is looking at an OS sheet for all
 * of it, and may pause to add a Google account they had not signed into yet.
 */
export async function startNativeGoogleSignIn(): Promise<boolean> {
  if (!nativeGoogleAvailable()) return false;
  if (!post(MSG_SIGNIN)) return false;
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener(EVENT, handler);
      resolve(false);
    }, 180_000);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.action !== "signin") return;
      clearTimeout(timer);
      window.removeEventListener(EVENT, handler);
      resolve(detail.ok === true);
    };
    window.addEventListener(EVENT, handler);
  });
}
