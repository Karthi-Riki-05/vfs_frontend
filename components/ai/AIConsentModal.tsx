"use client";

import React from "react";
import { ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { ModalShell } from "@/components/common/Modal";

interface AIConsentModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
  /**
   * Dismiss WITHOUT recording a decision (backdrop click / Escape). Issue #5:
   * this must NOT be treated as an explicit "Decline" — a decline writes
   * consent=false, which (in a team context) used to corrupt the user's
   * personal consent. Falls back to onDecline if not provided.
   */
  onDismiss?: () => void;
}

const ALLOW = [
  "Your chat messages are sent to our AI service",
  "Conversation history is stored to improve responses",
  "You can delete your AI data at any time",
];

const DENY = [
  "Your data is never sold or shared with third parties",
  "We do not use your data to train AI models",
];

export default function AIConsentModal({
  open,
  onAccept,
  onDecline,
  onDismiss,
}: AIConsentModalProps) {
  return (
    <ModalShell open={open} onClose={onDismiss || onDecline}>
      <div className="p-6 max-h-[70dvh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div className="text-lg font-semibold">Value Charts AI</div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          To use the AI assistant, we need to process your messages to generate
          flow suggestions. This includes:
        </p>

        <ul className="flex flex-col gap-1.5 mb-4 list-none p-0">
          {ALLOW.map((t) => (
            <li
              key={t}
              className="text-[13px] text-muted-foreground flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              {t}
            </li>
          ))}
          {DENY.map((t) => (
            <li
              key={t}
              className="text-[13px] text-muted-foreground flex items-start gap-2"
            >
              <XCircle className="w-4 h-4 text-coral shrink-0 mt-0.5" />
              {t}
            </li>
          ))}
        </ul>

        <p className="text-xs text-muted-foreground mb-5">
          By clicking Accept, you consent to AI data processing as described
          above in accordance with GDPR. You can withdraw consent and delete
          your data at any time from Settings.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onDecline}
            className="appearance-none cursor-pointer outline-none flex-1 h-11 rounded-xl border border-border bg-card font-semibold text-sm"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="appearance-none cursor-pointer outline-none border-0 flex-1 h-11 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90"
          >
            Accept &amp; Continue
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
