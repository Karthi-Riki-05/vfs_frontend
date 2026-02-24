"use client";

import React, { useState } from 'react';
import { Menu, Typography, Button } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import {
    AppstoreOutlined,
    FolderOutlined,
    PlusOutlined,
    FormatPainterOutlined
} from '@ant-design/icons';

const { Text } = Typography;

interface ShapesSidebarProps {
    groups: string[];
    selectedGroup: string | null;
    onSelectGroup: (group: string | null) => void;
}

export default function ShapesSidebar({ groups, selectedGroup, onSelectGroup }: ShapesSidebarProps) {
    const [openKeys, setOpenKeys] = useState(['my-groups']);
    const [compact, setCompact] = useState(false);

    // Convert groups to menu items format
    const groupItems = groups.map(group => ({
        key: group,
        label: group,
        icon: <FolderOutlined style={{ fontSize: 16, color: '#8c8c8c' }} />,
        onClick: () => onSelectGroup(group)
    }));

    const items = [
        {
            key: 'all-shapes',
            icon: <AppstoreOutlined />,
            label: 'All Shapes',
            onClick: () => onSelectGroup(null)
        },
        {
            key: 'my-groups',
            icon: <FormatPainterOutlined />,
            label: 'My Groups',
            children: groupItems.length > 0 ? groupItems : [{ key: 'no-groups', label: 'No groups', disabled: true }]
        },
    ];

    return (
        <div style={{
            width: compact ? 80 : '100%',
            maxWidth: compact ? 80 : 240,
            height: '100%',
            borderRight: '1px solid #f0f0f0',
            background: '#fff',
            paddingTop: 8,
            transition: 'width 0.18s'
        }}>
            <div style={{ display: 'flex', justifyContent: compact ? 'center' : 'flex-end', padding: '0 8px 8px' }}>
                <Button type="text" size="small" icon={compact ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCompact(!compact)} />
            </div>
            <Menu
                mode="inline"
                inlineCollapsed={compact}
                selectedKeys={[selectedGroup || 'all-shapes']}
                openKeys={openKeys}
                onOpenChange={(keys) => setOpenKeys(keys)}
                style={{ borderRight: 0 }}
                items={items}
            />
        </div>
    );
}
