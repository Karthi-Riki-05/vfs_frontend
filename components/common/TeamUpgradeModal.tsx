"use client";

import React from "react";
import { Modal, Button } from "antd";
import { TeamOutlined, CheckCircleFilled } from "@ant-design/icons";
import { useRouter } from "next/navigation";

interface TeamUpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature?: "teams" | "chat";
}

const FEATURES = [
  "Team collaboration",
  "Shared flows",
  "Team chat",
  "300 AI credits/month",
];

const TeamUpgradeModal: React.FC<TeamUpgradeModalProps> = ({
  open,
  onClose,
  feature = "teams",
}) => {
  const router = useRouter();
  const title =
    feature === "chat"
      ? "Chat requires a subscription"
      : "Teams requires a subscription";

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="later" onClick={onClose}>
          Maybe Later
        </Button>,
        <Button
          key="plans"
          type="primary"
          onClick={() => {
            onClose();
            router.push("/dashboard/subscription");
          }}
          style={{ backgroundColor: "#3CB371", borderColor: "#3CB371" }}
        >
          View Plans
        </Button>,
      ]}
      centered
      width={460}
      zIndex={1200}
    >
      <div style={{ textAlign: "center", padding: "16px 0 0" }}>
        <TeamOutlined
          style={{ fontSize: 40, color: "#3CB371", marginBottom: 16 }}
        />
        <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 600 }}>
          {title}
        </h3>
        <p style={{ color: "#595959", margin: "0 0 16px", fontSize: 14 }}>
          The Team plan unlocks collaboration features for you and your team.
        </p>
      </div>
      <div
        style={{
          background: "#F8F9FA",
          borderRadius: 8,
          padding: "14px 20px",
          marginBottom: 8,
        }}
      >
        {FEATURES.map((f) => (
          <div
            key={f}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "5px 0",
              fontSize: 14,
              color: "#1A1A2E",
            }}
          >
            <CheckCircleFilled style={{ color: "#3CB371", fontSize: 14 }} />
            <span>{f}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default TeamUpgradeModal;
