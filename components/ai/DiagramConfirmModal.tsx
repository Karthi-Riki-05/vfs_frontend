"use client";

import React from "react";
import { Modal, Button, Typography } from "antd";
import { ThunderboltFilled } from "@ant-design/icons";

const { Text } = Typography;

interface DiagramConfirmModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  creditsRemaining: number;
  planResetsAt?: string | null;
  addonCredits?: number;
  loading?: boolean;
}

export default function DiagramConfirmModal({
  visible,
  onConfirm,
  onCancel,
  creditsRemaining,
  planResetsAt,
  addonCredits = 0,
  loading = false,
}: DiagramConfirmModalProps) {
  const usingPlanCredits = creditsRemaining - addonCredits > 0;

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      footer={null}
      centered
      width={420}
      maskClosable={!loading}
      closable={!loading}
      title={null}
    >
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "#3CB37115",
            margin: "0 auto 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ThunderboltFilled style={{ fontSize: 26, color: "#3CB371" }} />
        </div>
        <Typography.Title level={4} style={{ marginBottom: 8 }}>
          Generate Diagram?
        </Typography.Title>
        <Text type="secondary" style={{ fontSize: 14, display: "block" }}>
          This will use <strong style={{ color: "#1A1A2E" }}>1</strong> of your{" "}
          <strong style={{ color: "#3CB371" }}>{creditsRemaining}</strong>{" "}
          remaining credits
        </Text>

        {usingPlanCredits && planResetsAt && (
          <div
            style={{
              marginTop: 16,
              padding: "10px 12px",
              background: "#FAFAFA",
              borderRadius: 8,
              fontSize: 12,
              color: "#8C8C8C",
            }}
          >
            Plan credits reset on {new Date(planResetsAt).toLocaleDateString()}
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <Button
            block
            size="large"
            onClick={onCancel}
            disabled={loading}
            style={{ borderRadius: 10, height: 44, fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            type="primary"
            block
            size="large"
            onClick={onConfirm}
            loading={loading}
            style={{
              borderRadius: 10,
              height: 44,
              fontWeight: 600,
              backgroundColor: "#3CB371",
              borderColor: "#3CB371",
            }}
          >
            Generate
          </Button>
        </div>
      </div>
    </Modal>
  );
}
