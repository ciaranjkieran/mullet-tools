import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";
import { useMilestoneStore } from "../../../store/useMilestoneStore";

export function useDeleteMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (milestoneId: number) => {
      await ensureCsrf();
      await api.delete(`/milestones/${milestoneId}/`);
    },
    onMutate: (milestoneId) => {
      const prev = useMilestoneStore.getState().milestones;
      useMilestoneStore.getState().deleteMilestone(milestoneId);
      return { prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (_err, _milestoneId, ctx) => {
      if (ctx?.prev) useMilestoneStore.setState({ milestones: ctx.prev });
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
    },
  });
}
