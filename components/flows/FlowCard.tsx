"use client";

import React from 'react';
import { Card, Button, Typography, Space, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, ShareAltOutlined, CopyOutlined, EyeOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface FlowCardProps {
    flow: {
        id: string;
        name: string;
        description?: string;
        thumbnail?: string;
        updatedAt: string;
    };
    onEdit: (id: string) => void;
    onView: (id: string) => void;
    onDelete: (id: string) => void;
}

export default function FlowCard({ flow, onEdit, onView, onDelete }: FlowCardProps) {
    return (
        <Card
            hoverable
            style={{
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid #f0f0f0'
            }}
            cover={
                <div style={{
                    height: 180,
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid #f0f0f0',
                    padding: 20
                }}>
                    {flow.thumbnail ? (
                        <img
                            alt={flow.name}
                            src={flow.thumbnail}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        />
                    ) : (
                        <div style={{ color: '#d9d9d9', textAlign: 'center' }}>
                            <ProjectOutlined style={{ fontSize: 48 }} />
                            <div style={{ marginTop: 8 }}>No Preview</div>
                        </div>
                    )}
                </div>
            }
            actions={[
                <Tooltip title="View">
                    <Button type="text" icon={<EyeOutlined />} onClick={() => onView(flow.id)} />
                </Tooltip>,
                
                <Tooltip title="Delete">
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onDelete(flow.id)} />
                </Tooltip>
            ]}
        >
            <Card.Meta
                title={<Title level={5} style={{ margin: 0, fontSize: 16 }}>{flow.name}</Title>}
                description={
                    <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Last modified: {new Date(flow.updatedAt).toLocaleDateString()}
                        </Text>
                    </Space>
                }
            />
        </Card>
    );
}

import { ProjectOutlined } from '@ant-design/icons';
