import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";

export function useDeleteMilestone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (milestoneId: number) => {
      await ensureCsrf();
      await api.delete(`/milestones/${milestoneId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] }); // milestone delete likely affects tasks
    },
  });
}
