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
  getAiBillingTeamId,
  AI_BILLING_EVENT,
  AI_BILLING_KEY,
} from "@/lib/aiBilling";

const STORAGE_KEY = "vc_active_context";
const CHANGE_EVENT = "vc:context-change";

export interface TeamContextOption {
  teamId: string;
  teamName: string;
  role: string;
  owner: { id: string; name?: string | null; image?: string | null };
  plan: "free" | "pro" | "team";
  hasPro: boolean;
  proUnlimitedFlows: boolean;
  proFlowLimit: number;
}

export interface PersonalContext {
  type: "personal";
}

export interface ActiveTeamContext {
  type: "team";
  teamId: string;
  teamName: string;
  ownerId: string;
  ownerName?: string | null;
  plan: "free" | "pro" | "team";
  hasPro: boolean;
  proUnlimitedFlows: boolean;
  proFlowLimit: number;
}

export type ActiveContext = PersonalContext | ActiveTeamContext;

export interface PersonalPlanInfo {
  currentVersion: "free" | "pro" | "team";
  hasPro: boolean;
  subscription?: {
    productType?: string | null;
    planName?: string | null;
    status?: string | null;
    expiresAt?: string | null;
  } | null;
}

interface AppContextValue {
  activeContext: ActiveContext;
  availableTeams: TeamContextOption[];
  // Resolved personal plan from backend (subscription-aware), NOT the stale
  // session/JWT field. Use this anywhere you'd otherwise read
  // session.user.currentVersion.
  personalPlan: PersonalPlanInfo;
  switchToPersonal: () => void;
  switchToTeam: (team: TeamContextOption) => void;
  refresh: () => Promise<void>;
  hydrated: boolean;
  effectivePlan: "free" | "pro" | "team";
  effectiveHasPro: boolean;
  effectiveFlowLimit: number;
  isTeamContext: boolean;
  // Convenience: numeric teamId for API calls (null when personal).
  activeTeamId: string | null;
}

const DEFAULT: AppContextValue = {
  activeContext: { type: "personal" },
  availableTeams: [],
  personalPlan: { currentVersion: "free", hasPro: false },
  switchToPersonal: () => {},
  switchToTeam: () => {},
  refresh: async () => {},
  hydrated: false,
  effectivePlan: "free",
  effectiveHasPro: false,
  effectiveFlowLimit: 10,
  isTeamContext: false,
  activeTeamId: null,
};

const AppContext = createContext<AppContextValue>(DEFAULT);

function readStored(): ActiveContext {
  // Unified ownership model: the app no longer has a switchable "team
  // workspace". Every user operates in their own data scope, so the active
  // context is always personal.
  return { type: "personal" };
}

function writeStored(ctx: ActiveContext) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: ctx }));
  } catch {
    // localStorage may be blocked
  }
}

export function AppContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  // Depend on a STABLE primitive (user id) rather than session.user object —
  // next-auth replaces the object identity on every silent refresh, which
  // used to loop fetch. Falls back to email or null.
  const userKey =
    (session?.user as any)?.id || (session?.user as any)?.email || null;
  const [activeContext, setActiveContext] = useState<ActiveContext>({
    type: "personal",
  });
  const [availableTeams, setAvailableTeams] = useState<TeamContextOption[]>([]);
  const [personalPlan, setPersonalPlan] = useState<PersonalPlanInfo>({
    currentVersion: "free",
    hasPro: false,
  });
  // Private team buckets: the active DATA scope follows the one switcher
  // selection (shared with AI billing via lib/aiBilling). null = personal
  // (teamId=null) bucket; a teamId = that team's bucket. This drives which
  // data the user sees, NOT their plan/entitlements (those stay personalPlan).
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount only — keeps SSR/CSR in sync.
  useEffect(() => {
    setActiveContext(readStored());
    setActiveTeamId(getAiBillingTeamId());
    setHydrated(true);
  }, []);

  // Track the switcher selection so data lists re-scope + refetch on switch.
  // AiBillingContext owns the source of truth (localStorage + server) and
  // fires AI_BILLING_EVENT on every switch and server reconcile.
  useEffect(() => {
    const onBilling = (e: Event) => {
      const detail = (e as CustomEvent<{ teamId: string | null }>).detail;
      setActiveTeamId(detail ? detail.teamId : getAiBillingTeamId());
    };
    // Cross-tab: the editor opens in a NEW tab via window.open(). A switch in
    // another tab updates localStorage and fires a 'storage' event here (but
    // not the same-tab CustomEvent), so sync activeTeamId from it too.
    const onStorage = (e: StorageEvent) => {
      if (e.key === AI_BILLING_KEY) setActiveTeamId(getAiBillingTeamId());
    };
    window.addEventListener(AI_BILLING_EVENT, onBilling);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(AI_BILLING_EVENT, onBilling);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!userKey) return;
    try {
      // Pass the current workspace so backend filters teams by appContext.
      // Reads currentVersion from session for the request-time hint.
      const sessAppCtx =
        ((session?.user as any)?.currentVersion as string | undefined) ||
        "free";
      const res = await api.get("/users/team-context", {
        params: { appContext: sessAppCtx },
      });
      const data = res.data?.data || res.data;
      // Unified ownership model: no team workspaces to switch into. We still
      // fetch this endpoint for the resolved personalPlan, but never expose
      // switchable teams.
      setAvailableTeams([]);
      if (data?.personalPlan) {
        setPersonalPlan({
          currentVersion: data.personalPlan.currentVersion || "free",
          hasPro: !!data.personalPlan.hasPro,
          subscription: data.personalPlan.subscription || null,
        });
      }

      // Always personal — no team context to reconcile.
      setActiveContext({ type: "personal" });
    } catch {
      // silent: non-critical
    }
  }, [userKey, session?.user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Cross-tab + cross-component sync.
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ActiveContext>).detail;
      if (detail) setActiveContext(detail);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setActiveContext(readStored());
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const switchToPersonal = useCallback(() => {
    const next: ActiveContext = { type: "personal" };
    setActiveContext(next);
    writeStored(next);
  }, []);

  // Unified ownership model: team workspaces were removed. Kept as a stable
  // no-op so any residual caller doesn't break; the context stays personal.
  const switchToTeam = useCallback((_team: TeamContextOption) => {
    void _team;
  }, []);

  // Derive effective plan/limits from active context. For PERSONAL context
  // we trust the resolved `personalPlan` from the backend (subscription-
  // aware) over the session/JWT, which can be stale after an upgrade.
  const sessionUser = session?.user as { proFlowLimit?: number } | undefined;

  const effectivePlan: "free" | "pro" | "team" =
    activeContext.type === "team"
      ? activeContext.plan
      : personalPlan.currentVersion;

  const effectiveHasPro =
    activeContext.type === "team" ? activeContext.hasPro : personalPlan.hasPro;

  const effectiveFlowLimit =
    activeContext.type === "team"
      ? activeContext.proUnlimitedFlows
        ? Number.POSITIVE_INFINITY
        : activeContext.proFlowLimit
      : sessionUser?.proFlowLimit || 10;

  const value: AppContextValue = {
    activeContext,
    availableTeams,
    personalPlan,
    switchToPersonal,
    switchToTeam,
    refresh,
    hydrated,
    effectivePlan,
    effectiveHasPro,
    effectiveFlowLimit,
    isTeamContext: activeContext.type === "team",
    // Data scope follows the switcher selection (decoupled from entitlements).
    activeTeamId,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}
