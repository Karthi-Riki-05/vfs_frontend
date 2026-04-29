"use client";

import { useCallback, useEffect, useState } from "react";
import { notification as antdNotify } from "antd";
import {
  isPushSupported,
  currentPermission,
  requestNotificationPermission,
  onForegroundMessage,
} from "@/lib/firebase";

interface UsePush {
  isSupported: boolean;
  isPermissionGranted: boolean;
  permission: NotificationPermission | "unsupported";
  requestPermission: () => Promise<boolean>;
}

export function usePushNotifications(): UsePush {
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");

  useEffect(() => {
    const perm = currentPermission();
    setPermission(perm);
    if (perm === "granted") {
      requestNotificationPermission().catch(() => {});
    }
  }, []);

  // Foreground messages — show an Ant Design banner instead of a system
  // notification so the user gets feedback without losing the page.
  useEffect(() => {
    let off: () => void = () => {};
    let cancelled = false;
    if (permission === "granted") {
      onForegroundMessage((payload) => {
        const title = payload?.notification?.title || "ValueChart";
        const body = payload?.notification?.body || "";
        antdNotify.open({
          message: title,
          description: body,
          placement: "topRight",
          onClick: () => {
            const url = payload?.data?.url;
            if (url) window.location.href = url;
          },
        });
      }).then((unsub) => {
        if (cancelled) unsub();
        else off = unsub;
      });
    }
    return () => {
      cancelled = true;
      off();
    };
  }, [permission]);

  const requestPermission = useCallback(async () => {
    const token = await requestNotificationPermission();
    setPermission(currentPermission());
    return !!token;
  }, []);

  return {
    isSupported: isPushSupported(),
    isPermissionGranted: permission === "granted",
    permission,
    requestPermission,
  };
}
