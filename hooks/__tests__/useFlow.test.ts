import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const get = vi.fn();
const update = vi.fn();

vi.mock("@/api/flows.api", () => ({
  flowsApi: {
    get: (...a: any[]) => get(...a),
    update: (...a: any[]) => update(...a),
  },
}));

vi.mock("antd", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    message: { success: vi.fn(), error: vi.fn() },
  };
});

import { useFlow } from "../useFlow";

describe("useFlow", () => {
  beforeEach(() => {
    get.mockReset();
    update.mockReset();
  });

  it("fetches a single flow by id and unwraps res.data.data", async () => {
    get.mockResolvedValue({ data: { data: { id: "f1", name: "Flow 1" } } });
    const { result } = renderHook(() => useFlow("f1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(get).toHaveBeenCalledWith("f1");
    expect(result.current.flow).toEqual({ id: "f1", name: "Flow 1" });
  });

  it("falls back to res.data when not double-wrapped", async () => {
    get.mockResolvedValue({ data: { id: "f1", name: "Plain" } });
    const { result } = renderHook(() => useFlow("f1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.flow).toEqual({ id: "f1", name: "Plain" });
  });

  it("updateFlow saves changes and unwraps the response", async () => {
    get.mockResolvedValue({ data: { data: { id: "f1", name: "Old" } } });
    update.mockResolvedValue({ data: { data: { id: "f1", name: "New" } } });
    const { result } = renderHook(() => useFlow("f1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateFlow({ name: "New" });
    });
    expect(update).toHaveBeenCalledWith("f1", { name: "New" });
    expect(result.current.flow).toEqual({ id: "f1", name: "New" });
  });

  it("autoSave triggers updateFlow after the debounce delay", async () => {
    vi.useFakeTimers();
    try {
      get.mockResolvedValue({ data: { data: { id: "f1" } } });
      update.mockResolvedValue({ data: { data: { id: "f1" } } });
      const { result } = renderHook(() => useFlow("f1"));

      act(() => {
        result.current.autoSave({ name: "draft" });
      });
      expect(update).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(update).toHaveBeenCalledWith("f1", { name: "draft" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("handles a fetch error without throwing", async () => {
    get.mockRejectedValue(new Error("404"));
    const { result } = renderHook(() => useFlow("f1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.flow).toBeNull();
  });

  it("does not fetch when id is missing", async () => {
    const { result } = renderHook(() => useFlow(""));
    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(get).not.toHaveBeenCalled();
  });
});
