"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Typography,
  Button,
  List,
  Modal,
  Form,
  Input,
  Avatar,
  Tag,
  Popconfirm,
  message,
  Spin,
} from "antd";
import {
  UserOutlined,
  PlusOutlined,
  DeleteOutlined,
  MailOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import { teamsApi } from "@/api/teams.api";
import { useParams, useRouter } from "next/navigation";

const { Title, Text } = Typography;

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params?.id as string;
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!teamId) return;
    Promise.all([teamsApi.get(teamId), teamsApi.listMembers(teamId)])
      .then(([teamRes, membersRes]) => {
        const teamData = teamRes.data?.data || teamRes.data;
        setTeam(teamData);
        const mData = membersRes.data?.data || membersRes.data;
        setMembers(Array.isArray(mData) ? mData : []);
      })
      .catch(() => message.error("Failed to load team"))
      .finally(() => setLoading(false));
  }, [teamId]);

  const handleInvite = async () => {
    try {
      const values = await form.validateFields();
      setInviting(true);
      await teamsApi.invite({ email: values.email, teamId });
      message.success("Invitation sent");
      form.resetFields();
      setInviteOpen(false);
      // Refresh members
      const res = await teamsApi.listMembers(teamId);
      const mData = res.data?.data || res.data;
      setMembers(Array.isArray(mData) ? mData : []);
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        "Failed to invite";
      message.error(errMsg);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await teamsApi.removeMember(teamId, userId);
      message.success("Member removed");
      setMembers((prev) =>
        prev.filter((m) => m.userId !== userId && m.id !== userId),
      );
    } catch {
      message.error("Failed to remove member");
    }
  };

  const roleLabel = (role?: string) => {
    const r = (role || "MEMBER").toUpperCase();
    return r === "OWNER" ? "Owner" : r === "ADMIN" ? "Admin" : "Member";
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: 100 }}>
        <Spin size="large" />
      </div>
    );

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px" }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => router.push("/dashboard/teams")}
        style={{ marginBottom: 16 }}
      >
        Back to Teams
      </Button>

      {/* Team header card */}
      <Card style={{ marginBottom: 16, borderRadius: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Title
              level={3}
              style={{ margin: 0 }}
              ellipsis={{ tooltip: team?.name }}
            >
              {team?.name || `Team #${team?.id?.slice(-6) || ""}`}
            </Title>
            {team?.description ? (
              <Text type="secondary">{team.description}</Text>
            ) : (
              <Text italic style={{ color: "#BFBFBF" }}>
                No description
              </Text>
            )}
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setInviteOpen(true)}
            style={{
              background: "#3CB371",
              borderColor: "#3CB371",
              borderRadius: 8,
            }}
          >
            Invite Member
          </Button>
        </div>
        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid #F0F0F0",
          }}
        >
          <Text strong style={{ fontSize: 18 }}>
            {members.length}
          </Text>{" "}
          <Text type="secondary" style={{ fontSize: 13 }}>
            {members.length === 1 ? "Member" : "Members"}
          </Text>
        </div>
      </Card>

      {/* Members list */}
      <Card
        title={`Members (${members.length})`}
        style={{ borderRadius: 16 }}
        styles={{ body: { padding: 0 } }}
      >
        <List
          dataSource={members}
          locale={{ emptyText: "No members yet" }}
          renderItem={(m: any) => {
            const role = (m.role || "MEMBER").toUpperCase();
            const isOwner = role === "OWNER";
            const name = m.user?.name || m.email || "Team Member";
            return (
              <List.Item
                style={{ padding: "12px 16px" }}
                actions={[
                  <Tag
                    key="role"
                    color={
                      isOwner ? "green" : role === "ADMIN" ? "blue" : "default"
                    }
                    style={{ marginInlineEnd: 0 }}
                  >
                    {roleLabel(role)}
                  </Tag>,
                  ...(isOwner
                    ? []
                    : [
                        <Popconfirm
                          key="remove"
                          title="Remove this member?"
                          onConfirm={() => handleRemove(m.userId || m.id)}
                        >
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                            aria-label="Remove member"
                            style={{
                              minWidth: 44,
                              minHeight: 44,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          />
                        </Popconfirm>,
                      ]),
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      src={m.user?.image}
                      style={{ backgroundColor: "#E8F5E9", color: "#3CB371" }}
                    >
                      {name?.[0]?.toUpperCase() || <UserOutlined />}
                    </Avatar>
                  }
                  title={<Text strong>{name}</Text>}
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {m.user?.email || m.email}
                    </Text>
                  }
                />
              </List.Item>
            );
          }}
        />
      </Card>

      <Modal
        title="Invite Member"
        open={inviteOpen}
        onCancel={() => setInviteOpen(false)}
        onOk={handleInvite}
        confirmLoading={inviting}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              {
                required: true,
                type: "email",
                message: "Please enter a valid email address",
              },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="member@example.com" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
