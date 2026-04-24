import api from "@/lib/axios";

export const dashboardApi = {
  getStats: (teamId?: string | null) =>
    api.get("/dashboard/stats", { params: teamId ? { teamId } : {} }),
  getActivity: (teamId?: string | null) =>
    api.get("/dashboard/activity", { params: teamId ? { teamId } : {} }),
  getRecentFlows: (limit = 5, teamId?: string | null) =>
    api.get("/dashboard/recent-flows", {
      params: teamId ? { limit, teamId } : { limit },
    }),
  getTeamActivity: (limit = 10) =>
    api.get("/dashboard/team-activity", { params: { limit } }),
};
