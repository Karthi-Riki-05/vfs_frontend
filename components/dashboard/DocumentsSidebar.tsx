"use client";

import React, { useState } from 'react';
import { Menu, Typography, Button, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import axios from 'axios';
import {
    ClockCircleOutlined,
    StarOutlined,
    FolderOutlined,
    DeleteOutlined,
    TeamOutlined,
    DownOutlined,
    RightOutlined
} from '@ant-design/icons';

const { Text } = Typography;

export default function DocumentsSidebar() {
    const [openKeys, setOpenKeys] = useState(['documents']);
    const [creating, setCreating] = useState(false);

    // Handler for creating a blank diagram
    const handleCreateFlow = async (templateName: string) => {
        if (creating) return;
        setCreating(true);
        try {
            const response = await axios.post('/api/flows', {
                name: `Untitled ${templateName}`,
                description: `New ${templateName} created from dashboard`
            });
            const newFlow = response.data;
            window.open(`/viewer/${newFlow.id}`, '_blank');
        } catch (error) {
            console.error("Failed to create flow:", error);
            message.error("Failed to create flow");
        } finally {
            setCreating(false);
        }
    };

    const items = [
        {
            key: 'blank-diagram',
            icon: <PlusOutlined style={{ color: '#52c41a' }} />,
            label: (
                <span style={{ opacity: creating ? 0.5 : 1, pointerEvents: creating ? 'none' : 'auto' }}>
                    Blank diagram
                </span>
            ),
            onClick: () => handleCreateFlow('Blank diagram'),
            disabled: creating,
        },
        {
            key: 'recent',
            icon: <ClockCircleOutlined />,
            label: 'Recent',
        },
        {
            key: 'starred',
            icon: <StarOutlined />,
            label: 'Favorites',
        },
        {
            key: 'documents',
            icon: <FolderOutlined />,
            label: 'Documents',
            children: [
                {
                    key: 'my-documents',
                    label: 'My documents',
                    icon: <FolderOutlined style={{ fontSize: 16, color: '#8c8c8c' }} />
                },
                {
                    key: 'trash',
                    label: 'Trash',
                    icon: <DeleteOutlined />
                },
            ]
        },
        {
            key: 'shared',
            icon: <TeamOutlined />,
            label: 'Shared with me',
        },
    ];

    return (
        <div style={{
            width: '100%',
            maxWidth: 240,
            height: '100%',
            borderRight: '1px solid #f0f0f0',
            background: '#fff',
            paddingTop: 16
        }}>
            <Menu
                mode="inline"
                defaultSelectedKeys={['recent']}
                openKeys={openKeys}
                onOpenChange={(keys) => setOpenKeys(keys)}
                style={{ borderRight: 0 }}
                items={items}
                onClick={(info) => {
                    const item = items.find(i => i.key === info.key);
                    if (item && typeof item.onClick === 'function') {
                        item.onClick();
                    }
                }}
            />
        </div>
    );
}
