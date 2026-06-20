"use client";

import { signOut } from "next-auth/react";
import { unregisterNotificationToken } from "@/lib/firebase";

// Single logout entry point: revoke this device's push token (best-effort,
// no-op when push isn't configured/granted) BEFORE clearing the session, so a
// logged-out or shared device stops receiving notifications.
export async function logout(opts?: { callbackUrl?: string }): Promise<void> {
  try {
    await unregisterNotificationToken();
  } catch {
    // never block sign-out on cleanup
  }
  await signOut({ callbackUrl: opts?.callbackUrl ?? "/login" });
}
