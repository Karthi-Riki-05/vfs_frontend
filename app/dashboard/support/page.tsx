"use client";

import React from 'react';
import { Input, Row, Col, Typography } from 'antd';
import {
  RocketOutlined,
  PartitionOutlined,
  AppstoreOutlined,
  TeamOutlined,
  CreditCardOutlined,
  ApiOutlined,
  ArrowRightOutlined,
  SearchOutlined,
  MailOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import SectionHeader from '@/components/common/SectionHeader';
import { useAuth } from '@/hooks/useAuth';

const { Text } = Typography;
const { Search } = Input;

const helpCards = [
  {
    icon: <RocketOutlined style={{ fontSize: 28, color: '#3CB371' }} />,
    title: 'Getting Started',
    description: 'Learn the basics of creating your first value chart and navigating the dashboard.',
  },
  {
    icon: <PartitionOutlined style={{ fontSize: 28, color: '#3CB371' }} />,
    title: 'Flow Editor',
    description: 'Master the flow editor with tips on connections, layouts, and keyboard shortcuts.',
  },
  {
    icon: <AppstoreOutlined style={{ fontSize: 28, color: '#3CB371' }} />,
    title: 'Shapes Library',
    description: 'Explore built-in shapes, upload custom shapes, and manage your shape collections.',
  },
  {
    icon: <TeamOutlined style={{ fontSize: 28, color: '#3CB371' }} />,
    title: 'Team Collaboration',
    description: 'Invite team members, manage roles, and collaborate on shared flows in real-time.',
  },
  {
    icon: <CreditCardOutlined style={{ fontSize: 28, color: '#3CB371' }} />,
    title: 'Billing & Plans',
    description: 'Understand pricing tiers, manage your subscription, and view billing history.',
  },
  {
    icon: <ApiOutlined style={{ fontSize: 28, color: '#3CB371' }} />,
    title: 'API & Integrations',
    description: 'Connect with external tools, use our REST API, and set up webhooks.',
  },
];

export default function SupportPage() {
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
      <SectionHeader title="GET SUPPORT" />

      {/* AI Help Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #3CB371 0%, #2E8B57 100%)',
          borderRadius: 16,
          padding: '40px 32px',
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
            fontSize: 28,
            fontWeight: 700,
            fontFamily: 'Inter, sans-serif',
            margin: '0 0 8px 0',
          }}
        >
          How can we help?
        </h2>
        <Text
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: 15,
            display: 'block',
            marginBottom: 20,
          }}
        >
          Search our knowledge base or browse topics below
        </Text>

        <div style={{ maxWidth: 520, position: 'relative', zIndex: 1 }}>
          <Search
            placeholder="Search for help articles..."
            size="large"
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            style={{ width: '100%' }}
            styles={{
              input: {
                borderRadius: '8px 0 0 8px',
                height: 48,
                border: 'none',
                fontSize: 15,
                fontFamily: 'Inter, sans-serif',
              },
            }}
            enterButton={
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                Search
              </span>
            }
            onSearch={(value) => {
              if (value.trim()) {
                console.log('Support search:', value);
              }
            }}
          />
        </div>
      </div>

      {/* Help Cards Grid */}
      <Row gutter={[20, 20]} style={{ marginBottom: 40 }}>
        {helpCards.map((card, idx) => (
          <Col xs={24} sm={12} md={8} key={idx}>
            <div
              style={{
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #F0F0F0',
                padding: '24px',
                cursor: 'pointer',
                transition: 'box-shadow 0.2s, transform 0.2s',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  '0 8px 24px rgba(0,0,0,0.08)';
                (e.currentTarget as HTMLDivElement).style.transform =
                  'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                (e.currentTarget as HTMLDivElement).style.transform = 'none';
              }}
            >
              <div style={{ marginBottom: 16 }}>{card.icon}</div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{ fontSize: 16, fontWeight: 600, color: '#1A1A2E' }}
                >
                  {card.title}
                </Text>
                <ArrowRightOutlined style={{ color: '#bfbfbf', fontSize: 14 }} />
              </div>
              <Text
                type="secondary"
                style={{ fontSize: 13, lineHeight: '1.6', flex: 1 }}
              >
                {card.description}
              </Text>
            </div>
          </Col>
        ))}
      </Row>

      {/* Contact Us Section */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #F0F0F0',
          padding: '32px',
        }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#1A1A2E',
            display: 'block',
            marginBottom: 4,
          }}
        >
          Contact Us
        </Text>
        <Text
          type="secondary"
          style={{ fontSize: 14, display: 'block', marginBottom: 24 }}
        >
          Can&apos;t find what you&apos;re looking for? Reach out directly.
        </Text>

        <Row gutter={[24, 16]}>
          <Col xs={24} sm={12}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '16px',
                borderRadius: 10,
                background: '#F9F9F9',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: 'rgba(60,179,113,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MailOutlined style={{ fontSize: 18, color: '#3CB371' }} />
              </div>
              <div>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1A1A2E',
                    display: 'block',
                  }}
                >
                  Email Support
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  support@valuecharts.com
                </Text>
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '16px',
                borderRadius: 10,
                background: '#F9F9F9',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: 'rgba(60,179,113,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <GlobalOutlined style={{ fontSize: 18, color: '#3CB371' }} />
              </div>
              <div>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#1A1A2E',
                    display: 'block',
                  }}
                >
                  Community
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Join our community forum
                </Text>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );
}
