"use client";

import React from 'react';
import { Input, Button } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import TemplateSection from '@/components/dashboard/TemplateSection';
import RecentDocuments from '@/components/dashboard/RecentDocuments';
import { useAuth } from '@/hooks/useAuth';

const { Search } = Input;

function AIBanner() {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #3CB371 0%, #2E8B57 100%)',
        borderRadius: 16,
        padding: '32px 32px 28px',
        marginBottom: 32,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -20,
          right: 80,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }}
      />

      <h2
        style={{
          color: '#fff',
          fontSize: 22,
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
          margin: '0 0 16px 0',
        }}
      >
        What would you like to design today?
      </h2>

      <div style={{ display: 'flex', gap: 8, maxWidth: 560, position: 'relative', zIndex: 1 }}>
        <Search
          placeholder="Describe your flow..."
          size="large"
          enterButton={
            <Button
              type="primary"
              icon={<span style={{ fontSize: 18 }}>&#10024;</span>}
              style={{
                background: '#fff',
                color: '#3CB371',
                border: 'none',
                fontWeight: 600,
                borderRadius: '0 24px 24px 0',
              }}
            />
          }
          style={{ flex: 1 }}
          styles={{
            input: {
              borderRadius: '24px 0 0 24px',
              height: 44,
              border: 'none',
              fontSize: 14,
              fontFamily: 'Inter, sans-serif',
            },
          }}
          onSearch={(value) => {
            if (value.trim()) {
              console.log('AI prompt:', value);
            }
          }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
      <AIBanner />
      <TemplateSection />
      <RecentDocuments />
    </div>
  );
}
