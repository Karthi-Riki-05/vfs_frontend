import axios from 'axios';
import { signOut } from 'next-auth/react';
import { message } from 'antd';

// Create a custom instance
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Retry logic for network failures
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;

        // Retry once on network error (not on HTTP errors)
        if (!error.response && !config._retry) {
            config._retry = true;
            return api(config);
        }

        // Rate limit handling
        if (error.response?.status === 429) {
            message.warning('Too many requests. Please slow down.');
        }

        // Auth failure → auto-logout
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                console.warn("Session expired or invalid token. Logging out...");
                signOut({ callbackUrl: '/login' });
            }
        }

        return Promise.reject(error);
    }
);

// Upload helper with progress
export function upload(url: string, formData: FormData, onProgress?: (percent: number) => void) {
    return api.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
            if (onProgress && e.total) {
                onProgress(Math.round((e.loaded * 100) / e.total));
            }
        },
    });
}

export default api;
