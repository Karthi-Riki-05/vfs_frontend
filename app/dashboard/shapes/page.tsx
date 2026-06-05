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
  Card,
  Typography,
  Dropdown,
} from "antd";
import {
  PlusOutlined,
  FileImageOutlined,
  ArrowLeftOutlined,
  AppstoreOutlined,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import SectionHeader from "@/components/common/SectionHeader";
import EmptyState from "@/components/common/EmptyState";
import ShapeCard from "@/components/shapes/ShapeCard";
import api from "@/lib/axios";
import { RcFile } from "antd/es/upload";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useAppContext } from "@/context/AppContext";
import { useTabFocus } from "@/hooks/useTabFocus";

const { Option } = Select;
const { Text } = Typography;
const { Dragger } = Upload;

const TEAL_COLOR = "#4ECDC4";

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
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [filterGroupId, setFilterGroupId] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [editGroupForm] = Form.useForm();
  const [editGroupModalOpen, setEditGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [editingGroupLoading, setEditingGroupLoading] = useState(false);

  // Form Watchers
  const shapeType = Form.useWatch("type", form);
  const [newGroupName, setNewGroupName] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);

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

  const handleCreateGroupFromEmpty = () => {
    setIsModalVisible(true);
  };

  const handleEditGroup = (group: any, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleDeleteGroup = (group: any, e: React.MouseEvent) => {
    e.stopPropagation();
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
          if (selectedGroup?.id === group.id) {
            setSelectedGroup(null);
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

  // Filtered shapes when viewing inside a group
  const filteredShapes = useMemo(() => {
    if (!selectedGroup) return shapes;
    return shapes.filter(
      (s) => s.groupId === selectedGroup.id || s.group?.id === selectedGroup.id,
    );
  }, [shapes, selectedGroup]);

  // Filtered groups for the group filter dropdown
  const displayedGroups = useMemo(() => {
    if (!filterGroupId) return groups;
    return groups.filter((g) => g.id === filterGroupId);
  }, [groups, filterGroupId]);

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

  // Render group cards (folder-style view)
  const renderGroupCards = () => {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "100px 0" }}>
          <Spin size="large" />
        </div>
      );
    }

    if (displayedGroups.length === 0) {
      return (
        <EmptyState
          title="No shape groups"
          description="Use the Add Shape button above to create a shape and its first group"
        />
      );
    }

    return (
      <Row gutter={[16, 16]}>
        {displayedGroups.map((group) => {
          const groupMenuItems = [
            {
              key: "edit",
              label: "Rename",
              icon: <EditOutlined />,
              onClick: (info: any) => {
                info.domEvent.stopPropagation();
                handleEditGroup(group, info.domEvent);
              },
            },
            { type: "divider" as const },
            {
              key: "delete",
              label: "Delete",
              icon: <DeleteOutlined />,
              danger: true,
              onClick: (info: any) => {
                info.domEvent.stopPropagation();
                handleDeleteGroup(group, info.domEvent);
              },
            },
          ];

          return (
            <Col xs={24} sm={12} md={8} lg={6} key={group.id}>
              <Card
                hoverable
                onClick={() => setSelectedGroup(group)}
                style={{
                  borderRadius: 12,
                  border: "1px solid #F0F0F0",
                  cursor: "pointer",
                }}
                styles={{
                  body: {
                    padding: "24px",
                    textAlign: "center",
                    position: "relative",
                  },
                }}
              >
                <div style={{ position: "absolute", top: 8, right: 8 }}>
                  <Dropdown
                    menu={{ items: groupMenuItems }}
                    trigger={["click"]}
                  >
                    <Button
                      type="text"
                      icon={<MoreOutlined />}
                      size="small"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Dropdown>
                </div>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 12,
                    background: `${TEAL_COLOR}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <AppstoreOutlined
                    style={{ fontSize: 28, color: TEAL_COLOR }}
                  />
                </div>
                <Text
                  strong
                  style={{
                    fontSize: 14,
                    color: "#1A1A2E",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  {group.name}
                </Text>
                <Text style={{ fontSize: 12, color: "#8C8C8C" }}>
                  {groupShapeCounts[group.id] || 0} shape
                  {(groupShapeCounts[group.id] || 0) !== 1 ? "s" : ""}
                </Text>
              </Card>
            </Col>
          );
        })}
      </Row>
    );
  };

  // Render shapes within a selected group
  const renderShapesInGroup = () => {
    if (loading) {
      return (
        <div style={{ textAlign: "center", padding: "100px 0" }}>
          <Spin size="large" />
        </div>
      );
    }

    return (
      <>
        <div style={{ marginBottom: 20 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => setSelectedGroup(null)}
            style={{ padding: "4px 8px", color: "#8C8C8C", fontSize: 14 }}
          >
            Back to Groups
          </Button>
        </div>

        {filteredShapes.length > 0 ? (
          <Row gutter={[16, 16]}>
            {filteredShapes.map((shape) => (
              <Col xs={24} sm={12} md={8} lg={6} xl={4} key={shape.id}>
                <ShapeCard shape={shape} onDelete={handleDeleteShape} />
              </Col>
            ))}
          </Row>
        ) : (
          <EmptyState
            title={`No shapes in ${selectedGroup.name}`}
            description="Use the Add Shape button above to add a shape to this group"
          />
        )}
      </>
    );
  };

  return (
    <div style={{ padding: isMobile ? 16 : 24 }}>
      <SectionHeader
        title={
          selectedGroup ? selectedGroup.name.toUpperCase() : "SHAPE LIBRARY"
        }
        right={
          selectedGroup ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={showModal}
              style={{
                background: "#3CB371",
                borderColor: "#3CB371",
                borderRadius: 8,
              }}
            >
              Add Shape
            </Button>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                width: isMobile ? "100%" : "auto",
              }}
            >
              <Select
                placeholder="Filter by group"
                allowClear
                style={{
                  flex: isMobile ? "1 1 100%" : "0 0 180px",
                  minWidth: 0,
                  borderRadius: 8,
                }}
                onChange={(value: string | undefined) =>
                  setFilterGroupId(value || null)
                }
                value={filterGroupId || undefined}
              >
                {groups.map((g) => (
                  <Option key={g.id} value={g.id}>
                    {g.name}
                  </Option>
                ))}
              </Select>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={showModal}
                block={isMobile}
                style={{
                  flexShrink: 0,
                  background: "#3CB371",
                  borderColor: "#3CB371",
                  borderRadius: 8,
                }}
              >
                Add Shape
              </Button>
            </div>
          )
        }
      />

      {selectedGroup ? renderShapesInGroup() : renderGroupCards()}

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
      >
        <Form form={editGroupForm} layout="vertical" style={{ marginTop: 16 }}>
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
        width={isMobile ? "100%" : 700}
        styles={{ body: { maxHeight: "70dvh", overflowY: "auto" } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddShape}
          initialValues={{ type: "stencil", textAlignment: "bottom" }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="name" label="Name" rules={[{ required: true }]}>
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
