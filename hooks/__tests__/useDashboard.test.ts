import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushWorkspaceCache } from "@/lib/workspaceCache";

const getStats = vi.fn();
const getActivity = vi.fn();
const getRecentFlows = vi.fn();
const getTeamActivity = vi.fn();

vi.mock("@/api/dashboard.api", () => ({
  dashboardApi: {
    getStats: (...a: any[]) => getStats(...a),
    getActivity: (...a: any[]) => getActivity(...a),
    getRecentFlows: (...a: any[]) => getRecentFlows(...a),
    getTeamActivity: (...a: any[]) => getTeamActivity(...a),
  },
}));

let mockCtx: any = { activeTeamId: null, hydrated: true };
vi.mock("@/context/AppContext", () => ({
  useAppContext: () => mockCtx,
}));

import { useDashboard } from "../useDashboard";

const STATS = {
  totalFlows: 5,
  editedThisMonth: 2,
  sharedFlows: 1,
  teamMembers: 3,
};

describe("useDashboard", () => {
  beforeEach(() => {
    mockCtx = { activeTeamId: null, hydrated: true };
    getStats.mockReset().mockResolvedValue({ data: { data: STATS } });
    getActivity.mockReset().mockResolvedValue({ data: { data: [] } });
    getRecentFlows.mockReset().mockResolvedValue({ data: { data: [] } });
    getTeamActivity.mockReset().mockResolvedValue({ data: { data: [] } });
  });

  it("returns stats after fetch", async () => {
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.stats).toEqual(STATS);
  });

  it("fetches team activity scoped to the active team when requested", async () => {
    mockCtx = { activeTeamId: "team-9", hydrated: true };
    getTeamActivity.mockResolvedValue({
      data: { data: [{ id: "a1", flowName: "F", userName: "U" }] },
    });
    const { result } = renderHook(() =>
      useDashboard({ fetchTeamActivity: true }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getTeamActivity).toHaveBeenCalledWith(10, "team-9");
    expect(result.current.teamActivity).toHaveLength(1);
  });

  it("handles empty stats gracefully", async () => {
    getStats.mockResolvedValue({ data: { data: null } });
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recentFlows).toEqual([]);
    expect(result.current.activity).toEqual([]);
  });

  it("does not crash when an endpoint errors (per-call catch)", async () => {
    getStats.mockRejectedValue(new Error("500"));
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));
    // stats stay null, hook resolves cleanly
    expect(result.current.stats).toBeNull();
  });

  it("blanks every stat and array instantly on workspace flush", async () => {
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.stats).toEqual(STATS));

    // Previous bucket's numbers must not linger while the new context loads.
    act(() => {
      flushWorkspaceCache();
    });
    expect(result.current.stats).toBeNull();
    expect(result.current.activity).toEqual([]);
    expect(result.current.recentFlows).toEqual([]);
    expect(result.current.teamActivity).toEqual([]);
  });

  // ── bug-118 ──────────────────────────────────────────────────────────────
  // Owner-reported: the dashboard showed "—" in every card and never resolved
  // until a click, minutes later. Cause: `vc:workspace-switch` fires on EVERY
  // page load (AiBillingContext's boot reconcile), and the handler blanked the
  // data + pinned `loading` true while relying on a dependency change to
  // refetch — which never came, because the workspace had not actually changed.

  const dispatchSwitch = (teamId: string | null) =>
    act(() => {
      window.dispatchEvent(
        new CustomEvent("vc:workspace-switch", { detail: { teamId } }),
      );
    });

  it("DASH-B118-P01: a boot reconcile for the SAME workspace does not blank loaded data", async () => {
    mockCtx = { activeTeamId: "team-9", hydrated: true };
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.stats).toEqual(STATS));

    // Exactly what AiBillingContext dispatches on a plain page load.
    dispatchSwitch("team-9");

    expect(result.current.stats).toEqual(STATS);
    expect(result.current.loading).toBe(false);
  });

  it("DASH-B118-P02: personal context — a null-workspace reconcile is not a switch", async () => {
    mockCtx = { activeTeamId: null, hydrated: true };
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.stats).toEqual(STATS));

    dispatchSwitch(null);

    expect(result.current.stats).toEqual(STATS);
    expect(result.current.loading).toBe(false);
  });

  it("DASH-B118-P03: a REAL switch still blanks and then refetches — loading must resolve", async () => {
    mockCtx = { activeTeamId: "team-9", hydrated: true };
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.stats).toEqual(STATS));
    const before = getStats.mock.calls.length;

    dispatchSwitch("team-OTHER");

    // Blanked immediately so the previous workspace's numbers never linger …
    expect(result.current.stats).toBeNull();
    // … and refilled without needing any other dependency to change. This is
    // the assertion that fails on the old code: `loading` stayed true forever.
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(getStats.mock.calls.length).toBeGreaterThan(before);
  });

  it("DASH-B118-P04: a workspace flush refetches rather than stranding empty state", async () => {
    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.stats).toEqual(STATS));
    const before = getStats.mock.calls.length;

    act(() => {
      flushWorkspaceCache();
    });

    await waitFor(() =>
      expect(getStats.mock.calls.length).toBeGreaterThan(before),
    );
    await waitFor(() => expect(result.current.stats).toEqual(STATS));
  });
});
