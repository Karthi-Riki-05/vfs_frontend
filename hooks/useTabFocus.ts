"use client";

import { useEffect, useCallback } from "react";

export function useTabFocus(refetch: () => void) {
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "visible") {
      refetch();
    }
  }, [refetch]);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleVisibilityChange]);
}
