/**
 * Detects whether the current browser is an in-app WebView (as opposed to a
 * real browser like Chrome or Safari). Used to differentiate Pro mobile-app
 * users (who have already paid via App Store / Google Play) from website users
 * who need to go through the Stripe payment flow.
 */

export function isProWebView(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined")
    return false;

  const ua = navigator.userAgent;

  // Android WebView sets the "wv" flag in the UA string.
  const isAndroidWebView = /\bwv\b/.test(ua);

  // iOS in-app browsers (WKWebView) have AppleWebKit but omit "Safari" and
  // "CriOS" (Chrome for iOS also omits Safari but includes CriOS).
  const isIOSWebView =
    /iPhone|iPad|iPod/.test(ua) &&
    /AppleWebKit/.test(ua) &&
    !/Safari/.test(ua) &&
    !/CriOS/.test(ua);

  // Flutter can inject a meta tag when the WebView loads, providing a more
  // reliable signal than UA sniffing alone.
  let hasFlutterMeta = false;
  try {
    hasFlutterMeta =
      document
        .querySelector('meta[name="x-app-source"]')
        ?.getAttribute("content") === "pro-mobile-app";
  } catch {
    // DOM not ready — fall through to UA checks
  }

  return isAndroidWebView || isIOSWebView || hasFlutterMeta;
}
