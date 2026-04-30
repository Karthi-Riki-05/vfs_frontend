import api from "@/lib/axios";

export const aiApi = {
  chat: (message: string, conversationId?: string, userContext?: any) =>
    api.post("/ai-assistant/chat", { message, conversationId, userContext }),

  generateDiagram: (
    message: string,
    existingXml?: string | null,
    conversationId?: string | null,
  ) =>
    api.post("/ai-assistant/generate-diagram", {
      message,
      existingXml,
      conversationId,
    }),

  generateDiagramFromDocument: (file: File) => {
    const formData = new FormData();
    formData.append("document", file);
    return api.post("/ai-assistant/generate-diagram-from-document", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  getContext: () => api.get("/ai-assistant/context"),

  getConsent: () => api.get("/ai-assistant/consent"),

  setConsent: (consented: boolean) =>
    api.post("/ai-assistant/consent", { consented }),

  getHistory: (page = 1, limit = 20) =>
    api.get("/ai-assistant/history", { params: { page, limit } }),

  getConversation: (id: string) => api.get(`/ai-assistant/history/${id}`),

  deleteData: () => api.delete("/ai-assistant/data"),

  getCredits: () => api.get("/ai/credits"),

  detectIntent: (message: string) => api.post("/ai/detect", { message }),

  generateDiagramWithConfirm: (message: string, confirmed: boolean) =>
    api.post("/ai/generate-diagram", { message, confirmed }),

  createAddonCheckout: (packType: "starter" | "standard" | "proppack") =>
    api.post("/ai/addon/checkout", { packType }),

  listConversations: () => api.get("/ai-assistant/conversations"),

  createConversation: () => api.post("/ai-assistant/conversations"),

  getConversationMessages: (conversationId: string) =>
    api.get(`/ai-assistant/conversations/${conversationId}/messages`),

  generateDiagramGated: (
    message: string,
    confirmed: boolean,
    conversationId?: string | null,
    messageId?: string | null,
  ) =>
    api.post("/ai/generate-diagram", {
      message,
      confirmed,
      conversationId: conversationId || undefined,
      messageId: messageId || undefined,
    }),

  updateConversationTitle: (conversationId: string, title: string) =>
    api.put(`/ai-assistant/conversations/${conversationId}/title`, { title }),

  deleteConversation: (conversationId: string) =>
    api.delete(`/ai-assistant/conversations/${conversationId}`),

  analyzeDocument: (
    file: File,
    message: string,
    conversationId?: string | null,
  ) => {
    const formData = new FormData();
    formData.append("document", file);
    formData.append("message", message);
    if (conversationId) formData.append("conversationId", conversationId);
    return api.post("/ai-assistant/analyze-document", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
