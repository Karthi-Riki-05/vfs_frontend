"use client";

import { useEffect, useRef } from "react";
import api from "@/lib/axios";
import { isNativeAppWebView } from "@/lib/detectWebView";

// Minimum time between resume-triggered re-registrations (bug-027) — the
// POST itself is a cheap idempotent upsert, but rapid app-switching
// shouldn't hammer the endpoint on every single foreground return.
const RESUME_COOLDOWN_MS = 60_000;

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
 * `POST /api/v1/auth/mobile/fcm-token` and upserts into `firebase_users`,
 * tagging the device with the CURRENT `X-App-Context` (pro/team — see
 * lib/axios.tsx). That tag is what lets the backend send a push to only the
 * Pro app or only the Team app on the same phone (bug-018).
 *
 * bug-027: registration used to only fire once per React mount — i.e. once
 * per true cold start of the WebView's JS context. Most mobile OSes suspend
 * rather than destroy a foregrounded WebView, so a device that registered
 * once and is never force-quit stayed tagged (or untagged) FOREVER, even
 * after this bridge shipped a fix. We now also re-register on every
 * `visibilitychange` back to "visible" — i.e. every time the user returns
 * to the app — bypassing the same-token dedupe guard, since the point of a
 * resume re-registration is to refresh the CONTEXT TAG, not the token value.
 */
export function useNativeFcmBridge(): void {
  // Remember the last token we successfully posted so repeated injections
  // (re-mounts, token refreshes firing with the same value) don't spam the API.
  const lastSent = useRef<string | null>(null);
  // Timestamp of the last registration attempt, for the resume cooldown.
  const lastRegisterAt = useRef<number>(0);

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

    const register = async (raw?: string, opts?: { force?: boolean }) => {
      const fcmToken = (raw || w.flutterDeviceToken || "").trim();
      if (!fcmToken) return;
      if (!opts?.force && fcmToken === lastSent.current) return;
      lastSent.current = fcmToken;
      lastRegisterAt.current = Date.now();
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

    // bug-027: re-tag on every foreground return, not just cold start.
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRegisterAt.current < RESUME_COOLDOWN_MS) return;
      register(undefined, { force: true });
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      if (w.onFlutterDeviceToken) delete w.onFlutterDeviceToken;
      window.removeEventListener("flutterDeviceToken", onEvent);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
}
