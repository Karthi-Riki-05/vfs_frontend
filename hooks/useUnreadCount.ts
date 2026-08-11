"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/axios";
import { AI_BILLING_EVENT } from "@/lib/aiBilling";

interface UnreadState {
  totalUnread: number;
  perGroup: Record<string, number>;
}

// ── Shared per-context store ───────────────────────────────────────────────
// Sidebar, Header, ProSidebar and RightChatColumn all want the same badge, and
// as a plain per-instance hook each one fetched, each one registered its own
// socket listeners, and each one ran its own 60s poller: 8 calls to
// /chat/unread-count on a single page load, ×2 for an app switch (which reloads
// the page twice). One store per app context now serves them all — one request,
// one socket registration, one timer — and because they read the SAME state the
// badges can no longer disagree with each other.
//
// Keyed by context because Pro and Team badges are deliberately separate
// ("pro" scopes to Pro-app groups, anything else to Team-app groups).
type Ctx = "pro" | "team";

interface Store {
  state: UnreadState;
  subscribers: Set<(s: UnreadState) => void>;
  inflight: Promise<void> | null;
  /** Torn down when the last consumer unmounts. */
  teardown: (() => void) | null;
  refs: number;
}

const stores = new Map<Ctx, Store>();

function storeFor(ctx: Ctx): Store {
  let s = stores.get(ctx);
  if (!s) {
    s = {
      state: { totalUnread: 0, perGroup: {} },
      subscribers: new Set(),
      inflight: null,
      teardown: null,
      refs: 0,
    };
    stores.set(ctx, s);
  }
  return s;
}

function setState(
  ctx: Ctx,
  next: UnreadState | ((p: UnreadState) => UnreadState),
) {
  const s = storeFor(ctx);
  s.state = typeof next === "function" ? (next as any)(s.state) : next;
  s.subscribers.forEach((fn) => fn(s.state));
}

/** Concurrent callers share one request — that is what collapses the storm. */
function fetchCounts(ctx: Ctx): Promise<void> {
  const s = storeFor(ctx);
  if (s.inflight) return s.inflight;
  s.inflight = (async () => {
    try {
      const res = await api.get("/chat/unread-count", {
        params: { appContext: ctx },
      });
      const data = res.data?.data || res.data;
      if (data && typeof data.totalUnread === "number") {
        setState(ctx, {
          totalUnread: data.totalUnread,
          perGroup: data.perGroup || {},
        });
      }
    } catch {
      // Silently fail — user may not have chat access
    } finally {
      s.inflight = null;
    }
  })();
  return s.inflight;
}

/**
 * Socket listeners + fallback poller, started once for the first consumer of a
 * context and stopped when the last one unmounts.
 */
