import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export function useInviteToMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      modeId,
      email,
      role,
    }: {
      modeId: number;
      email: string;
      role: "editor" | "viewer";
    }) => {
      await ensureCsrf();
      const res = await api.post(`/collaboration/modes/${modeId}/invite/`, {
        email,
        role,
      });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: ["mode-collaborators", variables.modeId],
      });
    },
  });
}
