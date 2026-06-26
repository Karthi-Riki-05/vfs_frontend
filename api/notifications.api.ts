import api from "@/lib/axios";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
  metadata: any;
  createdAt: string;
}

export const notificationsApi = {
  list: (unreadOnly = false, limit = 20) =>
    api.get("/notifications", { params: { unreadOnly, limit } }),
  count: () => api.get("/notifications/count"),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put("/notifications/read-all"),
  broadcast: (payload: { title: string; body: string; url?: string }) =>
    api.post("/notifications/broadcast", payload),
  deleteOne: (id: string) => api.delete(`/notifications/${id}`),
  deleteAll: () => api.delete("/notifications/delete-all"),
};

export const flowPackApi = {
  pickerList: (teamPicker = false) =>
    api.get("/flows/picker-list", { params: { teamPicker } }),
  confirmSelection: (selectedFlowIds: string[], teamPicker = false) =>
    api.post("/flows/confirm-selection", { selectedFlowIds, teamPicker }),
  packStatus: () => api.get("/flows/pack-status"),
};
