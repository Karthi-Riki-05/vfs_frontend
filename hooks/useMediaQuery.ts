"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Hydration-safe media-query hook built on React 18's useSyncExternalStore.
 *
 * Why useSyncExternalStore (not useState + lazy `window.matchMedia` init):
 * a lazy initializer that reads `window.matchMedia(query).matches` returns the
 * REAL match on the client's first (hydration) render while the server always
 * rendered `false` (no `window`). When the values differ — e.g. a mobile
 * viewport — React throws "Hydration failed … server HTML did not contain a
 * matching <element>" for any markup gated on the result (e.g. the Header
 * hamburger). useSyncExternalStore solves this: `getServerSnapshot` returns the
 * same value used during SSR, so hydration matches; React then re-renders with
 * the real client value synchronously after commit (no visible flicker, no
 * mismatch warning).
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    [query],
  );

  const getSnapshot = () => window.matchMedia(query).matches;

  // Must match the server-rendered HTML to avoid a hydration mismatch.
  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

export function useIsTablet(): boolean {
  return useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
}

export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}

export function useIsWideMobile(): boolean {
  return useMediaQuery("(min-width: 500px) and (max-width: 767px)");
}

/**
 * True when the docked 430px right chat column cannot coexist with the 256px
 * sidebar and a usable content area. Below 1180px the chat button routes to the
 * full-page /dashboard/chat instead of opening the fixed column — this closes
 * the 1024–1179px "tablet dead zone" where sidebar(256)+chat(430) left the
 * content area unusably narrow. Superset of mobile + tablet.
 */
export function useIsChatColumnHidden(): boolean {
  return useMediaQuery("(max-width: 1179px)");
}
