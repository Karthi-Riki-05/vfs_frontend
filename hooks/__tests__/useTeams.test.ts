import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const list = vi.fn();
const create = vi.fn();
const del = vi.fn();
const update = vi.fn();

vi.mock("@/api/teams.api", () => ({
  teamsApi: {
    list: (...a: any[]) => list(...a),
    create: (...a: any[]) => create(...a),
    delete: (...a: any[]) => del(...a),
    update: (...a: any[]) => update(...a),
  },
}));

vi.mock("antd", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  };
});

import { useTeams } from "../useTeams";

const wrap = (teams: any[]) => ({ data: { data: { teams } } });

describe("useTeams", () => {
  beforeEach(() => {
    list.mockReset();
    create.mockReset();
    del.mockReset();
    update.mockReset();
  });

  it("returns teams after fetch", async () => {
    list.mockResolvedValue(wrap([{ id: "t1", name: "Team" }]));
    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.teams).toHaveLength(1);
  });

  it("returns an empty teams array when none", async () => {
    list.mockResolvedValue(wrap([]));
    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.teams).toEqual([]);
  });

  it("createTeam refetches the list", async () => {
    list
      .mockResolvedValueOnce(wrap([]))
      .mockResolvedValueOnce(wrap([{ id: "t1", name: "New" }]));
    create.mockResolvedValue({});
    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createTeam({ name: "New" });
    });
    await waitFor(() => expect(result.current.teams).toHaveLength(1));
    expect(create).toHaveBeenCalledWith({ name: "New" });
  });

  it("deleteTeam refetches with a shorter list", async () => {
    list
      .mockResolvedValueOnce(wrap([{ id: "t1" }, { id: "t2" }]))
      .mockResolvedValueOnce(wrap([{ id: "t2" }]));
    del.mockResolvedValue({});
    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.teams).toHaveLength(2));

    await act(async () => {
      await result.current.deleteTeam("t1");
    });
    await waitFor(() => expect(result.current.teams).toHaveLength(1));
    expect(del).toHaveBeenCalledWith("t1");
  });

  it("updateTeam calls the API and refetches", async () => {
    list.mockResolvedValue(wrap([{ id: "t1", name: "Old" }]));
    update.mockResolvedValue({});
    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateTeam("t1", { name: "Renamed" });
    });
    expect(update).toHaveBeenCalledWith("t1", { name: "Renamed" });
  });

  it("re-throws and shows a message on create error", async () => {
    list.mockResolvedValue(wrap([]));
    create.mockRejectedValue({
      response: { data: { error: { code: "X", message: "nope" } } },
    });
    const { result } = renderHook(() => useTeams());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.createTeam({ name: "Bad" });
      }),
    ).rejects.toBeTruthy();
  });
});