function startLiveUpdates(ctx: Ctx) {
  const s = storeFor(ctx);
  let cancelled = false;
  let offSocket: (() => void) | undefined;

  const onUnreadCount = (data: {
    totalUnread: number;
    groupId: string;
    appContext?: string;
  }) => {
    if (cancelled) return;
    // Ignore events that belong to a different app context.
    // Backend sends appContext on the event; if missing, default to "team".
    const eventCtx = data.appContext || "team";
    if (eventCtx !== ctx) return;

    setState(ctx, (prev) => {
      // If server says 0 total, clear everything immediately
      if (data.totalUnread === 0) return { totalUnread: 0, perGroup: {} };
      // If count went down (read event), trust server total and remove that
      // group from perGroup so the badge reflects reality
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
    if (!cancelled) fetchCounts(ctx);
  };

  const registerSocketListeners = async (): Promise<boolean> => {
    try {
      const { getSocket } = await import("@/lib/socket");
      const sock = getSocket();
      if (!sock || cancelled) return false;
      // Already registered from a previous call — remove old listeners first.
      offSocket?.();
      sock.on("notification:unread-count", onUnreadCount);
      sock.on("message:read", onMessageRead);
      offSocket = () => {
        sock.off("notification:unread-count", onUnreadCount);
        sock.off("message:read", onMessageRead);
      };
      return true;
    } catch {
      return false;
    }
  };

  // Try immediately — may return false if the socket isn't connected yet
  // (race: Sidebar/Header mount before RightChatColumn connects).
  registerSocketListeners();

  // Retry when the socket connects. socket.ts dispatches "vc:socket-ready" on
  // every connect/reconnect, covering both the initial race and reconnections
  // where the old socket object was replaced.
  const onSocketReady = () => {
    if (cancelled) return;
    registerSocketListeners().then((ok) => {
      if (ok) {
        fetchCounts(ctx); // re-sync in case events were missed
        stopPolling(); // live socket — the poll has nothing left to add
      }
    });
  };
  window.addEventListener("vc:socket-ready", onSocketReady);

  // OPT-5 (2026-08-08): the 60s poll now runs ONLY while the socket is down.
  //
  // The backend already emits `notification:unread-count` on every message and
  // every read (chat.service), so with a live socket the poll never learned
  // anything the socket had not already delivered. Measured on an idle tab:
  // 69 polls in 68 minutes, one per minute, forever — 96% of what an open tab
  // cost. Now: zero while connected.
  //
  // The fallback is genuinely load-bearing, not decoration — a WebView that
  // loses its socket in the background must still update — so it starts on
  // `vc:socket-lost` and stops again on `vc:socket-ready`.
  let interval: ReturnType<typeof setInterval> | null = null;
  const startPolling = () => {
    if (interval || cancelled) return;
    interval = setInterval(() => {
      if (!cancelled) fetchCounts(ctx);
    }, 60000);
  };
  const stopPolling = () => {
    if (interval) clearInterval(interval);
    interval = null;
  };
  const onSocketLost = () => {
    // Resync immediately, then poll until the socket returns.
    if (!cancelled) fetchCounts(ctx);
    startPolling();
  };
  window.addEventListener("vc:socket-lost", onSocketLost);

  // The count is now workspace-scoped on the server, but this store is keyed
  // only by app context ("pro"/"team") — so two Team workspaces share ONE
  // store. A workspace switch keeps the same key and would otherwise show the
  // previous workspace's number until the next poll. Re-fetch on switch (both
  // the profile-switcher event and the AI-billing event that rides with it),
  // matching what useNotificationCount does for the bell.
  const onWorkspaceSwitch = () => {
    if (!cancelled) fetchCounts(ctx);
  };
  window.addEventListener("vc:workspace-switch", onWorkspaceSwitch);
  window.addEventListener(AI_BILLING_EVENT, onWorkspaceSwitch);

  // Start polling if the socket is not up yet; `onSocketReady` stops it.
  (async () => {
    try {
      const { getSocket } = await import("@/lib/socket");
      if (!getSocket()?.connected) startPolling();
    } catch {
      startPolling();
    }
  })();

  s.teardown = () => {
    cancelled = true;
    offSocket?.();
    stopPolling();
    window.removeEventListener("vc:socket-ready", onSocketReady);
    window.removeEventListener("vc:socket-lost", onSocketLost);
    window.removeEventListener("vc:workspace-switch", onWorkspaceSwitch);
    window.removeEventListener(AI_BILLING_EVENT, onWorkspaceSwitch);
    s.teardown = null;
  };
}

// appContext: "pro" scopes to Pro-app groups only; anything else scopes to
// Team-app groups (appContext != "pro"). Keeps Pro and Team badges separate.
export function useUnreadCount(appContext: "pro" | "team" | "free" = "team") {
  const ctx: Ctx = appContext === "pro" ? "pro" : "team";
  const [unread, setUnread] = useState<UnreadState>(() => storeFor(ctx).state);

  useEffect(() => {
    const s = storeFor(ctx);
    setUnread(s.state);
    s.subscribers.add(setUnread);
    s.refs++;
    // First consumer of this context does the initial fetch and owns the
    // socket/poll lifecycle; later ones just read the same state.
    if (s.refs === 1) {
      fetchCounts(ctx);
      startLiveUpdates(ctx);
    }
    return () => {
      s.subscribers.delete(setUnread);
      s.refs--;
      if (s.refs === 0) s.teardown?.();
    };
  }, [ctx]);

  const getUnreadCount = useCallback(
    (groupId: string) => unread.perGroup[groupId] || 0,
    [unread.perGroup],
  );

  // Optimistic local clear. Now visible to EVERY consumer of this context, so
  // opening a thread drops the sidebar badge too, without waiting for a socket
  // round-trip.
  const markGroupAsRead = useCallback(
    (groupId: string) => {
      setState(ctx, (prev) => {
        const groupUnread = prev.perGroup[groupId] || 0;
        const newPerGroup = { ...prev.perGroup };
        delete newPerGroup[groupId];
        return {
          totalUnread: Math.max(0, prev.totalUnread - groupUnread),
          perGroup: newPerGroup,
        };
      });
    },
    [ctx],
  );

  const refetch = useCallback(() => fetchCounts(ctx), [ctx]);

  return {
    totalUnread: unread.totalUnread,
    perGroup: unread.perGroup,
    getUnreadCount,
    markGroupAsRead,
    refetch,
  };
}
