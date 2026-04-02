"use client";

import React from 'react';
import { Table, Tag } from 'antd';
import { ColumnsType } from 'antd/es/table';

interface Shape {
    id: string;
    type: 'STENCIL' | 'IMAGE' | 'HTML';
    x: number;
    y: number;
    width: number;
    height: number;
    data: string;
    groupId: string;
}

interface ShapesTableProps {
    shapes: Shape[];
}

export default function ShapesTable({ shapes }: ShapesTableProps) {
    const columns: ColumnsType<Shape> = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
        },
        {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type) => <Tag color={type === 'STENCIL' ? 'blue' : type === 'IMAGE' ? 'green' : 'orange'}>{type}</Tag>,
        },
        {
            title: 'Group ID',
            dataIndex: 'groupId',
            key: 'groupId',
        },
        {
            title: 'Position',
            key: 'position',
            render: (_, record) => `(${record.x}, ${record.y})`,
        },
        {
            title: 'Size',
            key: 'size',
            render: (_, record) => `${record.width} x ${record.height}`,
        },
        {
            title: 'Data',
            dataIndex: 'data',
            key: 'data',
            ellipsis: true,
        },
    ];

    return <Table columns={columns} dataSource={shapes} rowKey="id" />;
}