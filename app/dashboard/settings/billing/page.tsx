"use client";

import React from "react";
import {
  Card,
  Typography,
  Button,
  Table,
  Tag,
  Space,
  Descriptions,
  Empty,
  Spin,
  Divider,
} from "antd";
import { CrownOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useSubscription } from "@/hooks/useSubscription";
import { paymentsApi } from "@/api/payments.api";
import { usePro } from "@/hooks/usePro";
import { useState, useEffect } from "react";

const { Title, Text } = Typography;

export default function BillingPage() {
  const { subscription, plans, loading, cancel } = useSubscription();
  const { currentApp, loading: proLoading } = usePro();
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

  const historyColumns = [
    {
      title: "Plan",
      dataIndex: "planName",
      key: "planName",
      render: (v: string) => v || "—",
    },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      render: (v: number, r: any) =>
        `${(r.currency || "USD").toUpperCase()} $${Number(v || 0).toFixed(2)}`,
    },
    {
      title: "Started",
      dataIndex: "startedAt",
      key: "startedAt",
      render: (d: string) => (d ? new Date(d).toLocaleDateString() : "—"),
    },
    {
      title: "Ended",
      dataIndex: "expiresAt",
      key: "expiresAt",
      render: (d: string) => (d ? new Date(d).toLocaleDateString() : "—"),
    },
    {
      title: "Reason",
      dataIndex: "archivedReason",
      key: "archivedReason",
      render: (r: string) => {
        const map: Record<string, string> = {
          replaced_by_stripe: "Replaced",
          cancelled: "Cancelled",
          expired: "Expired",
        };
        return <Tag>{map[r] || r || "—"}</Tag>;
      },
    },
  ];

  const columns = [
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d: string) =>
        d
          ? new Date(d).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "—",
    },
    {
      title: "Description",
      key: "description",
      render: (_: any, record: any) => {
        const type = record.purchaseType || record.appType || "";
        const plan = record.planName || "";
        if (type === "ai_addon_credits") return "AI Credits Add-on";
        if (type === "pro_upgrade")
          return `Pro Plan${plan ? ` — ${plan}` : ""}`;
        if (type === "pro_extra_flows") return "Pro — Extra Flows";
        if (type === "team_subscription" || type === "enterprise")
          return `Team Plan${plan ? ` — ${plan}` : ""}`;
        return "Subscription Payment";
      },
    },
    {
      title: "Amount",
      key: "amount",
      render: (_: any, record: any) => {
        // amountCharged is stored in cents (Int). Tolerate snake_case and a
        // few legacy field names; guard against null/undefined so the cell
        // never renders "$NaN" / a blank "USD $" (the reported bug).
        const raw =
          record.amountCharged ??
          record.amount_charged ??
          record.amount ??
          null;
        const currency = (record.currency || "usd").toUpperCase();
        if (raw === null || raw === undefined || Number.isNaN(Number(raw)))
          return `${currency} —`;
        return `${currency} $${(Number(raw) / 100).toFixed(2)}`;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const isSuccess =
          status === "success" || status === "succeeded" || status === "paid";
        const isRefunded =
          status === "refunded" || status === "partially_refunded";
        const isFailed = status === "failed" || status === "payment_failed";
        const color = isSuccess
          ? "success"
          : isRefunded
            ? "warning"
            : isFailed
              ? "error"
              : "default";
        const label = isSuccess
          ? "Paid"
          : isRefunded
            ? "Refunded"
            : isFailed
              ? "Failed"
              : status || "Unknown";
        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: "Transaction ID",
      key: "txnId",
      render: (_: any, record: any) => {
        const id = record.txnId || record.chargeId;
        if (!id) return "—";
        return (
          <span
            style={{ fontFamily: "monospace", fontSize: 11, color: "#888" }}
          >
            {id.length > 24 ? `${id.substring(0, 20)}...` : id}
          </span>
        );
      },
    },
  ];

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: 100 }}>
        <Spin size="large" />
      </div>
    );

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>
          Billing
        </Title>
        <Text type="secondary">Manage your subscription and billing</Text>
      </div>

      <Card style={{ marginBottom: 24 }}>
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
              <CrownOutlined style={{ fontSize: 24, color: "#4F46E5" }} />
              <div style={{ minWidth: 0 }}>
                <Title level={4} style={{ margin: 0, wordBreak: "break-word" }}>
                  {subscription?.plan?.name || "Free Plan"}
                </Title>
                <Text type="secondary">
                  {subscription
                    ? subscription.expiresAt || subscription.currentPeriodEnd
                      ? `Renews ${new Date(subscription.expiresAt || subscription.currentPeriodEnd).toLocaleDateString()}`
                      : "Active subscription"
                    : "No active subscription"}
                </Text>
              </div>
            </Space>
          </div>
          <Space wrap>
            {subscription && (
              <Button danger onClick={cancel}>
                Cancel Subscription
              </Button>
            )}
            <Button type="primary" href="/dashboard/subscription">
              {subscription ? "Change Plan" : "Upgrade"}
            </Button>
          </Space>
        </div>

        {subscription?.plan && (
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

      <Card title="Transaction History" style={{ marginBottom: 24 }}>
        <Table
          dataSource={transactions}
          columns={columns}
          rowKey="id"
          loading={txLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: "max-content" }}
          locale={{ emptyText: <Empty description="No transactions yet" /> }}
        />
      </Card>

      <Card title="Subscription History">
        <Table
          dataSource={history}
          columns={historyColumns}
          rowKey="id"
          loading={historyLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: "max-content" }}
          locale={{
            emptyText: <Empty description="No previous subscriptions" />,
          }}
        />
      </Card>
    </div>
  );
}
