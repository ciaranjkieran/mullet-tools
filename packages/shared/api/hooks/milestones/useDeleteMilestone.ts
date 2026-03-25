import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";
import { useMilestoneStore } from "../../../store/useMilestoneStore";

export function useDeleteMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (milestoneId: number) => {
      useMilestoneStore.getState().deleteMilestone(milestoneId);
      await ensureCsrf();
      await api.delete(`/milestones/${milestoneId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
    },
  });
}
