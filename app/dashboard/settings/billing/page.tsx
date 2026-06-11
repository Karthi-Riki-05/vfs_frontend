"use client";

import React from "react";
import {
  Card,
  Typography,
  Button,
  Tag,
  Space,
  Descriptions,
  Spin,
  Divider,
} from "antd";
import HistoryAccordion from "@/components/billing/HistoryAccordion";
import { CrownOutlined } from "@ant-design/icons";
import { useSubscription } from "@/hooks/useSubscription";
import { paymentsApi } from "@/api/payments.api";
import { usePro } from "@/hooks/usePro";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/useMediaQuery";

const { Title, Text } = Typography;

export default function BillingPage() {
  const { subscription, loading, cancel } = useSubscription();
  const { currentApp, loading: proLoading, status: proStatus } = usePro();
  // Pro app billing must NEVER surface the Team subscription (separate
  // product): show the Pro one-time purchase instead.
  const isProApp = !proLoading && currentApp === "pro";
  const isMobile = useIsMobile();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Re-fetch whenever the user toggles between Pro and Team apps so each
  // billing surface stays scoped to its own purchases. Wait until usePro
  // has resolved — otherwise we'd default to "enterprise" while currentApp
  // is still loading and never refresh once it becomes "pro".
  useEffect(() => {
    if (proLoading) return;
    setTxLoading(true);
    const appType = currentApp === "pro" ? "individual" : "enterprise";
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
  }, [proLoading, currentApp]);

  // Subscription history is Team-app only (Pro lifetime is a one-time
  // purchase, not a subscription). Skip the call inside the Pro app.
  useEffect(() => {
    if (proLoading) return;
    if (currentApp === "pro") {
      setHistory([]);
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    fetch("/api/subscription/history")
      .then((r) => r.json())
      .then((res) => {
        const data = res?.data?.history || res?.data || [];
        setHistory(Array.isArray(data) ? data : []);
      })
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [proLoading, currentApp]);

  // Wait for usePro too — otherwise the Team subscription card flashes
  // inside the Pro app before currentApp resolves.
  if (loading || proLoading)
    return (
      <div style={{ textAlign: "center", padding: 100 }}>
        <Spin size="large" />
      </div>
    );

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: isMobile ? "0 12px" : "0 16px",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          Billing
        </Title>
        <Text type="secondary">
          {isProApp
            ? "Manage your plan and billing"
            : "Manage your subscription and billing"}
        </Text>
      </div>

      <Card style={{ marginBottom: 24 }} styles={{ body: { padding: 16 } }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <Space align="start">
              <CrownOutlined style={{ fontSize: 24, color: "#3CB371" }} />
              <div style={{ minWidth: 0 }}>
                <Title level={4} style={{ margin: 0, wordBreak: "break-word" }}>
                  {isProApp
                    ? proStatus?.hasPro
                      ? "ValueChart Pro"
                      : "Free Plan"
                    : subscription?.plan?.name || "Free Plan"}
                </Title>
                <Text type="secondary">
                  {isProApp
                    ? proStatus?.hasPro
                      ? `One-time purchase${
                          proStatus?.proPurchasedAt
                            ? ` · ${new Date(proStatus.proPurchasedAt).toLocaleDateString()}`
                            : ""
                        }`
                      : "Pro not purchased"
                    : subscription
                      ? subscription.expiresAt || subscription.currentPeriodEnd
                        ? `Renews ${new Date(subscription.expiresAt || subscription.currentPeriodEnd).toLocaleDateString()}`
                        : "Active subscription"
                      : "No active subscription"}
                </Text>
              </div>
            </Space>
          </div>
          <Space wrap>
            {!isProApp && subscription && (
              <Button danger onClick={cancel}>
                Cancel Subscription
              </Button>
            )}
            <Button type="primary" href="/dashboard/subscription">
              {isProApp
                ? "Manage Plan"
                : subscription
                  ? "Change Plan"
                  : "Upgrade"}
            </Button>
          </Space>
        </div>

        {isProApp && proStatus?.hasPro && (
          <>
            <Divider />
            <Descriptions column={{ xs: 1, sm: 2 }} size="small">
              <Descriptions.Item label="Plan">Pro</Descriptions.Item>
              <Descriptions.Item label="Flows">
                {proStatus.isUnlimited
                  ? "Unlimited"
                  : `${proStatus.proFlows?.used ?? 0} / ${proStatus.proFlows?.max ?? 0} used`}
              </Descriptions.Item>
              <Descriptions.Item label="Purchased">
                {proStatus.proPurchasedAt
                  ? new Date(proStatus.proPurchasedAt).toLocaleDateString()
                  : "—"}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}

        {!isProApp && subscription?.plan && (
          <>
            <Divider />
            <Descriptions column={{ xs: 1, sm: 2 }} size="small">
              <Descriptions.Item label="Plan">
                {subscription.plan.name}
              </Descriptions.Item>
              <Descriptions.Item label="Price">
                {/* subscription.price is the ACTUAL recurring charge in
                    dollars (seats × per-seat for team). plan.price is also
                    dollars — neither is in cents, so do NOT divide by 100
                    (that produced the "$0.05" bug). */}
                $
                {Number(
                  subscription.price ?? subscription.plan?.price ?? 0,
                ).toFixed(2)}
                /mo
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color="green">{subscription.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Started">
                {/* Use the subscription's real start (startedAt = Stripe
                    current_period_start), not the DB row's createdAt which
                    showed a stale/seeded date. */}
                {subscription.startedAt || subscription.createdAt
                  ? new Date(
                      subscription.startedAt || subscription.createdAt,
                    ).toLocaleDateString()
                  : "—"}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Card>

      <Card
        title="Transaction History"
        style={{ marginBottom: 24 }}
        styles={{ body: { padding: 16 } }}
      >
        {txLoading ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <Spin />
          </div>
        ) : (
          <HistoryAccordion
            title="Transactions"
            defaultOpen
            items={transactions.map((r: any) => {
              // date
              const date = r.createdAt
                ? new Date(r.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "—";
              // description (mirrors existing column logic)
              const type = r.purchaseType || r.appType || "";
              const plan = r.planName || "";
              let description = "Subscription Payment";
              if (type === "ai_addon_credits")
                description = "AI Credits Add-on";
              else if (type === "pro_upgrade")
                description = `Pro Plan${plan ? ` — ${plan}` : ""}`;
              else if (type === "pro_extra_flows")
                description = "Pro — Extra Flows";
              else if (type === "team_subscription" || type === "enterprise")
                description = `Team Plan${plan ? ` — ${plan}` : ""}`;
              // amount (stored in cents)
              const raw =
                r.amountCharged ?? r.amount_charged ?? r.amount ?? null;
              const currency = (r.currency || "usd").toUpperCase();
              const amount =
                raw === null || raw === undefined || Number.isNaN(Number(raw))
                  ? `${currency} —`
                  : `${currency} $${(Number(raw) / 100).toFixed(2)}`;
              return { date, description, amount, status: r.status };
            })}
          />
        )}
      </Card>

      {/* Team-app only — Pro lifetime has no subscription history */}
      {!isProApp && (
        <Card title="Subscription History" styles={{ body: { padding: 16 } }}>
          {historyLoading ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <Spin />
            </div>
          ) : (
            <HistoryAccordion
              title="Subscription History"
              defaultOpen
              items={history.map((r: any) => {
                // date: use startedAt
                const date = r.startedAt
                  ? new Date(r.startedAt).toLocaleDateString()
                  : "—";
                // description: plan name + price
                const currency = (r.currency || "USD").toUpperCase();
                const price = `${currency} $${Number(r.price || 0).toFixed(2)}/mo`;
                const description = r.planName
                  ? `${r.planName} — ${price}`
                  : price;
                // amount: show ended date if available
                const ended = r.expiresAt
                  ? `Ended ${new Date(r.expiresAt).toLocaleDateString()}`
                  : "—";
                // status: archivedReason mapped to label
                const reasonMap: Record<string, string> = {
                  replaced_by_stripe: "Replaced",
                  cancelled: "Cancelled",
                  expired: "Expired",
                };
                const status = r.archivedReason
                  ? reasonMap[r.archivedReason] || r.archivedReason
                  : undefined;
                return { date, description, amount: ended, status };
              })}
            />
          )}
        </Card>
      )}
    </div>
  );
}
