"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import type { MeResponse } from "./useMe";

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      const res = await api.post("/auth/register/", body);
      return res.data;
    },
    onSuccess: (user) => {
      qc.setQueryData(["me"], user); // if register auto-logs-in
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
