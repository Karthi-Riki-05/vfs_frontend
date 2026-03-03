import api from '@/lib/axios';

export const shapeGroupsApi = {
  list: () =>
    api.get('/shape-groups'),

  get: (id: string) =>
    api.get(`/shape-groups/${id}`),

  create: (data: { name: string; description?: string }) =>
    api.post('/shape-groups', data),

  update: (id: string, data: { name?: string; description?: string }) =>
    api.put(`/shape-groups/${id}`, data),

  delete: (id: string) =>
    api.delete(`/shape-groups/${id}`),
};
