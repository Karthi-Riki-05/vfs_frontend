import api from '@/lib/axios';

export const adminApi = {
  // Dashboard
  getStats: () =>
    api.get('/admin/stats'),

  // Users
  listUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/admin/users', { params }),

  updateUser: (id: string, data: { role?: string; isActive?: boolean }) =>
    api.put(`/admin/users/${id}`, data),

  // Plans
  listPlans: () =>
    api.get('/admin/plans'),

  createPlan: (data: { name: string; price: number; features?: string[] }) =>
    api.post('/admin/plans', data),

  updatePlan: (id: string, data: any) =>
    api.put(`/admin/plans/${id}`, data),

  // Subscriptions
  listSubscriptions: (params?: { page?: number; limit?: number }) =>
    api.get('/admin/subscriptions', { params }),

  // Transactions
  listTransactions: (params?: { page?: number; limit?: number }) =>
    api.get('/admin/transactions', { params }),

  // Feedback
  listFeedback: (params?: { page?: number; limit?: number }) =>
    api.get('/admin/feedback', { params }),

  respondFeedback: (id: string, data: { response: string }) =>
    api.put(`/admin/feedback/${id}`, data),

  // Offers
  listOffers: () =>
    api.get('/admin/offers'),

  createOffer: (data: { name: string; discount: number; planId?: string }) =>
    api.post('/admin/offers', data),

  updateOffer: (id: string, data: any) =>
    api.put(`/admin/offers/${id}`, data),

  deleteOffer: (id: string) =>
    api.delete(`/admin/offers/${id}`),
};
