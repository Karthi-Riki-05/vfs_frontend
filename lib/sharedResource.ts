"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

/**
 * A module-level, request-deduplicating store for data that MANY components
 * need but that only ever has one value per user (OPT-3, 2026-08-08).
 *
 * The problem it solves, measured on a real /dashboard load: `GET /users/me` 6×,
 * `/ai/credits` 4×, `/pricing` 4× — not because anything changed, but because
 * each consumer owned its own `useEffect` + `useState`. Every duplicate response
 * also drives its own render, so the cost is paid twice.
 *
 * `usePro` already proved the shape: 15 consumers, ONE request. This generalises
 * that store so the next endpoint does not need a fourth hand-written copy of
 * snapshot + in-flight promise + subscriber set.
 *
 * Deliberately NOT a React context: these are read from route pages and layout
 * components alike, and a provider would have to wrap all of them.
 *
 * ⚠️ Keyed by user/workspace. A shared store with no key would serve one
 * account's data to the next account after a re-login without a reload, and hand
 * one workspace's numbers to another after a switch.
 */

export interface SharedSnapshot<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
}

export interface SharedResource<T> {
  /** Subscribe-and-read hook. Pass null while the key is unknown (e.g. session loading). */
  use: (key: string | null) => SharedSnapshot<T> & { reload: () => void };
  /** Imperative read for non-React callers; resolves the shared in-flight promise. */
  load: (key: string, force?: boolean) => Promise<void>;
  /** Drop everything — call on logout, or when the value is known to be stale. */
  reset: () => void;
  /** Current value without subscribing (tests, event handlers). */
  peek: () => SharedSnapshot<T>;
}

export function createSharedResource<T>(
  name: string,
  fetcher: () => Promise<T>,
  /**
   * window events that invalidate the value (e.g. "aiCreditsChanged").
   *
   * Registered ONCE for the store, not once per consumer. Doing it per consumer
   * — as the first cut of this did — means an event with six mounted displays
   * fires six reloads, which is the very duplication the store exists to
   * remove: measured ai/credits going from 4 to 7 per load.
   */
  invalidateOn: string[] = [],
): SharedResource<T> {
  const EMPTY: SharedSnapshot<T> = { data: null, loading: true, error: false };
  let snapshot: SharedSnapshot<T> = EMPTY;
  let inflight: Promise<void> | null = null;
  let loadedForKey: string | null = null;
  const subscribers = new Set<() => void>();

  function publish(next: Partial<SharedSnapshot<T>>) {
    snapshot = { ...snapshot, ...next };
    // A NEW object each time: useSyncExternalStore compares by identity, so
    // mutating in place would render nothing.
    subscribers.forEach((fn) => fn());
  }

  function load(key: string, force = false): Promise<void> {
    // Concurrent callers await the SAME promise — this is what collapses a
    // mount storm into one request.
    if (inflight) return inflight;
    if (!force && loadedForKey === key && snapshot.data) return Promise.resolve();
    inflight = (async () => {
      publish({ loading: true, error: false });
      try {
        const data = await fetcher();
        loadedForKey = key;
        publish({ data, loading: false, error: false });
      } catch (err) {
        // Keep the last good value: a transient failure should not blank the UI
        // for every consumer at once.
        console.error(`[shared:${name}] fetch failed`, err);
        publish({ loading: false, error: true });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  }

  function reset() {
    snapshot = EMPTY;
    loadedForKey = null;
    inflight = null;
    subscribers.forEach((fn) => fn());
  }

  function subscribe(fn: () => void) {
    subscribers.add(fn);
    return () => {
      subscribers.delete(fn);
    };
  }

  const getSnapshot = () => snapshot;

  // One listener per STORE. Attached at module scope, so it does not depend on
  // any component being mounted and cannot be multiplied by consumer count.
  if (typeof window !== "undefined" && invalidateOn.length) {
    const onInvalidate = () => {
      // Only refetch something we actually hold — otherwise an event fired
      // before first load would kick off a request with no key.
      if (loadedForKey) void load(loadedForKey, true);
    };
    invalidateOn.forEach((evt) => window.addEventListener(evt, onInvalidate));
  }

  function use(key: string | null) {
    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    useEffect(() => {
      if (!key) return;
      // Re-fetch when the KEY changes (account or workspace), not on every mount.
      if (loadedForKey !== key) void load(key);
      else if (!snapshot.data && !inflight) void load(key);
    }, [key]);

    const reload = useCallback(() => {
      if (key) void load(key, true);
    }, [key]);

    return { ...state, reload };
  }

  return { use, load, reset, peek: () => snapshot };
}
