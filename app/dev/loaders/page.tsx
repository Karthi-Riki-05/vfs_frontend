"use client";

import React, { useState } from "react";
import { Button, Card, Spin, Skeleton, Row, Col, Space, Tag } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import { CardSkeleton, TableSkeleton } from "@/components/PageSkeleton";
import { VCSpinner } from "@/components/shared/VCSpinner";

// ─── Static loader previews (no hooks / API calls) ──────────────────────────

function AppContextLoaderPreview() {
  return (
    <div className="tw" style={{ width: "100%", height: "100%" }}>
      <div
        className="h-full bg-gradient-to-br from-primary via-primary to-[#1F7D5E] flex flex-col items-center justify-center text-white"
        style={{ minHeight: 400 }}
      >
        <div className="animate-in zoom-in duration-700">
          <div style={{ width: 96, height: 96 }}>
            <svg viewBox="0 0 32 32" width={96} height={96}>
              <path d="M16 2 L4 6 V16 C4 23 10 28 16 30 V2 Z" fill="#FF9A30" />
              <path
                d="M16 2 L28 6 V16 C28 23 22 28 16 30 V2 Z"
                fill="#1F7D5E"
              />
              <path
                d="M16 2 L22 4 V14 C22 19 19 22 16 23 V2 Z"
                fill="#006AA8"
              />
            </svg>
          </div>
        </div>
        <div className="mt-6 text-2xl font-extrabold tracking-tight">
          Value Charts
        </div>
        <div className="mt-1 text-sm text-white/85">
          We Add Value To Your Business
        </div>
        <div className="mt-12 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-white/70 animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
        <div className="absolute bottom-10 text-xs text-white/70">
          Loading your workspace…
        </div>
      </div>
    </div>
  );
}

function PageSkeletonCardPreview() {
  return (
    <div style={{ width: "100%", padding: 8 }}>
      <CardSkeleton count={4} />
    </div>
  );
}

function PageSkeletonTablePreview() {
  return (
    <div style={{ width: "100%", padding: 8 }}>
      <TableSkeleton rows={6} />
    </div>
  );
}

function RecentDocumentsLoaderPreview() {
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <Spin size="large" />
      <div style={{ marginTop: 16, color: "#8C8C8C", fontSize: 13 }}>
        Recent documents loading…
      </div>
    </div>
  );
}

function ProGuardLoaderPreview() {
  return (
    <div style={{ textAlign: "center", paddingTop: 120 }}>
      <Spin size="large" />
      <div style={{ marginTop: 16, color: "#8C8C8C", fontSize: 13 }}>
        Verifying Pro access…
      </div>
    </div>
  );
}

function AIAssistantLoaderPreview() {
  return (
    <Space
      direction="vertical"
      style={{ width: "100%", alignItems: "center", padding: "40px 0" }}
      size="large"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Spin size="small" />
        <span style={{ fontSize: 12, color: "#8C8C8C" }}>
          Loading conversation list…
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Spin size="small" />
        <span style={{ fontSize: 12, color: "#8C8C8C" }}>
          Loading message history…
        </span>
      </div>
    </Space>
  );
}

function ChatPanelLoaderPreview() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: 300,
        color: "#8C8C8C",
        fontSize: 14,
      }}
    >
      Loading...
    </div>
  );
}

function EditorViewLoaderPreview() {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 400,
        background: "#f5f5f5",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Simulate iframe background */}
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "repeating-linear-gradient(45deg, #f0f0f0 0px, #f0f0f0 10px, #fafafa 10px, #fafafa 20px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        <Spin
          size="large"
          tip="Loading Editor..."
          indicator={<LoadingOutlined style={{ fontSize: 32 }} spin />}
        />
      </div>
    </div>
  );
}

