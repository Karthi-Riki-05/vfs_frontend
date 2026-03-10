"use client";

import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, Divider, message } from 'antd';
import { GoogleOutlined, LinkedinOutlined, FacebookOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const { Title, Text } = Typography;

export default function LoginForm() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const onFinish = async (values: any) => {
        setLoading(true);
        const result = await signIn('credentials', {
            redirect: false,
            email: values.email,
            password: values.password,
        });

        setLoading(false);

        if (result?.error) {
            message.error("Login failed: " + result.error);
        } else {
            message.success("Logged in successfully!");
            router.push('/dashboard');
        }
    };

    return (
        <Card
            style={{
                width: '100%',
                maxWidth: 400,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
            styles={{ body: { padding: '24px 20px' } }}
        >
            <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                <Title level={3} style={{ marginBottom: 0 }}>Welcome Back</Title>
                <Text type="secondary">Login to manage your value charts</Text>
            </Space>

            <Form
                name="login"
                layout="vertical"
                onFinish={onFinish}
                style={{ marginTop: 24 }}
            >
                <Form.Item
                    name="email"
                    rules={[{ required: true, message: 'Please input your email!' }, { type: 'email' }]}
                >
                    <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
                </Form.Item>

                <Form.Item
                    name="password"
                    rules={[{ required: true, message: 'Please input your password!' }]}
                >
                    <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
                </Form.Item>

                <Form.Item>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                        <a href="/forgot-password">Forgot password?</a>
                    </div>
                    <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                        Log in
                    </Button>
                </Form.Item>
            </Form>

            <Divider plain>or login with</Divider>

            {/* Social buttons — stack vertically on mobile, row on desktop */}
            <div className="social-login-buttons">
                <Button
                    icon={<GoogleOutlined />}
                    onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
                    size="large"
                    block
                >
                    Google
                </Button>
                <Button
                    icon={<LinkedinOutlined style={{ color: '#0077B5' }} />}
                    onClick={() => signIn('linkedin', { callbackUrl: '/dashboard' })}
                    size="large"
                    block
                >
                    LinkedIn
                </Button>
                <Button
                    icon={<FacebookOutlined style={{ color: '#1877F2' }} />}
                    onClick={() => signIn('facebook', { callbackUrl: '/dashboard' })}
                    size="large"
                    block
                >
                    Facebook
                </Button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Text type="secondary">
                    Don't have an account? <a href="/register">Register now</a>
                </Text>
            </div>

            <style jsx global>{`
                .social-login-buttons {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                @media (min-width: 480px) {
                    .social-login-buttons {
                        flex-direction: row;
                        gap: 8px;
                    }
                    .social-login-buttons .ant-btn {
                        flex: 1;
                    }
                }
            `}</style>
        </Card>
    );
}
