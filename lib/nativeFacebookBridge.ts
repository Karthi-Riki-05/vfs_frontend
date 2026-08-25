/**
 * Native Facebook Sign-In — web side of the NativeBridge protocol.
 *
 * WHY THE SHELL DOES THE SIGNING IN
 *   Facebook refuses OAuth inside an embedded WebView exactly as Google does:
 *   tapping the Facebook pill in the app renders "Facebook is not available on
 *   this browser" (confirmed on device 2026-08-25). The page therefore cannot
 *   run this flow at all — it can only ASK the shell to, and the shell asks the
 *   OS.
 *
 * WHAT THE WEB SIDE NEVER SEES
 *   The Facebook access token. The shell trades it for a one-time ticket
 *   server-side and then navigates the WebView to `/native?ott=…`. Handing the
 *   raw token to page JavaScript would put a live Graph credential in reach of
 *   anything running on the origin, for no gain.
 *
 * DIFFERENT FROM GOOGLE IN ONE WAY
 *   Facebook does not guarantee an email address, so a sign-in can fail for a
 *   reason the user must be told about rather than a generic "try again". The
 *   shell therefore returns a `reason`, and the button renders a specific
 *   message for `SOCIAL_NO_EMAIL`.
 *
 * Backend contract: docs/be-auth-native-google.md
 */

import { isNativeAppWebView } from "./detectWebView";

/** Message this module sends over NativeBridge. */
const MSG_SIGNIN = "facebook-signin";
/** Shell answers on this event, mirroring the `flutterGoogleSignIn` pattern. */
const EVENT = "flutterFacebookSignIn";

export interface NativeFacebookResult {
  ok: boolean;
  /** Backend error code when the shell got one, e.g. SOCIAL_NO_EMAIL. */
  reason?: string;
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

/**
 * Whether to offer a native Facebook button.
 *
 * The shell publishes `window.flutterFacebookSignInAvailable` on every settled
 * load. Absent means either a plain browser or a shell built before this
 * feature — both must fall back to the existing web button rather than offer a
 * control that does nothing.
 */
export function nativeFacebookAvailable(): boolean {
  if (typeof window === "undefined") return false;
  if (!isNativeAppWebView()) return false;
  return (window as any).flutterFacebookSignInAvailable === true;
}

/**
 * Starts a native Facebook sign-in.
 *
 * On success the SHELL navigates the WebView to the hand-off page, so this
 * never resolves ok:true in practice — the page is already being replaced. The
 * failure path is what matters: a dismissed sheet must leave the button
 * tappable again rather than a spinner that never ends.
 *
 * The timeout is generous because the user is looking at an OS sheet for all of
 * it, and may pause to type a Facebook password.
 */
export async function startNativeFacebookSignIn(): Promise<NativeFacebookResult> {
  if (!nativeFacebookAvailable()) return { ok: false };
  if (!post(MSG_SIGNIN)) return { ok: false };
  return new Promise<NativeFacebookResult>((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener(EVENT, handler);
      resolve({ ok: false });
    }, 180_000);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || detail.action !== "signin") return;
      clearTimeout(timer);
      window.removeEventListener(EVENT, handler);
      resolve({ ok: detail.ok === true, reason: detail.reason });
    };
    window.addEventListener(EVENT, handler);
  });
}
