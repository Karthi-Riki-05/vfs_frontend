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

  getContext: () => api.get("/ai-assistant/context"),

  getConsent: () => api.get("/ai-assistant/consent"),

  setConsent: (consented: boolean) =>
    api.post("/ai-assistant/consent", { consented }),

  getHistory: (page = 1, limit = 20) =>
    api.get("/ai-assistant/history", { params: { page, limit } }),

  getConversation: (id: string) => api.get(`/ai-assistant/history/${id}`),

  deleteData: () => api.delete("/ai-assistant/data"),

  getCredits: () => api.get("/ai/credits"),

  detectIntent: (message: string, conversationId?: string | null) =>
    api.post("/ai/detect", { message, conversationId: conversationId || null }),

  generateDiagramWithConfirm: (message: string, confirmed: boolean) =>
    api.post("/ai/generate-diagram", { message, confirmed }),

  createAddonCheckout: (packType: "starter" | "standard" | "proppack") =>
    api.post("/ai/addon/checkout", { packType }),

  verifyAddonPurchase: (sessionId: string) =>
    api.get(`/ai/addon/verify?session_id=${encodeURIComponent(sessionId)}`),

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

  // Async diagram generation — start a job (returns jobId immediately, no 504),
  // then poll getDiagramJob until status is done/error.
  startDiagramJob: (
    message: string,
    confirmed: boolean,
    conversationId?: string | null,
    messageId?: string | null,
  ) =>
    api.post("/ai/generate-diagram-job", {
      message,
      confirmed,
      conversationId: conversationId || undefined,
      messageId: messageId || undefined,
    }),

  getDiagramJob: (jobId: string) =>
    api.get(`/ai/generate-diagram-job/${jobId}`),

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
