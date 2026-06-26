"use client";

import React, { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Row,
  Col,
  Spin,
  Radio,
  Upload,
  Divider,
  Space,
} from "antd";
import {
  PlusOutlined,
  FileImageOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import ShapeCard from "@/components/shapes/ShapeCard";
import api from "@/lib/axios";
import { RcFile } from "antd/es/upload";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useAppContext } from "@/context/AppContext";
import { useTabFocus } from "@/hooks/useTabFocus";
import {
  Search,
  Filter,
  Plus as PlusIcon,
  Pencil,
  Trash2,
  Folder,
  FolderInput,
  MoreHorizontal,
  ArrowLeft,
  ChevronRight,
  List as ListIcon,
  LayoutGrid,
  Check,
} from "lucide-react";

const { Option } = Select;
const { Dragger } = Upload;

// Deterministic folder tone from the group name (backend has no color field).
const TONES = ["#34A881", "#006AA8", "#FF9A30", "#F85729", "#1F7D5E"];
function groupTone(s: string): string {
  let h = 0;
  for (const c of String(s || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

function timeAgo(d?: string | null): string {
  if (!d) return "";
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const dd = Math.floor(h / 24);
  if (dd === 1) return "yesterday";
  if (dd < 7) return `${dd} days ago`;
  const w = Math.floor(dd / 7);
  if (w < 4) return `${w} week${w > 1 ? "s" : ""} ago`;
  return new Date(d).toLocaleDateString();
}

// ─── Tailwind atoms (.tw-scoped; native controls reset per preflight-off) ─
function SearchBar({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 h-11 px-3 rounded-2xl bg-card border border-border mb-4">
      <Search className="w-4 h-4 text-muted-foreground" />
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent outline-none text-sm border-0 p-0 appearance-none"
      />
      <button
        type="button"
        aria-label="Filter"
        className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center bg-transparent border-0 p-0 appearance-none cursor-pointer"
      >
        <Filter className="w-3.5 h-3.5 text-primary" />
      </button>
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: "list" | "grid";
  onChange: (v: "list" | "grid") => void;
}) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-secondary">
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-label="List view"
        aria-pressed={view === "list"}
        className={`appearance-none border-0 cursor-pointer w-9 h-8 rounded-lg flex items-center justify-center ${
          view === "list"
            ? "bg-card shadow-sm text-primary"
            : "bg-transparent text-muted-foreground"
        }`}
      >
        <ListIcon className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-label="Grid view"
        aria-pressed={view === "grid"}
        className={`appearance-none border-0 cursor-pointer w-9 h-8 rounded-lg flex items-center justify-center ${
          view === "grid"
            ? "bg-card shadow-sm text-primary"
            : "bg-transparent text-muted-foreground"
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
    </div>
  );
}

// Custom prototype menu (Edit Group / Delete Group). Share dropped — no backend.
function GroupMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute right-2 top-12 z-20 w-44 bg-card border border-border rounded-xl shadow-lg py-1.5"
    >
      <button
        type="button"
        onClick={onEdit}
        className="appearance-none border-0 bg-transparent cursor-pointer w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-secondary"
      >
        <Pencil className="w-4 h-4" />
        <span className="flex-1 text-left font-medium">Edit Group</span>
      </button>
      <div className="my-1 h-px bg-border" />
      <button
        type="button"
        onClick={onDelete}
        className="appearance-none border-0 bg-transparent cursor-pointer w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--coral)] hover:bg-secondary"
      >
        <Trash2 className="w-4 h-4" />
        <span className="flex-1 text-left font-medium">Delete Group</span>
      </button>
    </div>
  );
}

// Create-group overlay (prototype 1024–1049). Team/visibility pickers dropped —
// the backend create takes only a name (+ app context).
function CreateGroupOverlay({
  value,
  onChange,
  onClose,
  onSubmit,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="tw fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card rounded-2xl border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-bold text-foreground">
            Create New Group
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="appearance-none border-0 bg-transparent cursor-pointer w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary"
          >
            <PlusIcon className="w-4 h-4 rotate-45" />
          </button>
        </div>
        <div className="px-5 py-5">
          <label className="block text-[13px] font-bold text-foreground mb-1.5">
            Group Name <span className="text-[var(--coral)]">*</span>
          </label>
          <div className="flex items-center gap-2 h-11 px-3 rounded-xl border border-border bg-card">
            <Folder className="w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && value.trim() && !loading) onSubmit();
              }}
              placeholder="e.g. Marketing Team"
              className="flex-1 bg-transparent outline-none border-0 p-0 appearance-none text-sm font-sans"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="appearance-none cursor-pointer h-10 px-4 rounded-xl border border-border bg-card text-sm font-semibold text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!value.trim() || loading}
            onClick={onSubmit}
            className="appearance-none border-0 cursor-pointer h-10 px-5 rounded-xl bg-primary text-white text-sm font-bold disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Backend caps shape content at 24M chars. base64 ≈ 1.33× the raw file,
// so the largest safe raw image is ~18MB.
const MAX_CONTENT_CHARS = 24_000_000;
const MAX_IMAGE_MB = 18;

function ShapesContent() {
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  // Re-scope shapes to the active account/team on switch (same as flows).
  const { activeTeamId } = useAppContext();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [shapes, setShapes] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const [editGroupForm] = Form.useForm();
  const [editGroupModalOpen, setEditGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [editingGroupLoading, setEditingGroupLoading] = useState(false);
  // Mobile (new design) name search — desktop keeps the group filter dropdown.
  const [mobileSearch, setMobileSearch] = useState("");

  // Form Watchers
  const shapeType = Form.useWatch("type", form);
  const [newGroupName, setNewGroupName] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);

  // ─── Folder hierarchy (prototype Groups → drill-in) ───
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [groupsView, setGroupsView] = useState<"list" | "grid">("list");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [createGroupName, setCreateGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupQuery, setGroupQuery] = useState("");

  // Close any open card menu on outside click.
  useEffect(() => {
    if (!openMenu) return;
    const h = () => setOpenMenu(null);
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, [openMenu]);

  useEffect(() => {
    fetchShapes();
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeamId]);

  useEffect(() => {
    if (searchParams?.get("action") === "new") {
      showModal();
    }
  }, [searchParams]);

  const fetchShapes = async () => {
    setLoading(true);
    try {
      const response = await api.get("/shapes");
      const ds = response.data?.data || response.data || {};
      setShapes(ds.shapes || (Array.isArray(ds) ? ds : []));
    } catch (error: any) {
      console.error("Failed to load shapes", error);
    } finally {
      setLoading(false);
    }
  };
  useTabFocus(fetchShapes);

  const fetchGroups = async () => {
    try {
      const response = await api.get("/shape-groups");
      const dg = response.data?.data || response.data || {};
      setGroups(dg.groups || (Array.isArray(dg) ? dg : []));
    } catch (error) {
      console.error("Failed to load groups", error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setAddingGroup(true);
    try {
      const response = await api.post("/shape-groups", { name: newGroupName });
      const newGroup = response.data?.data || response.data;
      setGroups([newGroup, ...groups]);
      form.setFieldsValue({ groupId: newGroup.id });
      setNewGroupName("");
      message.success("Group created");
    } catch (error) {
      message.error("Failed to create group");
    } finally {
      setAddingGroup(false);
    }
  };

  const handleEditGroup = (group: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingGroup(group);
    editGroupForm.setFieldsValue({ name: group.name });
    setEditGroupModalOpen(true);
  };

  const handleSaveGroupEdit = async () => {
    try {
      const values = await editGroupForm.validateFields();
      setEditingGroupLoading(true);
      await api.put(`/shape-groups/${editingGroup.id}`, { name: values.name });
      message.success("Group renamed");
      setEditGroupModalOpen(false);
      setEditingGroup(null);
      editGroupForm.resetFields();
      fetchGroups();
    } catch {
      message.error("Failed to rename group");
    } finally {
      setEditingGroupLoading(false);
    }
  };

  const handleDeleteGroup = (group: any, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const shapeCount = groupShapeCounts[group.id] || group._count?.shapes || 0;
    Modal.confirm({
      title: `Delete "${group.name}"?`,
      icon: <ExclamationCircleOutlined />,
      content:
        shapeCount > 0
          ? `This will delete the group and all ${shapeCount} shape${shapeCount !== 1 ? "s" : ""} inside it. This cannot be undone.`
          : "This will delete the empty group. This cannot be undone.",
      okText: "Delete",
      okType: "danger",
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await api.delete(`/shape-groups/${group.id}`);
          message.success("Group deleted");
          setGroups((prev) => prev.filter((g) => g.id !== group.id));
          // Also remove shapes that belonged to this group from local state
          setShapes((prev) =>
            prev.filter(
              (s) => s.groupId !== group.id && s.group?.id !== group.id,
            ),
          );
          // Leave the drill-in view if the open group was deleted
          if (openGroupId === group.id) {
            setOpenGroupId(null);
          }
        } catch {
          message.error("Failed to delete group");
        }
      },
    });
  };

  // Count shapes per group
  const groupShapeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    shapes.forEach((s) => {
      const gid = s.groupId || s.group?.id;
      if (gid) {
        counts[gid] = (counts[gid] || 0) + 1;
      }
    });
    return counts;
  }, [shapes]);

  const showModal = () => setIsModalVisible(true);

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const getBase64 = (file: RcFile): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  const handleAddShape = async (values: any) => {
    try {
      let content = values.content;

      // Handle Image Upload
      if (values.type === "image" && values.upload) {
        const file = values.upload[0]?.originFileObj;
        if (file) {
          content = await getBase64(file);
        }
      }

      // Size guard — backend caps content at 24M chars (~18MB raw file)
      if (content && content.length > MAX_CONTENT_CHARS) {
        form.setFields([
          {
            name: values.type === "image" ? "upload" : "content",
            errors: [
              `Too large (${(content.length / 1_000_000).toFixed(1)}M chars). Max is ${MAX_CONTENT_CHARS / 1_000_000}M.`,
            ],
          },
        ]);
        return;
      }

      const payload = {
        name: values.name,
        type: values.type,
        groupId: values.groupId,
        textAlignment: values.textAlignment,
        content: content,
      };

      await api.post("/shapes", payload);
      message.success("Shape added successfully");
      setIsModalVisible(false);
      form.resetFields();
      fetchShapes();
    } catch (error: any) {
      console.error("Failed to add shape", error);
      // Surface the real server-side validation message inline / in toast
      const err = error?.response?.data?.error;
      const detail = Array.isArray(err?.details) ? err.details[0] : null;
      if (detail) {
        const fieldName = String(detail.field || "").replace(/^body\./, "");
        if (fieldName) {
          form.setFields([{ name: fieldName, errors: [detail.message] }]);
        }
        message.error(detail.message);
      } else {
        message.error(err?.message || "Failed to add shape");
      }
    }
  };

  const handleDeleteShape = async (id: string) => {
    try {
      await api.delete(`/shapes/${id}`);
      setShapes(shapes.filter((s) => s.id !== id));
      message.success("Shape deleted");
    } catch (error) {
      setShapes(shapes.filter((s) => s.id !== id));
      message.info("Shape removed from view");
    }
  };

  const normFile = (e: any) => {
    if (Array.isArray(e)) {
      return e;
    }
    return e?.fileList;
  };

  // Create a group from the prototype overlay (separate from the Add-Shape
  // modal's inline group create above).
  const handleSubmitCreateGroup = async () => {
    const name = createGroupName.trim();
    if (!name) return;
    setCreatingGroup(true);
    try {
      const response = await api.post("/shape-groups", { name });
      const newGroup = response.data?.data || response.data;
      setGroups((prev) => [newGroup, ...prev]);
      setCreateGroupName("");
      setShowCreateGroup(false);
      message.success("Group created");
    } catch {
      message.error("Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  // Move a shape into another group (prototype ShapeMenu "Move to Group").
  const handleMoveShape = async (shapeId: string, targetGroupId: string) => {
    try {
      await api.put(`/shapes/${shapeId}`, { groupId: targetGroupId });
      const target = groups.find((g) => g.id === targetGroupId);
      // Update local state so the shape leaves the current drill-in view.
      setShapes((prev) =>
        prev.map((s) =>
          s.id === shapeId
            ? { ...s, groupId: targetGroupId, group: target || s.group }
            : s,
        ),
      );
      message.success(`Moved to ${target?.name || "group"}`);
    } catch {
      message.error("Failed to move shape");
    }
  };

  // Open the Add-Shape modal pre-scoped to the current group.
  const handleNewShapeInGroup = () => {
    form.resetFields();
    if (openGroupId) form.setFieldsValue({ groupId: openGroupId });
    showModal();
  };

  // ─── Folder hierarchy derivations ───
  const openGroup = openGroupId
    ? groups.find((g) => g.id === openGroupId) || null
    : null;

  const filteredGroups = groups.filter((g) => {
    const q = groupQuery.trim().toLowerCase();
    return (
      !q ||
      String(g.name || "")
        .toLowerCase()
        .includes(q)
    );
  });

  const shapesInGroup = openGroup
    ? shapes.filter((s) => {
        if (!(s.groupId === openGroup.id || s.group?.id === openGroup.id))
          return false;
        const q = mobileSearch.trim().toLowerCase();
        if (
          q &&
          !String(s.name || "")
            .toLowerCase()
            .includes(q)
        )
          return false;
        return true;
      })
    : [];

  const groupCount = (g: any) =>
    g._count?.shapes ?? groupShapeCounts[g.id] ?? 0;
  const moveTargets = groups
    .filter((g) => g.id !== openGroupId)
    .map((g) => ({ id: g.id, name: g.name }));

  return (
    <>
      {/* ══════════ Shapes — Groups → drill-in (prototype 816–965) ══════════ */}
      <div className="tw min-h-screen bg-background pb-28">
        <div className="mx-auto w-full max-w-6xl px-5 pt-4 lg:px-8 lg:pt-6">
          {!openGroup ? (
            /* ───────── Root: list of GROUPS ───────── */
            <>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h1 className="text-foreground font-extrabold text-[22px] lg:text-[28px] leading-tight">
                  Shapes
                </h1>
                <div className="flex items-center gap-2 shrink-0">
                  <ViewToggle view={groupsView} onChange={setGroupsView} />
                  <button
                    type="button"
                    onClick={() => {
                      setCreateGroupName("");
                      setShowCreateGroup(true);
                    }}
                    className="appearance-none border-0 cursor-pointer h-9 px-3 rounded-xl bg-primary text-white font-semibold text-xs inline-flex items-center gap-1.5"
                  >
                    <PlusIcon className="w-3.5 h-3.5" /> New Group
                  </button>
                </div>
              </div>

              <SearchBar
                placeholder="Search groups"
                value={groupQuery}
                onChange={setGroupQuery}
              />

              {loading && groups.length === 0 ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-[72px] rounded-2xl bg-card border border-border animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="mt-8 p-8 rounded-2xl border border-dashed border-border text-center">
                  <div className="text-sm text-muted-foreground mb-4">
                    {groupQuery.trim()
                      ? "No groups match your search."
                      : "No groups yet. Create your first group to organize shapes."}
                  </div>
                  {!groupQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setCreateGroupName("");
                        setShowCreateGroup(true);
                      }}
                      className="appearance-none border-0 cursor-pointer h-10 px-5 rounded-xl bg-primary text-white text-sm font-bold inline-flex items-center gap-2"
                    >
                      <PlusIcon className="w-4 h-4" /> New Group
                    </button>
                  )}
                </div>
              ) : groupsView === "list" ? (
                <div className="space-y-2">
                  {filteredGroups.map((g) => {
                    const tone = groupTone(g.name);
                    const key = `g-${g.id}`;
                    return (
                      <div
                        key={g.id}
                        className="relative w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenGroupId(g.id)}
                          className="appearance-none border-0 bg-transparent cursor-pointer flex items-center gap-3 flex-1 min-w-0 text-left"
                        >
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${tone}1f`, color: tone }}
                          >
                            <Folder className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm truncate">
                                {g.name}
                              </span>
                              <span className="text-[11px] text-muted-foreground shrink-0">
                                {groupCount(g)} shapes
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              Created by You • Last updated{" "}
                              {timeAgo(g.updatedAt || g.createdAt) ||
                                "recently"}
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenu(openMenu === key ? null : key);
                          }}
                          className="appearance-none border-0 bg-transparent cursor-pointer w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center"
                        >
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {openMenu === key && (
                          <GroupMenu
                            onEdit={() => {
                              setOpenMenu(null);
                              handleEditGroup(g);
                            }}
                            onDelete={() => {
                              setOpenMenu(null);
                              handleDeleteGroup(g);
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredGroups.map((g) => {
                    const tone = groupTone(g.name);
                    const key = `g-${g.id}`;
                    return (
                      <div
                        key={g.id}
                        className="relative rounded-2xl bg-card border border-border hover:shadow-card transition overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenGroupId(g.id)}
                          className="appearance-none border-0 bg-transparent cursor-pointer w-full p-4 text-left flex flex-col items-start gap-2"
                        >
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ background: `${tone}1f`, color: tone }}
                          >
                            <Folder className="w-5 h-5" />
                          </div>
                          <div className="font-semibold text-sm truncate w-full">
                            {g.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {groupCount(g)} shapes
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate w-full">
                            Updated{" "}
                            {timeAgo(g.updatedAt || g.createdAt) || "recently"}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenu(openMenu === key ? null : key);
                          }}
                          className="appearance-none border-0 bg-transparent cursor-pointer absolute right-1.5 top-1.5 w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center"
                        >
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {openMenu === key && (
                          <GroupMenu
                            onEdit={() => {
                              setOpenMenu(null);
                              handleEditGroup(g);
                            }}
                            onDelete={() => {
                              setOpenMenu(null);
                              handleDeleteGroup(g);
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* ───────── Drill-in: shapes INSIDE the group ───────── */
            <>
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setOpenGroupId(null);
                    setMobileSearch("");
                  }}
                  className="appearance-none border-0 bg-transparent cursor-pointer inline-flex items-center gap-1.5 text-sm font-semibold text-primary-deep hover:underline"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Groups
                </button>
                <button
                  type="button"
                  onClick={handleNewShapeInGroup}
                  className="appearance-none border-0 cursor-pointer h-9 px-3 rounded-xl bg-primary text-white font-semibold text-xs inline-flex items-center gap-1.5"
                >
                  <PlusIcon className="w-3.5 h-3.5" /> New Shape
                </button>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: `${groupTone(openGroup.name)}1f`,
                    color: groupTone(openGroup.name),
                  }}
                >
                  <Folder className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-foreground font-extrabold text-[20px] lg:text-[24px] leading-tight truncate">
                    {openGroup.name}
                  </h1>
                  <div className="text-[11px] text-muted-foreground">
                    {shapesInGroup.length} shape
                    {shapesInGroup.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>

              <SearchBar
                placeholder={`Search shapes in ${openGroup.name}`}
                value={mobileSearch}
                onChange={setMobileSearch}
              />

              {loading && shapes.length === 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-2xl bg-card border border-border animate-pulse"
                    />
                  ))}
                </div>
              ) : shapesInGroup.length === 0 ? (
                <div className="mt-8 p-8 rounded-2xl border border-dashed border-border text-center text-sm text-muted-foreground">
                  {mobileSearch.trim()
                    ? "No shapes match your search."
                    : "No shapes in this group. Add a shape to get started."}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {shapesInGroup.map((shape) => (
                    <ShapeCard
                      key={shape.id}
                      shape={shape}
                      onDelete={handleDeleteShape}
                      moveGroups={moveTargets}
                      onMove={handleMoveShape}
                    />
                  ))}
                  {/* Add shape dashed card */}
                  <button
                    type="button"
                    onClick={handleNewShapeInGroup}
                    className="appearance-none cursor-pointer rounded-2xl border-2 border-dashed border-border bg-background flex flex-col items-center justify-center gap-1 min-h-[140px] hover:border-primary/50 transition-colors"
                  >
                    <PlusIcon className="w-6 h-6 text-primary" />
                    <div className="text-xs font-semibold text-primary">
                      Add shape
                    </div>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {showCreateGroup && (
          <CreateGroupOverlay
            value={createGroupName}
            onChange={setCreateGroupName}
            onClose={() => setShowCreateGroup(false)}
            onSubmit={handleSubmitCreateGroup}
            loading={creatingGroup}
          />
        )}

        {/* Edit Group Modal */}
        <Modal
          title="Rename Group"
          open={editGroupModalOpen}
          onCancel={() => {
            setEditGroupModalOpen(false);
            editGroupForm.resetFields();
            setEditingGroup(null);
          }}
          onOk={handleSaveGroupEdit}
          confirmLoading={editingGroupLoading}
          okButtonProps={{
            style: { backgroundColor: "#3CB371", borderColor: "#3CB371" },
          }}
          okText="Save"
          width={isMobile ? "95vw" : 480}
          centered
        >
          <Form
            form={editGroupForm}
            layout="vertical"
            style={{ marginTop: 16 }}
          >
            <Form.Item
              name="name"
              label="Group Name"
              rules={[{ required: true, message: "Please enter a group name" }]}
            >
              <Input
                placeholder="Group name"
                size="large"
                style={{ borderRadius: 8 }}
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* Add Shape Modal */}
        <Modal
          title="Add New Shape"
          open={isModalVisible}
          onCancel={handleCancel}
          footer={null}
          width={isMobile ? "95vw" : 700}
          centered
          styles={{
            body: {
              maxHeight: isMobile ? "calc(100dvh - 200px)" : "70dvh",
              overflowY: "auto",
              overscrollBehavior: "contain",
            },
          }}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleAddShape}
            initialValues={{ type: "stencil", textAlignment: "bottom" }}
          >
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="name"
                  label="Name"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Shape name" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="type"
                  label="Shape Type"
                  rules={[{ required: true }]}
                >
                  <Select
                    // Render the popup inside the modal — otherwise the Ant
                    // Design portal places it on document.body where the
                    // modal mask/stacking context can hide it.
                    getPopupContainer={(trigger) =>
                      trigger.parentElement || document.body
                    }
                  >
                    <Option value="stencil">Stencil</Option>
                    <Option value="image">Image</Option>
                    <Option value="html">HTML</Option>
                    <Option value="shape">XML</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="groupId"
              label="Group"
              rules={[{ required: true, message: "Please select a group" }]}
            >
              <Select
                placeholder="Select a group"
                // Keep the popup inside the modal (same reason as the Shape
                // Type select above) and use the new API for custom footer.
                getPopupContainer={(trigger) =>
                  trigger.parentElement || document.body
                }
                popupRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: "8px 0" }} />
                    <Space style={{ padding: "0 8px 4px" }}>
                      <Input
                        placeholder="New group name"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                      />
                      <Button
                        type="text"
                        icon={<PlusOutlined />}
                        onClick={handleCreateGroup}
                        loading={addingGroup}
                      >
                        Add
                      </Button>
                    </Space>
                  </>
                )}
              >
                {groups.map((g) => (
                  <Option key={g.id} value={g.id}>
                    {g.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {shapeType === "image" ? (
              <Form.Item
                name="upload"
                label="Image Upload"
                valuePropName="fileList"
                getValueFromEvent={normFile}
                rules={[{ required: true, message: "Please upload an image" }]}
              >
                <Dragger
                  name="files"
                  maxCount={1}
                  beforeUpload={(file) => {
                    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
                      message.error(
                        `Image is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max is ${MAX_IMAGE_MB}MB.`,
                      );
                      return Upload.LIST_IGNORE;
                    }
                    return false;
                  }}
                  accept="image/*"
                >
                  <p className="ant-upload-drag-icon">
                    <FileImageOutlined />
                  </p>
                  <p className="ant-upload-text">
                    Click or drag file to this area to upload
                  </p>
                </Dragger>
              </Form.Item>
            ) : (
              <>
                {shapeType === "shape" && (
                  <Form.Item label="Upload XML File">
                    <Dragger
                      name="xmlfile"
                      maxCount={1}
                      showUploadList={false}
                      accept=".xml,.svg,.txt,text/xml,application/xml,image/svg+xml"
                      beforeUpload={(file) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                          const text = String(reader.result || "").trim();
                          if (!text) {
                            message.error("File is empty");
                            return;
                          }
                          form.setFieldsValue({ content: text });
                          message.success(`Loaded ${file.name}`);
                        };
                        reader.onerror = () =>
                          message.error("Failed to read file");
                        reader.readAsText(file);
                        return false;
                      }}
                    >
                      <p className="ant-upload-drag-icon">
                        <FileImageOutlined />
                      </p>
                      <p className="ant-upload-text">
                        Click or drag an XML / SVG file
                      </p>
                      <p
                        className="ant-upload-hint"
                        style={{ fontSize: 12, color: "#888" }}
                      >
                        File contents will populate the field below
                      </p>
                    </Dragger>
                  </Form.Item>
                )}
                <Form.Item
                  name="content"
                  label="Content (SVG/HTML/XML)"
                  rules={[
                    { required: true, message: "Please enter content" },
                    {
                      max: MAX_CONTENT_CHARS,
                      message: `Content is too large (max ${MAX_CONTENT_CHARS / 1_000_000}M characters)`,
                    },
                  ]}
                  help="Paste your SVG / HTML / mxGraph XML here, or upload a file above."
                >
                  <Input.TextArea rows={6} placeholder="<svg...>...</svg>" />
                </Form.Item>
              </>
            )}

            <Form.Item
              name="textAlignment"
              label="Text Alignment"
              rules={[{ required: true }]}
            >
              <Radio.Group>
                <Radio value="top">Top</Radio>
                <Radio value="center">Center</Radio>
                <Radio value="bottom">Bottom</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                style={{
                  background: "#3CB371",
                  borderColor: "#3CB371",
                  borderRadius: 8,
                }}
              >
                Save Shape
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </>
  );
}

export default function ShapesPage() {
  return (
    <Suspense
      fallback={
        <div style={{ textAlign: "center", padding: 80 }}>
          <Spin size="large" />
        </div>
      }
    >
      <ShapesContent />
    </Suspense>
  );
}
