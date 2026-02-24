"use client";

import React, { useState } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import GroupContainer from '@/components/shapes/GroupContainer';
import { Button } from 'antd';

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

interface GroupData {
    id: string;
    x: number;
    y: number;
    children: Shape[];
}

export default function KonvaDemo() {
    const [groups, setGroups] = useState<GroupData[]>([
        {
            id: 'group1',
            x: 50,
            y: 50,
            children: [
                {
                    id: 'shape1',
                    type: 'STENCIL',
                    x: 0,
                    y: 0,
                    width: 100,
                    height: 50,
                    data: '',
                    groupId: 'group1',
                },
                {
                    id: 'shape2',
                    type: 'IMAGE',
                    x: 120,
                    y: 0,
                    width: 80,
                    height: 80,
                    data: 'https://via.placeholder.com/80',
                    groupId: 'group1',
                },
            ],
        },
        {
            id: 'group2',
            x: 200,
            y: 150,
            children: [
                {
                    id: 'shape3',
                    type: 'HTML',
                    x: 0,
                    y: 0,
                    width: 120,
                    height: 60,
                    data: 'Sample Text',
                    groupId: 'group2',
                },
            ],
        },
    ]);

    const handleShapeUpdate = (shapeId: string, updates: Partial<Shape>) => {
        setGroups(prevGroups =>
            prevGroups.map(group => ({
                ...group,
                children: group.children.map(shape =>
                    shape.id === shapeId ? { ...shape, ...updates } : shape
                ),
            }))
        );
    };

    const addShape = (type: 'STENCIL' | 'IMAGE' | 'HTML') => {
        const newShape: Shape = {
            id: `shape${Date.now()}`,
            type,
            x: Math.random() * 200,
            y: Math.random() * 200,
            width: type === 'IMAGE' ? 80 : 100,
            height: type === 'IMAGE' ? 80 : 50,
            data: type === 'IMAGE' ? 'https://via.placeholder.com/80' : type === 'HTML' ? 'Sample HTML' : '',
            groupId: 'group1',
        };
        setGroups(prevGroups =>
            prevGroups.map(group =>
                group.id === 'group1'
                    ? { ...group, children: [...group.children, newShape] }
                    : group
            )
        );
    };

    return (
        <div>
            <h1>Konva Demo</h1>
            <Button onClick={() => addShape('STENCIL')}>Add Stencil</Button>
            <Button onClick={() => addShape('IMAGE')}>Add Image</Button>
            <Button onClick={() => addShape('HTML')}>Add HTML</Button>
            <Stage width={800} height={600}>
                <Layer>
                    <Rect width={50} height={50} fill="red" />
                    {groups.map(group => (
                        <GroupContainer
                            key={group.id}
                            group={group}
                            onShapeUpdate={handleShapeUpdate}
                        />
                    ))}
                </Layer>
            </Stage>
        </div>
    );
}