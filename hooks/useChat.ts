"use client";

import { useState, useEffect, useCallback } from 'react';
import { chatApi } from '@/api/chat.api';
import { message } from 'antd';

export function useChat(groupId?: string) {
  const [groups, setGroups] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await chatApi.listGroups();
      const data = res.data?.data?.groups || res.data?.data || res.data;
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    try {
      const res = await chatApi.getMessages(groupId);
      const data = res.data?.data?.messages || res.data?.data || res.data;
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      // handled by interceptor
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);
  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const sendMessage = async (content: string) => {
    if (!groupId) return;
    setSendingMessage(true);
    try {
      await chatApi.sendMessage(groupId, content);
      fetchMessages();
    } catch {
      message.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // name param is the UI label; backend uses 'title'
  const createGroup = async (data: { name: string; memberIds: string[] }) => {
    try {
      await chatApi.createGroup({ title: data.name, memberIds: data.memberIds });
      message.success('Group created');
      fetchGroups();
    } catch {
      message.error('Failed to create group');
    }
  };

  return { groups, messages, loading, sendingMessage, fetchGroups, fetchMessages, sendMessage, createGroup };
}
