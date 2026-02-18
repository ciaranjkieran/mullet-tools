import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "./ensureCsrf";

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      await ensureCsrf();
      const res = await api.post("/auth/login/", body);
      return res.data;
    },
    onSuccess: (user) => {
      qc.setQueryData(["me"], user); // instant header update
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
