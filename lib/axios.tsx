import axios from 'axios';
import { signOut } from 'next-auth/react';

// Create a custom instance
const api = axios.create({
    baseURL: '/api', // Default to current origin /api for Next.js internal routes, or adjust if hitting backend directly
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a response interceptor
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Check if the error is due to unauthorized access
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // If we are on the client side, redirect to login
            if (typeof window !== 'undefined') {
                console.warn("Session expired or invalid token. Logging out...");
                // Use signOut from next-auth/react to clear session and redirect
                // We wrap in a check to avoid loops if login itself 401s (though unlikely with next-auth)
                if (!window.location.pathname.includes('/login')) {
                    signOut({ callbackUrl: '/login' });
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
