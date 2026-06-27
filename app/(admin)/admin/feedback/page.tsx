"use client";

import React, { useState, useEffect } from "react";
import { Card, Table, Typography, Button, Tag, message, Space } from "antd";
import { toast } from "sonner";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { Field } from "@/components/common/Field";
import { adminApi } from "@/api/admin.api";

const { Title, Text } = Typography;

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyModal, setReplyModal] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [responding, setResponding] = useState(false);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listFeedback();
      const data = res.data?.data?.feedback || res.data?.data || res.data;
      setFeedback(Array.isArray(data) ? data : []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleRespond = async () => {
    if (!replyModal) return;
    setResponding(true);
    try {
      await adminApi.respondFeedback(replyModal.id, { response: replyText });
      toast.success("Response sent");
      setReplyModal(null);
      setReplyText("");
      fetchFeedback();
    } catch {
      toast.error("Failed to respond");
    } finally {
      setResponding(false);
    }
  };

  const columns = [
    {
      title: "User",
      dataIndex: ["user", "name"],
      key: "user",
      render: (n: string, r: any) => n || r.user?.email || "Anonymous",
    },
    { title: "Message", dataIndex: "message", key: "message", ellipsis: true },
    {
      title: "Status",
      key: "status",
      render: (_: any, r: any) =>
        r.response ? (
          <Tag color="green">Replied</Tag>
        ) : (
          <Tag color="blue">Pending</Tag>
        ),
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "date",
      render: (d: string) => (d ? new Date(d).toLocaleDateString() : "-"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: any) => (
        <Button
          type="link"
          onClick={() => {
            setReplyModal(record);
            setReplyText(record.response || "");
          }}
        >
          {record.response ? "View Reply" : "Reply"}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        Feedback
      </Title>
      <Card>
        <Table
          dataSource={feedback}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </Card>
      <ModalShell open={!!replyModal} onClose={() => setReplyModal(null)}>
        <ModalHeader
          title="Respond to Feedback"
          close={() => setReplyModal(null)}
        />
        <div className="tw px-5 py-4 space-y-3">
          {replyModal && (
            <div>
              <Text strong>Original Message:</Text>
              <div className="mt-2 rounded-xl bg-secondary/60 border border-border px-3 py-2.5 text-sm text-foreground">
                {replyModal.message}
              </div>
            </div>
          )}
          <Field label="Response">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your response..."
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none resize-none font-sans"
            />
          </Field>
        </div>
        <ModalFooter
          close={() => setReplyModal(null)}
          primary={handleRespond}
          primaryLabel="Send"
          loading={responding}
          disabled={!replyText.trim()}
        />
      </ModalShell>
    </div>
  );
}
