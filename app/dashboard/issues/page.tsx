"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Typography, Button, Modal, Form, Input, InputNumber, Switch, Space, Empty, message, Tag } from 'antd';
import { PlusOutlined, BugOutlined, DeleteOutlined } from '@ant-design/icons';
import { issuesApi } from '@/api/issues.api';

const { Title, Text } = Typography;

export default function IssuesPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await issuesApi.list();
      const data = res.data?.data?.issues || res.data?.data || res.data;
      setIssues(Array.isArray(data) ? data : []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setCreating(true);
      // flowId must be an integer
      await issuesApi.create({ title: values.title, flowId: Number(values.flowId) });
      message.success('Issue created');
      form.resetFields();
      setModalOpen(false);
      fetchIssues();
    } catch {
      message.error('Failed to create issue');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, currentChecked: boolean) => {
    try {
      await issuesApi.update(id, { isChecked: !currentChecked });
      message.success('Issue updated');
      fetchIssues();
    } catch {
      message.error('Failed to update');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await issuesApi.delete(id);
      message.success('Issue deleted');
      fetchIssues();
    } catch {
      message.error('Failed to delete');
    }
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Flow ID',
      dataIndex: 'flowId',
      key: 'flowId',
      render: (id: number) => <Tag>{id}</Tag>,
      width: 100,
    },
    {
      title: 'Resolved',
      dataIndex: 'isChecked',
      key: 'isChecked',
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
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'created',
      render: (d: string) => new Date(d).toLocaleDateString(),
      width: 120,
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_: any, record: any) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          size="small"
          onClick={() => handleDelete(record.id)}
        />
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Issues</Title>
          <Text type="secondary">Track and manage issues in your diagrams</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          New Issue
        </Button>
      </div>

      <Card>
        <Table
          dataSource={issues}
          columns={columns}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: <Empty image={<BugOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />} description="No issues found" /> }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Modal
        title="Create Issue"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleCreate}
        confirmLoading={creating}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Please enter a title' }]}>
            <Input placeholder="Issue title" />
          </Form.Item>
          <Form.Item
            name="flowId"
            label="Flow ID"
            rules={[{ required: true, message: 'Please enter the Flow ID this issue belongs to' }]}
            extra="Enter the numeric ID of the flow this issue is linked to"
          >
            <InputNumber min={1} style={{ width: '100%' }} placeholder="e.g. 1" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
