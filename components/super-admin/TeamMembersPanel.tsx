"use client";

import React, { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Progress,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  PlusOutlined,
  UserDeleteOutlined,
  TeamOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { superAdminApi, TeamDetail, TeamMemberRow } from "@/api/superAdmin.api";

const PRIMARY = "#3CB371";
const { Text } = Typography;

interface Props {
  userId: string;
}

export default function TeamMembersPanel({ userId }: Props) {
  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addEmail, setAddEmail] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await superAdminApi.getUserTeam(userId);
      setTeam(res.data?.data?.team || null);
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to load team",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleAdd = async () => {
    if (!addEmail.trim()) {
      message.error("Enter an email");
      return;
    }
    setAdding(true);
    try {
      await superAdminApi.addTeamMember(userId, {
        email: addEmail.trim().toLowerCase(),
      });
      message.success("Member added");
      setAddOpen(false);
      setAddEmail("");
      load();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to add member",
      );
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = (member: TeamMemberRow) => {
    Modal.confirm({
      title: `Remove ${member.user.name || member.user.email}?`,
      content: "They will lose team access immediately.",
      okText: "Remove",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await superAdminApi.removeTeamMember(userId, member.id);
          message.success("Member removed");
          load();
        } catch (err: any) {
          message.error(
            err?.response?.data?.error?.message || "Failed to remove member",
          );
        }
      },
    });
  };

  if (loading) {
    return <Empty description="Loading team…" />;
  }

  if (!team) {
    return (
      <Alert
        type="info"
        message="No team"
        description="This user owns a Team plan but no team record exists yet. Granting a Team subscription will create one automatically."
        showIcon
      />
    );
  }

  const columns: ColumnsType<TeamMemberRow> = [
    {
      title: "Member",
      render: (_, m) => (
        <Space>
          <Avatar size="small" src={m.user.image || undefined}>
            {m.user.name?.[0] || m.user.email?.[0]}
          </Avatar>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {m.user.name || "Unnamed"}
            </div>
            <div style={{ fontSize: 11, color: "#8C8C8C" }}>{m.user.email}</div>
          </div>
        </Space>
      ),
    },
    {
      title: "Role",
      dataIndex: "role",
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: "Status",
      render: (_, m) =>
        m.user.suspendedAt ? (
          <Tag color="orange">Suspended</Tag>
        ) : m.user.userStatus === "deleted" ? (
          <Tag color="red">Deleted</Tag>
        ) : (
          <Tag color="green">Active</Tag>
        ),
    },
    {
      title: "Last seen",
      render: (_, m) =>
        m.user.lastSeen ? (
          <Text style={{ fontSize: 12 }}>
            {dayjs(m.user.lastSeen).fromNow()}
          </Text>
        ) : (
          <Text type="secondary">Never</Text>
        ),
    },
    {
      title: "Joined",
      dataIndex: "joinedAt",
      render: (v: string) => (
        <Text style={{ fontSize: 12 }}>{dayjs(v).format("YYYY-MM-DD")}</Text>
      ),
    },
    {
      title: "Actions",
      align: "right" as const,
      render: (_, m) => (
        <Button
          size="small"
          danger
          icon={<UserDeleteOutlined />}
          onClick={() => handleRemove(m)}
        >
          Remove
        </Button>
      ),
    },
  ];

  const pct = team.maxMembers
    ? Math.round((team.seatsUsed / team.maxMembers) * 100)
    : 0;

  return (
    <div>
      <Card
        size="small"
        bodyStyle={{ padding: 16 }}
        style={{ marginBottom: 16 }}
      >
        <Space
          style={{ width: "100%", justifyContent: "space-between" }}
          align="start"
        >
          <Space direction="vertical" size={2}>
            <Space>
              <TeamOutlined style={{ color: PRIMARY }} />
              <Text strong>{team.name || "Team"}</Text>
              <Tag color="purple">Team plan</Tag>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Owner: {team.owner.name || team.owner.email}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Created {dayjs(team.createdAt).format("MMM D, YYYY")}
            </Text>
          </Space>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load}>
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddOpen(true)}
              disabled={team.seatsAvailable <= 0}
              style={{ background: PRIMARY, borderColor: PRIMARY }}
            >
              Add Member
            </Button>
          </Space>
        </Space>
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "#595959",
              marginBottom: 4,
            }}
          >
            <span>
              {team.seatsUsed} / {team.maxMembers} seats used
            </span>
            <span>{team.seatsAvailable} available</span>
          </div>
          <Progress
            percent={pct}
            showInfo={false}
            strokeColor={pct >= 100 ? "#FA541C" : PRIMARY}
          />
        </div>
        {team.seatsAvailable <= 0 && (
          <Alert
            style={{ marginTop: 12 }}
            type="warning"
            showIcon
            message="Seat limit reached. Grant a larger team plan to add more members."
          />
        )}
      </Card>

      <Table<TeamMemberRow>
        rowKey="id"
        size="middle"
        columns={columns}
        dataSource={team.members}
        pagination={false}
        locale={{ emptyText: "No members yet" }}
      />

      <Modal
        title="Add Team Member"
        open={addOpen}
        onCancel={() => setAddOpen(false)}
        onOk={handleAdd}
        confirmLoading={adding}
        okText="Add"
        okButtonProps={{ style: { background: PRIMARY, borderColor: PRIMARY } }}
      >
        <Text type="secondary" style={{ fontSize: 12 }}>
          Enter the email of an existing user. They must already have an
          account; create one from the Users page first if needed.
        </Text>
        <Input
          style={{ marginTop: 12 }}
          placeholder="user@example.com"
          value={addEmail}
          onChange={(e) => setAddEmail(e.target.value)}
          onPressEnter={handleAdd}
        />
      </Modal>
    </div>
  );
}
