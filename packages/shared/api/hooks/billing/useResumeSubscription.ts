"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export function useResumeSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await ensureCsrf();
      const res = await api.post("/billing/resume/");
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
