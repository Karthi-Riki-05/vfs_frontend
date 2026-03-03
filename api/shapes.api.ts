import api from '@/lib/axios';

export const shapesApi = {
  list: (params?: { groupId?: string; search?: string }) =>
    api.get('/shapes', { params }),

  get: (id: string) =>
    api.get(`/shapes/${id}`),

  create: (data: any) =>
    api.post('/shapes', data),

  update: (id: string, data: any) =>
    api.put(`/shapes/${id}`, data),

  delete: (id: string) =>
    api.delete(`/shapes/${id}`),

  listCategories: () =>
    api.get('/shapes', { params: { categories: true } }),
};
