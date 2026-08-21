"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Spin, Empty } from "antd";
import { ChevronRight, Search } from "lucide-react";
import {
  Sheet,
  SheetContentNoOverlay,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  SearchOutlined,
  AppstoreOutlined,
  FileImageOutlined,
  Html5Outlined,
  CodeOutlined,
} from "@ant-design/icons";
import api from "@/lib/axios";
import { useAppContext } from "@/context/AppContext";

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
  /** B7: drag a tile onto the canvas. Optional so the panel still works without a drag host. */
  onDragShapeStart?: (shape: EditorShape, e: React.DragEvent) => void;
  onDragShapeEnd?: () => void;
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
    color: "var(--primary)",
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

export default function CustomShapesPanel({
  open,
  onClose,
  onInsert,
  onDragShapeStart,
  onDragShapeEnd,
}: Props) {
  // Re-scope the editor's shape library to the active account/team on switch.
  const { activeTeamId } = useAppContext();
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
    // activeTeamId → refetch the library when the user switches account/team.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeTeamId]);

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
  // The panel is deliberately non-modal (`modal={false}`) so shapes can be
  // dragged onto the canvas — which means Radix does not block the page and the
  // floating Chat/AI buttons stayed on top of it. Announce open/close on the
  // same channel modals use; both FABs already listen.
  useEffect(() => {
    if (!open) return;
    const fire = (v: boolean): void => {
      window.dispatchEvent(new CustomEvent("vc:sheet-open", { detail: v }));
    };
    fire(true);
    return () => fire(false);
  }, [open]);

  /* Group rows, rebuilt to match the app's accordion pattern (same shape as the
     Templates browser): a rounded card per group with chevron + name + count.
     Previously this fed Ant Design's <Collapse ghost>, whose chevron, spacing
     and type scale are AntD's, not ours — which is what made the panel read as
     a different design inside an otherwise `.tw` sheet. */
  const groupList = (
    <div className="flex flex-col gap-2">
      {visible.map((g) => {
        const isOpen = activeKeys.includes(g.id);
        return (
          <div
            key={g.id}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <button
              type="button"
              onClick={() =>
                setActiveKeys((keys) =>
                  keys.includes(g.id)
                    ? keys.filter((k) => k !== g.id)
                    : [...keys, g.id],
                )
              }
              className="appearance-none cursor-pointer border-0 bg-transparent w-full flex items-center gap-2 px-3 py-2.5 text-left"
            >
              <ChevronRight
                className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                  isOpen ? "rotate-90" : ""
                }`}
              />
              <span className="flex-1 min-w-0 truncate text-sm font-semibold text-foreground">
                {g.name}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground shrink-0 tabular-nums">
                {g.shapes.length}
              </span>
            </button>

            {isOpen &&
              (g.shapes.length === 0 ? (
                <div className="px-3 pb-3 text-xs text-muted-foreground text-center">
                  No shapes
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                  {g.shapes.map((shape) => {
                    const meta = TYPE_META[shape.type] || TYPE_META.stencil;
                    return (
                      <div
                        key={shape.id}
                        title={`Click or drag "${shape.name}" onto the canvas`}
                        draggable={!!onDragShapeStart}
                        onDragStart={(e) => onDragShapeStart?.(shape, e)}
                        onDragEnd={() => onDragShapeEnd?.()}
                        onClick={() => {
                          onInsert(shape);
                          onClose();
                        }}
                        className="rounded-xl border border-border bg-card overflow-hidden transition-colors hover:border-primary"
                        style={{ cursor: onDragShapeStart ? "grab" : "pointer" }}
                      >
                        <div
                          className="relative flex items-center justify-center p-2"
                          style={{ height: 80, background: meta.bg }}
                        >
                          <span
                            className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md border"
                            style={{
                              background: "var(--card)",
                              color: meta.color,
                              borderColor: meta.color,
                            }}
                          >
                            {meta.label}
                          </span>
                          <ShapePreview shape={shape} />
                        </div>
                        <div className="px-2 py-1.5 text-[11px] font-medium text-foreground truncate border-t border-border">
                          {shape.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );

  return (
    // bug-108: `modal={false}` is what makes drag-and-drop onto the canvas
    // possible at all.
    //
    // Radix dialogs are modal by default, and a modal dialog sets
    // `pointer-events: none` on everything outside itself. The draw.io iframe
    // is outside, so while this panel was open the canvas could not be a drop
    // target — you could pick a tile up and drag it, and the browser refused
    // every drop ("easy to drag but can't drop"). Click-insert was unaffected
    // because it never touches the canvas, which is exactly why one worked and
    // the other did not.
    //
    // Non-modal also matches how this panel is used: it docks beside the canvas
    // and you are meant to keep interacting with the diagram while it is open.
    <Sheet open={open} onOpenChange={(v) => !v && onClose()} modal={false}>
      <SheetContentNoOverlay
        side="left"
        className="tw p-0 flex flex-col w-[320px]"
        // Keep focus in the canvas during a drag: Radix would otherwise pull
        // focus back into the panel and can cancel the drag mid-flight.
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2 text-sm font-medium">
            <AppstoreOutlined style={{ color: "var(--primary)" }} />
            <span>Custom Shapes</span>
            {totalShapes > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-secondary text-primary-deep">
                {totalShapes}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div
          style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {/* App field pattern (rounded wrapper + bare input), not AntD's Input */}
          <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-border bg-background transition-colors focus-within:border-primary">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              placeholder="Search shapes or groups…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-0 bg-transparent border-0 p-0 outline-none appearance-none text-sm"
            />
          </div>
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
            groupList
          )}
        </div>
      </SheetContentNoOverlay>
    </Sheet>
  );
}
