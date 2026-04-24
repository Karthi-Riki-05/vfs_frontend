"use client";

import React, { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";
import {
  ArrowLeftOutlined,
  EditOutlined,
  StopOutlined,
  UndoOutlined,
  KeyOutlined,
  SaveOutlined,
  ReloadOutlined,
  CrownOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import GrantSubscriptionModal from "@/components/super-admin/GrantSubscriptionModal";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  superAdminApi,
  UserDetail,
  UserActivity,
  UserAiUsage,
  UpdateUserPayload,
  TeamDetail,
} from "@/api/superAdmin.api";
import TeamMembersPanel from "@/components/super-admin/TeamMembersPanel";

dayjs.extend(relativeTime);

const PRIMARY = "#3CB371";
const NAVY = "#1F3864";

const { Title, Text, Paragraph } = Typography;

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("profile");

  const [editMode, setEditMode] = useState(false);
  const [editForm] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);

  const [aiUsage, setAiUsage] = useState<UserAiUsage | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const [grantOpen, setGrantOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustPlan, setAdjustPlan] = useState<number>(0);
  const [adjustAddon, setAdjustAddon] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);

  const openAdjustCredits = () => {
    setAdjustPlan(user?.aiCreditBalance?.planCredits ?? 0);
    setAdjustAddon(user?.aiCreditBalance?.addonCredits ?? 0);
    setAdjustReason("");
    setAdjustOpen(true);
  };

  const handleAdjustSave = async () => {
    setAdjustSaving(true);
    try {
      await superAdminApi.adjustAiCredits(userId, {
        planCredits: adjustPlan,
        addonCredits: adjustAddon,
        reason: adjustReason || undefined,
      });
      message.success("Credits adjusted");
      setAdjustOpen(false);
      load();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to adjust credits",
      );
    } finally {
      setAdjustSaving(false);
    }
  };

  const handleForceExpire = () => {
    Modal.confirm({
      title: "Force-expire subscription?",
      content:
        "Marks status=expired, sets expiresAt to now, downgrades user to free, resets AI credits to 20, and migrates flows back to free workspace. Use for testing the post-expiry state.",
      okText: "Expire Now",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await superAdminApi.forceExpireSubscription(userId);
          message.success("Subscription expired");
          load();
        } catch (err: any) {
          message.error(
            err?.response?.data?.error?.message || "Failed to expire",
          );
          throw err;
        }
      },
    });
  };

  const handleCancelSubscription = () => {
    let mode: "immediate" | "period_end" = "period_end";
    let reason = "";
    Modal.confirm({
      title: "Cancel subscription?",
      content: (
        <div>
          <div style={{ marginBottom: 8 }}>
            <Text>Cancel type:</Text>
          </div>
          <Select
            defaultValue="period_end"
            style={{ width: "100%" }}
            options={[
              { value: "period_end", label: "At period end" },
              { value: "immediate", label: "Immediate (downgrade now)" },
            ]}
            onChange={(v) => {
              mode = v as any;
            }}
          />
          <div style={{ marginTop: 12 }}>
            <Text>Reason (optional):</Text>
          </div>
          <Input.TextArea
            rows={2}
            style={{ marginTop: 6 }}
            onChange={(e) => {
              reason = e.target.value;
            }}
          />
        </div>
      ),
      okText: "Confirm Cancel",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await superAdminApi.cancelSubscription(userId, {
            immediate: mode === "immediate",
            reason,
          });
          message.success("Subscription cancelled");
          load();
        } catch (err: any) {
          message.error(err?.response?.data?.error?.message || "Cancel failed");
          throw err;
        }
      },
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getUserDetail(userId);
      const d = res.data?.data;
      setUser(d);
      if (d) {
        editForm.setFieldsValue({
          name: d.name,
          email: d.email,
          role: d.role,
          hasPro: d.hasPro,
          currentVersion: d.currentVersion,
          proFlowLimit: d.proFlowLimit,
          proUnlimitedFlows: d.proUnlimitedFlows,
          adminNote: d.adminNote,
        });
      }
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to load user",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadActivity = async (page = 1) => {
    setActivityLoading(true);
    try {
      const res = await superAdminApi.getUserActivity(userId, {
        page,
        limit: 50,
      });
      setActivity(res.data?.data || null);
      setActivityPage(page);
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to load activity",
      );
    } finally {
      setActivityLoading(false);
    }
  };

  const loadAiUsage = async () => {
    setAiLoading(true);
    try {
      const res = await superAdminApi.getUserAiUsage(userId);
      setAiUsage(res.data?.data || null);
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to load AI usage",
      );
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "activity" && !activity) loadActivity(1);
    if (activeTab === "ai" && !aiUsage) loadAiUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleSaveProfile = async () => {
    try {
      const values = (await editForm.validateFields()) as UpdateUserPayload;
      setSaving(true);
      await superAdminApi.updateUser(userId, values);
      message.success("Profile updated");
      setEditMode(false);
      await load();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(
        err?.response?.data?.error?.message || "Failed to save profile",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleNoteBlur = async (note: string) => {
    if (!user || note === (user.adminNote || "")) return;
    try {
      await superAdminApi.updateUser(userId, { adminNote: note });
      message.success("Note saved");
      setUser({ ...user, adminNote: note });
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to save note",
      );
    }
  };

  const handleSuspendToggle = () => {
    if (!user) return;
    if (user.suspendedAt) {
      Modal.confirm({
        title: "Reactivate user?",
        onOk: async () => {
          await superAdminApi.reactivateUser(userId);
          message.success("User reactivated");
          load();
        },
      });
    } else {
      let reason = "";
      Modal.confirm({
        title: "Suspend user?",
        content: (
          <Input.TextArea
            rows={3}
            placeholder="Reason (optional)"
            onChange={(e) => {
              reason = e.target.value;
            }}
          />
        ),
        okText: "Suspend",
        okButtonProps: { danger: true },
        onOk: async () => {
          await superAdminApi.suspendUser(userId, reason);
          message.success("User suspended");
          load();
        },
      });
    }
  };

  const handleResetPassword = () => {
    let pwd = "";
    Modal.confirm({
      title: "Reset password",
      content: (
        <Input.Password
          placeholder="New password (min 8 chars)"
          onChange={(e) => {
            pwd = e.target.value;
          }}
        />
      ),
      okText: "Reset",
      onOk: async () => {
        if (!pwd || pwd.length < 8) {
          message.error("Password must be at least 8 characters");
          throw new Error("invalid");
        }
        await superAdminApi.resetUserPassword(userId, pwd);
        message.success("Password reset");
      },
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <Empty description="User not found" />
      </Card>
    );
  }

  return (
    <div>
      {/* Header */}
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
        <Space size="middle">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push("/super-admin/users")}
          >
            Users
          </Button>
          <Avatar src={user.image || undefined} size={48}>
            {user.name?.[0] || user.email?.[0]}
          </Avatar>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {user.name || "Unnamed user"}
            </Title>
            <Space size={4}>
              <Text type="secondary">{user.email}</Text>
              {user.suspendedAt ? (
                <Tag color="orange">Suspended</Tag>
              ) : user.userStatus === "deleted" ? (
                <Tag color="red">Deleted</Tag>
              ) : (
                <Tag color="green">Active</Tag>
              )}
              <PlanTag user={user} />
              {user.currentVersion === "team" ? (
                <Tag color="blue">ValueChart Pro</Tag>
              ) : (
                <Tag>ValueChart</Tag>
              )}
            </Space>
          </div>
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>
            Refresh
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setEditMode((v) => !v);
              setActiveTab("profile");
            }}
          >
            {editMode ? "Cancel Edit" : "Edit User"}
          </Button>
          <Button
            icon={user.suspendedAt ? <UndoOutlined /> : <StopOutlined />}
            danger={!user.suspendedAt}
            onClick={handleSuspendToggle}
          >
            {user.suspendedAt ? "Reactivate" : "Suspend"}
          </Button>
          <Button icon={<KeyOutlined />} onClick={handleResetPassword}>
            Reset Password
          </Button>
          <Button
            icon={<CrownOutlined />}
            onClick={() => setGrantOpen(true)}
            style={{
              background: "#2563EB",
              color: "#fff",
              borderColor: "#2563EB",
            }}
          >
            Grant / Extend
          </Button>
          {user.subscription &&
            (user.subscription.status === "active" ||
              user.subscription.status === "cancelling") && (
              <>
                <Button
                  icon={<StopOutlined />}
                  onClick={handleForceExpire}
                  title="Force-expire (testing) — sets expiresAt to past and downgrades user"
                >
                  Force Expire
                </Button>
                <Button
                  icon={<StopOutlined />}
                  danger
                  onClick={handleCancelSubscription}
                >
                  Cancel Sub
                </Button>
              </>
            )}
        </Space>
      </div>

      <Card bodyStyle={{ padding: 0 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarStyle={{ padding: "0 16px", margin: 0 }}
          items={[
            {
              key: "profile",
              label: "Profile",
              children: (
                <div style={{ padding: 16 }}>
                  {editMode ? (
                    <Form form={editForm} layout="vertical">
                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="name"
                            label="Name"
                            rules={[{ required: true }]}
                          >
                            <Input />
                          </Form.Item>
                          <Form.Item
                            name="email"
                            label="Email"
                            rules={[{ required: true, type: "email" }]}
                          >
                            <Input />
                          </Form.Item>
                          <Form.Item name="role" label="Role">
                            <Select
                              options={[
                                { value: "Viewer", label: "Viewer" },
                                { value: "Editor", label: "Editor" },
                                { value: "Admin", label: "Admin" },
                                {
                                  value: "Company Admin",
                                  label: "Company Admin",
                                },
                                { value: "super_admin", label: "Super Admin" },
                              ]}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item name="currentVersion" label="Plan">
                            <Select
                              options={[
                                { value: "free", label: "Free" },
                                { value: "pro", label: "Pro" },
                                { value: "team", label: "Team" },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item
                            name="hasPro"
                            label="Has Pro"
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>
                          <Form.Item
                            name="proUnlimitedFlows"
                            label="Unlimited Flows"
                            valuePropName="checked"
                          >
                            <Switch />
                          </Form.Item>
                          <Form.Item name="proFlowLimit" label="Flow Limit">
                            <Input type="number" min={0} />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item name="adminNote" label="Admin Note">
                        <Input.TextArea rows={3} />
                      </Form.Item>
                      <Space>
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          loading={saving}
                          onClick={handleSaveProfile}
                          style={{ background: PRIMARY, borderColor: PRIMARY }}
                        >
                          Save Changes
                        </Button>
                        <Button onClick={() => setEditMode(false)}>
                          Cancel
                        </Button>
                      </Space>
                    </Form>
                  ) : (
                    <Row gutter={[24, 16]}>
                      <Col xs={24} md={12}>
                        <Descriptions
                          column={1}
                          size="small"
                          bordered
                          title="Identity"
                        >
                          <Descriptions.Item label="Name">
                            {user.name || "—"}
                          </Descriptions.Item>
                          <Descriptions.Item label="Email">
                            {user.email || "—"}
                          </Descriptions.Item>
                          <Descriptions.Item label="Phone">
                            {user.contactNo || "—"}
                          </Descriptions.Item>
                          <Descriptions.Item label="Role">
                            {user.role}
                          </Descriptions.Item>
                          <Descriptions.Item label="User Type">
                            {user.userType}
                          </Descriptions.Item>
                          <Descriptions.Item label="Status">
                            {user.suspendedAt ? "Suspended" : user.userStatus}
                          </Descriptions.Item>
                        </Descriptions>
                      </Col>
                      <Col xs={24} md={12}>
                        <Descriptions
                          column={1}
                          size="small"
                          bordered
                          title="Activity"
                        >
                          <Descriptions.Item label="Joined">
                            {dayjs(user.createdAt).format("YYYY-MM-DD HH:mm")}
                          </Descriptions.Item>
                          <Descriptions.Item label="Last Seen">
                            {user.lastSeen
                              ? `${dayjs(user.lastSeen).fromNow()} (${dayjs(user.lastSeen).format("YYYY-MM-DD HH:mm")})`
                              : "Never"}
                          </Descriptions.Item>
                          <Descriptions.Item label="Device">
                            {user.clientType}
                          </Descriptions.Item>
                          <Descriptions.Item label="Login Provider">
                            {user.accounts?.[0]?.provider || "email/password"}
                          </Descriptions.Item>
                          <Descriptions.Item label="Stripe Customer">
                            {user.stripeCustomerId || "—"}
                          </Descriptions.Item>
                        </Descriptions>
                      </Col>
                      <Col span={24}>
                        <Title level={5} style={{ marginBottom: 6 }}>
                          Admin Note
                        </Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Auto-saves when you click outside the box.
                        </Text>
                        <AdminNoteField
                          initialValue={user.adminNote || ""}
                          onBlurSave={handleNoteBlur}
                        />
                      </Col>
                    </Row>
                  )}
                </div>
              ),
            },
            {
              key: "subscription",
              label: "Subscription",
              children: (
                <div style={{ padding: 16 }}>
                  <Row gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                      <Card
                        size="small"
                        title="Current Plan"
                        style={{ height: "100%" }}
                      >
                        {user.subscription ? (
                          <Descriptions column={1} size="small">
                            <Descriptions.Item label="Plan">
                              {user.subscription.plan?.name ||
                                user.subscription.productType ||
                                "—"}
                            </Descriptions.Item>
                            <Descriptions.Item label="Status">
                              <Tag
                                color={
                                  user.subscription.status === "active"
                                    ? "green"
                                    : "orange"
                                }
                              >
                                {user.subscription.status}
                              </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Price">
                              ${user.subscription.price || 0}
                            </Descriptions.Item>
                            <Descriptions.Item label="Started">
                              {user.subscription.startedAt
                                ? dayjs(user.subscription.startedAt).format(
                                    "YYYY-MM-DD",
                                  )
                                : "—"}
                            </Descriptions.Item>
                            <Descriptions.Item label="Expires">
                              {user.subscription.expiresAt
                                ? dayjs(user.subscription.expiresAt).format(
                                    "YYYY-MM-DD",
                                  )
                                : "—"}
                            </Descriptions.Item>
                            <Descriptions.Item label="Auto-renew">
                              {user.subscription.isRecurring ? "Yes" : "No"}
                            </Descriptions.Item>
                          </Descriptions>
                        ) : (
                          <div
                            style={{ textAlign: "center", padding: "8px 0" }}
                          >
                            <Empty
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description={
                                <div>
                                  <div
                                    style={{
                                      fontSize: 13,
                                      color: "#1A1A2E",
                                      fontWeight: 500,
                                    }}
                                  >
                                    Plan: Free
                                  </div>
                                  <div
                                    style={{ fontSize: 12, color: "#8C8C8C" }}
                                  >
                                    No active subscription
                                  </div>
                                </div>
                              }
                            />
                            <Button
                              type="primary"
                              icon={<CrownOutlined />}
                              onClick={() => setGrantOpen(true)}
                              style={{
                                background: PRIMARY,
                                borderColor: PRIMARY,
                                marginTop: 8,
                              }}
                            >
                              Grant Subscription
                            </Button>
                          </div>
                        )}
                      </Card>
                    </Col>
                    <Col xs={24} md={12}>
                      <Card
                        size="small"
                        title="AI Credits"
                        style={{ height: "100%" }}
                      >
                        {user.aiCreditBalance ? (
                          <Descriptions column={1} size="small">
                            <Descriptions.Item label="Plan credits">
                              {user.aiCreditBalance.planCredits}
                            </Descriptions.Item>
                            <Descriptions.Item label="Addon credits">
                              {user.aiCreditBalance.addonCredits}
                            </Descriptions.Item>
                            <Descriptions.Item label="Total">
                              <Tag color="blue">
                                {user.aiCreditBalance.planCredits +
                                  user.aiCreditBalance.addonCredits}
                              </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Plan resets">
                              {user.aiCreditBalance.planResetsAt
                                ? dayjs(
                                    user.aiCreditBalance.planResetsAt,
                                  ).format("YYYY-MM-DD")
                                : "—"}
                            </Descriptions.Item>
                          </Descriptions>
                        ) : (
                          <Empty description="No credit balance record" />
                        )}
                        <div style={{ marginTop: 12 }}>
                          <Button
                            size="small"
                            icon={<ThunderboltOutlined />}
                            onClick={openAdjustCredits}
                          >
                            Adjust Credits
                          </Button>
                        </div>
                      </Card>
                    </Col>
                  </Row>

                  {/* Subscription history — archive of prior plans */}
                  {user.subscriptionHistory &&
                    user.subscriptionHistory.length > 0 && (
                      <Card
                        size="small"
                        title={
                          <Space>
                            <span>Subscription History</span>
                            <Tag color="default">
                              {user.subscriptionHistory.length} past
                            </Tag>
                          </Space>
                        }
                        style={{ marginTop: 16 }}
                        bodyStyle={{ padding: 0 }}
                      >
                        <Table
                          size="small"
                          pagination={false}
                          rowKey="id"
                          dataSource={user.subscriptionHistory}
                          columns={[
                            {
                              title: "Plan",
                              dataIndex: "planName",
                              render: (v, r: any) => v || r.productType || "—",
                            },
                            {
                              title: "Status",
                              dataIndex: "status",
                              render: (v: string) => (
                                <Tag
                                  color={
                                    v === "expired"
                                      ? "red"
                                      : v === "cancelled"
                                        ? "orange"
                                        : v === "active"
                                          ? "green"
                                          : "default"
                                  }
                                >
                                  {v}
                                </Tag>
                              ),
                            },
                            {
                              title: "Source",
                              dataIndex: "source",
                              render: (v: string | null) =>
                                v === "stripe" ? (
                                  <Tag color="blue">Stripe</Tag>
                                ) : v === "admin" ? (
                                  <Tag>Admin</Tag>
                                ) : (
                                  <Text type="secondary">—</Text>
                                ),
                            },
                            {
                              title: "Price",
                              dataIndex: "price",
                              align: "right" as const,
                              render: (v: number) =>
                                v > 0 ? `$${v.toFixed(2)}` : "—",
                            },
                            {
                              title: "Started",
                              dataIndex: "startedAt",
                              render: (v: string | null) =>
                                v ? (
                                  <Text style={{ fontSize: 12 }}>
                                    {dayjs(v).format("MMM D, YYYY")}
                                  </Text>
                                ) : (
                                  "—"
                                ),
                            },
                            {
                              title: "Expires",
                              dataIndex: "expiresAt",
                              render: (v: string | null) =>
                                v ? (
                                  <Text style={{ fontSize: 12 }}>
                                    {dayjs(v).format("MMM D, YYYY")}
                                  </Text>
                                ) : (
                                  "—"
                                ),
                            },
                            {
                              title: "Reason",
                              dataIndex: "archivedReason",
                              render: (v: string | null) =>
                                v ? <Tag>{v.replace(/_/g, " ")}</Tag> : "—",
                            },
                            {
                              title: "Archived",
                              dataIndex: "archivedAt",
                              render: (v: string) => (
                                <Tooltip
                                  title={dayjs(v).format("YYYY-MM-DD HH:mm")}
                                >
                                  <Text
                                    type="secondary"
                                    style={{ fontSize: 12 }}
                                  >
                                    {dayjs(v).fromNow()}
                                  </Text>
                                </Tooltip>
                              ),
                            },
                          ]}
                        />
                      </Card>
                    )}
                </div>
              ),
            },
            {
              key: "activity",
              label: "Activity Logs",
              children: (
                <div style={{ padding: 16 }}>
                  <Space style={{ marginBottom: 12 }}>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => loadActivity(activityPage)}
                    >
                      Refresh
                    </Button>
                    <Text type="secondary">
                      {activity?.pagination?.total ?? 0} total actions
                    </Text>
                  </Space>
                  {activityLoading ? (
                    <div style={{ textAlign: "center", padding: 40 }}>
                      <Spin />
                    </div>
                  ) : activity && activity.actions.length > 0 ? (
                    <>
                      <Timeline
                        items={activity.actions.map((a) => ({
                          color: actionColor(a.action),
                          children: (
                            <div>
                              <Space>
                                <Text strong>{a.action}</Text>
                                {a.actionModel && <Tag>{a.actionModel}</Tag>}
                              </Space>
                              <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {a.createdAt
                                    ? `${dayjs(a.createdAt).fromNow()} — ${dayjs(a.createdAt).format("YYYY-MM-DD HH:mm:ss")}`
                                    : "—"}
                                </Text>
                              </div>
                            </div>
                          ),
                        }))}
                      />
                      {activity.pagination.totalPages > 1 && (
                        <Space style={{ marginTop: 12 }}>
                          <Button
                            disabled={activityPage <= 1}
                            onClick={() => loadActivity(activityPage - 1)}
                          >
                            Prev
                          </Button>
                          <Text>
                            Page {activityPage} /{" "}
                            {activity.pagination.totalPages}
                          </Text>
                          <Button
                            disabled={
                              activityPage >= activity.pagination.totalPages
                            }
                            onClick={() => loadActivity(activityPage + 1)}
                          >
                            Next
                          </Button>
                        </Space>
                      )}
                    </>
                  ) : (
                    <Empty description="No activity recorded" />
                  )}
                </div>
              ),
            },
            {
              key: "flows",
              label: `Flows (${user._count.flows})`,
              children: (
                <div style={{ padding: 16 }}>
                  {user.flows.length === 0 ? (
                    <Empty description="No flows" />
                  ) : (
                    <Row gutter={[16, 16]}>
                      {user.flows.map((f) => (
                        <Col xs={24} sm={12} md={8} lg={6} key={f.id}>
                          <Card
                            size="small"
                            hoverable
                            cover={
                              f.thumbnail ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={f.thumbnail}
                                  alt={f.name}
                                  style={{
                                    height: 120,
                                    objectFit: "cover",
                                    background: "#FAFAFA",
                                  }}
                                />
                              ) : (
                                <div
                                  style={{
                                    height: 120,
                                    background: "#FAFAFA",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#BFBFBF",
                                    fontSize: 12,
                                  }}
                                >
                                  No preview
                                </div>
                              )
                            }
                            onClick={() =>
                              window.open(`/dashboard/flows/${f.id}`, "_blank")
                            }
                          >
                            <Card.Meta
                              title={
                                <Text style={{ fontSize: 13 }} ellipsis>
                                  {f.name}
                                </Text>
                              }
                              description={
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  {dayjs(f.updatedAt).fromNow()}
                                </Text>
                              }
                            />
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </div>
              ),
            },
            {
              key: "ai",
              label: `AI Usage`,
              children: (
                <div style={{ padding: 16 }}>
                  {aiLoading ? (
                    <div style={{ textAlign: "center", padding: 40 }}>
                      <Spin />
                    </div>
                  ) : aiUsage ? (
                    <>
                      <Row gutter={[16, 16]}>
                        <Col xs={12} md={6}>
                          <Card size="small">
                            <Text type="secondary">Total credits used</Text>
                            <div
                              style={{
                                fontSize: 22,
                                fontWeight: 600,
                                color: NAVY,
                              }}
                            >
                              {aiUsage.total}
                            </div>
                          </Card>
                        </Col>
                        <Col xs={12} md={6}>
                          <Card size="small">
                            <Text type="secondary">This month</Text>
                            <div
                              style={{
                                fontSize: 22,
                                fontWeight: 600,
                                color: PRIMARY,
                              }}
                            >
                              {aiUsage.thisMonth}
                            </div>
                          </Card>
                        </Col>
                        <Col xs={12} md={6}>
                          <Card size="small">
                            <Text type="secondary">Most used model</Text>
                            <div style={{ fontSize: 16, fontWeight: 600 }}>
                              {aiUsage.byModel.length > 0
                                ? [...aiUsage.byModel].sort(
                                    (a, b) => b.credits - a.credits,
                                  )[0].model
                                : "—"}
                            </div>
                          </Card>
                        </Col>
                        <Col xs={12} md={6}>
                          <Card size="small">
                            <Text type="secondary">Conversations</Text>
                            <div style={{ fontSize: 22, fontWeight: 600 }}>
                              {user._count.aiConversations}
                            </div>
                          </Card>
                        </Col>
                      </Row>
                      <Card
                        size="small"
                        title="Credits used — last 30 days"
                        style={{ marginTop: 16 }}
                      >
                        {aiUsage.byDay.length === 0 ? (
                          <Empty description="No usage in last 30 days" />
                        ) : (
                          <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={aiUsage.byDay}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#EEE"
                              />
                              <XAxis dataKey="date" fontSize={11} />
                              <YAxis fontSize={11} allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="credits" fill={PRIMARY} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </Card>
                      <Card
                        size="small"
                        title="Recent conversations"
                        style={{ marginTop: 16 }}
                      >
                        {user.aiConversations.length === 0 ? (
                          <Empty description="No conversations" />
                        ) : (
                          <Table
                            size="small"
                            pagination={false}
                            rowKey="id"
                            dataSource={user.aiConversations}
                            columns={[
                              {
                                title: "Title",
                                dataIndex: "title",
                                render: (v) => v || "Untitled",
                              },
                              {
                                title: "Messages",
                                dataIndex: ["_count", "messages"],
                                width: 100,
                                align: "right",
                              },
                              {
                                title: "Updated",
                                dataIndex: "updatedAt",
                                width: 180,
                                render: (v) =>
                                  dayjs(v).format("YYYY-MM-DD HH:mm"),
                              },
                            ]}
                          />
                        )}
                      </Card>
                    </>
                  ) : (
                    <Empty description="No AI usage data" />
                  )}
                </div>
              ),
            },
            ...(user.currentVersion === "team"
              ? [
                  {
                    key: "team",
                    label: "Team",
                    children: (
                      <div style={{ padding: 16 }}>
                        <TeamMembersPanel userId={user.id} />
                      </div>
                    ),
                  },
                ]
              : []),
            {
              key: "devices",
              label: "Devices",
              children: (
                <div style={{ padding: 16 }}>
                  <Card size="small" title="Primary device">
                    <Descriptions column={2} size="small">
                      <Descriptions.Item label="Client type">
                        {user.clientType}
                      </Descriptions.Item>
                      <Descriptions.Item label="Last seen">
                        {user.lastSeen
                          ? dayjs(user.lastSeen).fromNow()
                          : "Never"}
                      </Descriptions.Item>
                      <Descriptions.Item label="FCM token">
                        {user.firebaseUser?.fcmToken ? "Registered" : "—"}
                      </Descriptions.Item>
                      <Descriptions.Item label="FCM updated">
                        {user.firebaseUser?.updatedAt
                          ? dayjs(user.firebaseUser.updatedAt).fromNow()
                          : "—"}
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                  <Card
                    size="small"
                    title={`Active sessions (${user.sessions?.length || 0})`}
                    style={{ marginTop: 16 }}
                  >
                    {user.sessions && user.sessions.length > 0 ? (
                      <Table
                        size="small"
                        pagination={false}
                        rowKey="sessionToken"
                        dataSource={user.sessions}
                        columns={[
                          {
                            title: "Session",
                            dataIndex: "sessionToken",
                            render: (v: string) => v.substring(0, 20) + "…",
                          },
                          {
                            title: "Expires",
                            dataIndex: "expires",
                            render: (v) => dayjs(v).format("YYYY-MM-DD HH:mm"),
                          },
                        ]}
                      />
                    ) : (
                      <Empty description="No active sessions" />
                    )}
                  </Card>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <GrantSubscriptionModal
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        onSuccess={load}
        presetUser={
          user ? { id: user.id, name: user.name, email: user.email } : null
        }
        hasExistingSubscription={
          !!user?.subscription &&
          (user.subscription.status === "active" ||
            user.subscription.status === "cancelling")
        }
      />

      <Modal
        title="Adjust AI Credits"
        open={adjustOpen}
        onCancel={() => setAdjustOpen(false)}
        onOk={handleAdjustSave}
        confirmLoading={adjustSaving}
        okText="Save"
        okButtonProps={{ style: { background: PRIMARY, borderColor: PRIMARY } }}
      >
        <Form layout="vertical">
          <Form.Item label="Plan credits" required>
            <Input
              type="number"
              min={0}
              value={adjustPlan}
              onChange={(e) => setAdjustPlan(parseInt(e.target.value, 10) || 0)}
            />
          </Form.Item>
          <Form.Item label="Addon credits" required>
            <Input
              type="number"
              min={0}
              value={adjustAddon}
              onChange={(e) =>
                setAdjustAddon(parseInt(e.target.value, 10) || 0)
              }
            />
          </Form.Item>
          <Form.Item label="Reason / note (optional)">
            <Input.TextArea
              rows={2}
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. customer credit refund"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function PlanTag({ user }: { user: UserDetail }) {
  if (user.hasPro && user.currentVersion === "team")
    return <Tag color="purple">Team</Tag>;
  if (user.hasPro) return <Tag color="blue">Pro</Tag>;
  if (user.currentVersion === "team") return <Tag color="purple">Team</Tag>;
  return <Tag>Free</Tag>;
}

function actionColor(action: string): string {
  const a = action.toLowerCase();
  if (a.includes("login")) return "blue";
  if (a.includes("flow") && a.includes("create")) return "green";
  if (a.includes("ai") || a.includes("generate")) return "purple";
  if (a.includes("subscription") || a.includes("pay")) return "orange";
  if (a.includes("error") || a.includes("fail")) return "red";
  return "gray";
}

function AdminNoteField({
  initialValue,
  onBlurSave,
}: {
  initialValue: string;
  onBlurSave: (value: string) => void;
}) {
  const [v, setV] = useState(initialValue);
  useEffect(() => setV(initialValue), [initialValue]);
  return (
    <Input.TextArea
      rows={3}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onBlurSave(v)}
      placeholder="Internal note — auto-saves on blur"
      style={{ marginTop: 8 }}
    />
  );
}
