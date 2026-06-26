"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Spin, message, Modal } from "antd";
import {
  CreditCard,
  Star,
  Trash2,
  Plus,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { paymentsApi, SavedCard } from "@/api/payments.api";
import { isNativeAppWebView } from "@/lib/detectWebView";

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

// ─── Add Card Form (inside Elements context) ──────────────────────────────────
function AddCardForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSaving(true);
    setCardError(null);

    try {
      // 1. Get a Setup Intent client secret from our backend
      const siRes = await fetch("/api/payments/setup-intent", {
        method: "POST",
      });
      const siData = await siRes.json();
      if (!siData.success)
        throw new Error(siData.error?.message || "Failed to initialize");

      const clientSecret: string = siData.data.clientSecret;

      // 2. Confirm the setup intent with card number element (no CVC/ZIP)
      const { error, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: { card: elements.getElement(CardNumberElement)! },
        },
      );

      if (error) {
        setCardError(error.message ?? "Card verification failed");
        return;
      }

      if (setupIntent?.status === "succeeded") {
        message.success("Card saved successfully");
        onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setCardError(msg);
    } finally {
      setSaving(false);
    }
  };

  const elementStyle = {
    style: {
      base: {
        fontSize: "14px",
        color: "#1a1a1a",
        fontFamily: "Inter, sans-serif",
        "::placeholder": { color: "#9ca3af" },
      },
      invalid: { color: "#ef4444" },
    },
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
            Card Number
          </p>
          <CardNumberElement options={elementStyle} />
        </div>
        <div className="flex gap-3">
          <div className="flex-1 rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
              Expiry
            </p>
            <CardExpiryElement options={elementStyle} />
          </div>
          <div className="flex-1 rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
              CVC
            </p>
            <CardCvcElement options={elementStyle} />
          </div>
        </div>
      </div>

      {cardError && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {cardError}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving || !stripe}
          className={`${RESET} flex-1 h-10 rounded-xl bg-primary text-white font-semibold text-sm disabled:opacity-50`}
        >
          {saving ? "Saving…" : "Save Card"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={`${RESET} h-10 px-4 rounded-xl border border-border bg-card text-foreground text-sm`}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

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
            className={`${RESET} flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-40`}
          >
            <Star className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        <button
          onClick={() => onRemove(card.id)}
          disabled={loading}
          title="Remove card"
          className={`${RESET} flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/30 bg-card hover:bg-destructive/10 disabled:opacity-40`}
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
  if (typeof window !== "undefined" && isNativeAppWebView()) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          padding: "32px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#F0FFF4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <CreditCard size={28} color="#3CB371" />
        </div>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#1A1A2E",
            marginBottom: 12,
          }}
        >
          Manage payment methods on the web
        </h2>
        <p style={{ fontSize: 15, color: "#595959", maxWidth: 320 }}>
          To add or update payment methods, visit{" "}
          <strong>valueflowsoft.com</strong> in your browser.
        </p>
      </div>
    );
  }

  const router = useRouter();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [stripePromise, setStripePromise] = useState<ReturnType<
    typeof loadStripe
  > | null>(null);
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [cancelRecurringInfo, setCancelRecurringInfo] =
    useState<CancelRecurringInfo | null>(null);

  const fetchCards = useCallback(async () => {
    try {
      const res = await paymentsApi.listPaymentMethods();
      const data = res.data?.data || res.data;
      setCards(data?.paymentMethods ?? []);
    } catch {
      message.error("Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Stripe publishable key from backend, then initialise Stripe.js
  useEffect(() => {
    fetch("/api/payments/stripe-config")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.publishableKey) {
          setStripePromise(loadStripe(d.data.publishableKey));
        }
      })
      .catch(() => {
        /* Stripe Elements will stay hidden */
      });
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const handleSetDefault = async (paymentMethodId: string) => {
    setActionLoading(true);
    try {
      await paymentsApi.setDefaultCard(paymentMethodId);
      message.success("Default card updated");
      await fetchCards();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Failed to update default card";
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async (paymentMethodId: string) => {
    setRemoveTarget(null);
    setActionLoading(true);
    try {
      await paymentsApi.removeCard(paymentMethodId);
      message.success("Card removed");
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
        message.error(errData?.message ?? "Failed to remove card");
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
      message.success("Card removed and auto-renewal cancelled");
      await fetchCards();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: { message?: string } } } })
          ?.response?.data?.error?.message ?? "Failed to remove card";
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className={`${RESET} flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card`}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-foreground">Payment Methods</h1>
          <p className="text-xs text-muted-foreground">
            Manage your saved cards for subscriptions and purchases
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spin />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Saved cards */}
          {cards.length === 0 && !showAddCard && (
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

          {/* Add Card form */}
          {showAddCard ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">
                Add New Card
              </h2>
              {stripePromise ? (
                <Elements stripe={stripePromise}>
                  <AddCardForm
                    onSuccess={() => {
                      setShowAddCard(false);
                      fetchCards();
                    }}
                    onCancel={() => setShowAddCard(false)}
                  />
                </Elements>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Stripe is not configured. Please contact support.
                </p>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAddCard(true)}
              className={`${RESET} flex w-full items-center justify-center gap-2 h-11 rounded-2xl border-2 border-dashed border-border bg-card text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary`}
            >
              <Plus className="h-4 w-4" />
              Add Card
            </button>
          )}
        </div>
      )}

      {/* Remove confirmation modal */}
      <Modal
        open={!!removeTarget}
        title="Remove Card"
        okText="Remove"
        okButtonProps={{ danger: true }}
        onOk={() => removeTarget && handleRemove(removeTarget)}
        onCancel={() => setRemoveTarget(null)}
      >
        <p className="text-sm text-foreground">
          Are you sure you want to remove this card?
        </p>
      </Modal>

      {/* Cancel recurring + remove modal */}
      <Modal
        open={!!cancelRecurringInfo}
        title="Cancel Auto-Renewal & Remove Card"
        okText="Yes, cancel renewal & remove card"
        okButtonProps={{ danger: true }}
        cancelText="Keep card"
        onOk={handleCancelRecurringAndRemove}
        onCancel={() => setCancelRecurringInfo(null)}
      >
        <div className="space-y-3">
          <div className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              This is your default card and you have an active subscription.
              Removing it will <strong>cancel auto-renewal</strong> — your plan
              stays active until the billing period ends.
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
      </Modal>
    </div>
  );
}
