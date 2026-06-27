"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button, Spin, Typography } from "antd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { confirmDialog } from "@/components/common/ConfirmDialog";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { Field, FieldInput } from "@/components/common/Field";
import {
  Plus,
  ChevronDown,
  ChevronRight,
  UserPlus,
  MoreHorizontal,
  Crown,
  Send,
  Pencil,
  Trash2,
  Users,
  Search,
  X,
  ChevronLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTeams } from "@/hooks/useTeams";
import { useTabFocus } from "@/hooks/useTabFocus";
import { teamsApi } from "@/api/teams.api";
import { usePro } from "@/hooks/usePro";
import { useAppContext } from "@/context/AppContext";
import RoleBadge from "@/components/team/RoleBadge";
import { subscriptionsApi } from "@/api/subscriptions.api";
import TeamUpgradeModal from "@/components/common/TeamUpgradeModal";

const TEAM_GRADIENTS = [
  "linear-gradient(135deg,#34A881,#1F7D5E)",
  "linear-gradient(135deg,#3b82f6,#1d4ed8)",
  "linear-gradient(135deg,#8b5cf6,#6d28d9)",
  "linear-gradient(135deg,#f59e0b,#d97706)",
  "linear-gradient(135deg,#ef4444,#dc2626)",
  "linear-gradient(135deg,#06b6d4,#0891b2)",
];

function gradientFor(name: string): string {
  return TEAM_GRADIENTS[(name?.charCodeAt(0) || 0) % TEAM_GRADIENTS.length];
}

function memberName(m: any): string {
  return m?.user?.name || m?.name || m?.email || "Team Member";
}
function memberEmail(m: any): string {
  return m?.user?.email || m?.email || "";
}
function memberId(m: any): string {
  return m?.userId || m?.user?.id || m?.id || "";
}

const PAGE_SIZE_OPTIONS = [
  { label: "5 / page", value: 5 },
  { label: "10 / page", value: 10 },
  { label: "15 / page", value: 15 },
  { label: "20 / page", value: 20 },
];

function Paginator({
  total,
  page,
  pageSize,
  onPage,
  onPageSize,
}: {
  total: number;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (s: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
      <div className="relative">
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSize(Number(e.target.value));
            onPage(1);
          }}
          className="h-8 pl-3 pr-8 rounded-xl bg-card border border-border text-[12px] font-medium text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {PAGE_SIZE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => onPage(page - 1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary disabled:opacity-30 bg-transparent border-0 p-0 cursor-pointer appearance-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`w-8 h-8 rounded-lg text-xs font-semibold border-0 p-0 cursor-pointer appearance-none transition-colors ${
              p === page
                ? "bg-primary text-white"
                : "text-foreground hover:bg-secondary bg-transparent"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          disabled={page === totalPages}
          onClick={() => onPage(page + 1)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary disabled:opacity-30 bg-transparent border-0 p-0 cursor-pointer appearance-none transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <span className="text-[11px] text-muted-foreground">{total} total</span>
    </div>
  );
}

