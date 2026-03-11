import api from '@/lib/axios';

export const aiApi = {
  chat: (message: string, conversationId?: string, userContext?: any) =>
    api.post('/ai-assistant/chat', { message, conversationId, userContext }),

  getContext: () => api.get('/ai-assistant/context'),

  getConsent: () => api.get('/ai-assistant/consent'),

  setConsent: (consented: boolean) =>
    api.post('/ai-assistant/consent', { consented }),

  getHistory: (page = 1, limit = 20) =>
    api.get('/ai-assistant/history', { params: { page, limit } }),

  getConversation: (id: string) =>
    api.get(`/ai-assistant/history/${id}`),

  deleteData: () => api.delete('/ai-assistant/data'),
};
