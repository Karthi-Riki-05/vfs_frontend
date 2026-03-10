'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Button, Result, Spin } from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { proApi } from '@/api/pro.api';

export default function UpgradeProSuccessPage() {
    const searchParams = useSearchParams();
    const sessionId = searchParams?.get('session_id') ?? null;
    const [verified, setVerified] = useState(false);
    const [error, setError] = useState(false);
    const pollRef = useRef(false);
    const { update: updateSession } = useSession();

    useEffect(() => {
        if (!sessionId) {
            setError(true);
            return;
        }

        if (pollRef.current) return;
        pollRef.current = true;

        let attempts = 0;
        const maxAttempts = 15;
        let cancelled = false;

        const checkStatus = async () => {
            if (cancelled) return;
            attempts++;

            try {
                const verifyRes = await proApi.verifyPurchase(sessionId);
                const verifyData = verifyRes.data?.data || verifyRes.data;

                if (verifyData?.verified || verifyData?.alreadyActive) {
                    setVerified(true);
                    // Refresh the session to pick up hasPro and currentVersion
                    await updateSession();
                    setTimeout(() => {
                        if (!cancelled) {
                            window.location.href = '/dashboard';
                        }
                    }, 2000);
                    return;
                }
            } catch {
                // Don't give up — webhook might still fire
            }

            // Fallback: check app-status directly
            try {
                const statusRes = await proApi.getAppStatus();
                const statusData = statusRes.data?.data || statusRes.data;

                if (statusData?.hasPro) {
                    setVerified(true);
                    await updateSession();
                    setTimeout(() => {
                        if (!cancelled) {
                            window.location.href = '/dashboard';
                        }
                    }, 2000);
                    return;
                }
            } catch {
                // Continue polling
            }

            if (attempts < maxAttempts && !cancelled) {
                setTimeout(checkStatus, 2000);
            } else if (!cancelled) {
                setError(true);
            }
        };

        checkStatus();

        return () => { cancelled = true; };
    }, [sessionId, updateSession]);

    if (error) {
        return (
            <div style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center' }}>
                <Result
                    icon={<CrownOutlined style={{ color: '#F59E0B', fontSize: 64 }} />}
                    title="Payment received!"
                    subTitle="Activation is taking a moment. Please refresh or try again shortly."
                    extra={
                        <Button
                            type="primary"
                            size="large"
                            onClick={() => window.location.reload()}
                            style={{
                                backgroundColor: '#3CB371',
                                borderColor: '#3CB371',
                                borderRadius: 10,
                                fontWeight: 600,
                            }}
                        >
                            Refresh
                        </Button>
                    }
                />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center' }}>
            <Result
                icon={<CrownOutlined style={{ color: '#F59E0B', fontSize: 64 }} />}
                title="Welcome to ValueChart Pro!"
                subTitle={
                    verified
                        ? 'Your Pro access is active! Redirecting to dashboard...'
                        : 'Activating your Pro access...'
                }
                extra={
                    verified ? (
                        <Button
                            type="primary"
                            size="large"
                            onClick={() => { window.location.href = '/dashboard'; }}
                            style={{
                                backgroundColor: '#3CB371',
                                borderColor: '#3CB371',
                                borderRadius: 10,
                                fontWeight: 600,
                            }}
                        >
                            Go to Dashboard
                        </Button>
                    ) : (
                        <Spin size="large" />
                    )
                }
            />
        </div>
    );
}
