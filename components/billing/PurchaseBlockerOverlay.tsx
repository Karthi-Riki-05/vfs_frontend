"use client";

import { useEffect } from "react";

/**
 * Full-screen block shown while a store purchase is completing.
 *
 * bug-155: nothing used to stop the user leaving mid-purchase. Only the buy
 * button was disabled — the sidebar, the bottom nav and the back gesture all
 * stayed live, and the post-purchase refresh lived entirely inside the page's
 * own promise chain. Navigating away unmounted the only code that would have
 * updated the UI, so the entitlement landed server-side while every surface
 * stayed stale until a full reload; on a HARD document load (shell URL change,
 * deep link) the in-flight POST /iap/validate died with it, leaving the grant
 * to the store's server-to-server notification — minutes, and for a first-ever
 * Apple purchase there is no ledger row to attribute it to at all (be-iap.md).
 *
 * iapBridge's `vc:iap-granted` event is the safety net for the cases this
 * cannot cover (app backgrounded, process killed). This is the front door:
 * while a purchase is in flight there is one thing on screen and it is this.
 *
 * SCOPE (bug-155b, measured on device): keep `active` true ONLY from the buy tap
 * until the grant is settled — i.e. until `iapPurchase()` returns. That is the
 * window where leaving actually costs something. Once the receipt is verified
 * and recorded, `vc:iap-granted` updates whatever screen the user moves to, so
 * blocking past that point buys nothing. Binding this to the caller's BUTTON
 * flag instead held the screen for the entire post-grant refresh poll — 22
 * seconds on a credit purchase, 21 of them after the balance was already
 * correct. The button flag keeps spinning through the poll; this does not.
 *
 * Sits above the Modal layer (z-[1000]) deliberately — a purchase can be
 * started from inside a confirm dialog.
 */
export default function PurchaseBlockerOverlay({
  active,
  message = "Completing your purchase…",
}: {
  active: boolean;
  message?: string;
}) {
  // A hard navigation (shell URL change, browser back, reload) would kill the
  // in-flight validate call, so warn on it as well — the overlay alone cannot
  // intercept those.
  useEffect(() => {
    if (!active) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="tw fixed inset-0 z-[1100] flex flex-col items-center justify-center gap-4 bg-black/55 px-8 text-center backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={message}
      // Swallow taps so nothing underneath (nav tiles, back button, plan
      // cards) can be reached while the store transaction settles.
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/30 border-t-white"
        aria-hidden="true"
      />
      <div className="text-base font-bold text-white">{message}</div>
      <div className="max-w-xs text-sm text-white/80">
        Please stay on this screen — leaving now can delay your purchase
        activating.
      </div>
    </div>
  );
}
