"use client";

import { useState } from "react";
import { toast } from "sonner";
import { iapRestore, waitThenRefresh } from "@/lib/iapBridge";

/**
 * "Restore purchases" link (Apple/Google require a visible restore action).
 * Replays the account's restorable purchases — active subscriptions and
 * non-consumable unlocks — through the native shell; each replayed purchase
 * is re-validated by the global validator in iapBridge, which now forwards the
 * real store currency. Consumables (AI credits, flow packs) are auto-consumed
 * and are NOT restorable by the stores, so a credit-only account sees nothing
 * to restore — that is expected, not a failure.
 *
 * Shared by the Subscription page and the Billing page. Render it only inside
 * the native shell: `{native && iapReady && <RestorePurchasesButton … />}`.
 */
export default function RestorePurchasesButton({
  onRestored,
}: {
  onRestored?: () => void;
}) {
  const [restoring, setRestoring] = useState(false);
  const handleRestore = async () => {
    setRestoring(true);
    const res = await iapRestore();
    if (res.status === "success" || res.status === "restored") {
      const count = res.restoredCount ?? 0;
      toast.success(
        count > 0
          ? "Purchases restored — refreshing your plan…"
          : "No purchases to restore",
      );
      // Notify the shared credit store (sidebar/dashboard/AI widget) too — a
      // restored credit balance is the same class as a mobile purchase and
      // otherwise updates only this page.
      // bug-155b: a SHORT schedule here, unlike the purchase paths. A restore
      // has no single "done" signal — it may legitimately restore nothing — so
      // there is no predicate to exit on, and the default schedule would spin
      // this button for 22 seconds on an account with nothing to restore.
      // Each restored purchase is validated individually by iapBridge's global
      // validator and fires `vc:iap-granted`, which every shared store now
      // listens to, so this poll is a nudge rather than the mechanism.
      await waitThenRefresh(
        () => {
          onRestored?.();
          try {
            window.dispatchEvent(new Event("aiCreditsChanged"));
          } catch {
            /* no-op */
          }
        },
        [0, 1500, 3000],
      );
    } else if (res.status === "error") {
      toast.error(res.message || "Restore failed");
    }
    setRestoring(false);
  };
  return (
    <div className="flex justify-center pt-1">
      <button
        onClick={handleRestore}
        disabled={restoring}
        className="appearance-none cursor-pointer outline-none border-0 h-9 px-4 rounded-xl bg-transparent text-[13px] font-semibold font-sans text-muted-foreground underline underline-offset-2 disabled:opacity-60"
      >
        {restoring ? "Restoring…" : "Restore purchases"}
      </button>
    </div>
  );
}
