"use client";

import React, { useState } from "react";
import { Zap, Crown } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ModalShell } from "@/components/common/Modal";
import { aiApi } from "@/api/ai.api";
import { usePricing } from "@/hooks/usePricing";

type PackType = "starter" | "standard" | "proppack";

type PriceKey = "addon_starter" | "addon_standard" | "addon_proppack";

interface AddonPack {
  packType: PackType;
  credits: number;
  priceKey: PriceKey;
  popular?: boolean;
}

const PACKS: AddonPack[] = [
  { packType: "starter", credits: 25, priceKey: "addon_starter" },
  {
    packType: "standard",
    credits: 60,
    priceKey: "addon_standard",
    popular: true,
  },
  { packType: "proppack", credits: 150, priceKey: "addon_proppack" },
];

interface CreditsExhaustedModalProps {
  visible: boolean;
  onClose: () => void;
  planResetsAt?: string | null;
  isPro: boolean;
}

export default function CreditsExhaustedModal({
  visible,
  onClose,
  planResetsAt,
  isPro,
}: CreditsExhaustedModalProps) {
  const router = useRouter();
  const { pricing } = usePricing();
  const [purchasing, setPurchasing] = useState<PackType | null>(null);

  const handleAddonPurchase = async (packType: PackType) => {
    setPurchasing(packType);
    try {
      const res = await aiApi.createAddonCheckout(packType);
      const data = res.data?.data || res.data;
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.error("Could not start checkout");
        setPurchasing(null);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || "Checkout failed";
      toast.error(msg);
      setPurchasing(null);
    }
  };

  const handleUpgradeClick = () => {
    onClose();
    router.push("/upgrade-pro");
  };

  const resetDate = planResetsAt
    ? new Date(planResetsAt).toLocaleDateString()
    : null;

  return (
    <ModalShell open={visible} onClose={onClose} size="lg">
      <div className="p-6">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 mx-auto mb-4 flex items-center justify-center">
            <Zap className="w-6 h-6 text-amber-500" fill="currentColor" />
          </div>
          <div className="text-lg font-bold mb-2">
            No diagram credits remaining
          </div>
          {resetDate && (
            <div className="text-sm text-muted-foreground">
              Your plan resets on <strong>{resetDate}</strong>
            </div>
          )}
        </div>

        {isPro ? (
          <>
            <div className="font-bold text-sm mb-3">Get more credits now</div>
            <div className="flex flex-col gap-2.5">
              {PACKS.map((pack) => (
                <div
                  key={pack.packType}
                  className={`relative flex items-center justify-between px-4 py-3.5 rounded-xl ${
                    pack.popular
                      ? "border-2 border-primary bg-primary/5"
                      : "border border-border bg-card"
                  }`}
                >
                  {pack.popular && (
                    <span className="absolute -top-2.5 right-3 text-[10px] font-bold px-2 py-px rounded-[10px] bg-primary text-white">
                      MOST POPULAR
                    </span>
                  )}
                  <div>
                    <div className="font-bold text-[15px]">
                      {pack.credits} credits
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pricing?.prices[pack.priceKey]?.display ?? "…"}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!!purchasing}
                    onClick={() => handleAddonPurchase(pack.packType)}
                    className="appearance-none cursor-pointer outline-none border-0 h-9 px-4 rounded-lg bg-primary text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {purchasing === pack.packType ? "…" : "Buy Now"}
                  </button>
                </div>
              ))}
            </div>
            <div className="text-center text-xs text-muted-foreground mt-3">
              Credits never expire
            </div>
            {pricing && pricing.currency !== "USD" && (
              <div className="text-center text-[10px] text-muted-foreground mt-1">
                Prices shown in {pricing.currency}. Charged in local currency at
                checkout.
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-3">
            <div className="text-sm text-muted-foreground mb-4">
              Upgrade to Pro for 100 AI credits every month, plus all Pro
              features.
            </div>
            <button
              type="button"
              onClick={handleUpgradeClick}
              className="appearance-none cursor-pointer outline-none border-0 w-full h-12 rounded-xl bg-primary text-white font-bold text-sm inline-flex items-center justify-center gap-2 hover:opacity-90"
            >
              <Crown className="w-4 h-4" /> Upgrade to Pro
            </button>
          </div>
        )}

        <div className="text-center mt-5">
          <button
            type="button"
            onClick={onClose}
            className="appearance-none cursor-pointer outline-none bg-transparent border-0 text-sm text-muted-foreground"
          >
            Close
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
