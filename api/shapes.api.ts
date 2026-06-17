import api from "@/lib/axios";

export const shapesApi = {
  list: (params?: { groupId?: string; search?: string }) =>
    api.get("/shapes", { params }),

  get: (id: string) => api.get(`/shapes/${id}`),

  create: (data: any) => api.post("/shapes", data),

  update: (id: string, data: any) => api.put(`/shapes/${id}`, data),

  delete: (id: string) => api.delete(`/shapes/${id}`),

  listCategories: () => api.get("/shapes", { params: { categories: true } }),

  // ── Shape ↔ Team / Chat Group association ──────────────────────────
  // `shape` is optional inline data ({name, xmlContent, thumbnail}) used to
  // create the Shape row when the diagram cell has no backing record yet.
  associateTeam: (
    shapeId: string,
    data: {
      teamId: string;
      shape?: { name: string; xmlContent?: string; thumbnail?: string };
    },
  ) => api.post(`/shapes/${shapeId}/associate-team`, data),

  associateGroup: (
    shapeId: string,
    data: {
      groupId: string;
      shape?: { name: string; xmlContent?: string; thumbnail?: string };
    },
  ) => api.post(`/shapes/${shapeId}/associate-group`, data),

  removeAssociation: (shapeId: string) =>
    api.delete(`/shapes/${shapeId}/remove-association`),

  getAssociation: (shapeId: string) =>
    api.get(`/shapes/${shapeId}/association`),

  checkAssociations: (shapeIds: string[]) =>
    api.post("/shapes/check-associations", { shapeIds }),

  bulkDelete: (shapeIds: string[]) =>
    api.delete("/shapes/bulk-delete", { data: { shapeIds } }),
};
