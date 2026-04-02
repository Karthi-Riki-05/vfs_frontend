"use client";

import React from 'react';
import { Group } from 'react-konva';
import StencilShape from '@/components/shapes/stencil/StencilShape';
import ImageShape from '@/components/shapes/image/ImageShape';
import HtmlShape from '@/components/shapes/html/HtmlShape';

interface Shape {
    id: string;
    type: 'STENCIL' | 'IMAGE' | 'HTML';
    x: number;
    y: number;
    width: number;
    height: number;
    data: string; // SVG path, URL, or HTML
    groupId: string;
}

interface GroupData {
    id: string;
    x: number;
    y: number;
    children: Shape[];
}

interface GroupContainerProps {
    group: GroupData;
    onShapeUpdate: (shapeId: string, updates: Partial<Shape>) => void;
}

export default function GroupContainer({ group, onShapeUpdate }: GroupContainerProps) {
    const handleDragEnd = (shapeId: string) => (e: any) => {
        onShapeUpdate(shapeId, {
            x: e.target.x(),
            y: e.target.y(),
        });
    };

    return (
        <Group x={group.x} y={group.y}>
            {group.children.map((shape) => {
                const commonProps = {
                    x: shape.x,
                    y: shape.y,
                    width: shape.width,
                    height: shape.height,
                    onDragEnd: handleDragEnd(shape.id),
                };

                if (shape.type === 'STENCIL') {
                    return (
                        <StencilShape
                            key={shape.id}
                            {...commonProps}
                            data={shape.data}
                        />
                    );
                } else if (shape.type === 'IMAGE') {
                    return (
                        <ImageShape
                            key={shape.id}
                            {...commonProps}
                            data={shape.data}
                        />
                    );
                } else if (shape.type === 'HTML') {
                    return (
                        <HtmlShape
                            key={shape.id}
                            {...commonProps}
                            data={shape.data}
                        />
                    );
                }
                return null;
            })}
        </Group>
    );
}