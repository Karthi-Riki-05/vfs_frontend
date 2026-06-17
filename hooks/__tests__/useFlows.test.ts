import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const list = vi.fn();
const del = vi.fn();
const duplicate = vi.fn();
const toggleFavorite = vi.fn();
const removeShare = vi.fn();

vi.mock("@/api/flows.api", () => ({
  flowsApi: {
    list: (...args: any[]) => list(...args),
    delete: (...args: any[]) => del(...args),
    duplicate: (...args: any[]) => duplicate(...args),
    toggleFavorite: (...args: any[]) => toggleFavorite(...args),
    removeShare: (...args: any[]) => removeShare(...args),
  },
}));

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({ activeTeamId: null, hydrated: true }),
}));

vi.mock("antd", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  };
});

import { useFlows } from "../useFlows";

const wrap = (flows: any[], total?: number, shared: any[] = []) => ({
  data: { data: { flows, total: total ?? flows.length, shared } },
});

describe("useFlows", () => {
  beforeEach(() => {
    list.mockReset();
    del.mockReset();
    duplicate.mockReset();
    toggleFavorite.mockReset();
    removeShare.mockReset();
  });

  it("is loading initially", () => {
    list.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useFlows());
    expect(result.current.loading).toBe(true);
  });

  it("returns flows array after fetch", async () => {
    list.mockResolvedValue(wrap([{ id: "1", name: "A" }], 1));
    const { result } = renderHook(() => useFlows());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.flows).toHaveLength(1);
    expect(result.current.total).toBe(1);
  });

  it("returns empty array when there are no flows", async () => {
    list.mockResolvedValue(wrap([], 0));
    const { result } = renderHook(() => useFlows());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.flows).toEqual([]);
  });

  it("stays graceful (empty list, not loading) on fetch failure", async () => {
    list.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useFlows());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.flows).toEqual([]);
  });

  it("exposes a fetchFlows refetch function", async () => {
    list.mockResolvedValue(wrap([{ id: "1" }]));
    const { result } = renderHook(() => useFlows());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.fetchFlows).toBe("function");
  });

  it("passes the debounced search param to the API", async () => {
    list.mockResolvedValue(wrap([]));
    const { result } = renderHook(() => useFlows());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setSearch("invoice"));
    await waitFor(() =>
      expect(list).toHaveBeenCalledWith(
        expect.objectContaining({ search: "invoice" }),
      ),
    );
  });

  it("optimistically toggles favorite in the list", async () => {
    list.mockResolvedValue(wrap([{ id: "1", isFavorite: false }]));
    toggleFavorite.mockResolvedValue({});
    const { result } = renderHook(() => useFlows());
    await waitFor(() => expect(result.current.flows).toHaveLength(1));

    await act(async () => {
      await result.current.favoriteFlow("1");
    });
    expect(result.current.flows[0].isFavorite).toBe(true);
    expect(toggleFavorite).toHaveBeenCalledWith("1", true);
  });

  it("refetches after deleting a flow", async () => {
    list
      .mockResolvedValueOnce(wrap([{ id: "1" }, { id: "2" }], 2))
      .mockResolvedValueOnce(wrap([{ id: "2" }], 1));
    del.mockResolvedValue({});
    const { result } = renderHook(() => useFlows());
    await waitFor(() => expect(result.current.flows).toHaveLength(2));

    await act(async () => {
      await result.current.deleteFlow("1");
    });
    await waitFor(() => expect(result.current.flows).toHaveLength(1));
    expect(del).toHaveBeenCalledWith("1");
  });
});
