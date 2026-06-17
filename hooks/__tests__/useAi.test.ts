import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const chat = vi.fn();
const generateDiagram = vi.fn();
const getConsent = vi.fn();
const getContext = vi.fn();

vi.mock("@/api/ai.api", () => ({
  aiApi: {
    chat: (...a: any[]) => chat(...a),
    generateDiagram: (...a: any[]) => generateDiagram(...a),
    generateDiagramFromDocument: vi.fn(),
    getConsent: (...a: any[]) => getConsent(...a),
    getContext: (...a: any[]) => getContext(...a),
    setConsent: vi.fn().mockResolvedValue({}),
    deleteData: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "u1", email: "a@b.com" } },
    status: "authenticated",
  }),
}));

vi.mock("@/context/AiBillingContext", () => ({
  useAiBilling: () => ({ activeBillingTeamId: null }),
}));

vi.mock("antd", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return { ...actual, message: { success: vi.fn(), error: vi.fn() } };
});

import { useAi } from "../useAi";

describe("useAi", () => {
  beforeEach(() => {
    chat.mockReset();
    generateDiagram.mockReset();
    getConsent
      .mockReset()
      .mockResolvedValue({ data: { data: { consented: true } } });
    getContext.mockReset().mockResolvedValue({ data: { data: {} } });
  });

  it("reads consent on mount", async () => {
    const { result } = renderHook(() => useAi());
    await waitFor(() => expect(result.current.hasConsent).toBe(true));
  });

  it("sends a chat message and returns the response", async () => {
    chat.mockResolvedValue({
      data: { data: { conversationId: "c1", response: { message: "hi" } } },
    });
    const { result } = renderHook(() => useAi());
    await waitFor(() => expect(result.current.hasConsent).toBe(true));

    let resp: any;
    await act(async () => {
      resp = await result.current.sendMessage("hello");
    });
    expect(chat).toHaveBeenCalled();
    expect(resp).toEqual({ message: "hi" });
    expect(result.current.conversationId).toBe("c1");
  });

  it("flips consent to false when the API returns CONSENT_REQUIRED", async () => {
    chat.mockRejectedValue({
      response: { data: { error: { code: "CONSENT_REQUIRED" } } },
    });
    const { result } = renderHook(() => useAi());
    await waitFor(() => expect(result.current.hasConsent).toBe(true));

    await act(async () => {
      await result.current.sendMessage("hello");
    });
    expect(result.current.hasConsent).toBe(false);
  });

  it("prevents a double submit while a request is in flight (loadingRef fix)", async () => {
    let resolveChat: (v: any) => void = () => {};
    chat.mockReturnValue(
      new Promise((res) => {
        resolveChat = res;
      }),
    );
    const { result } = renderHook(() => useAi());
    await waitFor(() => expect(result.current.hasConsent).toBe(true));

    await act(async () => {
      // Fire two calls back-to-back; the second must be rejected by the guard.
      const p1 = result.current.sendMessage("first");
      const second = await result.current.sendMessage("second");
      expect(second).toBeNull();
      resolveChat({ data: { data: { response: { message: "ok" } } } });
      await p1;
    });
    expect(chat).toHaveBeenCalledTimes(1);
  });

  it("generates a diagram and returns xml", async () => {
    generateDiagram.mockResolvedValue({
      data: { data: { xml: "<mxGraphModel/>", message: "done" } },
    });
    const { result } = renderHook(() => useAi());
    await waitFor(() => expect(result.current.hasConsent).toBe(true));

    let resp: any;
    await act(async () => {
      resp = await result.current.generateDiagram("draw a flow");
    });
    expect(resp.xml).toBe("<mxGraphModel/>");
    expect(resp.openTemplate).toBe(true);
  });

  it("returns an error response when the chat API fails", async () => {
    chat.mockRejectedValue(new Error("500"));
    const { result } = renderHook(() => useAi());
    await waitFor(() => expect(result.current.hasConsent).toBe(true));

    await act(async () => {
      await result.current.sendMessage("hello");
    });
    expect(result.current.response?.message).toMatch(/went wrong/i);
  });
});
