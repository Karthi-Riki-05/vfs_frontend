"use client";

import { useState, useEffect, useCallback } from 'react';
import { dashboardApi } from '@/api/dashboard.api';

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
  action: 'created' | 'edited';
  timestamp: string;
}

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activity, setActivity] = useState<ActivityDay[]>([]);
  const [recentFlows, setRecentFlows] = useState<RecentFlow[]>([]);
  const [teamActivity, setTeamActivity] = useState<TeamActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, activityRes, recentRes, teamRes] = await Promise.all([
        dashboardApi.getStats().catch(() => null),
        dashboardApi.getActivity().catch(() => null),
        dashboardApi.getRecentFlows().catch(() => null),
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
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { stats, activity, recentFlows, teamActivity, loading, refresh: fetchAll };
}
