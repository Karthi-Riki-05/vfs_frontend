/**
 * Returns the dashboard URL to land on after login, based on the app the
 * user entered through (?app=pro / ?app=team → Flutter WebView apps).
 *
 * Priority:
 *   1. ?app= param on the CURRENT url (covers /login?app=pro deep links)
 *   2. vc_app_param in sessionStorage (set by the root page before the
 *      middleware /login redirect swallowed the query string)
 *   3. fallback → /dashboard/team (plain web default = the Team app)
 *
 * Landing on the app-specific dashboard directly avoids the 1s flash where
 * /dashboard rendered team-scoped data before DashboardLayout's forced
 * app-switch reloaded the page in pro mode.
 */
export function getPostLoginDashboardUrl(): string {
  try {
    const urlApp = new URLSearchParams(window.location.search).get("app");
    const app = urlApp || sessionStorage.getItem("vc_app_param");
    if (app === "pro") return "/dashboard/pro";
    if (app === "team") return "/dashboard/team";
  } catch {
    // sessionStorage may be blocked in restricted WebViews
  }
  // Default landing (plain web, no ?app=) → the Team app dashboard.
  return "/dashboard/team";
}
