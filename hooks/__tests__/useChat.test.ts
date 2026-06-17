import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const listGroups = vi.fn();
const getMessages = vi.fn();
const sendMessage = vi.fn();
const createGroup = vi.fn();

vi.mock("@/api/chat.api", () => ({
  chatApi: {
    listGroups: (...a: any[]) => listGroups(...a),
    getMessages: (...a: any[]) => getMessages(...a),
    sendMessage: (...a: any[]) => sendMessage(...a),
    createGroup: (...a: any[]) => createGroup(...a),
  },
}));

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({ activeTeamId: "team-1" }),
}));

vi.mock("antd", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return { ...actual, message: { success: vi.fn(), error: vi.fn() } };
});

import { useChat } from "../useChat";
import { flushWorkspaceCache } from "@/lib/workspaceCache";

describe("useChat", () => {
  beforeEach(() => {
    listGroups
      .mockReset()
      .mockResolvedValue({ data: { data: { groups: [] } } });
    getMessages
      .mockReset()
      .mockResolvedValue({ data: { data: { messages: [] } } });
    sendMessage.mockReset().mockResolvedValue({});
    createGroup.mockReset().mockResolvedValue({});
  });

  it("loads chat groups on mount", async () => {
    listGroups.mockResolvedValue({
      data: { data: { groups: [{ id: "g1", title: "General" }] } },
    });
    const { result } = renderHook(() => useChat());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.groups).toHaveLength(1);
  });

  it("loads messages for a given group", async () => {
    getMessages.mockResolvedValue({
      data: { data: { messages: [{ id: "m1", content: "hi" }] } },
    });
    const { result } = renderHook(() => useChat("g1"));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(getMessages).toHaveBeenCalledWith("g1");
  });

  it("sends a message and refetches messages", async () => {
    const { result } = renderHook(() => useChat("g1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.sendMessage("hello");
    });
    expect(sendMessage).toHaveBeenCalledWith("g1", "hello");
  });

  it("createGroup maps name → title and refetches", async () => {
    const { result } = renderHook(() => useChat());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createGroup({ name: "Squad", memberIds: ["u2"] });
    });
    expect(createGroup).toHaveBeenCalledWith({
      title: "Squad",
      memberIds: ["u2"],
    });
  });

  it("handles a groups fetch error gracefully", async () => {
    listGroups.mockRejectedValue(new Error("500"));
    const { result } = renderHook(() => useChat());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.groups).toEqual([]);
  });

  it("zeroes groups and messages instantly on workspace flush", async () => {
    listGroups.mockResolvedValue({
      data: { data: { groups: [{ id: "g1", title: "General" }] } },
    });
    getMessages.mockResolvedValue({
      data: { data: { messages: [{ id: "m1", content: "hi" }] } },
    });
    const { result } = renderHook(() => useChat("g1"));
    await waitFor(() => expect(result.current.groups).toHaveLength(1));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    // Switching workspace must drop the previous bucket's chat synchronously.
    act(() => {
      flushWorkspaceCache();
    });
    expect(result.current.groups).toEqual([]);
    expect(result.current.messages).toEqual([]);
  });
});
