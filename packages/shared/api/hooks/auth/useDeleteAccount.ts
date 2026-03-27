"use client";

import { useMutation } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "./ensureCsrf";

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (password: string) => {
      await ensureCsrf();
      const { data } = await api.post<{ detail: string }>(
        "/auth/delete-account/",
        { password }
      );
      return data;
    },
  });
}
