import api from "@/lib/axios";

export const teamsApi = {
  list: () => api.get("/teams"),

  get: (id: string) => api.get(`/teams/${id}`),

  create: (data: { name: string; description?: string }) =>
    api.post("/teams", data),

  update: (id: string, data: { name?: string; description?: string }) =>
    api.put(`/teams/${id}`, data),

  delete: (id: string) => api.delete(`/teams/${id}`),

  listMembers: (teamId: string) => api.get(`/teams/${teamId}/members`),

  addMember: (teamId: string, data: { email: string; appType?: string }) =>
    api.post(`/teams/${teamId}/members`, data),

  removeMember: (teamId: string, userId: string) =>
    api.delete(`/teams/${teamId}/members/${userId}`),

  updateMemberRole: (
    teamId: string,
    userId: string,
    role: "ADMIN" | "MEMBER",
  ) => api.put(`/teams/${teamId}/members/${userId}/role`, { role }),

  // CHANGE-001 — workspace-level roster. A team is only a label, so someone
  // whose teams were all deleted still belongs to the workspace and shows up
  // here and nowhere else.
  listWorkspaceMembers: () => api.get("/teams/workspace/members"),

  // The ONLY way to revoke workspace access. Removing someone from every team
  // does not do it.
  removeFromWorkspace: (userId: string) =>
    api.delete(`/teams/workspace/members/${userId}`),

  invite: (data: { teamId: string; email?: string; emails?: string[] }) =>
    api.post("/teams/invite", data),

  listInvites: (teamId: string) =>
    api.get(`/teams/invites`, { params: { teamId } }),

  cancelInvite: (inviteId: string) => api.delete(`/teams/invites/${inviteId}`),
};
