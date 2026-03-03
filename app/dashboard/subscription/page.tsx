"use client";

import React from 'react';
import { Row, Col, Button, Tag, Spin, Typography } from 'antd';
import { CheckCircleFilled, CrownOutlined } from '@ant-design/icons';
import SectionHeader from '@/components/common/SectionHeader';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';

const { Text } = Typography;

const fallbackPlans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    billing: 'forever',
    recommended: false,
    features: ['3 Flows', 'Basic Shapes', 'Community Support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 1900,
    billing: 'month',
    recommended: true,
    features: [
      'Unlimited Flows',
      'Custom Shape Upload',
      'Priority Support',
      'AI Advanced Generation',
      'Team Collaboration',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 0,
    billing: 'custom',
    recommended: false,
    features: [
      'SSO Enforcement',
      'Dedicated Account Manager',
      'Custom SLA',
      'Advanced Analytics',
      'Unlimited Teams',
    ],
  },
];

export default function SubscriptionPage() {
  const { user } = useAuth();
  const { subscription, plans: apiPlans, loading, subscribe } = useSubscription();
  const plans = apiPlans.length > 0 ? apiPlans : fallbackPlans;
  const currentPlanId = subscription?.planId || subscription?.plan?.id;

  const handleSubscribe = async (planId: string) => {
    await subscribe(planId);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
      <SectionHeader title="PLAN & PRICING" />

      {subscription && (
        <div
          style={{
            background: 'linear-gradient(135deg, #3CB371 0%, #2E8B57 100%)',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
              Your current plan
            </Text>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>
              {subscription.plan?.name || 'Active Subscription'}
            </div>
          </div>
          <Tag
            color="white"
            style={{
              color: '#3CB371',
              fontWeight: 600,
              fontSize: 13,
              padding: '4px 16px',
              borderRadius: 20,
            }}
          >
            Active
          </Tag>
        </div>
      )}

      <Row gutter={[24, 24]} justify="center">
        {plans.map((plan: any) => {
          const isCurrent = plan.id === currentPlanId;
          const isRecommended = plan.recommended || plan.name === 'Pro';
          const price = typeof plan.price === 'number' ? plan.price : 0;
          const displayPrice =
            plan.name === 'Enterprise'
              ? 'Custom'
              : price === 0
                ? '$0'
                : `$${(price / 100).toFixed(0)}`;
          const billingLabel =
            plan.billing === 'custom'
              ? ''
              : plan.billing === 'forever'
                ? '/forever'
                : `/${plan.billing || 'month'}`;
          const rawFeatures = plan.features;
          const features: string[] = Array.isArray(rawFeatures)
            ? rawFeatures.map((f: any) => (typeof f === 'string' ? f : f.name || String(f)))
            : typeof rawFeatures === 'string'
              ? [rawFeatures]
              : [];

          return (
            <Col xs={24} md={8} key={plan.id}>
              <div
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  border: isRecommended
                    ? '2px solid #3CB371'
                    : '1px solid #F0F0F0',
                  padding: '32px 24px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  transition: 'box-shadow 0.2s',
                }}
              >
                {isRecommended && (
                  <Tag
                    color="#3CB371"
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontWeight: 600,
                      fontSize: 12,
                      padding: '2px 16px',
                      borderRadius: 20,
                    }}
                  >
                    Recommended
                  </Tag>
                )}

                {isCurrent && (
                  <Tag
                    color="#3CB371"
                    style={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      fontWeight: 600,
                      borderRadius: 20,
                    }}
                  >
                    Current Plan
                  </Tag>
                )}

                <div style={{ marginBottom: 8 }}>
                  <CrownOutlined
                    style={{ fontSize: 20, color: '#3CB371', marginRight: 8 }}
                  />
                  <Text
                    style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E' }}
                  >
                    {plan.name}
                  </Text>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <span
                    style={{
                      fontSize: 40,
                      fontWeight: 800,
                      color: '#1A1A2E',
                      lineHeight: 1,
                    }}
                  >
                    {displayPrice}
                  </span>
                  {billingLabel && (
                    <Text
                      type="secondary"
                      style={{ fontSize: 14, marginLeft: 4 }}
                    >
                      {billingLabel}
                    </Text>
                  )}
                </div>

                <div style={{ flex: 1, marginBottom: 24 }}>
                  {features.map((feature: string, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 0',
                      }}
                    >
                      <CheckCircleFilled style={{ color: '#3CB371', fontSize: 16 }} />
                      <Text style={{ fontSize: 14, color: '#595959' }}>
                        {feature}
                      </Text>
                    </div>
                  ))}
                </div>

                <Button
                  type={isCurrent ? 'default' : 'primary'}
                  block
                  size="large"
                  disabled={isCurrent}
                  onClick={() =>
                    !isCurrent && handleSubscribe(plan.id)
                  }
                  style={{
                    borderRadius: 8,
                    height: 48,
                    fontWeight: 600,
                    fontSize: 15,
                    ...(isCurrent
                      ? {}
                      : {
                          backgroundColor: '#3CB371',
                          borderColor: '#3CB371',
                        }),
                  }}
                >
                  {isCurrent
                    ? 'Current Plan'
                    : plan.name === 'Enterprise'
                      ? 'Contact Sales'
                      : 'Upgrade'}
                </Button>
              </div>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
