"use client";

import React from 'react';
import { Typography, Card, Row, Col, Button, List, Tag } from 'antd';
import { CheckCircleFilled } from '@ant-design/icons';


const { Title, Text, Paragraph } = Typography;

export default function SubscriptionPage() {
    const plans = [
        {
            name: 'Free',
            price: '$0',
            features: ['3 Flows', 'Basic Shapes', 'Community Support'],
            current: true,
        },
        {
            name: 'Pro',
            price: '$19',
            features: ['Unlimited Flows', 'Custom Shape Upload', 'Priority Support', 'AI Advanced Generation'],
            current: false,
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            features: ['SSO Enforcement', 'Dedicated Account Manager', 'Custom SLA', 'Advanced Analytics'],
            current: false,
        }
    ];

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Title level={2}>Subscription</Title>
            <Paragraph type="secondary" style={{ marginBottom: 32 }}>
                Manage your plan and billing information.
            </Paragraph>

            <Row gutter={24}>
                {plans.map((plan) => (
                    <Col xs={24} md={8} key={plan.name}>
                        <Card
                            hoverable
                            style={{
                                height: '100%',
                                border: plan.current ? '2px solid #1677ff' : '1px solid #f0f0f0',
                                position: 'relative'
                            }}
                        >
                            {plan.current && (
                                <Tag color="blue" style={{ position: 'absolute', top: 16, right: 16 }}>
                                    Current Plan
                                </Tag>
                            )}
                            <Title level={3}>{plan.name}</Title>
                            <div style={{ marginBottom: 24 }}>
                                <Text style={{ fontSize: 32, fontWeight: 'bold' }}>{plan.price}</Text>
                                <Text type="secondary"> /month</Text>
                            </div>

                            <List
                                dataSource={plan.features}
                                renderItem={(item) => (
                                    <List.Item style={{ border: 'none', padding: '8px 0' }}>
                                        <Space>
                                            <CheckCircleFilled style={{ color: '#52c41a' }} />
                                            <Text>{item}</Text>
                                        </Space>
                                    </List.Item>
                                )}
                                style={{ marginBottom: 24 }}
                            />

                            <Button
                                type={plan.current ? 'default' : 'primary'}
                                block
                                size="large"
                                disabled={plan.current}
                            >
                                {plan.current ? 'Manage' : 'Upgrade'}
                            </Button>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
}

import { Space } from 'antd';
