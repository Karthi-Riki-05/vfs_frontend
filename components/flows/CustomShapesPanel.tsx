"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Drawer, Input, Collapse, Spin, Empty, Tag } from "antd";
import {
  SearchOutlined,
  AppstoreOutlined,
  FileImageOutlined,
  Html5Outlined,
  CodeOutlined,
} from "@ant-design/icons";
import api from "@/lib/axios";

// Matches Shape rows returned by GET /api/shapes (include: { group: true }).
export interface EditorShape {
  id: string;
  name: string;
  type: "stencil" | "image" | "html" | "shape";
  content?: string | null;
  xmlContent?: string | null;
  thumbnail?: string | null;
  category?: string | null;
  groupId?: string | null;
  group?: { id: string; name: string } | null;
}

interface ShapeGroupDTO {
  id: string;
  name: string;
  shapes: EditorShape[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onInsert: (shape: EditorShape) => void;
}

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

function getContent(s: EditorShape): string {
  return s.content || s.xmlContent || "";
}
function isLikelySvg(s: string) {
  return s.trim().toLowerCase().startsWith("<svg");
}
function isLikelyHtml(s: string) {
  const t = s.trim();
  return /^<(?!svg|shape|stencil|mxgraph)[a-z]/i.test(t);
}

function ShapePreview({ shape }: { shape: EditorShape }) {
  const meta = TYPE_META[shape.type] || TYPE_META.stencil;
  const content = getContent(shape);

  if (shape.type === "image" && content) {
    return (
      <img
        src={content}
        alt={shape.name}
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
      />
    );
  }
  if (content && (isLikelySvg(content) || isLikelyHtml(content))) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "scale(0.9)",
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  // mxGraph stencil XML or missing content — fallback icon
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        color: meta.color,
      }}
    >
      <div style={{ fontSize: 22 }}>{meta.icon}</div>
    </div>
  );
}

export default function CustomShapesPanel({ open, onClose, onInsert }: Props) {
  const [shapes, setShapes] = useState<EditorShape[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeKeys, setActiveKeys] = useState<string[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [shapesRes, groupsRes] = await Promise.all([
        api.get("/shapes"),
        api.get("/shape-groups"),
      ]);
      const sd = shapesRes.data?.data || shapesRes.data || [];
      const gd = groupsRes.data?.data || groupsRes.data || [];
      setShapes(Array.isArray(sd) ? sd : sd.shapes || []);
      setGroups(Array.isArray(gd) ? gd : gd.groups || []);
    } catch {
      setShapes([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchAll();
  }, [open, fetchAll]);

  // Organize shapes by group, including an "Ungrouped" bucket.
  const grouped: ShapeGroupDTO[] = useMemo(() => {
    const byGroup = new Map<string, ShapeGroupDTO>();
    groups.forEach((g) =>
      byGroup.set(g.id, { id: g.id, name: g.name, shapes: [] }),
    );
    const ungrouped: EditorShape[] = [];
    for (const s of shapes) {
      const gid = s.groupId || s.group?.id || null;
      if (gid && byGroup.has(gid)) {
        byGroup.get(gid)!.shapes.push(s);
      } else if (gid && s.group) {
        // Shape references a group we didn't get back — add it on the fly
        byGroup.set(gid, { id: gid, name: s.group.name, shapes: [s] });
      } else {
        ungrouped.push(s);
      }
    }
    const out = Array.from(byGroup.values());
    if (ungrouped.length) {
      out.push({ id: "__ungrouped__", name: "Ungrouped", shapes: ungrouped });
    }
    return out;
  }, [shapes, groups]);

  // Search-filtered view
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grouped;
    return grouped
      .map((g) => ({
        ...g,
        shapes: g.shapes.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            (s.group?.name || g.name).toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.shapes.length > 0);
  }, [grouped, search]);

  // Auto-open the first group on data load
  useEffect(() => {
    if (!loading && grouped.length > 0 && activeKeys.length === 0) {
      setActiveKeys([grouped[0].id]);
    }
  }, [loading, grouped, activeKeys.length]);

  const totalShapes = shapes.length;

  // Collapse items API (antd v5 preferred over deprecated <Panel>).
  const items = visible.map((g) => ({
    key: g.id,
    label: (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 13,
          fontWeight: 600,
          color: "#333",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {g.name}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "#8C8C8C",
            fontWeight: 500,
            marginLeft: 8,
            flexShrink: 0,
          }}
        >
          {g.shapes.length}
        </span>
      </div>
    ),
    children:
      g.shapes.length === 0 ? (
        <div
          style={{
            fontSize: 11,
            color: "#aaa",
            textAlign: "center",
            padding: "8px 0",
          }}
        >
          No shapes
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 8,
            padding: "4px 0 8px",
          }}
        >
          {g.shapes.map((shape) => {
            const meta = TYPE_META[shape.type] || TYPE_META.stencil;
            return (
              <div
                key={shape.id}
                title={`Click to insert "${shape.name}"`}
                onClick={() => onInsert(shape)}
                style={{
                  cursor: "pointer",
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid #f0f0f0",
                  background: "#fff",
                  transition: "all .15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.border =
                    `1px solid ${meta.color}`;
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    `0 2px 8px ${meta.color}33`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.border =
                    "1px solid #f0f0f0";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                }}
              >
                <div
                  style={{
                    height: 72,
                    background: meta.bg,
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                  }}
                >
                  <Tag
                    color={meta.color}
                    style={{
                      position: "absolute",
                      top: 4,
                      left: 4,
                      margin: 0,
                      fontSize: 9,
                      padding: "0 5px",
                      lineHeight: "16px",
                      borderRadius: 3,
                    }}
                  >
                    {meta.label}
                  </Tag>
                  <ShapePreview shape={shape} />
                </div>
                <div
                  style={{
                    padding: "6px 8px",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#333",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    borderTop: "1px solid #f0f0f0",
                  }}
                >
                  {shape.name}
                </div>
              </div>
            );
          })}
        </div>
      ),
  }));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="left"
      width={320}
      mask={false}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AppstoreOutlined style={{ color: "#3CB371" }} />
          <span>Custom Shapes</span>
          {totalShapes > 0 && (
            <span style={{ fontSize: 11, color: "#888", fontWeight: 400 }}>
              · {totalShapes} total
            </span>
          )}
        </div>
      }
      styles={{
        body: { padding: 0, display: "flex", flexDirection: "column" },
        header: { padding: "12px 16px" },
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid #F0F0F0",
          flexShrink: 0,
        }}
      >
        <Input
          size="small"
          prefix={<SearchOutlined style={{ color: "#BFBFBF" }} />}
          placeholder="Search shapes or groups…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
        />
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "4px 8px 16px",
        }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin />
          </div>
        ) : visible.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={search ? "No shapes found" : "No shape groups yet"}
            style={{ padding: "40px 16px" }}
          />
        ) : (
          <Collapse
            ghost
            activeKey={activeKeys}
            onChange={(keys) => setActiveKeys(keys as string[])}
            items={items}
          />
        )}
      </div>
    </Drawer>
  );
}
