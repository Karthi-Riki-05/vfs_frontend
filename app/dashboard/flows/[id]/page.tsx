"use client";

import React from 'react';
import EditorView from '@/components/flows/EditorView';
import { useParams } from 'next/navigation';

export default function FlowEditorPage() {
    const params = useParams();
    const id = params?.id as string;

    if (!id) {
        return <div>Invalid Flow ID</div>;
    }

    return (
        <div style={{ height: '100%', margin: '-24px' }}>
            <EditorView flowId={id} />
        </div>
    );
}

