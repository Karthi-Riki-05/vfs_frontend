"use client";

import React from 'react';
import { Typography, message } from 'antd';
import {
  ApartmentOutlined,
  NodeIndexOutlined,
  DeploymentUnitOutlined,
  DatabaseOutlined,
  BlockOutlined,
  LayoutOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';

const { Text } = Typography;

const templates = [
  { title: 'Flowchart', icon: <DeploymentUnitOutlined />, color: '#3CB371', bg: '#E8F5E9' },
  { title: 'Mind Map', icon: <NodeIndexOutlined />, color: '#7C4DFF', bg: '#F3E5F5' },
  { title: 'Org Chart', icon: <ApartmentOutlined />, color: '#FF9800', bg: '#FFF3E0' },
  { title: 'ER Diagram', icon: <DatabaseOutlined />, color: '#F44336', bg: '#FFEBEE' },
  { title: 'SWOT', icon: <BlockOutlined />, color: '#2196F3', bg: '#E3F2FD' },
  { title: 'Wireframe', icon: <LayoutOutlined />, color: '#607D8B', bg: '#E0F7FA' },
];

export default function TemplateSection() {
  const router = useRouter();

  const handleCreateFlow = async (templateName: string) => {
    try {
      const response = await axios.post('/flows', {
        name: `Untitled ${templateName}`,
        description: `New ${templateName} created from dashboard`,
      });
      const newFlow = response.data?.data || response.data;
      if (!newFlow?.id) throw new Error('No flow ID returned');
      window.open(`/dashboard/flows/${newFlow.id}`, '_blank');
    } catch (error) {
      console.error('Failed to create flow:', error);
      message.error('Failed to create flow');
    }
  };

  return (
    <div style={{ marginBottom: 36 }}>
      <Text
        strong
        style={{
          fontSize: 12,
          color: '#8C8C8C',
          textTransform: 'uppercase',
          letterSpacing: 1,
          display: 'block',
          marginBottom: 14,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        TEMPLATES
      </Text>

      <div
        className="template-scroll"
        style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          paddingBottom: 4,
        }}
      >
        {templates.map((template, index) => (
          <div
            key={index}
            className="template-card"
            onClick={() => handleCreateFlow(template.title)}
            style={{
              minWidth: 140,
              width: 140,
              height: 100,
              borderRadius: 12,
              background: template.bg,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div
              style={{
                fontSize: 28,
                color: template.color,
                marginBottom: 8,
                lineHeight: 1,
              }}
            >
              {template.icon}
            </div>
            <Text
              strong
              style={{
                fontSize: 13,
                color: '#1A1A2E',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {template.title}
            </Text>
          </div>
        ))}
      </div>

      <style jsx global>{`
        .template-scroll::-webkit-scrollbar {
          display: none;
        }
        .template-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
