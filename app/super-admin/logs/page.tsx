"use client";

import React, { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  DatePicker,
  Empty,
  Input,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined, FileTextOutlined } from "@ant-design/icons";
import Link from "next/link";
import dayjs, { Dayjs } from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { superAdminApi, AdminLogRow } from "@/api/superAdmin.api";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PRIMARY = "#3CB371";

export default function SuperAdminLogsPage() {
  const [tab, setTab] = useState<"user" | "admin">("user");

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <FileTextOutlined style={{ color: PRIMARY, fontSize: 18 }} />
        <Title level={4} style={{ margin: 0 }}>
          System Logs
        </Title>
      </div>

      <Card bodyStyle={{ padding: 0 }}>
        <Tabs
          activeKey={tab}
          onChange={(k) => setTab(k as any)}
          tabBarStyle={{ padding: "0 16px", margin: 0 }}
          items={[
            {
              key: "user",
              label: "User Activity",
              children: (
                <div style={{ padding: 16 }}>
                  <UserActivityTab />
                </div>
              ),
            },
            {
              key: "admin",
              label: "Admin Actions",
              children: (
                <div style={{ padding: 16 }}>
                  <AdminLogsTab />
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

// -------------------------------------------------
// Tab 1 — User Activity (every end-user action)
// -------------------------------------------------
interface UserActionRow {
  id: string;
  action: string;
  actionModel: string | null;
  actionId: number | null;
  createdAt: string | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

function UserActivityTab() {
  const [rows, setRows] = useState<UserActionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateRange, setDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);

  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getAllUserActivity({
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        action: actionFilter.trim() || undefined,
        dateFrom: dateRange?.[0]?.toISOString(),
        dateTo: dateRange?.[1]?.toISOString(),
      });
      const d = res.data?.data;
      setRows(d?.actions || []);
      setTotal(d?.pagination?.total || 0);
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to load activity",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, dateRange]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, page, pageSize, dateRange, search, actionFilter]);

  const exportCsv = () => {
    const header = [
      "When",
      "User",
      "Email",
      "Action",
      "Model",
      "ActionId",
    ].join(",");
    const esc = (v: any) =>
      v === null || v === undefined ? "" : `"${String(v).replace(/"/g, '""')}"`;
    const body = rows
      .map((r) =>
        [
          r.createdAt || "",
          r.user?.name || "",
          r.user?.email || "",
          r.action,
          r.actionModel || "",
          r.actionId ?? "",
        ]
          .map(esc)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `user-activity-page${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: ColumnsType<UserActionRow> = [
    {
      title: "When",
      dataIndex: "createdAt",
      width: 180,
      render: (v) =>
        v ? (
          <Tooltip title={dayjs(v).format("YYYY-MM-DD HH:mm:ss")}>
            <Text style={{ fontSize: 12 }}>{dayjs(v).fromNow()}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">—</Text>
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
                <div style={{ fontSize: 12, color: PRIMARY }}>
                  {r.user.name || "—"}
                </div>
                <div style={{ fontSize: 11, color: "#8C8C8C" }}>
                  {r.user.email}
                </div>
              </div>
            </Space>
          </Link>
        ) : (
          <Text type="secondary">system</Text>
        ),
    },
    {
      title: "Action",
      dataIndex: "action",
      render: (v: string) => <Tag color={actionColor(v)}>{v}</Tag>,
    },
    {
      title: "Model",
      dataIndex: "actionModel",
      width: 140,
      render: (v) => (v ? <Tag>{v}</Tag> : <Text type="secondary">—</Text>),
    },
    {
      title: "Action ID",
      dataIndex: "actionId",
      width: 100,
      render: (v) => v ?? <Text type="secondary">—</Text>,
    },
  ];

  return (
    <>
      <Card bodyStyle={{ padding: 12 }} style={{ marginBottom: 12 }}>
        <Space wrap>
          <Input
            placeholder="Filter by user email or name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => {
              setPage(1);
              load();
            }}
            allowClear
            style={{ width: 260 }}
          />
          <Input
            placeholder="Filter by action (e.g. login)"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            onPressEnter={() => {
              setPage(1);
              load();
            }}
            allowClear
            style={{ width: 220 }}
          />
          <RangePicker
            value={dateRange as any}
            onChange={(v) => {
              setDateRange(v as any);
              setPage(1);
            }}
          />
          <Button
            onClick={() => {
              setPage(1);
              load();
            }}
          >
            Apply
          </Button>
          <Button
            onClick={() => {
              setSearch("");
              setActionFilter("");
              setDateRange(null);
              setPage(1);
            }}
          >
            Reset
          </Button>
          <Button icon={<ReloadOutlined />} onClick={load}>
            Refresh
          </Button>
          <Button onClick={exportCsv}>Export CSV</Button>
          <Tooltip
            title={
              autoRefresh
                ? "Auto-refreshing every 30s. Click to stop."
                : "Auto-refresh disabled. Click to enable."
            }
          >
            <Button
              type={autoRefresh ? "primary" : "default"}
              onClick={() => setAutoRefresh((v) => !v)}
              style={
                autoRefresh
                  ? { background: PRIMARY, borderColor: PRIMARY }
                  : undefined
              }
            >
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </Button>
          </Tooltip>
        </Space>
      </Card>

      {rows.length === 0 && !loading ? (
        <Empty description="No user activity logged yet" />
      ) : (
        <Table<UserActionRow>
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          size="small"
          pagination={{
            current: page,
            pageSize,
            total,
            pageSizeOptions: ["25", "50", "100", "200"],
            showSizeChanger: true,
            showTotal: (t) => `${t} actions`,
            onChange: (p, s) => {
              setPage(p);
              setPageSize(s);
            },
          }}
        />
      )}
    </>
  );
}

// -------------------------------------------------
// Tab 2 — Admin Actions (super-admin audit trail)
// -------------------------------------------------
function AdminLogsTab() {
  const [logs, setLogs] = useState<AdminLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [actionFilter, setActionFilter] = useState("");
  const [dateRange, setDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getAdminLogs({
        page,
        limit: pageSize,
        action: actionFilter.trim() || undefined,
        dateFrom: dateRange?.[0]?.toISOString(),
        dateTo: dateRange?.[1]?.toISOString(),
      });
      const d = res.data?.data;
      setLogs(d?.logs || []);
      setTotal(d?.pagination?.total || 0);
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to load logs",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, dateRange]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, page, pageSize, dateRange, actionFilter]);

  const exportCsv = () => {
    const header = [
      "When",
      "Admin",
      "Admin Email",
      "Action",
      "Target User",
      "Target Email",
      "IP",
      "Path",
    ].join(",");
    const esc = (v: any) =>
      v === null || v === undefined ? "" : `"${String(v).replace(/"/g, '""')}"`;
    const body = logs
      .map((l) =>
        [
          l.createdAt,
          l.admin.name || "",
          l.admin.email || "",
          l.action,
          l.targetUser?.name || "",
          l.targetUser?.email || "",
          l.ipAddress || "",
          l.details?.path || "",
        ]
          .map(esc)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-actions-page${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const columns: ColumnsType<AdminLogRow> = [
    {
      title: "When",
      dataIndex: "createdAt",
      width: 180,
      render: (v: string) => (
        <Tooltip title={dayjs(v).format("YYYY-MM-DD HH:mm:ss")}>
          <Text style={{ fontSize: 12 }}>{dayjs(v).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Admin",
      render: (_, l) => (
        <Space>
          <Avatar size="small" src={l.admin.image || undefined}>
            {l.admin.name?.[0] || l.admin.email?.[0]}
          </Avatar>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>
              {l.admin.name || "—"}
            </div>
            <div style={{ fontSize: 11, color: "#8C8C8C" }}>
              {l.admin.email}
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: "Action",
      dataIndex: "action",
      width: 220,
      render: (v: string) => <Tag color={adminActionColor(v)}>{v}</Tag>,
    },
    {
      title: "Target User",
      render: (_, l) =>
        l.targetUser ? (
          <Link
            href={`/super-admin/users/${l.targetUser.id}`}
            style={{ color: "inherit" }}
          >
            <Space>
              <Avatar size="small" src={l.targetUser.image || undefined}>
                {l.targetUser.name?.[0] || l.targetUser.email?.[0]}
              </Avatar>
              <div>
                <div style={{ fontSize: 12, color: PRIMARY }}>
                  {l.targetUser.name || "—"}
                </div>
                <div style={{ fontSize: 11, color: "#8C8C8C" }}>
                  {l.targetUser.email}
                </div>
              </div>
            </Space>
          </Link>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "IP",
      dataIndex: "ipAddress",
      width: 140,
      render: (v: string | null) =>
        v ? (
          <Text style={{ fontSize: 12 }}>{v}</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Details",
      dataIndex: "details",
      render: (v: any) => (
        <Tooltip
          placement="topRight"
          title={
            <pre
              style={{
                margin: 0,
                maxWidth: 400,
                fontSize: 11,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {JSON.stringify(v, null, 2)}
            </pre>
          }
        >
          <Text
            style={{ fontSize: 12, cursor: "help" }}
            ellipsis
            type="secondary"
          >
            {v?.method} {v?.path}
          </Text>
        </Tooltip>
      ),
    },
  ];

  return (
    <>
      <Card bodyStyle={{ padding: 12 }} style={{ marginBottom: 12 }}>
        <Space wrap>
          <Input
            placeholder="Filter by action (e.g. user_suspended)"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            onPressEnter={() => {
              setPage(1);
              load();
            }}
            allowClear
            style={{ width: 280 }}
          />
          <RangePicker
            value={dateRange as any}
            onChange={(v) => {
              setDateRange(v as any);
              setPage(1);
            }}
          />
          <Button
            onClick={() => {
              setPage(1);
              load();
            }}
          >
            Apply
          </Button>
          <Button
            onClick={() => {
              setActionFilter("");
              setDateRange(null);
              setPage(1);
            }}
          >
            Reset
          </Button>
          <Button icon={<ReloadOutlined />} onClick={load}>
            Refresh
          </Button>
          <Button onClick={exportCsv}>Export CSV</Button>
          <Tooltip
            title={
              autoRefresh
                ? "Auto-refreshing every 30s. Click to stop."
                : "Auto-refresh disabled. Click to enable."
            }
          >
            <Button
              type={autoRefresh ? "primary" : "default"}
              onClick={() => setAutoRefresh((v) => !v)}
              style={
                autoRefresh
                  ? { background: PRIMARY, borderColor: PRIMARY }
                  : undefined
              }
            >
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </Button>
          </Tooltip>
        </Space>
      </Card>

      {logs.length === 0 && !loading ? (
        <Empty description="No admin actions logged yet" />
      ) : (
        <Table<AdminLogRow>
          rowKey="id"
          columns={columns}
          dataSource={logs}
          loading={loading}
          size="small"
          scroll={{ x: 1100 }}
          pagination={{
            current: page,
            pageSize,
            total,
            pageSizeOptions: ["25", "50", "100", "200"],
            showSizeChanger: true,
            showTotal: (t) => `${t} actions`,
            onChange: (p, s) => {
              setPage(p);
              setPageSize(s);
            },
          }}
        />
      )}
    </>
  );
}

function actionColor(action: string): string {
  const a = action.toLowerCase();
  if (a.includes("login")) return "blue";
  if (a.includes("flow") && a.includes("create")) return "green";
  if (a.includes("ai") || a.includes("generate")) return "purple";
  if (a.includes("subscription") || a.includes("pay")) return "orange";
  if (a.includes("error") || a.includes("fail")) return "red";
  return "default";
}

function adminActionColor(action: string): string {
  if (action.includes("created") || action.includes("granted")) return "green";
  if (action.includes("updated") || action.includes("adjusted")) return "blue";
  if (action.includes("suspended")) return "orange";
  if (action.includes("reactivated")) return "cyan";
  if (action.includes("cancelled") || action.includes("revoked")) return "red";
  if (action.includes("password")) return "magenta";
  if (action.includes("exported")) return "geekblue";
  return "default";
}
