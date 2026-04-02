"use client";

import React from 'react';
import { Text, Rect } from 'react-konva';

interface HtmlShapeProps {
    x: number;
    y: number;
    width: number;
    height: number;
    data: string; // HTML string
    onDragEnd: (e: any) => void;
}

export default function HtmlShape({ x, y, width, height, data, onDragEnd }: HtmlShapeProps) {
    // For now, render as text. For full HTML rendering, would need to use portals or overlays.
    // This is a placeholder - actual HTML rendering in Konva requires advanced techniques.
    return (
        <Rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill="white"
            stroke="gray"
            strokeWidth={1}
            draggable
            onDragEnd={onDragEnd}
        />
    );
}