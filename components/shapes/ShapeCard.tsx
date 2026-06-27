"use client";

import React, { useMemo, useState } from "react";
import { Typography, Tag } from "antd";
import { toast } from "sonner";
import { ModalShell, ModalHeader } from "@/components/common/Modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DeleteOutlined,
  CopyOutlined,
  EyeOutlined,
  FileImageOutlined,
  CodeOutlined,
  Html5Outlined,
  AppstoreOutlined,
  FolderOutlined,
  MoreOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

interface ShapeCardProps {
  shape: any;
  onDelete: (id: string) => void;
  /** Other groups to move this shape into (excludes its current group). */
  moveGroups?: { id: string; name: string }[];
  /** Move the shape to a target group. Enables the "Move" card action. */
  onMove?: (shapeId: string, targetGroupId: string) => void;
  /**
   * Copy the shape to another group or duplicate it.
   * Wire up from the parent page when the backend action is ready.
   */
  onCopy?: (shapeId: string) => void;
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

export default function ShapeCard({
  shape,
  onDelete,
  moveGroups,
  onMove,
  onCopy,
}: ShapeCardProps) {
  const type = getTypeKey(shape);
  const content = getRawContent(shape);
  const meta = TYPE_META[type] || TYPE_META.stencil;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const groupName = shape.category || shape.group?.name || "Uncategorized";

  // ─── Preview body (thumbnail area) ───
  const previewBody = useMemo(() => {
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
            transform: "scale(0.95)",
          }}
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
  const handleCopySource = async () => {
    try {
      await navigator.clipboard.writeText(content || "");
      toast.success("Source copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  const handleUseInDiagram = async () => {
    try {
      await navigator.clipboard.writeText(content || "");
      toast.success("Source copied — paste it into your open diagram");
    } catch {
      toast.info("Open a flow and add this shape from the editor library");
    }
  };

  return (
    <>
      {/* ── Card shell — matches FlowCard rounded-[12px] + border + shadow ── */}
      <div
        style={{
          borderRadius: 12,
          overflow: "hidden",
          border: "1px solid #F0F0F0",
          background: "#fff",
          transition: "transform .15s ease, box-shadow .15s ease",
          cursor: "pointer",
        }}
        className="hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
      >
        {/* ── Thumbnail area — same proportions as FlowCard cover (160px) ── */}
        <div
          onClick={() => setPreviewOpen(true)}
          style={{
            height: 160,
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
              <div style={{ fontSize: 48 }}>{meta.icon}</div>
              <Text style={{ fontSize: 11, color: meta.color }}>
                No content
              </Text>
            </div>
          )}
          {/* Type badge — top-left, same placement as FlowCard shared tag */}
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

        {/* ── Card body — matches FlowCard body padding + layout ── */}
        <div style={{ padding: "12px 16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            {/* Title + subtitle */}
            <div style={{ flex: 1, overflow: "hidden", marginRight: 4 }}>
              <Text
                strong
                style={{ fontSize: 14, color: "#1A1A2E", display: "block" }}
                ellipsis
              >
                {shape.name || "Untitled Shape"}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: "#8C8C8C",
                  display: "block",
                  marginTop: 2,
                }}
                ellipsis
              >
                <FolderOutlined style={{ marginRight: 4, fontSize: 10 }} />
                {groupName}
              </Text>
            </div>

            {/* Actions menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="tw appearance-none cursor-pointer outline-none border-0 bg-transparent w-7 h-7 rounded flex items-center justify-center hover:bg-secondary text-muted-foreground"
                >
                  <MoreOutlined />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="tw">
                <DropdownMenuItem onSelect={() => setPreviewOpen(true)}>
                  <EyeOutlined />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleCopySource}
                  disabled={!content}
                >
                  <CopyOutlined />
                  Copy source
                </DropdownMenuItem>
                {onCopy && (
                  <DropdownMenuItem onSelect={() => onCopy(shape.id)}>
                    <CopyOutlined />
                    Copy shape
                  </DropdownMenuItem>
                )}
                {onMove && moveGroups && moveGroups.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <FolderOutlined />
                      Move to group
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="tw">
                      {moveGroups.map((g) => (
                        <DropdownMenuItem
                          key={g.id}
                          onSelect={() => onMove(shape.id, g.id)}
                        >
                          {g.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => onDelete(shape.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <DeleteOutlined />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ── Preview modal ── */}
      <ModalShell
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setShowRaw(false);
        }}
        size="xl"
      >
        <ModalHeader
          title={shape.name || "Shape preview"}
          close={() => {
            setPreviewOpen(false);
            setShowRaw(false);
          }}
        />
        <div className="tw px-5 pb-2">
          {modalPreview}

          {/* Metadata grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginTop: 16,
            }}
          >
            <div
              style={{
                background: "#F8F9FA",
                borderRadius: 8,
                padding: "8px 12px",
              }}
            >
              <div style={{ fontSize: 10, color: "#8C8C8C", fontWeight: 700 }}>
                TYPE
              </div>
              <div style={{ fontSize: 13, color: "#1F2937", fontWeight: 600 }}>
                {meta.label}
              </div>
            </div>
            <div
              style={{
                background: "#F8F9FA",
                borderRadius: 8,
                padding: "8px 12px",
              }}
            >
              <div style={{ fontSize: 10, color: "#8C8C8C", fontWeight: 700 }}>
                GROUP
              </div>
              <div style={{ fontSize: 13, color: "#1F2937", fontWeight: 600 }}>
                {groupName}
              </div>
            </div>
          </div>

          {/* Source — collapsible */}
          <div style={{ marginTop: 16 }}>
            {content ? (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {type === "image"
                      ? "Image source available"
                      : "Shape source available"}
                  </Text>
                  <button
                    type="button"
                    onClick={() => setShowRaw((v) => !v)}
                    className="appearance-none cursor-pointer outline-none border-0 bg-transparent text-primary text-xs font-medium p-0"
                  >
                    {showRaw ? "Hide raw ▲" : "Show raw ▼"}
                  </button>
                </div>
                {showRaw && (
                  <div
                    style={{
                      marginTop: 8,
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
                    {content}
                  </div>
                )}
              </>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                (no source)
              </Text>
            )}
          </div>
        </div>
        {/* Modal footer — two action buttons */}
        <div className="p-5 pt-4 border-t border-border flex justify-end gap-2">
          <button
            type="button"
            disabled={!content}
            onClick={handleCopySource}
            className="appearance-none cursor-pointer outline-none h-10 px-5 rounded-xl border border-border bg-card font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Copy source
          </button>
          <button
            type="button"
            disabled={!content}
            onClick={handleUseInDiagram}
            className="appearance-none cursor-pointer outline-none border-0 h-10 px-5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Use in diagram
          </button>
        </div>
      </ModalShell>
    </>
  );
}
