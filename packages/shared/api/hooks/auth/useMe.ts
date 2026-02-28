"use client";

import { useQuery } from "@tanstack/react-query";
import api from "../../axios";

export type UserProfile = {
  displayName: string;
  avatar: string | null;
};

export type SubscriptionStatus = "trialing" | "active" | "cancelled" | "expired";

export type SubscriptionInfo = {
  status: SubscriptionStatus;
  isActive: boolean;
  trialDaysRemaining: number;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
};

export type MeResponse = {
  id: number;
  username: string;
  email: string;
  profile: UserProfile | null;
  subscription: SubscriptionInfo | null;
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get<MeResponse>("auth/me/");
      return res.data;
    },
    retry: false, // don’t spam retries on 401
  });
}
