"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "./ensureCsrf";
import type { MeResponse } from "./useMe";

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await ensureCsrf();
      const res = await api.post("/auth/complete-onboarding/");
      return res.data;
    },
    onSuccess: () => {
      queryClient.setQueryData<MeResponse>(["me"], (old) => {
        if (!old) return old;
        return {
          ...old,
          profile: old.profile
            ? { ...old.profile, hasCompletedOnboarding: true }
            : null,
        };
      });
    },
  });
}
