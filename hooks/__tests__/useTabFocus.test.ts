import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { useTabFocus } from "../useTabFocus";

// useTabFocus listens to the document `visibilitychange` event and only fires
// the callback when document.visibilityState === "visible".
const setVisibility = (state: "visible" | "hidden") => {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
};

const fireVisibilityChange = () => {
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
};

describe("useTabFocus", () => {
  afterEach(() => {
    setVisibility("visible");
    vi.restoreAllMocks();
  });

  it("calls callback when the tab becomes visible", () => {
    const callback = vi.fn();
    setVisibility("visible");
    renderHook(() => useTabFocus(callback));

    fireVisibilityChange();
    expect(callback).toHaveBeenCalled();
  });

  it("does not call callback when the tab is hidden", () => {
    const callback = vi.fn();
    setVisibility("hidden");
    renderHook(() => useTabFocus(callback));

    fireVisibilityChange();
    expect(callback).not.toHaveBeenCalled();
  });

  it("cleans up the listener on unmount", () => {
    const callback = vi.fn();
    const spy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useTabFocus(callback));
    unmount();
    expect(spy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });

  // OPT-2: throttled. Every tab-back used to fire an unconditional refetch, so
  // alt-tabbing five times reloaded the page's data five times — measured at 30
  // requests on /dashboard. The first event still fires; the rule is "at most
  // one per window", not "skip the first".
  it("OPT2-P01: collapses rapid tab-backs into ONE call", () => {
    const callback = vi.fn();
    setVisibility("visible");
    renderHook(() => useTabFocus(callback));

    fireVisibilityChange();
    fireVisibilityChange();
    fireVisibilityChange();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("OPT2-P02: fires again once the window has elapsed", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    setVisibility("visible");
    // A tab left open for an hour MUST still refresh when you come back to it —
    // this is a throttle, not a once-per-mount guard.
    renderHook(() => useTabFocus(callback, 30_000));

    fireVisibilityChange();
    expect(callback).toHaveBeenCalledTimes(1);

    vi.setSystemTime(Date.now() + 31_000);
    fireVisibilityChange();
    expect(callback).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("OPT2-P03: a custom window is honoured", () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    setVisibility("visible");
    renderHook(() => useTabFocus(callback, 1_000));

    fireVisibilityChange();
    vi.setSystemTime(Date.now() + 1_500);
    fireVisibilityChange();
    expect(callback).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
