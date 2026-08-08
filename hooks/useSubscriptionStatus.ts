"use client";

import { useSession } from "next-auth/react";
import { createSharedResource } from "@/lib/sharedResource";
import { useAiBilling } from "@/context/AiBillingContext";

export interface SubscriptionStatus {
  hasSubscription?: boolean;
  status?: string | null;
  [k: string]: any;
}

/**
 * The caller's subscription status (OPT-3).
 *
 * Fetched on mount by both the Team and Pro dashboards, and on demand by the
 * Sidebar's Teams gate — measured 5 × GET /subscription/status per refresh.
 *
 * The Sidebar's call stays where it is on purpose: it runs on CLICK to decide
 * whether to open Teams or the upgrade modal, and an entitlement gate should
 * read live state rather than a snapshot that could be minutes old.
 */
const resource = createSharedResource<SubscriptionStatus>(
  "subscription/status",
  async () => {
    const res = await fetch("/api/subscription/status");
    const data = await res.json();
    return data?.data || data || {};
  },
  // No event subscriptions: both AI_BILLING_EVENT and vc:workspace-switch fire
  // during normal boot, which turned 1 request per load into 4. A real profile
  // switch changes the KEY below, which refetches once.
  [],
);

export function useSubscriptionStatus() {
  const { data: session } = useSession();
  const { activeBillingTeamId } = useAiBilling();
  const userId = ((session?.user as any)?.id ||
    (session?.user as any)?.email ||
    null) as string | null;
  const key = userId ? `${userId}:${activeBillingTeamId || "personal"}` : null;
  const state = resource.use(key);
  return { ...state, status: state.data?.status ?? null };
}

export const __subscriptionStatusResource = resource;
