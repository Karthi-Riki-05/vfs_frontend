"use client";

import React from 'react';
import { Modal, Button, Typography, Space } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  SafetyOutlined,
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface AIConsentModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function AIConsentModal({ open, onAccept, onDecline }: AIConsentModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onDecline}
      footer={null}
      centered
      width={440}
      closable={false}
      styles={{ body: { padding: '24px' } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: '#E8F5E9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SafetyOutlined style={{ fontSize: 20, color: '#3CB371' }} />
        </div>
        <Text style={{ fontSize: 18, fontWeight: 600, color: '#1A1A2E' }}>
          Value Charts AI
        </Text>
      </div>

      <Paragraph style={{ color: '#595959', fontSize: 14, marginBottom: 16 }}>
        To use the AI assistant, we need to process your messages to generate
        flow suggestions. This includes:
      </Paragraph>

      <Space direction="vertical" size={6} style={{ marginBottom: 16, width: '100%' }}>
        <Text style={{ fontSize: 13, color: '#595959' }}>
          <CheckCircleOutlined style={{ color: '#3CB371', marginRight: 8 }} />
          Your chat messages are sent to our AI service
        </Text>
        <Text style={{ fontSize: 13, color: '#595959' }}>
          <CheckCircleOutlined style={{ color: '#3CB371', marginRight: 8 }} />
          Conversation history is stored to improve responses
        </Text>
        <Text style={{ fontSize: 13, color: '#595959' }}>
          <CheckCircleOutlined style={{ color: '#3CB371', marginRight: 8 }} />
          You can delete your AI data at any time
        </Text>
        <Text style={{ fontSize: 13, color: '#595959' }}>
          <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
          Your data is never sold or shared with third parties
        </Text>
        <Text style={{ fontSize: 13, color: '#595959' }}>
          <CloseCircleOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
          We do not use your data to train AI models
        </Text>
      </Space>

      <Paragraph style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 20 }}>
        By clicking Accept, you consent to AI data processing as described above
        in accordance with GDPR. You can withdraw consent and delete your data
        at any time from Settings.
      </Paragraph>

      <div style={{ display: 'flex', gap: 12 }}>
        <Button
          onClick={onDecline}
          block
          size="large"
          style={{ borderRadius: 12, height: 44 }}
        >
          Decline
        </Button>
        <Button
          type="primary"
          onClick={onAccept}
          block
          size="large"
          style={{
            borderRadius: 12,
            height: 44,
            backgroundColor: '#3CB371',
            borderColor: '#3CB371',
            fontWeight: 600,
          }}
        >
          Accept & Continue
        </Button>
      </div>
    </Modal>
  );
}
