"use client";

import React from "react";
import { Spin } from "antd";
import { LoadingOutlined } from "@ant-design/icons";

interface VCSpinnerProps {
  size?: "small" | "default" | "large";
  tip?: string;
  fullPage?: boolean;
}

export function VCSpinner({
  size = "default",
  tip,
  fullPage = false,
}: VCSpinnerProps) {
  const icon = (
    <LoadingOutlined
      style={{
        fontSize: size === "large" ? 40 : size === "small" ? 16 : 24,
        color: "#3CB371",
      }}
      spin
    />
  );

  if (fullPage) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 300,
          gap: 16,
        }}
      >
        <Spin indicator={icon} size={size} />
        {tip && <span style={{ color: "#8C8C8C", fontSize: 14 }}>{tip}</span>}
      </div>
    );
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Spin indicator={icon} size={size} />
      {tip && <span style={{ color: "#8C8C8C", fontSize: 14 }}>{tip}</span>}
    </div>
  );
}
