import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const list = vi.fn();
const create = vi.fn();
const del = vi.fn();
const update = vi.fn();

vi.mock("@/api/projects.api", () => ({
  projectsApi: {
    list: (...a: any[]) => list(...a),
    create: (...a: any[]) => create(...a),
    delete: (...a: any[]) => del(...a),
    update: (...a: any[]) => update(...a),
  },
}));

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({ activeTeamId: null, hydrated: true }),
}));

vi.mock("antd", async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return { ...actual, message: { success: vi.fn(), error: vi.fn() } };
});

import { useProjects } from "../useProjects";
import { flushWorkspaceCache } from "@/lib/workspaceCache";

const wrap = (projects: any[]) => ({ data: { data: projects } });

describe("useProjects", () => {
  beforeEach(() => {
    list.mockReset();
    create.mockReset();
    del.mockReset();
    update.mockReset();
  });

  it("returns projects after fetch", async () => {
    list.mockResolvedValue(wrap([{ id: "p1", name: "Proj" }]));
    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.projects).toHaveLength(1);
  });

  it("returns an empty list when there are no projects", async () => {
    list.mockResolvedValue(wrap([]));
    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.projects).toEqual([]);
  });

  it("createProject refetches and returns the new project", async () => {
    list
      .mockResolvedValueOnce(wrap([]))
      .mockResolvedValueOnce(wrap([{ id: "p1", name: "New" }]));
    create.mockResolvedValue({ data: { data: { id: "p1", name: "New" } } });
    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: any;
    await act(async () => {
      created = await result.current.createProject("New");
    });
    expect(created).toEqual({ id: "p1", name: "New" });
    await waitFor(() => expect(result.current.projects).toHaveLength(1));
  });

  it("deleteProject refetches a shorter list", async () => {
    list
      .mockResolvedValueOnce(wrap([{ id: "p1" }, { id: "p2" }]))
      .mockResolvedValueOnce(wrap([{ id: "p2" }]));
    del.mockResolvedValue({});
    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.projects).toHaveLength(2));

    await act(async () => {
      await result.current.deleteProject("p1");
    });
    await waitFor(() => expect(result.current.projects).toHaveLength(1));
    expect(del).toHaveBeenCalledWith("p1");
  });

  it("returns null and stays empty on create error", async () => {
    list.mockResolvedValue(wrap([]));
    create.mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let created: any = "x";
    await act(async () => {
      created = await result.current.createProject("Bad");
    });
    expect(created).toBeNull();
  });

  it("zeroes projects synchronously on workspace flush (glitch-free switch)", async () => {
    list.mockResolvedValue(wrap([{ id: "p1", name: "Proj" }]));
    const { result } = renderHook(() => useProjects());
    await waitFor(() => expect(result.current.projects).toHaveLength(1));

    // Firing the bus event must clear in-memory state in the same tick so the
    // previous workspace's projects never ghost-render during the refetch.
    act(() => {
      flushWorkspaceCache();
    });
    expect(result.current.projects).toEqual([]);
  });
});
