"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Table,
  Typography,
  Button,
  Switch,
  Space,
  Empty,
  Tag
} from "antd";
import { toast } from "sonner";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { Field, FieldInput } from "@/components/common/Field";
import { PlusOutlined, BugOutlined, DeleteOutlined } from "@ant-design/icons";
import { issuesApi } from "@/api/issues.api";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useAppContext } from "@/context/AppContext";

const { Title, Text } = Typography;

export default function IssuesPage() {
  const isMobile = useIsMobile();
  // Re-scope issues to the active account/team on switch (same as flows).
  const { activeTeamId } = useAppContext();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [flowId, setFlowId] = useState("");

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await issuesApi.list();
      const data = res.data?.data?.issues || res.data?.data || res.data;
      setIssues(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("[Issues] fetch failed", err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeamId]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!flowId.trim()) {
      toast.error("Please enter the Flow ID this issue belongs to");
      return;
    }
    try {
      setCreating(true);
      // flowId must be an integer
      await issuesApi.create({
        title: title.trim(),
        flowId: Number(flowId),
      });
      toast.success("Issue created");
      setTitle("");
      setFlowId("");
      setModalOpen(false);
      fetchIssues();
    } catch {
      toast.error("Failed to create issue");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, currentChecked: boolean) => {
    try {
      await issuesApi.update(id, { isChecked: !currentChecked });
      toast.success("Issue updated");
      fetchIssues();
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await issuesApi.delete(id);
      toast.success("Issue deleted");
      fetchIssues();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "Flow ID",
      dataIndex: "flowId",
      key: "flowId",
      render: (id: number) => <Tag>{id}</Tag>,
      width: 100,
    },
    {
      title: "Resolved",
      dataIndex: "isChecked",
      key: "isChecked",
      render: (checked: boolean, record: any) => (
        <Switch
          checked={checked}
          checkedChildren="Done"
          unCheckedChildren="Open"
          onChange={() => handleToggle(record.id, checked)}
        />
      ),
      width: 110,
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "created",
      render: (d: string) => new Date(d).toLocaleDateString(),
      width: 120,
    },
    {
      title: "",
      key: "actions",
      width: 60,
      render: (_: any, record: any) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          size="small"
          aria-label="Delete issue"
          onClick={() => handleDelete(record.id)}
          style={{
            minWidth: 44,
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
      ),
    },
  ];

  return (
    <div
      style={{
        maxWidth: 1000,
        margin: "0 auto",
        padding: isMobile ? "0 12px" : "0",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          gap: isMobile ? 12 : 0,
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, fontSize: isMobile ? 20 : 24 }}>
            Issues
          </Title>
          <Text type="secondary">Track and manage issues in your diagrams</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          block={isMobile}
          onClick={() => setModalOpen(true)}
        >
          New Issue
        </Button>
      </div>

      <Card styles={{ body: { padding: isMobile ? "12px 8px" : "24px" } }}>
        <Table
          dataSource={Array.isArray(issues) ? issues : []}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 600 }}
          locale={{
            emptyText: (
              <Empty
                image={
                  <BugOutlined style={{ fontSize: 48, color: "#d9d9d9" }} />
                }
                description="No issues found"
              />
            ),
          }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <ModalShell open={modalOpen} onClose={() => setModalOpen(false)}>
        <ModalHeader title="Create Issue" close={() => setModalOpen(false)} />
        <div className="px-5 pb-5 space-y-4">
          <Field label="Title" required>
            <FieldInput
              placeholder="Issue title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <div>
            <Field label="Flow ID" required>
              <FieldInput
                type="number"
                min={1}
                placeholder="e.g. 1"
                value={flowId}
                onChange={(e) => setFlowId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </Field>
            <div className="text-xs text-muted-foreground mt-1">
              Enter the numeric ID of the flow this issue is linked to
            </div>
          </div>
        </div>
        <ModalFooter
          close={() => setModalOpen(false)}
          primary={handleCreate}
          primaryLabel="Create"
          loading={creating}
          disabled={!title.trim() || !flowId.trim()}
        />
      </ModalShell>
    </div>
  );
}
