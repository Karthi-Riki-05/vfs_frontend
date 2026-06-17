"use client";

import React, { useState } from "react";
import { Modal, message } from "antd";
import { DisconnectOutlined } from "@ant-design/icons";
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
      message.success("Association removed");
      onRemoved(shapeId, cellId || "");
    } catch (err: any) {
      message.error(
        err?.response?.data?.error?.message || "Failed to remove association",
      );
    } finally {
      setLoading(false);
    }
  };

  const label = association?.type === "team" ? "team" : "chat group";

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleConfirm}
      confirmLoading={loading}
      okText="Remove"
      okButtonProps={{ danger: true }}
      title={
        <span>
          <DisconnectOutlined style={{ color: "#faad14", marginRight: 8 }} />
          Remove Association
        </span>
      }
      width={420}
      centered
    >
      <p>
        Remove this shape from the {label}{" "}
        <strong>{association?.name || ""}</strong>?
      </p>
      <p style={{ fontSize: 12, color: "#888" }}>
        The shape stays in your diagram — only the {label} link is removed.
        {association?.type === "team" &&
          " Team members will no longer see it in their shape library."}
      </p>
    </Modal>
  );
}
