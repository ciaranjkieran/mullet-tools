import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export function useRespondToInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invitationId,
      action,
    }: {
      invitationId: number;
      action: "accept" | "decline";
    }) => {
      await ensureCsrf();
      const res = await api.post(
        `/collaboration/invitations/${invitationId}/respond/`,
        { action }
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-invitations"] });
      qc.invalidateQueries({ queryKey: ["modes"] });
    },
  });
}
