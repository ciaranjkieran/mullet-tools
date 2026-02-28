"use client";

import { useMutation } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: async () => {
      await ensureCsrf();
      const res = await api.post<{ checkoutUrl: string }>(
        "/billing/create-checkout-session/"
      );
      return res.data;
    },
    onSuccess: (data) => {
      window.location.href = data.checkoutUrl;
    },
  });
}
