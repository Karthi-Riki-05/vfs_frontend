"use client";

/**
 * The dismissible lock modal shown on flow-listing pages (favourites, recents,
 * project detail, dashboard Recent Documents) when the user tries to open a
 * flow that is locked.
 *
 * Two lock reasons, one modal:
 *   • workspace over-limit (`isLocked`)  → "your/this workspace's flows are locked"
 *   • a single flow marked-for-downgrade → "this flow is locked"
 *
 * bug-122/125 — owner-aware. Plan limits and billing belong to the workspace
 * OWNER; a member's purchase credits their own account and lifts nothing here.
 * So a member is NEVER offered Upgrade / Choose-flows — they are told to ask the
 * owner. This mirrors the main /dashboard/flows Dialog and the editor's
 * FlowLockedModal, and replaces the older per-page copies that showed "Upgrade
 * Plan" to everyone.
 */

import React from "react";
import { useRouter } from "next/navigation";
import { Lock, X } from "lucide-react";
import { useIsWorkspaceOwner } from "@/hooks/useIsWorkspaceOwner";

export default function FlowListLockModal({
  open,
  onClose,
  isLocked,
  flowUsed,
  totCount,
}: {
  open: boolean;
  onClose: () => void;
  /** workspace-wide over-limit lock (vs. a single marked-for-downgrade flow) */
  isLocked: boolean;
  flowUsed?: number | null;
  totCount?: number | null;
}) {
  const router = useRouter();
  const isOwner = useIsWorkspaceOwner();

  if (!open) return null;

  const title = isLocked
    ? isOwner
      ? "Your flows are locked"
      : "This workspace's flows are locked"
    : "This flow is locked";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="tw w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-border overflow-hidden">
        <div className="flex justify-end px-4 pt-4">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary border-0 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-3 px-6 pt-2 pb-5 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-red-50 border border-red-100">
            <Lock className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isLocked ? (
              isOwner ? (
                <>
                  You have{" "}
                  <span className="font-semibold text-foreground">
                    {flowUsed ?? "—"}
                  </span>{" "}
                  flows but your plan allows{" "}
                  <span className="font-semibold text-foreground">
                    {totCount ?? "—"}
                  </span>
                  . All flows are locked until you resolve this.
                </>
              ) : (
                <>
                  This workspace has{" "}
                  <span className="font-semibold text-foreground">
                    {flowUsed ?? "—"}
                  </span>{" "}
                  flows but its plan allows{" "}
                  <span className="font-semibold text-foreground">
                    {totCount ?? "—"}
                  </span>
                  . Ask the workspace owner to upgrade the plan or choose which
                  flows to keep.
                </>
              )
            ) : isOwner ? (
              <>
                This flow is over your plan&apos;s limit. Upgrade your plan to
                unlock it.
              </>
            ) : (
              <>
                This flow is over the workspace plan&apos;s limit. Ask the
                workspace owner to upgrade to unlock it.
              </>
            )}
          </p>
        </div>
        {isOwner ? (
          <div className="flex flex-col gap-2 px-6 pb-7">
            <button
              onClick={() => {
                onClose();
                router.push("/dashboard/subscription");
              }}
              className="w-full h-12 rounded-2xl font-bold text-sm text-white border-0 cursor-pointer"
              style={{ background: "#34A881" }}
            >
              Upgrade Plan
            </button>
            {isLocked && (
              <button
                onClick={() => {
                  onClose();
                  router.push("/dashboard/limitflows");
                }}
                className="w-full h-12 rounded-2xl font-bold text-sm border border-border bg-secondary text-foreground cursor-pointer"
              >
                Choose flows to keep
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2 px-6 pb-7">
            <button
              onClick={onClose}
              className="w-full h-12 rounded-2xl font-bold text-sm text-white border-0 cursor-pointer"
              style={{ background: "#34A881" }}
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
