"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { Field, FieldInput } from "@/components/common/Field";
import { MemberList, MemberRow } from "@/components/common/MemberList";
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
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<MemberRow[]>([]);
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
      setName(team?.name || "");
      setMembers(
        Array.isArray(memberList)
          ? memberList.map((m: any) => {
              const u = m.user || m;
              return { id: u.id, name: u.name, email: u.email };
            })
          : [],
      );
    } catch {
      toast.error("Failed to load team details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && teamId) loadTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teamId]);

  const handleAddMember = async (email: string) => {
    if (!teamId) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.warning("Enter a valid email address");
      return;
    }
    setAddingMember(true);
    try {
      await teamsApi.addMember(teamId, { email });
      toast.success("Member added");
      loadTeam();
    } catch (err: any) {
      toast.error(
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
      toast.success("Member removed");
      loadTeam();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message || "Failed to remove member",
      );
    }
  };

  const handleSave = async () => {
    if (!teamId) return;
    if (!name.trim()) {
      toast.warning("Team name is required");
      return;
    }
    setSaving(true);
    try {
      await teamsApi.update(teamId, { name: name.trim() });
      toast.success("Team updated");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message || "Failed to update team",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell open={open} onClose={onClose}>
      <ModalHeader title="Edit Team" close={onClose} />
      <div className="px-5 pb-5 space-y-4">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : (
          <>
            <Field label="Team name" required>
              <FieldInput
                maxLength={255}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <div>
              <div className="text-sm font-semibold mb-2">Members</div>
              <MemberList
                members={members}
                adding={addingMember}
                onAdd={handleAddMember}
                onRemove={handleRemoveMember}
              />
            </div>
          </>
        )}
      </div>
      <ModalFooter
        close={onClose}
        primary={handleSave}
        primaryLabel="Save"
        loading={saving}
        disabled={!name.trim()}
      />
    </ModalShell>
  );
}
