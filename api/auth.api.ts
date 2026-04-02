import api from '@/lib/axios';

export const authApi = {
  forgotPassword: (email: string) =>
    api.post('/users/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post('/users/reset-password', { token, password }),
};
