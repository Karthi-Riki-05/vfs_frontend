"use client";

import React, { Suspense, useState, useEffect } from "react";
import { Button, Typography, message, Spin, Alert } from "antd";
import {
  CheckCircleFilled,
  CrownOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { usePro } from "@/hooks/usePro";
import { usePricing } from "@/hooks/usePricing";
import { useSearchParams, useRouter } from "next/navigation";

const { Text, Title } = Typography;

const FEATURES = [
  "Lifetime access — pay once, use forever",
  "All Team features unlocked",
  "10 flow diagrams included",
  "100 AI diagram credits/month",
  "Claude AI powered diagrams",
  "Unlimited teams & chat",
  "All shapes, templates & export formats",
  "Priority support",
];

const STRIPE_PENDING_KEY = "vc_stripe_pending_pro";
const PRO_REDIRECT_KEY = "vc_pro_purchase_redirect";

function BackToDashboard({
  router,
  backUrl,
}: {
  router: ReturnType<typeof useRouter>;
  backUrl: string;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push(backUrl)}
        style={{ color: "#8C8C8C", paddingLeft: 0, fontSize: 14 }}
      >
        Back to Dashboard
      </Button>
    </div>
  );
}

function UpgradeProContent() {
  const { hasPro, proPurchasedAt, purchasePro, loading: proLoading } = usePro();
  const { pricing, loading: pricingLoading } = usePricing();
  const [purchasing, setPurchasing] = useState(false);
  const [returnedFromStripe, setReturnedFromStripe] = useState(false);
  const [forcedMode, setForcedMode] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const wasCancelled = searchParams?.get("cancelled") === "true";
  // When arriving from forced Pro mode (?app=pro), preserve the return path
  const isFromProApp = searchParams?.get("app") === "pro";
  const backUrl = isFromProApp ? "/dashboard" : "/dashboard";

  // Detect browser back-button return from Stripe (no cancel_url param).
  // purchasePro() sets the flag in sessionStorage before redirecting.
  // pageshow fires on BFCache restore AND on fresh navigation.
  useEffect(() => {
    const checkStripeReturn = () => {
      if (sessionStorage.getItem(STRIPE_PENDING_KEY)) {
        sessionStorage.removeItem(STRIPE_PENDING_KEY);
        setReturnedFromStripe(true);
        // Clean up any Stripe URL fragment left in history
        window.history.replaceState({}, "", "/upgrade-pro");
      }
    };
    // pageshow catches both BFCache restores and normal loads
    window.addEventListener("pageshow", checkStripeReturn);
    checkStripeReturn(); // also run on first mount
    return () => window.removeEventListener("pageshow", checkStripeReturn);
  }, []);

  // Replace the Stripe checkout URL in history so the browser back button
  // returns to the dashboard rather than Stripe's hosted page.
  useEffect(() => {
    if (wasCancelled) {
      window.history.replaceState({}, "", "/upgrade-pro?cancelled=true");
    }
  }, [wasCancelled]);

  // Read the persisted Pro-app flag (set by ?app=pro on the entry page).
  useEffect(() => {
    try {
      setForcedMode(localStorage.getItem("vc_app_context"));
    } catch {
      // sessionStorage blocked — fall back to the URL param only.
    }
  }, []);

  // A Pro-app user (?app=pro) or an already-purchased Pro user must NEVER see
  // this payment page → send them to the dashboard. ProGuard handles the
  // auto-grant for un-granted Pro-app users. proPurchasedAt (not bare hasPro)
  // keeps Team-plan users — hasPro=true, proPurchasedAt=null — able to buy Pro
  // from a normal browser. Skipped right after a Stripe round-trip, where
  // proPurchasedAt may be momentarily stale.
  const inProApp = forcedMode === "pro" || isFromProApp;
  useEffect(() => {
    if (wasCancelled || returnedFromStripe) return;
    if (inProApp) {
      router.replace(backUrl);
      return;
    }
    if (hasPro && proPurchasedAt !== null && !proLoading) {
      router.replace(backUrl);
    }
  }, [
    inProApp,
    hasPro,
    proPurchasedAt,
    proLoading,
    wasCancelled,
    returnedFromStripe,
    backUrl,
    router,
  ]);

  const proMonthly = pricing?.prices.pro_monthly;

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      sessionStorage.setItem(STRIPE_PENDING_KEY, "1");
      // After purchase, redirect back to Pro dashboard if user came from forced Pro mode
      if (isFromProApp) {
        sessionStorage.setItem(PRO_REDIRECT_KEY, "/dashboard?app=pro");
      }
      await purchasePro();
    } catch (err: any) {
      sessionStorage.removeItem(STRIPE_PENDING_KEY);
      if (isFromProApp) sessionStorage.removeItem(PRO_REDIRECT_KEY);
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.error ||
        "Purchase failed";
      message.error(msg);
    } finally {
      setPurchasing(false);
    }
  };

  // Spinner while loading, or while a Pro-app user is being redirected out —
  // so the payment UI never flashes for them.
  if (proLoading || (inProApp && !wasCancelled && !returnedFromStripe)) {
    return (
      <div style={{ textAlign: "center", padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  // Only show "You already have Pro" when the user has explicitly PURCHASED
  // the $1 lifetime Pro product (proPurchasedAt is set). Team-plan users have
  // hasPro=true but proPurchasedAt=null — they are a different product and
  // CAN buy Pro independently. Also don't block if they came back from Stripe
  // (cancelled payment — proPurchasedAt might be stale until page refresh).
  const hasProLifetime = hasPro && proPurchasedAt !== null;

  if (hasProLifetime && !wasCancelled && !returnedFromStripe) {
    return (
      <div style={{ maxWidth: 500, margin: "80px auto", textAlign: "center" }}>
        <BackToDashboard router={router} backUrl={backUrl} />
        <CrownOutlined style={{ fontSize: 48, color: "#F59E0B" }} />
        <Title level={3} style={{ marginTop: 16 }}>
          You already have Pro!
        </Title>
        <Text type="secondary">
          You can switch to the Pro app from the sidebar.
        </Text>
        <div style={{ marginTop: 24 }}>
          <Button
            type="primary"
            onClick={() => router.push(backUrl)}
            style={{ backgroundColor: "#3CB371", borderColor: "#3CB371" }}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const showReturnAlert = wasCancelled || returnedFromStripe;

  return (
    <div
      style={{
        maxWidth: 500,
        margin: "40px auto",
        padding: "0 16px",
        textAlign: "center",
      }}
    >
      <BackToDashboard router={router} backUrl="/dashboard" />

      {wasCancelled && (
        <Alert
          message="Payment cancelled"
          description="No charge was made. You can complete your purchase below whenever you're ready."
          type="info"
          showIcon
          style={{ marginBottom: 24, textAlign: "left" }}
        />
      )}

      {returnedFromStripe && !wasCancelled && (
        <Alert
          message="Payment not completed"
          description="You left the checkout page. No charge was made. Complete your purchase below whenever you're ready."
          type="info"
          showIcon
          style={{ marginBottom: 24, textAlign: "left" }}
        />
      )}

      <CrownOutlined
        style={{ fontSize: 48, color: "#F59E0B", marginBottom: 16 }}
      />
      <Title level={2} style={{ marginBottom: 4 }}>
        ValueChart Pro
      </Title>
      <Text type="secondary" style={{ fontSize: 16 }}>
        Unlock the full power of ValueChart
      </Text>

      <div
        style={{
          background: "#FAFAFA",
          borderRadius: 16,
          border: "1px solid #E8E8E8",
          padding: "32px 28px",
          marginTop: 32,
          textAlign: "left",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          {pricingLoading || !proMonthly ? (
            <Spin />
          ) : (
            <>
              <span style={{ fontSize: 48, fontWeight: 800, color: "#1A1A2E" }}>
                {proMonthly.display}
              </span>
              <span style={{ fontSize: 18, color: "#8C8C8C", marginLeft: 6 }}>
                one-time
              </span>
              <div>
                <Text type="secondary">
                  Pay once. Lifetime access. No recurring charges.
                </Text>
              </div>
              {pricing && pricing.currency !== "USD" && (
                <p
                  style={{
                    fontSize: 11,
                    color: "#8C8C8C",
                    marginTop: 10,
                    marginBottom: 0,
                  }}
                >
                  Prices shown in {pricing.currency}. You will be charged in
                  your local currency at checkout. Amount deposited to merchant
                  in USD.
                </p>
              )}
            </>
          )}
        </div>

        <div style={{ marginBottom: 24 }}>
          {FEATURES.map((feature, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
              }}
            >
              <CheckCircleFilled style={{ color: "#3CB371", fontSize: 16 }} />
              <Text style={{ fontSize: 14, color: "#595959" }}>{feature}</Text>
            </div>
          ))}
        </div>

        <Text
          type="secondary"
          style={{ fontSize: 13, display: "block", marginBottom: 20 }}
        >
          Need more than 10 flows? Purchase additional flows anytime.
        </Text>

        <Button
          type="primary"
          block
          size="large"
          loading={purchasing}
          onClick={handlePurchase}
          style={{
            height: 50,
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 16,
            backgroundColor: "#3CB371",
            borderColor: "#3CB371",
          }}
        >
          Purchase Pro{proMonthly ? ` — ${proMonthly.display} lifetime` : ""}
        </Button>

        <Button
          block
          size="large"
          onClick={() => router.push(backUrl)}
          style={{ marginTop: 12, height: 44 }}
        >
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

export default function UpgradeProPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: 100 }}>
          <Spin size="large" />
        </div>
      }
    >
      <UpgradeProContent />
    </Suspense>
  );
}