export default function TeamsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { teams, loading, createTeam, deleteTeam, updateTeam, fetchTeams } =
    useTeams();
  useTabFocus(fetchTeams);
  const { currentApp, loading: proLoading } = usePro();
  const { isTeamContext } = useAppContext();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [inviteTeamId, setInviteTeamId] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [inviteEmails, setInviteEmails] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState(false);

  // Teams accordion + lazy member loading (kept for the Teams section below)
  const [expanded, setExpanded] = useState<string | null>(null);
  const [membersByTeam, setMembersByTeam] = useState<Record<string, any[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<string | null>(null);

  // Members section state
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState("");
  const [memberPage, setMemberPage] = useState(1);
  const [memberPageSize, setMemberPageSize] = useState(10);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [roleChangingId, setRoleChangingId] = useState<string | null>(null);

  // Teams section pagination
  const [teamPage, setTeamPage] = useState(1);
  const [teamPageSize, setTeamPageSize] = useState(10);

  useEffect(() => {
    if (proLoading) return;
    if (currentApp === "pro" || isTeamContext) {
      setHasAccess(true);
      return;
    }
    let cancelled = false;
    subscriptionsApi
      .getStatus()
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.data || res.data;
        const active =
          data?.hasSubscription &&
          (data?.status === "active" || data?.status === "cancelling");
        if (active) {
          setHasAccess(true);
        } else {
          setHasAccess(false);
          setUpgradeModalOpen(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setHasAccess(false);
        setUpgradeModalOpen(true);
      });
    return () => {
      cancelled = true;
    };
  }, [currentApp, isTeamContext, proLoading]);

  // Fetch all members for all teams when teams list changes
  const fetchAllMembers = useCallback(async (teamList: any[]) => {
    if (!teamList.length) {
      setAllMembers([]);
      return;
    }
    setMembersLoading(true);
    try {
      const results = await Promise.all(
        teamList.map(async (team: any) => {
          try {
            const res = await teamsApi.listMembers(team.id);
            const d = res.data?.data || res.data;
            const list = Array.isArray(d) ? d : d?.members || [];
            return list.map((m: any) => ({
              ...m,
              teamId: team.id,
              teamName: team.name,
              teamOwnerId: team.teamOwnerId || team.owner?.id,
            }));
          } catch {
            return [];
          }
        }),
      );
      // Deduplicate by userId — same person can be a member of multiple teams.
      // Keep the first occurrence (highest-priority team), collect team names for display.
      const seen = new Map<string, any>();
      for (const m of results.flat()) {
        const uid = memberId(m);
        if (!uid) continue;
        if (!seen.has(uid)) {
          seen.set(uid, { ...m, teamNames: [m.teamName] });
        } else {
          seen.get(uid).teamNames.push(m.teamName);
        }
      }
      setAllMembers(Array.from(seen.values()));
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (teams.length > 0) fetchAllMembers(teams);
    else setAllMembers([]);
  }, [teams, fetchAllMembers]);

  // Accordion lazy load for Teams section
  const loadMembers = async (teamId: string, fallback: any[]) => {
    if (membersByTeam[teamId]) return;
    if (Array.isArray(fallback) && fallback.length) {
      setMembersByTeam((p) => ({ ...p, [teamId]: fallback }));
    }
    setLoadingMembers(teamId);
    try {
      const res = await teamsApi.listMembers(teamId);
      const d = res.data?.data || res.data;
      const list = Array.isArray(d) ? d : d?.members || [];
      setMembersByTeam((p) => ({ ...p, [teamId]: list }));
    } catch {
      if (!membersByTeam[teamId])
        setMembersByTeam((p) => ({ ...p, [teamId]: fallback || [] }));
    } finally {
      setLoadingMembers(null);
    }
  };

  const toggleExpand = (team: any) => {
    const id = team.id;
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      loadMembers(id, team.members || []);
    }
  };

  const resetCreate = () => {
    setCreateName("");
    setCreateDesc("");
  };

  const handleCreate = async () => {
    if (!createName.trim()) {
      toast.error("Please enter a team name");
      return;
    }
    try {
      setCreating(true);
      await createTeam({ name: createName.trim(), description: createDesc });
      resetCreate();
      setCreateModalOpen(false);
    } catch (err: any) {
      const errorCode = err?.response?.data?.error?.code;
      if (errorCode === "SUBSCRIPTION_REQUIRED") {
        setCreateModalOpen(false);
        resetCreate();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmails.trim()) {
      toast.error("Please enter at least one email address");
      return;
    }
    try {
      setInviting(true);
      const emailList = inviteEmails
        .split(",")
        .map((e: string) => e.trim())
        .filter((e: string) => e);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalid = emailList.filter((e: string) => !emailRegex.test(e));
      if (invalid.length > 0) {
        toast.error(`Invalid email format: ${invalid.join(", ")}`);
        setInviting(false);
        return;
      }
      await teamsApi.invite({ teamId: inviteTeamId!, emails: emailList });
      toast.success(`Invitation${emailList.length > 1 ? "s" : ""} sent`);
      setInviteEmails("");
      setInviteModalOpen(false);
      fetchTeams();
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        "Failed to send invitation";
      toast.error(errMsg);
    } finally {
      setInviting(false);
    }
  };

  const openInviteModal = (teamId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setInviteTeamId(teamId);
    setInviteModalOpen(true);
  };

  const openEditModal = (team: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingTeam(team);
    setEditName(team.name || "");
    setEditDesc(team.description || "");
    setEditModalOpen(true);
  };

  const handleEdit = async () => {
    if (!editName.trim()) {
      toast.error("Please enter a team name");
      return;
    }
    try {
      setEditing(true);
      await updateTeam(editingTeam.id, {
        name: editName.trim(),
        description: editDesc,
      });
      setEditModalOpen(false);
      setEditingTeam(null);
    } catch {
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = (team: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    confirmDialog({
      title: `Delete "${team.name || "this team"}"?`,
      content:
        "This will permanently delete the team and remove all members. This action cannot be undone.",
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        await deleteTeam(team.id);
        setExpanded((cur) => (cur === team.id ? null : cur));
      },
    });
  };

  const handleRemoveMember = (m: any) => {
    const name = memberName(m);
    confirmDialog({
      title: `Remove "${name}"?`,
      content: "This member will lose access to the team workspace.",
      confirmLabel: "Remove",
      danger: true,
      onConfirm: async () => {
        const uid = memberId(m);
        setRemovingId(uid);
        try {
          await teamsApi.removeMember(m.teamId, uid);
          toast.success(`${name} removed`);
          await fetchAllMembers(teams);
          // Also refresh accordion cache for this team
          setMembersByTeam((p) => {
            const updated = { ...p };
            delete updated[m.teamId];
            return updated;
          });
        } catch (err: any) {
          toast.error(
            err?.response?.data?.error?.message || "Failed to remove member",
          );
        } finally {
          setRemovingId(null);
        }
      },
    });
  };

  const handleChangeRole = async (m: any, newRole: "ADMIN" | "MEMBER") => {
    const uid = memberId(m);
    setRoleChangingId(uid + m.teamId);
    try {
      await teamsApi.updateMemberRole(m.teamId, uid, newRole);
      toast.success("Role updated");
      await fetchAllMembers(teams);
      setMembersByTeam((p) => {
        const updated = { ...p };
        delete updated[m.teamId];
        return updated;
      });
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message || "Failed to update role",
      );
    } finally {
      setRoleChangingId(null);
    }
  };

  if (hasAccess === null) {
    return (
      <div style={{ textAlign: "center", padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <>
        <div style={{ textAlign: "center", padding: 100 }}>
          <Typography.Title level={4} style={{ color: "#8C8C8C" }}>
            Teams is not available on your current plan
          </Typography.Title>
          <Button
            type="primary"
            onClick={() => setUpgradeModalOpen(true)}
            style={{
              backgroundColor: "#34A881",
              borderColor: "#34A881",
              marginTop: 12,
            }}
          >
            See plans
          </Button>
        </div>
        <TeamUpgradeModal
          open={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          feature="teams"
        />
      </>
    );
  }

  if (loading && teams.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  const totalMembers = teams.reduce(
    (sum: number, t: any) =>
      sum + (t._count?.members || t.members?.length || 0),
    0,
  );

  // Members filter + pagination
  const filteredMembers = allMembers.filter((m) => {
    const q = memberSearch.toLowerCase();
    const name = memberName(m).toLowerCase();
    const email = memberEmail(m).toLowerCase();
    const matchSearch = !q || name.includes(q) || email.includes(q);
    const matchRole = !memberRoleFilter || m.role === memberRoleFilter;
    return matchSearch && matchRole;
  });
  const memberStart = (memberPage - 1) * memberPageSize;
  const pagedMembers = filteredMembers.slice(
    memberStart,
    memberStart + memberPageSize,
  );

  // Teams pagination
  const teamStart = (teamPage - 1) * teamPageSize;
  const pagedTeams = teams.slice(teamStart, teamStart + teamPageSize);

  return (
    <>
      <div className="tw min-h-screen bg-background pb-28">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-5 pt-4 sm:pt-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold truncate text-foreground">
                Teams
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {teams.length} team{teams.length !== 1 ? "s" : ""} ·{" "}
                {totalMembers} member{totalMembers !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="shrink-0 h-11 px-5 rounded-xl bg-primary text-white font-semibold text-sm inline-flex items-center gap-2 shadow-[var(--shadow-fab)] hover:bg-[#1F7D5E] transition-colors border-0 cursor-pointer appearance-none"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Team</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>

          {/* ── Members section ─────────────────────────────────── */}
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            All Teammates
          </div>
          <div className="rounded-2xl bg-card border border-border shadow-[var(--shadow-card)] mb-6 overflow-hidden">
            {/* Search + filter bar */}
            <div className="flex gap-2 px-4 py-3 border-b border-border flex-wrap items-center">
              <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-background border border-border flex-1 min-w-[160px]">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  value={memberSearch}
                  onChange={(e) => {
                    setMemberSearch(e.target.value);
                    setMemberPage(1);
                  }}
                  placeholder="Search name or email…"
                  className="flex-1 bg-transparent outline-none text-sm border-0 p-0 appearance-none min-w-0"
                />
                {memberSearch && (
                  <button
                    onClick={() => {
                      setMemberSearch("");
                      setMemberPage(1);
                    }}
                    className="bg-transparent border-0 p-0 cursor-pointer appearance-none flex items-center"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
              <div className="relative shrink-0">
                <select
                  value={memberRoleFilter}
                  onChange={(e) => {
                    setMemberRoleFilter(e.target.value);
                    setMemberPage(1);
                  }}
                  className="h-10 pl-3 pr-8 rounded-xl bg-card border border-border text-[13px] font-medium text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">All roles</option>
                  <option value="OWNER">Owner</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MEMBER">Member</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {filteredMembers.length} member
                {filteredMembers.length !== 1 ? "s" : ""}
                {memberRoleFilter || memberSearch ? " (filtered)" : ""}
              </span>
            </div>

            {/* Member list */}
            {membersLoading ? (
              <div className="flex items-center justify-center py-10">
                <Spin />
              </div>
            ) : pagedMembers.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                {memberSearch || memberRoleFilter
                  ? "No members match your filter."
                  : "No members found."}
              </div>
            ) : (
              <div>
                {pagedMembers.map((m: any, i: number) => {
                  const name = memberName(m);
                  const email = memberEmail(m);
                  const uid = memberId(m);
                  const isOwnerRole = m.role === "OWNER";
                  const isCurrentUser = uid === user?.id;
                  const isTeamOwner = m.teamOwnerId === user?.id;
                  const isChanging = roleChangingId === uid + m.teamId;
                  const isRemoving = removingId === uid;
                  const online = m.online ?? m.isOnline ?? false;
                  const primaryTeam = m.teamNames?.[0] || m.teamName || "";
                  const teamColor = gradientFor(primaryTeam);

                  // Single MoreHorizontal dropdown for all actions (mobile-safe)
                  const actionItems = [
                    {
                      key: "role-admin",
                      label: "Make Admin",
                      disabled: m.role === "ADMIN",
                      onClick: () => handleChangeRole(m, "ADMIN"),
                    },
                    {
                      key: "role-member",
                      label: "Make Member",
                      disabled: m.role === "MEMBER",
                      onClick: () => handleChangeRole(m, "MEMBER"),
                    },
                    { type: "divider" as const },
                    {
                      key: "remove",
                      label: "Remove",
                      danger: true,
                      icon: <Trash2 className="w-3.5 h-3.5" />,
                      onClick: () => handleRemoveMember(m),
                    },
                  ];

                  return (
                    <div
                      key={uid + m.teamId + i}
                      className={`flex items-center gap-3 p-3 ${i !== pagedMembers.length - 1 ? "border-b border-border" : ""}`}
                    >
                      {/* Avatar with online dot */}
                      <div className="relative shrink-0">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
                          style={{ background: gradientFor(name) }}
                        >
                          {name.charAt(0).toUpperCase()}
                        </div>
                        {online && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#22C55E] ring-2 ring-card" />
                        )}
                      </div>

                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate text-foreground flex items-center gap-1.5">
                          <span className="truncate">{name}</span>
                          {isCurrentUser && !isOwnerRole && (
                            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {email}
                        </div>
                      </div>

                      {/* Team color dot + team name */}
                      {primaryTeam && (
                        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground shrink-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ background: teamColor }}
                          />
                          <span className="truncate max-w-[120px]">
                            {primaryTeam}
                          </span>
                        </div>
                      )}

                      {/* Role badge */}
                      <div className="shrink-0">
                        <RoleBadge role={m.role} />
                      </div>

                      {/* Actions */}
                      {isTeamOwner && !isOwnerRole && !isCurrentUser && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              disabled={isChanging || !!isRemoving}
                              className="tw shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary border-0 bg-transparent cursor-pointer appearance-none transition-colors disabled:opacity-50"
                            >
                              {isChanging || isRemoving ? (
                                <Spin size="small" />
                              ) : (
                                <MoreHorizontal className="w-4 h-4" />
                              )}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="tw">
                            {(actionItems as any[]).map(
                              (item: any, i: number) =>
                                item.type === "divider" ? (
                                  <DropdownMenuSeparator key={`sep-${i}`} />
                                ) : (
                                  <DropdownMenuItem
                                    key={item.key}
                                    onSelect={item.onClick}
                                    disabled={item.disabled}
                                    className={
                                      item.danger
                                        ? "text-destructive focus:text-destructive"
                                        : ""
                                    }
                                  >
                                    {item.icon}
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
              </div>
            )}

            {/* Member pagination */}
            {filteredMembers.length > 0 && (
              <div className="px-4 pb-4 border-t border-border pt-3">
                <Paginator
                  total={filteredMembers.length}
                  page={memberPage}
                  pageSize={memberPageSize}
                  onPage={setMemberPage}
                  onPageSize={setMemberPageSize}
                />
              </div>
            )}
          </div>

          {/* ── Teams section ────────────────────────────────────── */}
          <div className="mb-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              All Teams
            </div>

            {teams.length === 0 ? (
              <div className="rounded-2xl bg-card border border-border shadow-[var(--shadow-card)] text-center px-6 py-14">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-secondary flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  No teams yet
                </h3>
                <p className="text-sm text-muted-foreground mt-1 mb-6">
                  Create a team to collaborate with others on flows
                </p>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="h-11 px-6 rounded-full bg-primary text-white font-semibold text-sm inline-flex items-center gap-2 shadow-[var(--shadow-fab)] hover:bg-[#1F7D5E] transition-colors border-0 cursor-pointer appearance-none"
                >
                  <Plus className="w-4 h-4" /> Create Team
                </button>
              </div>
            ) : (
              <>
                {pagedTeams.map((team: any) => {
                  const isOpen = expanded === team.id;
                  const memberCount =
                    team._count?.members || team.members?.length || 0;
                  const isTeamOwner =
                    team.teamOwnerId === user?.id ||
                    team.ownerId === user?.id ||
                    team.owner?.id === user?.id;
                  const members = membersByTeam[team.id] || team.members || [];
                  const isLoadingMembers =
                    loadingMembers === team.id && !members.length;

                  return (
                    <div
                      key={team.id}
                      className="rounded-2xl bg-card border border-border mb-3 overflow-hidden shadow-[var(--shadow-card)]"
                    >
                      {/* Header row */}
                      <div className="flex items-center gap-3 p-4">
                        <button
                          onClick={() => toggleExpand(team)}
                          className="flex-1 min-w-0 flex items-center gap-3 text-left bg-transparent border-0 p-0 cursor-pointer appearance-none"
                        >
                          <div
                            className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shrink-0"
                            style={{ background: gradientFor(team.name) }}
                          >
                            {team.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-sm truncate text-foreground">
                                {team.name}
                              </span>
                              {isTeamOwner && (
                                <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] inline-flex items-center gap-1">
                                  <Crown className="w-3 h-3" /> Owner
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {memberCount} member{memberCount !== 1 ? "s" : ""}{" "}
                              · {team.flowCount || 0} flow
                              {(team.flowCount || 0) !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </button>

                        {isTeamOwner && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                className="tw w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors bg-transparent border-0 p-0 cursor-pointer appearance-none shrink-0"
                              >
                                <MoreHorizontal className="w-5 h-5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="tw">
                              <DropdownMenuItem
                                onSelect={() => openEditModal(team)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit team
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => handleDelete(team)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete team
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        <button
                          onClick={() => toggleExpand(team)}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors bg-transparent border-0 p-0 cursor-pointer appearance-none shrink-0"
                        >
                          {isOpen ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Expanded members */}
                      {isOpen && (
                        <div className="border-t border-border px-4 pb-4">
                          <div className="flex items-center justify-between py-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              Members
                            </span>
                          </div>
                          {isLoadingMembers ? (
                            <div className="py-6 text-center">
                              <Spin />
                            </div>
                          ) : members.length === 0 ? (
                            <div className="text-xs text-muted-foreground py-2">
                              No members yet.
                            </div>
                          ) : (
                            members.map((m: any, i: number) => {
                              const name = memberName(m);
                              const online = m.online ?? m.isOnline ?? false;
                              return (
                                <div
                                  key={memberId(m) || i}
                                  className="flex items-center gap-3 py-2"
                                >
                                  <div className="relative shrink-0">
                                    <div
                                      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                      style={{ background: gradientFor(name) }}
                                    >
                                      {name.charAt(0).toUpperCase()}
                                    </div>
                                    {online && (
                                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#22C55E] ring-2 ring-card" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm truncate text-foreground">
                                      {name}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground truncate">
                                      {memberEmail(m)}
                                    </div>
                                  </div>
                                  <RoleBadge role={m.role} />
                                </div>
                              );
                            })
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={(e) => openInviteModal(team.id, e)}
                              className="flex-1 h-10 rounded-xl border border-dashed border-primary/40 text-primary-deep font-semibold text-xs inline-flex items-center justify-center gap-2 bg-transparent cursor-pointer appearance-none hover:bg-secondary transition-colors"
                            >
                              <UserPlus className="w-3.5 h-3.5" /> Invite Member
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Teams pagination */}
                {teams.length > teamPageSize && (
                  <Paginator
                    total={teams.length}
                    page={teamPage}
                    pageSize={teamPageSize}
                    onPage={setTeamPage}
                    onPageSize={setTeamPageSize}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ModalShell
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          resetCreate();
        }}
      >
        <ModalHeader
          title="Create Team"
          close={() => {
            setCreateModalOpen(false);
            resetCreate();
          }}
        />
        <div className="px-5 pb-5 space-y-4">
          <Field label="Team Name" required>
            <FieldInput
              placeholder="e.g. Design Team"
              autoFocus
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
          </Field>
          <div>
            <label className="text-xs font-semibold">Description</label>
            <textarea
              placeholder="What does this team work on?"
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              className="mt-1.5 w-full min-h-24 rounded-xl border border-border bg-background p-3 text-sm font-sans outline-none resize-none"
            />
          </div>
        </div>
        <ModalFooter
          close={() => {
            setCreateModalOpen(false);
            resetCreate();
          }}
          primary={handleCreate}
          primaryLabel="Create"
          loading={creating}
        />
      </ModalShell>

      <ModalShell
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingTeam(null);
        }}
      >
        <ModalHeader
          title="Edit Team"
          close={() => {
            setEditModalOpen(false);
            setEditingTeam(null);
          }}
        />
        <div className="px-5 pb-5 space-y-4">
          <Field label="Team Name" required>
            <FieldInput
              placeholder="e.g. Design Team"
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </Field>
          <div>
            <label className="text-xs font-semibold">Description</label>
            <textarea
              placeholder="What does this team work on?"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="mt-1.5 w-full min-h-24 rounded-xl border border-border bg-background p-3 text-sm font-sans outline-none resize-none"
            />
          </div>
        </div>
        <ModalFooter
          close={() => {
            setEditModalOpen(false);
            setEditingTeam(null);
          }}
          primary={handleEdit}
          primaryLabel="Save"
          loading={editing}
        />
      </ModalShell>

      <ModalShell
        open={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false);
          setInviteEmails("");
        }}
      >
        <ModalHeader
          title="Invite Member"
          close={() => {
            setInviteModalOpen(false);
            setInviteEmails("");
          }}
        />
        <div className="px-5 pb-5 space-y-2">
          <label className="text-xs font-semibold">
            <span className="text-coral">* </span>Email Addresses
          </label>
          <textarea
            placeholder={"colleague1@company.com,\ncolleague2@company.com"}
            value={inviteEmails}
            onChange={(e) => setInviteEmails(e.target.value)}
            className="w-full min-h-24 rounded-xl border border-border bg-background p-3 text-sm font-sans outline-none resize-none"
          />
          <div className="text-[11px] text-muted-foreground">
            Separate multiple emails with commas
          </div>
        </div>
        <ModalFooter
          close={() => {
            setInviteModalOpen(false);
            setInviteEmails("");
          }}
          primary={handleInvite}
          primaryLabel="Send Invite"
          loading={inviting}
        />
      </ModalShell>
    </>
  );
}
