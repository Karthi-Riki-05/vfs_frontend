"use client";

import { useEffect, useRef } from "react";
import api from "@/lib/axios";
import { isNativeAppWebView } from "@/lib/detectWebView";

/**
 * Native FCM bridge for the Flutter WebView shell.
 *
 * The web push SDK (service worker + PushManager) is unavailable inside an
 * in-app WebView, so `usePushNotifications` / `lib/firebase` never obtains a
 * token there. The Flutter shell instead injects its own native FCM device
 * token onto the page and we register THAT directly.
 *
 * Flutter hands the token off three ways — we cover all of them:
 *   1. Sets `window.flutterDeviceToken` (may already exist before mount).
 *   2. Calls `window.onFlutterDeviceToken(token)` when the token refreshes.
 *   3. Dispatches a `flutterDeviceToken` CustomEvent (`detail.token`).
 *
 * Registration POSTs to the cookie-backed proxy `/auth/mobile/fcm-token`
 * (same endpoint the web path uses), which forwards to
 * `POST /api/v1/auth/mobile/fcm-token` and upserts into `firebase_users`.
 */
export function useNativeFcmBridge(): void {
  // Remember the last token we successfully posted so repeated injections
  // (re-mounts, token refreshes firing with the same value) don't spam the API.
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    // Only run inside a native shell (Pro or Team) — never in a real browser.
    // Driven by the `ValueChartsMobile` UA signature, with legacy WebView
    // heuristics as a rollout fallback.
    if (!isNativeAppWebView()) return;

    const w = window as unknown as {
      flutterDeviceToken?: string;
      onFlutterDeviceToken?: (token: string) => void;
    };

    let cancelled = false;

    const register = async (raw?: string) => {
      const fcmToken = (raw || w.flutterDeviceToken || "").trim();
      if (!fcmToken || fcmToken === lastSent.current) return;
      lastSent.current = fcmToken;
      try {
        await api.post("/auth/mobile/fcm-token", { fcmToken });
      } catch (err: any) {
        // Allow a later retry if it wasn't an auth failure.
        if (err?.response?.status !== 401) lastSent.current = null;
        if (err?.response?.status !== 401)
          console.error("[fcm] native token register failed", err);
      }
    };

    // Case 1: token already injected before React mounted.
    if (w.flutterDeviceToken) register();

    // Case 2: Flutter calls a global callback on injection/refresh.
    w.onFlutterDeviceToken = (token: string) => {
      if (!cancelled) register(token);
    };

    // Case 3: Flutter dispatches a CustomEvent.
    const onEvent = (e: Event) => {
      const token = (e as CustomEvent<{ token?: string }>).detail?.token;
      register(token);
    };
    window.addEventListener("flutterDeviceToken", onEvent);

    return () => {
      cancelled = true;
      if (w.onFlutterDeviceToken) delete w.onFlutterDeviceToken;
      window.removeEventListener("flutterDeviceToken", onEvent);
    };
  }, []);
}
