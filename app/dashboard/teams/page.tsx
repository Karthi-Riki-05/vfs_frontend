"use client";

import React, { useState, useEffect, useCallback , useMemo } from "react";
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
import { onWorkspaceFlush } from "@/lib/workspaceCache";
import { usePro } from "@/hooks/usePro";
import { useAppContext } from "@/context/AppContext";
import { useAiBilling } from "@/context/AiBillingContext";
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
  // bug-085 (Option A): the profile switcher only ever selects JOINED teams the
  // user does NOT own (an owned team folds into the personal context, teamId
  // null). So a non-null active billing team means the user is operating inside
  // someone else's workspace — where they may invite, but must NOT create a new
  // caller-owned team (the backend also enforces this with 403
  // TEAM_CREATE_FORBIDDEN). Hide the "Create Team" affordance there.
  //
  // bug-112 (owner decision, 2026-08-09): an ADMIN of that workspace MAY create
  // teams there, so the affordance is hidden only from plain members. The team
  // is owned by the workspace owner (see team.service.createTeam), which keeps
  // bug-085's actual protection — no caller-owned team escaping the tenant with
  // the creator's tier.
  const { activeBillingTeamId } = useAiBilling();
  const inJoinedWorkspace = !!activeBillingTeamId;
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
  // Whether the caller OWNS the active workspace. Members switched into someone
  // else's tenant see the roster read-only.
  const [canManageWorkspace, setCanManageWorkspace] = useState(true);
  // bug-112: two permissions, not one. ADMINs may remove people and manage
  // teams; only the OWNER may promote/demote. Collapsing them into one flag is
  // what would let an admin mint more admins.
  const [canManageRoles, setCanManageRoles] = useState(true);
  // Derived, NOT stored: computing this inside `fetchAllMembers` (useCallback
  // with [] deps) captured the first render's `user`, which is undefined while
  // useAuth resolves — so the role was permanently null and every admin
  // affordance stayed hidden even though the roster said "Admin".
  const myWorkspaceRole = useMemo(() => {
    const me = allMembers.find(
      (m: any) => (m.userId || m.user?.id || m.id) === user?.id,
    );
    return (me?.role as string | undefined) ?? null;
  }, [allMembers, user?.id]);
  // Own workspace → always; someone else's → only as its ADMIN (bug-112).
  // One rule, shared by both "Create Team" affordances.
  const canCreateTeam = !inJoinedWorkspace || myWorkspaceRole === "ADMIN";
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

  // CHANGE-001 — "Add Members": people are in the WORKSPACE first and in teams
  // second, so someone can already be here (invited long ago, or left in the
  // workspace when a team was deleted) without belonging to this team. Inviting
  // them by email again would be wrong — they are already in. This adds them
  // straight to the team instead.
  const [addMembersTeam, setAddMembersTeam] = useState<any>(null);
  const [addSelection, setAddSelection] = useState<string[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);
  // Type-to-search rather than a checkbox list: a workspace can hold far more
  // people than fit on screen, and scrolling a long list to find two names is
  // painful. Chosen people become chips so the selection stays visible while
  // you keep searching.
  const [addSearch, setAddSearch] = useState("");

  /**
   * Workspace people who are NOT yet in this team — the candidates for
   * "Add Members". Derived from the roster, so it includes someone with no
   * teams at all, which is exactly the case this feature exists for.
   */
  const availableToAdd = useCallback(
    (teamId: string, teamAppContext?: string | null) => {
      const inTeam = new Set(
        (membersByTeam[teamId] || []).map((m: any) => memberId(m)),
      );
      return allMembers.filter((m: any) => {
        const uid = memberId(m);
        if (!uid || inTeam.has(uid)) return false;
        // A PRO team may only contain people who own Pro — the backend refuses
        // the rest with 402 PRO_REQUIRED. Filter them out here so the picker
        // never offers a choice that is guaranteed to fail.
        if (teamAppContext === "pro" && !m.hasPro) return false;
        // Belt and braces: the roster carries each person's teams, so exclude
        // anyone already labelled with this team even if the accordion's
        // member list has not loaded yet.
        return !(m.teams || []).some((t: any) => t.id === teamId);
      });
    },
    [allMembers, membersByTeam],
  );

  const handleAddExistingMembers = async () => {
    if (!addMembersTeam || addSelection.length === 0) return;
    setAddingMembers(true);
    const chosen = allMembers.filter((m: any) =>
      addSelection.includes(memberId(m)),
    );
    let added = 0;
    const failures: string[] = [];
    for (const m of chosen) {
      try {
        // The existing add-by-email endpoint appends this team to their
        // existing workspace row — no second membership row is created.
        await teamsApi.addMember(addMembersTeam.id, { email: memberEmail(m) });
        added += 1;
      } catch (err: any) {
        failures.push(
          `${memberName(m)}: ${err?.response?.data?.error?.message || "failed"}`,
        );
      }
    }
    if (added > 0) {
      toast.success(
        `${added} member${added > 1 ? "s" : ""} added to ${addMembersTeam.name || "the team"}`,
      );
    }
    // Report partial failures rather than a blanket success — a seat limit can
    // stop some of a batch part-way through.
    if (failures.length) toast.error(failures.join(" · "));
    await refreshAfterMembershipChange(addMembersTeam.id);
    setAddingMembers(false);
    setAddMembersTeam(null);
    setAddSelection([]);
  };

  // CHANGE-001 — revoking workspace access. Distinct from removing someone
  // from a team: deleting every team a person is in leaves them in the
  // workspace with full access, so this is the only thing that actually
  // revokes it.
  const handleRemoveFromWorkspace = (m: any) => {
    const name = memberName(m);
    confirmDialog({
      title: `Remove ${name} from your workspace?`,
      content:
        "They lose access to your workspace immediately — its flows, its projects and its chat — and are removed from every team in it. This is not the same as removing them from a team. To undo it you would have to invite them back.",
      confirmLabel: "Remove from workspace",
      danger: true,
      onConfirm: async () => {
        const uid = memberId(m);
        setRemovingId(uid);
        try {
          await teamsApi.removeFromWorkspace(uid);
          toast.success(`${name} removed from your workspace`);
          await refreshAfterMembershipChange(m.teamId);
        } catch (err: any) {
          toast.error(
            err?.response?.data?.error?.message ||
              "Failed to remove user from workspace",
          );
        } finally {
          setRemovingId(null);
        }
      },
    });
  };

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
  // CHANGE-001: this list is the WORKSPACE roster, in one request.
  //
  // It used to fan out one listMembers call per team and dedupe the results,
  // which had two problems: it was N+1, and it could only ever find people by
  // walking teams — so anyone whose teams had all been deleted was invisible
  // here despite still having full access to the workspace. Since a team is now
  // just a label, the roster is the source of truth and the teams come with it.
  const fetchAllMembers = useCallback(async (_teamList?: any[]) => {
    setMembersLoading(true);
    try {
      const res = await teamsApi.listWorkspaceMembers();
      const d: any = res.data?.data ?? res.data;
      const list = Array.isArray(d) ? d : d?.members || [];
      // The roster follows the ACTIVE workspace. Only its owner may manage it,
      // so a member switched into someone else's tenant gets a read-only view
      // (the write endpoints enforce this independently).
      setCanManageWorkspace(Array.isArray(d) ? true : !!d?.canManage);
      setCanManageRoles(Array.isArray(d) ? true : !!d?.canManageRoles);
      // `m.teams` is carried through for the confirm-dialog wording (whether
      // this is someone's last team), but is deliberately NOT rendered here —
      // this list is the workspace, team names belong to the teams below.
      setAllMembers(list);
    } catch {
      setAllMembers([]);
      setCanManageWorkspace(false);
      setCanManageRoles(false);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllMembers();
  }, [fetchAllMembers]);

  // Re-scope the roster when the workspace changes.
  //
  // `useTeams` already listens for this, so All Teams re-scoped correctly while
  // All Teammates did not — switching back to your own workspace left the
  // PREVIOUS workspace's people on screen next to the new workspace's teams.
  // The two sections must move together or the page describes two workspaces.
  //
  // Clearing on flush first (as useTeams does) avoids ghost-rendering the old
  // roster during the fetch window; the accordion's per-team cache belongs to
  // the old workspace too, so it goes with it.
  useEffect(() => {
    const onSwitch = () => {
      setMembersByTeam({});
      fetchAllMembers();
    };
    window.addEventListener("vc:workspace-switch", onSwitch);
    return () => window.removeEventListener("vc:workspace-switch", onSwitch);
  }, [fetchAllMembers]);

  useEffect(
    () =>
      onWorkspaceFlush(() => {
        setAllMembers([]);
        setMembersByTeam({});
      }),
    [],
  );

  // Accordion lazy load for Teams section
  const loadMembers = async (
    teamId: string,
    fallback: any[],
    { force = false }: { force?: boolean } = {},
  ) => {
    // `force` exists for post-mutation refresh: the accordion is already open,
    // so nothing re-triggers this, and the cached list would stay stale.
    if (membersByTeam[teamId] && !force) return;
    if (!force && Array.isArray(fallback) && fallback.length) {
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

  /**
   * Refresh everything a membership change can affect, in one place.
   *
   * Clearing `membersByTeam` alone was NOT enough and caused a visible bug: the
   * accordion falls back to `team.members` from the teams list when the cache
   * is empty, and that list is only refetched by `useTeams`. So a removed
   * member kept rendering (from the stale fallback) with a stale
   * "2 members" count, until a full page reload.
   *
   * Three things must move together:
   *   1. the workspace roster (All Teammates)
   *   2. the teams list — supplies `_count.members` AND the fallback rows
   *   3. the OPEN team's member list, force-reloaded: the accordion is already
   *      expanded, so nothing else re-triggers loadMembers.
   */
  const refreshAfterMembershipChange = useCallback(
    async (teamId?: string | null) => {
      const openTeamId = teamId || expanded;
      setMembersByTeam({});
      await Promise.all([fetchAllMembers(), fetchTeams()]);
      if (openTeamId) await loadMembers(openTeamId, [], { force: true });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expanded, fetchAllMembers, fetchTeams],
  );


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
      // bug-094 named what actually goes. CHANGE-001 then changed it: a team is
      // only a grouping of people now, so deleting it removes the GROUP and
      // nothing else. Members keep the workspace, its flows and its chat. Say
      // so plainly — the old copy promised to "remove all members", which would
      // now be a lie and would scare owners out of tidying up their teams.
      content:
        "This deletes the group only. Everyone in it keeps access to your workspace, its flows and its chat — they just won't be in this team any more. To remove someone entirely, use the ⋯ menu in All Teammates.",
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        await deleteTeam(team.id);
        setExpanded((cur) => (cur === team.id ? null : cur));
        // Deleting a team strips its id from every member's teamIds, so the
        // roster changes too — refresh it, not just the teams list.
        await refreshAfterMembershipChange(null);
      },
    });
  };

  // Remove from ONE team. CHANGE-001: this drops a label and nothing else —
  // never a revocation, even if it was their last team. To take away access,
  // use "Remove from workspace" in All Teammates.
  const handleRemoveMember = (m: any) => {
    const name = memberName(m);
    const teamLabel = m.teamName ? `"${m.teamName}"` : "this team";
    confirmDialog({
      title: `Remove ${name} from ${teamLabel}?`,
      content:
        "They keep access to your workspace, its flows and its chat — they just won't be in this team any more. To remove them completely, use \"Remove from workspace\" in All Teammates.",
      confirmLabel: "Remove",
      danger: true,
      onConfirm: async () => {
        const uid = memberId(m);
        setRemovingId(uid);
        try {
          await teamsApi.removeMember(m.teamId, uid);
          toast.success(`${name} removed from ${teamLabel}`);
          await refreshAfterMembershipChange(m.teamId);
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
    // CHANGE-001: role is per WORKSPACE, not per team — one row holds it for
    // every team the person is in. The API is still addressed by a team id, so
    // any team they belong to reaches the same row.
    const viaTeamId = m.teamId || m.teams?.[0]?.id;
    if (!viaTeamId) {
      toast.error("This user is not in a team, so their role cannot be changed here.");
      return;
    }
    setRoleChangingId(uid);
    try {
      await teamsApi.updateMemberRole(viaTeamId, uid, newRole);
      toast.success("Role updated");
      await refreshAfterMembershipChange(viaTeamId);
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

  // CHANGE-001: count DISTINCT people in the workspace. Summing per-team counts
  // double-counted anyone in two teams and missed anyone in none — both of
  // which are now normal states.
  const totalMembers = allMembers.length;

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
            {canCreateTeam && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="shrink-0 h-11 px-5 rounded-xl bg-primary text-white font-semibold text-sm inline-flex items-center gap-2 shadow-[var(--shadow-fab)] hover:bg-[#1F7D5E] transition-colors border-0 cursor-pointer appearance-none"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Team</span>
                <span className="sm:hidden">New</span>
              </button>
            )}
          </div>

          {/* ── Members section ─────────────────────────────────── */}
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
            All Teammates
          </div>
          <div className="rounded-2xl bg-card border border-border shadow-[var(--shadow-card)] mb-6 overflow-hidden">
            {/* Search + filter bar */}
            <div className="flex gap-2 px-4 py-3 border-b border-border flex-wrap items-center">
              <div className="flex items-center gap-2 h-10 px-3 rounded-xl bg-background border border-border flex-1 min-w-[160px] transition-colors focus-within:border-primary">
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
                  // CHANGE-001: `isOwner` comes from the roster (userId ===
                  // workspaceId), so it is the WORKSPACE owner — not a per-team
                  // flag. They can never be removed from their own workspace.
                  const isWorkspaceOwner = !!m.isOwner;
                  const isChanging = roleChangingId === uid;
                  const isRemoving = removingId === uid;
                  const online = m.online ?? m.isOnline ?? false;

                  // This list is WORKSPACE-level, so it only offers
                  // workspace-level actions. Removing someone from one team
                  // belongs with that team — see the ⋯ on each member row in
                  // the All Teams section below.
                  // Owner decision (bug-112): OWNER and ADMIN rows are
                  // PROTECTED here — demote to Member first, then remove. Two
                  // admins must not be able to remove each other, and an admin
                  // must not be able to remove the owner's other admins.
                  const targetIsPrivileged =
                    isWorkspaceOwner || m.role === "OWNER" || m.role === "ADMIN";
                  const actionItems: any[] = [
                    // Promote/demote is OWNER-only, so an admin cannot mint
                    // more admins or demote a peer.
                    ...(canManageRoles
                      ? [
                          {
                            key: "role-admin",
                            label: "Make Admin",
                            disabled: m.role === "ADMIN" || isWorkspaceOwner,
                            onClick: () => handleChangeRole(m, "ADMIN"),
                          },
                          {
                            key: "role-member",
                            label: "Make Member",
                            disabled: m.role === "MEMBER" || isWorkspaceOwner,
                            onClick: () => handleChangeRole(m, "MEMBER"),
                          },
                          { type: "divider" as const },
                        ]
                      : []),
                    {
                      key: "remove-workspace",
                      label: "Remove from workspace",
                      danger: true,
                      disabled: targetIsPrivileged,
                      title: targetIsPrivileged
                        ? "Change their role to Member first"
                        : undefined,
                      icon: <Trash2 className="w-3.5 h-3.5" />,
                      onClick: () => handleRemoveFromWorkspace(m),
                    },
                  ];

                  return (
                    <div
                      key={uid || i}
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

                      {/* No team names here on purpose — this list is the
                          workspace, not the teams. Which teams someone is in
                          is shown per team in the All Teams section. */}

                      {/* Role badge */}
                      <div className="shrink-0">
                        <RoleBadge role={m.role} />
                      </div>

                      {/* Actions. The roster endpoint is owner-only, so if this
                          list rendered at all the viewer IS the workspace
                          owner — no separate isTeamOwner check needed. */}
                      {canManageWorkspace &&
                        !isCurrentUser &&
                        actionItems.some((a: any) => a.type !== "divider") && (
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
                {canCreateTeam && (
                  <button
                    onClick={() => setCreateModalOpen(true)}
                    className="h-11 px-6 rounded-full bg-primary text-white font-semibold text-sm inline-flex items-center gap-2 shadow-[var(--shadow-fab)] hover:bg-[#1F7D5E] transition-colors border-0 cursor-pointer appearance-none"
                  >
                    <Plus className="w-4 h-4" /> Create Team
                  </button>
                )}
              </div>
            ) : (
              <>
                {pagedTeams.map((team: any) => {
                  const isOpen = expanded === team.id;
                  const memberCount =
                    team._count?.members || team.members?.length || 0;
                  // bug-112: per-team actions were gated on OWNERSHIP alone, so
                  // an ADMIN saw none of the buttons the backend would have
                  // allowed — `team.service` has permitted OWNER+ADMIN to invite
                  // and remove for a while ("Fix 5: Expand RBAC"), and the UI
                  // never followed. That is why promoting someone to admin
                  // appeared to change nothing at all.
                  const isTeamOwner =
                    team.teamOwnerId === user?.id ||
                    team.ownerId === user?.id ||
                    team.owner?.id === user?.id;
                  // A workspace admin manages every team in that workspace.
                  const canManageThisTeam =
                    isTeamOwner || myWorkspaceRole === "ADMIN";
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
                              {/* Ownership, NOT permission — an admin manages
                                  the team but is not its owner. */}
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

                        {canManageThisTeam && (
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
                              {/* Deleting a team stays OWNER-only — the backend
                                  enforces `teamOwnerId === userId`, so showing
                                  this to an admin would only produce a 403.
                                  Admins create, edit and manage members. */}
                              {isTeamOwner && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onSelect={() => handleDelete(team)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete team
                                  </DropdownMenuItem>
                                </>
                              )}
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
                              const uid = memberId(m);
                              const online = m.online ?? m.isOnline ?? false;
                              // Removing from THIS team belongs here, next to
                              // the team. The workspace-level removal lives in
                              // All Teammates above — different scope, different
                              // place, so the two can't be confused.
                              const isTeamRowOwner =
                                m.role === "OWNER" ||
                                uid === (team.teamOwnerId || team.owner?.id);
                              const canManage =
                                canManageThisTeam &&
                                !isTeamRowOwner &&
                                uid !== user?.id;
                              return (
                                <div
                                  key={uid || i}
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
                                  {canManage && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          disabled={removingId === uid}
                                          onClick={(e) => e.stopPropagation()}
                                          className="tw shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary border-0 bg-transparent cursor-pointer appearance-none transition-colors disabled:opacity-50"
                                        >
                                          {removingId === uid ? (
                                            <Spin size="small" />
                                          ) : (
                                            <MoreHorizontal className="w-4 h-4" />
                                          )}
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent
                                        align="end"
                                        className="tw"
                                      >
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive"
                                          onSelect={() =>
                                            handleRemoveMember({
                                              ...m,
                                              teamId: team.id,
                                              teamName: team.name,
                                              teams: m.teams || m.teamIds || [],
                                            })
                                          }
                                        >
                                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                                          Remove from team
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              );
                            })
                          )}
                          <div className="flex flex-col gap-2 mt-3">
                            <button
                              onClick={(e) => openInviteModal(team.id, e)}
                              className="h-10 rounded-xl border border-dashed border-primary/40 text-primary-deep font-semibold text-xs inline-flex items-center justify-center gap-2 bg-transparent cursor-pointer appearance-none hover:bg-secondary transition-colors"
                            >
                              <UserPlus className="w-3.5 h-3.5" /> Invite Member
                            </button>
                            {/* Only offered when there is actually somebody to
                                add — an empty picker is worse than no button. */}
                            {canManageThisTeam && availableToAdd(team.id, team.appContext).length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAddMembersTeam(team);
                                  setAddSelection([]);
                                }}
                                className="h-10 rounded-xl border border-border text-foreground font-semibold text-xs inline-flex items-center justify-center gap-2 bg-transparent cursor-pointer appearance-none hover:bg-secondary transition-colors"
                              >
                                <Users className="w-3.5 h-3.5" /> Add Members
                                <span className="text-muted-foreground font-medium">
                                  ({availableToAdd(team.id, team.appContext).length} in workspace)
                                </span>
                              </button>
                            )}
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
              className="mt-1.5 w-full min-h-24 rounded-xl border border-border bg-background p-3 text-sm font-sans resize-none"
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
              className="mt-1.5 w-full min-h-24 rounded-xl border border-border bg-background p-3 text-sm font-sans resize-none"
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

      {/* CHANGE-001 — add people who are already in the workspace to a team.
          No email, no invite: they already have access, this only adds the
          team label. */}
      <ModalShell
        open={!!addMembersTeam}
        onClose={() => {
          setAddMembersTeam(null);
          setAddSelection([]);
        }}
      >
        <ModalHeader
          title={`Add to ${addMembersTeam?.name || "team"}`}
          close={() => {
            setAddMembersTeam(null);
            setAddSelection([]);
          }}
        />
        <div className="px-5 pb-5">
          <p className="text-[12px] text-muted-foreground mb-3">
            These people are already in your workspace. Adding them here just
            puts them in this team — no invitation is sent.
          </p>

          {(() => {
            const pool = addMembersTeam
              ? availableToAdd(addMembersTeam.id, addMembersTeam.appContext)
              : [];
            const byId = new Map(pool.map((m: any) => [memberId(m), m]));
            const chosen = addSelection
              .map((id) => byId.get(id))
              .filter(Boolean) as any[];
            const q = addSearch.trim().toLowerCase();
            const matches = pool.filter((m: any) => {
              const uid = memberId(m);
              if (addSelection.includes(uid)) return false;
              if (!q) return true;
              return (
                memberName(m).toLowerCase().includes(q) ||
                memberEmail(m).toLowerCase().includes(q)
              );
            });
            const pick = (uid: string) => {
              setAddSelection((cur) =>
                cur.includes(uid) ? cur : [...cur, uid],
              );
              setAddSearch("");
            };

            return (
              <>
                {/* Chips + inline search, one control */}
                <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-background p-2 min-h-11 focus-within:ring-2 focus-within:ring-primary/30">
                  {chosen.map((m: any) => (
                    <span
                      key={memberId(m)}
                      className="inline-flex items-center gap-1.5 h-7 pl-1 pr-2 rounded-full bg-secondary text-[12px] font-medium text-foreground"
                    >
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[9px]"
                        style={{ background: gradientFor(memberName(m)) }}
                      >
                        {memberName(m).charAt(0).toUpperCase()}
                      </span>
                      <span className="truncate max-w-[140px]">
                        {memberName(m)}
                      </span>
                      <button
                        onClick={() =>
                          setAddSelection((cur) =>
                            cur.filter((x) => x !== memberId(m)),
                          )
                        }
                        aria-label={`Remove ${memberName(m)}`}
                        className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground bg-transparent border-0 p-0 cursor-pointer appearance-none"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={addSearch}
                    autoFocus
                    onChange={(e) => setAddSearch(e.target.value)}
                    onKeyDown={(e) => {
                      // Enter takes the top match — the fast path when you know
                      // the name. Backspace on an empty box removes the last
                      // chip, which is what every tag input does.
                      if (e.key === "Enter" && matches[0]) {
                        e.preventDefault();
                        pick(memberId(matches[0]));
                      } else if (
                        e.key === "Backspace" &&
                        !addSearch &&
                        addSelection.length
                      ) {
                        setAddSelection((cur) => cur.slice(0, -1));
                      }
                    }}
                    placeholder={
                      chosen.length ? "Add another…" : "Search name or email…"
                    }
                    className="flex-1 min-w-[140px] h-7 bg-transparent border-0 outline-none text-[13px] text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                <div className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-border">
                  {matches.length === 0 ? (
                    <div className="p-4 text-center text-[12px] text-muted-foreground">
                      {q
                        ? `No one matching "${addSearch}".`
                        : "Everyone in the workspace is already in this team."}
                    </div>
                  ) : (
                    matches.map((m: any, i: number) => (
                      <button
                        key={memberId(m)}
                        onClick={() => pick(memberId(m))}
                        className={`w-full flex items-center gap-3 p-2.5 text-left bg-transparent border-0 cursor-pointer appearance-none hover:bg-secondary transition-colors ${i !== matches.length - 1 ? "border-b border-border" : ""}`}
                      >
                        <div
                          className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-white font-bold text-[11px]"
                          style={{ background: gradientFor(memberName(m)) }}
                        >
                          {memberName(m).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-semibold text-foreground truncate">
                            {memberName(m)}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {memberEmail(m)}
                            {(m.teams || []).length === 0 && (
                              <span className="italic"> · in no team yet</span>
                            )}
                          </div>
                        </div>
                        <RoleBadge role={m.role} />
                      </button>
                    ))
                  )}
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  {pool.length} available · {addSelection.length} selected
                </div>
              </>
            );
          })()}
        </div>
        <ModalFooter
          close={() => {
            setAddMembersTeam(null);
            setAddSelection([]);
          }}
          primary={handleAddExistingMembers}
          primaryLabel={
            addSelection.length > 0
              ? `Add ${addSelection.length}`
              : "Add"
          }
          loading={addingMembers}
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
            className="w-full min-h-24 rounded-xl border border-border bg-background p-3 text-sm font-sans resize-none"
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
