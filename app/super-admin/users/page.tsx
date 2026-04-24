"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Table,
  Input,
  Select,
  Button,
  Tag,
  Avatar,
  Space,
  Typography,
  Dropdown,
  Modal,
  Form,
  message,
  DatePicker,
  Checkbox,
  Badge,
  Radio,
  Grid,
  Pagination,
} from "antd";
import type { ColumnsType, TablePaginationConfig } from "antd/es/table";
import type { MenuProps } from "antd";
import {
  PlusOutlined,
  DownloadOutlined,
  MoreOutlined,
  SearchOutlined,
  AppstoreOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { superAdminApi, AdminUser, UsersQuery } from "@/api/superAdmin.api";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PRIMARY = "#3CB371";
const COLUMN_PREF_KEY = "vc_super_admin_user_columns";

const ALL_COLUMN_KEYS = [
  "user",
  "email",
  "plan",
  "app",
  "loginType",
  "device",
  "status",
  "lastSeen",
  "joined",
  "flows",
  "aiCredits",
  "provider",
  "subStatus",
  "subExpires",
  "creditsRemaining",
  "adminNote",
  "actions",
] as const;

const DEFAULT_VISIBLE: Record<string, boolean> = {
  user: true,
  email: true,
  plan: true,
  app: true,
  loginType: true,
  device: true,
  status: true,
  lastSeen: true,
  joined: false,
  flows: true,
  aiCredits: true,
  provider: false,
  subStatus: false,
  subExpires: false,
  creditsRemaining: false,
  adminNote: false,
  actions: true,
};

const COLUMN_LABELS: Record<string, string> = {
  user: "Name",
  email: "Email",
  plan: "Plan",
  app: "App",
  loginType: "Login Type",
  device: "Device",
  status: "Status",
  lastSeen: "Last Login",
  joined: "Joined",
  flows: "Flows",
  aiCredits: "AI Used",
  provider: "Provider",
  subStatus: "Sub Status",
  subExpires: "Sub Expires",
  creditsRemaining: "AI Remaining",
  adminNote: "Admin Note",
  actions: "Actions",
};

const { useBreakpoint } = Grid;

export default function SuperAdminUsersPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState<UsersQuery["plan"]>();
  const [status, setStatus] = useState<UsersQuery["status"]>();
  const [device, setDevice] = useState<string | undefined>();
  const [appFilter, setAppFilter] = useState<UsersQuery["appContext"]>();
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dateRange, setDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);

  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(
    () => {
      if (typeof window === "undefined") return DEFAULT_VISIBLE;
      try {
        const saved = localStorage.getItem(COLUMN_PREF_KEY);
        return saved
          ? { ...DEFAULT_VISIBLE, ...JSON.parse(saved) }
          : DEFAULT_VISIBLE;
      } catch {
        return DEFAULT_VISIBLE;
      }
    },
  );

  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(COLUMN_PREF_KEY, JSON.stringify(visibleCols));
    } catch {}
  }, [visibleCols]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getUsers({
        search: search.trim() || undefined,
        page,
        limit: pageSize,
        plan,
        status,
        deviceType: device,
        appContext: appFilter,
        sortBy,
        sortOrder,
        dateFrom: dateRange?.[0]?.toISOString(),
        dateTo: dateRange?.[1]?.toISOString(),
      });
      const d = res.data?.data;
      setUsers(d?.users || []);
      setTotal(d?.pagination?.total || 0);
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to load users",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    pageSize,
    plan,
    status,
    device,
    appFilter,
    sortBy,
    sortOrder,
    dateRange,
  ]);

  // Debounced search — triggers after 500ms of no typing.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleSearch = () => {
    setPage(1);
    load();
  };

  const resetFilters = () => {
    setSearch("");
    setPlan(undefined);
    setStatus(undefined);
    setDevice(undefined);
    setAppFilter(undefined);
    setSortBy("createdAt");
    setSortOrder("desc");
    setDateRange(null);
    setPage(1);
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      // Strip irrelevant fields per plan so we don't send team-only fields
      // with a free/pro user.
      const payload: any = {
        name: values.name,
        email: values.email,
        password: values.password,
        plan: values.plan,
        status: values.status,
        appType: values.appType,
        adminNote: values.adminNote,
      };
      if (values.plan === "pro" || values.plan === "team") {
        payload.duration = values.duration || "monthly";
        // Members (optional, any paid plan). UI returns emails selected from
        // the registered-users search.
        if (Array.isArray(values.inviteEmails) && values.inviteEmails.length) {
          payload.inviteEmails = values.inviteEmails;
        }
      }
      if (values.plan === "team") {
        payload.seats = values.seats || 5;
      }
      const res = await superAdminApi.createUser(payload);
      const data = res.data?.data;
      const invites = data?.invites;
      if (invites) {
        const { added, skipped } = invites;
        if (skipped && skipped.length > 0) {
          message.success(
            `User created. ${added} member${added === 1 ? "" : "s"} added, ${skipped.length} skipped (not found).`,
          );
        } else {
          message.success(
            `User created. ${added} member${added === 1 ? "" : "s"} added.`,
          );
        }
      } else {
        message.success("User created");
      }
      setAddOpen(false);
      form.resetFields();
      load();
    } catch (err: any) {
      if (err?.errorFields) return; // validation
      message.error(
        err?.response?.data?.error?.message || "Failed to create user",
      );
    } finally {
      setCreating(false);
    }
  };

  // Downloads a full all-users CSV from the backend (not just the current page).
  // The backend logs this as an admin action (users_exported).
  const exportCsv = () => {
    const a = document.createElement("a");
    a.href = superAdminApi.exportUsersCsvUrl();
    a.click();
  };

  const allColumns: ColumnsType<AdminUser> = useMemo(
    () => [
      {
        key: "user",
        title: COLUMN_LABELS.user,
        fixed: "left" as const,
        render: (_, u) => (
          <Link
            href={`/super-admin/users/${u.id}`}
            style={{ color: "inherit" }}
          >
            <Space>
              <Avatar src={u.image || undefined} size="small">
                {u.name?.[0] || u.email?.[0]}
              </Avatar>
              <span style={{ color: PRIMARY, fontWeight: 500 }}>
                {u.name || "Unnamed"}
              </span>
            </Space>
          </Link>
        ),
      },
      {
        key: "email",
        title: COLUMN_LABELS.email,
        dataIndex: "email",
        sorter: true,
      },
      {
        key: "plan",
        title: COLUMN_LABELS.plan,
        render: (_, u) => renderPlanTag(u),
      },
      {
        key: "app",
        title: COLUMN_LABELS.app,
        render: (_, u) =>
          u.currentVersion === "team" ? (
            <Tag color="purple">ValueChart Teams</Tag>
          ) : (
            <Tag color="blue">ValueChart Pro</Tag>
          ),
      },
      {
        key: "loginType",
        title: COLUMN_LABELS.loginType,
        render: (_, u) => renderLoginType(u),
      },
      {
        key: "device",
        title: COLUMN_LABELS.device,
        dataIndex: "clientType",
        render: (v: string) => <Tag>{v}</Tag>,
      },
      {
        key: "status",
        title: COLUMN_LABELS.status,
        render: (_, u) => renderStatusTag(u),
      },
      {
        key: "lastSeen",
        title: COLUMN_LABELS.lastSeen,
        sorter: true,
        render: (_, u) => {
          if (!u.lastSeen)
            return (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Never
              </Text>
            );
          const diff = Date.now() - new Date(u.lastSeen).getTime();
          const days = diff / (1000 * 60 * 60 * 24);
          const color =
            days < 7 ? "#3CB371" : days < 30 ? "#FA8C16" : "#8C8C8C";
          return (
            <Text style={{ fontSize: 12, color }}>
              {dayjs(u.lastSeen).fromNow()}
            </Text>
          );
        },
      },
      {
        key: "flows",
        title: COLUMN_LABELS.flows,
        dataIndex: ["_count", "flows"],
        align: "right" as const,
      },
      {
        key: "aiCredits",
        title: COLUMN_LABELS.aiCredits,
        dataIndex: ["_count", "aiCreditUsages"],
        align: "right" as const,
      },
      {
        key: "provider",
        title: COLUMN_LABELS.provider,
        render: (_, u) =>
          u.accounts?.[0]?.provider ? (
            <Tag>{u.accounts[0].provider}</Tag>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              email
            </Text>
          ),
      },
      {
        key: "subStatus",
        title: COLUMN_LABELS.subStatus,
        render: (_, u) =>
          u.subscription?.status ? (
            <Tag
              color={u.subscription.status === "active" ? "green" : "orange"}
            >
              {u.subscription.status}
            </Tag>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              —
            </Text>
          ),
      },
      {
        key: "subExpires",
        title: COLUMN_LABELS.subExpires,
        render: (_, u) =>
          u.subscription?.expiresAt ? (
            <Text style={{ fontSize: 12 }}>
              {dayjs(u.subscription.expiresAt).format("YYYY-MM-DD")}
            </Text>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              —
            </Text>
          ),
      },
      {
        key: "joined",
        title: COLUMN_LABELS.joined,
        sorter: true,
        render: (_, u) => (
          <Text style={{ fontSize: 12 }}>
            {dayjs(u.createdAt).format("MMM D, YYYY")}
          </Text>
        ),
      },
      {
        key: "creditsRemaining",
        title: COLUMN_LABELS.creditsRemaining,
        align: "right" as const,
        render: (_, u) => {
          const b = u.aiCreditBalance;
          if (!b) return <Text type="secondary">—</Text>;
          return (
            <Text style={{ fontSize: 12 }}>
              {b.planCredits + b.addonCredits}
            </Text>
          );
        },
      },
      {
        key: "adminNote",
        title: COLUMN_LABELS.adminNote,
        ellipsis: true,
        render: (_, u) => u.adminNote || <Text type="secondary">—</Text>,
      },
      {
        key: "actions",
        title: COLUMN_LABELS.actions,
        fixed: "right" as const,
        render: (_, u) => <RowActions user={u} onChanged={load} />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const columns = allColumns.filter(
    (c) => visibleCols[(c.key as string) || ""] !== false,
  );

  const colMenuItems: MenuProps["items"] = ALL_COLUMN_KEYS.map((k) => ({
    key: k,
    label: (
      <Checkbox
        checked={visibleCols[k] !== false}
        onChange={(e) =>
          setVisibleCols((v) => ({ ...v, [k]: e.target.checked }))
        }
      >
        {COLUMN_LABELS[k]}
      </Checkbox>
    ),
  }));

  return (
    <div>
      <style>{`
        @media (max-width: 768px) {
          .super-admin-users-table .ant-table-cell-fix-left,
          .super-admin-users-table .ant-table-cell-fix-right {
            position: relative !important;
            left: auto !important;
            right: auto !important;
            box-shadow: none !important;
          }
          .super-admin-users-table .ant-table-cell-fix-left-last,
          .super-admin-users-table .ant-table-cell-fix-right-first {
            box-shadow: none !important;
          }
        }
      `}</style>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            Users
          </Title>
          <Badge
            count={total}
            overflowCount={99999}
            style={{ backgroundColor: PRIMARY }}
          />
        </Space>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={exportCsv}>
            Export CSV
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddOpen(true)}
            style={{ background: PRIMARY, borderColor: PRIMARY }}
          >
            Add User
          </Button>
        </Space>
      </div>

      <Card bodyStyle={{ padding: 12 }} style={{ marginBottom: 12 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 240 }}
            allowClear
          />
          <Select
            placeholder="App"
            value={appFilter}
            onChange={setAppFilter}
            allowClear
            style={{ width: 160 }}
            options={[
              { value: "valuechartpro", label: "ValueChart Pro" },
              { value: "valuechartteams", label: "ValueChart Teams" },
            ]}
          />
          <Select
            placeholder="Plan"
            value={plan}
            onChange={setPlan}
            allowClear
            style={{ width: 120 }}
            options={[
              { value: "free", label: "Free" },
              { value: "pro", label: "Pro" },
              { value: "team", label: "Team" },
            ]}
          />
          <Select
            placeholder="Status"
            value={status}
            onChange={setStatus}
            allowClear
            style={{ width: 140 }}
            options={[
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" },
              { value: "deleted", label: "Deleted" },
            ]}
          />
          <Select
            placeholder="Device"
            value={device}
            onChange={setDevice}
            allowClear
            style={{ width: 120 }}
            options={[
              { value: "web", label: "Web" },
              { value: "android", label: "Android" },
              { value: "ios", label: "iOS" },
            ]}
          />
          <RangePicker
            value={dateRange as any}
            onChange={(v) => setDateRange(v as any)}
          />
          <Button onClick={resetFilters}>Reset</Button>
          <Button icon={<ReloadOutlined />} onClick={handleSearch}>
            Refresh
          </Button>
          <Dropdown
            menu={{ items: colMenuItems }}
            trigger={["click"]}
            placement="bottomRight"
          >
            <Button icon={<AppstoreOutlined />}>Columns</Button>
          </Dropdown>
        </Space>
      </Card>

      {search && (
        <div style={{ marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {loading
              ? "Searching…"
              : `${total} result${total === 1 ? "" : "s"} for "${search}"`}
          </Text>
        </div>
      )}

      {isMobile ? (
        <MobileUserCards
          users={users}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(p) => setPage(p)}
          onView={(id) => router.push(`/super-admin/users/${id}`)}
          onChanged={load}
        />
      ) : (
        <Card bodyStyle={{ padding: 0 }}>
          <Table<AdminUser>
            rowKey="id"
            className="super-admin-users-table"
            columns={columns}
            dataSource={users}
            loading={loading}
            size="middle"
            scroll={{ x: 1400 }}
            onChange={(_pag, _filters, sorter: any) => {
              const s = Array.isArray(sorter) ? sorter[0] : sorter;
              if (s?.columnKey && s.order) {
                // Map column keys to backend-supported sortBy values
                const sortKeyMap: Record<string, string> = {
                  user: "name",
                  email: "email",
                  lastSeen: "lastSeen",
                  joined: "createdAt",
                };
                const field = sortKeyMap[s.columnKey] || "createdAt";
                setSortBy(field);
                setSortOrder(s.order === "ascend" ? "asc" : "desc");
              } else {
                setSortBy("createdAt");
                setSortOrder("desc");
              }
            }}
            pagination={
              {
                current: page,
                pageSize,
                total,
                pageSizeOptions: ["25", "50", "100"],
                showSizeChanger: true,
                showTotal: (t) => `${t} users`,
                onChange: (p, s) => {
                  setPage(p);
                  setPageSize(s);
                },
              } as TablePaginationConfig
            }
          />
        </Card>
      )}

      <Modal
        title="Add User"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={handleCreate}
        confirmLoading={creating}
        okText="Create"
        okButtonProps={{ style: { background: PRIMARY, borderColor: PRIMARY } }}
        width={560}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            plan: "pro",
            status: "active",
            appType: "valuechartpro",
            duration: "monthly",
            seats: 5,
            inviteEmails: [],
          }}
          onValuesChange={(changed) => {
            // Couple App Type ↔ Plan (updated spec)
            // ValueChart Pro   → always plan='pro' (plan dropdown hidden)
            // ValueChart Teams → plan='free' or 'team' (dropdown visible)
            if (changed.appType) {
              if (changed.appType === "valuechartpro") {
                form.setFieldsValue({ plan: "pro" });
              } else if (changed.appType === "valuechartteams") {
                const currentPlan = form.getFieldValue("plan");
                if (!["free", "team"].includes(currentPlan)) {
                  form.setFieldsValue({ plan: "free" });
                }
              }
              // Reset plan-conditional fields on app-type change
              form.setFieldsValue({
                duration: "monthly",
                seats: 5,
                inviteEmails: [],
              });
            }
            if (changed.plan) {
              // Guard mismatches — auto-correct app type if admin somehow picks
              // a plan inconsistent with the current app type.
              const currentAppType = form.getFieldValue("appType");
              if (
                changed.plan === "pro" &&
                currentAppType !== "valuechartpro"
              ) {
                form.setFieldsValue({ appType: "valuechartpro" });
              } else if (
                (changed.plan === "free" || changed.plan === "team") &&
                currentAppType !== "valuechartteams"
              ) {
                form.setFieldsValue({ appType: "valuechartteams" });
              }
              form.setFieldsValue({
                duration: "monthly",
                seats: 5,
                inviteEmails: [],
              });
            }
            // Re-trim invites when seats shrink.
            if (changed.seats !== undefined) {
              const invites = form.getFieldValue("inviteEmails") || [];
              const maxInvites = Math.max(0, (changed.seats || 5) - 1);
              if (invites.length > maxInvites) {
                form.setFieldsValue({
                  inviteEmails: invites.slice(0, maxInvites),
                });
              }
            }
          }}
        >
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input placeholder="Jane Doe" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Email is required" },
              { type: "email", message: "Invalid email" },
            ]}
          >
            <Input placeholder="user@example.com" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: "Password is required" },
              { min: 8, message: "Minimum 8 characters" },
            ]}
          >
            <Input.Password placeholder="At least 8 characters" />
          </Form.Item>
          <Form.Item
            name="status"
            label="Status"
            tooltip="Inactive users cannot log in until reactivated"
          >
            <Radio.Group optionType="button" buttonStyle="solid">
              <Radio.Button value="active">Active</Radio.Button>
              <Radio.Button value="inactive">Inactive</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="appType"
            label="App Type"
            tooltip="ValueChart Pro = individual (Free/Pro plans). ValueChart Teams = enterprise (Team plan)."
          >
            <Radio.Group optionType="button" buttonStyle="solid">
              <Radio.Button value="valuechartpro">ValueChart Pro</Radio.Button>
              <Radio.Button value="valuechartteams">
                ValueChart Teams
              </Radio.Button>
            </Radio.Group>
          </Form.Item>
          <PlanSelectField form={form} />
          <PlanExtrasField form={form} />

          <Form.Item name="adminNote" label="Admin Note (optional)">
            <Input.TextArea
              rows={2}
              placeholder="Internal note for this user"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function MobileUserCards({
  users,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  onView,
  onChanged,
}: {
  users: AdminUser[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onView: (id: string) => void;
  onChanged: () => void;
}) {
  if (loading && users.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 32, color: "#8C8C8C" }}>
        Loading…
      </div>
    );
  }
  if (!loading && users.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 32, color: "#8C8C8C" }}>
        No users found
      </div>
    );
  }
  return (
    <div style={{ padding: "0 4px" }}>
      {users.map((u) => (
        <div
          key={u.id}
          style={{
            background: "#fff",
            borderRadius: 8,
            padding: 14,
            marginBottom: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid #f0f0f0",
          }}
        >
          {/* Row 1: Avatar + Name + Email */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <Avatar
              src={u.image || undefined}
              style={{ background: PRIMARY, flexShrink: 0 }}
            >
              {u.name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase()}
            </Avatar>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  color: PRIMARY,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {u.name || "Unnamed"}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#888",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {u.email}
              </div>
            </div>
            <RowActions user={u} onChanged={onChanged} />
          </div>

          {/* Row 2: Plan + App + Status badges */}
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            {renderPlanTag(u)}
            {u.currentVersion === "team" ? (
              <Tag color="purple">Teams</Tag>
            ) : (
              <Tag color="blue">Pro App</Tag>
            )}
            {renderStatusTag(u)}
          </div>

          {/* Row 3: Last seen + View */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, color: "#888" }}>
              {u.lastSeen ? dayjs(u.lastSeen).fromNow() : "Never"}
            </span>
            <Button
              size="small"
              type="link"
              onClick={() => onView(u.id)}
              style={{ color: PRIMARY, padding: 0 }}
            >
              View →
            </Button>
          </div>
        </div>
      ))}

      <Pagination
        current={page}
        total={total}
        pageSize={pageSize}
        onChange={onPageChange}
        size="small"
        showSizeChanger={false}
        style={{ textAlign: "center", marginTop: 16, marginBottom: 16 }}
      />
    </div>
  );
}

