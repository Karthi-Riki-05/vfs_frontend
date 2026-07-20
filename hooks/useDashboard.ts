"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { dashboardApi } from "@/api/dashboard.api";
import { useAppContext } from "@/context/AppContext";
import { onWorkspaceFlush } from "@/lib/workspaceCache";

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

  useEffect(() => {
    mountedRef.current = true;
    if (!hydrated) return;
    fetchAll();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchAll, hydrated]);

  // B24: the editor opens in a NEW tab (window.open), so this dashboard tab
  // never remounts — Recent Flows went stale after editing until a manual
  // refresh. Refetch when the tab regains focus / becomes visible so the
  // recent list reflects the latest edit on return.
  useEffect(() => {
    if (!hydrated) return;
    const onFocus = () => {
      if (document.visibilityState === "visible") fetchAll();
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
      }),
    [],
  );

  return {
    stats,
    activity,
    recentFlows,
    teamActivity,
    loading,
    refresh: fetchAll,
  };
}
