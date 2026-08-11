"use client";

/**
 * Shown when the editor is opened for a flow the server refuses (403
 * `FLOW_LOCKED`).
 *
 * bug-123 (owner-reported, 2026-08-10): the editor used to fire a toast and
 * `setTimeout(() => window.close(), 3000)`. That close **silently fails** on a
 * tab the app did not open — browsers only allow `window.close()` on
 * script-opened windows. Opening a flow from a card uses `window.open`, so it
 * worked there; **pasting the URL into a new tab left the user on a dead editor
 * shell with drawio spinning "Loading…" forever behind the toast.**
 *
 * And a pasted URL is exactly the case the lock exists for (bug-121), so the
 * old recovery failed precisely where it mattered.
 *
 * Owner asked for a modal + auto-close. Built as modal + countdown with a
 * **redirect fallback**, because a redirect always works:
 *
 *   1. try `window.close()`  — satisfies the "close the tab" intent
 *   2. still open ~400ms later? → `router.push("/dashboard/flows")`
 *
 * The modal is not dismissable: behind it is a broken editor, so there is
 * nothing to dismiss to.
 */

import React, { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { useIsWorkspaceOwner } from "@/hooks/useIsWorkspaceOwner";

const COUNTDOWN_SECONDS = 5;

export default function FlowLockedModal() {
  const isWorkspaceOwner = useIsWorkspaceOwner();
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);

  const leave = React.useCallback(() => {
    // Close if this tab was opened by the app; otherwise fall back to a
    // redirect. `window.close()` is a no-op (not an error) when disallowed, so
    // the only reliable test is whether we are still here afterwards.
    try {
      window.close();
    } catch {
      /* ignore — the fallback below covers it */
    }
    setTimeout(() => {
      // Hard navigation, not router.push: bug-124 pinned the app context in
      // sessionStorage on the way in, but this tab's AppContext state was
      // already hydrated (from the wrong default) and a soft nav would not
      // re-read it. A full load reboots AppContext + AiBillingContext, which
      // re-resolve the workspace from the corrected app context.
      if (!window.closed) window.location.assign("/dashboard/flows");
    }, 400);
  }, []);

  useEffect(() => {
    const tick = setInterval(
      () => setSeconds((s) => (s > 0 ? s - 1 : 0)),
      1000,
    );
    const done = setTimeout(leave, COUNTDOWN_SECONDS * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [leave]);

  return (
    <div
      className="tw fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="flow-locked-title"
    >
      <div className="w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-border overflow-hidden">
        <div className="flex flex-col items-center gap-3 px-6 pt-7 pb-5 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-red-50 border border-red-100">
            <Lock className="w-7 h-7 text-red-500" />
          </div>

          <h2
            id="flow-locked-title"
            className="text-lg font-bold text-foreground"
          >
            This flow is locked
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {isWorkspaceOwner ? (
              <>
                Your workspace has more flows than your plan allows, and this
                one is not among the flows you chose to keep.
              </>
            ) : (
              <>
                This workspace has more flows than its plan allows, and this one
                is not among the flows the owner chose to keep.
              </>
            )}
          </p>

          <div className="flex flex-col gap-2 w-full mt-2">
            <button
              onClick={() => window.location.assign("/dashboard/flows")}
              className="w-full h-11 rounded-2xl font-bold text-sm text-white border-0 appearance-none cursor-pointer bg-primary"
            >
              Go to My Flows
            </button>

            {/* bug-122: only the owner can lift this limit — a member's
                purchase credits their own account and changes nothing here. */}
            {isWorkspaceOwner ? (
              <button
                onClick={() =>
                  window.location.assign("/dashboard/subscription")
                }
                className="w-full h-11 rounded-2xl font-bold text-sm border border-border bg-secondary text-foreground cursor-pointer"
              >
                Upgrade plan
              </button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Ask the workspace owner to upgrade the plan.
              </p>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground mt-1">
            {seconds > 0
              ? `Returning to your flows in ${seconds}…`
              : "Returning to your flows…"}
          </p>
        </div>
      </div>
    </div>
  );
}