function PlanSelectField({ form }: { form: any }) {
  const appType = Form.useWatch("appType", form) || "valuechartpro";
  // ValueChart Pro → plan is implicit ('pro'), dropdown hidden.
  // ValueChart Teams → show Free / Team dropdown.
  if (appType === "valuechartpro") return null;
  return (
    <Form.Item name="plan" label="Plan">
      <Select
        options={[
          { value: "free", label: "Free (20 AI credits/mo)" },
          { value: "team", label: "Team (300 AI credits/mo)" },
        ]}
        getPopupContainer={(t) => t.parentElement || document.body}
      />
    </Form.Item>
  );
}

function PlanExtrasField({ form }: { form: any }) {
  const appType = Form.useWatch("appType", form) || "valuechartpro";
  const plan = Form.useWatch("plan", form) || "pro";
  const seats = Form.useWatch("seats", form) || 5;
  const ownEmail = (Form.useWatch("email", form) || "").toLowerCase().trim();

  // Free → nothing extra.
  if (plan === "free") return null;

  // ValueChart Pro: hide Billing Duration + Seats; show Members only.
  // ValueChart Teams + Team: show Billing Duration + Seats + Members.
  const showDuration = !(appType === "valuechartpro" && plan === "pro");
  const showSeats = appType === "valuechartteams" && plan === "team";
  const showMembers = plan === "pro" || plan === "team";

  // Effective seat cap for invites: Pro defaults to 5 (owner + 4); Team uses picker.
  const effectiveSeats = showSeats ? seats : 5;
  const maxInvites = Math.max(0, effectiveSeats - 1);

  return (
    <>
      {showDuration && (
        <Form.Item
          name="duration"
          label="Billing Duration"
          tooltip="Subscription expiry is calculated from today."
        >
          <Radio.Group optionType="button" buttonStyle="solid">
            <Radio.Button value="monthly">Monthly</Radio.Button>
            <Radio.Button value="yearly">Yearly</Radio.Button>
          </Radio.Group>
        </Form.Item>
      )}

      {showSeats && (
        <Form.Item
          name="seats"
          label="Team Seats (optional)"
          tooltip="Owner takes 1 seat. Remaining seats are for invited members."
          help="Defaults to 5 seats"
        >
          <Select
            options={[5, 10, 15, 20, 25, 30].map((n) => ({
              value: n,
              label: `${n} members`,
            }))}
            getPopupContainer={(t) => t.parentElement || document.body}
          />
        </Form.Item>
      )}

      {showMembers && (
        <Form.Item
          name="inviteEmails"
          label={`Members (optional, max ${maxInvites})`}
          tooltip="Pick from already-registered users. Members are added to this user's team after creation."
          rules={[
            {
              validator: async (_, value: string[]) => {
                const list = Array.isArray(value) ? value : [];
                if (list.length > maxInvites) {
                  throw new Error(
                    `You can invite at most ${maxInvites} member${maxInvites === 1 ? "" : "s"} (owner takes 1 seat).`,
                  );
                }
                for (const e of list) {
                  if (ownEmail && String(e).toLowerCase().trim() === ownEmail) {
                    throw new Error(
                      "You cannot invite the new user's own email.",
                    );
                  }
                }
              },
            },
          ]}
        >
          <RegisteredUsersSelect />
        </Form.Item>
      )}
    </>
  );
}

