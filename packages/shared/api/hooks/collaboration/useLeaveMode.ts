import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export function useLeaveMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ modeId }: { modeId: number }) => {
      await ensureCsrf();
      await api.post(`/collaboration/modes/${modeId}/leave/`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["modes"] });
    },
  });
}
