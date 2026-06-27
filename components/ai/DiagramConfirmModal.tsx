"use client";

import React from "react";
import { Zap } from "lucide-react";
import { ModalShell } from "@/components/common/Modal";

interface DiagramConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  creditsRemaining: number;
  planResetsAt?: string | null;
  addonCredits?: number;
  loading?: boolean;
}

export default function DiagramConfirmModal({
  visible,
  onConfirm,
  onCancel,
  creditsRemaining,
  planResetsAt,
  addonCredits = 0,
  loading = false,
}: DiagramConfirmModalProps) {
  const usingPlanCredits = creditsRemaining - addonCredits > 0;

  return (
    <ModalShell open={visible} onClose={loading ? () => {} : onCancel}>
      <div className="p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 mx-auto mb-4 flex items-center justify-center">
          <Zap className="w-6 h-6 text-primary" fill="currentColor" />
        </div>
        <div className="text-lg font-bold mb-2">Generate Diagram?</div>
        <div className="text-sm text-muted-foreground">
          This will use <strong className="text-foreground">1</strong> of your{" "}
          <strong className="text-primary">{creditsRemaining}</strong> remaining
          credits
        </div>

        {usingPlanCredits && planResetsAt && (
          <div className="mt-4 px-3 py-2.5 bg-secondary rounded-lg text-xs text-muted-foreground">
            Plan credits reset on {new Date(planResetsAt).toLocaleDateString()}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="appearance-none cursor-pointer outline-none flex-1 h-11 rounded-xl border border-border bg-card font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="appearance-none cursor-pointer outline-none border-0 flex-1 h-11 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "…" : "Generate"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
