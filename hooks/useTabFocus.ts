"use client";

import { useEffect, useCallback, useRef } from "react";

/**
 * Refetch when the tab becomes visible again — the editor opens in a NEW tab
 * (window.open), so a dashboard tab never remounts and would otherwise show
 * stale data on return (B24).
 *
 * OPT-2 (2026-08-08): throttled. Every tab-back fired an unconditional refetch,
 * so alt-tabbing five times cost five full reloads of the page's data. Measured
 * on /dashboard: 5 tab-backs = 30 requests. Someone flipping between the app
 * and their notes pays for a page load per flip.
 *
 * A 30s window keeps the behaviour this exists for — returning from the editor
 * after an edit takes longer than that — while collapsing rapid switching into
 * one refetch. Deliberately time-based, not "only once": a tab left open for an
 * hour must still refresh when you come back to it.
 */
const MIN_REFETCH_INTERVAL_MS = 30_000;

export function useTabFocus(
  refetch: () => void,
  minIntervalMs: number = MIN_REFETCH_INTERVAL_MS,
) {
  // Starts at 0 so the FIRST visible event always runs — the rule is "at most
  // one refetch per window", not "skip the first". Same rule in useDashboard.
  const lastRunRef = useRef<number>(0);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    const now = Date.now();
    if (now - lastRunRef.current < minIntervalMs) return;
    lastRunRef.current = now;
    refetch();
  }, [refetch, minIntervalMs]);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleVisibilityChange]);
}
