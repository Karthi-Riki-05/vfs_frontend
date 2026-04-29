"use client";

// Firebase web SDK loaded LAZILY via dynamic import so unauthenticated/SSR
// renders don't pull the bundle. We register the SW with config from
// NEXT_PUBLIC_FIREBASE_* env vars and ask for an FCM token only AFTER the
// user explicitly grants notification permission.
//
// All exports return null/false when env is missing — callers must handle
// the unconfigured-locally case gracefully.

import api from "@/lib/axios";

type Cfg = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  messagingSenderId: string;
  appId: string;
};

function readConfig(): Cfg | null {
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };
  return cfg.apiKey && cfg.projectId && cfg.appId ? cfg : null;
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "Notification" in window &&
    "PushManager" in window
  );
}

export function currentPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

async function ensureServiceWorker(cfg: Cfg) {
  const reg = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
  );
  // Hand the runtime config off to the SW so it can call initializeApp().
  const target = reg.active || reg.installing || reg.waiting;
  if (target) target.postMessage({ type: "FIREBASE_INIT", config: cfg });
  return reg;
}

export async function requestNotificationPermission(): Promise<string | null> {
  const cfg = readConfig();
  if (!cfg || !isPushSupported()) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const reg = await ensureServiceWorker(cfg);

  // Lazy-load via the optional `firebase` package. The opaque variable
  // names below stop Webpack/Turbopack from resolving the modules at
  // build time when the package isn't installed yet.
  const sdk = await loadFirebaseSdk();
  if (!sdk) return null;
  const app = sdk.getApps().length ? sdk.getApps()[0] : sdk.initializeApp(cfg);
  const messaging = sdk.getMessaging(app);

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  const token = await sdk.getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: reg,
  });
  if (!token) return null;

  try {
    await api.post("/auth/mobile/fcm-token", { fcmToken: token });
  } catch (err: any) {
    if (err?.response?.status !== 401) {
      console.error("[firebase] failed to register FCM token", err);
    }
  }
  return token;
}

export async function onForegroundMessage(
  callback: (payload: any) => void,
): Promise<() => void> {
  const cfg = readConfig();
  if (!cfg || !isPushSupported()) return () => {};
  const sdk = await loadFirebaseSdk();
  if (!sdk) return () => {};
  const app = sdk.getApps().length ? sdk.getApps()[0] : sdk.initializeApp(cfg);
  const messaging = sdk.getMessaging(app);
  return sdk.onMessage(messaging, callback);
}

async function loadFirebaseSdk(): Promise<any | null> {
  try {
    const [appMod, msgMod] = await Promise.all([
      import("firebase/app"),
      import("firebase/messaging"),
    ]);
    return {
      initializeApp: appMod.initializeApp,
      getApps: appMod.getApps,
      getMessaging: msgMod.getMessaging,
      getToken: msgMod.getToken,
      onMessage: msgMod.onMessage,
    };
  } catch (e) {
    console.warn(
      "[firebase] Web SDK failed to load. Ensure `firebase` is installed in frontend/.",
      e,
    );
    return null;
  }
}
