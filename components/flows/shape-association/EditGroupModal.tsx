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
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  const loadGroup = async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const res = await api.get(`/chat/groups/${groupId}/info`);
      const info = res.data?.data || res.data;
      setName(info?.title || "");
      setMembers(Array.isArray(info?.members) ? info.members : []);
      setIsAdmin(!!info?.isAdmin);
    } catch {
      toast.error("Failed to load group details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && groupId) loadGroup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, groupId]);

  const handleAddMember = async (email: string) => {
    if (!groupId) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.warning("Enter a valid email address");
      return;
    }
    setAddingMember(true);
    try {
      // Backend addMember resolves emails passed in the userId field
      await api.post(`/chat/groups/${groupId}/members`, { userId: email });
      toast.success("Member added");
      loadGroup();
    } catch (err: any) {
      toast.error(
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
      toast.success("Member removed");
      loadGroup();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message || "Failed to remove member",
      );
    }
  };

  const handleSave = async () => {
    if (!groupId) return;
    if (!name.trim()) {
      toast.warning("Group name is required");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/chat/groups/${groupId}`, { title: name.trim() });
      toast.success("Group updated");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message || "Failed to update group",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell open={open} onClose={onClose}>
      <ModalHeader title="Edit Chat Group" close={onClose} />
      <div className="px-5 pb-5 space-y-4">
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : (
          <>
            {!isAdmin && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                Only the group creator can rename the group or manage members.
              </div>
            )}
            <Field label="Group name" required>
              <FieldInput
                maxLength={255}
                disabled={!isAdmin}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <div>
              <div className="text-sm font-semibold mb-2">Members</div>
              <MemberList
                members={members}
                canManage={isAdmin}
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
        disabled={!isAdmin || !name.trim()}
      />
    </ModalShell>
  );
}
