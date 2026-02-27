"use client";

import { useQuery } from "@tanstack/react-query";
import api from "../../axios";

export type UserProfile = {
  displayName: string;
  avatar: string | null;
};

export type MeResponse = {
  id: number;
  username: string;
  email: string;
  profile: UserProfile | null;
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
