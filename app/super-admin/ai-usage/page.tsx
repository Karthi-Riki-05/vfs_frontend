"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Card,
  Col,
  DatePicker,
  Empty,
  Row,
  Segmented,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  RobotOutlined,
  ThunderboltFilled,
  BarChartOutlined,
  PieChartFilled,
  TrophyOutlined,
} from "@ant-design/icons";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import Link from "next/link";
import dayjs, { Dayjs } from "dayjs";
import { superAdminApi } from "@/api/superAdmin.api";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PRIMARY = "#3CB371";
const NAVY = "#1F3864";
const MODEL_COLORS: Record<string, string> = {
  "claude-sonnet-4-5": "#7C3AED",
  "gemini-2.5-flash": "#2563EB",
  "gpt-4o": "#10B981",
  "gemini-1.5-flash": "#2563EB",
  unknown: "#9CA3AF",
};

type RangeKey = "7d" | "30d" | "90d" | "custom";

export default function SuperAdminAiUsagePage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [custom, setCustom] = useState<[Dayjs | null, Dayjs | null] | null>(
    null,
  );
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { dateFrom, dateTo } = useMemo(() => {
    const now = dayjs();
    if (range === "custom" && custom?.[0] && custom?.[1]) {
      return {
        dateFrom: custom[0].toISOString(),
        dateTo: custom[1].toISOString(),
      };
    }
    const daysBack = range === "7d" ? 7 : range === "90d" ? 90 : 30;
    return {
      dateFrom: now.subtract(daysBack, "day").toISOString(),
      dateTo: now.toISOString(),
    };
  }, [range, custom]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getAiUsageStats({
        dateFrom,
        dateTo,
      });
      setData(res.data?.data || null);
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to load AI usage",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, dateTo]);

  if (loading || !data) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const { summary, creditsByModel, creditsByFeature, dailyUsage, topUsers } =
    data;

  // Reshape dailyUsage for a multi-line chart (one series per model).
  const dayMap: Record<string, any> = {};
  for (const d of dailyUsage || []) {
    if (!dayMap[d.date]) dayMap[d.date] = { date: d.date };
    dayMap[d.date][d.model] = (dayMap[d.date][d.model] || 0) + d.credits;
  }
  const dailySeries = Object.values(dayMap).sort((a: any, b: any) =>
    a.date < b.date ? -1 : 1,
  );
  const modelKeys = Array.from(
    new Set((dailyUsage || []).map((d: any) => d.model)),
  ) as string[];

  const topUsersCols: ColumnsType<any> = [
    {
      title: "#",
      width: 40,
      render: (_: any, __: any, i: number) => (
        <Text strong style={{ color: i < 3 ? PRIMARY : "#8C8C8C" }}>
          {i + 1}
        </Text>
      ),
    },
    {
      title: "User",
      render: (_, r) =>
        r.user ? (
          <Link
            href={`/super-admin/users/${r.user.id}`}
            style={{ color: "inherit" }}
          >
            <Space>
              <Avatar size="small" src={r.user.image || undefined}>
                {r.user.name?.[0] || r.user.email?.[0]}
              </Avatar>
              <div>
                <div style={{ fontSize: 13, color: PRIMARY, fontWeight: 500 }}>
                  {r.user.name || "—"}
                </div>
                <div style={{ fontSize: 11, color: "#8C8C8C" }}>
                  {r.user.email}
                </div>
              </div>
            </Space>
          </Link>
        ) : (
          <Text type="secondary">{r.userId}</Text>
        ),
    },
    {
      title: "Plan",
      width: 80,
      render: (_, r) =>
        r.user?.currentVersion ? (
          <Tag
            color={
              r.user.currentVersion === "team"
                ? "purple"
                : r.user.currentVersion === "pro"
                  ? "blue"
                  : undefined
            }
          >
            {r.user.currentVersion}
          </Tag>
        ) : (
          "—"
        ),
    },
    {
      title: "Credits",
      dataIndex: "credits",
      align: "right",
      width: 100,
      sorter: (a: any, b: any) => a.credits - b.credits,
      defaultSortOrder: "descend",
    },
    {
      title: "Requests",
      dataIndex: "requests",
      align: "right",
      width: 100,
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <RobotOutlined style={{ color: PRIMARY, fontSize: 20 }} />
        <Title level={4} style={{ margin: 0 }}>
          AI Usage Analytics
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Monitor AI credit consumption across all users
        </Text>
      </div>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="How this helps"
        description={
          <div style={{ fontSize: 12 }}>
            Monitor heavy users, spot unusual spikes, compare Claude vs Gemini
            costs, and plan pricing / credit caps per plan tier.
          </div>
        }
      />

      {/* Range filter */}
      <Card bodyStyle={{ padding: 12 }} style={{ marginBottom: 16 }}>
        <Space wrap>
          <Segmented
            value={range}
            onChange={(v) => setRange(v as RangeKey)}
            options={[
              { label: "Last 7 days", value: "7d" },
              { label: "Last 30 days", value: "30d" },
              { label: "Last 90 days", value: "90d" },
              { label: "Custom", value: "custom" },
            ]}
          />
          {range === "custom" && (
            <RangePicker
              value={custom as any}
              onChange={(v) => setCustom(v as any)}
            />
          )}
        </Space>
      </Card>

      {/* Summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Total Credits Used"
              value={summary.totalCreditsUsed}
              prefix={<ThunderboltFilled style={{ color: PRIMARY }} />}
              valueStyle={{ color: NAVY, fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="Total Requests"
              value={summary.totalRequests}
              prefix={<BarChartOutlined style={{ color: "#7C3AED" }} />}
              valueStyle={{ fontSize: 22 }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <div style={{ fontSize: 12, color: "#8C8C8C" }}>
              Most Used Model
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                marginTop: 4,
                color: NAVY,
              }}
            >
              {summary.mostUsedModel || "—"}
            </div>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <div style={{ fontSize: 12, color: "#8C8C8C" }}>
              Most Used Feature
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                marginTop: 4,
                color: NAVY,
              }}
            >
              {summary.mostUsedFeature || "—"}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Charts row 1 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card size="small" title="Daily AI Usage (last 30 days)">
            {dailySeries.length === 0 ? (
              <Empty description="No usage in the selected range" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dailySeries as any}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  {modelKeys.map((m) => (
                    <Line
                      key={m}
                      type="monotone"
                      dataKey={m}
                      stroke={MODEL_COLORS[m] || "#6B7280"}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            size="small"
            title={
              <Space>
                <PieChartFilled style={{ color: PRIMARY }} /> Credits by Model
              </Space>
            }
          >
            {creditsByModel.length === 0 ? (
              <Empty description="No data" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={creditsByModel}
                    dataKey="credits"
                    nameKey="model"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    label
                  >
                    {creditsByModel.map((m: any) => (
                      <Cell
                        key={m.model}
                        fill={MODEL_COLORS[m.model] || "#D9D9D9"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      {/* Charts row 2 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card size="small" title="Credits by Feature">
            {creditsByFeature.length === 0 ? (
              <Empty description="No data" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={creditsByFeature}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="feature" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="credits" fill={NAVY} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            size="small"
            title={
              <Space>
                <TrophyOutlined style={{ color: "#FA8C16" }} /> Top 10 Users
              </Space>
            }
            bodyStyle={{ padding: 0 }}
          >
            {topUsers.length === 0 ? (
              <div style={{ padding: 24 }}>
                <Empty description="No users" />
              </div>
            ) : (
              <Table
                size="small"
                rowKey="userId"
                columns={topUsersCols}
                dataSource={topUsers}
                pagination={false}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
