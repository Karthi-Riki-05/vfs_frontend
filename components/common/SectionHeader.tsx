"use client";

import React from 'react';

interface SectionHeaderProps {
  title: string;
  right?: React.ReactNode;
}

export default function SectionHeader({ title, right }: SectionHeaderProps) {
  return (
    <div
      className="section-header-responsive"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
      }}
    >
      <h2 className="section-label">{title}</h2>
      {right && (
        <div
          className="section-header-right"
          style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
        >
          {right}
        </div>
      )}
    </div>
  );
}
