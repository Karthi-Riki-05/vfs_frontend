"use client";

import React, { useState, useEffect } from 'react';
import { Card, Table, Typography, Button, Modal, Input, Tag, message, Space } from 'antd';
import { adminApi } from '@/api/admin.api';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyModal, setReplyModal] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [responding, setResponding] = useState(false);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await adminApi.listFeedback();
      const data = res.data?.data?.feedback || res.data?.data || res.data;
      setFeedback(Array.isArray(data) ? data : []);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFeedback(); }, []);

  const handleRespond = async () => {
    if (!replyModal) return;
    setResponding(true);
    try {
      await adminApi.respondFeedback(replyModal.id, { response: replyText });
      message.success('Response sent');
      setReplyModal(null);
      setReplyText('');
      fetchFeedback();
    } catch {
      message.error('Failed to respond');
    } finally {
      setResponding(false);
    }
  };

  const columns = [
    { title: 'User', dataIndex: ['user', 'name'], key: 'user', render: (n: string, r: any) => n || r.user?.email || 'Anonymous' },
    { title: 'Message', dataIndex: 'message', key: 'message', ellipsis: true },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, r: any) => r.response ? <Tag color="green">Replied</Tag> : <Tag color="blue">Pending</Tag>,
    },
    { title: 'Date', dataIndex: 'createdAt', key: 'date', render: (d: string) => d ? new Date(d).toLocaleDateString() : '-' },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Button type="link" onClick={() => { setReplyModal(record); setReplyText(record.response || ''); }}>
          {record.response ? 'View Reply' : 'Reply'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Feedback</Title>
      <Card>
        <Table dataSource={feedback} columns={columns} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} />
      </Card>
      <Modal
        title="Respond to Feedback"
        open={!!replyModal}
        onCancel={() => setReplyModal(null)}
        onOk={handleRespond}
        confirmLoading={responding}
      >
        {replyModal && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>Original Message:</Text>
            <Card size="small" style={{ marginTop: 8, background: '#f5f5f5' }}>
              {replyModal.message}
            </Card>
          </div>
        )}
        <TextArea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Type your response..."
          rows={4}
        />
      </Modal>
    </div>
  );
}
