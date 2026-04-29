"use client";

import React, { useEffect, useState } from "react";
import { Button } from "antd";
import { BellOutlined } from "@ant-design/icons";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const DISMISS_KEY = "push_banner_dismissed";
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const SHOW_AFTER_MS = 30_000;

export default function EnableNotificationsBanner() {
  const push = usePushNotifications();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!push.isSupported) return;
    if (push.permission !== "default") return; // granted/denied/unsupported

    const dismissedAt = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10);
    if (dismissedAt && Date.now() - dismissedAt < SEVEN_DAYS) return;

    const t = setTimeout(() => setShow(true), SHOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [push.isSupported, push.permission]);

  if (!show) return null;

  const handleEnable = async () => {
    setShow(false);
    await push.requestPermission();
  };

  const handleDismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      /* localStorage may be blocked */
    }
  };

  return (
    <div
      style={{
        background: "#f0f9ff",
        border: "1px solid #bae0ff",
        borderRadius: 8,
        padding: "10px 16px",
        marginBottom: 16,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <BellOutlined style={{ color: "#1677ff", fontSize: 16, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: "#333", flex: 1 }}>
        🔔 Get notified about flow pack expiry, payments, and team invites
      </span>
      <Button size="small" type="primary" onClick={handleEnable}>
        Enable
      </Button>
      <Button
        size="small"
        type="text"
        onClick={handleDismiss}
        style={{ color: "#999" }}
      >
        Not now
      </Button>
    </div>
  );
}
