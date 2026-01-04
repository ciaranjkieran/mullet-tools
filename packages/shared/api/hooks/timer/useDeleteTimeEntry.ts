import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";
import { ACTIVE_TIMER_QK } from "./useActiveTimer";

export function useDeleteTimeEntry() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (entryId: number) => {
      await ensureCsrf();
      await api.delete(`/time-entries/${entryId}`); // ✅ matches backend path
      return entryId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timer", "entries"] });
      qc.invalidateQueries({ queryKey: ACTIVE_TIMER_QK });
    },
  });
}
