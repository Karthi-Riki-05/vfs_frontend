import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDebounce } from "../useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500));
    expect(result.current).toBe("hello");
  });

  it("delays update by specified time", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 500 } },
    );
    rerender({ value: "b", delay: 500 });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe("b");
  });

  it("cancels previous timer on rapid changes", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "a" } },
    );
    rerender({ value: "b" });
    rerender({ value: "c" });

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("c");
  });

  it("handles number values", () => {
    const { result } = renderHook(() => useDebounce(42, 300));
    expect(result.current).toBe(42);
  });

  it("uses the 300ms default delay when none is provided", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: "x" },
    });
    rerender({ value: "y" });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("x");
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("y");
  });
});
