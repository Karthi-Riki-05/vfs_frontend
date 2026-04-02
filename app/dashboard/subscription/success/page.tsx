"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button, Spin, Typography, Card, Result } from 'antd';
import { CheckCircleFilled, CalendarOutlined, TeamOutlined, CrownOutlined } from '@ant-design/icons';
import { subscriptionsApi } from '@/api/subscriptions.api';

const { Text, Title } = Typography;

interface SubStatus {
  hasSubscription: boolean;
  plan: string | null;
  status: string | null;
  teamMemberLimit: number | null;
  currentPeriodEnd: string | null;
}

function SubscriptionSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams?.get('session_id') ?? null;
  const [status, setStatus] = useState<SubStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAndFetch = async () => {
      try {
        if (sessionId) {
          // Verify the checkout session and save subscription to DB
          const res = await subscriptionsApi.verifySession({ sessionId });
          setStatus(res.data?.data || res.data);
        } else {
          // Fallback: just fetch status
          const res = await subscriptionsApi.getStatus();
          setStatus(res.data?.data || res.data);
        }
      } catch {
        // will show generic success
      } finally {
        setLoading(false);
      }
    };

    verifyAndFetch();
  }, [sessionId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Confirming your subscription...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px' }}>
      <Result
        icon={<CheckCircleFilled style={{ color: '#3CB371', fontSize: 64 }} />}
        title="Subscription Activated!"
        subTitle="Your payment was successful. Welcome to Value Charts Pro."
      />

      {status?.hasSubscription && (
        <Card
          style={{
            borderRadius: 12,
            marginBottom: 32,
            border: '1px solid #E8E8E8',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CrownOutlined style={{ fontSize: 20, color: '#3CB371' }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Plan</Text>
                <div style={{ fontWeight: 600 }}>
                  {status.plan === 'yearly' ? 'Yearly' : 'Monthly'} Plan
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <TeamOutlined style={{ fontSize: 20, color: '#3CB371' }} />
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>Team Members</Text>
                <div style={{ fontWeight: 600 }}>
                  Up to {status.teamMemberLimit} members
                </div>
              </div>
            </div>

            {status.currentPeriodEnd && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CalendarOutlined style={{ fontSize: 20, color: '#3CB371' }} />
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>Next Billing Date</Text>
                  <div style={{ fontWeight: 600 }}>
                    {new Date(status.currentPeriodEnd).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      <div style={{ textAlign: 'center' }}>
        <Button
          type="primary"
          size="large"
          onClick={() => router.push('/dashboard')}
          style={{
            borderRadius: 10,
            height: 48,
            fontWeight: 600,
            backgroundColor: '#3CB371',
            borderColor: '#3CB371',
            paddingLeft: 40,
            paddingRight: 40,
          }}
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div style={{ textAlign: 'center', padding: 100 }}>
      <Spin size="large" />
      <div style={{ marginTop: 16 }}>
        <Text type="secondary">Confirming your subscription...</Text>
      </div>
    </div>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SubscriptionSuccessContent />
    </Suspense>
  );
}
