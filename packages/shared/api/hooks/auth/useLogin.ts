import { useMutation, useQueryClient } from "@tanstack/react-query";
import api, { getAuthMode } from "../../axios";
import { ensureCsrf } from "./ensureCsrf";
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
      if (data.token) {
        await handleTokenReceived(data.token);
      }
      const { token, ...user } = data;
      qc.setQueryData(["me"], user);
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
