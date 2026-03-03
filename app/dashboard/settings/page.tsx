"use client";

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Avatar, Upload, message, Typography, Divider, Spin } from 'antd';
import { UserOutlined, LockOutlined, UploadOutlined, MailOutlined, PhoneOutlined, BankOutlined } from '@ant-design/icons';
import SectionHeader from '@/components/common/SectionHeader';
import api from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';

const { Text } = Typography;

export default function SettingsPage() {
  const { user } = useAuth();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    api
      .get('/users/me')
      .then((res) => {
        const data = res.data?.data || res.data || {};
        profileForm.setFieldsValue({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || data.contactNo || '',
          company: data.company || data.companyId || '',
        });
        if (data.image || data.avatar || data.photo) {
          setAvatarUrl(data.image || data.avatar || data.photo);
        }
      })
      .catch(() => {
        if (user) {
          profileForm.setFieldsValue({
            name: user.name || '',
            email: user.email || '',
          });
        }
      })
      .finally(() => setInitialLoading(false));
  }, [profileForm, user]);

  const handleProfileSave = async (values: any) => {
    setProfileLoading(true);
    try {
      await api.put('/users/profile', {
        name: values.name,
        phone: values.phone,
        company: values.company,
      });
      message.success('Profile updated successfully');
    } catch {
      message.error('Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (values: any) => {
    setPasswordLoading(true);
    try {
      await api.put('/users/me/password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('Password changed successfully');
      passwordForm.resetFields();
    } catch (err: any) {
      message.error(
        err.response?.data?.error?.message || 'Failed to change password'
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarUpload = (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    api
      .post('/users/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((res) => {
        message.success('Avatar updated');
        if (res.data?.image || res.data?.avatar) {
          setAvatarUrl(res.data.image || res.data.avatar);
        }
      })
      .catch(() => message.error('Avatar upload failed'));
    return false;
  };

  if (initialLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
      <SectionHeader title="PROFILE SETTINGS" />

      {/* Avatar Section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          marginBottom: 32,
          padding: '24px',
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #F0F0F0',
        }}
      >
        <Avatar
          size={80}
          src={avatarUrl || user?.image}
          icon={<UserOutlined />}
          style={{ backgroundColor: '#3CB371', flexShrink: 0 }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#1A1A2E',
              marginBottom: 4,
            }}
          >
            {user?.name || 'User'}
          </div>
          <Text type="secondary" style={{ fontSize: 14 }}>
            {user?.email || ''}
          </Text>
          <div style={{ marginTop: 12 }}>
            <Upload
              showUploadList={false}
              beforeUpload={handleAvatarUpload}
              accept="image/*"
            >
              <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>
                Upload Photo
              </Button>
            </Upload>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #F0F0F0',
          padding: '24px',
          marginBottom: 32,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1A1A2E',
            display: 'block',
            marginBottom: 20,
          }}
        >
          Personal Information
        </Text>

        <Form
          form={profileForm}
          layout="vertical"
          onFinish={handleProfileSave}
          style={{ maxWidth: 500 }}
        >
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter your name' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Your full name"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email' }]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Email address"
              size="large"
              disabled
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item name="phone" label="Phone">
            <Input
              prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Phone number"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item name="company" label="Company">
            <Input
              prefix={<BankOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Company name"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={profileLoading}
              block
              size="large"
              style={{
                backgroundColor: '#3CB371',
                borderColor: '#3CB371',
                borderRadius: 8,
                height: 48,
                fontWeight: 600,
              }}
            >
              Save Changes
            </Button>
          </Form.Item>
        </Form>
      </div>

      {/* Password Section */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #F0F0F0',
          padding: '24px',
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1A1A2E',
            display: 'block',
            marginBottom: 20,
          }}
        >
          Change Password
        </Text>

        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordChange}
          style={{ maxWidth: 500 }}
        >
          <Form.Item
            name="currentPassword"
            label="Current Password"
            rules={[
              { required: true, message: 'Please enter your current password' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Current password"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: 'Please enter a new password' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="New password"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm your new password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Confirm new password"
              size="large"
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={passwordLoading}
              size="large"
              style={{
                backgroundColor: '#3CB371',
                borderColor: '#3CB371',
                borderRadius: 8,
                height: 48,
                fontWeight: 600,
              }}
            >
              Change Password
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
