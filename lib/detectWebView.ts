/**
 * App-type / WebView detection for ValueChart.
 *
 * SOURCE OF TRUTH for "is this the Pro app, the Team app, or the website?".
 * Primary signal is the native shell's custom User-Agent token; the legacy
 * `?app=` query param (and the sessionStorage it seeds) is kept as a
 * backward-compat fallback during the rollout.
 *
 * ⚠️ SECURITY — this is a UX signal only. A User-Agent is fully client
 * controllable, exactly like the old `?app=` param. NEVER use `appType` to
 * grant entitlements (Pro/Team). Entitlement is enforced server-side
 * (`enforceProContext` → 403 UPGRADE_REQUIRED) against the real subscription.
 * `X-App-Context` only *declares* intent; the backend verifies it.
 */

export type AppType = "pro" | "team" | "web";

// Native-shell User-Agent signatures stamped by the Flutter WebView.
//   Pro app:  "...ValueChartsMobile/Pro-App..."
//   Team app: "...ValueChartsMobile/Team-App..."
const PRO_UA_SIGNATURE = /ValueChartsMobile\/Pro-App/i;
const TEAM_UA_SIGNATURE = /ValueChartsMobile\/Team-App/i;
const ANY_MOBILE_UA_SIGNATURE = /ValueChartsMobile/i;

// Legacy native tokens from older shell builds (pre-ValueChartsMobile).
const LEGACY_APP_TOKEN = /ValueChartApp|ValueChartProApp/;

/**
 * Resolve the app type from a raw User-Agent string alone.
 * Works on both the client (`navigator.userAgent`) and the server
 * (the incoming `user-agent` request header). Returns "web" when no native
 * signature is present.
 */
export function appTypeFromUserAgent(ua: string | null | undefined): AppType {
  if (!ua) return "web";
  if (PRO_UA_SIGNATURE.test(ua)) return "pro";
  if (TEAM_UA_SIGNATURE.test(ua)) return "team";
  return "web";
}

/**
 * True if the UA belongs to either native shell (Pro or Team).
 * This is the gate the FCM bridge uses.
 */
export function isMobileAppUserAgent(ua: string | null | undefined): boolean {
  return !!ua && ANY_MOBILE_UA_SIGNATURE.test(ua);
}

/**
 * Backward-compat resolver: prefer the UA signature, then fall back to the
 * legacy `?app=` query param / stored context so nothing breaks mid-rollout.
 *
 *   resolveAppType({ ua, appParam, stored })
 *
 * UA always wins when it carries a native signature; otherwise the explicit
 * `?app=pro|team` (or persisted `vc_app_param`) is honoured; else "web".
 */
export function resolveAppType(opts: {
  ua?: string | null;
  appParam?: string | null;
  stored?: string | null;
}): AppType {
  const fromUa = appTypeFromUserAgent(opts.ua);
  if (fromUa !== "web") return fromUa;

  if (opts.appParam === "pro" || opts.appParam === "team") return opts.appParam;
  if (opts.stored === "pro" || opts.stored === "team") return opts.stored;
  return "web";
}

/**
 * Client-side app type. Combines the live User-Agent with the legacy `?app=`
 * URL param and the persisted `vc_app_param` (set by app/page.tsx) for
 * backward compatibility. SSR-safe (returns "web" with no window).
 */
export function getClientAppType(): AppType {
  if (typeof window === "undefined" || typeof navigator === "undefined")
    return "web";

  const ua = navigator.userAgent;

  let appParam: string | null = null;
  let stored: string | null = null;
  try {
    appParam = new URLSearchParams(window.location.search).get("app");
    stored = sessionStorage.getItem("vc_app_param");
  } catch {
    // Restricted WebView — UA alone still resolves below.
  }

  return resolveAppType({ ua, appParam, stored });
}

/**
 * Server-side / middleware app type from a request's headers. Accepts either a
 * `Headers` instance (App Router / middleware) or a plain header record
 * (Node `req.headers`). A native UA wins; pass `appParam` to honour `?app=`
 * on the server too.
 */
export function getServerAppType(
  headers: Headers | Record<string, string | string[] | undefined>,
  appParam?: string | null,
): AppType {
  let ua: string | null | undefined;
  if (typeof (headers as Headers).get === "function") {
    ua = (headers as Headers).get("user-agent");
  } else {
    const raw = (headers as Record<string, string | string[] | undefined>)[
      "user-agent"
    ];
    ua = Array.isArray(raw) ? raw[0] : raw;
  }
  return resolveAppType({ ua, appParam });
}

/**
 * Detects whether the current browser is an in-app WebView (as opposed to a
 * real browser like Chrome or Safari). Used to differentiate native-app users
 * (who already paid via App Store / Google Play) from website users who go
 * through the Stripe payment flow.
 *
 * Recognises (in priority order):
 *   1. The new `ValueChartsMobile/*` UA signatures (Pro AND Team).
 *   2. Legacy native tokens (`ValueChartApp` / `ValueChartProApp`).
 *   3. Generic Android (`wv`) / iOS (WKWebView) heuristics.
 *   4. The Flutter-injected `<meta name="x-app-source">` tag.
 */
export function isProWebView(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined")
    return false;

  const ua = navigator.userAgent;

  // New canonical signatures (covers Pro and Team shells).
  if (isMobileAppUserAgent(ua)) return true;

  // The Flutter shell stamps a native app token into the UA. The backend
  // `mobileAppOnly` guard already trusts these exact tokens, so recognising
  // them here is parity (not a wider trust boundary) — it fixes genuine paid
  // app users whose WebView UA omits the `wv`/Safari heuristics below.
  if (LEGACY_APP_TOKEN.test(ua)) return true;

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

/**
 * Gate for native-only bridges (e.g. the FCM token bridge). True when the page
 * runs inside either native shell. Prefers the new UA signature, then falls
 * back to the broader `isProWebView()` heuristics (legacy shells, generic
 * WebViews) so existing app builds keep working through the rollout.
 */
export function isNativeAppWebView(): boolean {
  if (
    typeof navigator !== "undefined" &&
    isMobileAppUserAgent(navigator.userAgent)
  )
    return true;
  return isProWebView();
}
