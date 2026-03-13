import api from '@/lib/axios';

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getActivity: () => api.get('/dashboard/activity'),
  getRecentFlows: (limit = 5) => api.get('/dashboard/recent-flows', { params: { limit } }),
  getTeamActivity: (limit = 10) => api.get('/dashboard/team-activity', { params: { limit } }),
};
