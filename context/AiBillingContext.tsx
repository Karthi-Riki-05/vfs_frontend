"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import api from "@/lib/axios";
import {
  AI_BILLING_EVENT,
  AI_BILLING_KEY,
  PRO_BILLING_KEY,
  getAiBillingTeamId,
  setAiBillingTeamId,
} from "@/lib/aiBilling";
import { flushWorkspaceCache } from "@/lib/workspaceCache";

// ─────────────────────────────────────────────────────────────────────────
// AI-billing context — which AI-credit pool (personal vs a team's shared pool)
// gets billed for AI generations. This is intentionally SEPARATE from
// AppContext: switching here changes credit billing ONLY. It never sets
// activeTeamId and never re-scopes flows/dashboard/chat data, which stay
// owner-private (DATA-LOSS-001 / Unified Ownership Model).
// ─────────────────────────────────────────────────────────────────────────

export interface BillingCredits {
  planCredits: number;
  addonCredits: number;
  total: number;
}

export interface BillingOption {
  teamId: string | null; // null = personal
  label: string;
  ownerName?: string | null;
  ownerEmail?: string | null;
  avatar?: string | null;
  role?: string;
  plan?: string;
  aiCredits: BillingCredits | null;
}

interface AiBillingValue {
  options: BillingOption[];
  activeBillingTeamId: string | null;
  activeOption: BillingOption;
  hasTeams: boolean;
  loading: boolean;
  switchBilling: (teamId: string | null) => Promise<void>;
  refresh: () => Promise<void>;
}

const PERSONAL_FALLBACK: BillingOption = {
  teamId: null,
  label: "Personal",
  aiCredits: null,
};

const AiBillingContext = createContext<AiBillingValue>({
  options: [PERSONAL_FALLBACK],
  activeBillingTeamId: null,
  activeOption: PERSONAL_FALLBACK,
  hasTeams: false,
  loading: true,
  switchBilling: async () => {},
  refresh: async () => {},
});

