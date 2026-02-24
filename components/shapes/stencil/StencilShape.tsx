"use client";

import React from 'react';
import { Rect } from 'react-konva';

interface StencilShapeProps {
    x: number;
    y: number;
    width: number;
    height: number;
    data: string; // SVG path data
    onDragEnd: (e: any) => void;
}

export default function StencilShape({ x, y, width, height, data, onDragEnd }: StencilShapeProps) {
    // For now, render as a rectangle. In future, parse SVG path and render accordingly.
    return (
        <Rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill="blue"
            stroke="black"
            strokeWidth={1}
            draggable
            onDragEnd={onDragEnd}
        />
    );
}