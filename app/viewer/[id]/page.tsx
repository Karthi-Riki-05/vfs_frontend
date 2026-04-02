"use client";

import React from 'react';
import EditorView from '@/components/flows/EditorView';
import { useParams } from 'next/navigation';

export default function FlowViewerPage() {
    const params = useParams();
    const id = params?.id as string;

    if (!id) {
        return <div>Invalid Flow ID</div>;
    }

    return (
        <div style={{ height: '100vh', width: '100vw' }}>
            <EditorView flowId={id} />
        </div>
    );
}