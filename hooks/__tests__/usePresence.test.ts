import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// A fake socket that records handlers registered via .on so tests can fire them.
let handlers: Record<string, (data: any) => void>;
let socket: any;

const getSocket = vi.fn(() => socket);

vi.mock("@/lib/socket", () => ({
  getSocket: () => getSocket(),
}));

import { usePresence } from "../usePresence";

const fire = (event: string, data: any) =>
  act(() => {
    handlers[event]?.(data);
  });

describe("usePresence", () => {
  beforeEach(() => {
    handlers = {};
    socket = {
      emit: vi.fn(),
      on: vi.fn((event: string, cb: (data: any) => void) => {
        handlers[event] = cb;
      }),
      off: vi.fn(),
    };
    getSocket.mockClear();
  });

  it("tracks online users from a presence response", async () => {
    const { result } = renderHook(() => usePresence(["u1", "u2"]));
    await waitFor(() => expect(handlers["presence:response"]).toBeDefined());

    fire("presence:response", { statuses: { u1: true, u2: false } });
    expect(result.current.isOnline("u1")).toBe(true);
    expect(result.current.isOnline("u2")).toBe(false);
  });

  it("updates when a user comes online", async () => {
    const { result } = renderHook(() => usePresence(["u1"]));
    await waitFor(() => expect(handlers["user:online"]).toBeDefined());

    fire("user:online", { userId: "u1" });
    expect(result.current.isOnline("u1")).toBe(true);
  });

  it("updates when a user goes offline and records lastSeen", async () => {
    const { result } = renderHook(() => usePresence(["u1"]));
    await waitFor(() => expect(handlers["user:offline"]).toBeDefined());

    fire("user:offline", { userId: "u1", lastSeen: "2026-06-16T00:00:00Z" });
    expect(result.current.isOnline("u1")).toBe(false);
    expect(result.current.getLastSeen("u1")).toBe("2026-06-16T00:00:00Z");
  });

  it("removes its listeners on unmount", async () => {
    const { unmount } = renderHook(() => usePresence(["u1"]));
    await waitFor(() => expect(socket.on).toHaveBeenCalled());
    unmount();
    await waitFor(() => expect(socket.off).toHaveBeenCalledTimes(3));
  });
});
