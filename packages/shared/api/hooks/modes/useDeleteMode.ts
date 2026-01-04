import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export function useDeleteMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (modeId: number) => {
      await ensureCsrf();
      await api.delete(`/modes/${modeId}/`);
      return modeId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modes"] });
    },
  });
}
