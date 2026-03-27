"use client";

import { useMutation } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "./ensureCsrf";

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      await ensureCsrf();
      const { data } = await api.post<{ detail: string }>(
        "/auth/forgot-password/",
        { email }
      );
      return data;
    },
  });
}
