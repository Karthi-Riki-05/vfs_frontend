"use client";

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import KonvaDemo to avoid SSR issues with canvas
const KonvaDemo = dynamic(() => import('@/components/KonvaDemo'), {
    ssr: false,
    loading: () => <div>Loading Konva Demo...</div>
});

export default function DemoPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <KonvaDemo />
        </Suspense>
    );
}