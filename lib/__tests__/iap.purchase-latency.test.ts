/**
 * bug-155 — the mobile IAP purchase flow's latency and duplication.
 *
 * Every test here fails against the pre-fix bridge:
 *   - waitThenRefresh slept 2s before its FIRST refresh and always burned all
 *     three delays (14s of sleeping) with no way to stop early.
 *   - iapPurchase queued POST /iap/validate behind a price lookup whose
 *     matcher cannot match the shell's error/disabled price shape, so it took
 *     the full 20s timeout.
 *   - one flutterIap event was validated TWICE (global validator + the awaited
 *     page-level promise).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// The bridge posts through window.NativeBridge and validates through iapApi.
const validatePurchase = vi.fn();
vi.mock("@/api/iap.api", () => ({
  iapApi: { validatePurchase: (...a: unknown[]) => validatePurchase(...a) },
}));
vi.mock("../detectWebView", () => ({ getClientAppType: () => "team" }));

import {
  iapPurchase,
  waitThenRefresh,
  IAP_GRANTED_EVENT,
  type IapPrice,
} from "../iapBridge";

const PRODUCT = "team_5_monthly";

const price: IapPrice = {
  productId: PRODUCT,
  priceString: "₹499.00",
  price: 499,
  currencyCode: "INR",
  title: "Team 5",
};

/** The shape the shell sends back on a successful purchase. */
function purchaseEvent() {
  window.dispatchEvent(
    new CustomEvent("flutterIap", {
      detail: {
        action: "purchase",
        status: "success",
        productId: PRODUCT,
        transactionId: "GPA.1234",
        verificationData: "token-abc",
        store: "google_play",
        packageName: "com.valuecharts.app",
      },
    }),
  );
}

/**
 * The shell's `_error` / `_disabled` price reply (iap_service.dart) — note it
 * carries NEITHER `products` NOR `notFound`, which is precisely why the
 * bridge's matcher could never match it and the wait ran to its timeout.
 */
function pricesErrorEvent() {
  window.dispatchEvent(
    new CustomEvent("flutterIap", {
      detail: { action: "prices", status: "error", code: "prices_failed" },
    }),
  );
}

