"use client";

import { useSession } from "next-auth/react";
import { aiApi } from "@/api/ai.api";
import { createSharedResource } from "@/lib/sharedResource";
import { useAiBilling } from "@/context/AiBillingContext";

export interface AiCreditsData {
  totalCredits?: number;
  credits?: number;
  balance?: { totalCredits?: number };
  [k: string]: any;
}

/**
 * The AI credit balance (OPT-3).
 *
 * Six components fetched this independently — Sidebar, ProSidebar,
 * SubscriptionWidget, AIAssistant, AiCreditsDisplay and the Team page — each
 * with its own `aiCreditsChanged` listener, so a single balance change fanned
 * out into six requests. Measured 4 × GET /ai/credits per dashboard load.
 *
 * The store keeps ONE subscription to that event, so a spend refreshes every
 * display at once instead of once per display.
 */
const resource = createSharedResource<AiCreditsData>(
  "ai/credits",
  async () => {
    const res = await aiApi.getCredits();
    return res.data?.data || res.data || {};
  },
  // ONLY the "value changed" event. AI_BILLING_EVENT and vc:workspace-switch
  // were in this list and made things worse: both are dispatched during normal
  // boot, so each page load forced 2-3 extra refetches (measured live at 4 ×
  // subscription/status per load with the same mistake). A profile switch is
  // handled by the KEY below instead — it changes, so the store refetches
  // exactly once, and boot-time event noise is ignored.
  ["aiCreditsChanged"],
);

/** The balance as a plain number, however the payload nests it. */
export function creditsTotal(d: AiCreditsData | null): number | null {
  if (!d) return null;
  const total = d.totalCredits ?? d.balance?.totalCredits ?? d.credits ?? null;
  return typeof total === "number" ? total : null;
}

export function useAiCredits() {
  const { data: session } = useSession();
  const { activeBillingTeamId } = useAiBilling();
  // Keyed by user AND billing profile: the same person sees a different balance
  // for personal vs each team's shared pool, so the key IS the invalidation.
  const userId = ((session?.user as any)?.id ||
    (session?.user as any)?.email ||
    null) as string | null;
  const key = userId ? `${userId}:${activeBillingTeamId || "personal"}` : null;

  const state = resource.use(key);
  return { ...state, total: creditsTotal(state.data) };
}

export const __aiCreditsResource = resource;
