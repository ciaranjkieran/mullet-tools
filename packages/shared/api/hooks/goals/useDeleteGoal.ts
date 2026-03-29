import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";
import { useGoalStore } from "../../../store/useGoalStore";

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: number) => {
      await ensureCsrf();
      await api.delete(`/goals/${goalId}/`);
    },
    onMutate: (goalId) => {
      const prev = useGoalStore.getState().goals;
      useGoalStore.getState().deleteGoal(goalId);
      return { prev };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (_err, _goalId, ctx) => {
      if (ctx?.prev) useGoalStore.setState({ goals: ctx.prev });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}
