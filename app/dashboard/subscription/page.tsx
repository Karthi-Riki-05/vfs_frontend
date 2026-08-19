"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Select, Spin } from "antd";
import { toast } from "sonner";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { confirmDialog } from "@/components/common/ConfirmDialog";
import { AddCardForm } from "@/components/billing/AddCardForm";
import {
  Crown,
  Zap,
  Check,
  CreditCard,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { usePro } from "@/hooks/usePro";
import { usePricing } from "@/hooks/usePricing";
import { usePackStatus } from "@/hooks/usePackStatus";
import { proApi } from "@/api/pro.api";
import { aiApi } from "@/api/ai.api";
import { paymentsApi, SavedCard } from "@/api/payments.api";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAiBilling } from "@/context/AiBillingContext";
import { useAppContext } from "@/context/AppContext";
import { getClientAppType } from "@/lib/detectWebView";
import {
  IAP_PRODUCTS,
  getLegacyTeamPlans,
  legacyTeamPlansForPeriod,
  findLegacyTeamPlan,
  findLegacyProAddon,
  legacyProAddonIds,
  isNativeShell,
  useIapAvailable,
  iapLogin,
  iapPurchase,
  iapPrices,
  aiCreditProductId,
  aiCreditProductIds,
  iapRestore,
  waitThenRefresh,
  IapPrice,
  IapResult,
} from "@/lib/iapBridge";

// Ported from new_design Subscription/ValueChartPlans/ProPlans/CreditAddOns
// (prototype L1537–1728). Tailwind `.tw` shell, unified for desktop + mobile.
// ALL real billing logic preserved verbatim — only the presentation changed.
// Native controls reset per preflight-off rule (DESIGN.md §1): bg-less buttons
// carry their own bg; nothing inherits a global reset.
const RESET = "appearance-none cursor-pointer border-0";

const TEAM_OPTIONS = [5, 10, 15, 20, 25];

const FEATURES = [
  "Unlimited flows",
  "40 AI credits/user/month (Team)",
  "Claude AI powered diagrams",
  "All shapes library",
  "Export all formats",
  "Team collaboration",
  "Admin dashboard",
  "Team management",
  "Priority support",
];

const ADDON_PACK_META = [
  {
    packType: "starter" as const,
    credits: 50,
    priceKey: "addon_starter" as const,
  },
  {
    packType: "standard" as const,
    credits: 100,
    priceKey: "addon_standard" as const,
    popular: true,
  },
  {
    packType: "proppack" as const,
    credits: 200,
    priceKey: "addon_proppack" as const,
  },
];

interface FlowAddon {
  plan: "standard_100" | "unlimited" | null;
  status: "active" | "cancelling" | "cancelled" | "past_due" | null;
  currentPeriodEnd: string | null;
}

interface ProSubStatus {
  plan: string;
  originalPrice: string;
  isUnlimited: boolean;
  flows: {
    free: number;
    purchased: number;
    total: number;
    used: number;
    remaining: number;
  };
  purchases: Array<{
    id: string;
    flowCount: number;
    amountCents: number;
    createdAt: string;
  }>;
  flowAddon?: FlowAddon;
}

/* ---------- Shared: native-shell (IAP) helpers ---------- */

// Store-policy copy shown in the native shells instead of purchase controls.
// Deliberately NO link/button to web payment — that would be steering
// (Apple 3.1.1 / Play Payments). See IAP_CONTRACT.md.
function ManagedOnWebNote({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-secondary/40 border border-border px-4 py-3 text-[13px] text-muted-foreground">
      {text}
    </div>
  );
}

// Disclosure shown before a RECURRING purchase (Team subscription / Pro
// recurring Flow Add-on): the card is saved and the plan auto-renews. This is
// information + acknowledge (not an opt-out) — a recurring plan requires a
// stored card, so the way to stop future charges is to cancel. Merged into the
// existing confirmDialog `content` (ReactNode). See bug-081.
function RecurringSaveNotice({
  price,
  period,
}: {
  price: string;
  period: string;
}) {
  return (
    <div className="mt-3 rounded-xl bg-secondary/50 border border-border px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
      <div className="font-semibold text-foreground flex items-center gap-1.5 mb-0.5">
        <CreditCard className="w-3.5 h-3.5" /> Card saved for automatic renewal
      </div>
      Your card will be securely saved and charged {price}/{period}. To stop
      future payments, cancel anytime — your plan stays active until the end of
      the current period, then won&apos;t renew.
    </div>
  );
}

/**
 * Guards every native purchase result. `status: "success"` only means the STORE
 * charged the card; the entitlement is live only once the backend has verified
 * the receipt and granted it (`granted`) — see validateWithBackend in
 * lib/iapBridge.ts. Toasting on status alone made a refused grant look exactly
 * like a real purchase: success message, unchanged plan, and the backend's
 * reason discarded, which is precisely how a sandbox team purchase presented on
 * 2026-08-12. Returns false (having shown the reason) when nothing was granted.
 */
function ensureGranted(res: IapResult, noun: string): boolean {
  if (res.granted) return true;
  toast.error(
    `Payment went through, but we couldn't activate your ${noun}: ` +
      `${res.validationError || "please contact support"}`,
    { duration: 10000 },
  );
  return false;
}

