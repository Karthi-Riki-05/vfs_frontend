"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  message,
  Alert,
  Tag,
  Space,
  Modal,
  Radio,
} from "antd";
import {
  SendOutlined,
  BellOutlined,
  ToolOutlined,
  ExperimentOutlined,
  NotificationOutlined,
} from "@ant-design/icons";
import { superAdminApi, BroadcastResult } from "@/api/superAdmin.api";

const { Title, Text, Paragraph } = Typography;

type Kind = "test" | "maintenance" | "announcement";

const PRESETS: Record<
  Kind,
  { title: string; body: string; url?: string; helper: string }
> = {
  test: {
    title: "ValueChart",
    body: "Welcome",
    url: "/dashboard",
    helper: "Quick test push to verify the FCM pipeline.",
  },
  maintenance: {
    title: "Scheduled Maintenance",
    body: "ValueChart will be undergoing maintenance shortly. Please save your work.",
    url: "/dashboard",
    helper:
      "Use before downtime so every active device gets a heads-up. Sends to ALL registered devices.",
  },
  announcement: {
    title: "ValueChart Update",
    body: "A new feature is now available — open the app to check it out.",
    url: "/dashboard",
    helper: "General announcement for product updates or news.",
  },
};

export default function SuperAdminNotificationsPage() {
  const [form] = Form.useForm();
  const [kind, setKind] = useState<Kind>("test");
  const [loading, setLoading] = useState(false);
  const [deviceCount, setDeviceCount] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<BroadcastResult | null>(null);

  const loadDeviceCount = async () => {
    try {
      const res = await superAdminApi.countDevices();
      setDeviceCount(res.data?.data?.total ?? 0);
    } catch {
      setDeviceCount(null);
    }
  };

  useEffect(() => {
    loadDeviceCount();
  }, []);

  useEffect(() => {
    const p = PRESETS[kind];
    form.setFieldsValue({ title: p.title, body: p.body, url: p.url });
  }, [kind, form]);

  const submit = async (values: {
    title: string;
    body: string;
    url?: string;
  }) => {
    if (!deviceCount || deviceCount === 0) {
      message.warning("No devices have registered for push notifications yet");
      return;
    }

    if (kind === "maintenance") {
      const ok = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: `Send maintenance alert to ${deviceCount} devices?`,
          content:
            "Every user with notifications enabled will receive this push. Make sure the message and timing are correct.",
          okText: "Yes, send to all",
          okType: "danger",
          cancelText: "Cancel",
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!ok) return;
    }

    setLoading(true);
    setLastResult(null);
    try {
      const res = await superAdminApi.broadcastNotification({
        ...values,
        kind,
      });
      const data = res.data?.data;
      setLastResult(data);
      if (data && data.total === 0) {
        message.warning("No registered devices to send to");
      } else {
        message.success(`Sent to ${data.sent} of ${data.total} devices`);
      }
      loadDeviceCount();
    } catch (e: any) {
      message.error(
        e?.response?.data?.error?.message ||
          e?.message ||
          "Failed to send broadcast",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 760 }}>
      <Title level={3} style={{ marginBottom: 4 }}>
        <NotificationOutlined /> Push Notifications
      </Title>
      <Text type="secondary">
        Send Firebase push notifications to every device that has registered an
        FCM token. Use for tests, maintenance windows, or announcements.
      </Text>

      <Card style={{ marginTop: 16 }}>
        <Space style={{ marginBottom: 16 }} size="small" wrap>
          <Tag color="blue" icon={<BellOutlined />}>
            Registered devices: {deviceCount === null ? "—" : deviceCount}
          </Tag>
          <Button size="small" type="link" onClick={loadDeviceCount}>
            Refresh
          </Button>
        </Space>

        <Form
          form={form}
          layout="vertical"
          onFinish={submit}
          initialValues={PRESETS.test}
        >
          <Form.Item label="Type">
            <Radio.Group
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="test">
                <ExperimentOutlined /> Test
              </Radio.Button>
              <Radio.Button value="maintenance">
                <ToolOutlined /> Maintenance
              </Radio.Button>
              <Radio.Button value="announcement">
                <BellOutlined /> Announcement
              </Radio.Button>
            </Radio.Group>
            <Paragraph
              type="secondary"
              style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}
            >
              {PRESETS[kind].helper}
            </Paragraph>
          </Form.Item>

          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: "Title is required" }]}
          >
            <Input maxLength={60} placeholder="ValueChart" />
          </Form.Item>

          <Form.Item
            label="Message"
            name="body"
            rules={[{ required: true, message: "Message is required" }]}
          >
            <Input.TextArea
              rows={3}
              maxLength={200}
              showCount
              placeholder="Welcome"
            />
          </Form.Item>

          <Form.Item
            label="Click URL (optional)"
            name="url"
            tooltip="Where the user lands when they click the notification"
          >
            <Input placeholder="/dashboard" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SendOutlined />}
              loading={loading}
              size="large"
              danger={kind === "maintenance"}
            >
              {kind === "maintenance"
                ? "Send Maintenance Alert"
                : "Send to All Devices"}
            </Button>
          </Form.Item>
        </Form>

        {lastResult && (
          <Alert
            style={{ marginTop: 20 }}
            type={lastResult.failed > 0 ? "warning" : "success"}
            message="Broadcast complete"
            description={
              <div style={{ fontSize: 13 }}>
                <div>Total tokens targeted: {lastResult.total}</div>
                <div>Delivered: {lastResult.sent}</div>
                <div>Failed: {lastResult.failed}</div>
                {lastResult.cleaned > 0 && (
                  <div>Cleared {lastResult.cleaned} expired tokens</div>
                )}
              </div>
            }
            showIcon
          />
        )}
      </Card>

      <Alert
        style={{ marginTop: 16 }}
        type="info"
        showIcon
        message="How it works"
        description={
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            <li>
              Hits every row in <code>firebase_users</code> with a non-null FCM
              token.
            </li>
            <li>
              Uses <code>sendEachForMulticast</code> — fans out in one batch.
            </li>
            <li>
              Expired tokens are auto-cleaned from the DB after each broadcast.
            </li>
            <li>
              All sends are written to the admin audit log (action:{" "}
              <code>notification_broadcast</code>).
            </li>
          </ul>
        }
      />
    </div>
  );
}
