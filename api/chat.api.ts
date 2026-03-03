import api from '@/lib/axios';

export const chatApi = {
  listGroups: () =>
    api.get('/chat/groups'),

  // Backend expects { title }, not { name }
  createGroup: (data: { title: string; memberIds: string[] }) =>
    api.post('/chat/groups', data),

  getMessages: (groupId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/chat/groups/${groupId}/messages`, { params }),

  // Backend expects { message }, not { content }
  sendMessage: (groupId: string, content: string) =>
    api.post(`/chat/groups/${groupId}/messages`, { message: content }),

  // Backend uses PUT, not POST
  markAsRead: (messageId: string) =>
    api.put(`/chat/messages/${messageId}/read`),
};
