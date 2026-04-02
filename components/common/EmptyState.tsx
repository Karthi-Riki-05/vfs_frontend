"use client";

import React from 'react';
import { Empty, Button } from 'antd';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export default function EmptyState({ title, description, actionText, onAction, icon }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 24px',
    }}>
      <Empty
        image={icon || Empty.PRESENTED_IMAGE_SIMPLE}
        description={null}
      />
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1A1A2E', marginTop: 16, marginBottom: 8 }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: 14, color: '#8C8C8C', marginBottom: 24, textAlign: 'center', maxWidth: 400 }}>
          {description}
        </p>
      )}
      {actionText && onAction && (
        <Button type="primary" onClick={onAction} style={{ borderRadius: 8 }}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
