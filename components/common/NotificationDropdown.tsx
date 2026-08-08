"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { useNotificationCount } from "@/hooks/useNotificationCount";

export default function NotificationDropdown() {
  const router = useRouter();
  // OPT-5: one shared store — this component renders more than once per page
  // (desktop + mobile headers), and each copy previously ran its own fetch and
  // its own 60s timer: 4 requests a minute for a single number. The store also
  // owns the socket attachment and re-attaches on reconnect.
  const { unread: unreadCount } = useNotificationCount();

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
