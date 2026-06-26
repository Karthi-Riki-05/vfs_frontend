"use client";

import { signOut } from "next-auth/react";
import { unregisterNotificationToken } from "@/lib/firebase";

// BUG-008: per-tab/per-browser workspace + billing context that must NOT
// survive a logout — otherwise the next user on a shared browser inherits the
// previous user's app surface and AI-billing/Pro team scope. Harmless UI prefs
// (view modes, greeting-seen) are intentionally left alone.
const WORKSPACE_SESSION_KEYS = [
  "vc_app_context",
  "vc_forced_app_mode",
  "vc_app_param",
];
const BILLING_LOCAL_KEYS = ["vc_pro_team_id", "vc_ai_billing_team"];

// Purge workspace/billing context. Guarded per-store — storage may be blocked
// in restricted WebViews, and a failure here must never block sign-out.
function clearWorkspaceStorage(): void {
  try {
    WORKSPACE_SESSION_KEYS.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // sessionStorage blocked — nothing to clear.
  }
  try {
    BILLING_LOCAL_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    // localStorage blocked — nothing to clear.
  }
}

// Single logout entry point: revoke this device's push token (best-effort,
// no-op when push isn't configured/granted) and clear client-side workspace
// context BEFORE clearing the session, so a logged-out or shared device stops
// receiving notifications and the next user starts with a clean context.
export async function logout(opts?: { callbackUrl?: string }): Promise<void> {
  try {
    await unregisterNotificationToken();
  } catch {
    // never block sign-out on cleanup
  }
  clearWorkspaceStorage();
  await signOut({ callbackUrl: opts?.callbackUrl ?? "/login" });
}
