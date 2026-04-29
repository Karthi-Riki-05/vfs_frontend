"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Modal, Button, Tag, message, Empty, Spin } from "antd";
import { CheckCircleFilled, ShareAltOutlined } from "@ant-design/icons";
import { flowPackApi } from "@/api/notifications.api";

interface PickerFlow {
  id: string;
  name: string;
  thumbnail: string | null;
  updatedAt: string;
  shareCount: number;
  isShared: boolean;
  markedForDowngrade: boolean;
}

interface FlowPickerModalProps {
  open: boolean;
  onConfirm: () => void;
}

const MAX_KEEP = 10;

export default function FlowPickerModal({
  open,
  onConfirm,
}: FlowPickerModalProps) {
  const [flows, setFlows] = useState<PickerFlow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    flowPackApi
      .pickerList()
      .then((res) => {
        const data = res.data?.data || res.data;
        setFlows(Array.isArray(data) ? data : []);
        // Pre-select shared flows up to the cap.
        const pre = new Set<string>();
        for (const f of data) {
          if (pre.size >= MAX_KEEP) break;
          if (f.isShared) pre.add(f.id);
        }
        setSelected(pre);
      })
      .catch(() => message.error("Failed to load your flows"))
      .finally(() => setLoading(false));
  }, [open]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_KEEP) next.add(id);
      return next;
    });
  };

  const selectAllShared = () => {
    const next = new Set(selected);
    for (const f of flows) {
      if (next.size >= MAX_KEEP) break;
      if (f.isShared) next.add(f.id);
    }
    setSelected(next);
  };

  const submit = async () => {
    if (selected.size === 0) {
      message.warning("Pick at least one flow to keep");
      return;
    }
    setSubmitting(true);
    try {
      const res = await flowPackApi.confirmSelection(Array.from(selected));
      const data = res.data?.data || res.data;
      message.success(
        `${data.keptFlows} kept, ${data.trashedFlows} moved to trash`,
      );
      onConfirm();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message || "Failed to save selection";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const sharedFlows = useMemo(() => flows.filter((f) => f.isShared), [flows]);
  const otherFlows = useMemo(() => flows.filter((f) => !f.isShared), [flows]);
  const cardWidth = 220;

  const renderCard = (f: PickerFlow) => {
    const isSelected = selected.has(f.id);
    const isLocked = !isSelected && selected.size >= MAX_KEEP;
    return (
      <div
        key={f.id}
        onClick={() => !isLocked && toggle(f.id)}
        style={{
          width: cardWidth,
          border: isSelected
            ? "2px solid #3CB371"
            : "1px solid " + (f.isShared ? "#FFD591" : "#E8E8E8"),
          background: f.isShared ? "#FFFBE6" : "#fff",
          borderRadius: 10,
          padding: 12,
          cursor: isLocked ? "not-allowed" : "pointer",
          opacity: isLocked ? 0.4 : 1,
          position: "relative",
          transition: "all 0.15s",
        }}
      >
        {isSelected && (
          <CheckCircleFilled
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              fontSize: 18,
              color: "#3CB371",
            }}
          />
        )}
        {f.isShared && (
          <Tag
            color="orange"
            style={{ position: "absolute", top: 8, left: 8, fontSize: 10 }}
          >
            <ShareAltOutlined /> Shared{" "}
            {f.shareCount > 0 ? `(${f.shareCount})` : ""}
          </Tag>
        )}
        <div
          style={{
            height: 110,
            background: "#F5F5F5",
            borderRadius: 6,
            marginBottom: 10,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {f.thumbnail ? (
            <img
              src={f.thumbnail}
              alt={f.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ color: "#bbb", fontSize: 11 }}>No preview</span>
          )}
        </div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#1A1A2E",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {f.name || "Untitled"}
        </div>
        <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
          Edited {new Date(f.updatedAt).toLocaleDateString()}
        </div>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      width={Math.min(
        typeof window !== "undefined" ? window.innerWidth - 64 : 900,
        1080,
      )}
      closable={false}
      maskClosable={false}
      keyboard={false}
      footer={null}
      title={
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#cf1322" }}>
            Your flow pack has expired
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#666",
              marginTop: 4,
              fontWeight: 400,
            }}
          >
            Select up to {MAX_KEEP} flows to keep. Others will move to trash for
            30 days — renew anytime within that window to auto-restore.
          </div>
        </div>
      }
      centered
    >
      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : flows.length === 0 ? (
        <Empty description="No flows to choose from" />
      ) : (
        <div style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: 8 }}>
          {sharedFlows.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#D48806",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Shared flows (recommended)</span>
                <Button size="small" onClick={selectAllShared}>
                  Select all shared
                </Button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))`,
                  gap: 12,
                }}
              >
                {sharedFlows.map(renderCard)}
              </div>
            </div>
          )}
          {otherFlows.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#666",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  marginBottom: 12,
                }}
              >
                Other flows
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))`,
                  gap: 12,
                }}
              >
                {otherFlows.map(renderCard)}
              </div>
            </div>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: 20,
          padding: "16px 0 0",
          borderTop: "1px solid #f0f0f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>
          {selected.size} / {MAX_KEEP} selected
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            type="link"
            onClick={() => (window.location.href = "/dashboard/subscription")}
          >
            Renew Plan Instead
          </Button>
          <Button
            type="primary"
            loading={submitting}
            disabled={selected.size === 0}
            onClick={submit}
            style={{ backgroundColor: "#3CB371", borderColor: "#3CB371" }}
          >
            Confirm Selection
          </Button>
        </div>
      </div>
    </Modal>
  );
}
