"use client";

import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import axios from '@/lib/axios';

const { Title, Text } = Typography;

export default function RegisterForm() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // Use the Next.js proxy route (baseURL is /api)
            await axios.post('/auth/register', values);
            message.success("Registration successful! Please login.");
            router.push('/login');
        } catch (err: any) {
            message.error(err.response?.data?.error?.message || "Registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
                <Title level={3}>Create Account</Title>
                <Text type="secondary">Join Value Charts to start drawing</Text>
            </Space>

            <Form
                name="register"
                layout="vertical"
                onFinish={onFinish}
                style={{ marginTop: 24 }}
            >
                <Form.Item
                    name="name"
                    rules={[{ required: true, message: 'Please input your name!' }]}
                >
                    <Input prefix={<UserOutlined />} placeholder="Full Name" size="large" />
                </Form.Item>

                <Form.Item
                    name="email"
                    rules={[{ required: true, message: 'Please input your email!' }, { type: 'email' }]}
                >
                    <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
                </Form.Item>

                <Form.Item
                    name="password"
                    rules={[
                        { required: true, message: 'Please input your password!' },
                        { min: 8, message: 'Password must be at least 8 characters' }
                    ]}
                >
                    <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
                </Form.Item>

                <Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                        Register
                    </Button>
                </Form.Item>
            </Form>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Text type="secondary">
                    Already have an account? <a href="/login">Login here</a>
                </Text>
            </div>
        </Card>
    );
}
