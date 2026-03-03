"use client";

import React from 'react';

interface SectionHeaderProps {
  title: string;
  right?: React.ReactNode;
}

export default function SectionHeader({ title, right }: SectionHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    }}>
      <h2 className="section-label">{title}</h2>
      {right && <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{right}</div>}
    </div>
  );
}
