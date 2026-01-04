import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

type Change = { id: number; position: number };

export function useReorderProjectsToday() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (args: {
      modeId: number;
      dateStr: string;
      changes: Change[];
    }) => {
      await ensureCsrf();

      const res = await api.patch("/projects/reorder-today/", {
        mode_id: args.modeId,
        date_str: args.dateStr,
        changes: args.changes,
      });

      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
}
