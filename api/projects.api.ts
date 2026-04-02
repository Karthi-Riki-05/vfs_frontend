import api from '@/lib/axios';

export const projectsApi = {
  list: (params?: { search?: string }) =>
    api.get('/projects', { params }),

  get: (id: string) =>
    api.get(`/projects/${id}`),

  create: (data: { name: string; description?: string }) =>
    api.post('/projects', data),

  update: (id: string, data: { name?: string; description?: string | null }) =>
    api.put(`/projects/${id}`, data),

  delete: (id: string) =>
    api.delete(`/projects/${id}`),

  assignFlow: (projectId: string, flowId: string) =>
    api.post(`/projects/${projectId}/assign-flow`, { flowId }),

  unassignFlow: (projectId: string, flowId: string) =>
    api.post(`/projects/${projectId}/unassign-flow`, { flowId }),
};
