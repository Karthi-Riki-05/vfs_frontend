// Workspace cache invalidation bus.
//
// When the user switches team context (billing switcher or profile switcher),
// all workspace-scoped hooks (useFlows, useTeams, etc.) must immediately
// drop their stale data so ghost-renders of the previous team's content
// never appear on screen while the next fetch is in-flight.
//
// Hooks subscribe with `onWorkspaceFlush` and clear their local state arrays.
// The switcher fires `flushWorkspaceCache()` before updating local state,
// guaranteeing the clearing happens in the same synchronous React batch.

export const WORKSPACE_FLUSH_EVENT = "vc:workspace-flush";

/** Synchronously notify all subscribed hooks to discard their cached data. */
export function flushWorkspaceCache(): void {
  try {
    window.dispatchEvent(new CustomEvent(WORKSPACE_FLUSH_EVENT));
  } catch {
    // SSR / restricted WebView — no-op
  }
}

/**
 * Subscribe a handler that runs whenever the workspace cache is flushed.
 * Returns a cleanup function — pass directly as the return value of useEffect.
 *
 * @example
 * useEffect(() => onWorkspaceFlush(() => setItems([])), []);
 */
export function onWorkspaceFlush(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(WORKSPACE_FLUSH_EVENT, handler);
  return () => window.removeEventListener(WORKSPACE_FLUSH_EVENT, handler);
}
