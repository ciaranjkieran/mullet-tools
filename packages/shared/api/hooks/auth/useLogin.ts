import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      // make sure you do ensureCsrf() here if your login requires it
      const res = await api.post("/auth/login/", body);
      return res.data;
    },
    onSuccess: (user) => {
      qc.setQueryData(["me"], user); // instant header update
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
