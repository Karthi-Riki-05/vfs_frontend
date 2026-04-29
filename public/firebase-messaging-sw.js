/* eslint-disable */
// Firebase Messaging service worker — handles BACKGROUND notifications when
// the app tab is not focused. Foreground messages are handled by the
// `onForegroundMessage` listener in lib/firebase.ts.
//
// Config values are set at runtime via the FIREBASE_INIT message. Keep this
// file in sync with NEXT_PUBLIC_FIREBASE_* env vars used by the client SDK.

/* global importScripts, firebase, self, clients */

importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js",
);

let messaging = null;

self.addEventListener("message", (event) => {
  if (event.data?.type === "FIREBASE_INIT" && event.data?.config) {
    try {
      if (!firebase.apps.length) firebase.initializeApp(event.data.config);
      messaging = firebase.messaging();

      messaging.onBackgroundMessage((payload) => {
        const title = payload?.notification?.title || "ValueChart";
        const body = payload?.notification?.body || "";
        const url = payload?.data?.url || "/dashboard";
        self.registration.showNotification(title, {
          body,
          icon: "/images/image.png",
          badge: "/images/image.png",
          data: { url, ...(payload?.data || {}) },
        });
      });
    } catch (e) {
      console.error("[firebase-sw] init failed", e);
    }
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((wins) => {
        for (const w of wins) {
          if ("focus" in w) {
            w.navigate(url).catch(() => {});
            return w.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
      }),
  );
});
