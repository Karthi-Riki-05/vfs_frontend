"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  List,
  Modal,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import {
  SafetyCertificateOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  PlusOutlined,
  DeleteOutlined,
  ApiOutlined,
  ThunderboltFilled,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useSession } from "next-auth/react";
import { superAdminApi, UserSearchResult } from "@/api/superAdmin.api";
import UserSearchSelect from "@/components/super-admin/UserSearchSelect";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

const PRIMARY = "#3CB371";
const NAVY = "#1F3864";

interface SettingsData {
  plans: {
    id: string;
    name: string;
    duration: string;
    price: number;
    tier: number;
  }[];
  superAdmins: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    createdAt: string;
    lastSeen: string | null;
  }[];
  apiKeys: {
    openai: boolean;
    anthropic: boolean;
    gemini: boolean;
    stripe: boolean;
  };
  aiCreditDefaults: { free: number; pro: number; team: number };
  flowLimitDefaults: { free: number; pro: string };
}

export default function SuperAdminSettingsPage() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;

  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addTarget, setAddTarget] = useState<UserSearchResult | null>(null);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getSettings();
      setData(res.data?.data || null);
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to load settings",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const [testResults, setTestResults] = useState<
    Record<
      string,
      { status: string; responseTime?: number; error?: string } | null
    >
  >({});
  const [testing, setTesting] = useState<string | null>(null);

  const handleTest = async (
    service: "openai" | "anthropic" | "gemini" | "stripe",
  ) => {
    setTesting(service);
    try {
      const res = await superAdminApi.testApiConnection(service);
      const d = res.data?.data;
      setTestResults((prev) => ({
        ...prev,
        [service]: {
          status: d.status,
          responseTime: d.responseTime,
          error: d.error,
        },
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [service]: {
          status: "failed",
          error:
            err?.response?.data?.error?.message ||
            err?.message ||
            "Request failed",
        },
      }));
    } finally {
      setTesting(null);
    }
  };

  const handleAdd = async () => {
    if (!addTarget) {
      message.error("Please pick a user");
      return;
    }
    setAdding(true);
    try {
      await superAdminApi.addSuperAdmin(addTarget.id);
      message.success("Super admin role granted");
      setAddOpen(false);
      setAddTarget(null);
      load();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to grant role",
      );
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = (admin: SettingsData["superAdmins"][0]) => {
    if (admin.id === currentUserId) {
      message.warning("You cannot remove your own super admin role");
      return;
    }
    Modal.confirm({
      title: `Remove super admin role from ${admin.name || admin.email}?`,
      content:
        "They will lose access to this panel immediately on their next session refresh.",
      okText: "Revoke",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await superAdminApi.removeSuperAdmin(admin.id);
          message.success("Super admin role revoked");
          load();
        } catch (err: any) {
          message.error(
            err?.response?.data?.error?.message || "Failed to revoke role",
          );
          throw err;
        }
      },
    });
  };

  if (loading || !data) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={4} style={{ margin: "0 0 16px" }}>
        Settings
      </Title>

      <Row gutter={[16, 16]}>
        {/* SECTION 1 — AI credits */}
        <Col xs={24} lg={12}>
          <Card
            size="small"
            title={
              <Space>
                <ThunderboltFilled style={{ color: PRIMARY }} />
                AI Credits per Plan
              </Space>
            }
            extra={
              <Text type="secondary" style={{ fontSize: 11 }}>
                monthly AI diagram generation
              </Text>
            }
          >
            <List
              size="small"
              dataSource={[
                {
                  plan: "Free",
                  credits: data.aiCreditDefaults.free,
                  model: "Gemini 2.5 Flash",
                  color: "default",
                },
                {
                  plan: "Pro",
                  credits: data.aiCreditDefaults.pro,
                  model: "Claude Sonnet 4.5",
                  color: "blue",
                },
                {
                  plan: "Team",
                  credits: data.aiCreditDefaults.team,
                  model: "Claude Sonnet 4.5",
                  color: "purple",
                },
              ]}
              renderItem={(row) => (
                <List.Item>
                  <Space>
                    <Tag color={row.color as any}>{row.plan}</Tag>
                    <Text strong>{row.credits}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      credits / month
                    </Text>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {row.model}
                  </Text>
                </List.Item>
              )}
            />
            <Text
              type="secondary"
              style={{ fontSize: 11, marginTop: 8, display: "block" }}
            >
              Adjust individual user credits from User Detail → Subscription
              tab.
            </Text>
          </Card>
        </Col>

        {/* SECTION 2 — API key status */}
        <Col xs={24} lg={12}>
          <Card
            size="small"
            title={
              <Space>
                <ApiOutlined style={{ color: NAVY }} />
                Connected Services
              </Space>
            }
            extra={
              <Text type="secondary" style={{ fontSize: 11 }}>
                external API status
              </Text>
            }
          >
            <List
              size="small"
              dataSource={
                [
                  { key: "openai", label: "OpenAI" },
                  { key: "anthropic", label: "Anthropic" },
                  { key: "gemini", label: "Gemini" },
                  { key: "stripe", label: "Stripe" },
                ] as const
              }
              renderItem={(item) => {
                const configured =
                  data.apiKeys[item.key as keyof typeof data.apiKeys];
                const testResult = testResults[item.key];
                const isTestingThis = testing === item.key;
                return (
                  <List.Item
                    actions={[
                      <Button
                        key="test"
                        size="small"
                        loading={isTestingThis}
                        disabled={!configured}
                        onClick={() => handleTest(item.key)}
                      >
                        Test
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        configured ? (
                          <CheckCircleFilled
                            style={{ color: PRIMARY, fontSize: 18 }}
                          />
                        ) : (
                          <CloseCircleFilled
                            style={{ color: "#D9D9D9", fontSize: 18 }}
                          />
                        )
                      }
                      title={<Text strong>{item.label}</Text>}
                      description={
                        testResult ? (
                          testResult.status === "connected" ? (
                            <Tag color="green" style={{ fontSize: 11 }}>
                              ✓ Connected ({testResult.responseTime}ms)
                            </Tag>
                          ) : testResult.status === "not_configured" ? (
                            <Tag style={{ fontSize: 11 }}>Not configured</Tag>
                          ) : (
                            <Tag color="red" style={{ fontSize: 11 }}>
                              ✗ {testResult.error?.slice(0, 60) || "Failed"}
                            </Tag>
                          )
                        ) : (
                          <Tag color={configured ? "green" : "default"}>
                            {configured ? "Connected" : "Not configured"}
                          </Tag>
                        )
                      }
                    />
                  </List.Item>
                );
              }}
            />
            <Text
              type="secondary"
              style={{ fontSize: 11, marginTop: 8, display: "block" }}
            >
              Configured via server-side environment variables. Never displayed.
            </Text>
          </Card>
        </Col>

        {/* SECTION 3 — Flow limits */}
        <Col xs={24} lg={12}>
          <Card size="small" title="Flow Limits">
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Free plan">
                <Text strong>{data.flowLimitDefaults.free}</Text> flows max
              </Descriptions.Item>
              <Descriptions.Item label="Pro plan">
                {data.flowLimitDefaults.pro}
              </Descriptions.Item>
            </Descriptions>
            <Text
              type="secondary"
              style={{ fontSize: 12, marginTop: 8, display: "block" }}
            >
              Per-user: set <code>proFlowLimit</code> or{" "}
              <code>proUnlimitedFlows</code> from the user's Edit form.
            </Text>
          </Card>
        </Col>

        {/* SECTION 4 — Plans in DB */}
        <Col xs={24} lg={12}>
          <Card size="small" title="Plans (from database)">
            {data.plans.length === 0 ? (
              <Empty description="No plans seeded" />
            ) : (
              <List
                size="small"
                dataSource={data.plans}
                renderItem={(p) => (
                  <List.Item>
                    <Space>
                      <Tag
                        color={
                          p.tier === 0
                            ? "default"
                            : p.tier === 1
                              ? "blue"
                              : "purple"
                        }
                      >
                        Tier {p.tier}
                      </Tag>
                      <Text strong>{p.name}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {p.duration}
                      </Text>
                    </Space>
                    <Text>${p.price.toFixed(2)}</Text>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        {/* SECTION 5 — Super admins */}
        <Col span={24}>
          <Card
            size="small"
            title={
              <Space>
                <SafetyCertificateOutlined style={{ color: PRIMARY }} />
                Super Admins
                <Badge
                  count={data.superAdmins.length}
                  showZero
                  style={{ backgroundColor: PRIMARY }}
                />
              </Space>
            }
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAddOpen(true)}
                style={{ background: PRIMARY, borderColor: PRIMARY }}
              >
                Add Super Admin
              </Button>
            }
          >
            {data.superAdmins.length === 0 ? (
              <Empty description="No super admins — dangerous state!" />
            ) : (
              <List
                dataSource={data.superAdmins}
                renderItem={(admin) => {
                  const isSelf = admin.id === currentUserId;
                  return (
                    <List.Item
                      actions={[
                        <Button
                          key="remove"
                          size="small"
                          danger
                          disabled={isSelf}
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemove(admin)}
                        >
                          {isSelf ? "You" : "Revoke"}
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <Avatar src={admin.image || undefined}>
                            {admin.name?.[0] || admin.email?.[0]}
                          </Avatar>
                        }
                        title={
                          <Space>
                            <Text strong>{admin.name || "Unnamed"}</Text>
                            {isSelf && <Tag color={PRIMARY}>you</Tag>}
                          </Space>
                        }
                        description={
                          <div>
                            <div style={{ fontSize: 12, color: "#8C8C8C" }}>
                              {admin.email}
                            </div>
                            <div style={{ fontSize: 11, color: "#BFBFBF" }}>
                              Granted {dayjs(admin.createdAt).fromNow()}
                              {admin.lastSeen &&
                                ` · Last seen ${dayjs(admin.lastSeen).fromNow()}`}
                            </div>
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title="Add Super Admin"
        open={addOpen}
        onCancel={() => {
          setAddOpen(false);
          setAddTarget(null);
        }}
        onOk={handleAdd}
        confirmLoading={adding}
        okText="Grant Super Admin"
        okButtonProps={{ style: { background: PRIMARY, borderColor: PRIMARY } }}
      >
        <Alert
          type="warning"
          showIcon
          message="Super admins have full access: users, subscriptions, credits, logs, settings. Be careful who you grant this to."
          style={{ marginBottom: 16 }}
        />
        <div style={{ marginBottom: 8 }}>
          <Text>Find the user to promote:</Text>
        </div>
        <UserSearchSelect
          value={addTarget}
          onChange={setAddTarget}
          placeholder="Search name or email (min 2 chars)"
        />
        {addTarget && (
          <div style={{ marginTop: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Will promote: <strong>{addTarget.name || addTarget.email}</strong>
            </Text>
          </div>
        )}
      </Modal>
    </div>
  );
}
