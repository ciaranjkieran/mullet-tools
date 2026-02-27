import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";
import type { AiCommitRequest, AiCommitResponse } from "../../../types/AiBuilder";

export function useAiCommit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AiCommitRequest): Promise<AiCommitResponse> => {
      await ensureCsrf();
      const res = await api.post<AiCommitResponse>("/ai/commit/", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    },
  });
}
