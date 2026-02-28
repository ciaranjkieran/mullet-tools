"use client";

import { useMe, SubscriptionInfo } from "./useMe";

export type { SubscriptionInfo };

export function useSubscription(): {
  subscription: SubscriptionInfo | null;
  isActive: boolean;
  isTrialing: boolean;
  isExpired: boolean;
  isCancelled: boolean;
  trialDaysRemaining: number;
  isLoading: boolean;
} {
  const me = useMe();
  const subscription = me.data?.subscription ?? null;

  return {
    subscription,
    isActive: subscription?.isActive ?? false,
    isTrialing: subscription?.status === "trialing",
    isExpired: !subscription?.isActive && me.data != null,
    isCancelled: subscription?.status === "cancelled",
    trialDaysRemaining: subscription?.trialDaysRemaining ?? 0,
    isLoading: me.isLoading,
  };
}
