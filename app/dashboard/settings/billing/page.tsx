"use client";

import React, { useState, useEffect, ReactNode } from "react";
import { Spin } from "antd";
import { toast } from "sonner";
import {
  ArrowLeft,
  Crown,
  FileText,
  ChevronDown,
  Zap,
  Building2,
  CreditCard,
} from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { confirmDialog } from "@/components/common/ConfirmDialog";
import { paymentsApi } from "@/api/payments.api";
import { usePro } from "@/hooks/usePro";
import { useRouter } from "next/navigation";
import { getClientAppType } from "@/lib/detectWebView";
import api from "@/lib/axios";

// Buttons inherit a UA-grey background unless they set their own bg (the
// "preflight-off button trap" — see Settings page). RESET strips native
// chrome; every button below sets its own bg/border explicitly.
const RESET = "appearance-none cursor-pointer outline-none border-0";

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-center">
      <span className="text-muted-foreground text-sm w-24 shrink-0">{k} :</span>
      <span className="min-w-0">{v}</span>
    </div>
  );
}

// Status-aware transaction badge — never assume "Paid" (a refunded or failed
// charge would otherwise render green).
function getTransactionBadge(status?: string) {
  const base = "text-[10px] font-bold px-1.5 rounded";
  switch (status?.toLowerCase()) {
    case "refunded":
    case "partially_refunded":
      return (
        <span className={`${base} bg-[#FFF3E0] text-orange`}>Refunded</span>
      );
    case "failed":
      return (
        <span className={`${base} bg-[#FEE2E2] text-destructive`}>Failed</span>
      );
    case "pending":
      return (
        <span className={`${base} bg-[#E6F4FF] text-[#1677FF]`}>Pending</span>
      );
    case "credit":
      return (
        <span className={`${base} bg-[#E6F4FF] text-[#1677FF]`}>Credit</span>
      );
    default:
      return (
        <span className={`${base} bg-primary-tint text-primary-deep`}>
          Paid
        </span>
      );
  }
}

