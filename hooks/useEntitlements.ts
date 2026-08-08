"use client";

import { useSession } from "next-auth/react";
import api from "@/lib/axios";
import { createSharedResource } from "@/lib/sharedResource";
import { useAiBilling } from "@/context/AiBillingContext";

export interface Entitlements {
  tier: "free" | "pro" | "team";
  isPaid: boolean;
  aiProvider: string;
  canUseClaude: boolean;
  canManageTeams: boolean;
  canShareFlows: boolean;
  canExport: boolean;
  modules: string[];
  limits: Record<string, number | null>;
}

/**
 * Resolved feature entitlements for the ACTIVE workspace. The axios
 * interceptor attaches X-Workspace-Context, so a member inside a paid tenant
 * inherits the tenant owner's tier (Inherited Subscription Power) — never
 * gate features by session.currentVersion alone.
 *
 * While loading, `entitlements` is null — callers should fail CLOSED for
 * premium-only UI (hide until confirmed) rather than flash it.
 *
 * bug-106 (2026-08-08): this hook existed and said exactly that, and had ONE
 * consumer. The sidebar locks, the plan badge and the subscription card were
 * all gating on PERSONAL signals instead (`session.hasTeamAccess`,
 * `subscription/info`), which answer "what did YOU buy?" rather than "what can
 * you do HERE". A member inside a paid workspace therefore saw "Free Plan",
 * "No active subscription" and padlocks on Teams/Chat — beside the workspace's
 * 176 AI credits, which they could actually spend.
 *
 * OPT-3 store: keyed by user + billing profile, so a workspace switch refetches
 * exactly once. NOT event-invalidated — `AI_BILLING_EVENT` and
 * `vc:workspace-switch` both fire during boot, which would make every page load
 * refetch 3-4 times (that mistake is recorded in bug-105).
 */
const resource = createSharedResource<Entitlements>("entitlements", async () => {
  const res = await api.get("/entitlements");
  const d = res.data?.data || res.data;
  if (d && typeof d === "object" && "tier" in d) return d as Entitlements;
  // Fail CLOSED: a malformed payload must not read as "everything unlocked".
  throw new Error("malformed entitlements payload");
});

export function useEntitlements() {
  const { data: session } = useSession();
  const { activeBillingTeamId } = useAiBilling();
  const userId = ((session?.user as any)?.id ||
    (session?.user as any)?.email ||
    null) as string | null;
  const key = userId ? `${userId}:${activeBillingTeamId || "personal"}` : null;

  const { data, loading, reload } = resource.use(key);
  return { entitlements: data, loading, refresh: reload };
}

/** Does the active workspace grant this module? Fails CLOSED while loading. */
export function useHasModule(moduleKey: string): {
  allowed: boolean;
  loading: boolean;
} {
  const { entitlements, loading } = useEntitlements();
  return {
    allowed: !!entitlements?.modules?.includes(moduleKey),
    loading,
  };
}

export const __entitlementsResource = resource;
