import api from '@/lib/axios';

export const flowsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; sort?: string }) =>
    api.get('/flows', { params }),

  get: (id: string) =>
    api.get(`/flows/${id}`),

  create: (data: { name: string; description?: string; templateId?: string }) =>
    api.post('/flows', data),

  update: (id: string, data: { name?: string; description?: string }) =>
    api.put(`/flows/${id}`, data),

  delete: (id: string) =>
    api.delete(`/flows/${id}`),

  duplicate: (id: string) =>
    api.post(`/flows/${id}/duplicate`),

  updateDiagram: (id: string, data: { xml: string; thumbnail?: string }) =>
    api.put(`/flows/${id}/diagram`, data),

  publish: (id: string, isPublic: boolean) =>
    api.put(`/flows/${id}`, { isPublic }),

  share: (id: string, data: { email: string; permission: string }) =>
    api.post(`/flows/${id}`, data),

  export: (id: string, format: string) =>
    api.get(`/flows/${id}`, { params: { export: format } }),
};
