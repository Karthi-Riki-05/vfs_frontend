"use client";

import { useEffect } from "react";
import api from "@/lib/axios";
import { createSharedResource } from "@/lib/sharedResource";
import { AI_BILLING_EVENT } from "@/lib/aiBilling";

/**
 * The unread-notification badge count (OPT-5).
 *
 * `NotificationDropdown` mounts more than once per page (the desktop header and
 * the mobile header both render it; only CSS hides one), and each instance ran
 * its own fetch AND its own 60s timer. Measured on an idle tab: 12 requests in
 * three minutes — four per minute, for one number.
 *
 * One store, one timer, one socket attachment, however many badges render.
 *
 * ⚠️ The poll is NOT decoration here. The socket only exists while the chat
 * column is mounted (`useSocket` has exactly one caller: RightChatColumn), so
 * on a normal dashboard there is no socket and `notification:new` never
 * arrives. Until the socket connects app-wide, polling is the ONLY thing
 * keeping this badge current — so it stays, deduplicated rather than removed.
 */
const resource = createSharedResource<{ unread: number }>(
  "notifications/count",
  async () => {
    const res = await api.get("/notifications/count");
    const d = res.data?.data || res.data || {};
    return { unread: d.unread ?? 0 };
  },
  // The count is workspace-scoped (B41) — a context switch must re-read it, or
  // the badge shows the previous workspace's number over an empty list.
  [AI_BILLING_EVENT, "vc:workspace-switch", "vc:notifications-read"],
);

// ── One timer + one socket attachment for the whole app ────────────────────
let refs = 0;
let poll: ReturnType<typeof setInterval> | null = null;
let detachSocket: (() => void) | null = null;

const POLL_MS = 60_000;

function reload() {
  void resource.load("global", true);
}

function startPolling() {
  if (poll) return;
  poll = setInterval(reload, POLL_MS);
}

function stopPolling() {
  if (poll) clearInterval(poll);
  poll = null;
}

async function attachSocket(): Promise<boolean> {
  try {
    const { getSocket } = await import("@/lib/socket");
    const socket = getSocket();
    if (!socket) return false;
    detachSocket?.();
    const onNew = () => reload();
    socket.on("notification:new", onNew);
    detachSocket = () => socket.off("notification:new", onNew);
    return socket.connected;
  } catch {
    return false;
  }
}

function startLive() {
  // Re-attach on every (re)connect. The old code resolved getSocket() once at
  // mount, so after a reconnect the badge was permanently deaf to
  // `notification:new` and only the poll kept it alive.
  const onReady = () => {
    void attachSocket().then((connected) => {
      reload();
      if (connected) stopPolling();
    });
  };
  const onLost = () => {
    reload();
    startPolling();
  };
  window.addEventListener("vc:socket-ready", onReady);
  window.addEventListener("vc:socket-lost", onLost);

  void attachSocket().then((connected) => {
    if (!connected) startPolling();
  });

  return () => {
    window.removeEventListener("vc:socket-ready", onReady);
    window.removeEventListener("vc:socket-lost", onLost);
    detachSocket?.();
    detachSocket = null;
    stopPolling();
  };
}

let teardown: (() => void) | null = null;

export function useNotificationCount() {
  const { data } = resource.use("global");

  useEffect(() => {
    refs++;
    if (refs === 1) teardown = startLive();
    return () => {
      refs--;
      if (refs === 0) {
        teardown?.();
        teardown = null;
      }
    };
  }, []);

  return { unread: data?.unread ?? 0, refresh: reload };
}

export function __resetNotificationCount() {
  resource.reset();
  stopPolling();
  detachSocket?.();
  detachSocket = null;
  refs = 0;
  teardown = null;
}
