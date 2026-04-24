"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
  Segmented,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  ReloadOutlined,
  StopOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import dayjs from "dayjs";
import { superAdminApi, SubscriptionRow } from "@/api/superAdmin.api";
import GrantSubscriptionModal from "@/components/super-admin/GrantSubscriptionModal";

const { Title, Text } = Typography;

const PRIMARY = "#3CB371";

type StatusFilter = "all" | "active" | "cancelling" | "cancelled" | "trial";

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [planFilter, setPlanFilter] = useState<"pro" | "team" | undefined>();
  const [search, setSearch] = useState("");

  const [grantOpen, setGrantOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<SubscriptionRow | null>(
    null,
  );
  const [cancelMode, setCancelMode] = useState<"immediate" | "period_end">(
    "period_end",
  );
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getSubscriptions({
        page,
        limit: pageSize,
        status: statusFilter === "all" ? undefined : statusFilter,
        plan: planFilter,
        search: search.trim() || undefined,
      });
      const d = res.data?.data;
      setSubs(d?.subscriptions || []);
      setTotal(d?.pagination?.total || 0);
      setStatusCounts(d?.statusCounts || {});
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to load subscriptions",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, statusFilter, planFilter]);

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await superAdminApi.cancelSubscription(cancelTarget.userId, {
        immediate: cancelMode === "immediate",
        reason: cancelReason,
      });
      message.success(
        cancelMode === "immediate"
          ? "Subscription cancelled immediately"
          : "Subscription will cancel at period end",
      );
      setCancelTarget(null);
      setCancelReason("");
      setCancelMode("period_end");
      load();
    } catch (err: any) {
      message.error(err?.response?.data?.error?.message || "Cancel failed");
    } finally {
      setCancelling(false);
    }
  };

  const columns: ColumnsType<SubscriptionRow> = useMemo(
    () => [
      {
        title: "User",
        fixed: "left" as const,
        render: (_, s) => (
          <Link
            href={`/super-admin/users/${s.userId}`}
            style={{ color: "inherit" }}
          >
            <Space>
              <Avatar size="small" src={s.user.image || undefined}>
                {s.user.name?.[0] || s.user.email?.[0]}
              </Avatar>
              <div>
                <div style={{ fontSize: 13, color: PRIMARY, fontWeight: 500 }}>
                  {s.user.name || "Unnamed"}
                </div>
                <div style={{ fontSize: 11, color: "#8C8C8C" }}>
                  {s.user.email}
                </div>
              </div>
            </Space>
          </Link>
        ),
      },
      {
        title: "Plan",
        render: (_, s) => {
          const productType = s.productType || "";
          const isTeam = productType.startsWith("team");
          return (
            <Tag color={isTeam ? "purple" : "blue"}>
              {s.plan?.name ||
                (productType ? productType.replace("_", " ") : "—")}
            </Tag>
          );
        },
      },
      {
        title: "Status",
        dataIndex: "status",
        render: (v: string) => (
          <Tag
            color={
              v === "active"
                ? "green"
                : v === "cancelling"
                  ? "orange"
                  : v === "cancelled"
                    ? "red"
                    : "default"
            }
          >
            {v}
          </Tag>
        ),
      },
      {
        title: "Started",
        dataIndex: "startedAt",
        render: (v) =>
          v ? (
            <Text style={{ fontSize: 12 }}>
              {dayjs(v).format("YYYY-MM-DD")}
            </Text>
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
      {
        title: "Expires",
        dataIndex: "expiresAt",
        render: (v) =>
          v ? (
            <Text style={{ fontSize: 12 }}>
              {dayjs(v).format("YYYY-MM-DD")}
            </Text>
          ) : (
            <Text type="secondary">—</Text>
          ),
      },
      {
        title: "Amount",
        dataIndex: "price",
        align: "right" as const,
        render: (v: number) => (
          <Text style={{ fontSize: 12 }}>${v.toFixed(2)}</Text>
        ),
      },
      {
        title: "Source",
        render: (_, s) => (
          <Text style={{ fontSize: 12 }}>
            {s.isRecurring ? "Stripe" : "Admin"}
          </Text>
        ),
      },
      {
        title: "Actions",
        fixed: "right" as const,
        render: (_, s) => (
          <Space>
            {(s.status === "active" || s.status === "cancelling") && (
              <Button
                size="small"
                icon={<StopOutlined />}
                danger
                onClick={() => {
                  setCancelTarget(s);
                  setCancelMode("period_end");
                  setCancelReason("");
                }}
              >
                Cancel
              </Button>
            )}
            <Link href={`/super-admin/users/${s.userId}`}>
              <Button size="small">View</Button>
            </Link>
          </Space>
        ),
      },
    ],
    [],
  );

  const statusChips: {
    key: StatusFilter;
    label: string;
    count: number;
    color: string;
  }[] = [
    {
      key: "all",
      label: "All",
      count: total,
      color: "#555",
    },
    {
      key: "active",
      label: "Active",
      count: statusCounts.active || 0,
      color: "#52C41A",
    },
    {
      key: "cancelling",
      label: "Cancelling",
      count: statusCounts.cancelling || 0,
      color: "#FA8C16",
    },
    {
      key: "cancelled",
      label: "Cancelled",
      count: statusCounts.cancelled || 0,
      color: "#8C8C8C",
    },
    {
      key: "trial",
      label: "Trial",
      count: statusCounts.trial || 0,
      color: "#2563EB",
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            Subscriptions
          </Title>
          <Badge
            count={statusCounts.active || 0}
            showZero
            style={{ backgroundColor: PRIMARY }}
            overflowCount={99999}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            active
          </Text>
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setGrantOpen(true)}
            style={{ background: PRIMARY, borderColor: PRIMARY }}
          >
            Grant Subscription
          </Button>
        </Space>
      </div>

      {/* Status chips */}
      <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
        {statusChips.map((c) => (
          <Col key={c.key}>
            <div
              onClick={() => {
                setStatusFilter(c.key);
                setPage(1);
              }}
              style={{
                cursor: "pointer",
                padding: "6px 14px",
                borderRadius: 20,
                border: `1px solid ${statusFilter === c.key ? c.color : "#E8E8E8"}`,
                background: statusFilter === c.key ? `${c.color}15` : "#fff",
                color: statusFilter === c.key ? c.color : "#595959",
                fontSize: 12,
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <RiseOutlined style={{ fontSize: 11 }} />
              {c.label}
              <span
                style={{
                  background: statusFilter === c.key ? c.color : "#F5F5F5",
                  color: statusFilter === c.key ? "#fff" : "#595959",
                  borderRadius: 10,
                  padding: "0 6px",
                  fontSize: 11,
                }}
              >
                {c.count}
              </span>
            </div>
          </Col>
        ))}
      </Row>

      <Card bodyStyle={{ padding: 12 }} style={{ marginBottom: 12 }}>
        <Space wrap>
          <Select
            placeholder="Plan"
            value={planFilter}
            onChange={(v) => {
              setPlanFilter(v);
              setPage(1);
            }}
            allowClear
            style={{ width: 140 }}
            options={[
              { value: "pro", label: "Pro" },
              { value: "team", label: "Team" },
            ]}
          />
          <Input.Search
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={() => {
              setPage(1);
              load();
            }}
            allowClear
            style={{ width: 260 }}
          />
        </Space>
      </Card>

      <Card bodyStyle={{ padding: 0 }}>
        <Table<SubscriptionRow>
          rowKey="id"
          columns={columns}
          dataSource={subs}
          loading={loading}
          scroll={{ x: 1100 }}
          size="middle"
          pagination={{
            current: page,
            pageSize,
            total,
            pageSizeOptions: ["25", "50", "100"],
            showSizeChanger: true,
            showTotal: (t) => `${t} subscriptions`,
            onChange: (p, s) => {
              setPage(p);
              setPageSize(s);
            },
          }}
        />
      </Card>

      <GrantSubscriptionModal
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        onSuccess={load}
      />

      <Modal
        title="Cancel Subscription"
        open={!!cancelTarget}
        onCancel={() => setCancelTarget(null)}
        onOk={handleConfirmCancel}
        okText="Confirm Cancel"
        okButtonProps={{ danger: true, loading: cancelling }}
      >
        {cancelTarget && (
          <div>
            <Text strong>User:</Text>{" "}
            <Text>{cancelTarget.user.name || cancelTarget.user.email}</Text>
            <div style={{ marginTop: 8 }}>
              <Text strong>Plan:</Text>{" "}
              <Text>
                {cancelTarget.plan?.name || cancelTarget.productType || "—"}
              </Text>
            </div>
            <div style={{ marginTop: 16 }}>
              <Text>Cancel type:</Text>
              <div style={{ marginTop: 6 }}>
                <Segmented
                  options={[
                    { label: "At period end", value: "period_end" },
                    { label: "Immediate", value: "immediate" },
                  ]}
                  value={cancelMode}
                  onChange={(v) => setCancelMode(v as any)}
                />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <Text>Reason (optional):</Text>
              <Input.TextArea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Internal reason for cancellation"
                style={{ marginTop: 6 }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
