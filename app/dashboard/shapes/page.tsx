"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Typography, Empty, Button, Modal, Form, Input, Select, message, Row, Col, Spin, Radio, Upload, Divider, Space } from 'antd';
import { PlusOutlined, UploadOutlined, FileImageOutlined, CodeOutlined } from '@ant-design/icons';
import ShapesSidebar from '@/components/dashboard/ShapesSidebar';
import ShapeCard from '@/components/shapes/ShapeCard';
import axios from '@/lib/axios';
import { RcFile } from 'antd/es/upload';

const { Option } = Select;
const { Title } = Typography;
const { Dragger } = Upload;

export default function ShapesPage() {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [shapes, setShapes] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
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
            const response = await axios.get('/shapes');
            setShapes(response.data || []);
        } catch (error: any) {
            console.error("Failed to load shapes", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchGroups = async () => {
        try {
            const response = await axios.get('/shape-groups');
            setGroups(response.data || []);
        } catch (error) {
            console.error("Failed to load groups", error);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        setAddingGroup(true);
        try {
            const response = await axios.post('/shape-groups', { name: newGroupName });
            setGroups([response.data, ...groups]);
            form.setFieldsValue({ groupId: response.data.id });
            setNewGroupName('');
            message.success('Group created');
        } catch (error) {
            message.error('Failed to create group');
        } finally {
            setAddingGroup(false);
        }
    };

    // Derived state for sidebar (combining API groups and any legacy categories if needed)
    // For now, we strictly use the groups from the API + 'All Shapes'
    const sidebarGroups = useMemo(() => {
        return groups.map(g => g.name);
    }, [groups]);

    // Filtered shapes
    const filteredShapes = useMemo(() => {
        if (!selectedGroup) return shapes;
        // Filter by group name (assuming sidebar passes name)
        // We need to match shape.group.name OR shape.groupId if we had full objects.
        // The sidebar passes the *Name* string.
        return shapes.filter(s => s.group?.name === selectedGroup);
    }, [shapes, selectedGroup]);

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
                content: content, // This handles both text content and base64 image
            };

            await axios.post('/shapes', payload);
            message.success('Shape added successfully');
            setIsModalVisible(false);
            form.resetFields();
            fetchShapes();
        } catch (error: any) {
            console.error("Failed to add shape", error);
            message.error('Failed to add shape');
        }
    };

    const handleDeleteShape = async (id: string) => {
        try {
            await axios.delete(`/shapes/${id}`);
            setShapes(shapes.filter(s => s.id !== id));
            message.success("Shape deleted");
        } catch (error) {
            // If backend delete not impl, optimistic UI update
            setShapes(shapes.filter(s => s.id !== id));
            message.info("Shape removed from view (backend delete might be pending)");
        }
    };

    const normFile = (e: any) => {
        if (Array.isArray(e)) {
            return e;
        }
        return e?.fileList;
    };

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 115px)', margin: '-24px' }}>
            <ShapesSidebar
                groups={sidebarGroups}
                selectedGroup={selectedGroup}
                onSelectGroup={setSelectedGroup}
            />

            <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <Title level={4} style={{ margin: 0 }}>
                        {selectedGroup ? selectedGroup : 'All Shapes'}
                    </Title>
                    <Button type="primary" icon={<PlusOutlined />} onClick={showModal}>
                        Add Shape
                    </Button>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin size="large" /></div>
                ) : filteredShapes.length > 0 ? (
                    <Row gutter={[16, 16]}>
                        {filteredShapes.map((shape) => (
                            <Col xs={24} sm={12} md={8} lg={6} xl={4} key={shape.id}>
                                <ShapeCard shape={shape} onDelete={handleDeleteShape} />
                            </Col>
                        ))}
                    </Row>
                ) : (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={selectedGroup ? `No shapes in ${selectedGroup}` : "No shapes found"}
                        style={{ padding: '100px 0' }}
                    >
                        <Button type="primary" onClick={showModal}>Add your first shape</Button>
                    </Empty>
                )}
            </div>

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
                        <Button type="primary" htmlType="submit" block size="large">
                            Save Shape
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
