import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export function useCancelInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invitationId,
      modeId,
    }: {
      invitationId: number;
      modeId: number;
    }) => {
      await ensureCsrf();
      await api.delete(`/collaboration/invitations/${invitationId}/cancel/`);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["mode-collaborators", variables.modeId],
      });
    },
  });
}
