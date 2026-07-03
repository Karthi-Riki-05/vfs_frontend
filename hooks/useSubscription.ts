"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { subscriptionsApi } from "@/api/subscriptions.api";
import { toast } from "sonner";

interface ScheduledChange {
  plan: string;
  teamMembers: number;
  activationDate: string;
}

interface SubscriptionStatus {
  hasSubscription: boolean;
  plan: "monthly" | "yearly" | null;
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
  // Guards against setState after unmount — these fetches are fire-and-forget
  // and can resolve after the component navigates away.
  const mountedRef = useRef(true);

  const fetchCurrent = useCallback(async () => {
    try {
      const res = await subscriptionsApi.getCurrent();
      if (mountedRef.current) setSubscription(res.data?.data || res.data);
    } catch {
      // may not have a subscription
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await subscriptionsApi.getStatus();
      if (mountedRef.current) setStatus(res.data?.data || res.data);
    } catch {
      // handled by interceptor
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await subscriptionsApi.getPlans();
      const d = res.data?.data || res.data || {};
      if (mountedRef.current) setPlans(d.plans || (Array.isArray(d) ? d : []));
    } catch {
      // handled by interceptor
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    Promise.all([fetchCurrent(), fetchStatus(), fetchPlans()]).finally(() => {
      if (mountedRef.current) setLoading(false);
    });
    return () => {
      mountedRef.current = false;
    };
  }, [fetchCurrent, fetchStatus, fetchPlans]);

  const subscribe = async (planId: string) => {
    try {
      await subscriptionsApi.subscribe({ planId });
      toast.success("Subscribed successfully");
      fetchCurrent();
      fetchStatus();
    } catch {
      toast.error("Failed to subscribe");
    }
  };

  const createCheckout = async (
    plan: "monthly" | "yearly",
    teamMembers: number,
    paymentMethodId?: string,
  ) => {
    try {
      const res = await subscriptionsApi.createCheckout({
        plan,
        teamMembers,
        paymentMethodId,
      });
      const data = res.data?.data || res.data;
      // Direct charge (saved card) — no Stripe redirect needed.
      if (data?.directCharge) {
        if (data?.successUrl) {
          window.location.href = data.successUrl;
        }
        return data;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
      return data;
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        "Failed to create checkout session";
      toast.error(msg);
      throw err;
    }
  };

  const changePlan = async (
    plan: "monthly" | "yearly",
    teamMembers: number,
  ) => {
    try {
      const res = await subscriptionsApi.changePlan({ plan, teamMembers });
      const data = res.data?.data || res.data;
      if (data?.type === "checkout" && data?.url) {
        // No real Stripe subscription on file → backend returned a fresh
        // checkout URL. Redirect the browser so the user can complete payment.
        window.location.href = data.url;
        return data;
      }
      if (data?.type === "needs_payment_method" && data?.url) {
        // Active sub but no card on file → send the user to the Stripe
        // billing portal to add a card, then come back and retry.
        toast.info(
          data?.message ||
            "Add a payment method, then come back and try again.",
        );
        window.location.href = data.url;
        return data;
      }
      if (data?.type === "confirm_in_stripe" && data?.url) {
        // Stripe-hosted upgrade confirmation — user reviews the prorated
        // charge and confirms on Stripe's page, then is redirected back.
        toast.info(
          data?.message || "Redirecting to Stripe to confirm payment…",
        );
        window.location.href = data.url;
        return data;
      }
      if (data?.type === "scheduled") {
        toast.success(
          "Plan change scheduled for end of current billing period",
        );
      } else if (data?.type === "reactivated") {
        toast.success(
          data?.message || "Subscription reactivated — it will renew as normal",
        );
      } else if (data?.type === "updated") {
        toast.success(
          data?.message || "Team member count updated successfully",
        );
      } else {
        toast.success("Plan updated successfully");
      }
      fetchCurrent();
      fetchStatus();
      return data;
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      const apiMsg = err?.response?.data?.error?.message;
      if (code === "DOWNGRADE_NOT_ALLOWED") {
        toast.warning(
          apiMsg || "Downgrading from yearly to monthly is not available",
        );
      } else {
        toast.error(apiMsg || "Failed to change plan");
      }
      // Log full error so the browser console shows what Stripe / the API actually returned.
      // eslint-disable-next-line no-console
      console.error("[changePlan] failed", {
        status: err?.response?.status,
        code,
        message: apiMsg,
        data: err?.response?.data,
      });
      throw err;
    }
  };

  const cancel = async () => {
    try {
      await subscriptionsApi.cancel();
      toast.success("Subscription will be cancelled at end of billing period");
      fetchCurrent();
      fetchStatus();
    } catch {
      toast.error("Failed to cancel subscription");
    }
  };

  const reactivate = async () => {
    try {
      await subscriptionsApi.reactivate();
      toast.success("Subscription reactivated — it will renew as normal");
      fetchCurrent();
      fetchStatus();
    } catch {
      toast.error("Failed to reactivate subscription");
    }
  };

  const activateNow = async () => {
    try {
      const res = await subscriptionsApi.activateNow();
      const data = res.data?.data || res.data;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        toast.success("Scheduled plan activated");
        fetchCurrent();
        fetchStatus();
      }
      return data;
    } catch {
      toast.error("Failed to activate scheduled plan");
    }
  };

  const cancelScheduledChange = async () => {
    try {
      await subscriptionsApi.cancelScheduled();
      toast.success("Scheduled plan change cancelled");
      fetchCurrent();
      fetchStatus();
    } catch {
      toast.error("Failed to cancel scheduled change");
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
    reactivate,
    activateNow,
    cancelScheduledChange,
    fetchCurrent,
    fetchStatus,
    fetchPlans,
  };
}
