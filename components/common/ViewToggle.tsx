"use client";

import React from 'react';
import { Button } from 'antd';
import { AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons';

interface ViewToggleProps {
  view: 'grid' | 'list';
  onChange: (view: 'grid' | 'list') => void;
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <Button.Group>
      <Button
        type={view === 'grid' ? 'primary' : 'default'}
        icon={<AppstoreOutlined />}
        onClick={() => onChange('grid')}
        style={{ borderRadius: '8px 0 0 8px' }}
      />
      <Button
        type={view === 'list' ? 'primary' : 'default'}
        icon={<UnorderedListOutlined />}
        onClick={() => onChange('list')}
        style={{ borderRadius: '0 8px 8px 0' }}
      />
    </Button.Group>
  );
}
