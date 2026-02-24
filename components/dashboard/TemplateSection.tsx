"use client";

import React from 'react';
import { Card, Row, Col, Typography, Space } from 'antd';
import {
    ApartmentOutlined,
    NodeIndexOutlined,
    DeploymentUnitOutlined,
    DatabaseOutlined,
    BlockOutlined,
    PlusOutlined
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';
import { message } from 'antd';

const { Title, Text } = Typography;

const templates = [
    { title: 'Flowchart', icon: <DeploymentUnitOutlined />, color: '#4caf50' },
    { title: 'Mind map with AI', icon: <NodeIndexOutlined />, color: '#9c27b0' },
    { title: 'Business process', icon: <ApartmentOutlined />, color: '#2196f3' },
    { title: 'Org chart', icon: <ApartmentOutlined />, color: '#ff9800' },
    { title: 'Database ER', icon: <DatabaseOutlined />, color: '#f44336' },
    { title: 'Concept map', icon: <BlockOutlined />, color: '#3f51b5' },
];

export default function TemplateSection() {
    const router = useRouter();

    const handleCreateFlow = async (templateName: string) => {
        try {
            const response = await axios.post('/flows', {
                name: `Untitled ${templateName}`,
                description: `New ${templateName} created from dashboard`
            });
            const newFlow = response.data;
            window.open(`/viewer/${newFlow.id}`, '_blank');
        } catch (error) {
            console.error("Failed to create flow:", error);
            message.error("Failed to create flow");
        }
    };

    return (
        <div style={{ marginBottom: 40 }}>
            <Title level={4} style={{ marginBottom: 16 }}>Jump into something new</Title>
            <Row gutter={[16, 16]}>
                {templates.map((template, index) => (
                    <Col key={index} xs={12} sm={8} md={6} lg={4}>
                        <Card
                            hoverable
                            style={{
                                height: '100%',
                                textAlign: 'center',
                                borderRadius: 8,
                                border: '1px solid #f0f0f0'
                            }}
                            bodyStyle={{ padding: '24px 12px' }}
                            onClick={() => handleCreateFlow(template.title)}
                        >
                            <Space direction="vertical" size={16}>
                                <div style={{
                                    fontSize: 32,
                                    color: template.color,
                                    background: `${template.color}15`,
                                    width: 64,
                                    height: 64,
                                    borderRadius: 12,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto'
                                }}>
                                    {template.icon}
                                </div>
                                <Text strong style={{ display: 'block' }}>{template.title}</Text>
                            </Space>
                        </Card>
                    </Col>
                ))}
                <Col xs={12} sm={8} md={6} lg={4}>
                    <Card
                        hoverable
                        style={{
                            height: '100%',
                            textAlign: 'center',
                            borderRadius: 8,
                            border: '1px solid #f0f0f0',
                            background: '#fafafa'
                        }}
                        bodyStyle={{ padding: '24px 12px' }}
                        onClick={() => handleCreateFlow('Blank diagram')}
                    >
                        <Space direction="vertical" size={16}>
                            <div style={{
                                fontSize: 32,
                                color: '#595959',
                                width: 64,
                                height: 64,
                                borderRadius: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto',
                                border: '2px dashed #d9d9d9'
                            }}>
                                <PlusOutlined />
                            </div>
                            <Text strong style={{ display: 'block' }}>Blank diagram</Text>
                        </Space>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
