import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSharedResource } from "../sharedResource";

// OPT-3: the store behind useCurrentUser / useAiCredits / usePricing. These pin
// the two properties the optimisation depends on (one request for N callers)
// and the one it must not break (a key change refetches, so one account or
// workspace never sees another's data).

describe("createSharedResource", () => {
  let calls: number;
  beforeEach(() => {
    calls = 0;
  });

  const make = (impl?: () => Promise<any>) =>
    createSharedResource<any>("test", impl || (async () => ({ n: ++calls })));

  it("OPT3-P01: concurrent loads share ONE fetch", async () => {
    let release: (v: any) => void;
    const fetcher = vi.fn(() => new Promise((r) => { release = r; }));
    const r = createSharedResource<any>("t", fetcher as any);

    const all = Promise.all([r.load("u1"), r.load("u1"), r.load("u1")]);
    release!({ ok: true });
    await all;

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(r.peek().data).toEqual({ ok: true });
  });

  it("OPT3-P02: a second load for the SAME key does not refetch", async () => {
    const r = make();
    await r.load("u1");
    await r.load("u1");
    expect(calls).toBe(1);
  });

  it("OPT3-P03: a DIFFERENT key refetches — no cross-account bleed", async () => {
    const r = make();
    await r.load("u1");
    expect(r.peek().data).toEqual({ n: 1 });
    // Re-login as someone else without a page reload: the store must not keep
    // serving the first user's record.
    await r.load("u2");
    expect(r.peek().data).toEqual({ n: 2 });
  });

  it("OPT3-P04: force refetches even for the same key", async () => {
    const r = make();
    await r.load("u1");
    await r.load("u1", true);
    expect(calls).toBe(2);
  });

  it("OPT3-P05: a failure keeps the last good value and flags error", async () => {
    let fail = false;
    const r = createSharedResource<any>("t", async () => {
      if (fail) throw new Error("boom");
      return { v: "good" };
    });
    await r.load("u1");
    fail = true;
    await r.load("u1", true);

    // Blanking every consumer at once on a transient network error is worse
    // than showing a slightly stale value.
    expect(r.peek().data).toEqual({ v: "good" });
    expect(r.peek().error).toBe(true);
    expect(r.peek().loading).toBe(false);
  });

  it("OPT3-P06: reset clears the snapshot (logout)", async () => {
    const r = make();
    await r.load("u1");
    r.reset();
    expect(r.peek().data).toBeNull();
    await r.load("u1");
    expect(calls).toBe(2);
  });

  it("OPT3-P07: a failed load does not pin a rejected promise", async () => {
    let fail = true;
    const r = createSharedResource<any>("t", async () => {
      if (fail) throw new Error("boom");
      return { v: 1 };
    });
    await r.load("u1");
    fail = false;
    await r.load("u1", true);
    expect(r.peek().data).toEqual({ v: 1 });
    expect(r.peek().error).toBe(false);
  });
});
