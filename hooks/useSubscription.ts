"use client";

import { useState, useEffect, useCallback } from 'react';
import { subscriptionsApi } from '@/api/subscriptions.api';
import { message } from 'antd';

interface ScheduledChange {
  plan: string;
  teamMembers: number;
  activationDate: string;
}

interface SubscriptionStatus {
  hasSubscription: boolean;
  plan: 'monthly' | 'yearly' | null;
  status: string | null;
  teamMemberLimit: number | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  planName?: string | null;
  price?: number;
  scheduledChange?: ScheduledChange | null;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<any>(null);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
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

  const fetchStatus = useCallback(async () => {
    try {
      const res = await subscriptionsApi.getStatus();
      setStatus(res.data?.data || res.data);
    } catch {
      // handled by interceptor
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
    Promise.all([fetchCurrent(), fetchStatus(), fetchPlans()]).finally(() => setLoading(false));
  }, [fetchCurrent, fetchStatus, fetchPlans]);

  const subscribe = async (planId: string) => {
    try {
      await subscriptionsApi.subscribe({ planId });
      message.success('Subscribed successfully');
      fetchCurrent();
      fetchStatus();
    } catch {
      message.error('Failed to subscribe');
    }
  };

  const createCheckout = async (plan: 'monthly' | 'yearly', teamMembers: number) => {
    try {
      const res = await subscriptionsApi.createCheckout({ plan, teamMembers });
      const data = res.data?.data || res.data;
      if (data?.url) {
        window.location.href = data.url;
      }
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Failed to create checkout session';
      message.error(msg);
      throw err;
    }
  };

  const changePlan = async (plan: 'monthly' | 'yearly', teamMembers: number) => {
    try {
      const res = await subscriptionsApi.changePlan({ plan, teamMembers });
      const data = res.data?.data || res.data;
      if (data?.type === 'scheduled') {
        message.success('Plan change scheduled for end of current billing period');
      } else {
        message.success('Plan updated successfully');
      }
      fetchCurrent();
      fetchStatus();
      return data;
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === 'DOWNGRADE_NOT_ALLOWED') {
        message.warning('Downgrading from yearly to monthly is not available');
      } else {
        message.error('Failed to change plan');
      }
      throw err;
    }
  };

  const cancel = async () => {
    try {
      await subscriptionsApi.cancel();
      message.success('Subscription will be cancelled at end of billing period');
      fetchCurrent();
      fetchStatus();
    } catch {
      message.error('Failed to cancel subscription');
    }
  };

  const activateNow = async () => {
    try {
      const res = await subscriptionsApi.activateNow();
      const data = res.data?.data || res.data;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        message.success('Scheduled plan activated');
        fetchCurrent();
        fetchStatus();
      }
      return data;
    } catch {
      message.error('Failed to activate scheduled plan');
    }
  };

  const cancelScheduledChange = async () => {
    try {
      await subscriptionsApi.cancelScheduled();
      message.success('Scheduled plan change cancelled');
      fetchCurrent();
      fetchStatus();
    } catch {
      message.error('Failed to cancel scheduled change');
    }
  };

  return {
    subscription,
    status,
    plans,
    loading,
    subscribe,
    createCheckout,
    changePlan,
    cancel,
    activateNow,
    cancelScheduledChange,
    fetchCurrent,
    fetchStatus,
    fetchPlans,
  };
}