function VCSpinnerPreview() {
  return (
    <Space
      direction="vertical"
      style={{ width: "100%", alignItems: "center", padding: "24px 0" }}
      size="large"
    >
      <div
        style={{
          display: "flex",
          gap: 48,
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <VCSpinner size="small" />
          <div style={{ marginTop: 8, fontSize: 11, color: "#8C8C8C" }}>
            small
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <VCSpinner size="default" />
          <div style={{ marginTop: 8, fontSize: 11, color: "#8C8C8C" }}>
            default
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <VCSpinner size="large" />
          <div style={{ marginTop: 8, fontSize: 11, color: "#8C8C8C" }}>
            large
          </div>
        </div>
      </div>
      <VCSpinner size="large" tip="Loading your data…" />
      <VCSpinner size="default" fullPage />
    </Space>
  );
}

// ─── Loader registry ─────────────────────────────────────────────────────────

interface LoaderEntry {
  id: string;
  name: string;
  tag: string;
  tagColor: string;
  description: string;
  file: string;
  preview: React.ReactNode;
  fullHeight?: boolean;
}

const LOADERS: LoaderEntry[] = [
  {
    id: "app-context",
    name: "AppContextLoader",
    tag: "Splash",
    tagColor: "green",
    description:
      "Full-screen green splash shown on mobile/tablet on first load or context switch.",
    file: "components/layout/AppContextLoader.tsx",
    preview: <AppContextLoaderPreview />,
    fullHeight: true,
  },
  {
    id: "page-skeleton-card",
    name: "PageSkeleton — Card",
    tag: "Skeleton",
    tagColor: "blue",
    description: "Skeleton grid used while dashboard card lists are fetching.",
    file: "components/PageSkeleton.tsx",
    preview: <PageSkeletonCardPreview />,
  },
  {
    id: "page-skeleton-table",
    name: "PageSkeleton — Table",
    tag: "Skeleton",
    tagColor: "blue",
    description: "Skeleton card used while table data is loading.",
    file: "components/PageSkeleton.tsx",
    preview: <PageSkeletonTablePreview />,
  },
  {
    id: "recent-documents",
    name: "RecentDocuments",
    tag: "Spinner",
    tagColor: "orange",
    description:
      "Ant Design Spin (large) centred in the Recent Documents dashboard widget.",
    file: "components/dashboard/RecentDocuments.tsx",
    preview: <RecentDocumentsLoaderPreview />,
  },
  {
    id: "pro-guard",
    name: "ProGuard",
    tag: "Spinner",
    tagColor: "orange",
    description:
      "Ant Design Spin (large) shown while the Pro grant API call is in-flight.",
    file: "components/layout/ProGuard.tsx",
    preview: <ProGuardLoaderPreview />,
  },
  {
    id: "ai-assistant",
    name: "AIAssistant",
    tag: "Spinner",
    tagColor: "purple",
    description:
      "Two small spinners: one for conversation list, one for message history.",
    file: "components/ai/AIAssistant.tsx",
    preview: <AIAssistantLoaderPreview />,
  },
  {
    id: "chat-panel",
    name: "ChatPanel",
    tag: "Text",
    tagColor: "default",
    description:
      'React.Suspense fallback — plain "Loading..." text centred in the chat panel.',
    file: "components/chat/ChatPanel.tsx",
    preview: <ChatPanelLoaderPreview />,
  },
  {
    id: "editor-view",
    name: "EditorView",
    tag: "Spinner",
    tagColor: "gold",
    description:
      "Ant Design Spin (large) centred over the draw.io iframe while it bootstraps.",
    file: "components/flows/EditorView.tsx",
    preview: <EditorViewLoaderPreview />,
  },
  {
    id: "vc-spinner",
    name: "VCSpinner",
    tag: "NEW",
    tagColor: "red",
    description:
      "Unified branded spinner using the ValueChart green (#3CB371). Three sizes + optional full-page layout.",
    file: "components/shared/VCSpinner.tsx",
    preview: <VCSpinnerPreview />,
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LoaderPlayground() {
  const [activeId, setActiveId] = useState<string>(LOADERS[0].id);

  const active = LOADERS.find((l) => l.id === activeId)!;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F7F6",
        padding: "32px 24px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              margin: 0,
              color: "#1A1A1A",
            }}
          >
            Loader Playground
          </h1>
          <p style={{ marginTop: 6, color: "#8C8C8C", fontSize: 14 }}>
            Visual reference for all loading states in the ValueChart
            application. Click a loader to preview it.
          </p>
        </div>

        <Row gutter={[16, 16]}>
          {/* Sidebar — loader list */}
          <Col xs={24} md={8}>
            <Card
              size="small"
              title={
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  Loaders ({LOADERS.length})
                </span>
              }
              styles={{ body: { padding: 8 } }}
            >
              <Space direction="vertical" style={{ width: "100%" }} size={4}>
                {LOADERS.map((loader) => (
                  <button
                    key={loader.id}
                    onClick={() => setActiveId(loader.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background:
                        activeId === loader.id ? "#F0FFF4" : "transparent",
                      border:
                        activeId === loader.id
                          ? "1px solid #3CB371"
                          : "1px solid transparent",
                      borderRadius: 6,
                      padding: "8px 12px",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: activeId === loader.id ? 600 : 400,
                          color: "#1A1A1A",
                        }}
                      >
                        {loader.name}
                      </span>
                      <Tag
                        color={loader.tagColor}
                        style={{ fontSize: 10, lineHeight: "16px", margin: 0 }}
                      >
                        {loader.tag}
                      </Tag>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#8C8C8C",
                        marginTop: 2,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {loader.file}
                    </div>
                  </button>
                ))}
              </Space>
            </Card>
          </Col>

          {/* Main — preview area */}
          <Col xs={24} md={16}>
            <Card
              styles={{ body: { padding: 0 } }}
              style={{ overflow: "hidden" }}
            >
              {/* Preview header */}
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #F0F0F0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                    {active.name}
                  </h2>
                  <Tag color={active.tagColor}>{active.tag}</Tag>
                </div>
                <p
                  style={{
                    margin: "6px 0 4px",
                    fontSize: 13,
                    color: "#595959",
                  }}
                >
                  {active.description}
                </p>
                <code
                  style={{
                    fontSize: 11,
                    color: "#8C8C8C",
                    background: "#F5F5F5",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  frontend/{active.file}
                </code>
              </div>

              {/* Preview canvas */}
              <div
                style={{
                  position: "relative",
                  minHeight: active.fullHeight ? 480 : 360,
                  background:
                    active.id === "app-context" ? "#1F7D5E" : "#FAFAFA",
                  display: "flex",
                  alignItems: active.fullHeight ? "stretch" : "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <div style={{ width: "100%" }}>{active.preview}</div>
              </div>

              {/* Navigation footer */}
              <div
                style={{
                  padding: "12px 20px",
                  borderTop: "1px solid #F0F0F0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Button
                  size="small"
                  disabled={LOADERS.findIndex((l) => l.id === activeId) === 0}
                  onClick={() => {
                    const idx = LOADERS.findIndex((l) => l.id === activeId);
                    if (idx > 0) setActiveId(LOADERS[idx - 1].id);
                  }}
                >
                  ← Previous
                </Button>
                <span style={{ fontSize: 12, color: "#8C8C8C" }}>
                  {LOADERS.findIndex((l) => l.id === activeId) + 1} /{" "}
                  {LOADERS.length}
                </span>
                <Button
                  size="small"
                  disabled={
                    LOADERS.findIndex((l) => l.id === activeId) ===
                    LOADERS.length - 1
                  }
                  onClick={() => {
                    const idx = LOADERS.findIndex((l) => l.id === activeId);
                    if (idx < LOADERS.length - 1)
                      setActiveId(LOADERS[idx + 1].id);
                  }}
                >
                  Next →
                </Button>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
