import { useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getAuthMode } from "../../axios";
import { ensureCsrf, refreshCsrf } from "./ensureCsrf";
import { handleTokenReceived } from "./tokenCallbacks";

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      await ensureCsrf();

      const payload: Record<string, string> = { ...body };
      if (getAuthMode() === "token") {
        payload.client_type = "mobile";
      }

      const res = await api.post("/auth/login/", payload);
      return res.data;
    },
    onSuccess: async (data) => {
      // Django rotates the session on login, invalidating the old CSRF token
      await refreshCsrf();

      if (data.token) {
        await handleTokenReceived(data.token);
      }
      const { token, ...user } = data;
      setTimeout(() => qc.setQueryData(["me"], user), 0);
    },
  });
}