export function AiBillingProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const userKey =
    (session?.user as any)?.id || (session?.user as any)?.email || null;

  const [options, setOptions] = useState<BillingOption[]>([PERSONAL_FALLBACK]);
  // Lazy initializer runs once synchronously on mount — gives the correct
  // teamId from frame 1, before any async API call. In the Pro app we prefer
  // vc_pro_team_id over the generic billing key (which page.tsx clears on
  // ?app=pro entry so the old team-app teamId doesn't pollute first requests).
  const [activeBillingTeamId, setActive] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const appMode =
        sessionStorage.getItem("vc_app_context") ||
        sessionStorage.getItem("vc_forced_app_mode");
      if (appMode === "pro") {
        return localStorage.getItem("vc_pro_team_id") || null;
      }
      return getAiBillingTeamId();
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userKey) {
      setLoading(false);
      // Still signal readiness so the AppContextLoader splash dismisses on
      // first paint — otherwise (e.g. session not yet resolved) it would hang
      // until the 8s safety net.
      try {
        window.dispatchEvent(new CustomEvent("vc-context-ready"));
      } catch {}
      return;
    }
    try {
      // Server copy of the selection wins over localStorage — it survives a
      // WebView kill where localStorage may have been cleared/blocked.
      // Both calls are guarded: a slow/failed request must not stall the
      // `finally` that fires vc-context-ready (which gates the splash).
      const [ctxRes, listRes] = await Promise.all([
        api.get("/users/active-context").catch(() => null),
        api.get("/teams/my-contexts").catch(() => null),
      ]);

      const data = listRes?.data?.data || listRes?.data || {};
      const sessionUser = session?.user as any;
      const sessionName =
        sessionUser?.name || sessionUser?.email?.split("@")[0] || "Personal";
      const personalLabel = data.personal?.label || sessionName;
      const personal: BillingOption = {
        teamId: null,
        label: personalLabel,
        ownerName: data.personal?.ownerName || sessionUser?.name || null,
        ownerEmail: data.personal?.ownerEmail || sessionUser?.email || null,
        avatar:
          data.personal?.avatar || personalLabel?.[0]?.toUpperCase() || null,
        plan: data.personal?.plan,
        aiCredits: data.personal?.aiCredits || null,
      };
      const teams: BillingOption[] = (data.teams || []).map((t: any) => ({
        teamId: t.teamId,
        label: t.label,
        ownerName: t.ownerName,
        ownerEmail: t.ownerEmail,
        avatar: t.avatar || t.label?.[0]?.toUpperCase() || null,
        role: t.role,
        aiCredits: t.aiCredits || null,
      }));
      const nextOptions = [personal, ...teams];
      setOptions(nextOptions);

      // Reconcile the active selection: prefer the server value, then the
      // local one; drop it if that team is no longer available.
      const serverTeamId = ctxRes?.data?.data?.teamId ?? undefined;
      const localTeamId = getAiBillingTeamId();
      const candidate = serverTeamId !== undefined ? serverTeamId : localTeamId;
      // Trust the server value without options-list validation ONLY when the
      // user is currently inside the Pro app. The Pro team is an owned team
      // (excluded from the switchable list by design), so it never appears in
      // nextOptions — but it IS valid when forcedMode='pro'. In any other app
      // (Team app, web) a server-saved proTeamId must be dropped so the team
      // app doesn't inherit Pro app context (cross-app isolation).
      const isInProApp =
        typeof window !== "undefined" &&
        (() => {
          try {
            // sessionStorage is per-tab — immune to cross-tab overwrites from
            // another tab opening ?app=pro concurrently (Fix 4).
            return (
              sessionStorage.getItem("vc_app_context") === "pro" ||
              sessionStorage.getItem("vc_forced_app_mode") === "pro"
            );
          } catch {
            return false;
          }
        })();
      const valid =
        (serverTeamId !== undefined && isInProApp) ||
        candidate == null ||
        nextOptions.some((o) => o.teamId === candidate);
      const resolved = valid ? candidate : null;

      setActive(resolved);
      // Keep localStorage in sync with the server-resolved value (without
      // re-POSTing — this is a read reconcile, not a user switch).
      if (getAiBillingTeamId() !== resolved) setAiBillingTeamId(resolved);
    } catch {
      // Non-critical: fall back to personal-only.
      setOptions([PERSONAL_FALLBACK]);
      setActive(null);
    } finally {
      setLoading(false);
      try {
        window.dispatchEvent(new CustomEvent("vc-context-ready"));
      } catch {}
    }
  }, [userKey]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    refresh();
  }, [refresh, sessionStatus]);

  const switchBilling = useCallback(async (teamId: string | null) => {
    // 0. Flush workspace data cache immediately so useFlows / useTeams drop
    //    their stale arrays before the new fetch arrives — eliminates ghost-
    //    renders of the previous team's content during the loading window.
    flushWorkspaceCache();
    // 1. Local state + storage + event (drives the scoped axios header).
    setActive(teamId);
    setAiBillingTeamId(teamId);
    // 2. Tell credit displays to refetch with the new billing pool.
    try {
      window.dispatchEvent(new Event("aiCreditsChanged"));
    } catch {
      /* no-op */
    }
    // 3. Persist server-side (WebView-safe). Non-blocking — localStorage is
    //    the fallback if this fails.
    try {
      // appMode tells the backend which context field to write so the Pro app's
      // selection lands in lastActiveProTeamId, not the Team app's context.
      // (axios also attaches X-App-Context; body value takes precedence.)
      const appMode =
        (typeof window !== "undefined" &&
          (sessionStorage.getItem("vc_app_context") ||
            sessionStorage.getItem("vc_forced_app_mode"))) ||
        "team";
      await api.post("/users/active-context", {
        teamId: teamId || null,
        appMode,
      });
    } catch {
      /* ignore — selection still active for this session */
    }
  }, []);

  // Cross-tab / cross-component sync of the selection.
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ teamId: string | null }>).detail;
      if (detail) setActive(detail.teamId);
    };
    // Another tab wrote to AI_BILLING_KEY — re-derive the correct context for
    // THIS tab (don't blindly accept the new value; this tab may be in a
    // different app mode). refresh() re-runs the isInProApp check against
    // this tab's sessionStorage and returns the correct billing team.
    const onStorageChange = (e: StorageEvent) => {
      // Team tabs watch AI_BILLING_KEY, Pro tabs watch PRO_BILLING_KEY —
      // separate keys per app mode (see lib/aiBilling.ts) so a Pro tab's
      // reconcile can no longer ping-pong with Team tabs' reconciles.
      if (e.key !== AI_BILLING_KEY && e.key !== PRO_BILLING_KEY) return;
      refresh();
    };
    window.addEventListener(AI_BILLING_EVENT, onChange);
    window.addEventListener("storage", onStorageChange);
    return () => {
      window.removeEventListener(AI_BILLING_EVENT, onChange);
      window.removeEventListener("storage", onStorageChange);
    };
  }, [refresh]);

  const activeOption =
    options.find((o) => o.teamId === activeBillingTeamId) || options[0];

  const value: AiBillingValue = {
    options,
    activeBillingTeamId,
    activeOption,
    hasTeams: options.length > 1,
    loading,
    switchBilling,
    refresh,
  };

  return (
    <AiBillingContext.Provider value={value}>
      {children}
    </AiBillingContext.Provider>
  );
}

export function useAiBilling() {
  return useContext(AiBillingContext);
}