let posted: string[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  posted = [];
  validatePurchase.mockReset();
  validatePurchase.mockResolvedValue({ data: { data: { granted: true } } });
  (window as any).flutterIapAvailable = true;
  // Deliberately NOT resetting __vcIapValidatorInstalled: the global validator
  // is installed once per document load in the real app, and clearing the flag
  // here would stack a fresh window listener per test.
  (window as any).NativeBridge = {
    postMessage: (m: string) => {
      posted.push(m);
      // Answer the shell's side on the next tick, like the real bridge.
      if (m.startsWith("iap-prices:")) setTimeout(pricesErrorEvent, 5);
      if (m.startsWith("iap-purchase:")) setTimeout(purchaseEvent, 5);
    },
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("waitThenRefresh", () => {
  it("refreshes immediately instead of sleeping first", async () => {
    const at: number[] = [];
    const start = Date.now();
    const p = waitThenRefresh(() => {
      at.push(Date.now() - start);
    });
    // Nothing has advanced the clock yet, so a leading sleep would mean no
    // refresh at all here. Pre-fix: first refresh landed at t+2000ms.
    await vi.advanceTimersByTimeAsync(0);
    expect(at[0]).toBe(0);
    await vi.runAllTimersAsync();
    await p;
  });

  it("stops as soon as the refresh reports the entitlement is live", async () => {
    let calls = 0;
    const p = waitThenRefresh(() => {
      calls += 1;
      return calls === 2; // live on the second look
    });
    await vi.runAllTimersAsync();
    await p;
    // Pre-fix there was no early exit — the caller's loading flag was held
    // for the whole fixed schedule regardless.
    expect(calls).toBe(2);
  });

  it("keeps polling when the grant has not landed yet", async () => {
    let calls = 0;
    const p = waitThenRefresh(() => {
      calls += 1;
      return false;
    });
    await vi.runAllTimersAsync();
    await p;
    expect(calls).toBeGreaterThanOrEqual(5);
  });

  it("stops early on an ASYNC predicate (the credit-balance shape)", async () => {
    // bug-155b: the credits path awaits a context refresh, yields a tick to let
    // React commit, then compares a ref against the starting balance. With no
    // predicate at all this burned the full 22-second schedule while the
    // balance had already been correct since the first poll.
    let balance = 650;
    const start = 650;
    let calls = 0;
    const p = waitThenRefresh(async () => {
      calls += 1;
      if (calls === 2) balance = 850; // the grant lands
      await new Promise((r) => setTimeout(r, 0));
      return balance > start;
    });
    await vi.runAllTimersAsync();
    await p;
    expect(calls).toBe(2);
  });

  it("keeps polling when the predicate has no baseline to judge by", async () => {
    // startBalance === undefined → returns undefined, never true.
    let calls = 0;
    const p = waitThenRefresh(async () => {
      calls += 1;
      return undefined;
    });
    await vi.runAllTimersAsync();
    await p;
    expect(calls).toBe(6);
  });

  it("survives a throwing refresh and keeps going", async () => {
    let calls = 0;
    const p = waitThenRefresh(() => {
      calls += 1;
      if (calls === 1) throw new Error("network");
      return calls === 3;
    });
    await vi.runAllTimersAsync();
    await p;
    expect(calls).toBe(3);
  });
});

describe("iapPurchase", () => {
  it("does not queue the grant behind a price lookup when the caller has the price", async () => {
    const p = iapPurchase(PRODUCT, price);
    await vi.advanceTimersByTimeAsync(10);
    const res = await p;

    expect(res.granted).toBe(true);
    // No price query at all — the caller already had it.
    expect(posted.filter((m) => m.startsWith("iap-prices:"))).toHaveLength(0);
    // And the price it passed is what got recorded.
    expect(validatePurchase).toHaveBeenCalledWith(
      expect.objectContaining({ priceAmount: 499, currency: "INR" }),
    );
  });

  it("caps the price lookup so an unmatchable reply cannot stall the grant", async () => {
    const p = iapPurchase(PRODUCT); // no known price → lookup happens
    // The shell answers with the error shape, which the matcher rejects.
    // Pre-fix this waited the full 20_000ms price timeout before validating.
    await vi.advanceTimersByTimeAsync(3_100);
    const res = await p;
    expect(res.granted).toBe(true);
    expect(validatePurchase).toHaveBeenCalledTimes(1);
  });

  it("validates ONCE, not once per listener", async () => {
    const p = iapPurchase(PRODUCT, price);
    await vi.advanceTimersByTimeAsync(10);
    await p;
    // Pre-fix: 2 — the window-level global validator and the awaited
    // page-level promise both handled the same single event.
    expect(validatePurchase).toHaveBeenCalledTimes(1);
  });

  it("announces a confirmed grant on the window so any surface can refetch", async () => {
    const seen: unknown[] = [];
    const h = (e: Event) => seen.push((e as CustomEvent).detail);
    window.addEventListener(IAP_GRANTED_EVENT, h);
    const p = iapPurchase(PRODUCT, price);
    await vi.advanceTimersByTimeAsync(10);
    await p;
    window.removeEventListener(IAP_GRANTED_EVENT, h);
    expect(seen).toHaveLength(1);
  });

  it("returns a timeout RESULT rather than throwing when the shell never answers", async () => {
    (window as any).NativeBridge = { postMessage: (m: string) => posted.push(m) };
    const p = iapPurchase(PRODUCT, price);
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 10);
    // Pre-fix this rejected, and three of the four purchase surfaces had no
    // try/catch — their loading flag was never cleared.
    const res = await p;
    expect(res.status).toBe("error");
    expect(res.code).toBe("timeout");
    expect(validatePurchase).not.toHaveBeenCalled();
  });

  it("releases its claim on timeout so a late delivery still gets validated", async () => {
    (window as any).NativeBridge = { postMessage: (m: string) => posted.push(m) };
    const p = iapPurchase(PRODUCT, price);
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 10);
    await p;
    // The purchase the user actually completed arrives later, unsolicited.
    purchaseEvent();
    await vi.advanceTimersByTimeAsync(3_100);
    expect(validatePurchase).toHaveBeenCalledTimes(1);
  });

  it("still validates a restored/replayed purchase nobody is awaiting", async () => {
    // The global validator is installed by any purchase surface on mount.
    const p = iapPurchase("some_other_product", price);
    window.dispatchEvent(
      new CustomEvent("flutterIap", {
        detail: {
          action: "purchase",
          status: "restored",
          productId: PRODUCT,
          verificationData: "token-restored",
          store: "google_play",
        },
      }),
    );
    await vi.advanceTimersByTimeAsync(3_100);
    expect(validatePurchase).toHaveBeenCalledWith(
      expect.objectContaining({ purchaseToken: "token-restored" }),
    );
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    await p;
  });

  it("reports granted:false with the server's reason when the grant is refused", async () => {
    validatePurchase.mockRejectedValue({
      response: {
        data: {
          error: {
            code: "SUBSCRIPTION_OWNED_BY_ANOTHER_ACCOUNT",
            message: "Already linked to a different account.",
          },
        },
      },
    });
    const p = iapPurchase(PRODUCT, price);
    await vi.advanceTimersByTimeAsync(10);
    const res = await p;
    expect(res.granted).toBe(false);
    expect(res.validationCode).toBe("SUBSCRIPTION_OWNED_BY_ANOTHER_ACCOUNT");
  });
});
