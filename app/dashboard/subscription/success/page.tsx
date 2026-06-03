"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button, Spin, Typography, Card } from "antd";
import {
  CheckCircleFilled,
  CalendarOutlined,
  TeamOutlined,
  CrownOutlined,
} from "@ant-design/icons";
import { subscriptionsApi } from "@/api/subscriptions.api";

const { Text, Title } = Typography;

interface SubStatus {
  hasSubscription: boolean;
  plan: string | null;
  status: string | null;
  teamMemberLimit: number | null;
  currentPeriodEnd: string | null;
}

function SubscriptionSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams?.get("session_id") ?? null;
  const [status, setStatus] = useState<SubStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Scrub the expired Stripe checkout URL from browser history so the
  // back button (browser or PWA) lands on this page instead of Stripe's
  // "You're all done here" screen.
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/dashboard/subscription/success");
    }
  }, []);

  useEffect(() => {
    const verifyAndFetch = async () => {
      try {
        if (sessionId) {
          // Verify the checkout session and save subscription to DB
          const res = await subscriptionsApi.verifySession({ sessionId });
          setStatus(res.data?.data || res.data);
        } else {
          // Fallback: just fetch status
          const res = await subscriptionsApi.getStatus();
          setStatus(res.data?.data || res.data);
        }
      } catch {
        // will show generic success
      } finally {
        setLoading(false);
      }
    };

    verifyAndFetch();
  }, [sessionId]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 100 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Confirming your subscription...</Text>
        </div>
      </div>
    );
  }

  const rows: { icon: React.ReactNode; label: string; value: string }[] = [];
  if (status?.hasSubscription) {
    rows.push({
      icon: <CrownOutlined style={{ fontSize: 18, color: "#3CB371" }} />,
      label: "Plan",
      value: `${status.plan === "yearly" ? "Yearly" : "Monthly"} Plan`,
    });
    rows.push({
      icon: <TeamOutlined style={{ fontSize: 18, color: "#3CB371" }} />,
      label: "Team Members",
      value: `Up to ${status.teamMemberLimit} members`,
    });
    if (status.currentPeriodEnd) {
      rows.push({
        icon: <CalendarOutlined style={{ fontSize: 18, color: "#3CB371" }} />,
        label: "Next Billing Date",
        value: new Date(status.currentPeriodEnd).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      });
    }
  }

  return (
    // Top padding kept small so content sits just under the navbar (no large
    // empty gap). paddingBottom clears the bottom safe-area.
    <div
      style={{
        maxWidth: 460,
        margin: "0 auto",
        padding: "16px 20px 48px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <CheckCircleFilled
        style={{ color: "#3CB371", fontSize: 56, marginBottom: 16 }}
      />
      <Title level={3} style={{ margin: 0, textAlign: "center" }}>
        Subscription Activated!
      </Title>
      <Text
        type="secondary"
        style={{
          fontSize: 14,
          textAlign: "center",
          marginTop: 8,
          marginBottom: 28,
        }}
      >
        Your payment was successful. Welcome to Value Charts Pro.
      </Text>

      {rows.length > 0 && (
        <Card
          style={{
            width: "100%",
            borderRadius: 16,
            marginBottom: 28,
            border: "1px solid #E8E8E8",
          }}
          styles={{ body: { padding: 0 } }}
        >
          {rows.map((row, i) => (
            <div
              key={row.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px 18px",
                borderTop: i === 0 ? "none" : "1px solid #F0F0F0",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "#F0F9F4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {row.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text
                  type="secondary"
                  style={{ fontSize: 12, display: "block" }}
                >
                  {row.label}
                </Text>
                <div style={{ fontWeight: 600 }}>{row.value}</div>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Button
        type="primary"
        size="large"
        block
        onClick={() => router.replace("/dashboard")}
        style={{
          borderRadius: 12,
          height: 50,
          fontWeight: 600,
          backgroundColor: "#3CB371",
          borderColor: "#3CB371",
        }}
      >
        Go to Dashboard
      </Button>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div style={{ textAlign: "center", padding: 100 }}>
      <Spin size="large" />
      <div style={{ marginTop: 16 }}>
        <Text type="secondary">Confirming your subscription...</Text>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SubscriptionSuccessContent />
    </Suspense>
  );
}
