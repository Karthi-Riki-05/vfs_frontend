"use client";

import React, { useState, Suspense } from 'react';
import { Form, Input, Button, Card, Typography, Space, message, Result, Spin } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { authApi } from '@/api/auth.api';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const { Title, Text } = Typography;

function ResetPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const onFinish = async (values: any) => {
    if (!token) {
      message.error('Invalid or missing reset token');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(token, values.password);
      setSuccess(true);
    } catch (err: any) {
      message.error(err.response?.data?.error?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Card style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <Result
          status="success"
          title="Password Reset Successfully"
          subTitle="You can now log in with your new password."
          extra={<Link href="/login"><Button type="primary">Go to Login</Button></Link>}
        />
      </Card>
    );
  }

  return (
    <Card style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <Space direction="vertical" style={{ width: '100%', textAlign: 'center' }}>
        <Title level={3}>Reset Password</Title>
        <Text type="secondary">Enter your new password</Text>
      </Space>

      <Form name="reset-password" layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
        <Form.Item
          name="password"
          rules={[
            { required: true, message: 'Please enter a new password' },
            { min: 8, message: 'Password must be at least 8 characters' },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="New Password" size="large" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Please confirm your password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve();
                return Promise.reject(new Error('Passwords do not match'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Confirm Password" size="large" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            Reset Password
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Card style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></Card>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
