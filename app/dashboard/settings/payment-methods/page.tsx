"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Spin } from "antd";
import { toast } from "sonner";
import { CreditCard, Star, Trash2, Plus, AlertCircle } from "lucide-react";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { paymentsApi, SavedCard } from "@/api/payments.api";
import { useTabFocus } from "@/hooks/useTabFocus";

const RESET = "appearance-none cursor-pointer outline-none border-0";

// ─── Card brand icon ──────────────────────────────────────────────────────────
function CardBrandIcon({ brand }: { brand: string }) {
  const b = brand.toLowerCase();
  const colors: Record<string, string> = {
    visa: "text-blue-600",
    mastercard: "text-orange-500",
    amex: "text-blue-400",
    discover: "text-orange-400",
  };
  return (
    <span
      className={`font-bold text-xs uppercase ${colors[b] ?? "text-foreground"}`}
    >
      {brand}
    </span>
  );
}

// (AddCardForm + Stripe Elements removed — card entry now happens on Stripe's
//  hosted Billing Portal, opened in the external browser. App Store 3.1.1-safe:
//  no in-app card entry. See handleOpenPortal in the page component below.)

// ─── Card row ─────────────────────────────────────────────────────────────────
function CardRow({
  card,
  onSetDefault,
  onRemove,
  loading,
}: {
  card: SavedCard;
  onSetDefault: (id: string) => void;
  onRemove: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary">
        <CreditCard className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <CardBrandIcon brand={card.brand} />
          <span className="text-sm font-medium">•••• {card.last4}</span>
          {card.isDefault && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary-tint text-primary-deep">
              Default
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Expires {card.expMonth}/{card.expYear}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!card.isDefault && (
          <button
            onClick={() => onSetDefault(card.id)}
            disabled={loading}
            title="Set as default"
            className={`${RESET} flex h-8 w-8 max-lg:h-11 max-lg:w-11 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-40`}
          >
            <Star className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        <button
          onClick={() => onRemove(card.id)}
          disabled={loading}
          title="Remove card"
          className={`${RESET} flex h-8 w-8 max-lg:h-11 max-lg:w-11 items-center justify-center rounded-lg border border-destructive/30 bg-card hover:bg-destructive/10 disabled:opacity-40`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </button>
      </div>
    </div>
  );
}

interface CancelRecurringInfo {
  paymentMethodId: string;
  subscriptionExpiry: string | null;
  flowAddonExpiry: string | null;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PaymentMethodsPage() {
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [cancelRecurringInfo, setCancelRecurringInfo] =
    useState<CancelRecurringInfo | null>(null);

  const fetchCards = useCallback(async () => {
    try {
      const res = await paymentsApi.listPaymentMethods();
      const data = res.data?.data || res.data;
      setCards(data?.paymentMethods ?? []);
    } catch {
      toast.error("Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // Refresh the card list when the user returns to this page/tab — e.g. after
  // adding a card on Stripe's hosted Billing Portal (opened in the external
  // browser on mobile, or same-tab on web).
  useTabFocus(fetchCards);

  // Add / manage cards on Stripe's hosted Billing Portal. Card details are
  // entered on Stripe's page, never inside the app (App Store 3.1.1-safe).
  // In the native shell the WebView nav policy sends billing.stripe.com to the
  // external browser; on web this navigates the current tab.
  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/subscription/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          returnPath: "/dashboard/settings/payment-methods",
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
        // On web the page unloads here. In the native shell the WebView nav to
        // billing.stripe.com is intercepted and opened in the external browser
        // (this page stays mounted), so re-enable the button after a moment.
        setTimeout(() => setPortalLoading(false), 3000);
      } else {
        toast.error(data.error?.message || "Could not open card management");
        setPortalLoading(false);
      }
    } catch {
      toast.error("Failed to open card management");
      setPortalLoading(false);
    }
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    setActionLoading(true);
    try {
      await paymentsApi.setDefaultCard(paymentMethodId);
      toast.success("Default card updated");
      await fetchCards();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Failed to update default card";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async (paymentMethodId: string) => {
    setRemoveTarget(null);
    setActionLoading(true);
    try {
      await paymentsApi.removeCard(paymentMethodId);
      toast.success("Card removed");
      await fetchCards();
    } catch (err: unknown) {
      const errData = (
        err as {
          response?: {
            data?: {
              error?: {
                code?: string;
                message?: string;
                subscriptionExpiry?: string | null;
                flowAddonExpiry?: string | null;
              };
            };
          };
        }
      )?.response?.data?.error;

      if (errData?.code === "DEFAULT_CARD_ACTIVE_SUB") {
        setCancelRecurringInfo({
          paymentMethodId,
          subscriptionExpiry: errData.subscriptionExpiry ?? null,
          flowAddonExpiry: errData.flowAddonExpiry ?? null,
        });
      } else {
        toast.error(errData?.message ?? "Failed to remove card");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRecurringAndRemove = async () => {
    if (!cancelRecurringInfo) return;
    const { paymentMethodId } = cancelRecurringInfo;
    setCancelRecurringInfo(null);
    setActionLoading(true);
    try {
      await paymentsApi.removeCard(paymentMethodId, true);
      toast.success("Card removed and auto-renewal cancelled");
      await fetchCards();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Failed to remove card";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-foreground">Payment Methods</h1>
        <p className="text-xs text-muted-foreground">
          Manage your saved cards for subscriptions and purchases
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Saved cards */}
          {cards.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">
                No saved cards
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Add a card to enable faster checkouts
              </p>
            </div>
          )}

          {cards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              onSetDefault={handleSetDefault}
              onRemove={(id) => setRemoveTarget(id)}
              loading={actionLoading}
            />
          ))}

          {/* Add / manage card — opens Stripe's hosted Billing Portal (external
              browser in the app). No card details are entered inside the app. */}
          <button
            onClick={handleOpenPortal}
            disabled={portalLoading}
            className={`${RESET} flex w-full items-center justify-center gap-2 h-11 rounded-2xl border-2 border-dashed border-border bg-card text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50`}
          >
            <Plus className="h-4 w-4" />
            {portalLoading ? "Opening…" : "Add / manage card on Stripe"}
          </button>

          <p className="text-xs text-muted-foreground text-center px-2">
            Cards are added and updated securely on Stripe.
          </p>
        </div>
      )}

      {/* Remove confirmation modal */}
      <ConfirmDialog
        open={!!removeTarget}
        title="Remove Card"
        confirmLabel="Remove"
        danger
        onConfirm={() => removeTarget && handleRemove(removeTarget)}
        onCancel={() => setRemoveTarget(null)}
        description={
          <p className="text-sm text-foreground">
            Are you sure you want to remove this card?
          </p>
        }
      />

      {/* Cancel recurring + remove modal */}
      <ConfirmDialog
        open={!!cancelRecurringInfo}
        title="Cancel Auto-Renewal & Remove Card"
        confirmLabel="Yes, cancel renewal & remove card"
        cancelLabel="Keep card"
        danger
        onConfirm={handleCancelRecurringAndRemove}
        onCancel={() => setCancelRecurringInfo(null)}
        description={
          <div className="space-y-3">
            <div className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                This is your default card and you have an active subscription.
                Removing it will <strong>cancel auto-renewal</strong> — your
                plan stays active until the billing period ends.
              </p>
            </div>

            {cancelRecurringInfo?.subscriptionExpiry && (
              <p className="text-sm text-foreground">
                <span className="font-medium">Team plan</span> active until:{" "}
                <span className="font-semibold">
                  {new Date(
                    cancelRecurringInfo.subscriptionExpiry,
                  ).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </p>
            )}

            {cancelRecurringInfo?.flowAddonExpiry && (
              <p className="text-sm text-foreground">
                <span className="font-medium">Flow pack</span> active until:{" "}
                <span className="font-semibold">
                  {new Date(
                    cancelRecurringInfo.flowAddonExpiry,
                  ).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              You can re-subscribe at any time after removal.
            </p>
          </div>
        }
      />
    </div>
  );
}
