"use client";

import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Spin,
  List,
  Avatar,
  Tag,
  Typography,
  Empty,
} from "antd";
import {
  TeamOutlined,
  RiseOutlined,
  CrownOutlined,
  UserAddOutlined,
  ProjectOutlined,
  RobotOutlined,
  DollarOutlined,
} from "@ant-design/icons";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { superAdminApi, DashboardStatsResponse } from "@/api/superAdmin.api";

const PRIMARY = "#3CB371";
const NAVY = "#1F3864";
const PLAN_COLORS: Record<string, string> = {
  free: "#9CA3AF",
  pro: "#2563EB",
  team: "#7C3AED",
};

const { Text } = Typography;

export default function SuperAdminDashboardPage() {
  const [data, setData] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await superAdminApi.getDashboardStats();
        if (cancelled) return;
        setData(res.data?.data || null);
      } catch (err: any) {
        if (!cancelled)
          setError(
            err?.response?.data?.error?.message ||
              "Failed to load dashboard stats",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <Empty description={error || "No data"} />
      </Card>
    );
  }

  const { stats, charts, recentSignupUsers } = data;

  const planPieData = charts.planDistribution.map((p) => ({
    name: p.plan,
    value: p.count,
  }));

  return (
    <div>
      {/* Row 1 — core counts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<TeamOutlined />}
            label="Total Users"
            value={stats.totalUsers}
            color={NAVY}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<RiseOutlined />}
            label="Active (24h)"
            value={stats.activeToday}
            color={PRIMARY}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<CrownOutlined />}
            label="Pro Users"
            value={stats.proUsers}
            color="#2563EB"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<UserAddOutlined />}
            label="Today Signups"
            value={stats.todaySignups}
            color="#FA8C16"
          />
        </Col>
      </Row>

      {/* Row 2 — activity */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<ProjectOutlined />}
            label="Total Flows"
            value={stats.totalFlows}
            color={NAVY}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<RobotOutlined />}
            label="AI Credits Used"
            value={stats.totalAiCreditsUsed}
            color="#7C3AED"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<DollarOutlined />}
            label="Active Subs"
            value={stats.activeSubscriptions}
            color={PRIMARY}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            icon={<DollarOutlined />}
            label="Monthly Revenue"
            value="—"
            color="#B8860B"
            subtext="Wire Stripe for revenue"
          />
        </Col>
      </Row>

      {/* App breakdown */}
      {(data as any).appBreakdown && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} md={12}>
            <Card size="small" bodyStyle={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "#9CA3AF20",
                    color: "#6B7280",
                    fontSize: 22,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  VC
                </div>
                <div style={{ flex: 1 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ValueChart app (free + pro)
                  </Text>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 600,
                      color: "#1A1A2E",
                    }}
                  >
                    {(data as any).appBreakdown.valuechart} users
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Individual app — free &amp; pro plans
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" bodyStyle={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: "#2563EB20",
                    color: "#2563EB",
                    fontSize: 20,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                  }}
                >
                  VCP
                </div>
                <div style={{ flex: 1 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ValueChart Pro app (team)
                  </Text>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 600,
                      color: "#1A1A2E",
                    }}
                  >
                    {(data as any).appBreakdown.valueChartPro} users
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Enterprise app — team plan
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      )}

      {/* Row 3 — charts */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="Signups — last 30 days" size="small">
            {charts.recentSignups.length === 0 ? (
              <Empty description="No signups yet" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={charts.recentSignups}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={PRIMARY}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Plan Distribution" size="small">
            {planPieData.length === 0 ? (
              <Empty description="No data" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={planPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {planPieData.map((p) => (
                      <Cell
                        key={p.name}
                        fill={PLAN_COLORS[p.name] || "#D9D9D9"}
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

      {/* Row 4 — AI usage + recent signups */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="AI Credits by Model (last 30d)" size="small">
            {charts.aiUsageByModel.length === 0 ? (
              <Empty description="No AI usage recorded" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={charts.aiUsageByModel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEE" />
                  <XAxis dataKey="model" fontSize={11} />
                  <YAxis fontSize={11} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="credits" fill={NAVY} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Recent Signups" size="small">
            {recentSignupUsers.length === 0 ? (
              <Empty description="No recent signups" />
            ) : (
              <List
                size="small"
                dataSource={recentSignupUsers}
                renderItem={(u) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar src={u.image || undefined} size="small">
                          {u.name?.[0] || u.email?.[0]}
                        </Avatar>
                      }
                      title={
                        <span style={{ fontSize: 13 }}>
                          {u.name || "Unnamed"}
                        </span>
                      }
                      description={
                        <Text
                          type="secondary"
                          style={{ fontSize: 11 }}
                          ellipsis
                        >
                          {u.email}
                        </Text>
                      }
                    />
                    <Tag
                      color={
                        u.hasPro
                          ? "blue"
                          : u.currentVersion === "team"
                            ? "purple"
                            : "default"
                      }
                    >
                      {u.hasPro ? "Pro" : u.currentVersion}
                    </Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  subtext?: string;
}) {
  return (
    <Card size="small" bodyStyle={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `${color}15`,
            color,
            fontSize: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Statistic
            title={label}
            value={value}
            valueStyle={{ fontSize: 22, color: "#1A1A2E", fontWeight: 600 }}
          />
          {subtext && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {subtext}
            </Text>
          )}
        </div>
      </div>
    </Card>
  );
}
