import api from '@/lib/axios';

export const proApi = {
    getAppStatus: () => api.get('/pro/app-status'),
    switchApp: (app: 'free' | 'pro') => api.put('/pro/switch-app', { app }),
    purchasePro: () => api.post('/upgrade-pro/checkout'),
    buyFlows: (flowPackage: '50' | 'unlimited') => api.post('/pro/buy-flows', { package: flowPackage }),
    getFlowPricing: () => api.get('/pro/flow-pricing'),
    verifyPurchase: (sessionId: string) => api.get(`/upgrade-pro/verify?session_id=${sessionId}`),
    getSubscriptionStatus: () => api.get('/pro/subscription-status'),
};
