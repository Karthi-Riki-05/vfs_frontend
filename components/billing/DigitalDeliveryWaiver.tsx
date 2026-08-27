"use client";

import React from "react";

/**
 * Consumer waiver of the statutory withdrawal ("cooling-off") period, shown at
 * checkout for immediately-delivered digital content.
 *
 * Why it exists: an EU/UK consumer normally has 14 days to cancel an online
 * purchase. The exception for digital content delivered at once only applies if
 * the buyer was ASKED and agreed BEFORE paying. Without that agreement on
 * record, a refund refusal can be reversed by the buyer's bank as a chargeback
 * — which costs the dispute fee on top of the refunded amount.
 *
 * Three properties are load-bearing; do not "simplify" them away:
 *  1. It starts UNCHECKED. A pre-ticked box is not consent.
 *  2. It BLOCKS the purchase until ticked — consent must precede payment.
 *  3. `WAIVER_TEXT` is exported and sent to the server with the purchase, so
 *     what was recorded is the exact sentence the buyer saw. If you edit the
 *     wording, older payments keep the wording that was shown at the time.
 *
 * Scope: the Stripe/web rail only. In the native shells Apple/Google are the
 * merchant of record and handle their own refunds, so this checkbox would not
 * govern that decision.
 *
 * This is a mechanism, not legal advice — the wording should be confirmed by
 * whoever owns the terms.
 */
export const WAIVER_TEXT =
  "I want access to Pro immediately, and I understand that by starting " +
  "delivery now I lose my 14-day right to withdraw from this purchase.";

export default function DigitalDeliveryWaiver({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor="digital-delivery-waiver"
      className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-card p-3 text-left"
    >
      <input
        id="digital-delivery-waiver"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        // `mt-0.5` aligns the box with the first line of text rather than the
        // block's centre. Size is set explicitly: the 44px tap floor in
        // globals.css deliberately exempts checkboxes, so it would otherwise
        // inherit nothing — the LABEL is the large tap target here.
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#3CB371]"
      />
      <span className="text-[13px] leading-relaxed text-muted-foreground">
        {WAIVER_TEXT}
      </span>
    </label>
  );
}
