"use client";

import { useState, useEffect, useCallback } from "react";
import { dashboardApi } from "@/api/dashboard.api";
import { useAppContext } from "@/context/AppContext";

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

export function useDashboard() {
  const { activeTeamId, hydrated } = useAppContext();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [recentFlows, setRecentFlows] = useState<RecentFlow[]>([]);
  const [teamActivity, setTeamActivity] = useState<TeamActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, activityRes, recentRes, teamRes] = await Promise.all([
        dashboardApi.getStats(activeTeamId).catch(() => null),
        dashboardApi.getActivity(activeTeamId).catch(() => null),
        dashboardApi.getRecentFlows(5, activeTeamId).catch(() => null),
        dashboardApi.getTeamActivity().catch(() => null),
      ]);

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
      }
    } finally {
      setLoading(false);
    }
  }, [activeTeamId]);

  useEffect(() => {
    if (!hydrated) return;
    fetchAll();
  }, [fetchAll, hydrated]);

  return {
    stats,
    activity,
    recentFlows,
    teamActivity,
    loading,
    refresh: fetchAll,
  };
}
