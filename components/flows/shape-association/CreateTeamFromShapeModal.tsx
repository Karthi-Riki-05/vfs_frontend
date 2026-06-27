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
import { teamsApi } from "@/api/teams.api";
import { shapesApi } from "@/api/shapes.api";
import type { ShapeRef, AssociationResult } from "./types";

interface Props {
  open: boolean;
  shapeRef: ShapeRef | null;
  onClose: () => void;
  onSuccess: (result: AssociationResult) => void;
}

export default function CreateTeamFromShapeModal({
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
      toast.error("Team name is required");
      return;
    }
    setLoading(true);
    try {
      // 1. Create the team
      const teamRes = await teamsApi.create({ name: name.trim() });
      const team = teamRes.data?.data || teamRes.data;
      if (!team?.id) throw new Error("Team creation failed");

      // 2. Add members by email (best-effort — unknown emails are reported)
      const failed: string[] = [];
      for (const email of emails) {
        try {
          await teamsApi.addMember(team.id, { email });
        } catch {
          failed.push(email);
        }
      }
      if (failed.length) {
        toast.warning(`Could not add: ${failed.join(", ")}`);
      }

      // 3. Associate the shape (creates the Shape row if needed)
      const assocRes = await shapesApi.associateTeam(
        shapeRef.shapeId || "new",
        {
          teamId: team.id,
          shape: {
            name: shapeRef.shapeName || "Shape",
            xmlContent: shapeRef.shapeXml,
          },
        },
      );
      const assocData = assocRes.data?.data || assocRes.data;

      toast.success(`Team "${team.name}" created and shape associated`);
      reset();
      onSuccess({
        shapeId: assocData?.shape?.id || shapeRef.shapeId || "",
        cellId: shapeRef.cellId,
        association: { type: "team", id: team.id, name: team.name },
      });
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message || "Failed to create team",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell open={open} onClose={close}>
      <ModalHeader title="Create Team from Shape" close={close} />
      <div className="px-5 pb-5 space-y-4">
        <div className="text-xs text-muted-foreground">
          Shape: <strong>{shapeRef?.shapeName || "Unnamed shape"}</strong> — it
          will be added to the new team&apos;s shared shape library.
        </div>
        <Field label="Team name" required>
          <FieldInput
            placeholder="e.g. Design Team"
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
        primaryLabel="Create Team"
        loading={loading}
        disabled={!name.trim()}
      />
    </ModalShell>
  );
}
