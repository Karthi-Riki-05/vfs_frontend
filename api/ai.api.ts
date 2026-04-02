import api from '@/lib/axios';

export const aiApi = {
  chat: (message: string, conversationId?: string, userContext?: any) =>
    api.post('/ai-assistant/chat', { message, conversationId, userContext }),

  generateDiagram: (message: string, existingXml?: string | null, conversationId?: string | null) =>
    api.post('/ai-assistant/generate-diagram', { message, existingXml, conversationId }),

  generateDiagramFromDocument: (file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    return api.post('/ai-assistant/generate-diagram-from-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

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
