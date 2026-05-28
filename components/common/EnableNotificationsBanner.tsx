"use client";

import React, { useEffect, useState } from "react";
import { Button } from "antd";
import { BellOutlined, CloseOutlined } from "@ant-design/icons";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const DISMISS_KEY = "push_banner_dismissed";
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const SHOW_AFTER_MS = 30_000;

export default function EnableNotificationsBanner() {
  const push = usePushNotifications();
  const [show, setShow] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!push.isSupported) return;
    if (push.permission !== "default") return;

    const dismissedAt = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10);
    if (dismissedAt && Date.now() - dismissedAt < SEVEN_DAYS) return;

    const t = setTimeout(() => {
      setShow(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    }, SHOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [push.isSupported, push.permission]);

  if (!show) return null;

  const handleEnable = async () => {
    setVisible(false);
    setTimeout(() => setShow(false), 300);
    await push.requestPermission();
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => setShow(false), 300);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      /* localStorage may be blocked */
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        zIndex: 1001,
        maxWidth: 340,
        width: "calc(100vw - 48px)",
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
        padding: "16px",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: "#EFF6FF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <BellOutlined style={{ color: "#1677ff", fontSize: 16 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: "#111",
              lineHeight: 1.4,
            }}
          >
            Stay in the loop
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#666",
              lineHeight: 1.5,
              marginTop: 2,
            }}
          >
            Get notified about flow pack expiry, payments, and team invites.
          </div>
        </div>
        <button
          onClick={handleDismiss}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            color: "#aaa",
            lineHeight: 1,
            flexShrink: 0,
          }}
          aria-label="Dismiss"
        >
          <CloseOutlined style={{ fontSize: 12 }} />
        </button>
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: "flex",
          gap: 8,
          paddingLeft: 46,
        }}
      >
        <Button
          size="small"
          type="primary"
          onClick={handleEnable}
          style={{
            background: "#3CB371",
            borderColor: "#3CB371",
            fontSize: 12,
            height: 30,
            paddingInline: 14,
          }}
        >
          Enable
        </Button>
        <Button
          size="small"
          type="text"
          onClick={handleDismiss}
          style={{ color: "#999", fontSize: 12, height: 30 }}
        >
          Not now
        </Button>
      </div>
    </div>
  );
}