export default function BillingPage() {
  const router = useRouter();
  const { subscription, status, loading, cancel, reactivate } =
    useSubscription();
  const { currentApp, loading: proLoading, status: proStatus } = usePro();
  // UA is the authoritative shell signal — works on mobile even when the root
  // page (which sets vc_app_param) was never visited (deep-link to /login).
  // currentApp is DB-stored (user.currentVersion) and can be "pro" even when
  // the user is inside the Team native shell.
  const clientAppType = getClientAppType();
  const isProApp =
    !proLoading && currentApp === "pro" && clientAppType !== "team";

  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [txOpen, setTxOpen] = useState(true);
  const [subOpen, setSubOpen] = useState(true);
  const [packOpen, setPackOpen] = useState(true);
  // Re-fetch whenever the user toggles between Pro and Team apps so each
  // billing surface stays scoped to its own purchases. Wait until usePro
  // has resolved — otherwise we'd default to "enterprise" while currentApp
  // is still loading and never refresh once it becomes "pro".
  useEffect(() => {
    if (proLoading) return;
    setTxLoading(true);
    const appType = isProApp ? "individual" : "enterprise";
    paymentsApi
      .getTransactions({ appType })
      .then((res) => {
        const data = res.data?.data?.transactions || res.data?.data || res.data;
        setTransactions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setTransactions([]);
      })
      .finally(() => setTxLoading(false));
  }, [proLoading, isProApp]);

  // Subscription history exists for both apps — AI-addon purchases write a
  // SubscriptionHistory row tagged with the real appContext (including
  // "pro"), not just Team plan activations. Fetch it in both contexts.
  useEffect(() => {
    if (proLoading) return;
    setHistoryLoading(true);
    // Use axios (not fetch) so the interceptor adds X-App-Context: pro|team.
    // The backend's getHistory() falls back to user.currentVersion when no
    // header is present — which can be "pro" — and returns the wrong history.
    api
      .get("/subscription/history")
      .then((res) => {
        const data = res.data?.data?.history || res.data?.data || [];
        setHistory(Array.isArray(data) ? data : []);
      })
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [proLoading, isProApp]);

  // Wait for usePro too — otherwise the Team subscription card flashes
  // inside the Pro app before currentApp resolves.
  if (loading || proLoading)
    return (
      <div className="text-center py-24">
        <Spin size="large" />
      </div>
    );

  // ── Derived values ──
  // A Subscription row is never deleted on cancel/expiry — only its status
  // changes — so "row exists" alone can't mean "plan is usable". Only
  // active/cancelling (still usable until period end) count; expired/
  // cancelled/pending must fall back to Free Plan, same as no row at all.
  const isTeamSubUsable =
    !!subscription && ["active", "cancelling"].includes(subscription.status);
  const planName = isProApp
    ? proStatus?.hasPro
      ? "ValueChart Pro"
      : "Free Plan"
    : isTeamSubUsable
      ? subscription?.plan?.name || "Free Plan"
      : "Free Plan";

  const planPriceNum =
    !isProApp && isTeamSubUsable
      ? Number(subscription?.price ?? subscription?.plan?.price ?? 0)
      : null;
  const planPrice =
    planPriceNum && planPriceNum > 0 ? `$${planPriceNum.toFixed(2)}` : null;

  // Yearly plans bill the full annual amount upfront — show "/year" (not
  // "/mo") plus a "billed annually" breakdown so the price isn't misread as
  // a monthly charge.
  const isYearly = !isProApp && status?.plan === "yearly";
  const monthlyEquivalent = isYearly && planPriceNum ? planPriceNum / 12 : null;

  const isActive = isProApp
    ? !!proStatus?.hasPro
    : subscription?.status === "active";
  const statusLabel = isProApp
    ? isActive
      ? "active"
      : "inactive"
    : subscription?.status || (isActive ? "active" : "inactive");

  const renewsAt = isProApp
    ? (proStatus as any)?.flowAddonCurrentPeriodEnd
      ? new Date((proStatus as any).flowAddonCurrentPeriodEnd).toLocaleString(
          undefined,
          {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          },
        )
      : null
    : isTeamSubUsable &&
        (subscription?.expiresAt || subscription?.currentPeriodEnd)
      ? new Date(
          subscription.expiresAt || subscription.currentPeriodEnd,
        ).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  const startedAt = !isProApp
    ? subscription?.startedAt || subscription?.createdAt
      ? new Date(
          subscription.startedAt || subscription.createdAt,
        ).toLocaleDateString()
      : null
    : proStatus?.proPurchasedAt
      ? new Date(proStatus.proPurchasedAt).toLocaleDateString()
      : null;

  const flowAddonStatus =
    proStatus?.isUnlimited ||
    (proStatus?.proFlows?.max && proStatus.proFlows.max > 10)
      ? "active"
      : "inactive";
  const flowAddonPlan = proStatus?.isUnlimited ? "unlimited" : "100";

  // Map raw transactions to display objects
  const mappedTransactions = transactions.map((r: any) => {
    const date = r.createdAt
      ? new Date(r.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";
    const type = r.purchaseType || r.appType || "";
    const plan = r.planName || "";
    let description = "Subscription Payment";
    if (type === "ai_addon_credits") description = "AI Credits Add-on";
    else if (type === "pro_upgrade")
      description = `Pro Plan${plan ? ` — ${plan}` : ""}`;
    else if (type === "pro_extra_flows") description = "Pro — Extra Flows";
    else if (type === "flow_addon") description = "Pro — Flow Add-on";
    else if (type === "team_subscription" || type === "enterprise")
      description = `Team Plan${plan ? ` — ${plan}` : ""}`;
    // Seat reductions charge nothing — Stripe applies a prorated credit at
    // the next invoice. Label them as such instead of "Team Plan $0.00".
    if (r.status === "credit") {
      description = "Seat Reduction — prorated credit on next invoice";
    }
    const raw = r.amountCharged ?? r.amount_charged ?? r.amount ?? null;
    const currency = (r.currency || "usd").toUpperCase();
    const amount =
      r.status === "credit"
        ? `${currency} —`
        : raw === null || raw === undefined || Number.isNaN(Number(raw))
          ? `${currency} —`
          : `${currency} $${(Number(raw) / 100).toFixed(2)}`;
    return {
      id: r.id || r.createdAt,
      date,
      description,
      amount,
      status: r.status,
    };
  });

  // Map subscription history rows for display
  const mappedHistory = history.map((r: any) => {
    const currency = (r.currency || "USD").toUpperCase();
    const price = `${currency} $${Number(r.price || 0).toFixed(2)}/mo`;
    const planLabel = r.planName ? `${r.planName} — ${price}` : price;
    const startDate = r.startedAt
      ? new Date(r.startedAt).toLocaleDateString()
      : "—";
    const endDate = r.expiresAt
      ? new Date(r.expiresAt).toLocaleDateString()
      : "—";
    const reasonMap: Record<string, string> = {
      replaced_by_stripe: "Replaced",
      cancelled: "Cancelled",
      expired: "Expired",
    };
    const reason = r.archivedReason
      ? reasonMap[r.archivedReason] || r.archivedReason
      : undefined;
    return {
      id: r.id || r.startedAt,
      planName: planLabel,
      startDate,
      endDate,
      reason,
    };
  });

  // Map one-time flow-pack purchases (pro_flow_purchases) to display objects.
  // Lifecycle: active | grace | expired | renewed.
  const packLabelMap: Record<string, string> = {
    fifty_flows: "50 Flows Pack",
    standard_100: "100 Flows Pack",
  };
  const mappedFlowPacks = (proStatus?.flowPackPurchases ?? []).map((p) => {
    const label = p.isUnlimited
      ? "Unlimited Flows Pack"
      : packLabelMap[p.packType] || `${p.flowCount} Flows Pack`;
    const date = p.createdAt
      ? new Date(p.createdAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";
    const expiryLabel =
      p.status === "expired"
        ? "expired"
        : p.expiresAt
          ? `expires ${new Date(p.expiresAt).toLocaleDateString()}`
          : null;
    return {
      id: p.id,
      label,
      date,
      status: p.status,
      expiryLabel,
      amount: `$${(p.amountCents / 100).toFixed(2)}`,
    };
  });

  // Open the Stripe Customer Portal — download invoices, update payment
  // method, view billing history (handled entirely by Stripe).
  const openCustomerPortal = async () => {
    try {
      const res = await fetch("/api/subscription/customer-portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        toast.error("Could not open billing portal. Please try again.");
      }
    } catch (e) {
      toast.error("Could not open billing portal. Please try again.");
    }
  };

  const changePlanLabel = isProApp
    ? "Manage Plan"
    : isTeamSubUsable
      ? "Change Plan"
      : "Upgrade";

  return (
    <div className="tw max-w-3xl mx-auto px-4 pt-3 pb-8 space-y-4">
      {/* Back to settings hub */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/dashboard/settings")}
          aria-label="Back"
          className={`${RESET} w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center`}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Billing</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isProApp
            ? "Manage your plan and billing"
            : "Manage your subscription and billing"}
        </p>
      </div>

      {/* ── Current plan ── */}
      <div className="rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary-deep" />
          <div className="font-bold text-base">{planName}</div>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {renewsAt
            ? `Renews ${renewsAt}`
            : isProApp && proStatus?.hasPro
              ? `One-time purchase${startedAt ? ` · ${startedAt}` : ""}`
              : isProApp
                ? "Pro not purchased"
                : "No active subscription"}
        </div>
        {monthlyEquivalent && (
          <div className="text-xs text-muted-foreground mt-1">
            ${monthlyEquivalent.toFixed(2)}/month, billed annually
          </div>
        )}

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => router.push("/dashboard/subscription")}
            className={`${RESET} w-full sm:flex-1 h-11 rounded-xl bg-primary text-white font-bold text-sm`}
          >
            {changePlanLabel}
          </button>
          {!isProApp &&
            isTeamSubUsable &&
            (subscription?.status === "cancelling" ? (
              <button
                onClick={() =>
                  confirmDialog({
                    title: "Reactivate Plan",
                    content: `Your plan will resume renewing as normal${renewsAt ? ` on ${renewsAt}` : ""}. Nothing is charged today.`,
                    confirmLabel: "Reactivate",
                    onConfirm: () => reactivate(),
                  })
                }
                className={`${RESET} w-full sm:flex-1 h-11 rounded-xl border-2 border-primary bg-card text-primary font-bold text-sm`}
              >
                Reactivate Plan
              </button>
            ) : (
              <button
                onClick={() =>
                  confirmDialog({
                    title: "Cancel Subscription",
                    content:
                      "Your subscription will remain active until the end of the current billing period. Are you sure?",
                    confirmLabel: "Yes, Cancel",
                    danger: true,
                    onConfirm: () => cancel(),
                  })
                }
                className={`${RESET} w-full sm:flex-1 h-11 rounded-xl border-2 border-[var(--coral)] bg-card text-[var(--coral)] font-bold text-sm`}
              >
                Cancel Subscription
              </button>
            ))}
        </div>

        {/* {(subscription || proStatus?.hasPro) && (
          <button
            onClick={openCustomerPortal}
            className={`${RESET} mt-2 w-full h-11 rounded-xl border border-border bg-card text-foreground font-semibold text-sm inline-flex items-center justify-center gap-2`}
          >
            <CreditCard className="w-4 h-4" /> Manage Billing &amp; Invoices
          </button>
        )} */}

        {/* Resource breakdown (Pro flows / Team plan) */}
        {isProApp && proStatus?.hasPro && (
          <>
            <div className="border-t border-border my-4" />
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary-deep mb-2">
              <Zap className="w-3.5 h-3.5" /> Pro Resources
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Flows Used</span>
                <span className="font-bold text-foreground">
                  {proStatus?.isUnlimited
                    ? "Unlimited"
                    : `${proStatus?.proFlows?.used ?? 0} / ${proStatus?.proFlows?.max ?? 0}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Flow Pack</span>
                <span
                  className={`font-semibold ${
                    flowAddonStatus === "active"
                      ? "text-primary-deep"
                      : "text-muted-foreground"
                  }`}
                >
                  {flowAddonStatus === "active"
                    ? flowAddonPlan === "unlimited"
                      ? "Unlimited ✓"
                      : "100 Flows ✓"
                    : "None (base 10)"}
                </span>
              </div>
            </div>
          </>
        )}
        {!isProApp && subscription?.plan && (
          <>
            <div className="border-t border-border my-4" />
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary-deep mb-2">
              <Building2 className="w-3.5 h-3.5" /> Team Resources
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span className="font-semibold text-foreground">
                  {subscription?.plan?.name || "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span
                  className={`font-semibold ${
                    subscription?.status === "active"
                      ? "text-primary-deep"
                      : "text-muted-foreground"
                  }`}
                >
                  {subscription?.status || "—"}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Transaction history ── */}
      <div className="rounded-2xl bg-card border border-border p-5">
        <div className="font-bold text-sm mb-3">Transaction History</div>
        <button
          onClick={() => setTxOpen((o) => !o)}
          className={`${RESET} w-full flex items-center justify-between px-3 h-11 rounded-xl bg-secondary`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Transactions</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-card border border-border text-muted-foreground">
              {mappedTransactions.length}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${txOpen ? "" : "-rotate-90"}`}
          />
        </button>
        {txOpen && (
          <div className="mt-2">
            {txLoading ? (
              <div className="py-6 text-center">
                <Spin size="small" />
              </div>
            ) : mappedTransactions.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No transactions yet
              </div>
            ) : (
              <>
                <div className="divide-y divide-border">
                  {mappedTransactions.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">
                          {t.description}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                          {t.date}
                          {getTransactionBadge(t.status)}
                        </div>
                      </div>
                      <div className="font-bold text-sm shrink-0 ml-3">
                        {t.amount}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-muted-foreground text-center mt-3">
                  Only the last 30 transactions are shown.
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Subscription history (both apps — AI-addon buys write appContext-tagged rows too) ── */}
      <div className="rounded-2xl bg-card border border-border p-5">
        <div className="font-bold text-sm mb-3">Subscription History</div>
        <button
          onClick={() => setSubOpen((o) => !o)}
          className={`${RESET} w-full flex items-center justify-between px-3 h-11 rounded-xl bg-secondary`}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Subscription History</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-card border border-border text-muted-foreground">
              {mappedHistory.length}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${subOpen ? "" : "-rotate-90"}`}
          />
        </button>
        {subOpen &&
          (historyLoading ? (
            <div className="py-6 text-center">
              <Spin size="small" />
            </div>
          ) : mappedHistory.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No records yet
            </div>
          ) : (
            <>
              <div className="mt-2 divide-y divide-border">
                {mappedHistory.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between py-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">
                        {s.planName}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {s.startDate} – {s.endDate}
                      </div>
                    </div>
                    {s.reason && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground shrink-0 ml-3">
                        {s.reason}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-muted-foreground text-center mt-3 leading-relaxed">
                Only the last 30 transactions are shown.
                <br />
                Contact support for older records.
              </div>
            </>
          ))}
      </div>

      {/* ── Flow Pack History (Pro app only — one-time pack lifecycle) ── */}
      {isProApp && mappedFlowPacks.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-5">
          <div className="font-bold text-sm mb-3">Flow Pack History</div>
          <button
            onClick={() => setPackOpen((o) => !o)}
            className={`${RESET} w-full flex items-center justify-between px-3 h-11 rounded-xl bg-secondary`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Flow Packs</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-card border border-border text-muted-foreground">
                {mappedFlowPacks.length}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform ${packOpen ? "" : "-rotate-90"}`}
            />
          </button>
          {packOpen && (
            <div className="mt-2 divide-y divide-border">
              {mappedFlowPacks.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {p.label}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {p.date}
                      {p.expiryLabel ? ` · ${p.expiryLabel}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground capitalize">
                      {p.status}
                    </span>
                    <span className="font-bold text-sm">{p.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
