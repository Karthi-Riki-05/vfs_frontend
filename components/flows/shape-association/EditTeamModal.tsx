"use client";

import React, { useEffect, useState } from "react";
import { Modal, Form, Input, List, Button, Avatar, message, Spin } from "antd";
import {
  TeamOutlined,
  UserAddOutlined,
  DeleteOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { teamsApi } from "@/api/teams.api";

interface Props {
  open: boolean;
  teamId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditTeamModal({
  open,
  teamId,
  onClose,
  onSuccess,
}: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  const loadTeam = async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const [teamRes, membersRes] = await Promise.all([
        teamsApi.get(teamId),
        teamsApi.listMembers(teamId),
      ]);
      const team = teamRes.data?.data || teamRes.data;
      const memberList = membersRes.data?.data || membersRes.data;
      form.setFieldsValue({ name: team?.name });
      setMembers(Array.isArray(memberList) ? memberList : []);
    } catch {
      message.error("Failed to load team details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && teamId) loadTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teamId]);

  const handleAddMember = async () => {
    const email = newEmail.trim();
    if (!teamId || !email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      message.warning("Enter a valid email address");
      return;
    }
    setAddingMember(true);
    try {
      await teamsApi.addMember(teamId, { email });
      setNewEmail("");
      message.success("Member added");
      loadTeam();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to add member",
      );
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!teamId) return;
    try {
      await teamsApi.removeMember(teamId, userId);
      message.success("Member removed");
      loadTeam();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to remove member",
      );
    }
  };

  const handleSave = async () => {
    if (!teamId) return;
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      await teamsApi.update(teamId, { name: values.name });
      message.success("Team updated");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to update team",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      confirmLoading={saving}
      okText="Save"
      okButtonProps={{
        style: { backgroundColor: "#3CB371", borderColor: "#3CB371" },
      }}
      title={
        <span>
          <TeamOutlined style={{ color: "#3CB371", marginRight: 8 }} />
          Edit Team
        </span>
      }
      width={480}
      centered
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 32 }}>
          <Spin />
        </div>
      ) : (
        <>
          <Form form={form} layout="vertical">
            <Form.Item
              name="name"
              label="Team name"
              rules={[{ required: true, message: "Team name is required" }]}
            >
              <Input maxLength={255} />
            </Form.Item>
          </Form>

          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
            Members
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Input
              placeholder="Add member by email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onPressEnter={handleAddMember}
            />
            <Button
              icon={<UserAddOutlined />}
              loading={addingMember}
              onClick={handleAddMember}
            >
              Add
            </Button>
          </div>
          <List
            size="small"
            dataSource={Array.isArray(members) ? members : []}
            locale={{ emptyText: "No members yet" }}
            style={{ maxHeight: 220, overflow: "auto" }}
            renderItem={(m: any) => {
              const user = m.user || m;
              return (
                <List.Item
                  actions={[
                    <Button
                      key="remove"
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveMember(user.id)}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar size="small" icon={<UserOutlined />} />}
                    title={user.name || user.email}
                    description={user.name ? user.email : undefined}
                  />
                </List.Item>
              );
            }}
          />
        </>
      )}
    </Modal>
  );
}
