// @vitest-environment node
//
// OPT-1: the `jwt` callback's entitlement refresh is shared per user.
//
// The cookie-based 5-minute throttle only stops SEQUENTIAL refreshes — parallel
// /api/auth/session requests all evaluate it against a cookie none of them has
// written yet, so they all called the backend. A real dashboard refresh made
// 47 × GET /users/me because of this.
//
// The dedupe must be keyed BY USER. A single shared promise would resolve one
// user's entitlements into another user's signed JWT, which is why that case is
// asserted here and not just the request count.

import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
vi.mock("axios", () => ({ default: { get: (...a: any[]) => get(...a) } }));
vi.mock("jsonwebtoken", () => ({ sign: () => "temp-token" }));

const ok = (data: any) => ({ data: { success: true, data } });

let refreshUserOnce: typeof import("@/lib/auth").refreshUserOnce;

beforeEach(async () => {
  process.env.NEXTAUTH_SECRET = "test-secret";
  vi.resetModules();
  get.mockReset();
  ({ refreshUserOnce } = await import("@/lib/auth"));
});

describe("OPT1: per-user single-flight entitlement refresh", () => {
  it("OPT1-P01: N concurrent refreshes for ONE user make ONE backend call", async () => {
    let resolve: (v: any) => void;
    get.mockReturnValue(new Promise((r) => { resolve = r; }));

    const all = Promise.all(
      Array.from({ length: 6 }, () => refreshUserOnce("user-1")),
    );
    resolve!(ok({ hasPro: true, currentVersion: "pro", hasTeamAccess: false }));
    const results = await all;

    expect(get).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r?.currentVersion === "pro")).toBe(true);
  });

  it("OPT1-P02: DIFFERENT users never share a promise", async () => {
    get.mockImplementation((_url: string, cfg: any) =>
      Promise.resolve(
        // The temp token is opaque here, so key off call order: each user must
        // produce its OWN request, which is the point of the assertion.
        ok({ hasPro: get.mock.calls.length === 1, currentVersion: get.mock.calls.length === 1 ? "pro" : "free" }),
      ),
    );

    const [a, b] = await Promise.all([
      refreshUserOnce("user-A"),
      refreshUserOnce("user-B"),
    ]);

    expect(get).toHaveBeenCalledTimes(2);
    expect(a?.currentVersion).toBe("pro");
    expect(b?.currentVersion).toBe("free");
  });

  it("OPT1-P03: a failure resolves null for every waiter and is not cached", async () => {
    get.mockRejectedValueOnce(new Error("backend down"));
    const [x, y] = await Promise.all([
      refreshUserOnce("user-1"),
      refreshUserOnce("user-1"),
    ]);
    expect(x).toBeNull();
    expect(y).toBeNull();

    // The map entry must be cleared in `finally`, or a rejected promise would
    // be pinned there and every later refresh would fail forever.
    get.mockResolvedValueOnce(ok({ hasPro: true, currentVersion: "pro" }));
    expect((await refreshUserOnce("user-1"))?.currentVersion).toBe("pro");
  });

  // The in-flight map alone was NOT enough. `getServerSession()` runs the jwt
  // callback but cannot set a cookie, so `token.lastRefresh` never persisted —
  // and 17 API proxy routes call it. Measured live: 43 backend calls in two
  // minutes even with single-flight, because the calls were SEQUENTIAL rather
  // than overlapping. These pin the TTL cache that replaces the cookie.
  it("OPT1-P04: sequential calls inside the TTL do NOT refetch", async () => {
    get.mockResolvedValue(ok({ hasPro: false, currentVersion: "free" }));
    await refreshUserOnce("user-1");
    await refreshUserOnce("user-1");
    await refreshUserOnce("user-1");
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("OPT1-P05: force bypasses the cache (session.update after purchase)", async () => {
    get.mockResolvedValue(ok({ hasPro: false, currentVersion: "free" }));
    await refreshUserOnce("user-1");
    // A user who just paid must not keep seeing the free tier for 5 minutes.
    get.mockResolvedValue(ok({ hasPro: true, currentVersion: "pro" }));
    const after = await refreshUserOnce("user-1", true);
    expect(get).toHaveBeenCalledTimes(2);
    expect(after?.currentVersion).toBe("pro");
  });

  it("OPT1-P06: the cache is per user", async () => {
    get.mockResolvedValue(ok({ currentVersion: "free" }));
    await refreshUserOnce("user-A");
    await refreshUserOnce("user-B");
    // B must never be served A's cached entitlements.
    expect(get).toHaveBeenCalledTimes(2);
  });

  it("OPT1-P07: the TTL expires", async () => {
    vi.useFakeTimers();
    get.mockResolvedValue(ok({ currentVersion: "free" }));
    await refreshUserOnce("user-1");
    vi.setSystemTime(Date.now() + 6 * 60 * 1000);
    await refreshUserOnce("user-1");
    expect(get).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
