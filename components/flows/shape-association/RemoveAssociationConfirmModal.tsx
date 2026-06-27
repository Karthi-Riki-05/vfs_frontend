"use client";

import React, { useState } from "react";
import { Unlink } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { shapesApi } from "@/api/shapes.api";
import type { ShapeAssociation } from "./types";

interface Props {
  open: boolean;
  shapeId: string | null;
  cellId: string | null;
  association: ShapeAssociation | null;
  onClose: () => void;
  onRemoved: (shapeId: string, cellId: string) => void;
}

export default function RemoveAssociationConfirmModal({
  open,
  shapeId,
  cellId,
  association,
  onClose,
  onRemoved,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!shapeId) return;
    setLoading(true);
    try {
      await shapesApi.removeAssociation(shapeId);
      toast.success("Association removed");
      onRemoved(shapeId, cellId || "");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.error?.message || "Failed to remove association",
      );
    } finally {
      setLoading(false);
    }
  };

  const label = association?.type === "team" ? "team" : "chat group";

  return (
    <ConfirmDialog
      open={open}
      loading={loading}
      danger
      icon={<Unlink className="w-5 h-5 text-amber-500" />}
      title="Remove Association"
      confirmLabel="Remove"
      onConfirm={handleConfirm}
      onCancel={onClose}
      description={
        <>
          <p>
            Remove this shape from the {label}{" "}
            <strong>{association?.name || ""}</strong>?
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            The shape stays in your diagram — only the {label} link is removed.
            {association?.type === "team" &&
              " Team members will no longer see it in their shape library."}
          </p>
        </>
      }
    />
  );
}
