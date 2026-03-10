"use client";

import React from 'react';
import { Input, Button, Progress, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import TemplateSection from '@/components/dashboard/TemplateSection';
import RecentDocuments from '@/components/dashboard/RecentDocuments';
import { useAuth } from '@/hooks/useAuth';
import { usePro } from '@/hooks/usePro';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/useMediaQuery';

const { Search } = Input;
const { Text } = Typography;

function AIBanner() {
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #3CB371 0%, #2E8B57 100%)',
        borderRadius: isMobile ? 12 : 16,
        padding: isMobile ? '20px 16px 18px' : '32px 32px 28px',
        marginBottom: isMobile ? 20 : 32,
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
          fontSize: isMobile ? 18 : 22,
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

function FlowUsageBar({ proFlows, isUnlimited, onBuyMore }: { proFlows: any; isUnlimited: boolean; onBuyMore: () => void }) {
  const isMobile = useIsMobile();

  if (!proFlows) return null;
  const isLimited = !isUnlimited && proFlows.max > 0;
  const percent = isLimited ? Math.round((proFlows.used / proFlows.max) * 100) : 0;
  const isNearLimit = percent >= 80;

  return (
    <div
      style={{
        background: '#FAFAFA',
        borderRadius: 12,
        border: '1px solid #E8E8E8',
        padding: isMobile ? '12px 16px' : '16px 20px',
        marginBottom: isMobile ? 20 : 32,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: isMobile ? 12 : 16,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 4 }}>
          <Text strong style={{ fontSize: 14 }}>FLOW USAGE</Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {isUnlimited
              ? `${proFlows.used} flows used (Unlimited)`
              : `${proFlows.used} / ${proFlows.max} flows used`
            }
          </Text>
        </div>
        {isLimited && (
          <Progress
            percent={percent}
            showInfo={false}
            strokeColor={isNearLimit ? '#FF4D4F' : '#3CB371'}
            trailColor="#E8E8E8"
            size="small"
          />
        )}
      </div>
      {!isUnlimited && (
        <Button
          type="primary"
          onClick={onBuyMore}
          block={isMobile}
          style={{
            backgroundColor: '#3CB371',
            borderColor: '#3CB371',
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          Buy More Flows
        </Button>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentApp, proFlows, status } = usePro();
  const router = useRouter();
  const isMobile = useIsMobile();

  const isProApp = currentApp === 'pro';
  const isUnlimited = status?.isUnlimited ?? false;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '0' : '0 24px' }}>
      <AIBanner />
      {isProApp && (
        <FlowUsageBar
          proFlows={proFlows}
          isUnlimited={isUnlimited}
          onBuyMore={() => router.push('/dashboard/subscription')}
        />
      )}
      <TemplateSection />
      <RecentDocuments />
    </div>
  );
}
