import api from '@/lib/axios';

export const issuesApi = {
  // flowId is optional filter (backend requires it on create but not on list)
  list: (params?: { page?: number; limit?: number; flowId?: number }) =>
    api.get('/issues', { params }),

  get: (id: string) =>
    api.get(`/issues/${id}`),

  // Backend IssueItem model: title (required), flowId (required Int), isChecked
  create: (data: { title: string; flowId: number }) =>
    api.post('/issues', data),

  // Backend only supports updating title and isChecked
  update: (id: string, data: { title?: string; isChecked?: boolean }) =>
    api.put(`/issues/${id}`, data),

  delete: (id: string) =>
    api.delete(`/issues/${id}`),
};
