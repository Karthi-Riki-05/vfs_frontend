"use client";

import React, { useEffect, useState } from "react";
import { Modal, Form, Input, List, Button, Avatar, message, Spin } from "antd";
import {
  MessageOutlined,
  UserAddOutlined,
  DeleteOutlined,
  UserOutlined,
} from "@ant-design/icons";
import api from "@/lib/axios";

interface Props {
  open: boolean;
  groupId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditGroupModal({
  open,
  groupId,
  onClose,
  onSuccess,
}: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  const loadGroup = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const res = await api.get(`/chat/groups/${groupId}/info`);
      const info = res.data?.data || res.data;
      form.setFieldsValue({ name: info?.title });
      setMembers(Array.isArray(info?.members) ? info.members : []);
      setIsAdmin(!!info?.isAdmin);
    } catch {
      message.error("Failed to load group details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && groupId) loadGroup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, groupId]);

  const handleAddMember = async () => {
    const email = newEmail.trim();
    if (!groupId || !email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      message.warning("Enter a valid email address");
      return;
    }
    setAddingMember(true);
    try {
      // Backend addMember resolves emails passed in the userId field
      await api.post(`/chat/groups/${groupId}/members`, { userId: email });
      setNewEmail("");
      message.success("Member added");
      loadGroup();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to add member",
      );
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!groupId) return;
    try {
      await api.delete(`/chat/groups/${groupId}/members/${userId}`);
      message.success("Member removed");
      loadGroup();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to remove member",
      );
    }
  };

  const handleSave = async () => {
    if (!groupId) return;
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      await api.put(`/chat/groups/${groupId}`, { title: values.name });
      message.success("Group updated");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to update group",
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
        disabled: !isAdmin,
      }}
      title={
        <span>
          <MessageOutlined style={{ color: "#3CB371", marginRight: 8 }} />
          Edit Chat Group
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
          {!isAdmin && (
            <div
              style={{
                background: "#fffbe6",
                border: "1px solid #ffe58f",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 12,
                color: "#ad6800",
                marginBottom: 12,
              }}
            >
              Only the group creator can rename the group or manage members.
            </div>
          )}
          <Form form={form} layout="vertical">
            <Form.Item
              name="name"
              label="Group name"
              rules={[{ required: true, message: "Group name is required" }]}
            >
              <Input maxLength={255} disabled={!isAdmin} />
            </Form.Item>
          </Form>

          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
            Members
          </div>
          {isAdmin && (
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
          )}
          <List
            size="small"
            dataSource={Array.isArray(members) ? members : []}
            locale={{ emptyText: "No members yet" }}
            style={{ maxHeight: 220, overflow: "auto" }}
            renderItem={(m: any) => (
              <List.Item
                actions={
                  isAdmin && m.role !== "admin"
                    ? [
                        <Button
                          key="remove"
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveMember(m.id)}
                        />,
                      ]
                    : []
                }
              >
                <List.Item.Meta
                  avatar={<Avatar size="small" icon={<UserOutlined />} />}
                  title={`${m.name || m.email}${m.role === "admin" ? " (admin)" : ""}`}
                  description={m.name ? m.email : undefined}
                />
              </List.Item>
            )}
          />
        </>
      )}
    </Modal>
  );
}
