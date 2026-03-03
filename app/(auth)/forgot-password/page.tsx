"use client";

import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, message, Result } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { authApi } from '@/api/auth.api';
import Link from 'next/link';

const { Title, Text } = Typography;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await authApi.forgotPassword(values.email);
      setSent(true);
    } catch (err: any) {
      message.error(err.response?.data?.error?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Card style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <Result
          status="success"
          title="Check your email"
          subTitle="We've sent a password reset link to your email address. Please check your inbox."
          extra={<Link href="/login"><Button type="primary">Back to Login</Button></Link>}
        />
      </Card>
    );
  }

  return (
    <Card style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
        <Title level={3}>Forgot Password</Title>
        <Text type="secondary">Enter your email to receive a reset link</Text>
      </Space>

      <Form name="forgot-password" layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
        <Form.Item
          name="email"
          rules={[
            { required: true, message: 'Please enter your email' },
            { type: 'email', message: 'Please enter a valid email' },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="Email address" size="large" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            Send Reset Link
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center' }}>
        <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeftOutlined /> Back to Login
        </Link>
      </div>
    </Card>
  );
}
