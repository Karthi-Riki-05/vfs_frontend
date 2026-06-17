// Shared helpers for the team context.
//
// The X-Team-Context header drives BOTH data scope (flow/shape workspace) AND
// AI billing context. A single selection picks the active workspace (which
// flows, dashboard stats, chat and projects you see) and the AI-credit pool
// (personal vs a team's) that gets billed. It is sent on ALL routes via the
// axios interceptor. Data privacy is still enforced server-side by ownerId +
// teamId scoping (DATA-LOSS-001 / Private Team Buckets).
//
// Read synchronously from localStorage so the axios request interceptor can
// attach it even before React context hydrates — important inside a Flutter
// WebView that was just (re)launched.

export const AI_BILLING_KEY = "vc_ai_billing_team";
export const PRO_BILLING_KEY = "vc_pro_team_id";
export const AI_BILLING_EVENT = "vc:ai-billing-change";

// Pro-app tabs store their context under PRO_BILLING_KEY, Team-app tabs under
// AI_BILLING_KEY. App mode is per-tab (sessionStorage), but localStorage is
// origin-global — when Pro and Team tabs shared ONE key, each tab's
// reconcile "corrected" the other's value, and the cross-tab storage
// listeners turned that into an infinite refresh/request loop.
function isProTab(): boolean {
  try {
    return (
      sessionStorage.getItem("vc_app_context") === "pro" ||
      sessionStorage.getItem("vc_forced_app_mode") === "pro"
    );
  } catch {
    return false;
  }
}

/** Returns the persisted billing teamId, or null for the personal pool. */
export function getAiBillingTeamId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(
      isProTab() ? PRO_BILLING_KEY : AI_BILLING_KEY,
    );
    return v && v !== "null" ? v : null;
  } catch {
    // localStorage blocked in a restricted WebView — fall back to personal.
    return null;
  }
}

/** Persist locally and notify listeners. Server persistence is separate. */
export function setAiBillingTeamId(teamId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const key = isProTab() ? PRO_BILLING_KEY : AI_BILLING_KEY;
    if (teamId) localStorage.setItem(key, teamId);
    else localStorage.removeItem(key);
  } catch {
    // ignore — context state still works for the current session
  }
  try {
    window.dispatchEvent(
      new CustomEvent(AI_BILLING_EVENT, { detail: { teamId: teamId || null } }),
    );
  } catch {
    /* no-op */
  }
}
