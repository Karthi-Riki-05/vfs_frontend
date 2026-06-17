import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const connectSocket = vi.fn();
const getSocket = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "u1" } }, status: "authenticated" }),
}));

vi.mock("@/lib/socket", () => ({
  connectSocket: (...a: any[]) => connectSocket(...a),
  getSocket: (...a: any[]) => getSocket(...a),
}));

import { useSocket } from "../useSocket";

// Build a fake Socket.IO socket whose .on/.off + .io.on/.io.off are spies.
const makeSocket = (connected = false) => ({
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connected,
  io: { on: vi.fn(), off: vi.fn() },
});

describe("useSocket", () => {
  beforeEach(() => {
    connectSocket.mockReset();
    getSocket.mockReset();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ data: { token: "tok-123" } }),
      } as Response),
    );
  });

  it("connects to the socket server with the fetched token", async () => {
    const s = makeSocket();
    connectSocket.mockResolvedValue(s);
    const { result } = renderHook(() => useSocket());

    await waitFor(() => expect(result.current.socket).toBe(s));
    expect(connectSocket).toHaveBeenCalledWith("tok-123");
  });

  it("registers all five event listeners", async () => {
    const s = makeSocket();
    connectSocket.mockResolvedValue(s);
    renderHook(() => useSocket());

    await waitFor(() => expect(s.on).toHaveBeenCalled());
    // socket.on: connect, disconnect, connect_error (3)
    expect(s.on).toHaveBeenCalledTimes(3);
    // socket.io.on: reconnect_attempt, reconnect (2)
    expect(s.io.on).toHaveBeenCalledTimes(2);
  });

  it("cleans up every listener on unmount (the leak fix)", async () => {
    const s = makeSocket();
    connectSocket.mockResolvedValue(s);
    const { result, unmount } = renderHook(() => useSocket());

    await waitFor(() => expect(result.current.socket).toBe(s));
    unmount();
    expect(s.off).toHaveBeenCalledTimes(3);
    expect(s.io.off).toHaveBeenCalledTimes(2);
  });

  it("reports connected status when the socket is already connected", async () => {
    const s = makeSocket(true);
    connectSocket.mockResolvedValue(s);
    const { result } = renderHook(() => useSocket());

    await waitFor(() => expect(result.current.status).toBe("connected"));
  });

  it("reconnect() re-establishes the socket", async () => {
    const s = makeSocket();
    connectSocket.mockResolvedValue(s);
    const { result } = renderHook(() => useSocket());
    await waitFor(() => expect(result.current.socket).toBe(s));

    const s2 = makeSocket(true);
    connectSocket.mockResolvedValue(s2);
    await act(async () => {
      await result.current.reconnect();
    });
    expect(result.current.socket).toBe(s2);
  });

  it("exposes an emit-capable socket", async () => {
    const s = makeSocket();
    connectSocket.mockResolvedValue(s);
    const { result } = renderHook(() => useSocket());
    await waitFor(() => expect(result.current.socket).toBe(s));
    expect(typeof result.current.socket?.emit).toBe("function");
  });
});
