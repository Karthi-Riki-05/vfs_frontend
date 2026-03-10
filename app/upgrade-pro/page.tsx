'use client';

import React, { useState } from 'react';
import { Button, Typography, message, Spin } from 'antd';
import { CheckCircleFilled, CrownOutlined } from '@ant-design/icons';
import { usePro } from '@/hooks/usePro';

const { Text, Title } = Typography;

const FEATURES = [
    '10 flow diagrams included',
    'Unlimited teams',
    'Unlimited chat',
    'All shapes & templates',
    'All export formats',
    'Priority support',
];

export default function UpgradeProPage() {
    const { hasPro, purchasePro, loading: proLoading } = usePro();
    const [purchasing, setPurchasing] = useState(false);

    const handlePurchase = async () => {
        setPurchasing(true);
        try {
            await purchasePro();
        } catch (err: any) {
            const msg = err?.response?.data?.error?.message || err?.response?.data?.error || 'Purchase failed';
            message.error(msg);
        } finally {
            setPurchasing(false);
        }
    };

    if (proLoading) {
        return (
            <div style={{ textAlign: 'center', padding: 100 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (hasPro) {
        return (
            <div style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center' }}>
                <CrownOutlined style={{ fontSize: 48, color: '#F59E0B' }} />
                <Title level={3} style={{ marginTop: 16 }}>You already have Pro!</Title>
                <Text type="secondary">You can switch to the Pro app from the sidebar.</Text>
            </div>
        );
    }

    return (
        <div
            style={{
                maxWidth: 500,
                margin: '40px auto',
                padding: '0 16px',
                textAlign: 'center',
            }}
        >
            <CrownOutlined style={{ fontSize: 48, color: '#F59E0B', marginBottom: 16 }} />
            <Title level={2} style={{ marginBottom: 4 }}>ValueChart Pro</Title>
            <Text type="secondary" style={{ fontSize: 16 }}>
                Unlock the full power of ValueChart
            </Text>

            <div
                style={{
                    background: '#FAFAFA',
                    borderRadius: 16,
                    border: '1px solid #E8E8E8',
                    padding: '32px 28px',
                    marginTop: 32,
                    textAlign: 'left',
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <span style={{ fontSize: 48, fontWeight: 800, color: '#1A1A2E' }}>$1.00</span>
                    <div>
                        <Text type="secondary">One-time payment. Yours forever.</Text>
                    </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                    {FEATURES.map((feature, idx) => (
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
                            <Text style={{ fontSize: 14, color: '#595959' }}>{feature}</Text>
                        </div>
                    ))}
                </div>

                <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 20 }}>
                    Need more than 10 flows? Purchase additional flows anytime.
                </Text>

                <Button
                    type="primary"
                    block
                    size="large"
                    loading={purchasing}
                    onClick={handlePurchase}
                    style={{
                        height: 50,
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 16,
                        backgroundColor: '#3CB371',
                        borderColor: '#3CB371',
                    }}
                >
                    Purchase Pro — $1.00
                </Button>
            </div>
        </div>
    );
}