// Searchable multi-select of already-registered users.
// value/onChange are injected by Form.Item — values are user emails.
function RegisteredUsersSelect({
  value,
  onChange,
}: {
  value?: string[];
  onChange?: (v: string[]) => void;
}) {
  const [options, setOptions] = useState<
    { value: string; label: React.ReactNode }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");

  // Debounced search. Empty query loads the first page of recent users.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const q = query.trim();
        let rows: any[] = [];
        if (q) {
          const res = await superAdminApi.searchUsers(q);
          if (cancelled) return;
          rows = res.data?.data || [];
        } else {
          const res = await superAdminApi.listEligibleUsers();
          if (cancelled) return;
          rows = res.data?.data?.users || [];
        }
        const opts = (Array.isArray(rows) ? rows : [])
          .filter((u: any) => u.email)
          .map((u: any) => ({
            value: String(u.email).toLowerCase(),
            label: (
              <span style={{ fontSize: 13 }}>
                {u.name || "Unnamed"}{" "}
                <span style={{ color: "#8C8C8C", fontSize: 11 }}>
                  &lt;{u.email}&gt;
                </span>
              </span>
            ),
          }));
        setOptions(opts);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  return (
    <Select
      mode="multiple"
      showSearch
      placeholder="Search registered users by name or email"
      loading={searching}
      value={value}
      onChange={onChange}
      onSearch={setQuery}
      filterOption={false}
      options={options}
      notFoundContent={
        searching ? "Searching…" : "No matching registered users"
      }
      getPopupContainer={(t) => t.parentElement || document.body}
      style={{ width: "100%" }}
    />
  );
}

