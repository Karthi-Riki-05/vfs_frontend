import api, { upload } from '@/lib/axios';

export const usersApi = {
  getMe: () =>
    api.get('/users/me'),

  updateProfile: (data: { name?: string; email?: string }) =>
    api.put('/users/me', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/users/me/password', data),

  uploadAvatar: (file: File, onProgress?: (percent: number) => void) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return upload('/users/me', formData, onProgress);
  },
};
