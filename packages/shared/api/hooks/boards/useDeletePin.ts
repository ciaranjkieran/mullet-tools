import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export function useDeletePin() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (pinId: number | string) => {
      await ensureCsrf();
      await api.delete(`/boards/pins/${pinId}/`);
    },
    onSuccess: () => {
      qc.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "pins",
      });
      qc.invalidateQueries({
        predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "pin",
      });
    },
  });
}
