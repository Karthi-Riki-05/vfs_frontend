import api from '@/lib/axios';

export const subscriptionsApi = {
  getCurrent: () =>
    api.get('/subscription/current'),

  getPlans: () =>
    api.get('/subscription/plans'),

  subscribe: (data: { planId: string }) =>
    api.post('/subscription/subscribe', data),

  cancel: () =>
    api.post('/subscription/cancel'),

  // --- New Stripe checkout flow ---
  createCheckout: (data: { plan: 'monthly' | 'yearly'; teamMembers: number }) =>
    api.post('/subscription/create-checkout-session', data),

  getStatus: () =>
    api.get('/subscription/status'),

  verifySession: (data: { sessionId: string }) =>
    api.post('/subscription/verify-session', data),

  changePlan: (data: { plan: 'monthly' | 'yearly'; teamMembers: number }) =>
    api.post('/subscription/change-plan', data),

  activateNow: () =>
    api.post('/subscription/activate-now'),

  cancelScheduled: () =>
    api.post('/subscription/cancel-scheduled'),
};
