import api from '@/lib/axios';

export const teamsApi = {
  list: () =>
    api.get('/teams'),

  get: (id: string) =>
    api.get(`/teams/${id}`),

  create: (data: { name: string; description?: string }) =>
    api.post('/teams', data),

  update: (id: string, data: { name?: string; description?: string }) =>
    api.put(`/teams/${id}`, data),

  delete: (id: string) =>
    api.delete(`/teams/${id}`),

  listMembers: (teamId: string) =>
    api.get(`/teams/${teamId}/members`),

  addMember: (teamId: string, data: { userId: string; role?: string }) =>
    api.post(`/teams/${teamId}/members`, data),

  removeMember: (teamId: string, userId: string) =>
    api.delete(`/teams/${teamId}/members/${userId}`),

  invite: (data: { email: string; teamId: string; role?: string }) =>
    api.post('/teams/invite', data),
};
