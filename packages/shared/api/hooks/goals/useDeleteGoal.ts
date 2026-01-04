import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: number) => {
      await ensureCsrf();
      await api.delete(`/goals/${goalId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
