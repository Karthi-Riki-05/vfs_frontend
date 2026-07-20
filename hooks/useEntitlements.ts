"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/axios";
import { onWorkspaceFlush } from "@/lib/workspaceCache";

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
 * interceptor attaches X-Team-Context, so a member inside a paid tenant
 * inherits the tenant owner's tier (Inherited Subscription Power) — never
 * gate features by session.currentVersion alone.
 *
 * While loading, `entitlements` is null — callers should fail CLOSED for
 * premium-only UI (hide until confirmed) rather than flash it.
 */
export function useEntitlements() {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get("/entitlements");
      const d = res.data?.data || res.data;
      if (d && typeof d === "object" && "tier" in d) {
        setEntitlements(d as Entitlements);
      }
    } catch {
      // Fail closed — keep null so premium UI stays hidden.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refetch under the new X-Team-Context when the workspace switches —
  // mirrors useFlows' onWorkspaceFlush handling.
  useEffect(
    () =>
      onWorkspaceFlush(() => {
        setEntitlements(null);
        setLoading(true);
        refresh();
      }),
    [refresh],
  );

  return { entitlements, loading, refresh };
}