// Mandatory "Restore purchases" affordance (App Review requires it; also
// useful on Android after a reinstall). Rendered only when IAP is available.
function RestorePurchasesButton({ onRestored }: { onRestored: () => void }) {
  const [restoring, setRestoring] = useState(false);
  const handleRestore = async () => {
    setRestoring(true);
    const res = await iapRestore();
    if (res.status === "success") {
      toast.success("Purchases restored — refreshing your plan…");
      await waitThenRefresh(onRestored);
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
        className={`${RESET} h-9 px-4 rounded-xl bg-transparent text-[13px] font-semibold font-sans text-muted-foreground underline underline-offset-2 disabled:opacity-60`}
      >
        {restoring ? "Restoring…" : "Restore purchases"}
      </button>
    </div>
  );
}

/* ---------- Shared: AI Credit Add-ons (prototype CreditAddOns L1705) ---------- */

function CreditAddOns({
  balance,
  onPurchased,
}: {
  balance?: number;
  onPurchased?: () => void;
}) {
  const [buying, setBuying] = useState<string | null>(null);
  const { pricing } = usePricing();
  const { data: session } = useSession();
  const native = isNativeShell();
  const iapReady = useIapAvailable();
  const [storePrices, setStorePrices] = useState<Record<string, IapPrice>>({});
  const hasCredits = typeof balance === "number" && balance > 0;

  // Native shell: show what the STORE will charge, not the Stripe price.
  useEffect(() => {
    if (!native || !iapReady) return;
    iapPrices(aiCreditProductIds()).then(setStorePrices);
  }, [native, iapReady]);

  const handleBuy = async (packType: "starter" | "standard" | "proppack") => {
    // Native shell → store purchase sheet. The RevenueCat webhook credits
    // the pool; waitThenRefresh polls until the balance flips.
    if (native) {
      if (!iapReady) return;
      setBuying(packType);
      const userId = (session?.user as any)?.id as string | undefined;
      if (userId) await iapLogin(userId);
      const res = await iapPurchase(aiCreditProductId(packType));
      if (res.status === "success") {
        if (ensureGranted(res, "credits")) {
          toast.success("Purchase successful — adding your credits…");
        }
        if (onPurchased) await waitThenRefresh(onPurchased);
      } else if (res.status === "error") {
        toast.error(res.message || "Purchase failed");
      }
      setBuying(null);
      return;
    }

    setBuying(packType);
    try {
      const res = await aiApi.createAddonCheckout(packType);
      const data = res.data?.data || res.data;
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.error("Could not start checkout");
        setBuying(null);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || "Checkout failed";
      toast.error(msg);
      setBuying(null);
    }
  };

  return (
    <div className="rounded-2xl bg-secondary/40 border border-border p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-bold text-base text-foreground">
            AI Credit Add-ons
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Top up AI diagram credits anytime.{" "}
            <span className="text-primary-deep font-semibold">
              Credits never expire.
            </span>
          </div>
        </div>
        {hasCredits ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-tint px-3 py-1.5 text-[13px] font-bold text-primary-deep">
            <Zap className="w-3.5 h-3.5" /> {balance} credits
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[13px] font-medium text-muted-foreground">
            <Zap className="w-3.5 h-3.5" /> No credits yet
          </div>
        )}
      </div>

      {native && !iapReady ? (
        <div className="mt-4">
          <ManagedOnWebNote text="Credit top-ups are not available in this version of the app." />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          {ADDON_PACK_META.map((pack) => {
            const priceInfo = pricing?.prices[pack.priceKey];
            const storePrice =
              storePrices[aiCreditProductId(pack.packType)]?.priceString;
            const popular = "popular" in pack && pack.popular;
            return (
              <div
                key={pack.packType}
                className={`relative rounded-2xl border bg-card p-5 flex flex-col items-center text-center ${
                  popular
                    ? "border-2 border-primary bg-primary-tint/40"
                    : "border-border"
                }`}
              >
                {popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-primary text-white">
                    Most Popular
                  </span>
                )}
                <div className="text-3xl font-extrabold text-foreground">
                  {pack.credits}
                </div>
                <div className="text-[11px] text-muted-foreground">credits</div>
                <div className="mt-2 text-xl font-extrabold text-primary">
                  {native ? (storePrice ?? "…") : (priceInfo?.display ?? "…")}
                </div>
                <button
                  onClick={() => handleBuy(pack.packType)}
                  disabled={!!buying}
                  className={`${RESET} mt-3 w-full h-10 rounded-xl bg-primary text-white font-bold text-sm font-sans hover:bg-primary-deep transition disabled:opacity-60`}
                >
                  {buying === pack.packType ? "Loading…" : "Buy Now"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!native && pricing && pricing.currency !== "USD" && (
        <div className="text-[11px] text-muted-foreground mt-3 text-center">
          Prices shown approximately in {pricing.currency}. You will be charged
          in USD at checkout — your bank converts automatically.
        </div>
      )}
    </div>
  );
}

/* ---------- Pro flow-pack view (prototype ProPlans L1627) ---------- */

function ProSubscriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pricing } = usePricing();
  const { data: session } = useSession();
  // Native shell: purchases must go through the store (IAP_CONTRACT.md).
  const native = isNativeShell();
  const iapReady = useIapAvailable();
  const [iapStorePrices, setIapStorePrices] = useState<
    Record<string, IapPrice>
  >({});
  const { status: packStatus, refresh: refreshPackStatus } = usePackStatus();
  const { activeOption, refresh: refreshAiBilling } = useAiBilling();
  const { refresh: refreshAppContext } = useAppContext();
  const planCredits = activeOption.aiCredits?.planCredits || 0;
  const addonCredits = activeOption.aiCredits?.addonCredits || 0;
  const totalCredits = planCredits + addonCredits;
  const [proSubStatus, setProSubStatus] = useState<ProSubStatus | null>(null);
  const [proSubLoading, setProSubLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [proSavedCards, setProSavedCards] = useState<SavedCard[]>([]);
  const [pendingAddon, setPendingAddon] = useState<
    "standard" | "unlimited" | null
  >(null);
  const [proSelectedCardId, setProSelectedCardId] = useState<string | "new">(
    "new",
  );

  // This component renders ONLY when currentApp === "pro" (DB-backed, set by
  // switchApp → cannot be self-granted via URL). On a fresh tab / direct load
  // of /dashboard/subscription, sessionStorage has no vc_app_context (or a
  // stale "team"), so the axios interceptor sends X-App-Context: team — which
  // bills AI-credit + flow-pack purchases to the TEAM pool and shows the team
  // credit balance in the Pro UI. Pin the context to "pro" here so both the
  // credit display and every purchase route to the pro pool, then refresh the
  // billing context so the displayed balance reloads with the correct pool.
  useEffect(() => {
    try {
      if (
        typeof window !== "undefined" &&
        sessionStorage.getItem("vc_app_context") !== "pro"
      ) {
        sessionStorage.setItem("vc_app_context", "pro");
        refreshAiBilling();
      }
    } catch {
      /* sessionStorage may be blocked in restricted WebViews */
    }
  }, [refreshAiBilling]);

  useEffect(() => {
    paymentsApi
      .listPaymentMethods()
      .then((res) => {
        const data = res.data?.data || res.data;
        const methods: SavedCard[] = data?.paymentMethods ?? [];
        setProSavedCards(methods);
        const def = methods.find((c) => c.isDefault) ?? methods[0];
        if (def) setProSelectedCardId(def.id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const purchased = searchParams?.get("purchased");
    const addonSubscribed = searchParams?.get("flow_addon_subscribed");
    const sessionId = searchParams?.get("session_id");

    if (addonSubscribed) {
      const label =
        addonSubscribed === "unlimited"
          ? "Unlimited Flow Add-on"
          : "Standard 100-flow Add-on";
      const finishAddon = async () => {
        if (sessionId) {
          try {
            await proApi.verifyFlowAddon(sessionId);
          } catch {
            // Silent — webhook may have already activated it
          }
        }
        fetchProSubStatus();
        refreshPackStatus();
        router.replace(
          `/subscription/success?plan=${encodeURIComponent(label)}&type=addon&app_context=pro`,
        );
      };
      finishAddon();
      return;
    }

    if (!purchased) return;
    const label = purchased === "unlimited" ? "Unlimited flows" : "50 flows";

    const finish = async () => {
      if (sessionId) {
        try {
          await proApi.verifyFlowPurchase(sessionId);
        } catch {
          // Silent — webhook may have already credited
        }
      }
      await fetchProSubStatus();
      refreshPackStatus();
      router.replace(
        `/subscription/success?plan=${encodeURIComponent(label)}&type=purchase&app_context=pro`,
      );
    };
    finish();
  }, [searchParams, router, refreshPackStatus]);

  useEffect(() => {
    fetchProSubStatus();
  }, []);

  // Native shell: show what the STORE will charge for the flow add-ons.
  // PHASE 1: query the REAL legacy Pro products (com.valuecharts.pro.ltd /
  // .unltd). The addon_flows_*_monthly ids belong to the future 18-product
  // catalog and exist in no store yet, so asking for them returned an empty
  // price list. Swap back once that catalog is live. Empty on iOS (no legacy
  // Pro addon product exists there) — the section then shows "unavailable".
  useEffect(() => {
    if (!native || !iapReady) return;
    const ids = legacyProAddonIds();
    if (ids.length === 0) return;
    iapPrices(ids).then(setIapStorePrices);
  }, [native, iapReady]);

  const fetchProSubStatus = async () => {
    try {
      const res = await proApi.getSubscriptionStatus();
      const data = res.data?.data || res.data;
      setProSubStatus(data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message || "Failed to load Pro plan";
      toast.error(msg);
      setProSubStatus(null);
    } finally {
      setProSubLoading(false);
    }
  };

  const handleAddonSubscribe = async (plan: "standard" | "unlimited") => {
    // Native shell → store purchase (new subscriptions only; upgrades of an
    // existing addon are hidden in the shell — the store manages changes).
    // No confirmDialog here: the store's own payment sheet IS the
    // confirmation, with the store-localized price (bug-050 satisfied).
    if (native) {
      if (!iapReady) return;
      // PHASE 1: resolve the REAL legacy Pro product id for this platform.
      // undefined => this platform has no such product (iOS today) — refuse
      // rather than call the store with an id it will never recognise.
      const productId = findLegacyProAddon(plan);
      if (!productId) {
        toast.error("This add-on isn't available on this platform yet.");
        return;
      }
      setPurchasing(plan);
      const userId = (session?.user as any)?.id as string | undefined;
      if (userId) await iapLogin(userId);
      const res = await iapPurchase(productId);
      if (res.status === "success") {
        if (ensureGranted(res, "add-on")) {
          toast.success("Purchase successful — activating your add-on…");
        }
        await waitThenRefresh(() => {
          fetchProSubStatus();
          refreshPackStatus();
        });
      } else if (res.status === "error") {
        toast.error(res.message || "Purchase failed");
      }
      setPurchasing(null);
      return;
    }

    // Confirm with the real amount BEFORE anything is billed (bug-050) —
    // the upgrade path applies a proration with no Stripe page, and the
    // no-saved-card path previously had no confirmation at all.
    const price = plan === "unlimited" ? "$20.00" : "$10.00";
    const isUpgrade =
      flowAddonPlan === "standard_100" &&
      (flowAddonStatus === "active" || flowAddonStatus === "cancelling") &&
      plan === "unlimited";
    const wasCancellingNote =
      flowAddonStatus === "cancelling"
        ? " Your pending cancellation will be removed."
        : "";
    // New subscribe → disclose card saving + auto-renew (bug-081). Upgrade
    // keeps its plain proration copy: the card is already on file and the plan
    // is already recurring, so the disclosure would be redundant.
    const content: React.ReactNode = isUpgrade ? (
      `You'll be upgraded to Unlimited Flows immediately. The prorated difference for the rest of the current period will be billed to your card${
        periodEndStr ? `, your renewal date stays ${periodEndStr},` : ""
      } and from then on you'll pay ${price}/month.${wasCancellingNote} Continue?`
    ) : (
      <>
        <p>
          You&apos;ll be charged {price}/month starting today.
          {wasCancellingNote}
        </p>
        <RecurringSaveNotice price={price} period="month" />
      </>
    );

    confirmDialog({
      title: isUpgrade ? "Confirm Upgrade" : "Confirm Subscription",
      content,
      confirmLabel: "Confirm",
      onConfirm: () => {
        // Upgrades bill the existing subscription's card — the card
        // selector is only for brand-new subscriptions.
        if (!isUpgrade && proSavedCards.length > 0) {
          setPendingAddon(plan);
          return;
        }
        _executeAddonPurchase(plan, undefined);
      },
    });
  };

  const handleAddonReactivate = () => {
    confirmDialog({
      title: "Reactivate Flow Add-on",
      content: `Your add-on will resume renewing as normal${
        periodEndStr ? ` on ${periodEndStr}` : ""
      }. Nothing is charged today.`,
      confirmLabel: "Reactivate",
      onConfirm: async () => {
        setCancelling(true);
        try {
          await proApi.reactivateFlowAddon();
          toast.success("Flow add-on reactivated — it will renew as normal");
          fetchProSubStatus();
          refreshPackStatus();
        } catch (err: any) {
          const msg =
            err?.response?.data?.error?.message || "Reactivation failed";
          toast.error(msg);
        } finally {
          setCancelling(false);
        }
      },
    });
  };

  const _executeAddonPurchase = async (
    plan: "standard" | "unlimited",
    paymentMethodId: string | undefined,
  ) => {
    setPurchasing(plan);
    try {
      const pmId =
        paymentMethodId && paymentMethodId !== "new"
          ? paymentMethodId
          : undefined;
      const res = await proApi.createFlowAddonCheckout(plan, pmId);
      const data = res.data?.data || res.data;
      // In-place upgrade (standard → unlimited) — no Stripe redirect needed
      if (data?.upgraded || data?.subscribed) {
        toast.success(data.message || "Flow add-on activated!");
        fetchProSubStatus();
        refreshPackStatus();
        setPurchasing(null);
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === "ALREADY_SUBSCRIBED") {
        toast.info("You are already on this plan.");
      } else if (code === "DOWNGRADE_NOT_ALLOWED") {
        toast.warning(
          "To downgrade, cancel your current plan first — it stays active until the period ends.",
        );
      } else {
        const msg = err?.response?.data?.error?.message || "Checkout failed";
        toast.error(msg);
      }
      setPurchasing(null);
    }
  };

  const handleAddonCancel = async () => {
    confirmDialog({
      title: "Cancel Flow Add-on?",
      content:
        "Your flow add-on will remain active until the end of the current billing period, then your limit will revert to 10 flows.",
      confirmLabel: "Cancel Subscription",
      cancelLabel: "Keep Subscription",
      danger: true,
      onConfirm: async () => {
        setCancelling(true);
        try {
          await proApi.cancelFlowAddon();
          toast.success(
            "Subscription will cancel at the end of the billing period",
          );
          fetchProSubStatus();
        } catch (err: any) {
          const msg =
            err?.response?.data?.error?.message || "Cancellation failed";
          toast.error(msg);
        } finally {
          setCancelling(false);
        }
      },
    });
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/subscription/customer-portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        toast.error(data.error?.message || "Could not open billing portal");
      }
    } catch {
      toast.error("Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  if (proSubLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    );
  }

  if (!proSubStatus) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center px-5">
        <Crown className="w-12 h-12 mx-auto text-muted-foreground" />
        <div className="mt-4 text-lg font-bold text-foreground">
          Could not load Pro plan
        </div>
        <div className="text-sm text-muted-foreground mt-1 mb-6">
          Your Pro access is active but the plan details failed to load.
        </div>
        <button
          onClick={fetchProSubStatus}
          className={`${RESET} h-10 px-5 rounded-xl bg-primary text-white font-bold text-sm font-sans hover:bg-primary-deep transition`}
        >
          Retry
        </button>
      </div>
    );
  }

  const { flows, isUnlimited } = proSubStatus;
  const flowAddon = proSubStatus.flowAddon;
  const flowAddonStatus = flowAddon?.status;
  const flowAddonPlan = flowAddon?.plan;
  const flowAddonPeriodEnd = flowAddon?.currentPeriodEnd;
  const hasActivePack =
    flowAddonStatus === "active" || flowAddonStatus === "cancelling";
  const isUnlimitedPack =
    isUnlimited ||
    (flowAddonPlan === "unlimited" && flowAddonStatus === "active");
  // "cancelling" is still upgradeable — the backend routes it through
  // upgradeFlowAddon, which also clears the pending cancel (bugs 048/049).
  const isStandardActive =
    flowAddonPlan === "standard_100" &&
    (flowAddonStatus === "active" || flowAddonStatus === "cancelling");
  const isPastDue = flowAddonStatus === "past_due";
  const usagePercent =
    isUnlimited || flows.total <= 0
      ? 0
      : Math.round((flows.used / flows.total) * 100);

  // Active pack lifecycle detail (renders only with an active flow pack).
  const activePack = packStatus?.activePackId ? packStatus : null;
  const packLabel = activePack?.isUnlimited
    ? "Unlimited Flows"
    : activePack?.packType === "fifty_flows"
      ? "50 Flows pack"
      : null;
  const expiryStr = activePack?.expiresAt
    ? new Date(activePack.expiresAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const daysLeft = activePack?.daysUntilExpiry ?? null;
  const periodEndStr = flowAddonPeriodEnd
    ? new Date(flowAddonPeriodEnd).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const stats: Array<[string, string | number]> = [
    ["PLAN", "Pro"],
    ["PRICE", `${pricing?.prices.pro_monthly.display ?? "$5"} one-time`],
    ["TOTAL FLOWS", isUnlimited ? "Unlimited" : flows.total],
    ["FLOWS USED", flows.used],
    ["REMAINING", isUnlimited ? "Unlimited" : flows.remaining],
  ];

  return (
    <div className="tw px-5 md:px-8 max-w-5xl mx-auto pt-3 md:pt-6 pb-24 max-[767px]:pb-0 space-y-4">
      <div className="flex items-center gap-2">
        <Crown className="w-5 h-5 text-primary-deep" />
        <h1 className="text-2xl font-extrabold text-foreground">Pro Plan</h1>
      </div>

      {/* Past-due warning */}
      {isPastDue && (
        <div className="rounded-2xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-destructive">
              Payment failed — update your card
            </div>
            <div className="text-xs text-[#EF4444]">
              {native
                ? "Your flow pack will be paused soon. Update your payment method in your app store's subscription settings, or on the web."
                : "Your flow pack will be paused soon."}
            </div>
          </div>
          {!native && (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className={`${RESET} h-9 px-3 rounded-xl bg-destructive text-white text-xs font-bold font-sans shrink-0`}
            >
              {portalLoading ? "…" : "Fix Now"}
            </button>
          )}
        </div>
      )}

      {/* Current Plan card */}
      <div className="rounded-2xl bg-card border border-border p-5">
        <div className="font-bold text-base text-foreground">Current Plan</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4 mt-3">
          {stats.map(([k, v]) => (
            <div key={k}>
              <div className="text-[10px] font-bold tracking-wider text-muted-foreground">
                {k}
              </div>
              <div className="text-sm font-bold mt-0.5 text-foreground">
                {v}
              </div>
            </div>
          ))}
        </div>

        {isUnlimitedPack ? (
          <div className="mt-4 rounded-xl bg-gradient-to-br from-[#FFF7ED] to-[#FEF3C7] px-4 py-3 flex items-center gap-2 font-semibold text-[#D97706]">
            <Crown className="w-5 h-5" /> Unlimited Flows Active
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {flows.used} of {flows.total} flows used
              </span>
              <span className="font-semibold text-foreground">
                {usagePercent}%
              </span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full ${usagePercent >= 80 ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            {flows.remaining > 0 && (
              <div className="text-[11px] text-muted-foreground mt-1">
                {flows.remaining} flow{flows.remaining === 1 ? "" : "s"}{" "}
                remaining
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active pack lifecycle */}
      {activePack && packLabel && (
        <div className="rounded-2xl bg-card border border-border p-5">
          <div className="font-bold text-base text-foreground mb-3">
            Monthly Pack Usage
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              ["ACTIVE PACK", packLabel],
              ["BILLING CYCLE", "30 days"],
              ["EXPIRES ON", expiryStr || "—"],
              [
                "DAYS LEFT",
                daysLeft === null
                  ? "—"
                  : daysLeft < 0
                    ? "Expired"
                    : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
              ],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="text-[10px] font-bold tracking-wider text-muted-foreground">
                  {k}
                </div>
                <div className="text-sm font-bold mt-0.5 text-foreground">
                  {v}
                </div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            Flow packs are 30-day windows with a 3-day grace period after
            expiry. Renew anytime to extend access — unused time stacks on top
            of the new pack&apos;s expiry.
          </div>
        </div>
      )}

      {/* Active flow add-on (cancel / upgrade) */}
      {(flowAddonStatus === "active" ||
        flowAddonStatus === "cancelling" ||
        flowAddonStatus === "past_due") && (
        <div className="rounded-2xl bg-card border border-border p-5 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-bold text-base text-foreground">
              Flow Add-on:{" "}
              {flowAddonPlan === "unlimited"
                ? "Unlimited Flows"
                : "Standard — 100 Flows"}
            </div>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {flowAddonStatus === "past_due" ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FEE2E2] text-destructive">
                  Payment failed
                </span>
              ) : flowAddonStatus === "cancelling" ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFF3E0] text-orange">
                  Cancels {periodEndStr ?? "at period end"}
                </span>
              ) : (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-tint text-primary-deep">
                  Active
                </span>
              )}
              {periodEndStr && flowAddonStatus === "active" && (
                <span className="text-xs text-muted-foreground">
                  Renews {periodEndStr}
                </span>
              )}
              {flowAddonStatus === "past_due" && (
                <span className="text-xs text-destructive">
                  Update your payment method within 3 days to keep your flows.
                </span>
              )}
            </div>
          </div>
          {native ? (
            // Store policy: no billing management inside the shell. A
            // store-bought add-on is cancelled/changed in Google Play /
            // App Store subscription settings; a web-bought one on the web.
            <span className="text-xs text-muted-foreground">
              Manage this subscription where you purchased it — your app store's
              subscription settings, or your account on the web.
            </span>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {isStandardActive && (
                <button
                  onClick={() => handleAddonSubscribe("unlimited")}
                  disabled={purchasing === "unlimited"}
                  className={`${RESET} h-10 px-4 rounded-xl bg-primary text-white font-bold text-sm font-sans hover:bg-primary-deep transition disabled:opacity-60`}
                >
                  {purchasing === "unlimited"
                    ? "Loading…"
                    : "Upgrade to Unlimited"}
                </button>
              )}
              {flowAddonStatus === "active" && (
                <button
                  onClick={handleAddonCancel}
                  disabled={cancelling}
                  className={`${RESET} h-10 px-4 rounded-xl bg-transparent border border-[var(--coral)] text-[var(--coral)] font-bold text-sm font-sans disabled:opacity-60`}
                >
                  {cancelling ? "…" : "Cancel Subscription"}
                </button>
              )}
              {flowAddonStatus === "cancelling" && (
                <button
                  onClick={handleAddonReactivate}
                  disabled={cancelling}
                  className={`${RESET} h-10 px-4 rounded-xl bg-transparent border-2 border-primary text-primary font-bold text-sm font-sans disabled:opacity-60`}
                >
                  {cancelling ? "…" : "Reactivate"}
                </button>
              )}
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className={`${RESET} h-10 px-4 rounded-xl bg-transparent border border-border text-foreground font-semibold text-sm font-sans inline-flex items-center gap-2 disabled:opacity-60`}
              >
                <CreditCard className="w-4 h-4" /> Manage Billing
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add More Flows (only when no active pack). In a native shell
          without IAP there is no compliant way to sell — show neutral copy
          instead (no web-payment link: that would be steering). */}
      {!hasActivePack && !isPastDue && native && !iapReady && (
        <ManagedOnWebNote text="Flow add-ons are not available in this version of the app." />
      )}
      {!hasActivePack && !isPastDue && (!native || iapReady) && (
        <div className="rounded-2xl bg-card border border-border p-5">
          <div className="font-bold text-base text-foreground mb-3">
            Add More Flows
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Standard */}
            <div className="rounded-2xl border border-border bg-background p-5 flex flex-col items-center text-center">
              <div className="font-extrabold text-lg text-foreground">
                Standard — 100 Flows
              </div>
              <div className="mt-2 text-3xl font-extrabold text-primary">
                {native
                  ? (iapStorePrices[findLegacyProAddon("standard") ?? ""]
                      ?.priceString ?? "…")
                  : "$10.00"}
                <span className="text-sm font-semibold text-muted-foreground">
                  {" "}
                  / month
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Recurring monthly subscription · cancel anytime
              </div>
              <div className="text-xs mt-3 text-foreground">
                Up to 100 flows in your Pro workspace
              </div>
              <button
                onClick={() => handleAddonSubscribe("standard")}
                disabled={!!purchasing}
                className={`${RESET} mt-5 w-full h-11 rounded-xl bg-primary text-white font-bold text-sm font-sans hover:bg-primary-deep transition disabled:opacity-60`}
              >
                {purchasing === "standard"
                  ? "Loading…"
                  : "Subscribe — Standard"}
              </button>
            </div>

            {/* Unlimited — best value */}
            <div className="rounded-2xl border-2 border-primary bg-primary-tint/40 p-5 flex flex-col items-center text-center relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-primary text-white">
                Best Value
              </span>
              <div className="font-extrabold text-lg text-foreground">
                Unlimited Flows
              </div>
              <div className="mt-2 text-3xl font-extrabold text-primary">
                {native
                  ? (iapStorePrices[findLegacyProAddon("unlimited") ?? ""]
                      ?.priceString ?? "…")
                  : "$20.00"}
                <span className="text-sm font-semibold text-muted-foreground">
                  {" "}
                  / month
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Recurring monthly subscription · cancel anytime
              </div>
              <div className="text-xs mt-3 text-foreground">
                Never worry about flow limits again
              </div>
              <button
                onClick={() => handleAddonSubscribe("unlimited")}
                disabled={!!purchasing}
                className={`${RESET} mt-4 w-full h-11 rounded-xl bg-primary text-white font-bold text-sm font-sans hover:bg-primary-deep transition disabled:opacity-60`}
              >
                {purchasing === "unlimited" ? "Loading…" : "Get Unlimited"}
              </button>
            </div>
          </div>
        </div>
      )}

      <CreditAddOns balance={totalCredits} onPurchased={refreshAiBilling} />

      {native && iapReady && (
        <RestorePurchasesButton
          onRestored={() => {
            fetchProSubStatus();
            refreshPackStatus();
            refreshAiBilling();
            refreshAppContext();
          }}
        />
      )}

      {/* Saved card selector — shown before flow addon checkout */}
      <ModalShell open={!!pendingAddon} onClose={() => setPendingAddon(null)}>
        <ModalHeader
          title="Select Payment Method"
          close={() => setPendingAddon(null)}
        />
        <div className="px-5 pb-2 space-y-2">
          {proSavedCards.map((card) => (
            <label
              key={card.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-primary"
            >
              <input
                type="radio"
                name="pro-card"
                value={card.id}
                checked={proSelectedCardId === card.id}
                onChange={() => setProSelectedCardId(card.id)}
                className="accent-primary"
              />
              <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium capitalize">
                  {card.brand}
                </span>
                <span className="text-sm text-muted-foreground ml-1">
                  •••• {card.last4}
                </span>
                {card.isDefault && (
                  <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-tint text-primary-deep">
                    Default
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {card.expMonth}/{card.expYear}
              </span>
            </label>
          ))}
          <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-primary">
            <input
              type="radio"
              name="pro-card"
              value="new"
              checked={proSelectedCardId === "new"}
              onChange={() => setProSelectedCardId("new")}
              className="accent-primary"
            />
            <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">Use a different card</span>
          </label>
        </div>
        <ModalFooter
          close={() => setPendingAddon(null)}
          primary={() => {
            if (pendingAddon) {
              const plan = pendingAddon;
              setPendingAddon(null);
              _executeAddonPurchase(plan, proSelectedCardId);
            }
          }}
          primaryLabel={
            proSelectedCardId === "new" ? "Continue to Checkout" : "Pay Now"
          }
          loading={!!purchasing}
        />
      </ModalShell>
    </div>
  );
}

/* ---------- Team seat-plan view (prototype ValueChartPlans L1565) ---------- */

function SubscriptionPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentApp, loading: proLoading } = usePro();
  const { activeOption, refresh: refreshAiBilling } = useAiBilling();
  const { refresh: refreshAppContext } = useAppContext();
  const { data: session } = useSession();
  // Native shell: purchases must go through the store (IAP_CONTRACT.md).
  const native = isNativeShell();
  const iapReady = useIapAvailable();
  const [teamStorePrices, setTeamStorePrices] = useState<
    Record<string, IapPrice>
  >({});
  const teamPlanCredits = activeOption.aiCredits?.planCredits || 0;
  const teamAddonCredits = activeOption.aiCredits?.addonCredits || 0;
  const teamTotalCredits = teamPlanCredits + teamAddonCredits;
  // UA is the authoritative app-type signal — works on mobile even when the
  // root page (which sets vc_app_param) was never visited (deep-link to /login).
  const clientAppType = getClientAppType();
  const { pricing, isTestMode } = usePricing();
  const {
    status,
    loading,
    createCheckout,
    changePlan,
    cancel,
    reactivate,
    activateNow,
    cancelScheduledChange,
    fetchCurrent,
    fetchStatus,
  } = useSubscription();
  // bug-091: Google Play / App Store owns this subscription's billing, so the
  // Stripe-backed controls below cannot act on it (the API answers 409
  // MANAGED_BY_STORE). Hide them and say where to go, instead of offering a
  // button whose only outcome is an error. Distinct from `native`, which is
  // about the CURRENT client — a store subscription is just as unmanageable
  // from a desktop browser, which is exactly how this was reported.
  const managedByStore = !!status?.managedByStore;
  const storeName = status?.storeName || "your app store";
  const [monthlyMembers, setMonthlyMembers] = useState(5);
  const [yearlyMembers, setYearlyMembers] = useState(5);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [pendingPlan, setPendingPlan] = useState<"monthly" | "yearly" | null>(
    null,
  );
  const [selectedCardId, setSelectedCardId] = useState<string | "new">("new");
  const [stripePromise, setStripePromise] =
    useState<Promise<Stripe | null> | null>(null);
  useEffect(() => {
    paymentsApi
      .listPaymentMethods()
      .then((res) => {
        const data = res.data?.data || res.data;
        const methods: SavedCard[] = data?.paymentMethods ?? [];
        setSavedCards(methods);
        const def = methods.find((c) => c.isDefault) ?? methods[0];
        if (def) setSelectedCardId(def.id);
      })
      .catch(() => {
        /* silently ignore — cards are optional */
      });
  }, []);

  // Lazily load Stripe.js once, so the embedded "add a new card" form in the
  // Select Payment Method modal can mount instantly.
  useEffect(() => {
    fetch("/api/payments/stripe-config")
      .then((r) => r.json())
      .then((d) => {
        const key = d.data?.publishableKey;
        if (d.success && key) setStripePromise(loadStripe(key));
      })
      .catch(() => {});
  }, []);

  // Handle direct-charge success redirect (?subscribed=1)
  useEffect(() => {
    if (searchParams?.get("subscribed") === "1") {
      fetchCurrent();
      fetchStatus();
      const plan = searchParams?.get("plan") ?? "Team Plan";
      router.replace(
        `/subscription/success?plan=${encodeURIComponent(plan)}&type=team&app_context=team`,
      );
    }
  }, [searchParams, router, fetchCurrent, fetchStatus]);

  // Native shell: fetch localized store prices for the PHASE-1 legacy team
  // plans (the 4 products already live in each store — see getLegacyTeamPlans).
  // Once the new 18-product catalog is live in both stores, swap this back to
  // IAP_TEAM_TIERS/teamProductId.
  useEffect(() => {
    if (!native || !iapReady) return;
    const ids = getLegacyTeamPlans().map((p) => p.productId);
    iapPrices(ids).then(setTeamStorePrices);
  }, [native, iapReady]);

  // Native shell: the shared TEAM_OPTIONS/IAP_TEAM_TIERS defaults don't match
  // real legacy store products (e.g. Android's monthly floor is 10 seats, and
  // it has zero yearly products today) — snap each picker to the first real
  // option for this platform once it's known, so the dropdown never opens on
  // an invalid/unpurchasable seat count.
  useEffect(() => {
    if (!native || !iapReady) return;
    const monthlyPlans = legacyTeamPlansForPeriod("monthly");
    const yearlyPlans = legacyTeamPlansForPeriod("yearly");
    if (
      monthlyPlans.length &&
      !monthlyPlans.some((p) => p.seats === monthlyMembers)
    ) {
      setMonthlyMembers(monthlyPlans[0].seats);
    }
    if (
      yearlyPlans.length &&
      !yearlyPlans.some((p) => p.seats === yearlyMembers)
    ) {
      setYearlyMembers(yearlyPlans[0].seats);
    }
    // yearlyPlans.length === 0 (Android today): leave yearlyMembers as-is —
    // there's no valid option to snap to; the Select renders empty/disabled
    // and the purchase button disables itself (see renderPlanCard).
  }, [native, iapReady]);

  // Re-fetch subscription status when the user returns from an external
  // browser (e.g. after completing Stripe payment in Chrome on mobile).
  // The Flutter shell dispatches this event only when the WebView URL
  // contains /dashboard/subscription, so it never fires on other pages.
  useEffect(() => {
    const handler = () => {
      fetchCurrent();
      fetchStatus();
    };
    window.addEventListener("payment-return", handler);
    return () => window.removeEventListener("payment-return", handler);
  }, [fetchCurrent, fetchStatus]);

  const openCustomerPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/subscription/customer-portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        toast.error(data.error?.message || "Could not open billing portal");
      }
    } catch {
      toast.error("Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  // If user has saved cards and is starting a new subscription, show card
  // selector first. For plan changes (already subscribed), confirm first —
  // the off-session fallback charges the saved card immediately, so the
  // user must see what happens (prorated charge, unchanged renewal date)
  // BEFORE any money moves (bug-043).
  // PHASE 1 TESTING: buys one of the 4 legacy team products already live in
  // the store (getLegacyTeamPlans is platform-aware — iOS vs Android). New
  // subscriptions only; an existing sub is managed where it was bought (its
  // controls are hidden in the shell). The store's own payment sheet is the
  // price confirmation. Swap back to handlePurchase's IAP branch once the
  // new 18-product catalog is live in both stores.
  const handleLegacyPurchase = async (productId: string) => {
    if (!iapReady) return;
    // Fail fast on a known-offline device — avoids ever starting a purchase
    // that has no chance of completing, and its accompanying stuck spinner.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      toast.error(
        "No internet connection — please check your connection and try again.",
      );
      return;
    }
    setCheckoutLoading(productId);
    try {
      const userId = (session?.user as any)?.id as string | undefined;
      if (userId) await iapLogin(userId);
      const res = await iapPurchase(productId);
      if (res.status === "success") {
        // Refresh either way: on a refused grant the store's server-to-server
        // notification may still land moments later, and then the page catches
        // up on its own — but say so honestly meanwhile.
        if (!ensureGranted(res, "plan")) {
          await waitThenRefresh(() => {
            fetchCurrent();
            fetchStatus();
          });
          refreshAppContext();
          return;
        }
        toast.success("Purchase successful — activating your plan…");
        await waitThenRefresh(() => {
          fetchCurrent();
          fetchStatus();
        });
        // fetchCurrent/fetchStatus only update this page's local state —
        // the sidebar/chat read plan from AppContext, which otherwise only
        // re-syncs on next mount or JWT refresh. Force it now.
        refreshAppContext();
      } else if (res.status === "error") {
        toast.error(res.message || "Purchase failed");
      }
      // "cancelled" is intentionally silent — the user backed out on purpose.
    } catch (err: unknown) {
      // Covers a bridge timeout/rejection or any other thrown error — without
      // this, the button would stay stuck on "Loading…" forever.
      const isOffline =
        typeof navigator !== "undefined" && navigator.onLine === false;
      toast.error(
        isOffline
          ? "No internet connection — please check your connection and try again."
          : "Something went wrong — please try again.",
      );
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePurchase = async (plan: "monthly" | "yearly") => {
    // Native purchases are routed through handleLegacyPurchase directly by
    // renderPlanCard's button (real legacy productId, resolved via
    // findLegacyTeamPlan) — this function only handles the web/Stripe flow.

    // "cancelling" counts as an existing sub — it must go through the
    // plan-change flow (which reactivates), NOT new-subscription checkout
    // (which would create a duplicate Stripe subscription). See bug-046.
    const isNewSub = !(
      status?.hasSubscription &&
      (status.status === "active" || status.status === "cancelling")
    );
    if (isNewSub) {
      // Disclose recurring billing + card saving BEFORE payment (bug-081,
      // info + acknowledge). On Continue, route to payment:
      //   - NO saved card → Stripe hosted Checkout (plan summary, amount,
      //     wallets, 3DS/SCA, tax, receipt). _executePurchase with no pmId →
      //     createCheckout returns a hosted-checkout URL and redirects
      //     (subscription.service.js Branch B).
      //   - HAS saved card → in-page card selector ("Pay Now" direct charge).
      const seats = plan === "monthly" ? monthlyMembers : yearlyMembers;
      const perSeat =
        plan === "yearly"
          ? (pricing?.prices?.team_yearly?.usdCents ?? 2000) / 100
          : (pricing?.prices?.team_monthly?.usdCents ?? 200) / 100;
      const total = (seats * perSeat).toFixed(2);
      const period = plan === "yearly" ? "year" : "month";
      confirmDialog({
        title: "Confirm Subscription",
        content: (
          <>
            <p>
              You&apos;ll be charged ${total}/{period} for {seats} member
              {seats === 1 ? "" : "s"}, starting today.
            </p>
            <RecurringSaveNotice price={`$${total}`} period={period} />
          </>
        ),
        confirmLabel: "Continue",
        onConfirm: () => {
          if (savedCards.length === 0) {
            _executePurchase(plan);
          } else {
            setPendingPlan(plan);
          }
        },
      });
      return;
    }
    if (!isNewSub) {
      const newSeats = plan === "monthly" ? monthlyMembers : yearlyMembers;
      const currentSeats = status?.teamMemberLimit ?? 0;
      const perSeat =
        plan === "yearly"
          ? (pricing?.prices?.team_yearly?.usdCents ?? 2000) / 100
          : (pricing?.prices?.team_monthly?.usdCents ?? 200) / 100;
      const newTotal = (newSeats * perSeat).toFixed(2);
      const per = plan === "yearly" ? "year" : "month";
      const renewsAt = status?.currentPeriodEnd
        ? new Date(status.currentPeriodEnd).toLocaleDateString()
        : "your current renewal date";

      let content: string;
      if (status?.plan === "monthly" && plan === "yearly") {
        content = `Your plan will switch to Yearly (${newSeats} members, $${newTotal}/${per}) at the end of the current billing period (${renewsAt}). Nothing is charged today.`;
      } else if (newSeats > currentSeats) {
        content = `Your saved card will be charged a prorated amount now for the ${newSeats - currentSeats} additional member(s) until ${renewsAt}. Your renewal date stays ${renewsAt}, and from then on you'll pay $${newTotal}/${per}. Continue?`;
      } else if (newSeats < currentSeats) {
        content = `No charge today — a prorated credit will be applied to your next invoice. Your renewal date stays ${renewsAt}, and from then on you'll pay $${newTotal}/${per}. Continue?`;
      } else {
        content = `Update your plan to ${newSeats} members at $${newTotal}/${per}? Your renewal date stays ${renewsAt}.`;
      }

      confirmDialog({
        title: "Confirm Plan Change",
        content,
        confirmLabel: "Confirm",
        onConfirm: () => _executePurchase(plan),
      });
      return;
    }
    await _executePurchase(plan);
  };

  const _executePurchase = async (
    plan: "monthly" | "yearly",
    overridePmId?: string,
  ) => {
    const teamMembers = plan === "monthly" ? monthlyMembers : yearlyMembers;
    setCheckoutLoading(plan);
    try {
      if (
        status?.hasSubscription &&
        (status.status === "active" || status.status === "cancelling")
      ) {
        await changePlan(plan, teamMembers);
      } else {
        // Pass the saved (or freshly-added) card ID so the backend charges it
        // directly (no hosted-checkout redirect).
        const pmId =
          overridePmId ??
          (selectedCardId !== "new" ? selectedCardId : undefined);
        await createCheckout(plan, teamMembers, pmId);
      }
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleCancel = () => {
    confirmDialog({
      title: "Cancel Subscription",
      content:
        "Your subscription will remain active until the end of the current billing period. Are you sure?",
      confirmLabel: "Yes, Cancel",
      danger: true,
      onConfirm: () => cancel(),
    });
  };

  const handleReactivate = () => {
    const renewsAt = status?.currentPeriodEnd
      ? new Date(status.currentPeriodEnd).toLocaleDateString()
      : null;
    confirmDialog({
      title: "Reactivate Plan",
      content: `Your plan will resume renewing as normal${renewsAt ? ` on ${renewsAt}` : ""}. Nothing is charged today.`,
      confirmLabel: "Reactivate",
      onConfirm: () => reactivate(),
    });
  };

  const handleActivateNow = () => {
    confirmDialog({
      title: "Activate Plan Change Now",
      content:
        "This will cancel your current monthly subscription and redirect you to checkout for the yearly plan. Continue?",
      confirmLabel: "Yes, Activate Now",
      onConfirm: () => activateNow(),
    });
  };

  const handleCancelScheduled = () => {
    confirmDialog({
      title: "Cancel Scheduled Change",
      content:
        "This will cancel your scheduled plan change. Your current plan will remain unchanged.",
      confirmLabel: "Yes, Cancel Change",
      danger: true,
      onConfirm: () => cancelScheduledChange(),
    });
  };

  // Hold the spinner until usePro has resolved — prevents a flash of
  // Team plan UI for Pro users while currentApp is still "free" (default).
  if (proLoading || loading) {
    return (
      <div className="flex justify-center py-24">
        <Spin size="large" />
      </div>
    );
  }

  // Pro app: show Pro flow-pack content instead of Team plans.
  // clientAppType reads the native UA directly ("team" = ValueChartsMobile/Team-App).
  // This is used instead of currentApp/forcedMode because:
  //   1. currentApp is DB-stored (user.currentVersion) and can be "pro" even when
  //      the user is inside the Team shell.
  //   2. forcedMode relies on vc_app_param (sessionStorage), which is only set by
  //      app/page.tsx — never reached when mobile opens directly to /login.
  if (currentApp === "pro" && clientAppType !== "team") {
    return <ProSubscriptionContent />;
  }

  // A "cancelling" subscription is still live (usable until period end) and
  // still upgradeable via changePlan — treating it as "no subscription" sent
  // cancelling users into the NEW-subscription flow (card selector +
  // createCheckout), which would create a second Stripe subscription on top
  // of the still-running one (bug-046).
  const hasLiveSub = !!(
    status?.hasSubscription &&
    (status.status === "active" || status.status === "cancelling")
  );

  const isActivePlan = (plan: "monthly" | "yearly") =>
    hasLiveSub && status?.plan === plan;

  const isMemberCountChange = (plan: "monthly" | "yearly") => {
    if (!isActivePlan(plan)) return false;
    const desired = plan === "monthly" ? monthlyMembers : yearlyMembers;
    const current = status?.teamMemberLimit ?? 0;
    return desired !== current;
  };

  const isDowngradeBlocked = (plan: "monthly" | "yearly") =>
    hasLiveSub && status?.plan === "yearly" && plan === "monthly";

  const isScheduledFor = (plan: "monthly" | "yearly") =>
    !!status?.scheduledChange && status.scheduledChange.plan === plan;

  const getButtonLabel = (plan: "monthly" | "yearly") => {
    if (!hasLiveSub) return "Purchase Now";
    if (isDowngradeBlocked(plan)) return "Not Available";
    if (isScheduledFor(plan)) return "Scheduled";
    if (isActivePlan(plan)) {
      const desired = plan === "monthly" ? monthlyMembers : yearlyMembers;
      const current = status?.teamMemberLimit ?? 0;
      if (desired > current) return "Add Members";
      if (desired < current) return "Reduce Members";
      return "Current Plan";
    }
    return "Change Plan";
  };

  const symbol = pricing?.symbol || "$";
  const fmtMoney = (n: number) => {
    const rounded =
      pricing?.currency === "JPY"
        ? Math.round(n).toString()
        : Number.isInteger(n)
          ? n.toFixed(0)
          : n.toFixed(2);
    return `${symbol}${rounded}`;
  };

  const renderPlanCard = (plan: "monthly" | "yearly") => {
    const members = plan === "monthly" ? monthlyMembers : yearlyMembers;
    const setMembers =
      plan === "monthly" ? setMonthlyMembers : setYearlyMembers;
    const priceInfo =
      plan === "monthly"
        ? pricing?.prices.team_monthly
        : pricing?.prices.team_yearly;
    const perUserAmount = priceInfo?.amount ?? 0;
    const currentPrice = members * perUserAmount;
    // Native shell: the store's localized price for the fixed-tier product
    // is the truth — per-seat Stripe math doesn't apply to store products.
    // legacyPlan resolves the real store productId for the selected seats —
    // teamStorePrices is keyed by that real id (see the price-fetch effect).
    const legacyPlan = native ? findLegacyTeamPlan(members, plan) : undefined;
    const storePriceString = legacyPlan
      ? teamStorePrices[legacyPlan.productId]?.priceString
      : undefined;
    const priceLabel = native
      ? `${storePriceString ?? "…"}/${plan === "monthly" ? "month" : "year"}`
      : plan === "monthly"
        ? `${fmtMoney(currentPrice)}/month`
        : `${fmtMoney(currentPrice)}/year`;
    const isCurrent = isActivePlan(plan);
    const isYearly = plan === "yearly";
    const buttonLabel = getButtonLabel(plan);
    // Native: only seat counts with a real store product for this platform +
    // period are selectable (see legacyTeamPlansForPeriod in iapBridge.ts).
    const nativeSeatOptions = native ? legacyTeamPlansForPeriod(plan) : [];
    const buttonDisabled =
      (isCurrent && !isMemberCountChange(plan)) ||
      !!isDowngradeBlocked(plan) ||
      isScheduledFor(plan) ||
      checkoutLoading !== null ||
      (native && !legacyPlan) ||
      // bug-091: a store-owned plan cannot be changed from here at all.
      managedByStore;

    return (
      <div
        className={`rounded-3xl bg-card overflow-hidden flex flex-col ${
          isCurrent
            ? "border-2 border-primary shadow-card"
            : "border border-border"
        }`}
      >
        {/* Header */}
        <div
          className={`p-5 relative ${isYearly ? "bg-[#0F1115] text-white" : "bg-secondary/60"}`}
        >
          <div className="flex items-center gap-2 font-extrabold text-lg">
            <Crown
              className={`w-5 h-5 ${isYearly ? "text-[#FFD27A]" : "text-primary-deep"}`}
            />
            <span className={isYearly ? "text-white" : "text-foreground"}>
              {isYearly ? "Yearly Plan" : "Monthly Plan"}
            </span>
          </div>
          <div
            className={`mt-1.5 text-xs inline-flex items-center gap-1 ${isYearly ? "text-white/70" : "text-muted-foreground"}`}
          >
            <Zap className="w-3.5 h-3.5" />
            {native
              ? `Up to ${Math.max(...nativeSeatOptions.map((p) => p.seats), 0)} Users`
              : "Up to 100 Users"}
          </div>
          {isYearly && (
            <span className="absolute right-4 top-4 text-[10px] font-extrabold uppercase px-2 py-1 rounded-full bg-primary text-white">
              Save 17%
            </span>
          )}
        </div>

        {isCurrent && (
          <div className="px-5 -mt-3 flex justify-center relative z-[1]">
            <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-primary text-white">
              Current Plan
            </span>
          </div>
        )}

        {/* Pricing + members */}
        <div className="p-5 flex-1 flex flex-col">
          <div className="text-xs font-semibold text-muted-foreground mb-1.5">
            Team Members
          </div>
          <Select
            value={members}
            onChange={setMembers}
            style={{ width: "100%" }}
            size="large"
            disabled={native && nativeSeatOptions.length === 0}
            // Native: only real store products for this platform + period
            // (see nativeSeatOptions above). Web keeps the full TEAM_OPTIONS
            // range, purchased via Stripe.
            options={(native
              ? nativeSeatOptions.map((p) => p.seats)
              : TEAM_OPTIONS
            ).map((n) => ({
              label: `${n} Members`,
              value: n,
            }))}
          />

          <div className="mt-4 text-3xl font-extrabold text-foreground">
            {priceLabel}
          </div>
          {!native && (
            <div className="text-[11px] text-muted-foreground mt-1">
              {plan === "monthly"
                ? `${members} seats × ${fmtMoney(perUserAmount)}/user/month`
                : `${members} seats × ${fmtMoney(perUserAmount)}/user/year`}
            </div>
          )}
          <div className="text-[11px] text-muted-foreground">
            {plan === "monthly"
              ? `${members * 40} AI credits/month included`
              : `${members * 500} AI credits/year included (~${Math.round((members * 500) / 12)}/month)`}
          </div>
          {pricing && pricing.currency !== "USD" && (
            <div className="text-[10px] text-muted-foreground mt-1">
              Prices shown in USD. Charged in USD at checkout — your bank
              converts automatically.
            </div>
          )}

          <ul className="mt-4 space-y-2">
            {FEATURES.map((f) => (
              <li
                key={f}
                className="text-xs flex items-center gap-2 text-foreground"
              >
                <span className="w-4 h-4 rounded-full bg-primary text-white inline-flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3" />
                </span>
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => {
              if (native) {
                if (legacyPlan) handleLegacyPurchase(legacyPlan.productId);
                return;
              }
              handlePurchase(plan);
            }}
            disabled={buttonDisabled}
            className={`${RESET} mt-5 h-11 rounded-xl font-bold text-sm font-sans transition disabled:cursor-not-allowed ${
              isCurrent && !isMemberCountChange(plan)
                ? "bg-secondary text-muted-foreground"
                : "bg-primary text-white hover:bg-primary-deep disabled:opacity-60"
            }`}
          >
            {(
              native
                ? checkoutLoading === legacyPlan?.productId
                : checkoutLoading === plan
            )
              ? "Loading…"
              : buttonLabel}
          </button>
          {!native &&
            !managedByStore &&
            isCurrent &&
            status?.status === "active" &&
            !status?.cancelAtPeriodEnd && (
              <button
                onClick={handleCancel}
                className={`${RESET} mt-2 h-10 rounded-xl bg-transparent text-[var(--coral)] font-bold text-sm font-sans`}
              >
                Cancel Subscription
              </button>
            )}
          {managedByStore && isCurrent && (
            <div className="mt-2 text-xs text-muted-foreground text-center">
              Managed by {storeName}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="tw px-4 md:px-8 max-w-5xl mx-auto pt-6 pb-24 space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">
          Plan &amp; Pricing
        </h1>
        <div className="text-sm text-muted-foreground mt-0.5">
          Manage your team subscription and billing
        </div>
      </div>

      {isTestMode && (
        <div className="rounded-2xl border border-[#FFE7A8] bg-[#FFF8E1] px-4 py-2.5 text-[12px] font-semibold text-[#8A6A00] inline-flex items-center gap-2">
          🧪 Test Mode — Prices shown in USD
        </div>
      )}

      {/* Past-due banner */}
      {status?.hasSubscription && status.status === "past_due" && (
        <div className="rounded-2xl bg-[#FFF2F0] border border-[#FFCCC7] p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold text-[#CF1322] text-[15px]">
              Payment Failed
            </div>
            <div className="text-[13px] text-muted-foreground mt-1 mb-3">
              {native
                ? "Your last payment failed. Update your payment method in your app store's subscription settings (or on the web if you subscribed there) to keep your subscription active."
                : "Your last payment failed. Please update your payment method to keep your subscription active. If not resolved, your account will be downgraded to the free plan."}
            </div>
            <div className="flex gap-2 flex-wrap">
              {!native && (
                <button
                  onClick={openCustomerPortal}
                  disabled={portalLoading}
                  className={`${RESET} h-9 px-3 rounded-lg bg-destructive text-white text-[13px] font-bold font-sans disabled:opacity-60`}
                >
                  {portalLoading ? "…" : "Update Payment Method"}
                </button>
              )}
              <button
                onClick={() => window.location.reload()}
                className={`${RESET} h-9 px-3 rounded-lg bg-card border border-border text-foreground text-[13px] font-semibold font-sans`}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active subscription hero (prototype gradient). Also rendered for
          "cancelling" — the plan is still live until period end, and this is
          where the Reactivate action lives (bug-045). */}
      {status?.hasSubscription &&
        (status.status === "active" || status.status === "cancelling") && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-deep to-primary p-5 text-white">
            <div className="text-xs font-bold tracking-wider uppercase text-white/80">
              Your current plan
            </div>
            <div className="text-2xl md:text-3xl font-extrabold mt-1">
              {status.plan === "yearly" ? "Yearly" : "Monthly"} Plan —{" "}
              {status.teamMemberLimit} Members
            </div>
            {status.currentPeriodEnd && (
              <div className="text-xs text-white/80 mt-1">
                {status.cancelAtPeriodEnd ? "Cancels" : "Renews"} on{" "}
                {new Date(status.currentPeriodEnd).toLocaleDateString()}
              </div>
            )}
            {status.cancelAtPeriodEnd && !native && !managedByStore && (
              <button
                onClick={handleReactivate}
                className={`${RESET} mt-3 h-9 px-4 rounded-lg bg-white text-primary-deep text-[13px] font-bold font-sans`}
              >
                Reactivate Plan
              </button>
            )}
            {/* bug-091: name the actual store when we know it. `native` is
                about this client; `managedByStore` is about who owns the
                billing — a Play subscription is equally unmanageable from a
                desktop browser, which is how this was reported. */}
            {managedByStore ? (
              <div className="text-xs text-white/80 mt-3">
                This plan is managed by {storeName}. To change your seats,
                cancel, or update payment, open your subscription settings in{" "}
                {storeName}.
              </div>
            ) : (
              native && (
                <div className="text-xs text-white/80 mt-3">
                  Manage this plan where you purchased it — your app store's
                  subscription settings, or your account on the web.
                </div>
              )
            )}
            <span className="absolute right-4 top-4 text-[11px] font-bold px-3 py-1 rounded-full bg-white text-primary-deep">
              {status.cancelAtPeriodEnd ? "Cancelling" : "Active"}
            </span>
          </div>
        )}

      {/* Scheduled change banner */}
      {status?.scheduledChange && (
        <div className="rounded-3xl bg-[#0F1115] p-5 text-white flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm text-white/85">Scheduled Plan Change</div>
            <div className="text-lg font-bold text-[#FFD700]">
              Yearly Plan — {status.scheduledChange.teamMembers} Members
            </div>
            {status.scheduledChange.activationDate && (
              <div className="text-xs text-white/70 mt-0.5">
                Activates on{" "}
                {new Date(
                  status.scheduledChange.activationDate,
                ).toLocaleDateString()}
              </div>
            )}
          </div>
          {!native && (
            <div className="flex gap-2 flex-wrap">
              {/* bug-091: "Activate Now" bills through Stripe, so it 409s on a
                  store-owned plan. Cancelling the schedule is DB-only and
                  still works, so that button stays. */}
              {!managedByStore && (
                <button
                  onClick={handleActivateNow}
                  className={`${RESET} h-10 px-4 rounded-full bg-primary text-white font-semibold text-sm font-sans hover:bg-primary-deep transition`}
                >
                  Activate Now
                </button>
              )}
              <button
                onClick={handleCancelScheduled}
                className={`${RESET} h-10 px-4 rounded-full bg-transparent border border-[var(--coral)] text-[var(--coral)] font-semibold text-sm font-sans`}
              >
                Cancel Change
              </button>
            </div>
          )}
        </div>
      )}

      {/* Plan cards. Native shell rules (IAP_CONTRACT.md):
          - IAP unavailable → no purchase UI at all (store policy);
          - live subscription → managed where it was bought, no change UI;
          - otherwise → new-subscription purchase through the store, using the
            SAME Monthly/Yearly card design as web. renderPlanCard's Team
            Members dropdown is filtered to real legacy products per
            platform+period (see legacyTeamPlansForPeriod/findLegacyTeamPlan
            in iapBridge.ts), and its Purchase button routes native taps
            through handleLegacyPurchase with the resolved real productId.
            Swap the dropdown's option source back to the full 18-product
            catalog (IAP_TEAM_TIERS) once it's live in both stores. */}
      {native && !iapReady ? (
        <ManagedOnWebNote text="Team plans are not available for purchase in this version of the app." />
      ) : native && hasLiveSub ? (
        <ManagedOnWebNote text="Your team plan is active. Seat changes, plan changes and cancellation are managed where you purchased it — your app store's subscription settings, or your account on the web." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {renderPlanCard("monthly")}
          {renderPlanCard("yearly")}
        </div>
      )}

      {/* Manage billing */}
      {/* {status?.hasSubscription &&
        (status.status === "active" || status.status === "past_due") && (
          <div className="flex justify-center pt-2">
            <button
              onClick={openCustomerPortal}
              disabled={portalLoading}
              className={`${RESET} h-10 px-4 rounded-xl border border-border bg-card text-sm font-semibold font-sans inline-flex items-center gap-2 text-foreground disabled:opacity-60`}
            >
              <FileText className="w-4 h-4" />{" "}
              {portalLoading ? "…" : "Manage Billing & Invoices"}
            </button>
          </div>
        )} */}

      {/* AI credit add-ons (team owners top up the shared pool) */}
      <CreditAddOns balance={teamTotalCredits} onPurchased={refreshAiBilling} />

      {native && iapReady && (
        <RestorePurchasesButton
          onRestored={() => {
            fetchCurrent();
            fetchStatus();
            refreshAiBilling();
            refreshAppContext();
          }}
        />
      )}

      {/* Saved card selector modal — shown before new subscription checkout */}
      <ModalShell open={!!pendingPlan} onClose={() => setPendingPlan(null)}>
        <ModalHeader
          title="Select Payment Method"
          close={() => setPendingPlan(null)}
        />
        <div className="px-5 pb-2 space-y-2">
          {savedCards.map((card) => (
            <label
              key={card.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-primary"
            >
              <input
                type="radio"
                name="card"
                value={card.id}
                checked={selectedCardId === card.id}
                onChange={() => setSelectedCardId(card.id)}
                className="accent-primary"
              />
              <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium capitalize">
                  {card.brand}
                </span>
                <span className="text-sm text-muted-foreground ml-1">
                  •••• {card.last4}
                </span>
                {card.isDefault && (
                  <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-tint text-primary-deep">
                    Default
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {card.expMonth}/{card.expYear}
              </span>
            </label>
          ))}
          {savedCards.length > 0 && (
            <label className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 cursor-pointer hover:border-primary">
              <input
                type="radio"
                name="card"
                value="new"
                checked={selectedCardId === "new"}
                onChange={() => setSelectedCardId("new")}
                className="accent-primary"
              />
              <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">Use a different card</span>
            </label>
          )}

          {selectedCardId === "new" && stripePromise && (
            <div
              className={
                savedCards.length > 0
                  ? "rounded-xl border border-border bg-card p-3"
                  : undefined
              }
            >
              <Elements stripe={stripePromise}>
                <AddCardForm
                  onSuccess={(paymentMethodId) => {
                    setSelectedCardId(paymentMethodId);
                    const plan = pendingPlan;
                    setPendingPlan(null);
                    if (plan) _executePurchase(plan, paymentMethodId);
                  }}
                  onCancel={() => setPendingPlan(null)}
                />
              </Elements>
            </div>
          )}
        </div>
        {selectedCardId !== "new" && (
          <ModalFooter
            close={() => setPendingPlan(null)}
            primary={() => {
              if (pendingPlan) {
                setPendingPlan(null);
                _executePurchase(pendingPlan);
              }
            }}
            primaryLabel="Pay Now"
            loading={!!checkoutLoading}
          />
        )}
      </ModalShell>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense>
      <SubscriptionPageInner />
    </Suspense>
  );
}
