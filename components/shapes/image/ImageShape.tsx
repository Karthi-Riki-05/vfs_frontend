"use client";

import React, { useEffect, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';

interface ImageShapeProps {
    x: number;
    y: number;
    width: number;
    height: number;
    data: string; // Image URL
    onDragEnd: (e: any) => void;
}

export default function ImageShape({ x, y, width, height, data, onDragEnd }: ImageShapeProps) {
    const [image, setImage] = useState<HTMLImageElement | null>(null);

    useEffect(() => {
        const img = new window.Image();
        img.src = data;
        img.onload = () => {
            setImage(img);
        };
    }, [data]);

    return (
        <KonvaImage
            x={x}
            y={y}
            width={width}
            height={height}
            image={image ?? undefined}
            draggable
            onDragEnd={onDragEnd}
        />
    );
}