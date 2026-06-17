import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mutable session state the mocked useSession reads from.
let mockSession: any = { data: null, status: "unauthenticated" };

vi.mock("next-auth/react", () => ({
  useSession: () => mockSession,
}));

import { useAuth } from "../useAuth";

describe("useAuth", () => {
  beforeEach(() => {
    mockSession = { data: null, status: "unauthenticated" };
  });

  it("returns the user when authenticated", () => {
    mockSession = {
      data: { user: { id: "u1", email: "a@b.com", role: "USER" } },
      status: "authenticated",
    };
    const { result } = renderHook(() => useAuth());
    expect(result.current.user?.id).toBe("u1");
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("returns no user when unauthenticated", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeUndefined();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("reflects the loading state", () => {
    mockSession = { data: null, status: "loading" };
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(true);
  });

  it("isAdmin is true for an ADMIN role", () => {
    mockSession = {
      data: { user: { id: "u1", role: "ADMIN" } },
      status: "authenticated",
    };
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAdmin).toBe(true);
  });

  it("hasRole matches arbitrary roles (e.g. SUPER_ADMIN)", () => {
    mockSession = {
      data: { user: { id: "u1", role: "SUPER_ADMIN" } },
      status: "authenticated",
    };
    const { result } = renderHook(() => useAuth());
    expect(result.current.hasRole("SUPER_ADMIN")).toBe(true);
    expect(result.current.hasRole("ADMIN")).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });
});
