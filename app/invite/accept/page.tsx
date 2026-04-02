"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Button, Card, Spin, Typography, Tag, Result, Space } from 'antd';
import { TeamOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import api from '@/lib/axios';

const { Title, Text, Paragraph } = Typography;

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  const { data: session, status: sessionStatus } = useSession();

  const [pageStatus, setPageStatus] = useState<'loading' | 'valid' | 'expired' | 'accepted' | 'error'>('loading');
  const [invitation, setInvitation] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setPageStatus('error');
      setErrorMessage('No invitation token provided.');
      return;
    }

    fetch(`/api/invite/verify?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setInvitation(data.data);
          setPageStatus('valid');
        } else {
          const code = data.error?.code;
          if (code === 'EXPIRED') {
            setPageStatus('expired');
          } else if (code === 'ALREADY_ACCEPTED') {
            setPageStatus('accepted');
          } else {
            setPageStatus('error');
            setErrorMessage(data.error?.message || 'Invalid invitation.');
          }
        }
      })
      .catch(() => {
        setPageStatus('error');
        setErrorMessage('Failed to verify invitation.');
      });
  }, [token]);

  const handleAccept = useCallback(async () => {
    if (!token) return;
    setAccepting(true);
    setAcceptError(null);

    try {
      const res = await api.post('/invite/accept', { token });
      const data = res.data?.data || res.data;

      if (res.data?.success !== false) {
        // Redirect to teams page
        window.location.href = '/dashboard/teams';
      } else {
        setAcceptError(data?.error?.message || 'Failed to accept invitation.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to accept invitation.';
      setAcceptError(msg);
    } finally {
      setAccepting(false);
    }
  }, [token]);

  const isLoggedIn = sessionStatus === 'authenticated' && !!session?.user;
  const isLoadingSession = sessionStatus === 'loading';

  const brandColor = invitation?.appContext === 'pro' ? '#D97706' : '#3CB371';
  const appName = invitation?.appContext === 'pro' ? 'ValueChart Pro' : 'ValueChart';

  if (pageStatus === 'loading' || isLoadingSession) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
        <Spin size="large" tip="Verifying invitation..." />
      </div>
    );
  }

  if (pageStatus === 'expired') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
        <Result
          icon={<ClockCircleOutlined style={{ color: '#faad14' }} />}
          title="Invitation Expired"
          subTitle="This invitation has expired. Please ask the team admin to send a new one."
        />
      </div>
    );
  }

  if (pageStatus === 'accepted') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
        <Result
          icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
          title="Already Accepted"
          subTitle="This invitation has already been accepted."
          extra={
            <Button type="primary" onClick={() => window.location.href = '/dashboard/teams'} style={{ backgroundColor: '#3CB371', borderColor: '#3CB371' }}>
              Go to Teams
            </Button>
          }
        />
      </div>
    );
  }

  if (pageStatus === 'error') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
        <Result
          icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
          title="Invalid Invitation"
          subTitle={errorMessage || 'This invitation link is invalid or has been revoked.'}
        />
      </div>
    );
  }

  // Valid invitation
  const { teamName, inviterName, inviterEmail } = invitation;
  const redirectUrl = encodeURIComponent(`/invite/accept?token=${token}`);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: 24,
    }}>
      <Card
        style={{
          maxWidth: 480,
          width: '100%',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}
        bodyStyle={{ padding: 0 }}
      >
        {/* Header */}
        <div style={{
          backgroundColor: brandColor,
          padding: '32px 40px',
          textAlign: 'center',
        }}>
          <TeamOutlined style={{ fontSize: 40, color: '#fff', marginBottom: 12 }} />
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
            Team Invitation
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
            {appName}
          </Text>
        </div>

        {/* Body */}
        <div style={{ padding: '32px 40px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Title level={4} style={{ margin: '0 0 8px 0' }}>
              You've been invited!
            </Title>
            <Paragraph style={{ color: '#555', fontSize: 15, margin: 0 }}>
              <strong>{inviterName}</strong>
              {inviterEmail && <span> ({inviterEmail})</span>}
              {' '}invited you to join
            </Paragraph>
            <Title level={3} style={{ color: brandColor, margin: '8px 0' }}>
              &ldquo;{teamName}&rdquo;
            </Title>
          </div>

          {/* Info card */}
          <div style={{
            background: '#f8f9fa',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
            borderLeft: `4px solid ${brandColor}`,
          }}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>TEAM</Text>
                <div><Text strong>{teamName}</Text></div>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>INVITED BY</Text>
                <div><Text>{inviterName}</Text></div>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>INVITED EMAIL</Text>
                <div><Text strong>{invitation?.email}</Text></div>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>APP</Text>
                <div>
                  <Tag color={invitation?.appContext === 'pro' ? 'gold' : 'green'}>
                    {appName}
                  </Tag>
                </div>
              </div>
            </Space>
          </div>

          {acceptError && (
            <div style={{
              background: '#fff2f0',
              border: '1px solid #ffccc7',
              borderRadius: 8,
              padding: '8px 12px',
              marginBottom: 16,
              color: '#ff4d4f',
              fontSize: 13,
            }}>
              {acceptError}
            </div>
          )}

          {isLoggedIn ? (
            <div>
              <Paragraph style={{ color: '#666', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
                Logged in as <strong>{session?.user?.email}</strong>
              </Paragraph>
              {session?.user?.email?.toLowerCase() !== invitation?.email?.toLowerCase() && (
                <div style={{
                  background: '#fffbe6',
                  border: '1px solid #ffe58f',
                  borderRadius: 8,
                  padding: '8px 12px',
                  marginBottom: 12,
                  color: '#ad6800',
                  fontSize: 13,
                }}>
                  This invitation was sent to <strong>{invitation?.email}</strong>. Please log in with that email to accept.
                </div>
              )}
            <Button
              type="primary"
              size="large"
              block
              loading={accepting}
              onClick={handleAccept}
              style={{
                backgroundColor: brandColor,
                borderColor: brandColor,
                borderRadius: 8,
                height: 48,
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              Accept & Join Team
            </Button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <Paragraph style={{ color: '#666', marginBottom: 16 }}>
                Please log in or create an account to accept this invitation.
              </Paragraph>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Button
                  type="primary"
                  size="large"
                  block
                  onClick={() => window.location.href = `/login?callbackUrl=${redirectUrl}`}
                  style={{
                    backgroundColor: brandColor,
                    borderColor: brandColor,
                    borderRadius: 8,
                    height: 44,
                    fontWeight: 600,
                  }}
                >
                  Log In
                </Button>
                <Button
                  size="large"
                  block
                  onClick={() => window.location.href = `/register?callbackUrl=${redirectUrl}`}
                  style={{
                    borderRadius: 8,
                    height: 44,
                    fontWeight: 600,
                  }}
                >
                  Create Account
                </Button>
              </Space>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
        <Spin size="large" />
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}
