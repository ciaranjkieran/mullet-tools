import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

type Change = { id: number; position: number };

export function useReorderGoalsToday() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      modeId: number;
      dateStr: string;
      changes: Change[];
    }) => {
      await ensureCsrf();
      const res = await api.patch("/goals/reorder-today/", {
        mode_id: payload.modeId,
        date_str: payload.dateStr,
        changes: payload.changes,
      });
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}
