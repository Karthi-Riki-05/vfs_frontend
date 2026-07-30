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

// Logout cleanup: revoke this device's token at FCM AND remove it from our
// backend so a logged-out / shared device stops receiving pushes. Best-effort
// — never throws, so it can't block sign-out.
export async function unregisterNotificationToken(): Promise<void> {
  const cfg = readConfig();
  if (!cfg || !isPushSupported()) return;

  let token: string | null = null;
  try {
    const sdk = await loadFirebaseSdk();
    if (sdk) {
      const app = sdk.getApps().length
        ? sdk.getApps()[0]
        : sdk.initializeApp(cfg);
      const messaging = sdk.getMessaging(app);
      const reg = await navigator.serviceWorker.getRegistration(
        "/firebase-messaging-sw.js",
      );
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      token = await sdk.getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: reg || undefined,
      });
      await sdk.deleteToken(messaging);
    }
  } catch {
    // ignore — still attempt the backend delete below
  }

  // A null token means getToken() failed above — we do NOT know which device
  // this is. Sending the delete anyway used to unregister EVERY device on the
  // account (the backend now rejects an unscoped delete outright), so one
  // laptop logout could silence push on the user's phones. Skip instead: a
  // stale row is harmless — FCM rejects the dead token and fcm.service prunes
  // it on the next send.
  if (!token) return;

  try {
    await api.delete("/auth/mobile/fcm-token", { data: { fcmToken: token } });
  } catch {
    // best-effort; logout proceeds regardless
  }
}

/**
 * Unregister the NATIVE FCM token injected by the Flutter shell.
 *
 * Inside the WebView `unregisterNotificationToken()` returns early — the web
 * push SDK isn't available there (no PushManager/Notification), so it can
 * never resolve a token. But the device IS registered: `useNativeFcmBridge`
 * POSTs the shell's native token on mount and on every foreground return.
 * Without this, logging out of the app left the phone receiving pushes for an
 * account no longer signed in on it.
 *
 * The shell keeps the current token on `window.flutterDeviceToken`; the same
 * cookie-backed proxy the bridge registers through removes it.
 */
export async function unregisterNativeDeviceToken(): Promise<void> {
  if (typeof window === "undefined") return;

  const fcmToken = (
    window as unknown as { flutterDeviceToken?: string }
  ).flutterDeviceToken?.trim();
  if (!fcmToken) return;

  try {
    await api.delete("/auth/mobile/fcm-token", { data: { fcmToken } });
  } catch {
    // best-effort; logout proceeds regardless
  }
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
      deleteToken: msgMod.deleteToken,
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
