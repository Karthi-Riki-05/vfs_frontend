import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * bug-122: a member inside someone else's workspace was shown "You've reached
 * your 10-flow limit" with "Subscribe Standard — 100 Flows" / "Buy More Flows".
 * The cap comes from the workspace OWNER's plan (createFlow reads the owner's
 * columns) and the checkout endpoints credit `req.user.id` — the caller. A
 * member who clicked would have upgraded their OWN account while the workspace
 * stayed capped: money spent, nothing gained.
 */

let mockSession: any = { data: null };
vi.mock("next-auth/react", () => ({
  useSession: () => mockSession,
}));

let mockCtx: any = { activeTeamId: null };
vi.mock("@/context/AppContext", () => ({
  useAppContext: () => mockCtx,
}));

import { useIsWorkspaceOwner } from "../useIsWorkspaceOwner";

const asUser = (id: string | null) => ({
  data: id ? { user: { id } } : null,
});

describe("useIsWorkspaceOwner (bug-122)", () => {
  beforeEach(() => {
    mockCtx = { activeTeamId: null };
    mockSession = { data: null };
  });

  it("OWNER-P01: personal context → owner (your own workspace)", () => {
    mockCtx = { activeTeamId: null };
    mockSession = asUser("me");
    const { result } = renderHook(() => useIsWorkspaceOwner());
    expect(result.current).toBe(true);
  });

  it("OWNER-P02: standing in your OWN workspace by id → owner", () => {
    // A workspace id IS its owner's user id (owner-as-workspace).
    mockCtx = { activeTeamId: "me" };
    mockSession = asUser("me");
    const { result } = renderHook(() => useIsWorkspaceOwner());
    expect(result.current).toBe(true);
  });

  it("OWNER-P03: member inside someone else's workspace → NOT owner", () => {
    mockCtx = { activeTeamId: "test123" };
    mockSession = asUser("spiderman");
    const { result } = renderHook(() => useIsWorkspaceOwner());
    expect(result.current).toBe(false);
  });

  it("OWNER-P04: session not resolved yet → NOT owner (fail closed)", () => {
    // Defaulting to `true` here would flash a checkout button at a member on
    // every page load, before the session lands.
    mockCtx = { activeTeamId: "test123" };
    mockSession = { data: null };
    const { result } = renderHook(() => useIsWorkspaceOwner());
    expect(result.current).toBe(false);
  });
});
