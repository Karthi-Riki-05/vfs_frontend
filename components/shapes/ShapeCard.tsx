"use client";

import React from 'react';
import { Card, Button, Tooltip, Typography } from 'antd';
import { EditOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface ShapeCardProps {
    shape: any;
    onDelete: (id: string) => void;
}

export default function ShapeCard({ shape, onDelete }: ShapeCardProps) {
    // Helper to render preview based on type
    const renderPreview = () => {
        console.log(shape.type);
        if (shape.type === 'image') {
            return (
                <img
                    src={shape.content}
                    alt={shape.name}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
            );
        } else if (shape.type === 'STENCIL' || shape.xmlContent) {
            // Basic SVG rendering logic - assuming data is path data or full SVG content
            // For safety/complexity, we might need to parse. 
            // If data is just path "d" attribute:
            if (shape.data && shape.data.trim().startsWith('M')) {
                return (
                    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                        <path d={shape.data} fill="none" stroke="black" strokeWidth="2" />
                    </svg>
                );
            }
            // If it's valid SVG string, we'd need to dangerouslySetInnerHTML but cleaner to just show icon placeholder if complex
            // For now, let's try assuming it's XML/SVG content if explicitly provided
            const content = shape.xmlContent || shape.data;
            return (
                <div
                    style={{ width: '100%', height: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    dangerouslySetInnerHTML={{ __html: content }}
                />
            );
        }
        return <div style={{ color: '#ccc' }}>No Preview</div>;
    };

    return (
        <Card
            hoverable
            style={{ borderRadius: 8, overflow: 'hidden' }}
            cover={
                <div style={{
                    height: 120,
                    background: '#fafafa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16,
                    borderBottom: '1px solid #f0f0f0'
                }}>
                    {renderPreview()}
                </div>
            }
            actions={[
                <Tooltip title="Copy XML">
                    <Button type="text" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(shape.xmlContent || shape.data) }} />
                </Tooltip>,
                <Tooltip title="Delete">
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => onDelete(shape.id)} />
                </Tooltip>
            ]}
        >
            <Card.Meta
                title={<Text strong ellipsis>{shape.name || 'Untitled Shape'}</Text>}
                description={<Text type="secondary" style={{ fontSize: 12 }}>{shape.category || 'Uncategorized'}</Text>}
            />
        </Card>
    );
}
