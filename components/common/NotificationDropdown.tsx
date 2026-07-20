"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import api from "@/lib/axios";
import { AI_BILLING_EVENT } from "@/lib/aiBilling";

export default function NotificationDropdown() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshCount = () => {
    api
      .get("/notifications/count")
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setUnreadCount(d.unread ?? 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshCount();

    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const { getSocket } = await import("@/lib/socket");
        const socket = getSocket();
        if (!socket) return;
        const onNew = () => refreshCount();
        socket.on("notification:new", onNew);
        cleanup = () => socket.off("notification:new", onNew);
      } catch {
        // socket unavailable — rely on the poll
      }
    })();

    // B41: the unread count is strictly workspace-scoped (X-Team-Context), so
    // when the user switches workspace/billing context the badge must re-fetch
    // — otherwise it shows a stale count from the previous workspace while the
    // Notifications page (freshly scoped) is empty ("phantom dot").
    const onSwitch = () => refreshCount();
    window.addEventListener(AI_BILLING_EVENT, onSwitch);
    window.addEventListener("vc:workspace-switch", onSwitch);

    const t = setInterval(refreshCount, 60000);
    return () => {
      clearInterval(t);
      cleanup?.();
      window.removeEventListener(AI_BILLING_EVENT, onSwitch);
      window.removeEventListener("vc:workspace-switch", onSwitch);
    };
  }, []);

  return (
    <div className="tw">
      <button
        onClick={() => router.push("/dashboard/notifications")}
        aria-label="Notifications"
        className="relative w-10 h-10 rounded-xl hover:bg-secondary flex items-center justify-center cursor-pointer transition"
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--coral)]" />
        )}
      </button>
    </div>
  );
}
