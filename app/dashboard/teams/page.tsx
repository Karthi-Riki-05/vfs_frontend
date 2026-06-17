"use client";

import React, { useState, useEffect } from "react";
import { Button, Modal, Spin, Typography, Dropdown, message } from "antd";
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
  ArrowRight,
  Users,
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

  // Accordion + lazy member loading
  const [expanded, setExpanded] = useState<string | null>(null);
  const [membersByTeam, setMembersByTeam] = useState<Record<string, any[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<string | null>(null);

  useEffect(() => {
    // Wait for usePro to settle — otherwise Pro users get blocked during the
    // initial render where hasPro=false / currentApp='free' (race condition).
    if (proLoading) return;

    // Pro app shell or active team context → unconditional access.
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
        const active = data?.hasSubscription && data?.status === "active";
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

  const loadMembers = async (teamId: string, fallback: any[]) => {
    if (membersByTeam[teamId]) return;
    // Seed with any members embedded in the list payload for instant render.
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
      message.error("Please enter a team name");
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
      message.error("Please enter at least one email address");
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
        message.error(`Invalid email format: ${invalid.join(", ")}`);
        setInviting(false);
        return;
      }

      await teamsApi.invite({ teamId: inviteTeamId!, emails: emailList });
      message.success(`Invitation${emailList.length > 1 ? "s" : ""} sent`);
      setInviteEmails("");
      setInviteModalOpen(false);
      fetchTeams();
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        "Failed to send invitation";
      message.error(errMsg);
    } finally {
      setInviting(false);
    }
  };

  const openInviteModal = (teamId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setInviteTeamId(teamId);
    setInviteModalOpen(true);
  };

  const openCreateModal = () => setCreateModalOpen(true);

  const openEditModal = (team: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingTeam(team);
    setEditName(team.name || "");
    setEditDesc(team.description || "");
    setEditModalOpen(true);
  };

  const handleEdit = async () => {
    if (!editName.trim()) {
      message.error("Please enter a team name");
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
      // handled by hook
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = (team: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    Modal.confirm({
      title: `Delete "${team.name || "this team"}"?`,
      content:
        "This will permanently delete the team and remove all members. This action cannot be undone.",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        await deleteTeam(team.id);
        setExpanded((cur) => (cur === team.id ? null : cur));
      },
    });
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

  // Only blank the whole page on the very first load — background refetches
  // (useTabFocus) keep the accordion visible instead of flashing a full-page spinner.
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

  return (
    <>
      <div className="tw min-h-screen bg-background pb-28">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-5 pt-4 sm:pt-6">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-foreground leading-tight">
                My Teams
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {teams.length} team{teams.length !== 1 ? "s" : ""} ·{" "}
                {totalMembers} member
                {totalMembers !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="h-10 px-4 rounded-full bg-primary text-white font-semibold text-sm inline-flex items-center gap-2 shadow-[var(--shadow-fab)] hover:bg-[#1F7D5E] transition-colors shrink-0 border-0 cursor-pointer appearance-none"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Team</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>

          {/* Empty state */}
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
                onClick={openCreateModal}
                className="h-11 px-6 rounded-full bg-primary text-white font-semibold text-sm inline-flex items-center gap-2 shadow-[var(--shadow-fab)] hover:bg-[#1F7D5E] transition-colors border-0 cursor-pointer appearance-none"
              >
                <Plus className="w-4 h-4" /> Create Team
              </button>
            </div>
          ) : (
            teams.map((team: any) => {
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
              const menuItems = [
                {
                  key: "edit",
                  label: "Edit team",
                  icon: <Pencil className="w-3.5 h-3.5" />,
                  onClick: (info: any) => {
                    info.domEvent.stopPropagation();
                    openEditModal(team, info.domEvent);
                  },
                },
                { type: "divider" as const },
                {
                  key: "delete",
                  label: "Delete team",
                  icon: <Trash2 className="w-3.5 h-3.5" />,
                  danger: true,
                  onClick: (info: any) => {
                    info.domEvent.stopPropagation();
                    handleDelete(team, info.domEvent);
                  },
                },
              ];

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
                          {memberCount} member{memberCount !== 1 ? "s" : ""} ·{" "}
                          {team.flowCount || 0} flow
                          {(team.flowCount || 0) !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </button>

                    {isTeamOwner && (
                      <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors bg-transparent border-0 p-0 cursor-pointer appearance-none shrink-0"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                      </Dropdown>
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
                        <button
                          onClick={() =>
                            router.push(`/dashboard/teams/${team.id}`)
                          }
                          className="text-[11px] font-semibold text-primary-deep inline-flex items-center gap-1 bg-transparent border-0 p-0 cursor-pointer appearance-none hover:underline"
                        >
                          Manage team <ArrowRight className="w-3 h-3" />
                        </button>
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
            })
          )}
        </div>
      </div>

      {/* Modals — ported to new_design ModalShell (prototype 1647–1722) */}
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
