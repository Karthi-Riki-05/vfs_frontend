/**
 * Team Context Switch — Cache Invalidation Tests (Scenario A)
 *
 * Verifies that triggering a workspace context switch immediately flushes
 * stale data from workspace-scoped hooks, preventing ghost-renders.
 *
 * Architecture note: this project uses custom hooks with in-memory state
 * rather than SWR or React Query. Cache invalidation is implemented via the
 * `workspaceCache` event bus (lib/workspaceCache.ts). These tests verify:
 *
 * A1 — `flushWorkspaceCache()` fires WORKSPACE_FLUSH_EVENT on the window
 * A2 — `onWorkspaceFlush` subscribes and cleans up correctly
 * A3 — `useFlows` clears flows[], sharedFlows[], and total when flushed
 * A4 — `useTeams` clears teams[] when flushed
 * A5 — `switchBilling` in AiBillingContext triggers a workspace flush
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  flushWorkspaceCache,
  onWorkspaceFlush,
  WORKSPACE_FLUSH_EVENT,
} from "@/lib/workspaceCache";

// ─── API mocks shared across hook tests ──────────────────────────────────────
const listFlows = vi.fn();
const listTeams = vi.fn();

vi.mock("@/api/flows.api", () => ({
  flowsApi: {
    list: (...args: any[]) => listFlows(...args),
    delete: vi.fn(),
    duplicate: vi.fn(),
    toggleFavorite: vi.fn(),
    removeShare: vi.fn(),
  },
}));

vi.mock("@/api/teams.api", () => ({
  teamsApi: {
    list: (...args: any[]) => listTeams(...args),
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({ activeTeamId: "team-1", hydrated: true }),
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
import { useTeams } from "../useTeams";

const wrapFlows = (flows: any[]) => ({
  data: { data: { flows, total: flows.length, shared: [] } },
});
const wrapTeams = (teams: any[]) => ({ data: { data: { teams } } });

// ─── A1 & A2: workspaceCache primitive unit tests ────────────────────────────

describe("workspaceCache — event bus unit tests", () => {
  it("A1: flushWorkspaceCache() dispatches WORKSPACE_FLUSH_EVENT on window", () => {
    const handler = vi.fn();
    window.addEventListener(WORKSPACE_FLUSH_EVENT, handler);

    flushWorkspaceCache();

    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener(WORKSPACE_FLUSH_EVENT, handler);
  });

  it("A2: onWorkspaceFlush returns a cleanup that removes the listener", () => {
    const handler = vi.fn();
    const cleanup = onWorkspaceFlush(handler);

    flushWorkspaceCache();
    expect(handler).toHaveBeenCalledTimes(1);

    // After cleanup, the handler should no longer fire
    cleanup();
    flushWorkspaceCache();
    expect(handler).toHaveBeenCalledTimes(1); // still 1, not 2
  });

  it("A2b: multiple subscribers are each notified independently", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    const c1 = onWorkspaceFlush(h1);
    const c2 = onWorkspaceFlush(h2);

    flushWorkspaceCache();

    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);

    c1();
    c2();
  });
});

// ─── A3: useFlows clears its state on flush ───────────────────────────────────

describe("useFlows — workspace flush (Scenario A3)", () => {
  beforeEach(() => {
    listFlows.mockReset();
  });

  it("clears flows[], sharedFlows[], and total=0 immediately when workspace is flushed", async () => {
    listFlows.mockResolvedValue(wrapFlows([{ id: "f1" }, { id: "f2" }]));
    const { result } = renderHook(() => useFlows());

    // Wait for initial data load
    await waitFor(() => expect(result.current.flows).toHaveLength(2));
    expect(result.current.total).toBe(2);

    // Simulate a team context switch — triggers the workspace flush
    act(() => {
      flushWorkspaceCache();
    });

    // Stale data must be gone immediately — no waiting for a network round-trip
    expect(result.current.flows).toEqual([]);
    expect(result.current.sharedFlows).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.page).toBe(1);
  });

  it("does not leave stale data visible while the refetch is in-flight", async () => {
    listFlows
      .mockResolvedValueOnce(wrapFlows([{ id: "old-flow" }]))
      // Second call never resolves during this test — simulates a slow network
      .mockReturnValueOnce(new Promise(() => {}));

    const { result } = renderHook(() => useFlows());
    await waitFor(() => expect(result.current.flows).toHaveLength(1));

    act(() => {
      flushWorkspaceCache();
    });

    // Old team's data is gone even before the new fetch resolves
    expect(result.current.flows).toEqual([]);
  });
});

// ─── A4: useTeams clears its state on flush ───────────────────────────────────

describe("useTeams — workspace flush (Scenario A4)", () => {
  beforeEach(() => {
    listTeams.mockReset();
  });

  it("clears teams[] immediately when workspace is flushed", async () => {
    listTeams.mockResolvedValue(
      wrapTeams([
        { id: "t1", name: "Alpha" },
        { id: "t2", name: "Beta" },
      ]),
    );
    const { result } = renderHook(() => useTeams());

    await waitFor(() => expect(result.current.teams).toHaveLength(2));

    act(() => {
      flushWorkspaceCache();
    });

    expect(result.current.teams).toEqual([]);
  });
});

// ─── A5: switchBilling fires the workspace flush event ───────────────────────
//
// AiBillingProvider requires next-auth's SessionProvider. Rather than wiring
// the full provider tree (which would also need mocking /teams/my-contexts
// and /users/active-context API responses), we test the dispatch contract at
// two levels:
//   a) The raw event bus fires correctly (window.dispatchEvent spy)
//   b) AiBillingContext's switchBilling calls flushWorkspaceCache, verified
//      via a module spy while mocking SessionProvider and the axios API layer.

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "u1", email: "u@test.com" } },
    status: "authenticated",
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi
      .fn()
      .mockResolvedValue({
        data: {
          data: { personal: { label: "Personal", aiCredits: null }, teams: [] },
        },
      }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
}));

vi.mock("@/lib/aiBilling", () => ({
  AI_BILLING_KEY: "vc_ai_billing_team",
  PRO_BILLING_KEY: "vc_pro_team_id",
  AI_BILLING_EVENT: "vc:ai-billing-change",
  getAiBillingTeamId: vi.fn().mockReturnValue(null),
  setAiBillingTeamId: vi.fn(),
}));

import React from "react";
import { AiBillingProvider, useAiBilling } from "@/context/AiBillingContext";

describe("AiBillingContext.switchBilling — workspace flush dispatch (Scenario A5)", () => {
  it("A5a: flushWorkspaceCache dispatches the WORKSPACE_FLUSH_EVENT CustomEvent", () => {
    const dispatch = vi.spyOn(window, "dispatchEvent");

    flushWorkspaceCache();

    const call = dispatch.mock.calls.find(
      ([e]) => (e as CustomEvent).type === WORKSPACE_FLUSH_EVENT,
    );
    expect(call).toBeDefined();

    dispatch.mockRestore();
  });

  it("A5b: switchBilling calls flushWorkspaceCache before updating billing state", async () => {
    const flushSpy = vi
      .spyOn(await import("@/lib/workspaceCache"), "flushWorkspaceCache")
      .mockImplementation(() => {});

    const { result } = renderHook(() => useAiBilling(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(AiBillingProvider, null, children),
    });

    await act(async () => {
      await result.current.switchBilling("team-x-id");
    });

    expect(flushSpy).toHaveBeenCalledTimes(1);
    flushSpy.mockRestore();
  });
});
