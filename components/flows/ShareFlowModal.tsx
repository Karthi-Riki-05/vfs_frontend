"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  Input,
  Select,
  Button,
  Avatar,
  Typography,
  Spin,
  Empty,
  Divider,
  message,
  Tag,
} from "antd";
import {
  SearchOutlined,
  UserOutlined,
  LockOutlined,
  EditOutlined,
  DeleteOutlined,
  ShareAltOutlined,
  MailOutlined,
  PlusOutlined,
  CrownOutlined,
} from "@ant-design/icons";
import { flowsApi } from "@/api/flows.api";

const { Text } = Typography;

interface ShareFlowModalProps {
  open: boolean;
  flow: { id: string; name: string } | null;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ShareMember {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface ExistingShare {
  id: string;
  permission: string;
  sharedWith: ShareMember;
  createdAt: string;
}

export default function ShareFlowModal({
  open,
  flow,
  onClose,
  onSuccess,
}: ShareFlowModalProps) {
  const [shares, setShares] = useState<ExistingShare[]>([]);
  const [allMembers, setAllMembers] = useState<ShareMember[]>([]);
  const [isProUser, setIsProUser] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [sharingUser, setSharingUser] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, string>>({});

  // Pro email invite state
  const [emailInput, setEmailInput] = useState("");
  const [emailPermission, setEmailPermission] = useState("view");
  const [emailSharing, setEmailSharing] = useState(false);

  const loadData = useCallback(async () => {
    if (!flow) return;
    setLoading(true);
    try {
      const [sharesRes, membersRes] = await Promise.all([
        flowsApi.getShares(flow.id),
        flowsApi.getAvailableShareMembers(),
      ]);
      const sharesList = sharesRes.data?.data || [];
      setShares(Array.isArray(sharesList) ? sharesList : []);

      // getAvailableShareMembers now returns { members, isProUser }
      const membersData = membersRes.data?.data;
      if (
        membersData &&
        typeof membersData === "object" &&
        "members" in membersData
      ) {
        setAllMembers(
          Array.isArray(membersData.members) ? membersData.members : [],
        );
        setIsProUser(!!membersData.isProUser);
      } else {
        // backward-compat: old shape was a plain array
        setAllMembers(Array.isArray(membersData) ? membersData : []);
        setIsProUser(false);
      }
    } catch {
      message.error("Failed to load share data");
    } finally {
      setLoading(false);
    }
  }, [flow]);

  useEffect(() => {
    if (open && flow) {
      loadData();
      setSearch("");
      setPermissions({});
      setEmailInput("");
      setEmailPermission("view");
    }
  }, [open, flow, loadData]);

  const sharedIds = new Set(shares.map((s) => s.sharedWith?.id));
  const availableMembers = allMembers.filter((m) => !sharedIds.has(m.id));
  const filteredMembers = availableMembers.filter(
    (m) =>
      m.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleShare = async (userId: string) => {
    if (!flow) return;
    const perm = permissions[userId] || "view";
    setSharingUser(userId);
    try {
      await flowsApi.shareFlow(flow.id, [{ userId, permission: perm }]);
      message.success("Flow shared");
      await loadData();
      onSuccess?.();
    } catch {
      message.error("Failed to share flow");
    } finally {
      setSharingUser(null);
    }
  };

  const handleShareByEmail = async () => {
    if (!flow || !emailInput.trim()) return;

    // Support comma-separated emails
    const emails = emailInput
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (emails.length === 0) return;

    setEmailSharing(true);
    try {
      const sharePayload = emails.map((email) => ({
        email,
        permission: emailPermission,
      }));
      const res = await flowsApi.shareFlow(flow.id, sharePayload);
      const results: { email?: string; error?: string; success?: boolean }[] =
        res.data?.data || [];

      const successes = results.filter((r) => r.success);
      const failures = results.filter((r) => r.error);

      if (successes.length > 0) {
        message.success(
          `Flow shared with ${successes.length} user${successes.length > 1 ? "s" : ""}`,
        );
      }
      failures.forEach((f) => {
        if (f.error === "USER_NOT_FOUND") {
          message.error(`User not found: ${f.email}`);
        } else {
          message.error(f.error || "Failed to share");
        }
      });

      setEmailInput("");
      await loadData();
      if (successes.length > 0) onSuccess?.();
    } catch {
      message.error("Failed to share flow");
    } finally {
      setEmailSharing(false);
    }
  };

  const handleChangePermission = async (
    shareId: string,
    newPermission: string,
  ) => {
    if (!flow) return;
    try {
      await flowsApi.updateShare(flow.id, shareId, newPermission);
      message.success("Permission updated");
      await loadData();
    } catch {
      message.error("Failed to update permission");
    }
  };

  const handleRemove = async (shareId: string) => {
    if (!flow) return;
    try {
      await flowsApi.removeShare(flow.id, shareId);
      message.success("Access removed");
      await loadData();
      onSuccess?.();
    } catch {
      message.error("Failed to remove access");
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ShareAltOutlined style={{ color: "#3CB371" }} />
          <span>Share &quot;{flow?.name}&quot;</span>
          {isProUser && (
            <Tag
              icon={<CrownOutlined />}
              color="gold"
              style={{ fontSize: 11, marginLeft: 4 }}
            >
              Pro
            </Tag>
          )}
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <Spin />
        </div>
      ) : (
        <>
          {/* Pro: share by email */}
          {isProUser && (
            <>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Share by email:
              </Text>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Input
                  prefix={<MailOutlined style={{ color: "#8C8C8C" }} />}
                  placeholder="email@example.com (comma-separate multiple)"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onPressEnter={handleShareByEmail}
                  style={{ flex: 1 }}
                />
                <Select
                  value={emailPermission}
                  onChange={setEmailPermission}
                  style={{ width: 90 }}
                  getPopupContainer={(t) => t.parentElement || document.body}
                  popupMatchSelectWidth={false}
                  options={[
                    { label: "View", value: "view" },
                    { label: "Edit", value: "edit" },
                  ]}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  loading={emailSharing}
                  onClick={handleShareByEmail}
                  disabled={!emailInput.trim()}
                  style={{ backgroundColor: "#3CB371", borderColor: "#3CB371" }}
                >
                  Invite
                </Button>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#8C8C8C",
                  marginBottom: 16,
                  padding: "6px 10px",
                  background: "#f6ffed",
                  border: "1px solid #b7eb8f",
                  borderRadius: 6,
                }}
              >
                <CrownOutlined style={{ color: "#d48806", marginRight: 4 }} />
                Pro feature — share with any ValueChart user by email address
              </div>
            </>
          )}

          {/* Team members list */}
          {availableMembers.length > 0 || !isProUser ? (
            <>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                {isProUser
                  ? "Share with team members:"
                  : "Share with team members:"}
              </Text>
              <Input
                prefix={<SearchOutlined style={{ color: "#8C8C8C" }} />}
                placeholder="Search members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
                style={{ marginBottom: 12 }}
              />

              <div
                style={{ maxHeight: 200, overflowY: "auto", marginBottom: 16 }}
              >
                {filteredMembers.length === 0 ? (
                  <Empty
                    description={
                      isProUser
                        ? "No team members available"
                        : "No team members available — upgrade to Pro to share with any user"
                    }
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : (
                  filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: 8,
                        marginBottom: 4,
                        background: "#FAFAFA",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <Avatar
                          src={member.image}
                          icon={<UserOutlined />}
                          size={32}
                        />
                        <div>
                          <Text style={{ fontSize: 13, display: "block" }}>
                            {member.name || "Unknown"}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {member.email}
                          </Text>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Select
                          size="small"
                          value={permissions[member.id] || "view"}
                          onChange={(v) =>
                            setPermissions((p) => ({ ...p, [member.id]: v }))
                          }
                          style={{ width: 90 }}
                          getPopupContainer={(trigger) =>
                            trigger.parentElement || document.body
                          }
                          popupMatchSelectWidth={false}
                          options={[
                            { label: "View", value: "view" },
                            { label: "Edit", value: "edit" },
                          ]}
                        />
                        <Button
                          type="primary"
                          size="small"
                          loading={sharingUser === member.id}
                          onClick={() => handleShare(member.id)}
                          style={{
                            backgroundColor: "#3CB371",
                            borderColor: "#3CB371",
                          }}
                        >
                          Share
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : null}

          {/* Currently shared */}
          {shares.length > 0 && (
            <>
              <Divider style={{ margin: "12px 0" }}>
                Currently shared with
              </Divider>
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {shares.map((share) => (
                  <div
                    key={share.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: 8,
                      marginBottom: 4,
                      background: "#F6FFED",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Avatar
                        src={share.sharedWith?.image}
                        icon={<UserOutlined />}
                        size={32}
                      />
                      <div>
                        <Text style={{ fontSize: 13, display: "block" }}>
                          {share.sharedWith?.name || "Unknown"}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {share.permission === "edit" ? (
                            <>
                              <EditOutlined /> Can edit
                            </>
                          ) : (
                            <>
                              <LockOutlined /> View only
                            </>
                          )}
                        </Text>
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <Select
                        size="small"
                        value={share.permission}
                        onChange={(v) => handleChangePermission(share.id, v)}
                        style={{ width: 90 }}
                        getPopupContainer={(trigger) =>
                          trigger.parentElement || document.body
                        }
                        popupMatchSelectWidth={false}
                        options={[
                          { label: "View", value: "view" },
                          { label: "Edit", value: "edit" },
                        ]}
                      />
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemove(share.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Modal>
  );
}
