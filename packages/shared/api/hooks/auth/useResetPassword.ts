"use client";

import { useMutation } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "./ensureCsrf";

type Payload = {
  uid: string;
  token: string;
  password: string;
};

export function useResetPassword() {
  return useMutation({
    mutationFn: async (body: Payload) => {
      await ensureCsrf();
      const { data } = await api.post<{ detail: string }>(
        "/auth/reset-password/",
        body
      );
      return data;
    },
  });
}
