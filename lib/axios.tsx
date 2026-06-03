import axios from "axios";
import { signOut } from "next-auth/react";
import { message } from "antd";
import { getAiBillingTeamId } from "@/lib/aiBilling";

// Create a custom instance
const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Override timeout for AI diagram generation (Gemini can be slow)
api.interceptors.request.use((config) => {
  if (config.url?.includes("generate-diagram")) {
    config.timeout = 120000; // 120s for diagram generation (Gemini can be slow)
  }
  return config;
});

// Prevent multiple signOut calls from cascading 401 responses
let isSigningOut = false;

// Private team buckets: ONE active-context selection (the profile switcher)
// drives BOTH data scope and AI-credit billing. We attach X-Team-Context to
// every API request. The backend scopes every data list by ownerId AND teamId
// (never teamId alone), so this can't leak another user's rows (DATA-LOSS-001),
// and AI controllers route the deduction via resolveBillingUser. Personal
// selection (null) sends no header → the teamId=null bucket / personal pool.
api.interceptors.request.use((config) => {
  try {
    const teamId = getAiBillingTeamId();
    if (teamId) {
      config.headers = config.headers || {};
      (config.headers as Record<string, string>)["X-Team-Context"] = teamId;
    }
  } catch {
    // localStorage blocked — personal scope (no header).
  }
  return config;
});

// Retry logic for network failures
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Don't retry or handle errors if we're already signing out
    if (isSigningOut) {
      return Promise.reject(error);
    }

    // Retry up to 3 times for AI diagram generation (timeouts or network errors)
    const isDiagramRequest = config?.url?.includes("generate-diagram");
    const retryCount = (config as any)._retryCount || 0;
    const maxRetries = isDiagramRequest ? 3 : 1;

    // Retry on network error, timeout, or 503 (service unavailable)
    if (
      retryCount < maxRetries &&
      (!error.response ||
        error.code === "ECONNABORTED" ||
        error.response?.status === 503)
    ) {
      (config as any)._retryCount = retryCount + 1;
      // Exponential backoff: 1s, 2s, 4s
      await new Promise((r) => setTimeout(r, Math.pow(2, retryCount) * 1000));
      return api(config);
    }

    // Rate limit handling
    if (error.response?.status === 429) {
      message.warning("Too many requests. Please slow down.");
    }

    // Auth failure → auto-logout (only on 401, NOT 403 — 403 is permission denied, not expired session)
    if (error.response?.status === 401) {
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/login") &&
        !isSigningOut
      ) {
        isSigningOut = true;
        console.warn("Session expired or invalid token. Logging out...");
        signOut({ callbackUrl: "/login" });
      }
    }

    return Promise.reject(error);
  },
);

// Upload helper with progress
export function upload(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
) {
  return api.post(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
}

export default api;
