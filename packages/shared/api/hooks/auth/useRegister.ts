"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getAuthMode } from "../../axios";
import { handleTokenReceived } from "./tokenCallbacks";

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      const payload: Record<string, string> = { ...body };
      if (getAuthMode() === "token") {
        payload.client_type = "mobile";
      }

      const res = await api.post("/auth/register/", payload);
      return res.data;
    },
    onSuccess: async (data) => {
      if (data.token) {
        await handleTokenReceived(data.token);
      }
      const { token, ...user } = data;
      qc.setQueryData(["me"], user);
    },
  });
}