function renderPlanTag(u: AdminUser) {
  if (u.hasPro && u.currentVersion === "team")
    return <Tag color="purple">Team</Tag>;
  if (u.hasPro) return <Tag color="blue">Pro</Tag>;
  if (u.currentVersion === "team") return <Tag color="purple">Team</Tag>;
  return <Tag>Free</Tag>;
}

function renderStatusTag(u: AdminUser) {
  if (u.suspendedAt) return <Tag color="orange">Suspended</Tag>;
  if (u.userStatus === "deleted") return <Tag color="red">Deleted</Tag>;
  if (u.userStatus === "draft") return <Tag>Draft</Tag>;
  return <Tag color="green">Active</Tag>;
}

function renderLoginType(u: AdminUser) {
  const provider = u.accounts?.[0]?.provider;
  const meta: Record<
    string,
    { label: string; color: string; icon: React.ReactNode }
  > = {
    google: {
      label: "Google",
      color: "#DB4437",
      icon: <span style={{ fontWeight: 700 }}>G</span>,
    },
    facebook: {
      label: "Facebook",
      color: "#1877F2",
      icon: <span style={{ fontWeight: 700 }}>f</span>,
    },
    linkedin: {
      label: "LinkedIn",
      color: "#0A66C2",
      icon: <span style={{ fontWeight: 700 }}>in</span>,
    },
  };
  if (provider && meta[provider]) {
    const m = meta[provider];
    return (
      <Space size={6}>
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: m.color,
            color: "#fff",
            fontSize: 10,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {m.icon}
        </span>
        <Text style={{ fontSize: 12 }}>{m.label}</Text>
      </Space>
    );
  }
  // Credentials / email
  return (
    <Space size={6}>
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#8C8C8C",
          color: "#fff",
          fontSize: 10,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        ✉
      </span>
      <Text style={{ fontSize: 12 }}>Email</Text>
    </Space>
  );
}

