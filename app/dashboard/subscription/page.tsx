"use client";

import React, { useState, useEffect } from 'react';
import { Button, Select, Spin, Typography, Tag, Modal, message, Card, Progress, Table } from 'antd';
import { CheckCircleFilled, CrownOutlined, ThunderboltOutlined } from '@ant-design/icons';
import SectionHeader from '@/components/common/SectionHeader';
import { useSubscription } from '@/hooks/useSubscription';
import { usePro } from '@/hooks/usePro';
import { proApi } from '@/api/pro.api';
import { useRouter, useSearchParams } from 'next/navigation';

const { Text, Title } = Typography;

const TEAM_OPTIONS = [5, 10, 15, 20, 25, 30];

const PRICING = {
  monthly: { perUser: 1.0, originalPerUser: 5.0 },
  yearly: { perUser: 7.2, originalPerUser: 36.0 },
};

const FEATURES = [
  'Unlimited flows',
  'All shapes library',
  'Export all formats',
  'Team collaboration',
  'Admin dashboard',
  'Team management',
  'Priority support',
  'AI diagram generation',
];

interface ProSubStatus {
  plan: string;
  originalPrice: string;
  isUnlimited: boolean;
  flows: {
    free: number;
    purchased: number;
    total: number;
    used: number;
    remaining: number;
  };
  purchases: Array<{
    id: string;
    flowCount: number;
    amountCents: number;
    createdAt: string;
  }>;
}

function ProSubscriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [proSubStatus, setProSubStatus] = useState<ProSubStatus | null>(null);
  const [proSubLoading, setProSubLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    const purchased = searchParams?.get('purchased');
    if (purchased) {
      const label = purchased === 'unlimited' ? 'Unlimited flows' : '50 flows';
      message.success(`${label} purchased successfully!`);
      router.replace('/dashboard/subscription');
    }
  }, [searchParams, router]);

  useEffect(() => {
    fetchProSubStatus();
  }, []);

  const fetchProSubStatus = async () => {
    try {
      const res = await proApi.getSubscriptionStatus();
      const data = res.data?.data || res.data;
      setProSubStatus(data);
    } catch {
      message.error('Failed to load subscription status');
    } finally {
      setProSubLoading(false);
    }
  };

  const handlePurchase = async (flowPackage: '50' | 'unlimited') => {
    setPurchasing(flowPackage);
    try {
      const res = await proApi.buyFlows(flowPackage);
      const data = res.data?.data || res.data;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Purchase failed';
      message.error(msg);
      setPurchasing(null);
    }
  };

  if (proSubLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!proSubStatus) return null;

  const { flows, isUnlimited } = proSubStatus;
  const usagePercent = isUnlimited || flows.total <= 0 ? 0 : Math.round((flows.used / flows.total) * 100);

  const purchaseColumns = [
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val: string) => new Date(val).toLocaleDateString(),
    },
    {
      title: 'Flows',
      dataIndex: 'flowCount',
      key: 'flowCount',
      render: (val: number) => val === -1 ? 'Unlimited' : val,
    },
    {
      title: 'Amount',
      dataIndex: 'amountCents',
      key: 'amountCents',
      render: (val: number) => `$${(val / 100).toFixed(2)}`,
    },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px' }}>
      <Title level={3} style={{ marginBottom: 24, fontSize: 20 }}>
        <CrownOutlined style={{ color: '#F59E0B', marginRight: 8 }} />
        Pro Subscription
      </Title>

      <Card style={{ marginBottom: 24, borderRadius: 12 }} styles={{ body: { padding: '16px 20px' } }}>
        <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 16 }}>Current Plan</Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, marginBottom: 16 }}>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>PLAN</Text>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Pro</div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>PRICE</Text>
            <div style={{ fontWeight: 600, fontSize: 15 }}>$1 (one-time)</div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>TOTAL FLOWS</Text>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{isUnlimited ? 'Unlimited' : flows.total}</div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>FLOWS USED</Text>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{flows.used}</div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>REMAINING</Text>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{isUnlimited ? 'Unlimited' : flows.remaining}</div>
          </div>
        </div>

        {!isUnlimited && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Usage</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{usagePercent}%</Text>
            </div>
            <Progress
              percent={usagePercent}
              showInfo={false}
              strokeColor={usagePercent >= 80 ? '#FF4D4F' : '#3CB371'}
              trailColor="#E8E8E8"
            />
          </div>
        )}

        {isUnlimited && (
          <div
            style={{
              background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)',
              borderRadius: 8,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontWeight: 600,
              color: '#D97706',
            }}
          >
            <span style={{ fontSize: 20 }}>&#9854;</span>
            Unlimited Flows Active
          </div>
        )}
      </Card>

      {!isUnlimited && (
        <Card style={{ marginBottom: 24, borderRadius: 12 }} bodyStyle={{ padding: '24px 28px' }}>
          <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 20 }}>Add More Flows</Text>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220, border: '1px solid #E8E8E8', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <Title level={4} style={{ margin: '0 0 4px' }}>50 Flows</Title>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#3CB371', marginBottom: 12 }}>$5.00</div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Added to your current balance</Text>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 20 }}>
                Current: {flows.total} &rarr; After: {flows.total + 50}
              </Text>
              <Button
                type="primary"
                block
                size="large"
                loading={purchasing === '50'}
                disabled={!!purchasing}
                onClick={() => handlePurchase('50')}
                style={{ backgroundColor: '#3CB371', borderColor: '#3CB371', borderRadius: 8, fontWeight: 600, height: 44 }}
              >
                Purchase &mdash; $5
              </Button>
            </div>
            <div style={{ flex: 1, minWidth: 220, border: '2px solid #F59E0B', borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', background: '#FFFBEB' }}>
              <div style={{ position: 'absolute', top: -12, background: '#F59E0B', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 12px', borderRadius: 20, letterSpacing: 0.5 }}>BEST VALUE</div>
              <Title level={4} style={{ margin: '8px 0 4px' }}>Unlimited Flows</Title>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#F59E0B', marginBottom: 12 }}>$10.00</div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Never worry about flow limits again</Text>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 20 }}>One-time payment, unlimited forever</Text>
              <Button
                type="primary"
                block
                size="large"
                loading={purchasing === 'unlimited'}
                disabled={!!purchasing}
                onClick={() => handlePurchase('unlimited')}
                style={{ backgroundColor: '#F59E0B', borderColor: '#F59E0B', borderRadius: 8, fontWeight: 600, height: 44 }}
              >
                Purchase &mdash; $10
              </Button>
            </div>
          </div>
        </Card>
      )}

      {proSubStatus.purchases && proSubStatus.purchases.length > 0 && (
        <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: '24px 28px' }}>
          <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 16 }}>Purchase History</Text>
          <Table dataSource={proSubStatus.purchases} columns={purchaseColumns} rowKey="id" pagination={false} size="small" />
        </Card>
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  const { currentApp } = usePro();
  const { status, loading, createCheckout, changePlan, cancel, activateNow, cancelScheduledChange } = useSubscription();
  const [monthlyMembers, setMonthlyMembers] = useState(5);
  const [yearlyMembers, setYearlyMembers] = useState(5);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handlePurchase = async (plan: 'monthly' | 'yearly') => {
    const teamMembers = plan === 'monthly' ? monthlyMembers : yearlyMembers;
    setCheckoutLoading(plan);
    try {
      if (status?.hasSubscription && status.status === 'active') {
        await changePlan(plan, teamMembers);
      } else {
        await createCheckout(plan, teamMembers);
      }
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleCancel = () => {
    Modal.confirm({
      title: 'Cancel Subscription',
      content: 'Your subscription will remain active until the end of the current billing period. Are you sure?',
      okText: 'Yes, Cancel',
      okButtonProps: { danger: true },
      onOk: () => cancel(),
    });
  };

  const handleActivateNow = () => {
    Modal.confirm({
      title: 'Activate Plan Change Now',
      content: 'This will cancel your current monthly subscription and redirect you to checkout for the yearly plan. Continue?',
      okText: 'Yes, Activate Now',
      onOk: () => activateNow(),
    });
  };

  const handleCancelScheduled = () => {
    Modal.confirm({
      title: 'Cancel Scheduled Change',
      content: 'This will cancel your scheduled plan change. Your current plan will remain unchanged.',
      okText: 'Yes, Cancel Change',
      okButtonProps: { danger: true },
      onOk: () => cancelScheduledChange(),
    });
  };

  // Pro app: show Pro subscription content instead of Team plans
  if (currentApp === 'pro') {
    return <ProSubscriptionContent />;
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  const isActivePlan = (plan: 'monthly' | 'yearly') =>
    status?.hasSubscription && status.status === 'active' && status.plan === plan;

  const isDowngradeBlocked = (plan: 'monthly' | 'yearly') =>
    status?.hasSubscription && status.status === 'active' && status.plan === 'yearly' && plan === 'monthly';

  const isScheduledFor = (plan: 'monthly' | 'yearly') =>
    !!status?.scheduledChange && status.scheduledChange.plan === plan;

  const getButtonLabel = (plan: 'monthly' | 'yearly') => {
    if (!status?.hasSubscription || status.status !== 'active') return 'Purchase Now';
    if (status.plan === plan) return 'Current Plan';
    if (isDowngradeBlocked(plan)) return 'Not Available';
    if (isScheduledFor(plan)) return 'Scheduled';
    return 'Change Plan';
  };

  const renderPlanColumn = (plan: 'monthly' | 'yearly') => {
    const members = plan === 'monthly' ? monthlyMembers : yearlyMembers;
    const setMembers = plan === 'monthly' ? setMonthlyMembers : setYearlyMembers;
    const pricing = PRICING[plan];

    const currentPrice = plan === 'monthly'
      ? members * pricing.perUser
      : members * pricing.perUser;
    const originalPrice = plan === 'monthly'
      ? members * pricing.originalPerUser
      : members * pricing.originalPerUser;

    const priceLabel = plan === 'monthly'
      ? `$${currentPrice.toFixed(0)}/month`
      : `$${currentPrice.toFixed(2)}/year`;
    const originalLabel = plan === 'monthly'
      ? `$${originalPrice.toFixed(0)}/month`
      : `$${originalPrice.toFixed(0)}/year`;

    const isCurrent = isActivePlan(plan);
    const buttonLabel = getButtonLabel(plan);

    return (
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          border: isCurrent ? '2px solid #3CB371' : '1px solid #E8E8E8',
          padding: '0',
          overflow: 'hidden',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isCurrent ? '0 0 0 3px rgba(60,179,113,0.12)' : '0 2px 8px rgba(0,0,0,0.06)',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: plan === 'yearly'
              ? 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)'
              : 'linear-gradient(135deg, #F8F9FA 0%, #E9ECEF 100%)',
            padding: '28px 24px 24px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <CrownOutlined style={{ fontSize: 18, color: plan === 'yearly' ? '#FFD700' : '#3CB371' }} />
            <Text
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: plan === 'yearly' ? '#fff' : '#1A1A2E',
              }}
            >
              {plan === 'monthly' ? 'Monthly Plan' : 'Yearly Plan'}
            </Text>
          </div>

          <Tag
            color="#FF4D4F"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              fontWeight: 700,
              fontSize: 12,
              padding: '2px 10px',
              borderRadius: 20,
              border: 'none',
            }}
          >
            80% OFF
          </Tag>

          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ThunderboltOutlined style={{ color: plan === 'yearly' ? '#FFD700' : '#3CB371', fontSize: 14 }} />
            <Text style={{ fontSize: 13, color: plan === 'yearly' ? 'rgba(255,255,255,0.7)' : '#8C8C8C' }}>
              Up to 100 Users
            </Text>
          </div>

          {isCurrent && (
            <Tag
              color="#3CB371"
              style={{
                position: 'absolute',
                bottom: -12,
                left: '50%',
                transform: 'translateX(-50%)',
                fontWeight: 600,
                fontSize: 12,
                padding: '2px 16px',
                borderRadius: 20,
                zIndex: 1,
              }}
            >
              Current Plan
            </Tag>
          )}
        </div>

        {/* Pricing + Dropdown */}
        <div style={{ padding: '28px 24px 16px' }}>
          <div style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: '#8C8C8C', display: 'block', marginBottom: 4 }}>
              Team Members
            </Text>
            <Select
              value={members}
              onChange={setMembers}
              style={{ width: '100%' }}
              size="large"
              options={TEAM_OPTIONS.map(n => ({ label: `${n} Members`, value: n }))}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <Text
              delete
              style={{ fontSize: 16, color: '#BFBFBF', marginRight: 8 }}
            >
              {originalLabel}
            </Text>
            <span style={{ fontSize: 32, fontWeight: 800, color: '#1A1A2E', lineHeight: 1 }}>
              {priceLabel}
            </span>
          </div>

          <div style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 12, color: '#8C8C8C' }}>
              {plan === 'monthly'
                ? `$${pricing.perUser.toFixed(2)}/user/month`
                : `$${pricing.perUser.toFixed(2)}/user/year`}
            </Text>
          </div>
        </div>

        {/* Features */}
        <div style={{ padding: '0 24px', flex: 1 }}>
          {FEATURES.map((feature, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 0',
              }}
            >
              <CheckCircleFilled style={{ color: '#3CB371', fontSize: 15 }} />
              <Text style={{ fontSize: 13, color: '#595959' }}>{feature}</Text>
            </div>
          ))}
        </div>

        {/* Button */}
        <div style={{ padding: '20px 24px 28px' }}>
          <Button
            type={isCurrent ? 'default' : 'primary'}
            block
            size="large"
            disabled={isCurrent || isDowngradeBlocked(plan) || isScheduledFor(plan) || checkoutLoading !== null}
            loading={checkoutLoading === plan}
            onClick={() => handlePurchase(plan)}
            style={{
              borderRadius: 10,
              height: 50,
              fontWeight: 700,
              fontSize: 15,
              ...(isCurrent
                ? {}
                : {
                    backgroundColor: '#3CB371',
                    borderColor: '#3CB371',
                  }),
            }}
          >
            {buttonLabel}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px' }}>
      <SectionHeader title="PLAN & PRICING" />

      {/* Active subscription banner */}
      {status?.hasSubscription && status.status === 'active' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #3CB371 0%, #2E8B57 100%)',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
              Your current plan
            </Text>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>
              {status.plan === 'yearly' ? 'Yearly' : 'Monthly'} Plan — {status.teamMemberLimit} Members
            </div>
            {status.currentPeriodEnd && (
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                {status.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on{' '}
                {new Date(status.currentPeriodEnd).toLocaleDateString()}
              </Text>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
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
              {status.cancelAtPeriodEnd ? 'Cancelling' : 'Active'}
            </Tag>
          </div>
        </div>
      )}

      {/* Scheduled change banner */}
      {status?.scheduledChange && (
        <div
          style={{
            background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
              Scheduled Plan Change
            </Text>
            <div style={{ color: '#FFD700', fontSize: 18, fontWeight: 700 }}>
              Yearly Plan — {status.scheduledChange.teamMembers} Members
            </div>
            {status.scheduledChange.activationDate && (
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                Activates on {new Date(status.scheduledChange.activationDate).toLocaleDateString()}
              </Text>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              type="primary"
              onClick={handleActivateNow}
              style={{ borderRadius: 20, fontWeight: 600 }}
            >
              Activate Now
            </Button>
            <Button
              danger
              onClick={handleCancelScheduled}
              style={{ borderRadius: 20, fontWeight: 600 }}
            >
              Cancel Change
            </Button>
          </div>
        </div>
      )}

      {/* Comparison table */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
          marginBottom: 32,
        }}
      >
        {renderPlanColumn('monthly')}
        {renderPlanColumn('yearly')}
      </div>

      {/* Cancel link */}
      {status?.hasSubscription && status.status === 'active' && !status.cancelAtPeriodEnd && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Button type="link" danger onClick={handleCancel}>
            Cancel Subscription
          </Button>
        </div>
      )}
    </div>
  );
}
