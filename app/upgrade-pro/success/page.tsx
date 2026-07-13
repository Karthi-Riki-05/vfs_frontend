"use client";

import React, { Suspense, useEffect, useState, useRef } from "react";
import { Button, Result, Spin } from "antd";
import { CrownOutlined } from "@ant-design/icons";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { proApi } from "@/api/pro.api";
import { colors, borderRadius } from "@/lib/theme";

const PRO_REDIRECT_KEY = "vc_pro_purchase_redirect";

function UpgradeProSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("session_id") ?? null;
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(false);
  const pollRef = useRef(false);
  const { update: updateSession } = useSession();

  // After a Pro purchase the user belongs in the Pro app. Default strictly to
  // /dashboard/pro and only honour a stored return path if it is itself inside
  // the Pro subtree — never let a bare /dashboard (or a stale non-Pro path)
  // through, which would drop a freshly-paid Pro user into the wrong app shell.
  const getPostPurchaseRedirect = () => {
    try {
      const stored = sessionStorage.getItem(PRO_REDIRECT_KEY);
      if (stored && stored.startsWith("/dashboard/pro")) return stored;
      return "/dashboard/pro";
    } catch {
      return "/dashboard/pro";
    }
  };

  const redirectAfterPurchase = () => {
    try {
      sessionStorage.removeItem(PRO_REDIRECT_KEY);
      // Bug-056: without this, the fresh /dashboard/pro load keeps sending
      // the stale X-App-Context header, so the Pro dashboard's stats resolve
      // to the user's Team-app data instead of their (new, empty) Pro data.
      sessionStorage.setItem("vc_app_context", "pro");
    } catch {}
    window.location.href = getPostPurchaseRedirect();
  };

  useEffect(() => {
    if (!sessionId) {
      setError(true);
      return;
    }

    if (pollRef.current) return;
    pollRef.current = true;

    let attempts = 0;
    const maxAttempts = 15;
    let cancelled = false;

    const checkStatus = async () => {
      if (cancelled) return;
      attempts++;

      try {
        const verifyRes = await proApi.verifyPurchase(sessionId);
        const verifyData = verifyRes.data?.data || verifyRes.data;

        if (verifyData?.verified || verifyData?.alreadyActive) {
          setVerified(true);
          await updateSession();
          setTimeout(() => {
            if (!cancelled) redirectAfterPurchase();
          }, 2000);
          return;
        }
      } catch {
        // Don't give up — webhook might still fire
      }

      // Fallback: check app-status directly.
      // Must check proPurchasedAt, NOT hasPro — hasPro can be true
      // from admin team grants without an actual Pro purchase.
      try {
        const statusRes = await proApi.getAppStatus();
        const statusData = statusRes.data?.data || statusRes.data;

        if (statusData?.proPurchasedAt) {
          setVerified(true);
          await updateSession();
          setTimeout(() => {
            if (!cancelled) redirectAfterPurchase();
          }, 2000);
          return;
        }
      } catch {
        // Continue polling
      }

      if (attempts < maxAttempts && !cancelled) {
        setTimeout(checkStatus, 2000);
      } else if (!cancelled) {
        setError(true);
      }
    };

    checkStatus();

    return () => {
      cancelled = true;
    };
  }, [sessionId, updateSession]);

  if (error) {
    return (
      <div style={{ maxWidth: 500, margin: "80px auto", textAlign: "center" }}>
        <Result
          icon={
            <CrownOutlined style={{ color: colors.orange, fontSize: 64 }} />
          }
          title="Payment received!"
          subTitle="Activation is taking a moment. Please refresh or try again shortly."
          extra={
            <Button
              type="primary"
              size="large"
              onClick={() => window.location.reload()}
              style={{
                backgroundColor: colors.primary,
                borderColor: colors.primary,
                borderRadius: borderRadius.md,
                fontWeight: 600,
              }}
            >
              Refresh
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 500, margin: "80px auto", textAlign: "center" }}>
      <Result
        icon={<CrownOutlined style={{ color: "#F59E0B", fontSize: 64 }} />}
        title="Welcome to ValueChart Pro!"
        subTitle={
          verified
            ? "Your Pro access is active! Redirecting to dashboard..."
            : "Activating your Pro access..."
        }
        extra={
          verified ? (
            <Button
              type="primary"
              size="large"
              onClick={redirectAfterPurchase}
              style={{
                backgroundColor: colors.primary,
                borderColor: colors.primary,
                borderRadius: borderRadius.md,
                fontWeight: 600,
              }}
            >
              Go to Dashboard
            </Button>
          ) : (
            <Spin size="large" />
          )
        }
      />
    </div>
  );
}

export default function UpgradeProSuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{ maxWidth: 500, margin: "80px auto", textAlign: "center" }}
        >
          <Spin size="large" />
        </div>
      }
    >
      <UpgradeProSuccessContent />
    </Suspense>
  );
}
