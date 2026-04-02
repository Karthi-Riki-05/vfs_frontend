"use client";

import React from 'react';
import { Table, Tag } from 'antd';
import { ColumnsType } from 'antd/es/table';

interface CustomShape {
    id: string;
    name: string;
    category: string;
    xmlContent: string;
    thumbnail?: string;
    isPublic: boolean;
    ownerId?: string;
    createdAt: string;
}

interface CustomShapesTableProps {
    shapes: CustomShape[];
}

export default function CustomShapesTable({ shapes }: CustomShapesTableProps) {
    const columns: ColumnsType<CustomShape> = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: (category) => <Tag color="blue">{category}</Tag>,
        },
        {
            title: 'Public',
            dataIndex: 'isPublic',
            key: 'isPublic',
            render: (isPublic) => isPublic ? <Tag color="green">Yes</Tag> : <Tag color="red">No</Tag>,
        },
        {
            title: 'Created',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => new Date(date).toLocaleDateString(),
        },
        {
            title: 'XML Content',
            dataIndex: 'xmlContent',
            key: 'xmlContent',
            ellipsis: true,
        },
    ];

    return <Table columns={columns} dataSource={shapes} rowKey="id" />;
}