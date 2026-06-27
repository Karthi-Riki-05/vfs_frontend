"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { Field, FieldInput } from "@/components/common/Field";
import { EmailTagInput } from "@/components/common/EmailTagInput";
import api from "@/lib/axios";
import { shapesApi } from "@/api/shapes.api";
import type { ShapeRef, AssociationResult } from "./types";

interface Props {
  open: boolean;
  shapeRef: ShapeRef | null;
  onClose: () => void;
  onSuccess: (result: AssociationResult) => void;
}

export default function CreateChatGroupFromShapeModal({
  open,
  shapeRef,
  onClose,
  onSuccess,
}: Props) {
  const [name, setName] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName("");
    setEmails([]);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!shapeRef) return;
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }
    setLoading(true);
    try {
      // 1. Create the chat group (backend resolves memberEmails → user ids)
      const groupRes = await api.post("/chat/groups", {
        title: name.trim(),
        memberEmails: emails,
      });
      const group = groupRes.data?.data || groupRes.data;
      if (!group?.id) throw new Error("Group creation failed");

      // 2. Associate the shape (creates the Shape row if needed)
      const assocRes = await shapesApi.associateGroup(
        shapeRef.shapeId || "new",
        {
          groupId: group.id,
          shape: {
            name: shapeRef.shapeName || "Shape",
            xmlContent: shapeRef.shapeXml,
          },
        },
      );
      const assocData = assocRes.data?.data || assocRes.data;

      toast.success(`Group "${group.title}" created and shape associated`);
      reset();
      onSuccess({
        shapeId: assocData?.shape?.id || shapeRef.shapeId || "",
        cellId: shapeRef.cellId,
        association: { type: "group", id: group.id, name: group.title },
      });
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message || "Failed to create chat group",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell open={open} onClose={close}>
      <ModalHeader title="Create Chat Group from Shape" close={close} />
      <div className="px-5 pb-5 space-y-4">
        <div className="text-xs text-muted-foreground">
          Shape: <strong>{shapeRef?.shapeName || "Unnamed shape"}</strong> — it
          will be shared within the new chat group.
        </div>
        <Field label="Group name" required>
          <FieldInput
            placeholder="e.g. Process Discussion"
            maxLength={255}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Member emails (optional)">
          <EmailTagInput
            value={emails}
            onChange={setEmails}
            placeholder="Type emails and press Enter"
          />
        </Field>
      </div>
      <ModalFooter
        close={close}
        primary={handleSubmit}
        primaryLabel="Create Group"
        loading={loading}
        disabled={!name.trim()}
      />
    </ModalShell>
  );
}
