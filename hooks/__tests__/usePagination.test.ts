import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { usePagination } from "../usePagination";

describe("usePagination", () => {
  it("returns initial page 1", () => {
    const { result } = renderHook(() => usePagination());
    expect(result.current.page).toBe(1);
  });

  it("returns a positive default page size", () => {
    const { result } = renderHook(() => usePagination());
    expect(result.current.pageSize).toBeGreaterThan(0);
    expect(result.current.pageSize).toBe(10);
  });

  it("onChange updates page and pageSize", () => {
    const { result } = renderHook(() => usePagination());
    act(() => {
      result.current.onChange(2, 10);
    });
    expect(result.current.page).toBe(2);
    expect(result.current.pageSize).toBe(10);
  });

  it("reset returns to the initial page", () => {
    const { result } = renderHook(() => usePagination());
    act(() => {
      result.current.onChange(5, 10);
    });
    expect(result.current.page).toBe(5);
    act(() => {
      result.current.reset();
    });
    expect(result.current.page).toBe(1);
  });

  it("offset is calculated correctly from page and pageSize", () => {
    const { result } = renderHook(() => usePagination(1, 10));
    act(() => {
      result.current.onChange(3, 10);
    });
    const offset = (result.current.page - 1) * result.current.pageSize;
    expect(offset).toBe(20);
  });

  it("exposes paginationProps reflecting current state", () => {
    const { result } = renderHook(() => usePagination());
    act(() => {
      result.current.setTotal(42);
    });
    expect(result.current.paginationProps.current).toBe(1);
    expect(result.current.paginationProps.total).toBe(42);
  });
});
