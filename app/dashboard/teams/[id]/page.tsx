"use client";

import React, { useState, useEffect } from "react";
import { Spin, Button } from "antd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { confirmDialog } from "@/components/common/ConfirmDialog";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { Field, FieldInput } from "@/components/common/Field";
import { MoreOutlined } from "@ant-design/icons";
import { teamsApi } from "@/api/teams.api";
import { useParams, useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useAuth } from "@/hooks/useAuth";

function getTeamColor(name: string): string {
  const colors = [
    "linear-gradient(135deg, #3CB371, #2d8a56)",
    "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    "linear-gradient(135deg, #8b5cf6, #6d28d9)",
    "linear-gradient(135deg, #f59e0b, #d97706)",
    "linear-gradient(135deg, #ef4444, #dc2626)",
    "linear-gradient(135deg, #06b6d4, #0891b2)",
  ];
  const index = (name?.charCodeAt(0) || 0) % colors.length;
  return colors[index];
}

const TEAM_COLORS = [
  "linear-gradient(135deg,#34A881,#1F7D5E)",
  "linear-gradient(135deg,#3b82f6,#1d4ed8)",
  "linear-gradient(135deg,#8b5cf6,#6d28d9)",
  "linear-gradient(135deg,#f59e0b,#d97706)",
  "linear-gradient(135deg,#ef4444,#dc2626)",
  "linear-gradient(135deg,#06b6d4,#0891b2)",
];

function getTeamGradient(name: string): string {
  return TEAM_COLORS[(name?.charCodeAt(0) || 0) % TEAM_COLORS.length];
}

const SHADOW_CARD =
  "0 1px 2px rgba(16,40,32,0.04), 0 8px 24px -8px rgba(16,40,32,0.08)";
const SHADOW_FAB = "0 10px 24px -6px rgba(31,125,94,0.45)";

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "recently";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return "Sent today";
  if (days === 1) return "Sent 1 day ago";
  return `Sent ${days} days ago`;
}

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const teamId = params?.id as string;
  const [team, setTeam] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsName, setSettingsName] = useState("");
  const [settingsDesc, setSettingsDesc] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");

  const refreshInvites = () => {
    if (!teamId) return;
    teamsApi
      .listInvites(teamId)
      .then((res) => setPendingInvites(res.data?.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    refreshInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  useEffect(() => {
    if (!teamId) return;
    Promise.all([teamsApi.get(teamId), teamsApi.listMembers(teamId)])
      .then(([teamRes, membersRes]) => {
        const teamData = teamRes.data?.data || teamRes.data;
        setTeam(teamData);
        const mData = membersRes.data?.data || membersRes.data;
        setMembers(Array.isArray(mData) ? mData : []);
      })
      .catch(() => toast.error("Failed to load team"))
      .finally(() => setLoading(false));
  }, [teamId]);

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    try {
      setInviting(true);
      await teamsApi.invite({ email, teamId });
      toast.success("Invitation sent");
      setInviteEmail("");
      setInviteOpen(false);
      // Refresh members + pending invites
      const res = await teamsApi.listMembers(teamId);
      const mData = res.data?.data || res.data;
      setMembers(Array.isArray(mData) ? mData : []);
      refreshInvites();
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        "Failed to invite";
      toast.error(errMsg);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await teamsApi.removeMember(teamId, userId);
      toast.success("Member removed");
      setMembers((prev) =>
        prev.filter((m) => m.userId !== userId && m.id !== userId),
      );
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const handleRoleChange = async (userId: string, role: "ADMIN" | "MEMBER") => {
    try {
      await teamsApi.updateMemberRole(teamId, userId, role);
      toast.success("Member role updated");
      const res = await teamsApi.listMembers(teamId);
      const mData = res.data?.data || res.data;
      setMembers(Array.isArray(mData) ? mData : []);
    } catch {
      toast.error("Failed to update member role");
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await teamsApi.cancelInvite(inviteId);
      toast.success("Invite cancelled");
      refreshInvites();
    } catch {
      toast.error("Failed to cancel invite");
    }
  };

  const openSettings = () => {
    setSettingsName(team?.name || "");
    setSettingsDesc(team?.description || "");
    setSettingsOpen(true);
  };

  const handleSaveSettings = async () => {
    const name = settingsName.trim();
    if (!name) {
      toast.error("Team name is required");
      return;
    }
    try {
      setSavingSettings(true);
      const res = await teamsApi.update(teamId, {
        name,
        description: settingsDesc,
      });
      const updated = res.data?.data || res.data;
      setTeam((prev: any) => ({ ...prev, ...updated }));
      toast.success("Team updated");
      setSettingsOpen(false);
    } catch (err: any) {
      toast.error("Failed to update team");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteTeam = () => {
    confirmDialog({
      title: "Delete team?",
      content:
        "This permanently deletes the team for all members. This cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          await teamsApi.delete(teamId);
          toast.success("Team deleted");
          router.push("/dashboard/teams");
        } catch {
          toast.error("Failed to delete team");
        }
      },
    });
  };

  const memberMenuItems = (member: any) => {
    const userId = member.userId || member.user?.id || member.id;
    const role = (member.role || "MEMBER").toUpperCase();
    return [
      {
        key: "role",
        label: role === "ADMIN" ? "Change to Member" : "Change to Admin",
        onClick: () =>
          handleRoleChange(userId, role === "ADMIN" ? "MEMBER" : "ADMIN"),
      },
      { type: "divider" as const },
      {
        key: "remove",
        label: "Remove member",
        danger: true,
        onClick: () => handleRemove(userId),
      },
    ];
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

  const isOwner =
    team?.teamOwnerId === user?.id ||
    team?.ownerId === user?.id ||
    members.some(
      (m) =>
        (m.userId === user?.id || m.user?.id === user?.id) &&
        (m.role || "").toUpperCase() === "OWNER",
    );

  const maxMembers = team?.maxMembers || 5;

  const filteredMembers = members.filter((m) => {
    const name = m.user?.name || m.email || "";
    const email = m.user?.email || m.email || "";
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  return (
    <>
      {/* ============ MOBILE (<1024px) ============ */}
      <div className="vc-team-detail-mobile lg:hidden">
        <div
          style={{
            background: "#F5F7F6",
            minHeight: "100dvh",
            paddingBottom: 100,
          }}
        >
          {/* Green gradient header */}
          <div
            style={{
              background: "linear-gradient(145deg,#1F7D5E,#34A881,#4dbf7e)",
              padding: "12px 16px 20px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative orb */}
            <div
              style={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 160,
                height: 160,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                pointerEvents: "none",
              }}
            />

            {/* Settings button (owner only) */}
            {isOwner && (
              <button
                onClick={openSettings}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 16,
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: 10,
                  width: 36,
                  height: 36,
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#FFFFFF",
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                ⚙️
              </button>
            )}

            {/* Team info row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#FFFFFF",
                  backdropFilter: "blur(4px)",
                  flexShrink: 0,
                }}
              >
                {team?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#FFFFFF",
                    letterSpacing: -0.5,
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {team?.name}
                </h1>
                <p
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.75)",
                    marginTop: 2,
                  }}
                >
                  {isOwner ? "Owner" : "Member"}
                  {team?.createdAt
                    ? ` · Created ${formatDate(team.createdAt)}`
                    : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ background: "#F5F7F6", padding: 14 }}>
            {/* Quick stats */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[
                { num: members.length, label: "Members" },
                { num: team?.flowCount || 0, label: "Flows" },
                { num: team?.lastActive || "—", label: "Last Active" },
              ].map(({ num, label }) => (
                <div
                  key={label}
                  style={{
                    flex: 1,
                    background: "#FFFFFF",
                    borderRadius: 12,
                    padding: "10px 8px",
                    textAlign: "center",
                    border: "1px solid #E5EBE8",
                    boxShadow: SHADOW_CARD,
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#1F2937",
                      letterSpacing: -0.5,
                      lineHeight: 1,
                    }}
                  >
                    {num}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "#6B7280",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginTop: 2,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Invite button */}
            <button
              onClick={() => setInviteOpen(true)}
              style={{
                width: "100%",
                height: 44,
                background: "linear-gradient(135deg,#34A881,#1F7D5E)",
                border: "none",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                color: "#FFFFFF",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: SHADOW_FAB,
                marginBottom: 14,
              }}
            >
              + Invite Member
            </button>

            {/* Search bar */}
            <div
              style={{
                height: 40,
                background: "#FFFFFF",
                borderRadius: 10,
                border: "1.5px solid #E5EBE8",
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 13, color: "#9ca3af" }}>🔍</span>
              <input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: 13,
                  color: "#1F2937",
                  background: "none",
                }}
              />
            </div>

            {/* Section label */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#6B7280",
                letterSpacing: 0.8,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Members · {members.length} of {maxMembers} max
            </div>

            {/* Member list */}
            {filteredMembers.map((member) => {
              const role = (member.role || "MEMBER").toUpperCase();
              const mIsOwner = role === "OWNER";
              const name = member.user?.name || member.email || "Team Member";
              const email = member.user?.email || member.email;
              return (
                <div
                  key={member.id}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: 12,
                    padding: "10px 12px",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    border: "1px solid #E5EBE8",
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: getTeamGradient(name),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#FFFFFF",
                      flexShrink: 0,
                    }}
                  >
                    {name?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#1F2937",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                        marginTop: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {email}
                    </div>
                  </div>
                  {mIsOwner ? (
                    <div
                      style={{
                        padding: "3px 8px",
                        background: "#fef3c7",
                        color: "#f59e0b",
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      👑 Owner
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "3px 8px",
                        background: role === "ADMIN" ? "#ede9fe" : "#E7F6F0",
                        color: role === "ADMIN" ? "#7c3aed" : "#1F7D5E",
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {role === "ADMIN" ? "Admin" : "Member"}
                    </div>
                  )}
                  {isOwner && !mIsOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="tw appearance-none cursor-pointer outline-none border-0 bg-transparent w-7 h-7 rounded flex items-center justify-center hover:bg-secondary text-muted-foreground"
                        >
                          <MoreOutlined />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="tw">
                        {(memberMenuItems(member) as any[]).map(
                          (item: any, i: number) =>
                            item.type === "divider" ? (
                              <DropdownMenuSeparator key={`sep-${i}`} />
                            ) : (
                              <DropdownMenuItem
                                key={item.key}
                                onSelect={item.onClick}
                                className={
                                  item.danger
                                    ? "text-destructive focus:text-destructive"
                                    : ""
                                }
                              >
                                {item.label}
                              </DropdownMenuItem>
                            ),
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}

            {/* Pending invites section */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#6B7280",
                letterSpacing: 0.8,
                textTransform: "uppercase",
                marginTop: 16,
                marginBottom: 8,
              }}
            >
              Pending Invites
              {pendingInvites.length > 0 ? ` · ${pendingInvites.length}` : ""}
            </div>

            {pendingInvites.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "16px",
                  color: "#9ca3af",
                  fontSize: 12,
                  background: "#FFFFFF",
                  borderRadius: 12,
                  border: "1.5px dashed #E5EBE8",
                }}
              >
                No pending invites
              </div>
            ) : (
              pendingInvites.map((invite: any) => (
                <div
                  key={invite.id}
                  style={{
                    background: "#fffbeb",
                    borderRadius: 12,
                    padding: "10px 12px",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    border: "1px solid #fde68a",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#1F2937",
                      }}
                    >
                      {invite.email}
                    </div>
                    <div
                      style={{ fontSize: 10, color: "#6B7280", marginTop: 1 }}
                    >
                      {timeAgo(invite.createdAt)}
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#f59e0b",
                        background: "#fef3c7",
                        padding: "2px 8px",
                        borderRadius: 20,
                      }}
                    >
                      Pending
                    </div>
                    {isOwner && (
                      <Button
                        size="small"
                        danger
                        type="text"
                        onClick={() => handleCancelInvite(invite.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ============ DESKTOP (≥1024px) — unchanged ============ */}
      <div className="vc-team-detail-desktop hidden lg:block">
        <div style={{ background: "#f8fafc", minHeight: "100dvh" }}>
          {/* Green gradient header */}
          <div
            style={{
              background: "linear-gradient(145deg, #2d8a56, #3CB371, #4dbf7e)",
              padding: "12px 16px 20px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Decorative orb */}
            <div
              style={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 160,
                height: 160,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                pointerEvents: "none",
              }}
            />

            {/* Settings button */}
            {isOwner && (
              <button
                onClick={openSettings}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 16,
                  background: "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: 10,
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  color: "#fff",
                  cursor: "pointer",
                  backdropFilter: "blur(4px)",
                }}
              >
                ⚙️
              </button>
            )}

            {/* Team info */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  fontWeight: 800,
                  color: "#fff",
                  backdropFilter: "blur(4px)",
                  flexShrink: 0,
                }}
              >
                {team?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: "#fff",
                    letterSpacing: -0.5,
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {team?.name}
                </h1>
                <p
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.75)",
                    marginTop: 2,
                  }}
                >
                  {isOwner ? "Owner" : "Member"}
                  {team?.createdAt
                    ? ` · Created ${formatDate(team.createdAt)}`
                    : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: 14 }}>
            {/* Quick stats */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[
                { num: members.length, label: "Members" },
                { num: team?.flowCount || 0, label: "Flows" },
                { num: team?.lastActive || "—", label: "Active" },
              ].map(({ num, label }) => (
                <div
                  key={label}
                  style={{
                    flex: 1,
                    background: "#fff",
                    borderRadius: 12,
                    padding: "10px 8px",
                    textAlign: "center",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#1a1a2e",
                      letterSpacing: -0.5,
                      lineHeight: 1,
                    }}
                  >
                    {num}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "#6b7280",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      marginTop: 2,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Invite button */}
            <button
              onClick={() => setInviteOpen(true)}
              style={{
                width: "100%",
                height: 44,
                background: "linear-gradient(135deg, #3CB371, #2d8a56)",
                border: "none",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(61,179,113,0.25)",
                marginBottom: 14,
              }}
            >
              + Invite Member
            </button>

            {/* Search */}
            <div
              style={{
                height: 40,
                background: "#fff",
                borderRadius: 10,
                border: "1.5px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 13, color: "#9ca3af" }}>🔍</span>
              <input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: 13,
                  color: "#1a1a2e",
                  background: "none",
                }}
              />
            </div>

            {/* Section label */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#6b7280",
                letterSpacing: 0.8,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Members · {members.length} of {maxMembers} max
            </div>

            {/* Member list */}
            {filteredMembers.map((member) => {
              const role = (member.role || "MEMBER").toUpperCase();
              const mIsOwner = role === "OWNER";
              const name = member.user?.name || member.email || "Team Member";
              const email = member.user?.email || member.email;
              return (
                <div
                  key={member.id}
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    padding: "10px 12px",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: getTeamColor(name),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {name?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#1a1a2e",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6b7280",
                        marginTop: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {email}
                    </div>
                  </div>
                  {mIsOwner ? (
                    <div
                      style={{
                        padding: "3px 8px",
                        background: "#fef3c7",
                        color: "#f59e0b",
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      👑 Owner
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "3px 8px",
                        background: role === "ADMIN" ? "#ede9fe" : "#e8f7ef",
                        color: role === "ADMIN" ? "#7c3aed" : "#3CB371",
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {role === "ADMIN" ? "Admin" : "Member"}
                    </div>
                  )}
                  {isOwner && !mIsOwner && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="tw appearance-none cursor-pointer outline-none border-0 bg-transparent w-7 h-7 rounded flex items-center justify-center hover:bg-secondary text-muted-foreground"
                        >
                          <MoreOutlined />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="tw">
                        {(memberMenuItems(member) as any[]).map(
                          (item: any, i: number) =>
                            item.type === "divider" ? (
                              <DropdownMenuSeparator key={`sep-${i}`} />
                            ) : (
                              <DropdownMenuItem
                                key={item.key}
                                onSelect={item.onClick}
                                className={
                                  item.danger
                                    ? "text-destructive focus:text-destructive"
                                    : ""
                                }
                              >
                                {item.label}
                              </DropdownMenuItem>
                            ),
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}

            {/* Pending invites section */}
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#6b7280",
                letterSpacing: 0.8,
                textTransform: "uppercase",
                marginTop: 16,
                marginBottom: 8,
              }}
            >
              Pending Invites
              {pendingInvites.length > 0 ? ` · ${pendingInvites.length}` : ""}
            </div>

            {pendingInvites.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "16px",
                  color: "#9ca3af",
                  fontSize: 12,
                  background: "#fff",
                  borderRadius: 12,
                  border: "1.5px dashed #e5e7eb",
                }}
              >
                No pending invites
              </div>
            ) : (
              pendingInvites.map((invite: any) => (
                <div
                  key={invite.id}
                  style={{
                    background: "#fffbeb",
                    borderRadius: 12,
                    padding: "10px 12px",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    border: "1px solid #fde68a",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#1a1a2e",
                      }}
                    >
                      {invite.email}
                    </div>
                    <div
                      style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}
                    >
                      {timeAgo(invite.createdAt)}
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#f59e0b",
                        background: "#fef3c7",
                        padding: "2px 8px",
                        borderRadius: 20,
                      }}
                    >
                      Pending
                    </div>
                    {isOwner && (
                      <Button
                        size="small"
                        danger
                        type="text"
                        onClick={() => handleCancelInvite(invite.id)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Invite modal — new_design ModalShell */}
      <ModalShell open={inviteOpen} onClose={() => setInviteOpen(false)}>
        <ModalHeader title="Invite Member" close={() => setInviteOpen(false)} />
        <div className="px-5 pb-5">
          <Field label="Email Address" required>
            <FieldInput
              type="email"
              icon={<Mail className="w-4 h-4" />}
              placeholder="member@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
          </Field>
        </div>
        <ModalFooter
          close={() => setInviteOpen(false)}
          primary={handleInvite}
          primaryLabel="Invite"
          loading={inviting}
          disabled={!inviteEmail.trim()}
        />
      </ModalShell>

      {/* Settings modal — owner only — new_design ModalShell */}
      <ModalShell open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <ModalHeader
          title="Team Settings"
          close={() => setSettingsOpen(false)}
        />
        <div className="px-5 pb-5 space-y-4">
          <Field label="Team Name" required>
            <FieldInput
              placeholder="Team name"
              value={settingsName}
              onChange={(e) => setSettingsName(e.target.value)}
            />
          </Field>
          <div>
            <label className="text-xs font-semibold">Description</label>
            <textarea
              placeholder="Team description"
              value={settingsDesc}
              onChange={(e) => setSettingsDesc(e.target.value)}
              className="mt-1.5 w-full min-h-20 rounded-xl border border-border bg-background p-3 text-sm font-sans outline-none resize-none"
            />
          </div>
          <div className="border-t border-border pt-4">
            <div className="text-xs font-bold uppercase tracking-wide text-coral mb-2">
              Danger Zone
            </div>
            <button
              type="button"
              onClick={handleDeleteTeam}
              className="appearance-none cursor-pointer outline-none h-10 px-4 rounded-xl border-2 border-coral bg-transparent text-coral font-bold text-sm"
            >
              Delete Team
            </button>
          </div>
        </div>
        <ModalFooter
          close={() => setSettingsOpen(false)}
          primary={handleSaveSettings}
          primaryLabel="Save"
          loading={savingSettings}
          disabled={!settingsName.trim()}
        />
      </ModalShell>
    </>
  );
}
