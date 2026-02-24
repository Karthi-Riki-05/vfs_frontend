"use client";

import React from 'react';
import TemplateSection from '@/components/dashboard/TemplateSection';
import RecentDocuments from '@/components/dashboard/RecentDocuments';

export default function DashboardPage() {
    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
            <TemplateSection />
            <RecentDocuments />
        </div>
    );
}
