"use client";

import { useState, useEffect, useCallback } from 'react';
import { subscriptionsApi } from '@/api/subscriptions.api';
import { message } from 'antd';

export function useSubscription() {
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCurrent = useCallback(async () => {
    try {
      const res = await subscriptionsApi.getCurrent();
      setSubscription(res.data?.data || res.data);
    } catch {
      // may not have a subscription
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await subscriptionsApi.getPlans();
      const d = res.data?.data || res.data || {};
      setPlans(d.plans || (Array.isArray(d) ? d : []));
    } catch {
      // handled by interceptor
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCurrent(), fetchPlans()]).finally(() => setLoading(false));
  }, [fetchCurrent, fetchPlans]);

  const subscribe = async (planId: string) => {
    try {
      await subscriptionsApi.subscribe({ planId });
      message.success('Subscribed successfully');
      fetchCurrent();
    } catch {
      message.error('Failed to subscribe');
    }
  };

  const cancel = async () => {
    try {
      await subscriptionsApi.cancel();
      message.success('Subscription cancelled');
      fetchCurrent();
    } catch {
      message.error('Failed to cancel subscription');
    }
  };

  return { subscription, plans, loading, subscribe, cancel, fetchCurrent, fetchPlans };
}
