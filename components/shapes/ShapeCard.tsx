"use client";

import React, { useMemo, useState } from "react";
import { Card, Button, Tooltip, Typography, Tag, Modal, message } from "antd";
import {
  DeleteOutlined,
  CopyOutlined,
  EyeOutlined,
  FileImageOutlined,
  CodeOutlined,
  Html5Outlined,
  AppstoreOutlined,
} from "@ant-design/icons";

const { Text, Paragraph } = Typography;

interface ShapeCardProps {
  shape: any;
  onDelete: (id: string) => void;
}

// Visual style per type — color + icon used in badges and fallback states.
const TYPE_META: Record<
  string,
  { color: string; bg: string; label: string; icon: React.ReactNode }
> = {
  image: {
    color: "#1890FF",
    bg: "#E6F7FF",
    label: "Image",
    icon: <FileImageOutlined />,
  },
  stencil: {
    color: "#3CB371",
    bg: "#F0FFF4",
    label: "Stencil",
    icon: <AppstoreOutlined />,
  },
  html: {
    color: "#722ED1",
    bg: "#F9F0FF",
    label: "HTML",
    icon: <Html5Outlined />,
  },
  shape: {
    color: "#FA8C16",
    bg: "#FFF7E6",
    label: "Shape",
    icon: <CodeOutlined />,
  },
};

function getTypeKey(shape: any): string {
  return String(shape?.type || shape?.shapeType || "").toLowerCase();
}

// Pick the actual content field. New shapes use `content`; legacy ones may
// have stored the SVG/HTML in `xmlContent` instead.
function getRawContent(shape: any): string {
  return shape?.content || shape?.xmlContent || "";
}

function isLikelySvg(s: string): boolean {
  const t = s.trim().toLowerCase();
  return t.startsWith("<svg");
}

function isLikelyHtml(s: string): boolean {
  const t = s.trim();
  return /^<(?!svg|shape|stencil|mxgraph)[a-z]/i.test(t);
}

export default function ShapeCard({ shape, onDelete }: ShapeCardProps) {
  const type = getTypeKey(shape);
  const content = getRawContent(shape);
  const meta = TYPE_META[type] || TYPE_META.stencil;
  const [previewOpen, setPreviewOpen] = useState(false);

  // ─── Preview body ───
  const previewBody = useMemo(() => {
    // Image: rendered as <img>. data: URLs and absolute URLs both work.
    if (type === "image") {
      if (!content) return null;
      return (
        <img
          src={content}
          alt={shape.name}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        />
      );
    }

    // Stencil / HTML / generic: try to render as inline markup.
    // SVG → render directly. HTML → render directly. mxGraph stencil XML
    // can't be rendered natively in the browser → show a small monospace
    // preview with the icon, so the card still LOOKS like something rather
    // than empty.
    if (!content) return null;

    if (isLikelySvg(content) || isLikelyHtml(content)) {
      return (
        <div
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            // Tame overly-large pasted SVGs/HTML so they fit the card cover
            transform: "scale(0.95)",
          }}
          // Trusted content authored by the workspace owner.
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }

    // mxGraph <shape>…</shape> (raw XML) — not natively renderable.
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          color: meta.color,
        }}
      >
        <div style={{ fontSize: 28 }}>{meta.icon}</div>
        <Text style={{ fontSize: 11, color: meta.color, fontWeight: 600 }}>
          {meta.label} XML
        </Text>
      </div>
    );
  }, [type, content, meta, shape.name]);

  // Modal preview body — same content but bigger, with raw source visible.
  const modalPreview = useMemo(() => {
    if (type === "image" && content) {
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            background: "#FAFAFA",
            padding: 24,
            borderRadius: 8,
          }}
        >
          <img
            src={content}
            alt={shape.name}
            style={{ maxWidth: "100%", maxHeight: 360 }}
          />
        </div>
      );
    }
    if ((isLikelySvg(content) || isLikelyHtml(content)) && content) {
      return (
        <div
          style={{
            background: "#FAFAFA",
            padding: 24,
            borderRadius: 8,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 200,
          }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    }
    return null;
  }, [type, content, shape.name]);

  // ─── Handlers ───
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content || "");
      message.success("Source copied to clipboard");
    } catch {
      message.error("Could not copy");
    }
  };

  return (
    <>
      <Card
        hoverable
        style={{
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #F0F0F0",
          transition: "transform .15s ease, box-shadow .15s ease",
        }}
        styles={{ body: { padding: 12 } }}
        cover={
          <div
            onClick={() => setPreviewOpen(true)}
            style={{
              height: 140,
              background: meta.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              borderBottom: "1px solid #F0F0F0",
              position: "relative",
              cursor: "pointer",
            }}
          >
            {previewBody || (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  color: meta.color,
                }}
              >
                <div style={{ fontSize: 28 }}>{meta.icon}</div>
                <Text style={{ fontSize: 11, color: meta.color }}>
                  No content
                </Text>
              </div>
            )}
            <Tag
              color={meta.color}
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                fontSize: 10,
                fontWeight: 600,
                margin: 0,
                borderRadius: 4,
                padding: "0 6px",
                lineHeight: "18px",
              }}
            >
              {meta.label}
            </Tag>
          </div>
        }
        actions={[
          <Tooltip title="Preview" key="preview">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => setPreviewOpen(true)}
            />
          </Tooltip>,
          <Tooltip title="Copy source" key="copy">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={handleCopy}
              disabled={!content}
            />
          </Tooltip>,
          <Tooltip title="Delete" key="delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(shape.id)}
            />
          </Tooltip>,
        ]}
      >
        <Card.Meta
          title={
            <Text strong ellipsis style={{ fontSize: 13 }}>
              {shape.name || "Untitled Shape"}
            </Text>
          }
          description={
            <Text
              type="secondary"
              style={{ fontSize: 11, display: "block" }}
              ellipsis
            >
              {shape.category || shape.group?.name || "Uncategorized"}
            </Text>
          }
        />
      </Card>

      {/* Preview modal — bigger render + raw source */}
      <Modal
        title={
          <span>
            {meta.icon}
            <span style={{ marginLeft: 8 }}>
              {shape.name || "Shape preview"}
            </span>{" "}
            <Tag color={meta.color} style={{ marginLeft: 8, borderRadius: 4 }}>
              {meta.label}
            </Tag>
          </span>
        }
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={[
          <Button
            key="copy"
            icon={<CopyOutlined />}
            onClick={handleCopy}
            disabled={!content}
          >
            Copy source
          </Button>,
          <Button
            key="close"
            onClick={() => setPreviewOpen(false)}
            type="primary"
          >
            Close
          </Button>,
        ]}
        width={640}
      >
        {modalPreview}
        <Paragraph
          style={{
            marginTop: 16,
            marginBottom: 0,
            background: "#F8F9FA",
            padding: 12,
            borderRadius: 8,
            fontSize: 11,
            fontFamily: "monospace",
            maxHeight: 200,
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}
        >
          {content || "(no source)"}
        </Paragraph>
      </Modal>
    </>
  );
}
