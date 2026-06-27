"use client";

import React from "react";
import { Users, CheckCircle2, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { ModalShell } from "@/components/common/Modal";

interface TeamUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature?: "teams" | "chat" | "export";
}

const FEATURES = [
  "Team collaboration",
  "Shared flows",
  "Team chat",
  "300 AI credits/month",
];

const TeamUpgradeModal: React.FC<TeamUpgradeModalProps> = ({
  open,
  onClose,
  feature = "teams",
}) => {
  const router = useRouter();
  const isExport = feature === "export";
  const title =
    feature === "chat"
      ? "Chat requires a subscription"
      : isExport
        ? "Export requires a subscription"
        : "Teams requires a subscription";
  const description = isExport
    ? "SVG and PDF export requires a Team subscription. PNG, JPEG, WEBP, XML and HTML export is available on all plans."
    : "The Team plan unlocks collaboration features for you and your team.";

  return (
    <ModalShell open={open} onClose={onClose}>
      <div className="p-6">
        <div className="text-center">
          {isExport ? (
            <Lock className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          ) : (
            <Users className="w-10 h-10 text-primary mx-auto mb-4" />
          )}
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
        </div>

        <div className="bg-secondary rounded-lg px-5 py-3.5 mb-2">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-2.5 py-1 text-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="appearance-none cursor-pointer outline-none h-11 px-5 rounded-xl border border-border bg-card font-semibold text-sm"
          >
            Maybe Later
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/dashboard/subscription");
            }}
            className="appearance-none cursor-pointer outline-none border-0 h-11 px-5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90"
          >
            View Plans
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

export default TeamUpgradeModal;
