"use client";

import React, { useState } from "react";
import { Tag, Typography } from "antd";
import { DownOutlined, UpOutlined, FileTextOutlined } from "@ant-design/icons";

const { Text } = Typography;

export interface HistoryAccordionItem {
  date: string;
  description: string;
  amount: string;
  status?: string;
}

interface HistoryAccordionProps {
  title: string;
  items: HistoryAccordionItem[];
  defaultOpen?: boolean;
}

function statusColor(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "success" || s === "succeeded" || s === "paid") return "success";
  if (s === "refunded" || s === "partially_refunded") return "warning";
  if (s === "failed" || s === "payment_failed") return "error";
  return "default";
}

function statusLabel(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "success" || s === "succeeded" || s === "paid") return "Paid";
  if (s === "refunded" || s === "partially_refunded") return "Refunded";
  if (s === "failed" || s === "payment_failed") return "Failed";
  return status || "Unknown";
}

export default function HistoryAccordion({
  title,
  items,
  defaultOpen = false,
}: HistoryAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        border: "1px solid #f0f0f0",
        borderRadius: 8,
        overflow: "hidden",
        marginBottom: 0,
      }}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          background: "#fafafa",
          border: "none",
          borderBottom: open ? "1px solid #f0f0f0" : "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileTextOutlined style={{ color: "#888", fontSize: 15 }} />
          <Text strong style={{ fontSize: 14 }}>
            {title}
          </Text>
          <Text
            type="secondary"
            style={{
              fontSize: 12,
              background: "#f0f0f0",
              borderRadius: 10,
              padding: "1px 8px",
            }}
          >
            {items.length}
          </Text>
        </div>
        {open ? (
          <UpOutlined style={{ fontSize: 12, color: "#888" }} />
        ) : (
          <DownOutlined style={{ fontSize: 12, color: "#888" }} />
        )}
      </button>

      {/* Body */}
      {open && (
        <div>
          {items.length === 0 ? (
            <div
              style={{
                padding: "24px 16px",
                textAlign: "center",
                color: "#aaa",
                fontSize: 13,
              }}
            >
              No records yet
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom:
                    idx < items.length - 1 ? "1px solid #f5f5f5" : "none",
                  gap: 12,
                }}
              >
                {/* Left: description + date + optional status */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.description}
                  </Text>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 3,
                      flexWrap: "wrap",
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.date}
                    </Text>
                    {item.status && (
                      <Tag
                        color={statusColor(item.status)}
                        style={{ margin: 0, fontSize: 11, lineHeight: "18px" }}
                      >
                        {statusLabel(item.status)}
                      </Tag>
                    )}
                  </div>
                </div>

                {/* Right: amount */}
                <Text
                  strong
                  style={{
                    fontSize: 13,
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {item.amount}
                </Text>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
