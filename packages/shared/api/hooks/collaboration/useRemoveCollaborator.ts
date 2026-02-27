import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export function useRemoveCollaborator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      modeId,
      collaboratorId,
    }: {
      modeId: number;
      collaboratorId: number;
    }) => {
      await ensureCsrf();
      await api.delete(
        `/collaboration/modes/${modeId}/collaborators/${collaboratorId}/`
      );
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["mode-collaborators", variables.modeId],
      });
      qc.invalidateQueries({ queryKey: ["modes"] });
    },
  });
}
