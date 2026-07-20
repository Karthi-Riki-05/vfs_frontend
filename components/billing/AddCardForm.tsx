"use client";

import { useState } from "react";
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { AlertCircle } from "lucide-react";
import { paymentsApi } from "@/api/payments.api";

const RESET = "appearance-none cursor-pointer outline-none border-0";

type ElementKey = "number" | "expiry" | "cvc";

interface AddCardFormProps {
  onSuccess: (paymentMethodId: string) => void;
  onCancel: () => void;
}

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

export function AddCardForm({ onSuccess, onCancel }: AddCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [fieldComplete, setFieldComplete] = useState({
    number: false,
    expiry: false,
    cvc: false,
  });
  const [fieldError, setFieldError] = useState<Record<ElementKey, string | null>>({
    number: null,
    expiry: null,
    cvc: null,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const allComplete =
    fieldComplete.number && fieldComplete.expiry && fieldComplete.cvc;
  const hasFieldError = !!(
    fieldError.number ||
    fieldError.expiry ||
    fieldError.cvc
  );

  const makeOnChange =
    (key: ElementKey) =>
    (event: { complete: boolean; error?: { message: string } }) => {
      setFieldComplete((s) => ({ ...s, [key]: event.complete }));
      setFieldError((s) => ({
        ...s,
        [key]: event.error ? event.error.message : null,
      }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !allComplete || hasFieldError) return;

    setSaving(true);
    setFormError(null);

    try {
      // 1. Tokenize the card directly with Stripe — the browser talks to
      // Stripe's API here, the raw card number never touches our backend.
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod(
        {
          type: "card",
          card: elements.getElement(CardNumberElement)!,
        },
      );
      if (pmError || !paymentMethod) {
        setFormError(pmError?.message ?? "Card validation failed");
        return;
      }

      // 2. Proactive duplicate check — block before this card is ever saved.
      // Stripe.js never returns card.fingerprint to the browser (publishable
      // key responses omit it), so we send the PaymentMethod id and let the
      // backend look up the real fingerprint server-side with the secret key.
      const dupRes = await paymentsApi.checkDuplicateCard(paymentMethod.id);
      const dupData = dupRes.data?.data || dupRes.data;
      if (dupData?.isDuplicate) {
        setFormError(
          `This card is already saved${
            dupData.existingCard ? ` (•••• ${dupData.existingCard.last4})` : ""
          } — pick it from your existing cards instead.`,
        );
        return;
      }

      // 3. Create a SetupIntent and confirm it with the PaymentMethod we
      // already tokenized in step 1 — no need to tokenize twice.
      const siRes = await paymentsApi.createSetupIntent();
      const siData = siRes.data?.data || siRes.data;
      const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(
        siData.clientSecret,
        { payment_method: paymentMethod.id },
      );
      if (confirmError) {
        setFormError(confirmError.message ?? "Card verification failed");
        return;
      }
      if (setupIntent?.status === "succeeded") {
        onSuccess(paymentMethod.id);
      }
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Something went wrong",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
            Card Number
          </p>
          <CardNumberElement
            options={elementStyle}
            onChange={makeOnChange("number")}
          />
          {fieldError.number && (
            <p className="text-[11px] text-destructive mt-1">
              {fieldError.number}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <div className="flex-1 rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
              Expiry
            </p>
            <CardExpiryElement
              options={elementStyle}
              onChange={makeOnChange("expiry")}
            />
            {fieldError.expiry && (
              <p className="text-[11px] text-destructive mt-1">
                {fieldError.expiry}
              </p>
            )}
          </div>
          <div className="flex-1 rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">
              CVC
            </p>
            <CardCvcElement
              options={elementStyle}
              onChange={makeOnChange("cvc")}
            />
            {fieldError.cvc && (
              <p className="text-[11px] text-destructive mt-1">
                {fieldError.cvc}
              </p>
            )}
          </div>
        </div>
      </div>

      {formError && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {formError}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving || !stripe || !allComplete || hasFieldError}
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
