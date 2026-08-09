"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { dashboardApi } from "@/api/dashboard.api";
import { useAppContext } from "@/context/AppContext";
import { onWorkspaceFlush } from "@/lib/workspaceCache";
import { AI_BILLING_EVENT } from "@/lib/aiBilling";

interface DashboardStats {
  totalFlows: number;
  editedThisMonth: number;
  sharedFlows: number;
  teamMembers: number;
}

interface ActivityDay {
  date: string;
  label: string;
  created: number;
  edited: number;
}

interface RecentFlow {
  id: string;
  name: string;
  thumbnail: string | null;
  updatedAt: string;
  isFavorite: boolean;
}

interface TeamActivity {
  id: string;
  flowName: string;
  userName: string;
  userImage: string | null;
  action: "created" | "edited";
  timestamp: string;
}

interface UseDashboardOptions {
  fetchTeamActivity?: boolean;
}

export function useDashboard({ fetchTeamActivity }: UseDashboardOptions = {}) {
  const { activeTeamId, hydrated } = useAppContext();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [recentFlows, setRecentFlows] = useState<RecentFlow[]>([]);
  const [teamActivity, setTeamActivity] = useState<TeamActivity[]>([]);
  const [loading, setLoading] = useState(true);
  // Guards against setState after unmount (fire-and-forget refetch on nav).
  const mountedRef = useRef(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Determine whether to fetch team activity:
      // - fetchTeamActivity=true  → always fetch (team dashboard)
      // - fetchTeamActivity=false → never fetch (pro dashboard)
      // - fetchTeamActivity=undefined → only when activeTeamId exists (existing behavior)
      const shouldFetchTeam =
        fetchTeamActivity !== undefined
          ? fetchTeamActivity && !!activeTeamId
          : !!activeTeamId;

      const teamPromise = shouldFetchTeam
        ? dashboardApi.getTeamActivity(10, activeTeamId).catch(() => null)
        : Promise.resolve(null);

      const [statsRes, activityRes, recentRes, teamRes] = await Promise.all([
        dashboardApi.getStats(activeTeamId).catch(() => null),
        dashboardApi.getActivity(activeTeamId).catch(() => null),
        dashboardApi.getRecentFlows(5, activeTeamId).catch(() => null),
        teamPromise,
      ]);

      if (!mountedRef.current) return;
      if (statsRes) {
        const d = statsRes.data?.data || statsRes.data;
        setStats(d);
      }
      if (activityRes) {
        const d = activityRes.data?.data || activityRes.data;
        setActivity(Array.isArray(d) ? d : []);
      }
      if (recentRes) {
        const d = recentRes.data?.data || recentRes.data;
        setRecentFlows(Array.isArray(d) ? d : []);
      }
      if (teamRes) {
        const d = teamRes.data?.data || teamRes.data;
        setTeamActivity(Array.isArray(d) ? d : []);
      } else {
        setTeamActivity([]);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [activeTeamId, fetchTeamActivity]);

  // OPT-6 (2026-08-08): skip a refetch when nothing that scopes it changed.
  //
  // `fetchAll` is rebuilt whenever `activeTeamId` changes and this effect
  // depends on it, so the workspace context settling AFTER boot re-ran the
  // whole trio. An app switch does exactly that — `switchApp` resets the
  // context to personal — so one Team⇄Pro switch fetched stats/activity/
  // recent-flows TWICE inside a single page boot (measured 4× each, i.e. 2
  // rounds × StrictMode).
  //
  // Keyed on the scope, not a mount guard: a genuine workspace change still
  // refetches, because the key changes with it.
  //
  // bug-118: `refetchNonce` is part of the key, and it is the ONLY way anything
  // may blank the hook's state. Blanking used to reset `lastFetchKeyRef` to null
  // and rely on this effect re-running to refill — but the effect only re-runs
  // when one of its deps changes, so a "switch" to the workspace you are already
  // in blanked the data, pinned `loading` true and never fetched again. Bumping
  // the nonce guarantees blanking and refetching are the same operation.
  const lastFetchKeyRef = useRef<string | null>(null);
  const [refetchNonce, setRefetchNonce] = useState(0);
  useEffect(() => {
    mountedRef.current = true;
    if (!hydrated) return;
    const key = `${activeTeamId || "personal"}:${fetchTeamActivity ?? "auto"}:${refetchNonce}`;
    if (lastFetchKeyRef.current !== key) {
      lastFetchKeyRef.current = key;
      fetchAll();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [fetchAll, hydrated, activeTeamId, fetchTeamActivity, refetchNonce]);

  // B24: the editor opens in a NEW tab (window.open), so this dashboard tab
  // never remounts — Recent Flows went stale after editing until a manual
  // refresh. Refetch when the tab regains focus / becomes visible so the
  // recent list reflects the latest edit on return.
  //
  // OPT-2 (2026-08-08): throttled, and the double-fire removed. A single
  // tab-back raises BOTH `focus` and `visibilitychange`, and each listener ran
  // fetchAll — so one alt-tab cost 6 requests (3 endpoints × 2), and five
  // alt-tabs cost 30. Both events are still listened for (they are not
  // redundant: `focus` fires when the window regains focus without any
  // visibility change), but a shared timestamp collapses them into one refetch.
  //
  // 30s window: long enough that flipping between windows is free, short enough
  // that the B24 case — edit in the editor tab, come back — still refreshes.
  const lastFocusFetchRef = useRef<number>(0);
  useEffect(() => {
    if (!hydrated) return;
    const onFocus = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastFocusFetchRef.current < 30_000) return;
      lastFocusFetchRef.current = now;
      fetchAll();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [fetchAll, hydrated]);

  // Blank every stat/array on workspace switch so the previous bucket's
  // numbers never linger while the new context's stats are in flight.
  useEffect(
    () =>
      onWorkspaceFlush(() => {
        if (!mountedRef.current) return;
        setStats(null);
        setActivity([]);
        setRecentFlows([]);
        setTeamActivity([]);
        // Bump, don't null the key: nulling relies on a dep changing to trigger
        // the refill, and nothing guarantees one does (bug-118).
        setRefetchNonce((n) => n + 1);
      }),
    [],
  );

  // B31 (owner chose option c: accept the ~1.5s switch latency, show loading).
  // The block above listens for WORKSPACE_FLUSH_EVENT, but `flushWorkspaceCache()`
  // has NO production caller — only tests — so it never fires and the blanking
  // never actually ran. The live signal is `vc:workspace-switch` (dispatched by
  // TeamContextSwitcher, the same one NotificationDropdown and useTeams use) plus
  // AI_BILLING_EVENT. Measured before this: 0/45 frames showed a skeleton or
  // spinner during a switch, so the user stared at blank/zeroed cards for ~1.5s
  // with no indication anything was loading — that is what reads as "buffering".
  //
  // bug-118 (owner-reported: "dashboard takes a long time, sometimes the data is
  // not loaded properly … after a few minutes when I click anything it loads"):
  // BOTH of these events fire on a PLAIN PAGE LOAD. `AiBillingContext`'s boot
  // reconcile dispatches `vc:workspace-switch` on every load by design ("fire
  // workspace-switch on page load/refresh so AppContext updates … without
  // requiring a user click"), and `AI_BILLING_EVENT` follows whenever
  // localStorage disagreed with the server-resolved value.
  //
  // So every boot raced: the mount fetch started, then this handler blanked the
  // result and pinned `loading` true. Whether you saw data came down to which
  // finished first — hence "sometimes". Recovery only came from the focus
  // listener below, which is throttled to 30s, hence "after a few minutes".
  //
  // The fix is to ask whether the workspace ACTUALLY changed. A reconcile that
  // resolves to the workspace you are already in is not a switch. `activeTeamId`
  // is read through a ref so this listener is registered once and still sees the
  // current value — re-registering on every change would drop events mid-switch.
  //
  // This is the trap bug-105 documented — *an event that fires during boot is
  // not an invalidation signal* — which was applied to useSubscriptionStatus,
  // useAiCredits and useEntitlements but missed here.
  const activeTeamIdRef = useRef(activeTeamId);
  activeTeamIdRef.current = activeTeamId;
  useEffect(() => {
    if (!hydrated) return;
    const onSwitch = (e: Event) => {
      if (!mountedRef.current) return;
      const detail = (e as CustomEvent<{ teamId?: string | null }>).detail;
      const next = detail?.teamId ?? null;
      // Same workspace → boot reconcile or a no-op re-select. Leave the data
      // alone; blanking it here is exactly what stranded the dashboard.
      if (next === (activeTeamIdRef.current ?? null)) return;
      setStats(null);
      setActivity([]);
      setRecentFlows([]);
      setTeamActivity([]);
      setLoading(true);
      // Guarantees the refill. `activeTeamId` will also change, and React
      // batches both into one render, so this is still a single refetch.
      setRefetchNonce((n) => n + 1);
    };
    window.addEventListener("vc:workspace-switch", onSwitch);
    window.addEventListener(AI_BILLING_EVENT, onSwitch);
    return () => {
      window.removeEventListener("vc:workspace-switch", onSwitch);
      window.removeEventListener(AI_BILLING_EVENT, onSwitch);
    };
  }, [hydrated]);

  return {
    stats,
    activity,
    recentFlows,
    teamActivity,
    loading,
    refresh: fetchAll,
  };
}
