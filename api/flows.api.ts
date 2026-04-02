import api from '@/lib/axios';

export const flowsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; sort?: string }) =>
    api.get('/flows', { params }),

  get: (id: string) =>
    api.get(`/flows/${id}`),

  toggleFavorite: (id: string, isFavorite: boolean) =>
    api.put(`/flows/${id}`, { isFavorite }),

  getFavorites: () =>
    api.get('/flows/favorites'),

  create: (data: { name: string; description?: string; templateId?: string; projectId?: string }) =>
    api.post('/flows', data),

  update: (id: string, data: { name?: string; description?: string; projectId?: string | null }) =>
    api.put(`/flows/${id}`, data),

  delete: (id: string) =>
    api.delete(`/flows/${id}`),

  duplicate: (id: string) =>
    api.post(`/flows/${id}/duplicate`),

  updateDiagram: (id: string, data: { xml: string; thumbnail?: string }) =>
    api.put(`/flows/${id}/diagram`, data),

  publish: (id: string, isPublic: boolean) =>
    api.put(`/flows/${id}`, { isPublic }),

  export: (id: string, format: string) =>
    api.get(`/flows/${id}`, { params: { export: format } }),

  // Sharing
  shareFlow: (id: string, shares: { userId: string; permission: string }[]) =>
    api.post(`/flows/${id}/share`, { shares }),

  getShares: (id: string) =>
    api.get(`/flows/${id}/shares`),

  updateShare: (flowId: string, shareId: string, permission: string) =>
    api.put(`/flows/${flowId}/shares/${shareId}`, { permission }),

  removeShare: (flowId: string, shareId: string) =>
    api.delete(`/flows/${flowId}/shares/${shareId}`),

  getAvailableShareMembers: () =>
    api.get('/flows/share/members'),
};