function RowActions({
  user,
  onChanged,
}: {
  user: AdminUser;
  onChanged: () => void;
}) {
  const handleSuspend = () => {
    Modal.confirm({
      title: `Suspend ${user.name || user.email}?`,
      content: "The user will not be able to log in until reactivated.",
      okText: "Suspend",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await superAdminApi.suspendUser(user.id, "Suspended from users list");
          message.success("User suspended");
          onChanged();
        } catch (err: any) {
          message.error(
            err?.response?.data?.error?.message || "Failed to suspend user",
          );
        }
      },
    });
  };

  const handleReactivate = async () => {
    try {
      await superAdminApi.reactivateUser(user.id);
      message.success("User reactivated");
      onChanged();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to reactivate user",
      );
    }
  };

  const handleResetPassword = () => {
    let pwd = "";
    Modal.confirm({
      title: `Reset password for ${user.name || user.email}`,
      content: (
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Enter a new password (minimum 8 characters). Share it with the user
            securely.
          </Text>
          <Input.Password
            placeholder="New password"
            style={{ marginTop: 12 }}
            onChange={(e) => {
              pwd = e.target.value;
            }}
          />
        </div>
      ),
      okText: "Reset",
      onOk: async () => {
        if (!pwd || pwd.length < 8) {
          message.error("Password must be at least 8 characters");
          throw new Error("invalid");
        }
        try {
          await superAdminApi.resetUserPassword(user.id, pwd);
          message.success("Password reset");
        } catch (err: any) {
          message.error(
            err?.response?.data?.error?.message || "Failed to reset password",
          );
          throw err;
        }
      },
    });
  };

  const items: MenuProps["items"] = [
    {
      key: "view",
      label: <Link href={`/super-admin/users/${user.id}`}>View details</Link>,
    },
    user.suspendedAt
      ? { key: "reactivate", label: "Reactivate", onClick: handleReactivate }
      : {
          key: "suspend",
          label: "Suspend",
          onClick: handleSuspend,
          danger: true,
        },
    { key: "reset", label: "Reset Password", onClick: handleResetPassword },
  ];

  return (
    <Dropdown menu={{ items }} trigger={["click"]}>
      <Button type="text" icon={<MoreOutlined />} />
    </Dropdown>
  );
}
