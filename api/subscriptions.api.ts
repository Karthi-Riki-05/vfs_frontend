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
};
