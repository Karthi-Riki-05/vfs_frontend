"use client";

import React, { useState } from 'react';
import { Card, Row, Col, Typography, Space, Input, Button, Form, message } from 'antd';
import {
  ApartmentOutlined, NodeIndexOutlined, DeploymentUnitOutlined,
  DatabaseOutlined, BlockOutlined, PlusOutlined, FileTextOutlined
} from '@ant-design/icons';
import { flowsApi } from '@/api/flows.api';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

const templates = [
  { key: 'flowchart', title: 'Flowchart', icon: <DeploymentUnitOutlined />, color: '#4caf50' },
  { key: 'mindmap', title: 'Mind Map', icon: <NodeIndexOutlined />, color: '#9c27b0' },
  { key: 'bpmn', title: 'Business Process', icon: <ApartmentOutlined />, color: '#2196f3' },
  { key: 'orgchart', title: 'Org Chart', icon: <ApartmentOutlined />, color: '#ff9800' },
  { key: 'er', title: 'Database ER', icon: <DatabaseOutlined />, color: '#f44336' },
  { key: 'concept', title: 'Concept Map', icon: <BlockOutlined />, color: '#3f51b5' },
];

export default function NewFlowPage() {
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [form] = Form.useForm();
  const router = useRouter();

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      const res = await flowsApi.create({
        name: values.name,
        description: values.description,
        templateId: selectedTemplate || undefined,
      });
      const newFlow = res.data?.data || res.data;
      if (!newFlow?.id) throw new Error('No flow ID returned');
      message.success('Document created');
      window.open(`/dashboard/flows/${newFlow.id}`, '_blank');
    } catch (err: any) {
      if (err.errorFields) return; // form validation
      message.error('Failed to create document');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Create New Document</Title>
        <Text type="secondary">Choose a template or start blank</Text>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Document Name" rules={[{ required: true, message: 'Please enter a name' }]}>
            <Input placeholder="My Diagram" size="large" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Optional description..." rows={2} />
          </Form.Item>
        </Form>
      </Card>

      <Title level={5} style={{ marginBottom: 16 }}>Choose a Template</Title>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={8} md={6}>
          <Card
            hoverable
            style={{
              textAlign: 'center',
              borderRadius: 8,
              border: !selectedTemplate ? '2px solid #4F46E5' : '1px solid #f0f0f0',
              background: !selectedTemplate ? '#EEF2FF' : '#fafafa',
            }}
            onClick={() => setSelectedTemplate(null)}
          >
            <Space direction="vertical" size={8}>
              <div style={{ fontSize: 28, color: '#595959', width: 48, height: 48, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '2px dashed #d9d9d9' }}>
                <PlusOutlined />
              </div>
              <Text strong>Blank</Text>
            </Space>
          </Card>
        </Col>
        {templates.map((t) => (
          <Col xs={12} sm={8} md={6} key={t.key}>
            <Card
              hoverable
              style={{
                textAlign: 'center',
                borderRadius: 8,
                border: selectedTemplate === t.key ? '2px solid #4F46E5' : '1px solid #f0f0f0',
                background: selectedTemplate === t.key ? '#EEF2FF' : undefined,
              }}
              onClick={() => setSelectedTemplate(t.key)}
            >
              <Space direction="vertical" size={8}>
                <div style={{ fontSize: 28, color: t.color, width: 48, height: 48, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', background: `${t.color}15` }}>
                  {t.icon}
                </div>
                <Text strong>{t.title}</Text>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <div style={{ textAlign: 'right' }}>
        <Space>
          <Button onClick={() => router.back()}>Cancel</Button>
          <Button type="primary" icon={<FileTextOutlined />} onClick={handleCreate} loading={loading}>
            Create Document
          </Button>
        </Space>
      </div>
    </div>
  );
}
