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

  it("calls callback again on each visible event", () => {
    const callback = vi.fn();
    setVisibility("visible");
    renderHook(() => useTabFocus(callback));

    fireVisibilityChange();
    fireVisibilityChange();
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
