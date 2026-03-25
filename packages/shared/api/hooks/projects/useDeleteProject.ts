import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../axios";
import { ensureCsrf } from "../auth/ensureCsrf";
import { useProjectStore } from "../../../store/useProjectStore";

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: number) => {
      useProjectStore.getState().deleteProject(projectId);
      await ensureCsrf();
      await api.delete(`/projects/${projectId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["milestones"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
