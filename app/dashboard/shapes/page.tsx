"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button, Modal, Form, Input, Select, message, Row, Col, Spin, Radio, Upload, Divider, Space, Card, Typography } from 'antd';
import { PlusOutlined, FileImageOutlined, ArrowLeftOutlined, AppstoreOutlined } from '@ant-design/icons';
import SectionHeader from '@/components/common/SectionHeader';
import EmptyState from '@/components/common/EmptyState';
import ShapeCard from '@/components/shapes/ShapeCard';
import api from '@/lib/axios';
import { RcFile } from 'antd/es/upload';

const { Option } = Select;
const { Text } = Typography;
const { Dragger } = Upload;

const TEAL_COLOR = '#4ECDC4';

export default function ShapesPage() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [shapes, setShapes] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [filterGroupId, setFilterGroupId] = useState<string | null>(null);
  const [form] = Form.useForm();

  // Form Watchers
  const shapeType = Form.useWatch('type', form);
  const [newGroupName, setNewGroupName] = useState('');
  const [addingGroup, setAddingGroup] = useState(false);

  useEffect(() => {
    fetchShapes();
    fetchGroups();
  }, []);

  const fetchShapes = async () => {
    setLoading(true);
    try {
      const response = await api.get('/shapes');
      const ds = response.data?.data || response.data || {};
      setShapes(ds.shapes || (Array.isArray(ds) ? ds : []));
    } catch (error: any) {
      console.error('Failed to load shapes', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await api.get('/shape-groups');
      const dg = response.data?.data || response.data || {};
      setGroups(dg.groups || (Array.isArray(dg) ? dg : []));
    } catch (error) {
      console.error('Failed to load groups', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setAddingGroup(true);
    try {
      const response = await api.post('/shape-groups', { name: newGroupName });
      const newGroup = response.data?.data || response.data;
      setGroups([newGroup, ...groups]);
      form.setFieldsValue({ groupId: newGroup.id });
      setNewGroupName('');
      message.success('Group created');
    } catch (error) {
      message.error('Failed to create group');
    } finally {
      setAddingGroup(false);
    }
  };

  const handleCreateGroupFromEmpty = () => {
    setIsModalVisible(true);
  };

  // Count shapes per group
  const groupShapeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    shapes.forEach(s => {
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
    return shapes.filter(s => s.groupId === selectedGroup.id || s.group?.id === selectedGroup.id);
  }, [shapes, selectedGroup]);

  // Filtered groups for the group filter dropdown
  const displayedGroups = useMemo(() => {
    if (!filterGroupId) return groups;
    return groups.filter(g => g.id === filterGroupId);
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
      if (values.type === 'image' && values.upload) {
        const file = values.upload[0]?.originFileObj;
        if (file) {
          content = await getBase64(file);
        }
      }

      const payload = {
        name: values.name,
        type: values.type,
        groupId: values.groupId,
        textAlignment: values.textAlignment,
        content: content,
      };

      await api.post('/shapes', payload);
      message.success('Shape added successfully');
      setIsModalVisible(false);
      form.resetFields();
      fetchShapes();
    } catch (error: any) {
      console.error('Failed to add shape', error);
      message.error('Failed to add shape');
    }
  };

  const handleDeleteShape = async (id: string) => {
    try {
      await api.delete(`/shapes/${id}`);
      setShapes(shapes.filter(s => s.id !== id));
      message.success('Shape deleted');
    } catch (error) {
      setShapes(shapes.filter(s => s.id !== id));
      message.info('Shape removed from view');
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
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" />
        </div>
      );
    }

    if (displayedGroups.length === 0) {
      return (
        <EmptyState
          title="No shape groups"
          description="Create a group to organize your shapes"
          actionText="Create Group"
          onAction={handleCreateGroupFromEmpty}
        />
      );
    }

    return (
      <Row gutter={[16, 16]}>
        {displayedGroups.map((group) => (
          <Col xs={24} sm={12} md={8} lg={6} key={group.id}>
            <Card
              hoverable
              onClick={() => setSelectedGroup(group)}
              style={{
                borderRadius: 12,
                border: '1px solid #F0F0F0',
                cursor: 'pointer',
              }}
              styles={{ body: { padding: '24px', textAlign: 'center' } }}
            >
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: `${TEAL_COLOR}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <AppstoreOutlined style={{ fontSize: 28, color: TEAL_COLOR }} />
              </div>
              <Text strong style={{ fontSize: 14, color: '#1A1A2E', display: 'block', marginBottom: 4 }}>
                {group.name}
              </Text>
              <Text style={{ fontSize: 12, color: '#8C8C8C' }}>
                {groupShapeCounts[group.id] || 0} shape{(groupShapeCounts[group.id] || 0) !== 1 ? 's' : ''}
              </Text>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  // Render shapes within a selected group
  const renderShapesInGroup = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
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
            style={{ padding: '4px 8px', color: '#8C8C8C', fontSize: 14 }}
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
            description="Add a shape to this group to get started"
            actionText="Add Shape"
            onAction={showModal}
          />
        )}
      </>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <SectionHeader
        title={selectedGroup ? selectedGroup.name.toUpperCase() : 'SHAPE LIBRARY'}
        right={
          selectedGroup ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={showModal}
              style={{ background: '#3CB371', borderColor: '#3CB371', borderRadius: 8 }}
            >
              Add Shape
            </Button>
          ) : (
            <>
              <Select
                placeholder="Filter by group"
                allowClear
                style={{ width: 180, borderRadius: 8 }}
                onChange={(value: string | undefined) => setFilterGroupId(value || null)}
                value={filterGroupId || undefined}
              >
                {groups.map(g => (
                  <Option key={g.id} value={g.id}>{g.name}</Option>
                ))}
              </Select>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={showModal}
                style={{ background: '#3CB371', borderColor: '#3CB371', borderRadius: 8 }}
              >
                Add Shape
              </Button>
            </>
          )
        }
      />

      {selectedGroup ? renderShapesInGroup() : renderGroupCards()}

      <Modal
        title="Add New Shape"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleAddShape} initialValues={{ type: 'stencil', textAlignment: 'bottom' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input placeholder="Shape name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="Shape Type" rules={[{ required: true }]}>
                <Select>
                  <Option value="stencil">Stencil</Option>
                  <Option value="image">Image</Option>
                  <Option value="html">HTML</Option>
                  <Option value="shape">Shape</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="groupId"
            label="Group"
            rules={[{ required: true, message: 'Please select a group' }]}
          >
            <Select
              placeholder="Select a group"
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <Space style={{ padding: '0 8px 4px' }}>
                    <Input
                      placeholder="New group name"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                    />
                    <Button type="text" icon={<PlusOutlined />} onClick={handleCreateGroup} loading={addingGroup}>
                      Add
                    </Button>
                  </Space>
                </>
              )}
            >
              {groups.map(g => (
                <Option key={g.id} value={g.id}>{g.name}</Option>
              ))}
            </Select>
          </Form.Item>

          {shapeType === 'image' ? (
            <Form.Item
              name="upload"
              label="Image Upload"
              valuePropName="fileList"
              getValueFromEvent={normFile}
              rules={[{ required: true, message: 'Please upload an image' }]}
            >
              <Dragger name="files" maxCount={1} beforeUpload={() => false} accept="image/*">
                <p className="ant-upload-drag-icon"><FileImageOutlined /></p>
                <p className="ant-upload-text">Click or drag file to this area to upload</p>
              </Dragger>
            </Form.Item>
          ) : (
            <Form.Item
              name="content"
              label="Content (SVG/HTML/XML)"
              rules={[{ required: true, message: 'Please enter content' }]}
              help="Paste your SVG code or HTML snippet here."
            >
              <Input.TextArea rows={6} placeholder="<svg...>...</svg>" />
            </Form.Item>
          )}

          <Form.Item name="textAlignment" label="Text Alignment" rules={[{ required: true }]}>
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
              style={{ background: '#3CB371', borderColor: '#3CB371', borderRadius: 8 }}
            >
              Save Shape
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
