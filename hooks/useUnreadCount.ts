"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/axios";

interface UnreadState {
  totalUnread: number;
  perGroup: Record<string, number>;
}

// appContext: "pro" scopes to Pro-app groups only; anything else scopes to
// Team-app groups (appContext != "pro"). Keeps Pro and Team badges separate.
export function useUnreadCount(appContext: "pro" | "team" | "free" = "team") {
  const [unread, setUnread] = useState<UnreadState>({
    totalUnread: 0,
    perGroup: {},
  });

  // Fetch initial counts from API, scoped to this hook's app context.
  const fetchCounts = useCallback(async () => {
    try {
      const res = await api.get("/chat/unread-count", {
        params: { appContext },
      });
      const data = res.data?.data || res.data;
      if (data && typeof data.totalUnread === "number") {
        setUnread({
          totalUnread: data.totalUnread,
          perGroup: data.perGroup || {},
        });
      }
    } catch {
      // Silently fail — user may not have chat access
    }
  }, [appContext]);

  // Fetch initial counts, listen for socket updates, and poll as fallback
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    // Initial fetch
    fetchCounts();

    // Registers notification:unread-count and message:read listeners on the
    // socket singleton. Returns true if registration succeeded, false if the
    // socket wasn't ready yet (caller should retry on vc:socket-ready).
    const registerSocketListeners = async (): Promise<boolean> => {
      try {
        const { getSocket } = await import("@/lib/socket");
        const s = getSocket();
        if (!s || cancelled) return false;

        // Already registered from a previous call — remove old listeners first.
        if (cleanup) {
          cleanup();
          cleanup = undefined;
        }

        const onUnreadCount = (data: {
          totalUnread: number;
          groupId: string;
          appContext?: string;
        }) => {
          if (cancelled) return;
          // Ignore events that belong to a different app context.
          // Backend sends appContext on the event; if missing, default to "team".
          const eventCtx = data.appContext || "team";
          const myCtx = appContext === "pro" ? "pro" : "team";
          if (eventCtx !== myCtx) return;

          setUnread((prev) => {
            // If server says 0 total, clear everything immediately
            if (data.totalUnread === 0) {
              return { totalUnread: 0, perGroup: {} };
            }
            // If count went down (read event), trust server total and
            // remove that group from perGroup so badge reflects reality
            if (data.totalUnread < prev.totalUnread) {
              const newPerGroup = { ...prev.perGroup };
              delete newPerGroup[data.groupId];
              return { totalUnread: data.totalUnread, perGroup: newPerGroup };
            }
            // Count went up (new message) — increment per-group
            return {
              totalUnread: data.totalUnread,
              perGroup: {
                ...prev.perGroup,
                [data.groupId]: (prev.perGroup[data.groupId] || 0) + 1,
              },
            };
          });
        };

        const onMessageRead = () => {
          if (!cancelled) fetchCounts();
        };

        s.on("notification:unread-count", onUnreadCount);
        s.on("message:read", onMessageRead);

        cleanup = () => {
          s.off("notification:unread-count", onUnreadCount);
          s.off("message:read", onMessageRead);
        };

        return true;
      } catch {
        return false;
      }
    };

    // Try immediately — may return false if socket isn't connected yet
    // (race condition: Sidebar/Header mount before RightChatColumn connects).
    registerSocketListeners();

    // Retry when the socket connects. socket.ts dispatches "vc:socket-ready"
    // on every connect/reconnect so this handles both initial load races and
    // reconnections where the old socket object was replaced.
    const onSocketReady = () => {
      if (!cancelled) {
        registerSocketListeners().then((ok) => {
          if (ok) fetchCounts(); // re-sync count in case events were missed
        });
      }
    };
    window.addEventListener("vc:socket-ready", onSocketReady);

    // Poll every 60s as fallback when socket isn't connected
    const interval = setInterval(() => {
      if (!cancelled) fetchCounts();
    }, 60000);

    return () => {
      cancelled = true;
      cleanup?.();
      clearInterval(interval);
      window.removeEventListener("vc:socket-ready", onSocketReady);
    };
  }, [fetchCounts]);

  const getUnreadCount = useCallback(
    (groupId: string) => {
      return unread.perGroup[groupId] || 0;
    },
    [unread.perGroup],
  );

  const markGroupAsRead = useCallback((groupId: string) => {
    setUnread((prev) => {
      const groupUnread = prev.perGroup[groupId] || 0;
      const newPerGroup = { ...prev.perGroup };
      delete newPerGroup[groupId];
      return {
        totalUnread: Math.max(0, prev.totalUnread - groupUnread),
        perGroup: newPerGroup,
      };
    });
  }, []);

  return {
    totalUnread: unread.totalUnread,
    perGroup: unread.perGroup,
    getUnreadCount,
    markGroupAsRead,
    refetch: fetchCounts,
  };
}
